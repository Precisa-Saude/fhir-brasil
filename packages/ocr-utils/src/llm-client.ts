import { findBiomarkersInText } from './anchor.js';
import { LAB_EXTRACTION_SCHEMA } from './extraction-schema.js';

/**
 * Cliente mínimo para endpoint compatível com OpenAI.
 *
 * Isto é **conveniência, não contrato**. O contrato é o
 * `LAB_EXTRACTION_SCHEMA`, e o toolkit funciona inteiro sem esta função: quem
 * integra chama o próprio modelo do jeito que a plataforma dele permitir e
 * entrega o JSON ao `validateExtraction`. Esta função existe para a demo rodar
 * de uma ponta à outra sem um `curl` no meio.
 *
 * `/v1/chat/completions` é o que praticamente todo mundo fala: LM Studio,
 * Ollama, llama.cpp, vLLM, OpenRouter, OpenAI, e a Anthropic pelo endpoint de
 * compatibilidade. Por isso não há SDK de fornecedor aqui, e por isso o pacote
 * continua sem dependência de runtime: `fetch` é do Node.
 *
 * A chave **nunca** entra por argumento de linha de comando, só por variável de
 * ambiente: argumento fica no histórico do shell e na lista de processos.
 */
export interface ExtractOptions {
  apiKey?: string;
  baseUrl: string;
  model: string;
  /**
   * Modo de saída estruturada. O padrão é negociar sozinho.
   *
   * Aqui é onde a compatibilidade quebra de verdade: o LM Studio recusa
   * `json_object` com 400 e só aceita `json_schema`, a OpenAI aceita os dois,
   * e servidor mais simples não conhece o campo. Como nenhum valor serve a
   * todos, a primeira tentativa vai com `json_schema` e, se o servidor recusar,
   * a segunda vai sem nada. Quem quiser fixar um modo passa ele aqui.
   *
   * Vale lembrar que isto mexe em **aproveitamento**, não em correção: saída
   * malformada é recusada pela conferência de qualquer jeito.
   */
  responseFormat?: 'auto' | 'json_object' | 'json_schema' | 'none';
  /** Milissegundos até desistir. Modelo local frio demora para carregar. */
  timeoutMs?: number;
}

export interface ExtractResult {
  /** O JSON que o modelo devolveu, ainda sem conferência nenhuma. */
  payload: unknown;
  /** Texto cru da resposta, guardado para quando o parse falha. */
  raw: string;
  tookMs: number;
}

/**
 * O prompt é deliberadamente curto e neutro.
 *
 * Ele diz o que devolver e nada sobre como ler um laudo. Toda a instrução de
 * comportamento que um extrator de produção carrega é ajuste que muda de modelo
 * para modelo, e não pertence a um pacote público. O que sustenta a qualidade
 * aqui não é o prompt: é a conferência que roda depois.
 */
function buildPrompt(text: string, allowed: string): string {
  return [
    'Extract the laboratory results from the report below.',
    '',
    'Return JSON matching this schema, and nothing else:',
    JSON.stringify(LAB_EXTRACTION_SCHEMA),
    '',
    'Use only LOINC codes from this list:',
    allowed,
    '',
    'REPORT:',
    text,
  ].join('\n');
}

/** Modelo costuma embrulhar o JSON em cerca de markdown. Tira a cerca. */
function stripFence(raw: string): string {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(raw);
  return (fenced?.[1] ?? raw).trim();
}

/**
 * Manda o laudo e a lista ancorada ao modelo e devolve o que ele respondeu.
 *
 * Não confere nada: a saída vai para o `validateExtraction`, que é onde a
 * ancoragem é cobrada. Separar os dois é proposital, porque é o que deixa
 * trocar de modelo sem mexer na parte que garante o resultado.
 */
export async function extractWithModel(
  text: string,
  options: ExtractOptions,
): Promise<ExtractResult> {
  const { apiKey, baseUrl, model, responseFormat, timeoutMs = 300_000 } = options;

  // A própria ancoragem já monta a lista de permitidos, então o prompt e a
  // conferência bebem exatamente da mesma fonte.
  const allowed = findBiomarkersInText(text).filteredReference;

  const startedAt = Date.now();

  const formatBody = (mode: 'json_object' | 'json_schema' | 'none'): string =>
    JSON.stringify({
      messages: [{ content: buildPrompt(text, allowed), role: 'user' }],
      model,
      ...(mode === 'json_object' ? { response_format: { type: 'json_object' } } : {}),
      ...(mode === 'json_schema'
        ? {
            response_format: {
              json_schema: { name: 'lab_extraction', schema: LAB_EXTRACTION_SCHEMA, strict: true },
              type: 'json_schema',
            },
          }
        : {}),
      temperature: 0,
    });

  const post = async (mode: 'json_object' | 'json_schema' | 'none'): Promise<Response> =>
    fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      body: formatBody(mode),
      headers: {
        'content-type': 'application/json',
        ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
      },
      method: 'POST',
      signal: AbortSignal.timeout(timeoutMs),
    });

  const mode = responseFormat ?? 'auto';
  let response = await post(mode === 'auto' ? 'json_schema' : mode);

  // Servidor que não conhece o modo estrito responde 4xx. A segunda tentativa
  // vai sem nada, que é o denominador comum, e só então o erro sobe.
  if (!response.ok && mode === 'auto' && response.status >= 400 && response.status < 500) {
    response = await post('none');
  }

  if (!response.ok) {
    throw new Error(`${String(response.status)} de ${baseUrl}: ${await response.text()}`);
  }

  const body = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = body.choices?.[0]?.message?.content ?? '';
  const tookMs = Date.now() - startedAt;

  try {
    return { payload: JSON.parse(stripFence(raw)), raw, tookMs };
  } catch {
    throw new Error(`O modelo não devolveu JSON analisável. Resposta crua:\n${raw.slice(0, 500)}`);
  }
}
