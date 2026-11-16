import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { ProviderUnavailableError, RegistryVerificationError } from '../errors';
import { negotiateProtocolVersion, verifyRegistry } from '../registry';
import type { RegistryDocument } from '../registry-types';
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

async function expectRejection(promise: Promise<unknown>, reason: string) {
  const error = await promise.then(
    () => undefined,
    (err: unknown) => err,
  );
  expect(error).toBeInstanceOf(RegistryVerificationError);
  expect((error as RegistryVerificationError).reason).toBe(reason);
}

describe('fixtures do registro', () => {
  it('são os bytes publicados com a especificação (formatador não pode tocar neles)', () => {
    const digest = createHash('sha256').update(exampleRegistryBytes()).digest('hex');
    expect(digest).toBe('1f89b1ae699bfb185faffb4bf5ad50c5ddf9b57e7c3d9f1f6e9ea67aa0dc2d3d');
  });
});

describe('verifyRegistry', () => {
  const exampleTrust = () => ({ initialKeys: exampleRegistryDocument().registry_keys.keys });

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
    expect(registry.expiresAt.toISOString()).toBe('2026-12-15T12:00:00.000Z');
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
      api_base_url: 'https://api.laboratorio.example/acesso/v1',
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
        trust: { initialKeys: [key.jwk] },
      }),
      'invalid-signature',
    );
  });

  it('REG-001: recusa JWS que não é de conteúdo destacado ou tem cabeçalho fora do previsto', async () => {
    const key = await testKey();
    const bytes = encodeJson(await buildRegistryDocument());
    const trust = { initialKeys: [key.jwk] };
    const [header, , sig] = (await signDetached(bytes, key)).split('.');

    await expectRejection(
      verifyRegistry({
        now: EXAMPLE_NOW,
        registry: bytes,
        signature: `${header}.${Buffer.from(bytes).toString('base64url')}.${sig}`,
        trust,
      }),
      'malformed-signature',
    );
    await expectRejection(
      verifyRegistry({ now: EXAMPLE_NOW, registry: bytes, signature: 'abc', trust }),
      'malformed-signature',
    );
    await expectRejection(
      verifyRegistry({ now: EXAMPLE_NOW, registry: bytes, signature: '!!..!!', trust }),
      'malformed-signature',
    );
    await expectRejection(
      verifyRegistry({
        now: EXAMPLE_NOW,
        registry: bytes,
        signature: await signDetached(bytes, key, { typ: 'JWT' }),
        trust,
      }),
      'malformed-signature',
    );
    await expectRejection(
      verifyRegistry({
        now: EXAMPLE_NOW,
        registry: bytes,
        signature: await signDetached(bytes, key, { extra: true }),
        trust,
      }),
      'malformed-signature',
    );
  });

  it('REG-001: não aceita outro algoritmo além de PS256', async () => {
    const key = await testKey();
    const bytes = encodeJson(await buildRegistryDocument());
    const header = Buffer.from(JSON.stringify({ alg: 'none', kid: key.kid, typ: 'JOSE' })).toString(
      'base64url',
    );
    await expectRejection(
      verifyRegistry({
        now: EXAMPLE_NOW,
        registry: bytes,
        signature: `${header}..`,
        trust: { initialKeys: [key.jwk] },
      }),
      'malformed-signature',
    );
    const rs256 = Buffer.from(JSON.stringify({ alg: 'RS256', kid: key.kid, typ: 'JOSE' })).toString(
      'base64url',
    );
    await expectRejection(
      verifyRegistry({
        now: EXAMPLE_NOW,
        registry: bytes,
        signature: `${rs256}..AAAA`,
        trust: { initialKeys: [key.jwk] },
      }),
      'malformed-signature',
    );
  });

  it('recusa chave de confiança cujo kid não é o thumbprint RFC 7638', async () => {
    const { bytes, key } = await signed();
    const forged = { ...key.jwk, kid: 'A'.repeat(43) };
    const signature = await signDetached(bytes, { ...key, kid: forged.kid });
    await expectRejection(
      verifyRegistry({
        now: EXAMPLE_NOW,
        registry: bytes,
        signature,
        trust: { initialKeys: [forged] },
      }),
      'invalid-key-id',
    );
  });

  it('recusa documento que anuncia chave com kid diferente do thumbprint', async () => {
    const { bytes, key, signature } = await signed((doc) => {
      doc.registry_keys.keys[0]!.kid = 'B'.repeat(43);
    });
    await expectRejection(
      verifyRegistry({
        now: EXAMPLE_NOW,
        registry: bytes,
        signature,
        trust: { initialKeys: [key.jwk] },
      }),
      'invalid-key-id',
    );
  });

  describe('REG-003: schema', () => {
    const cases: [string, (doc: any) => void][] = [
      ['campo obrigatório ausente', (doc) => delete doc.expires_at],
      ['campo desconhecido na raiz', (doc) => (doc.extra = 1)],
      ['schema_version fora de 1.x', (doc) => (doc.schema_version = '2.0')],
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
        (doc) => (doc.participants[0].protocol_versions = ['1.0', '1.0']),
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
          trust: { initialKeys: [key.jwk] },
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
            trust: { initialKeys: [key.jwk] },
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
        trust: { initialKeys: [key.jwk] },
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

    it('recusa issued_at mais de 60 segundos no futuro', async () => {
      const { bytes, key, signature } = await signed((doc) => {
        doc.issued_at = '2026-11-16T12:01:01Z';
      });
      await expectRejection(
        verifyRegistry({
          now: EXAMPLE_NOW,
          registry: bytes,
          signature,
          trust: { initialKeys: [key.jwk] },
        }),
        'issued-in-future',
      );
    });

    it('aceita issued_at até 60 segundos no futuro', async () => {
      const registry = await accepted((doc) => (doc.issued_at = '2026-11-16T12:01:00Z'));
      expect(registry.issuedAt.toISOString()).toBe('2026-11-16T12:01:00.000Z');
    });

    it('recusa candidato com expires_at no passado', async () => {
      const { bytes, key, signature } = await signed();
      await expectRejection(
        verifyRegistry({
          now: new Date('2026-12-15T12:00:01Z'),
          registry: bytes,
          signature,
          trust: { initialKeys: [key.jwk] },
        }),
        'expired',
      );
    });

    it('recusa validade maior que 30 dias ou invertida', async () => {
      for (const expires of ['2026-12-15T12:00:01Z', '2026-11-15T11:00:00Z']) {
        const { bytes, key, signature } = await signed((doc) => (doc.expires_at = expires));
        await expectRejection(
          verifyRegistry({
            now: new Date('2026-11-15T12:00:00Z'),
            registry: bytes,
            signature,
            trust: { initialKeys: [key.jwk] },
          }),
          'invalid-validity',
        );
      }
    });

    it('REG-006: informa que o documento atual expirou', async () => {
      const registry = await accepted();
      expect(registry.isExpired(new Date('2026-12-15T12:00:00Z'))).toBe(false);
      expect(registry.isExpired(new Date('2026-12-15T12:00:01Z'))).toBe(true);
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
          trust: { initialKeys: [key.jwk] },
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
  it('escolhe a maior versão que os dois lados listam', () => {
    expect(negotiateProtocolVersion(['1.0', '1.2', '2.0'], ['1.0', '1.2'])).toBe('1.2');
    expect(negotiateProtocolVersion(['1.10', '1.9'], ['1.9', '1.10'])).toBe('1.10');
  });

  it('sem MAJOR em comum, não há comunicação', () => {
    expect(() => negotiateProtocolVersion(['1.0'], ['2.0'])).toThrowError(ProviderUnavailableError);
  });

  it('com MAJOR em comum e sem versão idêntica, devolve undefined', () => {
    expect(negotiateProtocolVersion(['1.0'], ['1.1'])).toBeUndefined();
  });
});
