# Instalar y probar (de cero)

Tiempo estimado: 30-45 min la primera vez. Coste: 0 € (créditos de prueba de Vapi).

## 0. Requisitos
- **Node.js 20.6 o superior** (`node -v` para comprobarlo) → nodejs.org
- **cloudflared** (túnel gratuito para que Vapi llegue a tu PC):
  - Windows: `winget install Cloudflare.cloudflared`
  - Mac: `brew install cloudflared`
  - Linux: paquete en developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads
- Cuenta de Google y cuenta en **vapi.ai**

## 1. Instalar dependencias
```bash
cd recepcionista-dental
npm install
cp .env.example .env        # en Windows: copy .env.example .env
```

## 2. Google Calendar (cuenta de servicio)
1. Google Calendar → crea un calendario nuevo llamado **Citas Demo**.
2. console.cloud.google.com → proyecto nuevo → **APIs y servicios → Biblioteca** → activa **Google Calendar API**.
3. **APIs y servicios → Credenciales → Crear credenciales → Cuenta de servicio** (sin roles) → entra en ella → pestaña **Claves → Agregar clave → JSON**. Se descarga un archivo.
4. Renómbralo a `google-sa.json` y colócalo en la carpeta del proyecto.
5. Abre el JSON, copia el valor de `client_email`. En Google Calendar → Citas Demo → **Configuración y uso compartido → Compartir con personas** → pega ese email con permiso **Realizar cambios en eventos**.
6. En esa misma página, baja a **Integrar calendario** y copia el **ID del calendario**.

## 3. Rellenar `.env`
Edita `.env` y completa:
- `VAPI_SECRET` → invéntate una cadena larga
- `PANEL_KEY` → otra cadena
- `CALENDAR_ID` → el ID del paso 2.6
- `GOOGLE_SA_FILE=./google-sa.json` (ya viene así)

## 4. Arrancar el servidor y el túnel
**Terminal 1:**
```bash
npm run dev
```
Debe imprimir `Webhook en :3000`. Comprueba http://localhost:3000 → `ok`.

**Terminal 2:**
```bash
cloudflared tunnel --url http://localhost:3000
```
Copia la URL `https://algo-aleatorio.trycloudflare.com` que muestra.

## 5. Crear el asistente en Vapi
1. En vapi.ai → **API Keys**: copia la **Private Key** y la **Public Key**.
2. En `.env` rellena `PUBLIC_URL` (la URL del túnel, sin barra final), `VAPI_PRIVATE_KEY` y `VAPI_PUBLIC_KEY`.
3. Ejecuta (terminal 3):
```bash
npm run asistente
```
Crea el asistente y escribe su ID en la landing. Copia el ID a `VAPI_ASSISTANT_ID` en `.env` para que las siguientes ejecuciones lo actualicen.

> La URL de `trycloudflare` cambia cada vez que reinicias `cloudflared`. Cuando cambie: actualiza `PUBLIC_URL` en `.env` y vuelve a ejecutar `npm run asistente` (con `VAPI_ASSISTANT_ID` rellenado actualiza el existente).

## 6. Probar
```bash
npm run landing
```
Abre http://localhost:5000 → **Iniciar llamada de prueba** → permite el micrófono.

Prueba esto, en orden:
1. "Hola, quiero una limpieza el martes" → te ofrece horas.
2. Acepta una hora, di nombre y teléfono → la cita aparece en Google Calendar.
3. Vuelve a pedir esa misma hora → debe ofrecerte otra.
4. Pide un sábado → "cerrado".
5. "Me duele mucho y tengo la cara hinchada" → prioriza y avisa de urgencias/112.
6. Cuelga y abre `http://localhost:3000/panel?key=TU_PANEL_KEY` → ves la cita y la llamada.

## Si algo falla
| Síntoma | Causa probable |
|---|---|
| `npm run dev` da error de `--env-file` | Node < 20.6 |
| El agente dice "error técnico" | Calendario no compartido con el `client_email`, o `CALENDAR_ID` mal |
| No aparece nada en los logs del servidor al hablar | URL del túnel caducada o `PUBLIC_URL` mal; repite el paso 5 |
| 401 en los logs | `VAPI_SECRET` cambiado después de crear el asistente: ejecuta `npm run asistente` otra vez |
| `npm run asistente` devuelve 4xx | Mira el mensaje de Vapi: clave incorrecta o campo no soportado en tu cuenta (p. ej. la voz de Azure; cámbiala en `assistant.json` o en el dashboard) |
| La landing dice "No se pudo conectar" | Falta `VAPI_PUBLIC_KEY` o el ID del asistente; revisa las constantes en `landing/index.html` |
| El panel no muestra llamadas | `serverMessages` / `server.url` no están en el asistente: repite el paso 5 |

## Para dejarlo online (después de probar)
- Servidor: Render, Railway o Fly en plan gratuito. Define las variables de `.env` en su panel (usa `GOOGLE_SA_JSON` en base64 con `GOOGLE_SA_B64=1`, ya que allí no subes `google-sa.json`). Comando de arranque: `npm start`.
- Landing: Cloudflare Pages, Netlify o GitHub Pages (carpeta `landing`).
- Antes de usarlo con pacientes reales: `ventas/06-rgpd.md`.
