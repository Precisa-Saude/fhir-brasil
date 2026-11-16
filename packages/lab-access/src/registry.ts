/**
 * Registro de participantes: verificação da assinatura destacada e consulta
 * (capítulo 8).
 *
 * Não existe caminho para carregar um registro sem verificar a assinatura:
 * `ParticipantRegistry` só é criado por `verifyRegistry`.
 */

import { timingSafeEqual } from 'node:crypto';

import { base64url, calculateJwkThumbprint, compactVerify, importJWK } from 'jose';

import { CLOCK_TOLERANCE_MS, REGISTRY_MAX_VALIDITY_MS } from './constants';
import {
  LabAccessConfigError,
  ProviderUnavailableError,
  type RegistryRejectionReason,
  RegistryVerificationError,
} from './errors';
import { validateRegistryDocument } from './registry-schema';
import type {
  RegistryDocument,
  RegistryKey,
  RegistryParticipant,
  RegistryProvider,
  RegistryReceiver,
} from './registry-types';

const CONSTRUCTION_TOKEN = Symbol('verifyRegistry');

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

/** Um documento do registro cuja assinatura, schema e validade foram conferidos. */
export class ParticipantRegistry {
  /** Bytes exatos do documento, como foram verificados. */
  readonly bytes: Uint8Array;
  readonly document: RegistryDocument;

  /** @internal Use `verifyRegistry`. */
  constructor(token: symbol, document: RegistryDocument, bytes: Uint8Array) {
    if (token !== CONSTRUCTION_TOKEN) {
      throw new LabAccessConfigError('Um registro só pode ser criado por verifyRegistry.');
    }
    this.document = deepFreeze(document);
    this.bytes = Uint8Array.from(bytes);
  }

  get environment(): RegistryDocument['environment'] {
    return this.document.environment;
  }

  get expiresAt(): Date {
    return new Date(this.document.expires_at);
  }

  get issuedAt(): Date {
    return new Date(this.document.issued_at);
  }

  /** Chaves aceitas para verificar o documento seguinte. */
  get registryKeys(): readonly RegistryKey[] {
    return this.document.registry_keys.keys;
  }

  get sequence(): number {
    return this.document.sequence;
  }

  findParticipant(participantId: string): RegistryParticipant | undefined {
    return this.document.participants.find((p) => p.participant_id === participantId);
  }

  /**
   * Provedor ativo com esse identificador. Provedor suspenso ou retirado não é
   * devolvido: o receptor deixa de chamá-lo.
   */
  getProvider(participantId: string): RegistryProvider {
    const participant = this.findParticipant(participantId);
    if (!participant) {
      throw new ProviderUnavailableError('not-found', 'O provedor não está no registro.');
    }
    if (participant.role !== 'provider' || !participant.provider) {
      throw new ProviderUnavailableError('not-a-provider', 'O participante não é um provedor.');
    }
    if (participant.status !== 'active') {
      throw new ProviderUnavailableError(
        'not-active',
        `O provedor está ${participant.status} no registro.`,
      );
    }
    return participant as RegistryProvider;
  }

  /** Entrada do receptor com esse `client_id`, em qualquer situação. */
  getReceiver(clientId: string): RegistryReceiver {
    const participant = this.document.participants.find(
      (p) => p.role === 'receiver' && p.receiver?.client_id === clientId,
    );
    if (!participant) {
      throw new LabAccessConfigError('O client_id não corresponde a um receptor do registro.');
    }
    return participant as RegistryReceiver;
  }

  /** `true` quando `expires_at` já passou. */
  isExpired(now: Date = new Date()): boolean {
    return now.getTime() > this.expiresAt.getTime();
  }

  /** Provedores ativos. */
  providers(): RegistryProvider[] {
    return this.document.participants.filter(
      (p): p is RegistryProvider => p.role === 'provider' && p.status === 'active' && !!p.provider,
    );
  }
}

export interface VerifyRegistryInput {
  now?: Date;
  /** Bytes exatos de `participantes.json`, como baixados. */
  registry: Uint8Array;
  /** Conteúdo de `participantes.json.jws`. */
  signature: string;
  /**
   * De onde vem a confiança: o documento já aceito, ou, para o primeiro
   * documento, o conjunto de chaves inicial recebido na admissão.
   */
  trust: { current: ParticipantRegistry } | { initialKeys: readonly RegistryKey[] };
}

export interface RegistryVerification {
  /** `false` quando o candidato é o mesmo documento que já estava em uso. */
  changed: boolean;
  registry: ParticipantRegistry;
}

function reject(reason: RegistryRejectionReason, message: string, cause?: unknown): never {
  throw new RegistryVerificationError(reason, message, { cause });
}

interface DetachedJws {
  kid: string;
  protectedHeader: string;
  signature: string;
}

/** Lê `cabeçalho..assinatura` e exige o cabeçalho exato do protocolo. */
function parseDetachedJws(text: string): DetachedJws {
  const parts = text.trim().split('.');
  if (parts.length !== 3 || !parts[0] || parts[1] !== '' || !parts[2]) {
    reject('malformed-signature', 'A assinatura não é um JWS compacto de conteúdo destacado.');
  }
  const [protectedHeader, , signature] = parts as [string, string, string];

  let header: unknown;
  try {
    header = JSON.parse(new TextDecoder().decode(base64url.decode(protectedHeader)));
  } catch (cause) {
    reject('malformed-signature', 'O cabeçalho da assinatura não é JSON em base64url.', cause);
  }
  const fields = header as Record<string, unknown>;
  const exact =
    typeof header === 'object' &&
    header !== null &&
    Object.keys(fields).length === 3 &&
    fields.alg === 'PS256' &&
    fields.typ === 'JOSE' &&
    typeof fields.kid === 'string';
  if (!exact) {
    reject('malformed-signature', 'O cabeçalho da assinatura deveria ter só alg PS256, kid e typ.');
  }
  return { kid: fields.kid as string, protectedHeader, signature };
}

