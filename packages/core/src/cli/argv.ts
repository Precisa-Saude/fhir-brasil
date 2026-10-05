/**
 * Separa as flags globais do resto, à mão, sem `parseArgs` aqui.
 *
 * O `parseArgs` deste nível engolia a flag de comando. Com `strict: false` e só
 * `help`, `json` e `version` declaradas, um `--sex` desconhecido virava
 * `values.sex = true` e o `M` seguinte caía em `positionals`, então o handler
 * recebia `['Ferritin', 'M']` e nunca via a flag. Na prática `fhir-bio range
 * Ferritin --sex M` e `--sex F` imprimiam os dois a faixa geral, e o mesmo
 * valia para `--age`.
 *
 * Varrer na mão resolve porque o único trabalho desta camada é achar o comando:
 * o primeiro token que não começa com `-`. Tudo que sobra vai cru para o
 * handler, que já sabe declarar as próprias opções.
 */
export function dividirArgv(argv: string[]): {
  command?: string;
  help: boolean;
  json: boolean;
  resto: string[];
  version: boolean;
} {
  let command: string | undefined;
  let help = false;
  let json = false;
  let version = false;
  const resto: string[] = [];

  for (const token of argv) {
    if (token === '--json') json = true;
    else if (token === '--help' || token === '-h') help = true;
    else if (token === '--version' || token === '-v') version = true;
    else if (command === undefined && !token.startsWith('-')) command = token;
    else resto.push(token);
  }

  return { command, help, json, resto, version };
}
