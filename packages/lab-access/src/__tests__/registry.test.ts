import { constants, createHash, generateKeyPairSync, type KeyObject, sign } from 'node:crypto';

import { calculateJwkThumbprint, exportJWK } from 'jose';
import { describe, expect, it } from 'vitest';

import {
  LabAccessConfigError,
  ProviderUnavailableError,
  RegistryVerificationError,
} from '../errors';
import { negotiateProtocolVersion, verifyRegistry } from '../registry';
import type { RegistryDocument, RegistryKey } from '../registry-types';
import {
  buildRegistryDocument,
  CLIENT_ID,
  encodeJson,
  EXAMPLE_NOW,
  exampleRegistryBytes,
  exampleRegistryDocument,
  exampleRegistrySignature,
  ISSUER,
  PROVIDER_ID,
  signDetached,
  testKey,
} from './helpers';

async function signed(change?: (doc: RegistryDocument) => void) {
  const key = await testKey();
  const bytes = encodeJson(await buildRegistryDocument(change));
  return { bytes, key, signature: await signDetached(bytes, key) };
}

async function expectRejection(promise: Promise<unknown>, reason: string, step?: string) {
  const error = await promise.then(
    () => undefined,
    (err: unknown) => err,
  );
  expect(error).toBeInstanceOf(RegistryVerificationError);
  expect((error as RegistryVerificationError).reason).toBe(reason);
  if (step !== undefined) expect((error as RegistryVerificationError).step).toBe(step);
}

/** Par RSA de 1024 bits, abaixo do mínimo, com `kid` igual ao thumbprint. */
async function weakKey() {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 1024 });
  const exported = await exportJWK(publicKey);
  const kid = await calculateJwkThumbprint(exported, 'sha256');
  const jwk: RegistryKey = {
    alg: 'PS256',
    e: exported.e!,
    kid,
    kty: 'RSA',
    n: exported.n!,
    use: 'sig',
  };
  return { jwk, privateKey };
}

/**
 * Assina sem a jose, que se recusa a assinar com chave RSA menor que 2048
 * bits: o teste precisa de uma assinatura PS256 válida feita com chave curta.
 */
function signDetachedRaw(bytes: Uint8Array, privateKey: KeyObject, kid: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'PS256', kid, typ: 'JOSE' })).toString(
    'base64url',
  );
  const input = Buffer.from(`${header}.${Buffer.from(bytes).toString('base64url')}`);
  const signature = sign('sha256', input, {
    key: privateKey,
    padding: constants.RSA_PKCS1_PSS_PADDING,
    saltLength: 32,
  });
  return `${header}..${signature.toString('base64url')}`;
}

describe('fixtures do registro', () => {
  it('são os bytes publicados com a especificação 0.2.1 (formatador não pode tocar neles)', () => {
    const digest = createHash('sha256').update(exampleRegistryBytes()).digest('hex');
    expect(digest).toBe('adc217e2c2ae7dada0735e362682ac2c82441f2880c9e2c6e5a7bfb45372fe46');
  });
});