async function hasThumbprintKid(key: RegistryKey): Promise<boolean> {
  try {
    return (
      (await calculateJwkThumbprint({ e: key.e, kty: key.kty, n: key.n }, 'sha256')) === key.kid
    );
  } catch {
    return false;
  }
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

function checkValidity(document: RegistryDocument, now: Date): void {
  const issuedAt = Date.parse(document.issued_at);
  const expiresAt = Date.parse(document.expires_at);
  if (expiresAt <= issuedAt || expiresAt - issuedAt > REGISTRY_MAX_VALIDITY_MS) {
    reject('invalid-validity', 'expires_at deveria ficar até 30 dias depois de issued_at.');
  }
  if (issuedAt - now.getTime() > CLOCK_TOLERANCE_MS) {
    reject('issued-in-future', 'issued_at está mais de 60 segundos no futuro.');
  }
  if (now.getTime() > expiresAt) {
    reject('expired', 'O documento já passou de expires_at.');
  }
}

/**
 * Verifica um candidato a registro, na ordem da seção 8.3: chave pelo `kid`,
 * assinatura PS256 sobre os bytes recebidos, schema, sequência e validade.
 *
 * Em qualquer falha lança `RegistryVerificationError`, e quem chama continua
 * com o documento que já tinha.
 */
export async function verifyRegistry(input: VerifyRegistryInput): Promise<RegistryVerification> {
  const now = input.now ?? new Date();
  const current = 'current' in input.trust ? input.trust.current : undefined;
  const trusted = current
    ? current.registryKeys
    : (input.trust as { initialKeys: readonly RegistryKey[] }).initialKeys;

  const jws = parseDetachedJws(input.signature ?? '');
  const key = trusted.find((candidate) => candidate.kid === jws.kid);
  if (!key) {
    reject('unknown-key', 'O kid da assinatura não está entre as chaves aceitas.');
  }
  if (!(await hasThumbprintKid(key))) {
    reject('invalid-key-id', 'O kid da chave de confiança não é o thumbprint RFC 7638 dela.');
  }

  try {
    const publicKey = await importJWK({ e: key.e, kty: key.kty, n: key.n }, 'PS256');
    await compactVerify(
      `${jws.protectedHeader}.${base64url.encode(input.registry)}.${jws.signature}`,
      publicKey,
      { algorithms: ['PS256'] },
    );
  } catch (cause) {
    reject('invalid-signature', 'A assinatura do registro não confere.', cause);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(input.registry));
  } catch (cause) {
    reject('invalid-schema', 'O registro não é JSON em UTF-8.', cause);
  }
  const violations = validateRegistryDocument(parsed);
  if (violations.length > 0) {
    reject('invalid-schema', `O registro não valida contra o schema: ${violations.join('; ')}`);
  }
  const document = parsed as RegistryDocument;

  for (const announced of document.registry_keys.keys) {
    if (!(await hasThumbprintKid(announced))) {
      reject('invalid-key-id', 'Uma chave de registry_keys tem kid diferente do thumbprint.');
    }
  }

  if (current) {
    if (document.sequence < current.sequence) {
      reject('stale-sequence', 'A sequence do candidato é menor que a do documento atual.');
    }
    if (document.sequence === current.sequence) {
      if (!sameBytes(input.registry, current.bytes)) {
        reject('sequence-conflict', 'Mesma sequence do documento atual, com bytes diferentes.');
      }
      return { changed: false, registry: current };
    }
  }

  checkValidity(document, now);

  return {
    changed: true,
    registry: new ParticipantRegistry(CONSTRUCTION_TOKEN, document, input.registry),
  };
}

function parseVersion(version: string): [number, number] {
  const [major, minor] = version.split('.').map(Number);
  return [major ?? Number.NaN, minor ?? Number.NaN];
}

/**
 * Escolhe a maior versão `MAJOR.MINOR` que os dois participantes listam.
 *
 * Sem MAJOR em comum não há comunicação. Com MAJOR em comum e nenhuma versão
 * idêntica nas duas listas, devolve `undefined`: a especificação não diz qual
 * versão vale nesse caso.
 */
export function negotiateProtocolVersion(
  mine: readonly string[],
  theirs: readonly string[],
): string | undefined {
  const theirMajors = new Set(theirs.map((v) => parseVersion(v)[0]));
  if (!mine.some((v) => theirMajors.has(parseVersion(v)[0]))) {
    throw new ProviderUnavailableError(
      'no-common-version',
      'Receptor e provedor não têm versão MAJOR do protocolo em comum.',
    );
  }
  const common = mine.filter((v) => theirs.includes(v));
  common.sort((a, b) => {
    const [aMajor, aMinor] = parseVersion(a);
    const [bMajor, bMinor] = parseVersion(b);
    return bMajor - aMajor || bMinor - aMinor;
  });
  return common[0];
}
