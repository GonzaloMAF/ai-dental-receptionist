// Crea (o actualiza) el asistente en Vapi y configura la landing.
// Uso: npm run asistente        (añade --dry para ver el payload sin enviar)
const fs = require('fs');
const path = require('path');

const { PUBLIC_URL, VAPI_SECRET, VAPI_PRIVATE_KEY, VAPI_PUBLIC_KEY, VAPI_ASSISTANT_ID } = process.env;
const dry = process.argv.includes('--dry');

const faltan = [];
if (!PUBLIC_URL) faltan.push('PUBLIC_URL');
if (!VAPI_SECRET || VAPI_SECRET === 'cambia-esto') faltan.push('VAPI_SECRET (cámbialo por un valor propio)');
if (!dry && !VAPI_PRIVATE_KEY) faltan.push('VAPI_PRIVATE_KEY');
if (faltan.length) { console.error('Faltan en .env:\n - ' + faltan.join('\n - ')); process.exit(1); }

const base = PUBLIC_URL.replace(/\/+$/, '');
const cfg = fs.readFileSync(path.join(__dirname, '..', 'assistant.json'), 'utf8')
  .replaceAll('https://TU-URL-PUBLICA/vapi', `${base}/vapi`)
  .replaceAll('cambia-esto', VAPI_SECRET);

if (dry) { console.log(cfg); process.exit(0); }

(async () => {
  const url = VAPI_ASSISTANT_ID ? `https://api.vapi.ai/assistant/${VAPI_ASSISTANT_ID}` : 'https://api.vapi.ai/assistant';
  const res = await fetch(url, {
    method: VAPI_ASSISTANT_ID ? 'PATCH' : 'POST',
    headers: { Authorization: `Bearer ${VAPI_PRIVATE_KEY}`, 'Content-Type': 'application/json' },
    body: cfg,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { console.error(`Vapi respondió ${res.status}:`, JSON.stringify(data, null, 2)); process.exit(1); }

  const id = data.id || VAPI_ASSISTANT_ID;
  console.log(VAPI_ASSISTANT_ID ? 'Asistente actualizado.' : 'Asistente creado.');
  console.log('ID del asistente:', id);
  if (!VAPI_ASSISTANT_ID) console.log('→ Pon VAPI_ASSISTANT_ID=' + id + ' en .env para que la próxima vez se actualice.');

  const lp = path.join(__dirname, '..', 'landing', 'index.html');
  let html = fs.readFileSync(lp, 'utf8');
  html = html.replace(/const ASSISTANT_ID\s*=\s*'[^']*'/, `const ASSISTANT_ID    = '${id}'`);
  if (VAPI_PUBLIC_KEY) html = html.replace(/const VAPI_PUBLIC_KEY\s*=\s*'[^']*'/, `const VAPI_PUBLIC_KEY = '${VAPI_PUBLIC_KEY}'`);
  else console.log('Aviso: falta VAPI_PUBLIC_KEY; la landing no podrá llamar hasta que la pongas.');
  fs.writeFileSync(lp, html);
  console.log('Landing configurada.');
})();
