import { describe, expect, it } from 'vitest';

import { PAYMENT_LINK_URL, readPaymentLink } from '../appointment';
import { LabAccessConfigError, LabAccessProtocolError, LabAccessSchedulingError } from '../errors';
import type { FHIRAppointment } from '../fhir-types';
import { bundle, connect, createHarness, type Harness } from './fake-lab';
import { API_BASE, FHIR_BASE, jsonResponse, operationOutcome } from './helpers';

const IDENTIFIER = {
  system: 'https://app-paciente.example/agendamentos',
  value: 'e3f1b2a4-5c6d-4e7f-8a9b-0c1d2e3f4a5b',
};

function proposed(): FHIRAppointment {
  return {
    basedOn: [{ reference: '#exame-1' }],
    contained: [
      {
        code: { coding: [{ code: '718-7', system: 'http://loinc.org' }] },
        id: 'exame-1',
        intent: 'order',
        resourceType: 'ServiceRequest',
        status: 'active',
        subject: { reference: 'Patient/pac-teste-1', type: 'Patient' },
      },
    ],
    end: '2026-11-23T10:15:00-03:00',
    identifier: [IDENTIFIER],
    participant: [
      { actor: { reference: 'Patient/pac-teste-1', type: 'Patient' }, status: 'accepted' },
      { actor: { reference: 'Location/unidade-norte', type: 'Location' }, status: 'needs-action' },
    ],
    resourceType: 'Appointment',
    slot: [{ reference: 'Slot/horario-23nov-10h' }],
    start: '2026-11-23T10:00:00-03:00',
    status: 'proposed',
  };
}

const stored = (): FHIRAppointment => ({
  ...proposed(),
  id: 'ag-1',
  meta: { versionId: '3' },
  status: 'booked',
});

async function setup() {
  const harness = await createHarness();
  harness.lab.fhir = () => jsonResponse(200, bundle([]));
  const { access, consent } = await connect(harness);
  return { access, consent, harness };
}

function lastFhir(harness: Harness) {
  const call = harness.lab.fhirCalls.at(-1)!;
  const url = new URL(call.url);
  return { call, params: [...url.searchParams.entries()], path: url.pathname };
}

