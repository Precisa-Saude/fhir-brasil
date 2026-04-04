import { parseArgs } from 'node:util';

import { getDefinitionByCode } from '../../biomarkers.js';
import { exitWithError, outputJson, outputText } from '../../cli-utils.js';
import {
  getRangeDirection,
  getReferenceRange,
  type ReferenceRangeContext,
} from '../../reference-ranges.js';

export async function range(args: string[], json: boolean): Promise<void> {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    args,
    options: {
      age: { type: 'string' },
      sex: { type: 'string' },
    },
    strict: false,
  });

  const code = positionals[0];
  if (!code) exitWithError('Uso: fhir-bio range <código> [--sex M|F] [--age N]');

  const def = getDefinitionByCode(code);
  if (!def) exitWithError(`Biomarcador não encontrado: ${code}`);

  const ctx: ReferenceRangeContext = {};
  if (values.sex) {
    const raw = (values.sex as string).toUpperCase();
    const sex = raw === 'MALE' ? 'M' : raw === 'FEMALE' ? 'F' : raw;
    if (sex !== 'M' && sex !== 'F') exitWithError('--sex deve ser M ou F');
    ctx.biologicalSex = sex;
  }
  if (values.age) {
    const age = Number(values.age);
    if (Number.isNaN(age) || age < 0) exitWithError('--age deve ser um número positivo');
    ctx.age = age;
  }

  const ref = getReferenceRange(code, ctx);
  if (!ref) exitWithError(`Faixa de referência não encontrada para: ${code}`);

  const direction = getRangeDirection(code);

  if (json) {
    outputJson({ ...def, context: ctx, direction, referenceRange: ref });
    return;
  }

  const sexLabel =
    ctx.biologicalSex === 'M' ? 'Homem' : ctx.biologicalSex === 'F' ? 'Mulher' : 'Geral';
  const ageLabel = ctx.age !== undefined ? `, ${ctx.age} anos` : '';
  const fmt = (v?: number) => (v !== undefined ? String(v) : '—');

  outputText(
    [
      `Faixa de Referência: ${code} (${sexLabel}${ageLabel})`,
      `  Mínimo:       ${fmt(ref.min)} ${ref.unit}`,
      `  Máximo:       ${fmt(ref.max)} ${ref.unit}`,
      `  Ótimo (mín):  ${fmt(ref.optimalMin)} ${ref.unit}`,
      `  Ótimo (máx):  ${fmt(ref.optimalMax)} ${ref.unit}`,
      `  Alerta (máx): ${fmt(ref.warningMax)} ${ref.unit}`,
      `  Direção:      ${direction}`,
    ].join('\n'),
  );
}
