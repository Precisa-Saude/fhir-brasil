/**
 * O Bundle da exportação do prontuário (LGPD art. 18).
 *
 * Um `collection` só, plano: nenhum Bundle dentro de outro, um `Patient`, e
 * toda entrada com `fullUrl`. Sem `total`, que o R4 só admite em `searchset` e
 * `history`. O `identifier` e o `timestamp` deixam a pessoa distinguir duas
 * exportações; a `meta.tag` marca o arquivo como dado do titular.
 *
 * Há duas formas de montar: `buildExportBundle` recebe todos os recursos e
 * devolve o objeto, para quem cabe na memória; `createExportBundleWriter`
 * entrega o JSON em pedaços, para quem escreve num stream e não quer acumular
 * milhares de `Observation` antes do primeiro byte.
 */

import { type Addressable, entryFullUrl } from './bundle-urls';
import { FHIR_BRASIL_LOCAL_CODE_SYSTEM } from './code-systems';
import type { FHIRBundle, FHIRBundleEntry, FHIRCoding, FHIRResource } from './fhir-types';

/** Tag que identifica o Bundle como exportação de dados do titular. */
export const EXPORT_BUNDLE_TAG: FHIRCoding = {
  code: 'lgpd-art-18-export',
  display: 'Exportação de dados do titular (LGPD art. 18)',
  system: FHIR_BRASIL_LOCAL_CODE_SYSTEM,
};

/** `identifier.system` do id da exportação. */
export const EXPORT_IDENTIFIER_SYSTEM = 'urn:precisa-saude:export';

export interface ExportBundleOptions {
  /** Id desta exportação (um UUID serve). Vai em `identifier.value`. */
  exportId: string;
  /** Instante da montagem, em ISO 8601. Vai em `timestamp`. */
  timestamp: string;
}

/** A entrada de um recurso, com o `fullUrl` montado do próprio recurso. */
export function toBundleEntry(resource: Addressable<FHIRResource>): FHIRBundleEntry {
  return { fullUrl: entryFullUrl(resource), resource };
}

function bundleHeader(options: ExportBundleOptions): Omit<FHIRBundle, 'entry'> {
  return {
    identifier: { system: EXPORT_IDENTIFIER_SYSTEM, value: options.exportId },
    meta: { tag: [EXPORT_BUNDLE_TAG] },
    resourceType: 'Bundle',
    timestamp: options.timestamp,
    type: 'collection',
  };
}

/** O Bundle inteiro em memória. */
export function buildExportBundle(
  resources: readonly Addressable<FHIRResource>[],
  options: ExportBundleOptions,
): FHIRBundle {
  return { ...bundleHeader(options), entry: resources.map(toBundleEntry) };
}

export interface ExportBundleWriter {
  /** O fechamento do array de entradas e do objeto. Chamar uma vez, no fim. */
  close(): string;
  /** Quantas entradas já saíram. */
  readonly count: number;
  /** Uma entrada serializada, com a vírgula que a separa da anterior. */
  entry(resource: Addressable<FHIRResource>): string;
  /** O começo do JSON, até a abertura do array de entradas. Chamar uma vez. */
  open(): string;
}

/**
 * Escreve o mesmo Bundle de `buildExportBundle` em pedaços de texto. A
 * concatenação de `open()`, cada `entry()` e `close()` é um JSON válido e
 * idêntico ao de `JSON.stringify(buildExportBundle(...))`.
 */
export function createExportBundleWriter(options: ExportBundleOptions): ExportBundleWriter {
  let count = 0;
  let opened = false;
  let closed = false;
  // `JSON.stringify` do cabeçalho termina em `}`; a abertura do array entra no
  // lugar desse `}` para o texto final ser o mesmo objeto, com `entry` por último.
  const header = JSON.stringify(bundleHeader(options));
  return {
    close() {
      if (!opened) throw new Error('ExportBundleWriter: close() antes de open()');
      if (closed) throw new Error('ExportBundleWriter: close() chamado duas vezes');
      closed = true;
      return ']}';
    },
    get count() {
      return count;
    },
    entry(resource) {
      if (!opened || closed) throw new Error('ExportBundleWriter: entry() fora de open()/close()');
      const separator = count === 0 ? '' : ',';
      count += 1;
      return `${separator}${JSON.stringify(toBundleEntry(resource))}`;
    },
    open() {
      if (opened) throw new Error('ExportBundleWriter: open() chamado duas vezes');
      opened = true;
      return `${header.slice(0, -1)},"entry":[`;
    },
  };
}
