/**
 * CLI Utilities — shared helpers for fhir-brasil CLI tools
 *
 * Uses only Node.js built-in modules (zero dependencies).
 * Exported as `@precisa-saude/fhir/cli-utils` sub-path.
 */

export async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return '';
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

export async function getInput(fileArg?: string): Promise<string> {
  if (fileArg) {
    const { readFile } = await import('node:fs/promises');
    return readFile(fileArg, 'utf-8');
  }
  const stdin = await readStdin();
  if (!stdin.trim()) {
    exitWithError('Forneça um arquivo ou envie dados via stdin.');
  }
  return stdin;
}

export function parseJson<T>(raw: string, errorMessage: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    exitWithError(errorMessage);
  }
}

export function formatTable(headers: string[], rows: string[][]): string {
  const widths = headers.map((h, i) =>
    rows.reduce((max, r) => Math.max(max, (r[i] ?? '').length), h.length),
  );
  const fmt = (row: string[]) => row.map((c, i) => (c ?? '').padEnd(widths[i]!)).join('  ');
  const sep = widths.map((w) => '-'.repeat(w)).join('  ');
  return [fmt(headers), sep, ...rows.map(fmt)].join('\n');
}

export function outputJson(data: unknown): void {
  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
}

export function outputText(text: string): void {
  process.stdout.write(`${text}\n`);
}

export function exitWithError(message: string, code = 1): never {
  process.stderr.write(`Erro: ${message}\n`);
  process.exit(code);
}
