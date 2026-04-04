import { exitWithError, getInput, outputJson, outputText } from '../../cli-utils.js';
import { labResultToFHIRBundle } from '../../converter.js';
import type { LabObservationData, LabReportData, UserProfileData } from '../../types.js';

export async function convert(args: string[], json: boolean): Promise<void> {
  const raw = await getInput(args[0]);

  let data: { report: LabReportData; observations: LabObservationData[]; profile: UserProfileData };
  try {
    data = JSON.parse(raw);
  } catch {
    exitWithError('JSON inválido. Forneça um objeto com { report, observations, profile }.');
  }

  if (!data.report || !data.observations || !data.profile) {
    exitWithError(
      'Formato esperado: { "report": LabReportData, "observations": LabObservationData[], "profile": UserProfileData }',
    );
  }

  const bundle = labResultToFHIRBundle(data.report, data.observations, data.profile);

  if (json) {
    outputJson(bundle);
  } else {
    outputText(JSON.stringify(bundle, null, 2));
  }
}