describe('appointment.write', () => {
  it('RCP-036: cria o agendamento com If-None-Exist na forma literal, os pedidos contidos e Prefer', async () => {
    const { access, harness } = await setup();
    harness.lab.fhir = (call) =>
      jsonResponse(
        201,
        { ...(call.json as object), id: 'ag-1', status: 'pending' },
        { ETag: 'W/"1"', Location: `${FHIR_BASE}/Appointment/ag-1/_history/1` },
      );
    const appointment = proposed();
    const result = await access.createAppointment(appointment);

    const { call, path } = lastFhir(harness);
    expect(call.method).toBe('POST');
    expect(path).toBe('/fhir/r4/Appointment');
    expect(call.headers['Content-Type']).toBe('application/fhir+json');
    expect(call.headers.Prefer).toBe('return=representation');
    expect(call.headers['If-None-Exist']).toBe(
      'identifier=https://app-paciente.example/agendamentos|e3f1b2a4-5c6d-4e7f-8a9b-0c1d2e3f4a5b',
    );
    expect(call.headers.Authorization).toMatch(/^Bearer patient-token/);
    // Só transporte: o recurso segue como o aplicativo o montou.
    expect(call.json).toEqual(appointment);

    expect(result).toMatchObject({
      created: true,
      etag: 'W/"1"',
      location: `${FHIR_BASE}/Appointment/ag-1/_history/1`,
      resource: { id: 'ag-1', status: 'pending' },
    });
  });

  it('RCP-021: criação repetida que recebe 200 devolve o agendamento que já existia', async () => {
    const { access, harness } = await setup();
    const existing = { ...stored(), status: 'pending' };
    harness.lab.failNext(
      (call) => call.method === 'POST' && call.url.includes('/Appointment'),
      'network',
    );
    harness.lab.fhir = (call) =>
      call.method === 'POST'
        ? { body: '', headers: {}, status: 200 }
        : jsonResponse(200, bundle([existing]));

    const result = await access.createAppointment(proposed());

    const posts = harness.lab.fhirCalls.filter((call) => call.method === 'POST');
    expect(posts).toHaveLength(2);
    expect(posts[0]!.headers['If-None-Exist']).toBe(posts[1]!.headers['If-None-Exist']);
    expect(posts[0]!.body).toBe(posts[1]!.body);
    expect(lastFhir(harness).call.method).toBe('GET');
    expect(lastFhir(harness).params).toEqual([
      ['identifier', `${IDENTIFIER.system}|${IDENTIFIER.value}`],
    ]);
    expect(result).toMatchObject({ created: false, resource: { id: 'ag-1', status: 'pending' } });
  });

  it('RCP-021: exige identificador único do receptor para a criação condicional', async () => {
    const { access, harness } = await setup();
    const before = harness.lab.fhirCalls.length;
    const cases: ((a: FHIRAppointment) => void)[] = [
      (a) => delete a.identifier,
      (a) => (a.identifier = [{ system: IDENTIFIER.system }]),
      (a) => (a.identifier = [{ value: IDENTIFIER.value }]),
      (a) => (a.identifier = [{ system: IDENTIFIER.system, value: 'a&status=booked' }]),
      (a) => (a.identifier = [{ system: IDENTIFIER.system, value: 'a|b' }]),
      (a) => (a.identifier = [{ system: 'https://x.example/a b', value: 'a' }]),
      (a) => (a.identifier = [{ system: IDENTIFIER.system, value: 'a\r\nX-Outro: 1' }]),
      (a) =>
        (a.identifier = [IDENTIFIER, { system: 'https://app-paciente.example/outro', value: 'x' }]),
    ];
    for (const change of cases) {
      const appointment = proposed();
      change(appointment);
      await expect(access.createAppointment(appointment)).rejects.toBeInstanceOf(
        LabAccessConfigError,
      );
    }
    expect(harness.lab.fhirCalls).toHaveLength(before);
  });

  it('com mais de um identificador, usa o indicado na chamada', async () => {
    const { access, harness } = await setup();
    harness.lab.fhir = (call) => jsonResponse(201, { ...(call.json as object), id: 'ag-1' });
    const appointment = proposed();
    appointment.identifier!.push({ system: 'https://app-paciente.example/outro', value: 'x' });
    await access.createAppointment(appointment, { identifier: IDENTIFIER });
    expect(lastFhir(harness).call.headers['If-None-Exist']).toBe(
      `identifier=${IDENTIFIER.system}|${IDENTIFIER.value}`,
    );
    await expect(
      access.createAppointment(appointment, {
        identifier: { system: 'https://x.example', value: 'y' },
      }),
    ).rejects.toBeInstanceOf(LabAccessConfigError);
    // O indicado também precisa seguir o conjunto de caracteres do protocolo.
    appointment.identifier!.push({ system: IDENTIFIER.system, value: 'a b' });
    await expect(
      access.createAppointment(appointment, {
        identifier: { system: IDENTIFIER.system, value: 'a b' },
      }),
    ).rejects.toBeInstanceOf(LabAccessConfigError);
  });

  const invalid: [string, (a: FHIRAppointment) => void][] = [
    ['estado inicial diferente de proposed', (a) => (a.status = 'booked')],
    ['sem pedido contido', (a) => (a.contained = [])],
    ['pedido contido sem basedOn', (a) => (a.basedOn = [])],
    [
      'basedOn para fora do recurso',
      (a) => a.basedOn!.push({ reference: 'ServiceRequest/externo' }),
    ],
    ['basedOn para id que não existe', (a) => (a.basedOn = [{ reference: '#outro' }])],
    ['pedido contido sem id', (a) => delete a.contained![0]!.id],
    [
      'recurso contido que não é ServiceRequest',
      (a) => (a.contained![0]!.resourceType = 'Patient'),
    ],
    [
      'pedido de outro paciente',
      (a) => (a.contained![0]!.subject = { reference: 'Patient/outro' }),
    ],
    [
      'participante de outro paciente',
      (a) => (a.participant[0]!.actor = { reference: 'Patient/outro', type: 'Patient' }),
    ],
    ['sem o paciente entre os participantes', (a) => a.participant.shift()],
    ['participante paciente sem actor.type', (a) => delete a.participant[0]!.actor!.type],
    ['participante unidade sem actor.type', (a) => delete a.participant[1]!.actor!.type],
    ['sem a unidade entre os participantes', (a) => a.participant.pop()],
    ['sem participantes', (a) => delete (a as { participant?: unknown }).participant],
    ['sem basedOn', (a) => delete a.basedOn],
    ['sem contained', (a) => delete a.contained],
    [
      'dois participantes paciente',
      (a) =>
        a.participant.push({
          actor: { reference: 'Patient/pac-teste-1', type: 'Patient' },
          status: 'accepted',
        }),
    ],
    [
      'duas unidades',
      (a) =>
        a.participant.push({
          actor: { reference: 'Location/outra', type: 'Location' },
          status: 'needs-action',
        }),
    ],
    [
      'actor.type Patient apontando para outro tipo de recurso',
      (a) => (a.participant[0]!.actor = { reference: 'Location/unidade-norte', type: 'Patient' }),
    ],
    [
      'actor.type Location apontando para outro tipo de recurso',
      (a) => (a.participant[1]!.actor = { reference: 'Patient/pac-teste-1', type: 'Location' }),
    ],
    [
      'paciente identificado só pelo CPF',
      (a) =>
        (a.participant[0]!.actor = {
          identifier: {
            system: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cpf',
            value: '52998224725',
          },
          type: 'Patient',
        }),
    ],
    [
      'subject do pedido com referência diferente da do participante',
      (a) =>
        (a.contained![0]!.subject = {
          reference: 'https://api.laboratorio.example/fhir/r4/Patient/pac-teste-1',
        }),
    ],
    [
      'participante paciente com identifier ao lado da referência',
      (a) =>
        (a.participant[0]!.actor = {
          identifier: {
            system: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cpf',
            value: '52998224725',
          },
          reference: 'Patient/pac-teste-1',
          type: 'Patient',
        }),
    ],
    [
      'subject do pedido com identifier ao lado da referência',
      (a) =>
        (a.contained![0]!.subject = {
          identifier: {
            system: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cpf',
            value: '52998224725',
          },
          reference: 'Patient/pac-teste-1',
        }),
    ],
    [
      'subject do pedido com type diferente de Patient',
      (a) => (a.contained![0]!.subject = { reference: 'Patient/pac-teste-1', type: 'Group' }),
    ],
    ['pedido fora de active', (a) => (a.contained![0]!.status = 'draft')],
    ['pedido com intent diferente de order', (a) => (a.contained![0]!.intent = 'plan')],
    ['pedido sem code', (a) => delete a.contained![0]!.code],
    ['pedido com code sem coding', (a) => (a.contained![0]!.code = { text: 'Glicose' })],
    ['pedido contido com meta.versionId', (a) => (a.contained![0]!.meta = { versionId: '1' })],
    [
      'pedido contido com meta.lastUpdated',
      (a) => (a.contained![0]!.meta = { lastUpdated: '2026-11-16T12:00:00Z' }),
    ],
    ['tipo de recurso errado', (a) => ((a as { resourceType: string }).resourceType = 'Slot')],
  ];

  it.each(invalid)('recusa agendamento %s antes de enviar', async (_name, change) => {
    const { access, harness } = await setup();
    const before = harness.lab.fhirCalls.length;
    const appointment = proposed();
    change(appointment);
    await expect(access.createAppointment(appointment)).rejects.toBeInstanceOf(
      LabAccessConfigError,
    );
    expect(harness.lab.fhirCalls).toHaveLength(before);
  });

  it('aceita pedido sem LOINC, com o código próprio do laboratório, e subject sem type', async () => {
    const { access, harness } = await setup();
    harness.lab.fhir = (call) => jsonResponse(201, { ...(call.json as object), id: 'ag-2' });
    const appointment = proposed();
    appointment.contained![0]!.code = {
      coding: [{ code: 'COMBO-12', system: 'https://laboratorio.example/codigos' }],
    };
    appointment.contained![0]!.subject = { reference: 'Patient/pac-teste-1' };
    await expect(access.createAppointment(appointment)).resolves.toMatchObject({ created: true });
  });

  it('RCP-045: o paciente vai só por Patient/{fhir_id}, sem identifier, no participante e nos pedidos', async () => {
    const { access, harness } = await setup();
    harness.lab.fhir = (call) => jsonResponse(201, { ...(call.json as object), id: 'ag-9' });
    await access.createAppointment(proposed());
    const body = lastFhir(harness).call.json as FHIRAppointment;
    const patient = body.participant.find((p) => p.actor?.type === 'Patient')!.actor!;
    expect(patient).toEqual({ reference: 'Patient/pac-teste-1', type: 'Patient' });
    for (const request of body.contained!) {
      expect((request.subject as { identifier?: unknown }).identifier).toBeUndefined();
      expect((request.subject as { reference?: string }).reference).toBe('Patient/pac-teste-1');
    }
    expect(JSON.stringify(body)).not.toContain('NamingSystem/cpf');

    const withCpf = proposed();
    withCpf.participant[0]!.actor!.identifier = {
      system: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cpf',
      value: '52998224725',
    };
    const before = harness.lab.fhirCalls.length;
    await expect(access.createAppointment(withCpf)).rejects.toBeInstanceOf(LabAccessConfigError);
    expect(harness.lab.fhirCalls).toHaveLength(before);
  });

  it('RCP-036: recusa identificador fora do conjunto de caracteres do protocolo', async () => {
    const { access, harness } = await setup();
    const before = harness.lab.fhirCalls.length;
    const values = ['a'.repeat(65), 'a/b', 'a:b', 'a%20b', 'a@b', 'á', ''];
    const systems = [
      'http://app-paciente.example/agendamentos',
      'https://app-paciente.example/agendamentos?x=1',
      'https://app-paciente.example/agendamentos#x',
      'https://app-paciente.example/agend%61mentos',
      'https://usuario@app-paciente.example/agendamentos',
      `https://app-paciente.example/${'a'.repeat(180)}`,
      'https://',
      'https://:',
      'urn:uuid:e3f1b2a4-5c6d-4e7f-8a9b-0c1d2e3f4a5b',
    ];
    const cases = [
      ...values.map((value) => ({ system: IDENTIFIER.system, value })),
      ...systems.map((system) => ({ system, value: IDENTIFIER.value })),
    ];
    for (const identifier of cases) {
      const appointment = proposed();
      appointment.identifier = [identifier];
      await expect(
        access.createAppointment(appointment),
        JSON.stringify(identifier),
      ).rejects.toBeInstanceOf(LabAccessConfigError);
    }
    expect(harness.lab.fhirCalls).toHaveLength(before);
  });

  it('RCP-036: aceita value de 64 caracteres não reservados e system no limite de 200', async () => {
    const { access, harness } = await setup();
    harness.lab.fhir = (call) => jsonResponse(201, { ...(call.json as object), id: 'ag-3' });
    const system = `https://app-paciente.example/${'a'.repeat(200 - 'https://app-paciente.example/'.length)}`;
    const value = `${'A-._~z09'.repeat(8)}`;
    expect(system).toHaveLength(200);
    expect(value).toHaveLength(64);
    const appointment = proposed();
    appointment.identifier = [{ system, value }];
    await access.createAppointment(appointment);
    expect(lastFhir(harness).call.headers['If-None-Exist']).toBe(`identifier=${system}|${value}`);
  });

  it('RCP-035: a criação não envia a extensão de link de pagamento', async () => {
    const { access, harness } = await setup();
    const before = harness.lab.fhirCalls.length;
    const appointment = proposed();
    appointment.extension = [{ url: PAYMENT_LINK_URL, valueUrl: 'https://pagamento.example/x' }];
    await expect(access.createAppointment(appointment)).rejects.toBeInstanceOf(
      LabAccessConfigError,
    );
    expect(harness.lab.fhirCalls).toHaveLength(before);
  });

  it('RCP-035: na remarcação, o recurso volta como foi lido, com a extensão de pagamento', async () => {
    const { access, harness } = await setup();
    harness.lab.fhir = (call) => jsonResponse(200, call.json, { ETag: 'W/"4"' });
    const current = {
      ...stored(),
      extension: [{ url: PAYMENT_LINK_URL, valueUrl: 'https://www.laboratorio.example/pagar/1' }],
      status: 'pending' as const,
    };
    await access.rescheduleAppointment({
      current,
      end: '2026-11-24T09:15:00-03:00',
      etag: 'W/"3"',
      slot: 'horario-24nov-09h',
      start: '2026-11-24T09:00:00-03:00',
    });
    expect((lastFhir(harness).call.json as FHIRAppointment).extension).toEqual(current.extension);
  });

  it('409 SLOT_UNAVAILABLE vira erro tipado, sem repetição', async () => {
    const { access, harness } = await setup();
    harness.lab.fhir = () => jsonResponse(409, operationOutcome('SLOT_UNAVAILABLE', 'conflict'));
    const error = await access.createAppointment(proposed()).catch((err: unknown) => err);
    expect(error).toBeInstanceOf(LabAccessSchedulingError);
    expect(error).toMatchObject({
      code: 'SLOT_UNAVAILABLE',
      issueCode: 'conflict',
      retryable: false,
    });
    expect(harness.lab.fhirCalls.filter((call) => call.method === 'POST')).toHaveLength(1);
  });

  it('recusa resposta da criação sem o recurso gravado ou com 200 sem agendamento único', async () => {
    const { access, harness } = await setup();
    harness.lab.fhir = () => ({ body: '', headers: {}, status: 201 });
    await expect(access.createAppointment(proposed())).rejects.toBeInstanceOf(
      LabAccessProtocolError,
    );

    harness.lab.fhir = (call) =>
      call.method === 'POST'
        ? { body: '', headers: {}, status: 200 }
        : jsonResponse(200, bundle([]));
    await expect(access.createAppointment(proposed())).rejects.toBeInstanceOf(
      LabAccessProtocolError,
    );
  });

  it('lê e busca agendamentos do paciente do consentimento', async () => {
    const { access, harness } = await setup();
    harness.lab.fhir = (call) =>
      call.url.includes('/Appointment/')
        ? jsonResponse(200, stored(), { etag: 'W/"3"' })
        : jsonResponse(200, bundle([stored()]));

    const read = await access.readAppointment('ag-1');
    expect(lastFhir(harness).path).toBe('/fhir/r4/Appointment/ag-1');
    expect(read).toMatchObject({ etag: 'W/"3"', resource: { id: 'ag-1' } });

    const page = await access.searchAppointments({
      date: ['ge2026-11-01', 'lt2026-12-01'],
      status: 'booked',
    });
    expect(lastFhir(harness).params).toEqual([
      ['patient', 'pac-teste-1'],
      ['status', 'booked'],
      ['date', 'ge2026-11-01'],
      ['date', 'lt2026-12-01'],
    ]);
    expect(page.resources).toHaveLength(1);
  });

  it('remarca com PUT e If-Match, trocando só slot, start e end', async () => {
    const { access, harness } = await setup();
    harness.lab.fhir = (call) => jsonResponse(200, call.json, { ETag: 'W/"4"' });
    const current = stored();
    const snapshot = JSON.parse(JSON.stringify(current)) as FHIRAppointment;

    const result = await access.rescheduleAppointment({
      current,
      end: '2026-11-24T09:15:00-03:00',
      etag: 'W/"3"',
      slot: 'horario-24nov-09h',
      start: '2026-11-24T09:00:00-03:00',
    });

    const { call, path } = lastFhir(harness);
    expect(call.method).toBe('PUT');
    expect(path).toBe('/fhir/r4/Appointment/ag-1');
    expect(call.headers['If-Match']).toBe('W/"3"');
    expect(call.json).toEqual({
      ...snapshot,
      end: '2026-11-24T09:15:00-03:00',
      slot: [{ reference: 'Slot/horario-24nov-09h' }],
      start: '2026-11-24T09:00:00-03:00',
    });
    // Os pedidos contidos seguem como estavam, e o recurso lido não é alterado.
    expect((call.json as FHIRAppointment).contained).toEqual(snapshot.contained);
    expect(current).toEqual(snapshot);
    expect(result).toMatchObject({ etag: 'W/"4"', resource: { id: 'ag-1' } });
  });

  it('cancela com PUT e If-Match, mudando só status e cancelationReason', async () => {
    const { access, harness } = await setup();
    harness.lab.fhir = (call) => jsonResponse(200, call.json, { ETag: 'W/"4"' });
    const current = stored();
    const reason = { text: 'Paciente desistiu.' };

    await access.cancelAppointment({ cancelationReason: reason, current, etag: 'W/"3"' });
    expect(lastFhir(harness).call.headers['If-Match']).toBe('W/"3"');
    expect(lastFhir(harness).call.json).toEqual({
      ...current,
      cancelationReason: reason,
      status: 'cancelled',
    });

    await access.cancelAppointment({ current, etag: 'W/"3"' });
    expect(lastFhir(harness).call.json).toEqual({ ...current, status: 'cancelled' });
  });

  it('recusa alteração sem id ou sem ETag', async () => {
    const { access, harness } = await setup();
    const before = harness.lab.fhirCalls.length;
    await expect(access.cancelAppointment({ current: stored(), etag: '' })).rejects.toBeInstanceOf(
      LabAccessConfigError,
    );
    await expect(
      access.cancelAppointment({ current: { ...stored(), id: undefined }, etag: 'W/"3"' }),
    ).rejects.toBeInstanceOf(LabAccessConfigError);
    await expect(
      access.cancelAppointment({
        current: { ...stored(), resourceType: 'Slot' } as never,
        etag: 'W/"3"',
      }),
    ).rejects.toBeInstanceOf(LabAccessConfigError);
    await expect(
      access.rescheduleAppointment({
        current: stored(),
        end: '',
        etag: 'W/"3"',
        slot: 's',
        start: '',
      }),
    ).rejects.toBeInstanceOf(LabAccessConfigError);
    expect(harness.lab.fhirCalls).toHaveLength(before);
  });

  it('412 VERSION_CONFLICT pede nova leitura e não é repetido às cegas', async () => {
    const { access, harness } = await setup();
    harness.lab.fhir = () => jsonResponse(412, operationOutcome('VERSION_CONFLICT', 'conflict'));
    await expect(
      access.cancelAppointment({ current: stored(), etag: 'W/"2"' }),
    ).rejects.toMatchObject({
      code: 'VERSION_CONFLICT',
      retry: 'after-reread',
      retryable: true,
    });
    expect(harness.lab.fhirCalls.filter((call) => call.method === 'PUT')).toHaveLength(1);
  });

  it('422 APPOINTMENT_NOT_MODIFIABLE não se repete', async () => {
    const { access, harness } = await setup();
    harness.lab.fhir = () =>
      jsonResponse(422, operationOutcome('APPOINTMENT_NOT_MODIFIABLE', 'business-rule'));
    await expect(
      access.cancelAppointment({ current: stored(), etag: 'W/"3"' }),
    ).rejects.toMatchObject({
      code: 'APPOINTMENT_NOT_MODIFIABLE',
      retryable: false,
    });
  });
});

