const express = require('express');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { DateTime } = require('luxon');

const TZ = 'Europe/Madrid';
const SLOT_MIN = 30;
// 1 = lunes ... 7 = domingo. Tramos [inicio, fin) en horas.
const HORARIO = { 1: [[9, 14], [16, 20]], 2: [[9, 14], [16, 20]], 3: [[9, 14], [16, 20]],
                  4: [[9, 14], [16, 20]], 5: [[9, 14]] };

const { PORT = 3000, VAPI_SECRET, PANEL_KEY, CALENDAR_ID, GOOGLE_SA_JSON, GOOGLE_SA_B64 } = process.env;

const { GOOGLE_SA_FILE } = process.env;
let rawCreds = null;
if (GOOGLE_SA_FILE) rawCreds = fs.readFileSync(GOOGLE_SA_FILE, 'utf8');
else if (GOOGLE_SA_JSON) rawCreds = GOOGLE_SA_B64 ? Buffer.from(GOOGLE_SA_JSON, 'base64').toString() : GOOGLE_SA_JSON;

let calendar = null;
if (rawCreds) {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(rawCreds),
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });
  calendar = google.calendar({ version: 'v3', auth });
} else {
  console.warn('Falta GOOGLE_SA_FILE o GOOGLE_SA_JSON: las herramientas de calendario devolverán error.');
}

// ---- Registro de llamadas (solo resumen: sin teléfono ni transcripción, por minimización RGPD) ----
// En hostings gratuitos el disco es efímero: se pierde al reiniciar. Suficiente para la demo.
const DATA_DIR = path.join(__dirname, 'data');
const CALLS_FILE = path.join(DATA_DIR, 'calls.json');
fs.mkdirSync(DATA_DIR, { recursive: true });
let calls = [];
try { calls = JSON.parse(fs.readFileSync(CALLS_FILE, 'utf8')); } catch {}
const saveCalls = () => {
  try { fs.writeFileSync(CALLS_FILE, JSON.stringify(calls.slice(0, 200))); } catch (e) { console.error(e.message); }
};

// ---- Lógica de agenda ----
function huecosDelDia(dia) {
  const tramos = HORARIO[dia.weekday] || [];
  const out = [];
  for (const [ini, fin] of tramos) {
    let t = dia.set({ hour: ini, minute: 0, second: 0, millisecond: 0 });
    const end = dia.set({ hour: fin, minute: 0, second: 0, millisecond: 0 });
    while (t.plus({ minutes: SLOT_MIN }) <= end) { out.push(t); t = t.plus({ minutes: SLOT_MIN }); }
  }
  return out;
}

async function ocupado(desde, hasta) {
  if (!calendar) throw new Error('Calendario no configurado');
  const r = await calendar.freebusy.query({
    requestBody: { timeMin: desde.toISO(), timeMax: hasta.toISO(), timeZone: TZ, items: [{ id: CALENDAR_ID }] },
  });
  return (r.data.calendars[CALENDAR_ID].busy || []).map(b => [DateTime.fromISO(b.start), DateTime.fromISO(b.end)]);
}

const solapa = (a, b, busy) => busy.some(([s, e]) => a < e && b > s);

async function checkAvailability({ date }) {
  const dia = DateTime.fromISO(date, { zone: TZ }).startOf('day');
  if (!dia.isValid) return 'Fecha no válida. Pide al paciente otra fecha.';
  const slots = huecosDelDia(dia);
  if (!slots.length) return `El ${dia.setLocale('es').toFormat("cccc d 'de' LLLL")} la clínica está cerrada.`;
  const busy = await ocupado(dia, dia.endOf('day'));
  const ahora = DateTime.now().setZone(TZ);
  const libres = slots.filter(s => s > ahora && !solapa(s, s.plus({ minutes: SLOT_MIN }), busy));
  if (!libres.length) return 'No quedan huecos ese día. Ofrece otro día.';
  // Se ofrecen pocos para que la conversación por voz sea ágil.
  const pocos = libres.filter((_, i) => i % 2 === 0).slice(0, 4).map(s => s.toFormat('HH:mm'));
  return `Huecos libres el ${dia.setLocale('es').toFormat("cccc d 'de' LLLL")}: ${pocos.join(', ')}.`;
}

async function bookAppointment({ name, phone, reason, datetime }) {
  const ini = DateTime.fromISO(datetime, { zone: TZ });
  if (!ini.isValid) return 'Fecha y hora no válidas.';
  const fin = ini.plus({ minutes: SLOT_MIN });
  if (!huecosDelDia(ini.startOf('day')).some(s => s.toMillis() === ini.toMillis()))
    return 'Esa hora está fuera del horario de la clínica.';
  const busy = await ocupado(ini, fin);
  if (solapa(ini, fin, busy)) return 'Ese hueco acaba de ocuparse. Ofrece otro.';
  await calendar.events.insert({
    calendarId: CALENDAR_ID,
    requestBody: {
      summary: `Cita: ${name} (${reason || 'revisión'})`,
      description: `Paciente: ${name}\nTeléfono: ${phone}\nMotivo: ${reason || '-'}\nReservada por recepcionista IA`,
      start: { dateTime: ini.toISO(), timeZone: TZ },
      end: { dateTime: fin.toISO(), timeZone: TZ },
    },
  });
  return `Cita confirmada para ${name} el ${ini.setLocale('es').toFormat("cccc d 'de' LLLL 'a las' HH:mm")}.`;
}

