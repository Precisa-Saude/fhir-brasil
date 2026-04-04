import { getAllDefinitions } from '../../biomarkers.js';
import { outputJson, outputText } from '../../cli-utils.js';

export async function categories(_args: string[], json: boolean): Promise<void> {
  const defs = getAllDefinitions();
  const grouped: Record<string, typeof defs> = {};

  for (const d of defs) {
    const cats = Array.isArray(d.category) ? d.category : [d.category];
    for (const cat of cats) {
      (grouped[cat] ??= []).push(d);
    }
  }

  if (json) {
    const summary = Object.fromEntries(
      Object.entries(grouped).map(([cat, items]) => [cat, items.map((d) => d.code)]),
    );
    outputJson(summary);
    return;
  }

  const entries = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  const lines: string[] = [];

  for (const [cat, items] of entries) {
    lines.push(`${cat} (${items.length})`);
    for (const d of items) {
      lines.push(`  ${d.code} — ${d.names.pt[0] ?? d.names.en[0]}`);
    }
    lines.push('');
  }

  outputText(lines.join('\n'));
}