describe('results.read', () => {
  it('busca laudos do paciente do consentimento, com os resultados incluídos', async () => {
    const { access, harness } = await setup();
    const report = {
      code: { text: 'Hemograma' },
      id: 'laudo-1',
      resourceType: 'DiagnosticReport',
      status: 'final',
    };
    const observation = {
      code: { text: 'Hemoglobina' },
      id: 'obs-1',
      resourceType: 'Observation',
      status: 'final',
    };
    harness.lab.fhir = () =>
      jsonResponse(200, {
        entry: [
          { resource: report, search: { mode: 'match' } },
          { resource: observation, search: { mode: 'include' } },
        ],
        resourceType: 'Bundle',
        type: 'searchset',
      });

    const page = await access.searchDiagnosticReports({
      code: 'https://laboratorio.example/exames|HEMOGRAMA',
      date: 'ge2026-01-01',
      lastUpdatedAfter: '2026-11-14T08:00:00Z',
      status: 'final',
    });
    expect(lastFhir(harness).path).toBe('/fhir/r4/DiagnosticReport');
    expect(lastFhir(harness).params).toEqual([
      ['patient', 'pac-teste-1'],
      ['_lastUpdated', 'gt2026-11-14T08:00:00Z'],
      ['date', 'ge2026-01-01'],
      ['status', 'final'],
      ['code', 'https://laboratorio.example/exames|HEMOGRAMA'],
      ['_include', 'DiagnosticReport:result'],
    ]);
    expect(page.resources).toEqual([report]);
    expect(page.included).toEqual([observation]);

    await access.searchDiagnosticReports({ includeResults: false });
    expect(lastFhir(harness).params).toEqual([['patient', 'pac-teste-1']]);
  });

  it('busca e lê resultados e laudos', async () => {
    const { access, harness } = await setup();
    await access.searchObservations({ code: 'http://loinc.org|718-7', date: 'ge2026-01-01' });
    expect(lastFhir(harness).path).toBe('/fhir/r4/Observation');
    expect(lastFhir(harness).params).toEqual([
      ['patient', 'pac-teste-1'],
      ['code', 'http://loinc.org|718-7'],
      ['date', 'ge2026-01-01'],
    ]);

    harness.lab.fhir = (_call, url) =>
      jsonResponse(200, { id: 'x', resourceType: url.pathname.split('/').at(-2) });
    expect((await access.readDiagnosticReport('x')).resource.resourceType).toBe('DiagnosticReport');
    expect((await access.readObservation('x')).resource.resourceType).toBe('Observation');
  });

  it('403 PATIENT_NOT_IN_CONSENT vira erro de autorização', async () => {
    const { access, harness } = await setup();
    harness.lab.fhir = () =>
      jsonResponse(403, operationOutcome('PATIENT_NOT_IN_CONSENT', 'forbidden'));
    await expect(access.searchDiagnosticReports()).rejects.toMatchObject({
      code: 'PATIENT_NOT_IN_CONSENT',
      name: 'LabAccessAuthorizationError',
    });
  });
});