const TOOLS = { check_availability: checkAvailability, book_appointment: bookAppointment };

// ---- HTTP ----
const app = express();
app.use(express.json({ limit: '2mb' }));
app.get('/', (_, res) => res.send('ok'));

app.post('/vapi', async (req, res) => {
  if (VAPI_SECRET && req.get('x-vapi-secret') !== VAPI_SECRET) return res.sendStatus(401);
  const msg = req.body.message || {};

  if (msg.type === 'end-of-call-report') {
    let seconds = Math.round(msg.durationSeconds || 0);
    if (!seconds && msg.startedAt && msg.endedAt) seconds = Math.round((new Date(msg.endedAt) - new Date(msg.startedAt)) / 1000);
    calls.unshift({
      at: new Date().toISOString(),
      seconds,
      ended: msg.endedReason || '',
      summary: msg.analysis?.summary || msg.summary || '',
    });
    saveCalls();
    return res.json({});
  }

  if (msg.type !== 'tool-calls') return res.json({});
  const list = msg.toolCallList || msg.toolCalls || [];
  const results = [];
  for (const c of list) {
    const name = c.name || c.function?.name;
    let args = c.arguments || c.parameters || c.function?.arguments || {};
    if (typeof args === 'string') { try { args = JSON.parse(args); } catch { args = {}; } }
    try {
      const fn = TOOLS[name];
      results.push({ toolCallId: c.id, result: fn ? await fn(args) : 'Herramienta desconocida.' });
    } catch (e) {
      console.error(name, e.message);
      results.push({ toolCallId: c.id, result: 'Error técnico. Pide disculpas y ofrece que la clínica le devuelva la llamada.' });
    }
  }
  res.json({ results });
});

// ---- Panel ----
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

app.get('/panel', async (req, res) => {
  if (!PANEL_KEY) return res.status(503).send('Panel desactivado: define PANEL_KEY.');
  if (req.query.key !== PANEL_KEY) return res.sendStatus(401);

  let eventos = [], errorCal = '';
  try {
    if (!calendar) throw new Error('Calendario no configurado');
    const ahora = DateTime.now().setZone(TZ);
    const r = await calendar.events.list({
      calendarId: CALENDAR_ID, timeMin: ahora.toISO(), timeMax: ahora.plus({ days: 14 }).toISO(),
      singleEvents: true, orderBy: 'startTime', maxResults: 100,
    });
    eventos = r.data.items || [];
  } catch (e) { errorCal = 'No se pudo leer el calendario.'; console.error('panel:', e.message); }

  const porDia = {};
  for (const ev of eventos) {
    const ini = DateTime.fromISO(ev.start.dateTime || ev.start.date, { zone: TZ }).setLocale('es');
    (porDia[ini.toFormat("cccc d 'de' LLLL")] ||= []).push(
      `<li><b>${ini.toFormat('HH:mm')}</b> ${esc(ev.summary)}</li>`);
  }
  const citasHtml = Object.entries(porDia).map(([d, li]) => `<h3>${esc(d)}</h3><ul>${li.join('')}</ul>`).join('')
    || `<p class="mut">${esc(errorCal) || 'Sin citas en los próximos 14 días.'}</p>`;

  const hoy = DateTime.now().setZone(TZ).startOf('day');
  const llamadasHoy = calls.filter(c => DateTime.fromISO(c.at) >= hoy).length;
  const llamadasHtml = calls.slice(0, 15).map(c => {
    const t = DateTime.fromISO(c.at).setZone(TZ).setLocale('es').toFormat('d LLL HH:mm');
    return `<li><b>${t}</b> · ${c.seconds}s<br><span class="mut">${esc(c.summary || c.ended || 'Sin resumen')}</span></li>`;
  }).join('') || '<p class="mut">Aún no hay llamadas registradas.</p>';

  res.send(`<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Panel · Recepcionista IA</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=Manrope:wght@700;800&display=swap" rel="stylesheet">
<style>
:root{--paper:#f5f0e6;--ink:#1b1a17;--accent:#4338ca;--mut:#6b665c;--card:#fffdf8;--line:#e3dccd}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.5 Inter,sans-serif}
main{max-width:920px;margin:0 auto;padding:24px 16px 48px}
h1,h2,h3{font-family:Manrope,sans-serif;margin:0}h1{font-size:26px}h2{font-size:18px;margin-bottom:12px}
h3{font-size:14px;color:var(--accent);margin:16px 0 4px;text-transform:capitalize}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin:20px 0}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px}
.stat b{display:block;font:800 30px Manrope,sans-serif;color:var(--accent)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px}
ul{list-style:none;padding:0;margin:0}li{padding:8px 0;border-bottom:1px solid var(--line)}li:last-child{border:0}
.mut{color:var(--mut)}
</style></head><body><main>
<h1>Recepcionista IA</h1><p class="mut">Panel de demostración · Europe/Madrid</p>
<div class="stats">
<div class="card stat"><b>${eventos.length}</b>Citas próximos 14 días</div>
<div class="card stat"><b>${llamadasHoy}</b>Llamadas atendidas hoy</div>
<div class="card stat"><b>${calls.length}</b>Llamadas registradas</div></div>
<div class="grid">
<section class="card"><h2>Próximas citas</h2>${citasHtml}</section>
<section class="card"><h2>Últimas llamadas</h2><ul>${llamadasHtml}</ul></section>
</div></main></body></html>`);
});

app.listen(PORT, () => console.log(`Webhook en :${PORT}`));
