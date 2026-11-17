/**
 * Registro de participantes: verificação da assinatura destacada e consulta
 * (capítulo 8).
 *
 * Não existe caminho para carregar um registro sem verificar a assinatura:
 * `ParticipantRegistry` só é criado por `verifyRegistry`.
 */

import { timingSafeEqual } from 'node:crypto';

import { base64url, calculateJwkThumbprint, compactVerify, importJWK } from 'jose';

import { CLOCK_TOLERANCE_MS, REGISTRY_KEY_MIN_BITS, REGISTRY_MAX_VALIDITY_MS } from './constants';
import {
  LabAccessConfigError,
  ProviderUnavailableError,
  type RegistryRejectionReason,
  RegistryVerificationError,
  type RegistryVerificationStep,
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

export type RegistryEnvironment = RegistryDocument['environment'];

export interface VerifyRegistryInput {
  now?: Date;
  /** Bytes exatos de `participantes.json`, como baixados. */
  registry: Uint8Array;
  /** Conteúdo de `participantes.json.jws`. */
  signature: string;
  /**
   * De onde vem a confiança: o documento já aceito, ou, para o primeiro
   * documento, o conjunto de chaves inicial recebido na admissão, junto com o
   * ambiente em que o participante opera (passo V8). Com um documento já
   * aceito, o ambiente é o dele.
   */
  trust:
    | { current: ParticipantRegistry }
    | { environment: RegistryEnvironment; initialKeys: readonly RegistryKey[] };
}

export interface RegistryVerification {
  /** `false` quando o candidato é o mesmo documento que já estava em uso. */
  changed: boolean;
  registry: ParticipantRegistry;
}

function reject(
  step: RegistryVerificationStep,
  reason: RegistryRejectionReason,
  message: string,
  cause?: unknown,
): never {
  throw new RegistryVerificationError(reason, `${step}: ${message}`, { cause, step });
}

interface DetachedJws {
  header: Record<string, unknown>;
  protectedHeader: string;
  signature: string;
}

/** V2: `cabeçalho..assinatura`, com o cabeçalho em base64url de um objeto JSON. */
function parseDetachedJws(text: string): DetachedJws {
  const parts = text.trim().split('.');
  if (parts.length !== 3 || !parts[0] || parts[1] !== '' || !parts[2]) {
    reject(
      'V2',
      'malformed-signature',
      'a assinatura não é um JWS compacto de conteúdo destacado.',
    );
  }
  const [protectedHeader, , signature] = parts as [string, string, string];

  let header: unknown;
  try {
    header = JSON.parse(new TextDecoder().decode(base64url.decode(protectedHeader)));
  } catch (cause) {
    reject(
      'V2',
      'malformed-signature',
      'o cabeçalho da assinatura não é JSON em base64url.',
      cause,
    );
  }
  if (typeof header !== 'object' || header === null || Array.isArray(header)) {
    reject('V2', 'malformed-signature', 'o cabeçalho da assinatura não é um objeto JSON.');
  }
  return { header: header as Record<string, unknown>, protectedHeader, signature };
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

/** Tamanho do módulo RSA em bits, a partir do `n` em base64url. */
function modulusBits(key: RegistryKey): number {
  let bytes: Uint8Array;
  try {
    bytes = base64url.decode(key.n);
  } catch {
    return 0;
  }
  let start = 0;
  while (start < bytes.length && bytes[start] === 0) start += 1;
  if (start === bytes.length) return 0;
  return (bytes.length - start - 1) * 8 + (32 - Math.clz32(bytes[start]!));
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

/** V14: `participant_id` único, e `client_id` de receptor igual ao `participant_id`. */
function checkParticipants(document: RegistryDocument): void {
  const seen = new Set<string>();
  for (const participant of document.participants) {
    if (seen.has(participant.participant_id)) {
      reject('V14', 'duplicate-participant', 'um participant_id aparece mais de uma vez.');
    }
    seen.add(participant.participant_id);
    if (
      participant.role === 'receiver' &&
      participant.receiver?.client_id !== participant.participant_id
    ) {
      reject(
        'V14',
        'duplicate-participant',
        'o client_id de um receptor é diferente do participant_id da mesma entrada.',
      );
    }
  }
}

/**
 * Verifica um candidato a registro pela lista da seção 8.3, passo a passo e
 * na ordem, e recusa no primeiro que falha. Não há outra regra de recusa além
 * dos passos: V2 a V14 aqui, e V1 (baixar os dois arquivos por HTTPS) com quem
 * chama, que entrega os bytes já baixados.
 *
 * Em qualquer falha lança `RegistryVerificationError` com o passo em `step`,
 * e quem chama continua com o documento que já tinha.
 */
export async function verifyRegistry(input: VerifyRegistryInput): Promise<RegistryVerification> {
  const now = input.now ?? new Date();
  const trust = input.trust;
  const current = 'current' in trust ? trust.current : undefined;
  const trusted = current ? current.registryKeys : 'initialKeys' in trust ? trust.initialKeys : [];
  const environment = current
    ? current.environment
    : (trust as { environment?: unknown }).environment;
  if (environment !== 'pilot' && environment !== 'production') {
    throw new LabAccessConfigError(
      'Para o primeiro documento, informe o ambiente em que o participante opera (pilot ou production).',
    );
  }

  // V2 e V3: formato do JWS, algoritmo e ausência de crit. O protocolo não
  // define extensão de cabeçalho, então qualquer crit é de uma extensão que o
  // participante não entende. Os demais membros (typ, jwk, x5c...) são
  // ignorados: a chave vem só do kid.
  const jws = parseDetachedJws(input.signature ?? '');
  if (jws.header.alg !== 'PS256') {
    reject('V3', 'unsupported-algorithm', 'o algoritmo da assinatura deveria ser PS256.');
  }
  if ('crit' in jws.header) {
    reject('V3', 'critical-header', 'o cabeçalho da assinatura traz crit.');
  }

  // V4: a chave vem do documento já aceito, ou do conjunto inicial.
  const key = trusted.find((candidate) => candidate.kid === jws.header.kid);
  if (!key) {
    reject('V4', 'unknown-key', 'o kid da assinatura não está entre as chaves aceitas.');
  }

  // V5: kid igual ao thumbprint recalculado, e RSA de 2048 bits ou mais.
  if (!(await hasThumbprintKid(key))) {
    reject('V5', 'invalid-key-id', 'o kid da chave de confiança não é o thumbprint RFC 7638 dela.');
  }
  if (modulusBits(key) < REGISTRY_KEY_MIN_BITS) {
    reject('V5', 'weak-key', 'a chave de confiança tem menos de 2048 bits.');
  }

  // V6: assinatura PS256 sobre os bytes recebidos.
  try {
    const publicKey = await importJWK({ e: key.e, kty: key.kty, n: key.n }, 'PS256');
    await compactVerify(
      `${jws.protectedHeader}.${base64url.encode(input.registry)}.${jws.signature}`,
      publicKey,
      { algorithms: ['PS256'] },
    );
  } catch (cause) {
    reject('V6', 'invalid-signature', 'a assinatura do registro não confere.', cause);
  }

  // V7: JSON válido contra o schema.
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(input.registry));
  } catch (cause) {
    reject('V7', 'invalid-schema', 'o registro não é JSON em UTF-8.', cause);
  }
  const violations = validateRegistryDocument(parsed);
  if (violations.length > 0) {
    reject(
      'V7',
      'invalid-schema',
      `o registro não valida contra o schema: ${violations.join('; ')}`,
    );
  }
  const document = parsed as RegistryDocument;

  // V8: ambiente.
  if (document.environment !== environment) {
    reject('V8', 'wrong-environment', `o registro é do ambiente ${document.environment}.`);
  }

  // V9: sequência.
  if (current) {
    if (document.sequence < current.sequence) {
      reject('V9', 'stale-sequence', 'a sequence do candidato é menor que a do documento atual.');
    }
    if (document.sequence === current.sequence) {
      if (!sameBytes(input.registry, current.bytes)) {
        reject(
          'V9',
          'sequence-conflict',
          'mesma sequence do documento atual, com bytes diferentes.',
        );
      }
      return { changed: false, registry: current };
    }
  }

  // V10 a V12: emissão e validade.
  const issuedAt = Date.parse(document.issued_at);
  const expiresAt = Date.parse(document.expires_at);
  if (issuedAt - now.getTime() > CLOCK_TOLERANCE_MS) {
    reject('V10', 'issued-in-future', 'issued_at está mais de 60 segundos no futuro.');
  }
  if (expiresAt <= issuedAt || expiresAt - issuedAt > REGISTRY_MAX_VALIDITY_MS) {
    reject('V11', 'invalid-validity', 'expires_at deveria ficar até 30 dias depois de issued_at.');
  }
  if (now.getTime() > expiresAt) {
    reject('V12', 'expired', 'o documento já passou de expires_at.');
  }

  // V13: kid das chaves anunciadas para o documento seguinte.
  for (const announced of document.registry_keys.keys) {
    if (!(await hasThumbprintKid(announced))) {
      reject(
        'V13',
        'invalid-key-id',
        'uma chave de registry_keys tem kid diferente do thumbprint.',
      );
    }
  }

  // V14: participantes.
  checkParticipants(document);

  return {
    changed: true,
    registry: new ParticipantRegistry(CONSTRUCTION_TOKEN, document, input.registry),
  };
}

function parseVersion(version: string): [number, number] {
  const [major, minor] = version.split('.').map(Number);
  return [major ?? Number.NaN, minor ?? Number.NaN];
}

function parsedVersions(list: readonly string[]): [number, number][] {
  return list
    .map(parseVersion)
    .filter(([major, minor]) => Number.isInteger(major) && Number.isInteger(minor));
}

/**
 * Calcula a versão efetiva entre dois participantes pela regra da seção 9.1, a
 * partir das listas `protocol_versions` do registro.
 *
 * Vale o maior MAJOR presente nas duas listas. Com MAJOR 0, a versão efetiva é
 * a maior `0.MINOR` idêntica nas duas. Com MAJOR 1 ou mais, é `M.m`, em que `m`
 * é o menor entre o maior MINOR de cada lado. Sem versão efetiva não há
 * comunicação, e a função lança `ProviderUnavailableError`.
 */
export function negotiateProtocolVersion(
  mine: readonly string[],
  theirs: readonly string[],
): string {
  const ours = parsedVersions(mine);
  const others = parsedVersions(theirs);
  const theirMajors = new Set(others.map(([major]) => major));
  const common = ours.map(([major]) => major).filter((major) => theirMajors.has(major));
  if (common.length === 0) {
    throw new ProviderUnavailableError(
      'no-common-version',
      'Receptor e provedor não têm versão MAJOR do protocolo em comum.',
    );
  }
  const major = Math.max(...common);
  const minors = (list: [number, number][]) =>
    list.filter(([m]) => m === major).map(([, minor]) => minor);

  if (major === 0) {
    const theirMinors = new Set(minors(others));
    const identical = minors(ours).filter((minor) => theirMinors.has(minor));
    if (identical.length === 0) {
      throw new ProviderUnavailableError(
        'no-common-version',
        'Na fase 0, receptor e provedor só se comunicam com a mesma versão de protocolo.',
      );
    }
    return `0.${Math.max(...identical)}`;
  }
  return `${major}.${Math.min(Math.max(...minors(ours)), Math.max(...minors(others)))}`;
}
