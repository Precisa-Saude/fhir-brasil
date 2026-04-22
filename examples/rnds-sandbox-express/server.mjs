/**
 * Servidor de exemplo — Express + rnds-sandbox.
 *
 * Boota o sandbox em-processo, busca um token logo na inicialização e
 * expõe endpoints simples (`/api/...`) que o frontend HTML/JS consome.
 * Cada endpoint apenas repassa a resposta bruta da API FHIR — o objetivo
 * é demonstrar o shape das chamadas RNDS, não esconder JSON do usuário.
 *
 * Uso:
 *   node server.mjs            → permissivo (sem auth, demo rápida)
 *   STRICT=1 node server.mjs   → strict + token bearer + CNS header
 */

import express from 'express';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { createSandboxServer } from '@precisa-saude/fhir-rnds-sandbox';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SCENARIO = process.env.SCENARIO ?? 'paciente-com-exames';
const PROFISSIONAL_CNS = '700000000000010';

// 1. Sobe o sandbox em-processo numa porta efêmera.
const sandbox = createSandboxServer({
  log: (msg) => console.log(`[sandbox] ${msg}`),
  port: 0,
  scenario: SCENARIO,
});
const { host: sbHost, port: sbPort } = await sandbox.start();
const sandboxBase = `http://${sbHost}:${sbPort}`;

// 2. Busca um token logo no boot — em produção um job recurrente faria isso
//    antes da expiração; aqui simplificamos.
async function fetchToken() {
  const res = await fetch(`${sandboxBase}/api/token`, { method: 'POST' });
  if (!res.ok) {
    throw new Error(`Falha ao obter token: ${res.status}`);
  }
  const body = await res.json();
  return body.access_token;
}
let token = await fetchToken();
console.log(`[backend] token obtido (${token.slice(0, 24)}...)`);

// 3. Helper que faz proxy ao sandbox usando bearer + CNS, igual a um
//    cliente RNDS real faria.
async function rndsFetch(pathSuffix, init = {}) {
  const headers = {
    'X-Authorization-Server': `Bearer ${token}`,
    Authorization: PROFISSIONAL_CNS,
    ...(init.headers ?? {}),
  };
  return fetch(`${sandboxBase}${pathSuffix}`, { ...init, headers });
}

// 4. Express
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/info', (_req, res) => {
  res.json({
    backend: 'express',
    profissionalCns: PROFISSIONAL_CNS,
    sandboxBase,
    scenario: SCENARIO,
    tokenPreview: `${token.slice(0, 32)}…`,
  });
});

app.get('/api/jwks', async (_req, res) => {
  const r = await fetch(`${sandboxBase}/.well-known/jwks.json`);
  res.status(r.status).json(await r.json());
});

app.get('/api/patient/cpf/:cpf', async (req, res) => {
  const id = `http://rnds.saude.gov.br/fhir/r4/NamingSystem/cpf|${req.params.cpf}`;
  const r = await rndsFetch(
    `/api/fhir/r4/Patient?identifier=${encodeURIComponent(id)}`,
  );
  res.status(r.status).json(await r.json());
});

app.get('/api/patient/cns/:cns', async (req, res) => {
  const r = await rndsFetch(`/api/fhir/r4/Patient/${encodeURIComponent(req.params.cns)}`);
  res.status(r.status).json(await r.json());
});

app.get('/api/organization/:cnes', async (req, res) => {
  const r = await rndsFetch(
    `/api/fhir/r4/Organization/${encodeURIComponent(req.params.cnes)}`,
  );
  res.status(r.status).json(await r.json());
});

app.get('/api/practitioner/:cns', async (req, res) => {
  const r = await rndsFetch(
    `/api/fhir/r4/Practitioner/${encodeURIComponent(req.params.cns)}`,
  );
  res.status(r.status).json(await r.json());
});

app.get('/api/observations/:cns', async (req, res) => {
  const subject = `Patient/${encodeURIComponent(req.params.cns)}`;
  const r = await rndsFetch(`/api/fhir/r4/Observation?subject=${encodeURIComponent(subject)}`);
  res.status(r.status).json(await r.json());
});

app.post('/api/bundle', async (req, res) => {
  const bundle = req.body && req.body.resourceType === 'Bundle' ? req.body : sampleBundle();
  const r = await rndsFetch(`/api/fhir/r4/Bundle`, {
    body: JSON.stringify(bundle),
    headers: { 'Content-Type': 'application/fhir+json' },
    method: 'POST',
  });
  res.status(r.status).json(await r.json());
});

function sampleBundle() {
  return {
    entry: [
      {
        request: { method: 'POST', url: 'Observation' },
        resource: {
          code: { coding: [{ code: '2345-7', display: 'Glicose', system: 'http://loinc.org' }] },
          effectiveDateTime: new Date().toISOString().slice(0, 10),
          resourceType: 'Observation',
          status: 'final',
          subject: { reference: 'Patient/700000000000001' },
          valueQuantity: {
            code: 'mg/dL',
            system: 'http://unitsofmeasure.org',
            unit: 'mg/dL',
            value: 102,
          },
        },
      },
    ],
    resourceType: 'Bundle',
    type: 'transaction',
  };
}

const PORT = Number(process.env.PORT ?? 3000);
app.listen(PORT, () => {
  console.log(`[backend] http://127.0.0.1:${PORT}`);
});

// Graceful shutdown
const shutdown = async (sig) => {
  console.log(`[backend] recebido ${sig}, encerrando...`);
  await sandbox.stop();
  process.exit(0);
};
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
