/**
 * Frontend de exemplo — JS puro, sem build, sem framework.
 *
 * Cada botão tem `data-action`; o handler dispara a chamada
 * correspondente ao backend Express, que por sua vez fala com o
 * sandbox. A resposta JSON crua é renderizada no <pre id="result-body">.
 */

const ACTIONS = {
  'patient-cpf': () => {
    const cpf = document.getElementById('cpf').value.trim();
    return fetchAndRender(`/api/patient/cpf/${encodeURIComponent(cpf)}`, `Patient (CPF ${cpf})`);
  },
  'patient-cns': () => {
    const cns = document.getElementById('cns-patient').value.trim();
    return fetchAndRender(`/api/patient/cns/${encodeURIComponent(cns)}`, `Patient (CNS ${cns})`);
  },
  organization: () => {
    const cnes = document.getElementById('cnes').value.trim();
    return fetchAndRender(`/api/organization/${encodeURIComponent(cnes)}`, `Organization ${cnes}`);
  },
  practitioner: () => {
    const cns = document.getElementById('cns-pract').value.trim();
    return fetchAndRender(`/api/practitioner/${encodeURIComponent(cns)}`, `Practitioner ${cns}`);
  },
  bundle: () =>
    fetchAndRender(`/api/bundle`, 'POST /api/fhir/r4/Bundle', { method: 'POST' }),
  info: () => fetchAndRender(`/api/info`, 'GET /api/info'),
  jwks: () => fetchAndRender(`/api/jwks`, 'GET /.well-known/jwks.json'),
};

document.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  const handler = ACTIONS[action];
  if (!handler) return;
  void handler();
});

async function fetchAndRender(url, title, init = {}) {
  setBusy(true, title);
  try {
    const res = await fetch(url, init);
    let body;
    const ct = res.headers.get('content-type') ?? '';
    if (ct.includes('json')) {
      body = await res.json();
    } else {
      body = await res.text();
    }
    renderResult(title, res.status, body);
  } catch (err) {
    renderResult(title, '— (erro)', { error: String(err) });
  } finally {
    setBusy(false);
  }
}

function renderResult(title, status, body) {
  document.getElementById('result-title').textContent = title;
  const statusEl = document.getElementById('result-status');
  statusEl.textContent = `status ${status}`;
  statusEl.dataset.kind = statusKind(status);
  document.getElementById('result-body').textContent =
    typeof body === 'string' ? body : JSON.stringify(body, null, 2);
}

function statusKind(status) {
  if (typeof status !== 'number') return 'neutral';
  if (status >= 200 && status < 300) return 'ok';
  if (status >= 400 && status < 500) return 'warn';
  if (status >= 500) return 'err';
  return 'neutral';
}

function setBusy(busy, title) {
  document.body.dataset.busy = busy ? '1' : '';
  if (busy) {
    document.getElementById('result-title').textContent = `${title} (em andamento...)`;
  }
}

// Carrega info do backend ao abrir a página
fetch('/api/info')
  .then((r) => r.json())
  .then((info) => {
    const banner = document.getElementById('info-banner');
    banner.innerHTML = `
      <strong>backend:</strong> ${info.backend} ·
      <strong>cenário:</strong> ${info.scenario} ·
      <strong>profissional:</strong> CNS ${info.profissionalCns} ·
      <strong>token:</strong> <code>${info.tokenPreview}</code>
    `;
  })
  .catch((err) => {
    document.getElementById('info-banner').textContent = `erro ao carregar /api/info: ${err}`;
  });