describe('paciente e consent.read', () => {
  it('lê só o Patient do consentimento', async () => {
    const { access, harness } = await setup();
    harness.lab.fhir = () => jsonResponse(200, { id: 'pac-teste-1', resourceType: 'Patient' });
    const patient = await access.readPatient();
    expect(lastFhir(harness).path).toBe('/fhir/r4/Patient/pac-teste-1');
    expect(patient.resource.id).toBe('pac-teste-1');
    expect('readPatientById' in access).toBe(false);
  });

  it('busca e lê os registros de consentimento em FHIR', async () => {
    const { access, harness } = await setup();
    await access.searchConsents({ status: 'active' });
    expect(lastFhir(harness).path).toBe('/fhir/r4/Consent');
    expect(lastFhir(harness).params).toEqual([
      ['patient', 'pac-teste-1'],
      ['status', 'active'],
    ]);

    harness.lab.fhir = () => jsonResponse(200, { id: 'c-1', resourceType: 'Consent' });
    expect((await access.readConsent('c-1')).resource.resourceType).toBe('Consent');
    expect(lastFhir(harness).path).toBe('/fhir/r4/Consent/c-1');
  });

  it('lê o próprio consentimento pelo endpoint do protocolo, com o token de paciente', async () => {
    const { access, consent, harness } = await setup();
    const record = await access.getConsentRecord();

    const call = harness.lab.calls.at(-1)!;
    expect(call.url).toBe(`${API_BASE}/consents/${consent.consentId}`);
    expect(call.headers.Authorization).toMatch(/^Bearer patient-token/);
    expect(record).toMatchObject({ consentId: consent.consentId, status: 'AUTHORISED' });
    expect('patient' in record).toBe(false);
  });

  it('a paginação de paciente usa o token de paciente', async () => {
    const { access, harness } = await setup();
    const next = `${FHIR_BASE}/DiagnosticReport?page=2`;
    const pages = [bundle([], next), bundle([])];
    harness.lab.fhir = () => jsonResponse(200, pages.shift());
    const page = await access.searchDiagnosticReports();
    await page.next();
    expect(lastFhir(harness).call.url).toBe(next);
    expect(lastFhir(harness).call.headers.Authorization).toMatch(/^Bearer patient-token/);
  });
});

