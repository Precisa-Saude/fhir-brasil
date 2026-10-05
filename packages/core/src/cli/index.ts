import { exitWithError } from '../cli-utils.js';
import { dividirArgv } from './argv.js';
import { categories } from './commands/categories.js';
import { convert } from './commands/convert.js';
import { importBundle } from './commands/import.js';
import { list } from './commands/list.js';
import { loincMap } from './commands/loinc-map.js';
import { lookup, lookupLoinc } from './commands/lookup.js';
import { range } from './commands/range.js';
import { source } from './commands/source.js';
import { units } from './commands/units.js';
import { validate } from './commands/validate.js';

declare const __VERSION__: string;

const HELP = `fhir-bio — CLI do @precisa-saude/fhir

Uso: fhir-bio <comando> [opções]

Comandos:
  lookup <código>         Buscar biomarcador por código interno
  lookup-loinc <loinc>    Buscar biomarcador por código LOINC
  list                    Listar todos os biomarcadores
  categories              Listar biomarcadores agrupados por categoria
  range <código>          Faixa de referência para um biomarcador
  source [chave]          Citação de uma fonte, ou a lista toda
  units <código>          Informações de unidade de um biomarcador
  convert <arquivo>       Converter dados lab (JSON) para FHIR Bundle
  validate <arquivo>      Validar recurso FHIR (Bundle, Observation ou DiagnosticReport)
  import <arquivo>        Importar FHIR Bundle e extrair observações
  loinc-map               Tabela de mapeamento LOINC ↔ código

Flags globais:
  --json                  Saída em formato JSON
  --help, -h              Mostrar ajuda
  --version, -v           Mostrar versão
`;

type CommandFn = (args: string[], json: boolean) => Promise<void>;

const COMMANDS: Record<string, CommandFn> = {
  categories,
  convert,
  import: importBundle,
  list,
  'loinc-map': loincMap,
  lookup,
  'lookup-loinc': lookupLoinc,
  range,
  source,
  units,
  validate,
};

async function main(): Promise<void> {
  const { command, help, json, resto, version } = dividirArgv(process.argv.slice(2));

  if (version) {
    process.stdout.write(`${__VERSION__}\n`);
    return;
  }

  if (help || !command) {
    process.stdout.write(HELP);
    return;
  }

  const handler = COMMANDS[command];
  if (!handler) {
    exitWithError(`Comando desconhecido: ${command}\nUse --help para ver os comandos disponíveis.`);
  }

  await handler(resto, json);
}

main().catch((err: Error) => exitWithError(err.message));
