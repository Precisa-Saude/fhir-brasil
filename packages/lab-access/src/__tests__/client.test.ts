import { generateKeyPairSync } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { assertDistinctKeys, samePublicKey } from '../certificate';
import { LabAccessClient } from '../client';
import { LabAccessConfigError } from '../errors';
import { ParticipantRegistry } from '../registry';
import { createHarness } from './fake-lab';
import { CLIENT_ID, exampleRegistryDocument, PROVIDER_ID, testKey } from './helpers';

function exampleCertificateDer(): Uint8Array {
  const [der] = exampleRegistryDocument().participants[1]!.receiver!.transport_certificates[0]!.x5c;
  return new Uint8Array(Buffer.from(der!, 'base64'));
}

async function parts() {
  const harness = await createHarness();
  const key = await testKey('assinatura');
  return {
    clientId: CLIENT_ID,
    now: () => harness.lab.now,
    registry: harness.client.registry,
    signingKey: { key: key.privateKey, kid: key.kid },
    transport: harness.lab.transport,
  };
}

describe('LabAccessClient', () => {
  it('lista os provedores ativos do registro e expõe o registro em uso', async () => {
    const { client } = await createHarness();
    expect(client.providers().map((p) => p.participant_id)).toEqual([PROVIDER_ID]);
    expect(client.registry).toBeInstanceOf(ParticipantRegistry);
    expect(client.provider(PROVIDER_ID).providerId).toBe(PROVIDER_ID);
  });

  it('recusa configuração incompleta', async () => {
    const base = await parts();
    const invalid: object[] = [
      { ...base, registry: { document: base.registry.document } },
      { ...base, clientId: '00000000-0000-4000-8000-000000000000' },
      { ...base, signingKey: { key: base.signingKey.key, kid: '' } },
      { ...base, signingKey: undefined },
      { ...base, transport: {} },
    ];
    for (const config of invalid) {
      expect(() => new LabAccessClient(config as never)).toThrowError(LabAccessConfigError);
    }
    expect(() => new LabAccessClient(undefined as never)).toThrowError(LabAccessConfigError);
  });

  it('um registro não pode ser construído fora de verifyRegistry', async () => {
    const base = await parts();
    expect(
      () => new ParticipantRegistry(Symbol('falso'), base.registry.document, base.registry.bytes),
    ).toThrowError(LabAccessConfigError);
  });

  it('usa o relógio e a espera do sistema quando não são informados', async () => {
    const base = await parts();
    const client = new LabAccessClient({ ...base, now: undefined });
    expect(client.providers()).toHaveLength(1);
  });

  it('não aceita voltar para um registro de sequence menor, nem um sem o receptor', async () => {
    const { client } = await createHarness({ registry: (doc) => (doc.sequence = 9) });
    const older = await createHarness();
    expect(() => client.updateRegistry(older.client.registry)).toThrowError(LabAccessConfigError);

    const without = await createHarness({
      registry: (doc) => {
        doc.sequence = 10;
        doc.participants.pop();
      },
      config: { clientId: undefined },
    }).catch((err: unknown) => err);
    expect(without).toBeInstanceOf(LabAccessConfigError);
  });

  describe('certificado de transporte', () => {
    it('aceita o certificado que está no registro e dentro da validade', async () => {
      const base = await parts();
      const transport = { ...base.transport, clientCertificate: exampleCertificateDer() };
      expect(() => new LabAccessClient({ ...base, transport })).not.toThrow();
    });

    it('recusa certificado fora de transport_certificates', async () => {
      const base = await parts();
      const der = exampleCertificateDer();
      der[der.length - 1] = der[der.length - 1]! ^ 0xff;
      const transport = { ...base.transport, clientCertificate: der };
      expect(() => new LabAccessClient({ ...base, transport })).toThrowError(
        /transport_certificates/,
      );
    });

    it('recusa certificado fora da validade do registro', async () => {
      const base = await parts();
      const transport = { ...base.transport, clientCertificate: exampleCertificateDer() };
      for (const now of ['2026-10-31T23:59:59Z', '2027-11-01T00:00:01Z']) {
        expect(
          () => new LabAccessClient({ ...base, now: () => new Date(now), transport }),
        ).toThrowError(/validade/);
      }
    });

    it('exige chave de assinatura distinta da chave do certificado', async () => {
      const a = generateKeyPairSync('rsa', { modulusLength: 2048 });
      const b = await testKey('assinatura');
      expect(samePublicKey(a.privateKey, a.publicKey)).toBe(true);
      expect(samePublicKey(a.privateKey, b.publicKey)).toBe(false);

      const der = exampleCertificateDer();
      expect(() => assertDistinctKeys({ key: b.privateKey, kid: b.kid }, der)).not.toThrow();
      const webKey = await crypto.subtle.importKey(
        'pkcs8',
        b.privateKey.export({ format: 'der', type: 'pkcs8' }),
        { hash: 'SHA-256', name: 'RSA-PSS' },
        true,
        ['sign'],
      );
      expect(() => assertDistinctKeys({ key: webKey, kid: b.kid }, der)).not.toThrow();
    });
  });
});