describe('readPaymentLink', () => {
  const LINK = 'https://www.laboratorio.example/pagamento/9f2c1b7e';
  const pending = (extension: unknown[]): FHIRAppointment => ({
    ...stored(),
    extension: extension as FHIRAppointment['extension'],
    status: 'pending',
  });

  it('RCP-035: lê o link só da extensão de URL canônica, em valueUrl e com https', () => {
    expect(PAYMENT_LINK_URL).toBe('https://fhir-brasil.dev.br/ig/StructureDefinition/payment-link');
    expect(readPaymentLink(pending([{ url: PAYMENT_LINK_URL, valueUrl: LINK }]))).toBe(LINK);
    expect(readPaymentLink(stored())).toBeUndefined();
  });

  it('RCP-035: link fora da extensão canônica não é procurado', () => {
    const cases: FHIRAppointment[] = [
      pending([{ url: 'https://laboratorio.example/ext/pagamento', valueUrl: LINK }]),
      { ...stored(), comment: LINK, patientInstruction: LINK, status: 'pending' },
      {
        ...stored(),
        contained: [
          {
            ...stored().contained![0]!,
            extension: [{ url: PAYMENT_LINK_URL, valueUrl: LINK }],
          },
        ],
        status: 'pending',
      },
    ];
    for (const appointment of cases) expect(readPaymentLink(appointment)).toBeUndefined();
  });

  it('RCP-035: extensão canônica com outro esquema ou sem valueUrl https é erro do provedor, sem link', () => {
    for (const extension of [
      { url: PAYMENT_LINK_URL, valueUrl: 'http://www.laboratorio.example/pagar' },
      { url: PAYMENT_LINK_URL, valueUrl: 'javascript:alert(1)' },
      { url: PAYMENT_LINK_URL, valueUrl: 'https://' },
      { url: PAYMENT_LINK_URL, valueString: LINK },
    ]) {
      expect(() => readPaymentLink(pending([extension])), JSON.stringify(extension)).toThrowError(
        LabAccessProtocolError,
      );
    }
  });

  it('RCP-044: com mais de uma extensão payment-link, nenhum link é aberto', () => {
    expect(() =>
      readPaymentLink(
        pending([
          { url: PAYMENT_LINK_URL, valueUrl: LINK },
          { url: PAYMENT_LINK_URL, valueUrl: LINK },
        ]),
      ),
    ).toThrowError(LabAccessProtocolError);
  });
});