describe('verifyRegistry', () => {
  const exampleTrust = () => ({
    environment: 'pilot' as const,
    initialKeys: exampleRegistryDocument().registry_keys.keys,
  });

  it('aceita o registro de exemplo da especificação com a assinatura destacada', async () => {
    const { changed, registry } = await verifyRegistry({
      now: EXAMPLE_NOW,
      registry: exampleRegistryBytes(),
      signature: exampleRegistrySignature(),
      trust: exampleTrust(),
    });

    expect(changed).toBe(true);
    expect(registry.sequence).toBe(7);
    expect(registry.environment).toBe('pilot');
    expect(registry.expiresAt.toISOString()).toBe('2026-12-16T12:00:00.000Z');
    expect(registry.document.schema_version).toBe('0.1');
    expect(registry.isExpired(EXAMPLE_NOW)).toBe(false);
  });

  it('expõe provedores ativos e seus endereços', async () => {
    const { registry } = await verifyRegistry({
      now: EXAMPLE_NOW,
      registry: exampleRegistryBytes(),
      signature: exampleRegistrySignature(),
      trust: exampleTrust(),
    });

    const providers = registry.providers();
    expect(providers).toHaveLength(1);
    expect(providers[0]!.participant_id).toBe(PROVIDER_ID);
    expect(providers[0]!.provider).toMatchObject({
      api_base_url: 'https://api.laboratorio.example/acesso/v0',
      fhir_base_url: 'https://api.laboratorio.example/fhir/r4',
      issuer: ISSUER,
    });
    expect(registry.getProvider(PROVIDER_ID).display_name).toBe('Laboratório Exemplo');
    expect(registry.getReceiver(CLIENT_ID).receiver.redirect_uris).toEqual([
      'https://app-paciente.example/conexoes/retorno',
    ]);
  });

  it('REG-001: recusa registro sem assinatura', async () => {
    await expectRejection(
      verifyRegistry({
        now: EXAMPLE_NOW,
        registry: exampleRegistryBytes(),
        signature: '',
        trust: exampleTrust(),
      }),
      'malformed-signature',
    );
  });

  it('REG-001: recusa registro com um byte alterado', async () => {
    const tampered = exampleRegistryBytes();
    const text = Buffer.from(tampered).toString('utf-8').replace('"sequence": 7', '"sequence": 8');
    await expectRejection(
      verifyRegistry({
        now: EXAMPLE_NOW,
        registry: new TextEncoder().encode(text),
        signature: exampleRegistrySignature(),
        trust: exampleTrust(),
      }),
      'invalid-signature',
    );
  });

  it('REG-001: recusa assinatura adulterada', async () => {
    const [header, , sig] = exampleRegistrySignature().trim().split('.');
    const flipped = (sig![0] === 'A' ? 'B' : 'A') + sig!.slice(1);
    await expectRejection(
      verifyRegistry({
        now: EXAMPLE_NOW,
        registry: exampleRegistryBytes(),
        signature: `${header}..${flipped}`,
        trust: exampleTrust(),
      }),
      'invalid-signature',
    );
  });

  it('REG-001: recusa assinatura feita com chave fora do conjunto de confiança', async () => {
    const { bytes, signature } = await signed();
    await expectRejection(
      verifyRegistry({ now: EXAMPLE_NOW, registry: bytes, signature, trust: exampleTrust() }),
      'unknown-key',
    );
  });

  it('REG-001: recusa quando o kid aponta para uma chave e a assinatura é de outra', async () => {
    const key = await testKey();
    const other = await testKey('outra');
    const bytes = encodeJson(await buildRegistryDocument());
    const signature = await signDetached(bytes, { ...other, kid: key.kid });
    await expectRejection(
      verifyRegistry({
        now: EXAMPLE_NOW,
        registry: bytes,
        signature,
        trust: { environment: 'pilot' as const, initialKeys: [key.jwk] },
      }),
      'invalid-signature',
    );
  });

  it('REG-007: recusa JWS que não tem três campos com o segundo vazio (V2)', async () => {
    const key = await testKey();
    const bytes = encodeJson(await buildRegistryDocument());
    const trust = { environment: 'pilot' as const, initialKeys: [key.jwk] };
    const [header, , sig] = (await signDetached(bytes, key)).split('.');

    const notObject = Buffer.from('["PS256"]').toString('base64url');
    for (const signature of [
      `${header}.${Buffer.from(bytes).toString('base64url')}.${sig}`,
      'abc',
      '!!..!!',
      `${header}..`,
      `${notObject}..${sig}`,
    ]) {
      await expectRejection(
        verifyRegistry({ now: EXAMPLE_NOW, registry: bytes, signature, trust }),
        'malformed-signature',
        'V2',
      );
    }
  });

  it('REG-011: ignora typ, membros a mais e jwk de outra chave no cabeçalho, e só usa o kid', async () => {
    const key = await testKey();
    const other = await testKey('outra');
    const bytes = encodeJson(await buildRegistryDocument());
    const trust = { environment: 'pilot' as const, initialKeys: [key.jwk] };
    for (const header of [{ typ: 'JWT' }, { extra: true }, { jwk: other.jwk }]) {
      const { registry } = await verifyRegistry({
        now: EXAMPLE_NOW,
        registry: bytes,
        signature: await signDetached(bytes, key, header),
        trust,
      });
      expect(registry.sequence).toBe(7);
    }
  });

  it('REG-007: recusa algoritmo diferente de PS256, inclusive none (V3)', async () => {
    const key = await testKey();
    const bytes = encodeJson(await buildRegistryDocument());
    const trust = { environment: 'pilot' as const, initialKeys: [key.jwk] };
    for (const alg of ['none', 'RS256', 'ES256']) {
      const header = Buffer.from(JSON.stringify({ alg, kid: key.kid, typ: 'JOSE' })).toString(
        'base64url',
      );
      await expectRejection(
        verifyRegistry({ now: EXAMPLE_NOW, registry: bytes, signature: `${header}..AAAA`, trust }),
        'unsupported-algorithm',
        'V3',
      );
    }
  });

  it('REG-011: recusa no passo V3 o candidato que traz crit, mesmo validamente assinado', async () => {
    const key = await testKey();
    const bytes = encodeJson(await buildRegistryDocument());
    const trust = { environment: 'pilot' as const, initialKeys: [key.jwk] };
    for (const crit of [['exp'], ['b64'], []]) {
      const header = Buffer.from(
        JSON.stringify({ alg: 'PS256', crit, exp: 1, kid: key.kid, typ: 'JOSE' }),
      ).toString('base64url');
      const input = Buffer.from(`${header}.${Buffer.from(bytes).toString('base64url')}`);
      const signature = sign('sha256', input, {
        key: key.privateKey,
        padding: constants.RSA_PKCS1_PSS_PADDING,
        saltLength: 32,
      }).toString('base64url');
      await expectRejection(
        verifyRegistry({
          now: EXAMPLE_NOW,
          registry: bytes,
          signature: `${header}..${signature}`,
          trust,
        }),
        'critical-header',
        'V3',
      );
    }
  });

  it('REG-010: o schema recusa entrada que lista uma versão 0.x junto com outra', async () => {
    for (const versions of [
      ['0.2', '1.0'],
      ['0.2', '0.3'],
      ['1.0', '0.2'],
    ]) {
      const { bytes, key, signature } = await signed(
        (doc) => (doc.participants[0]!.protocol_versions = versions),
      );
      await expectRejection(
        verifyRegistry({
          now: EXAMPLE_NOW,
          registry: bytes,
          signature,
          trust: { environment: 'pilot', initialKeys: [key.jwk] },
        }),
        'invalid-schema',
        'V7',
      );
    }
    // Sem versão 0.x, mais de uma versão continua permitida.
    const { bytes, key, signature } = await signed(
      (doc) => (doc.participants[0]!.protocol_versions = ['1.0', '1.1']),
    );
    const { registry } = await verifyRegistry({
      now: EXAMPLE_NOW,
      registry: bytes,
      signature,
      trust: { environment: 'pilot', initialKeys: [key.jwk] },
    });
    expect(registry.findParticipant(PROVIDER_ID)!.protocol_versions).toEqual(['1.0', '1.1']);
  });

  it('REG-007: chave anunciada só no próprio candidato não serve para verificá-lo (V4)', async () => {
    const trusted = await testKey();
    const own = await testKey('propria');
    const bytes = encodeJson(
      await buildRegistryDocument((doc) => doc.registry_keys.keys.push(own.jwk)),
    );
    await expectRejection(
      verifyRegistry({
        now: EXAMPLE_NOW,
        registry: bytes,
        signature: await signDetached(bytes, own),
        trust: { environment: 'pilot', initialKeys: [trusted.jwk] },
      }),
      'unknown-key',
      'V4',
    );
  });

  it('REG-007: recusa chave de confiança cujo kid não é o thumbprint RFC 7638 (V5)', async () => {
    const { bytes, key } = await signed();
    const forged = { ...key.jwk, kid: 'A'.repeat(43) };
    const signature = await signDetached(bytes, { ...key, kid: forged.kid });
    await expectRejection(
      verifyRegistry({
        now: EXAMPLE_NOW,
        registry: bytes,
        signature,
        trust: { environment: 'pilot' as const, initialKeys: [forged] },
      }),
      'invalid-key-id',
      'V5',
    );
  });

  it('REG-007: recusa chave de confiança RSA com menos de 2048 bits, mesmo com assinatura válida (V5)', async () => {
    const weak = await weakKey();
    const bytes = encodeJson(await buildRegistryDocument());
    await expectRejection(
      verifyRegistry({
        now: EXAMPLE_NOW,
        registry: bytes,
        signature: signDetachedRaw(bytes, weak.privateKey, weak.jwk.kid),
        trust: { environment: 'pilot', initialKeys: [weak.jwk] },
      }),
      'weak-key',
      'V5',
    );
  });

  it('REG-007: recusa chave de confiança com módulo vazio ou ilegível (V5)', async () => {
    const bytes = encodeJson(await buildRegistryDocument());
    for (const n of ['AAAA', '***']) {
      const kid = await calculateJwkThumbprint({ e: 'AQAB', kty: 'RSA', n }, 'sha256');
      const jwk: RegistryKey = { alg: 'PS256', e: 'AQAB', kid, kty: 'RSA', n, use: 'sig' };
      const header = Buffer.from(JSON.stringify({ alg: 'PS256', kid, typ: 'JOSE' })).toString(
        'base64url',
      );
      await expectRejection(
        verifyRegistry({
          now: EXAMPLE_NOW,
          registry: bytes,
          signature: `${header}..AAAA`,
          trust: { environment: 'pilot', initialKeys: [jwk] },
        }),
        'weak-key',
        'V5',
      );
    }
  });

  it('REG-007: recusa documento que anuncia chave com kid diferente do thumbprint (V13)', async () => {
    const { bytes, key, signature } = await signed((doc) => {
      doc.registry_keys.keys[0]!.kid = 'B'.repeat(43);
    });
    await expectRejection(
      verifyRegistry({
        now: EXAMPLE_NOW,
        registry: bytes,
        signature,
        trust: { environment: 'pilot' as const, initialKeys: [key.jwk] },
      }),
      'invalid-key-id',
      'V13',
    );
  });

  it('REG-007: recusa registro de outro ambiente (V8)', async () => {
    const { bytes, key, signature } = await signed();
    await expectRejection(
      verifyRegistry({
        now: EXAMPLE_NOW,
        registry: bytes,
        signature,
        trust: { environment: 'production', initialKeys: [key.jwk] },
      }),
      'wrong-environment',
      'V8',
    );

    // Com um documento já aceito, o ambiente é o dele.
    const { registry: current } = await verifyRegistry({
      now: EXAMPLE_NOW,
      registry: bytes,
      signature,
      trust: { environment: 'pilot', initialKeys: [key.jwk] },
    });
    const next = await signed((doc) => {
      doc.environment = 'production';
      doc.sequence = 8;
    });
    await expectRejection(
      verifyRegistry({
        now: EXAMPLE_NOW,
        registry: next.bytes,
        signature: next.signature,
        trust: { current },
      }),
      'wrong-environment',
      'V8',
    );
  });

  it('o primeiro documento exige o ambiente em que o participante opera', async () => {
    const { bytes, key, signature } = await signed();
    await expect(
      verifyRegistry({
        now: EXAMPLE_NOW,
        registry: bytes,
        signature,
        trust: { initialKeys: [key.jwk] } as never,
      }),
    ).rejects.toBeInstanceOf(LabAccessConfigError);
  });

  it('REG-007: recusa participant_id repetido ou client_id diferente do participant_id (V14)', async () => {
    const changes: ((doc: RegistryDocument) => void)[] = [
      (doc) => doc.participants.push({ ...doc.participants[0]!, display_name: 'Cópia' }),
      (doc) => (doc.participants[1]!.receiver!.client_id = '0f1e2d3c-4b5a-4968-8776-655443322110'),
    ];
    for (const change of changes) {
      const { bytes, key, signature } = await signed(change);
      await expectRejection(
        verifyRegistry({
          now: EXAMPLE_NOW,
          registry: bytes,
          signature,
          trust: { environment: 'pilot', initialKeys: [key.jwk] },
        }),
        'duplicate-participant',
        'V14',
      );
    }
  });

  it('REG-007: aplica os passos na ordem e recusa no primeiro que falha', async () => {
    const key = await testKey();
    const trust = { environment: 'production' as const, initialKeys: [key.jwk] };
    // Ambiente errado (V8) e validade acima de 30 dias (V11): vale o V8.
    const both = await signed((doc) => (doc.expires_at = '2027-01-16T12:00:00Z'));
    await expectRejection(
      verifyRegistry({ now: EXAMPLE_NOW, registry: both.bytes, signature: both.signature, trust }),
      'wrong-environment',
      'V8',
    );

    // Sequência antiga (V9) e kid anunciado errado (V13): vale o V9.
    const { registry: current } = await verifyRegistry({
      now: EXAMPLE_NOW,
      registry: (await signed()).bytes,
      signature: (await signed()).signature,
      trust: { environment: 'pilot', initialKeys: [key.jwk] },
    });
    const stale = await signed((doc) => {
      doc.sequence = 6;
      doc.registry_keys.keys[0]!.kid = 'C'.repeat(43);
    });
    await expectRejection(
      verifyRegistry({
        now: EXAMPLE_NOW,
        registry: stale.bytes,
        signature: stale.signature,
        trust: { current },
      }),
      'stale-sequence',
      'V9',
    );
  });

  describe('REG-003: schema', () => {
    const cases: [string, (doc: any) => void][] = [
      ['campo obrigatório ausente', (doc) => delete doc.expires_at],
      ['campo desconhecido na raiz', (doc) => (doc.extra = 1)],
      ['schema_version fora de 0.x', (doc) => (doc.schema_version = '1.0')],
      ['environment desconhecido', (doc) => (doc.environment = 'sandbox')],
      ['sequence não inteiro', (doc) => (doc.sequence = 1.5)],
      ['sequence menor que 1', (doc) => (doc.sequence = 0)],
      ['data com fração de segundo', (doc) => (doc.issued_at = '2026-11-15T12:00:00.000Z')],
      ['registry_keys vazio', (doc) => (doc.registry_keys.keys = [])],
      ['chave com algoritmo diferente', (doc) => (doc.registry_keys.keys[0].alg = 'RS256')],
      ['chave RSA curta', (doc) => (doc.registry_keys.keys[0].n = 'abc')],
      ['chave com campo privado', (doc) => (doc.registry_keys.keys[0].d = 'abc')],
      ['participants não é lista', (doc) => (doc.participants = {})],
      ['participante sem status', (doc) => delete doc.participants[0].status],
      ['status desconhecido', (doc) => (doc.participants[0].status = 'paused')],
      ['participant_id não é UUID', (doc) => (doc.participants[0].participant_id = 'abc')],
      ['cnpj malformado', (doc) => (doc.participants[0].cnpj = '123')],
      ['contato sem e-mail válido', (doc) => (doc.participants[0].contacts.security_email = 'x')],
      ['protocol_versions vazio', (doc) => (doc.participants[0].protocol_versions = [])],
      [
        'protocol_versions repetido',
        (doc) => (doc.participants[0].protocol_versions = ['0.2', '0.2']),
      ],
      ['provedor sem bloco provider', (doc) => delete doc.participants[0].provider],
      [
        'provedor com bloco receiver',
        (doc) => (doc.participants[0].receiver = doc.participants[1].receiver),
      ],
      [
        'issuer sem https',
        (doc) => (doc.participants[0].provider.issuer = 'http://auth.laboratorio.example'),
      ],
      ['escopo desconhecido', (doc) => doc.participants[0].provider.scopes_supported.push('admin')],
      [
        'campo desconhecido no provedor',
        (doc) => (doc.participants[0].provider.token_endpoint = 'https://x.example'),
      ],
      ['receptor sem bloco receiver', (doc) => delete doc.participants[1].receiver],
      [
        'receptor que é operadora',
        (doc) => (doc.participants[1].receiver.eligibility.health_plan_operator = true),
      ],
      [
        'receptor que não é voltado ao paciente',
        (doc) => (doc.participants[1].receiver.eligibility.patient_facing = false),
      ],
      [
        'redirect_uri sem https',
        (doc) => (doc.participants[1].receiver.redirect_uris = ['http://app.example/cb']),
      ],
      [
        'sem certificado de transporte',
        (doc) => (doc.participants[1].receiver.transport_certificates = []),
      ],
      [
        'certificado sem x5c',
        (doc) => delete doc.participants[1].receiver.transport_certificates[0].x5c,
      ],
      [
        'thumbprint de certificado malformado',
        (doc) => (doc.participants[1].receiver.transport_certificates[0]['x5t#S256'] = 'abc'),
      ],
      [
        'declared_at malformado',
        (doc) => (doc.participants[1].receiver.eligibility.declared_at = '01/11/2026'),
      ],
      ['role desconhecido', (doc) => (doc.participants[1].role = 'broker')],
    ];

    it.each(cases)('recusa documento assinado com %s', async (_name, change) => {
      const { bytes, key, signature } = await signed(change);
      await expectRejection(
        verifyRegistry({
          now: EXAMPLE_NOW,
          registry: bytes,
          signature,
          trust: { environment: 'pilot' as const, initialKeys: [key.jwk] },
        }),
        'invalid-schema',
      );
    });

    it('recusa conteúdo que não é JSON ou não é objeto', async () => {
      const key = await testKey();
      for (const text of ['{nope', '[]', 'null']) {
        const bytes = new TextEncoder().encode(text);
        await expectRejection(
          verifyRegistry({
            now: EXAMPLE_NOW,
            registry: bytes,
            signature: await signDetached(bytes, key),
            trust: { environment: 'pilot' as const, initialKeys: [key.jwk] },
          }),
          'invalid-schema',
        );
      }
    });
  });

  describe('sequência e validade', () => {
    async function accepted(change?: (doc: RegistryDocument) => void) {
      const { bytes, key, signature } = await signed(change);
      const { registry } = await verifyRegistry({
        now: EXAMPLE_NOW,
        registry: bytes,
        signature,
        trust: { environment: 'pilot' as const, initialKeys: [key.jwk] },
      });
      return registry;
    }

    it('REG-002: candidato com sequence anterior à do documento em uso é recusado', async () => {
      const current = await accepted();
      const older = await signed((doc) => (doc.sequence = 6));
      await expectRejection(
        verifyRegistry({
          now: EXAMPLE_NOW,
          registry: older.bytes,
          signature: older.signature,
          trust: { current },
        }),
        'stale-sequence',
      );
    });

    it('com a mesma sequence e os mesmos bytes, segue com o documento atual', async () => {
      const current = await accepted();
      const same = await signed();
      const result = await verifyRegistry({
        now: EXAMPLE_NOW,
        registry: same.bytes,
        signature: same.signature,
        trust: { current },
      });
      expect(result.changed).toBe(false);
      expect(result.registry).toBe(current);
    });

    it('recusa a mesma sequence com bytes diferentes', async () => {
      const current = await accepted();
      const other = await signed((doc) => (doc.participants[0]!.display_name = 'Outro nome'));
      await expectRejection(
        verifyRegistry({
          now: EXAMPLE_NOW,
          registry: other.bytes,
          signature: other.signature,
          trust: { current },
        }),
        'sequence-conflict',
      );
    });

    it('aceita sequence maior e passa a usar as chaves do documento novo', async () => {
      const next = await testKey('proxima');
      const key = await testKey();
      const current = await accepted((doc) => doc.registry_keys.keys.push(next.jwk));

      const bytes = encodeJson(
        await buildRegistryDocument((doc) => {
          doc.sequence = 8;
          doc.registry_keys.keys = [next.jwk];
        }),
      );
      const result = await verifyRegistry({
        now: EXAMPLE_NOW,
        registry: bytes,
        signature: await signDetached(bytes, next),
        trust: { current },
      });
      expect(result.changed).toBe(true);
      expect(result.registry.sequence).toBe(8);

      // A chave antiga saiu de registry_keys: não assina mais o documento seguinte.
      const after = encodeJson(await buildRegistryDocument((doc) => (doc.sequence = 9)));
      await expectRejection(
        verifyRegistry({
          now: EXAMPLE_NOW,
          registry: after,
          signature: await signDetached(after, key),
          trust: { current: result.registry },
        }),
        'unknown-key',
      );
    });

    it('REG-007: recusa issued_at mais de 60 segundos no futuro (V10)', async () => {
      const { bytes, key, signature } = await signed((doc) => {
        doc.issued_at = '2026-11-16T12:01:01Z';
      });
      await expectRejection(
        verifyRegistry({
          now: EXAMPLE_NOW,
          registry: bytes,
          signature,
          trust: { environment: 'pilot' as const, initialKeys: [key.jwk] },
        }),
        'issued-in-future',
      );
    });

    it('aceita issued_at até 60 segundos no futuro', async () => {
      const registry = await accepted((doc) => (doc.issued_at = '2026-11-16T12:01:00Z'));
      expect(registry.issuedAt.toISOString()).toBe('2026-11-16T12:01:00.000Z');
    });

    it('REG-007: recusa candidato com expires_at no passado (V12)', async () => {
      const { bytes, key, signature } = await signed();
      await expectRejection(
        verifyRegistry({
          now: new Date('2026-12-16T12:00:01Z'),
          registry: bytes,
          signature,
          trust: { environment: 'pilot' as const, initialKeys: [key.jwk] },
        }),
        'expired',
      );
    });

    it('REG-007: recusa validade maior que 30 dias ou invertida (V11)', async () => {
      for (const expires of ['2026-12-16T12:00:01Z', '2026-11-16T11:00:00Z']) {
        const { bytes, key, signature } = await signed((doc) => (doc.expires_at = expires));
        await expectRejection(
          verifyRegistry({
            now: new Date('2026-11-16T12:00:00Z'),
            registry: bytes,
            signature,
            trust: { environment: 'pilot' as const, initialKeys: [key.jwk] },
          }),
          'invalid-validity',
        );
      }
    });

    it('REG-008: informa que o documento atual expirou', async () => {
      const registry = await accepted();
      expect(registry.isExpired(new Date('2026-12-16T12:00:00Z'))).toBe(false);
      expect(registry.isExpired(new Date('2026-12-16T12:00:01Z'))).toBe(true);
    });
  });

  describe('consulta de participantes', () => {
    async function registryWith(change: (doc: RegistryDocument) => void) {
      const { bytes, key, signature } = await signed(change);
      return (
        await verifyRegistry({
          now: EXAMPLE_NOW,
          registry: bytes,
          signature,
          trust: { environment: 'pilot' as const, initialKeys: [key.jwk] },
        })
      ).registry;
    }

    it('REG-005: provedor suspenso ou retirado deixa de ser oferecido', async () => {
      for (const status of ['suspended', 'withdrawn'] as const) {
        const registry = await registryWith((doc) => (doc.participants[0]!.status = status));
        expect(registry.providers()).toEqual([]);
        expect(() => registry.getProvider(PROVIDER_ID)).toThrowError(ProviderUnavailableError);
        expect(registry.findParticipant(PROVIDER_ID)?.status).toBe(status);
      }
    });

    it('recusa identificador desconhecido ou de papel errado', async () => {
      const registry = await registryWith(() => {});
      expect(() => registry.getProvider(CLIENT_ID)).toThrowError(ProviderUnavailableError);
      expect(() => registry.getProvider('00000000-0000-4000-8000-000000000000')).toThrowError(
        ProviderUnavailableError,
      );
      expect(() => registry.getReceiver(PROVIDER_ID)).toThrowError(/receptor/);
    });

    it('o documento exposto não pode ser alterado', async () => {
      const registry = await registryWith(() => {});
      expect(() => {
        (registry.document.participants[0] as { status: string }).status = 'withdrawn';
      }).toThrow();
    });
  });
});

