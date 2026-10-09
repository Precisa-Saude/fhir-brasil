import { getAllDefinitions } from '../../biomarkers.js';
import { outputJson, outputText } from '../../cli-utils.js';
import { DIAGNOSTIC_SECTION_DISPLAY, diagnosticSectionOf } from '../../diagnostic-sections.js';

/** Biomarcadores agrupados pela seção de serviço diagnóstico (HL7 v2-0074). */
export async function sections(_args: string[], json: boolean): Promise<void> {
  const grouped: Record<string, ReturnType<typeof getAllDefinitions>> = {};
  for (const d of getAllDefinitions()) {
    (grouped[diagnosticSectionOf(d.code) ?? '—'] ??= []).push(d);
  }

  if (json) {
    outputJson(
      Object.fromEntries(
        Object.entries(grouped).map(([section, items]) => [section, items.map((d) => d.code)]),
      ),
    );
    return;
  }

  const lines: string[] = [];
  for (const [section, items] of Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b))) {
    const display = DIAGNOSTIC_SECTION_DISPLAY[section as keyof typeof DIAGNOSTIC_SECTION_DISPLAY];
    lines.push(`${section}${display ? ` — ${display}` : ''} (${items.length})`);
    for (const d of items) {
      lines.push(`  ${d.code} — ${d.names.pt[0] ?? d.names.en[0]}`);
    }
    lines.push('');
  }
  outputText(lines.join('\n'));
}
