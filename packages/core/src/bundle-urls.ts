/**
 * Endereço das entradas de um Bundle.
 *
 * O `fullUrl` identifica a entrada, e é contra ele que o validador resolve as
 * referências entre os recursos. Um Bundle com `subject.reference` valendo
 * `Patient/abc` só resolve se alguma entrada tiver `fullUrl` terminando em
 * `/Patient/abc`: a referência relativa é lida contra a base do `fullUrl` da
 * entrada, que é como os exemplos da própria HL7 montam Bundle de coleção.
 *
 * Antes o `fullUrl` era `urn:uuid:observation-<laudo>-<código>`, que erra duas
 * vezes. `urn:uuid:` exige a sintaxe de UUID e aquilo não era um UUID, e num
 * Bundle de entradas `urn:uuid:` a referência precisa repetir a URN inteira,
 * então nenhuma das relativas resolvia. Um laudo de 22 marcadores saía com 24
 * erros de URN e 22 referências perdidas.
 */
import type { FHIRBundleEntry } from './fhir-types';

/**
 * Recurso que já tem id, e por isso pode ser endereçado numa entrada.
 *
 * No FHIR o `id` é opcional, porque um recurso pode viajar sem identidade
 * própria. Numa entrada de Bundle ele não pode: sem id não há `fullUrl`, e sem
 * `fullUrl` nenhuma referência chega ao recurso. Os conversores daqui sempre
 * atribuem um, e o tipo passa a dizer isso em vez de deixar `undefined` chegar
 * até a montagem da URL.
 */
export type Addressable<T> = T & { id: string };

/**
 * Base dos `fullUrl`.
 *
 * Não precisa responder a uma requisição: no FHIR o `fullUrl` é identidade, não
 * endereço de download. Fica sob um domínio nosso para não colidir com a
 * identidade de recurso de outra instituição, que é o risco real de usar
 * `example.org` em dado que sai da máquina.
 */
export const BUNDLE_BASE_URL = 'https://precisa-saude.com.br/fhir';

/**
 * Monta o `fullUrl` a partir do próprio recurso.
 *
 * Recebe o recurso em vez do tipo e do id soltos de propósito. O defeito que
 * isto substitui nasceu de montar os dois lados em separado: o `fullUrl` dizia
 * `observation-demo-Hgb` enquanto o recurso tinha id `demo-Hgb`, e ninguém
 * percebeu porque nada obrigava os dois a concordarem.
 */
export const entryFullUrl = (resource: Addressable<FHIRBundleEntry['resource']>): string =>
  `${BUNDLE_BASE_URL}/${resource.resourceType}/${resource.id}`;