describe('negotiateProtocolVersion', () => {
  it('REG-009: com MAJOR 0, só versão idêntica se comunica', () => {
    expect(negotiateProtocolVersion(['0.2'], ['0.2'])).toBe('0.2');
    expect(() => negotiateProtocolVersion(['0.2'], ['0.3'])).toThrowError(ProviderUnavailableError);
  });

  it('REG-009: com MAJOR 1 ou mais, vale o menor entre os maiores MINOR de cada lado', () => {
    expect(negotiateProtocolVersion(['1.1'], ['1.3'])).toBe('1.1');
    expect(negotiateProtocolVersion(['1.3'], ['1.1'])).toBe('1.1');
    expect(negotiateProtocolVersion(['1.0', '1.2', '2.0'], ['1.0', '1.2'])).toBe('1.2');
    expect(negotiateProtocolVersion(['1.10', '1.9'], ['1.9', '1.10'])).toBe('1.10');
  });

  it('REG-009: usa o maior MAJOR em comum', () => {
    expect(negotiateProtocolVersion(['0.2', '1.4'], ['1.1', '2.0'])).toBe('1.1');
    expect(negotiateProtocolVersion(['0.2', '3.0'], ['0.2'])).toBe('0.2');
  });

  it('REG-009: sem MAJOR em comum, não há comunicação', () => {
    expect(() => negotiateProtocolVersion(['1.0'], ['2.0'])).toThrowError(ProviderUnavailableError);
    expect(() => negotiateProtocolVersion(['0.2'], ['1.0'])).toThrowError(ProviderUnavailableError);
  });
});
