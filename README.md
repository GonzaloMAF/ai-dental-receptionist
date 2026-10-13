# Recepcionista virtual con IA para clínicas dentales

Proyecto de portfolio que simula una recepcionista telefónica con inteligencia artificial para clínicas dentales. El asistente puede consultar disponibilidad, reservar citas en Google Calendar y ofrecer un panel web básico para revisar las próximas citas y el resumen de las llamadas.

> **Estado:** prototipo demostrativo. Requiere configurar credenciales y servicios externos para ejecutar el flujo completo. No está preparado para gestionar pacientes reales sin una revisión adicional de seguridad, privacidad y cumplimiento normativo.

## Funcionalidades

- Asistente de voz conectado mediante **Vapi**.
- Consulta de disponibilidad en Google Calendar.
- Reserva de citas de 30 minutos, con comprobación de horario y solapamientos.
- Webhook en **Node.js + Express** para gestionar las herramientas del asistente.
- Panel web protegido por clave para visualizar próximas citas y resúmenes de llamadas.
- Landing page con botón para iniciar una llamada de demostración.
- Configuración mediante variables de entorno para evitar guardar credenciales en el código.

## Tecnologías

- JavaScript / Node.js
- Express
- Google Calendar API (`googleapis`)
- Luxon para fechas y zona horaria
- Vapi para el agente de voz
- HTML, CSS y JavaScript para la landing y el panel

## Estructura del proyecto

```text
recepcionista-dental/
├── server.js                 # Webhook, agenda y panel
├── assistant.json            # Configuración del asistente Vapi
├── scripts/
│   └── crear-asistente.js    # Creación/actualización del asistente
├── landing/
│   └── index.html            # Página de demostración
├── .env.example              # Plantilla de variables de entorno
├── INSTALAR.md               # Guía de configuración detallada
└── package.json
```

## Requisitos

- Node.js 20.6 o superior
- Una cuenta de Vapi y sus claves de API
- Un proyecto de Google Cloud con Google Calendar API habilitada
- Un calendario de Google y una cuenta de servicio con permisos para editarlo
- Para recibir webhooks desde Vapi durante las pruebas locales, una URL pública temporal, por ejemplo mediante Cloudflare Tunnel

## Instalación

1. Clona el repositorio e instala las dependencias:

   ```bash
   git clone https://github.com/TU-USUARIO/recepcionista-dental.git
   cd recepcionista-dental
   npm install
   ```

2. Crea tu archivo de entorno a partir de la plantilla:

   ```bash
   copy .env.example .env
   ```

   En macOS/Linux puedes usar `cp .env.example .env`.

3. Completa las variables de `.env` con tus propias claves, el ID del calendario y la ruta a las credenciales de Google. No compartas ese archivo.

4. Sigue la guía de configuración completa en [`INSTALAR.md`](./INSTALAR.md).

5. Inicia el servidor:

   ```bash
   npm run dev
   ```

   Abre `http://localhost:3000`. Si el servidor arranca correctamente, debe responder `ok`.

## Variables de entorno

Las principales variables están documentadas en `.env.example`, entre ellas `VAPI_SECRET`, `PANEL_KEY`, `CALENDAR_ID` y las credenciales de Google. Usa valores propios y seguros; no subas nunca `.env`, claves privadas ni archivos de credenciales al repositorio.

## Consideraciones y limitaciones

- El registro de llamadas se guarda localmente y puede perderse al reiniciar o desplegar en un hosting con almacenamiento efímero.
- La autenticación del panel mediante parámetro de consulta es una solución sencilla para una demo, no una protección adecuada para producción.
- Antes de usarlo con pacientes reales, hay que revisar protección de datos, conservación de información, seguridad, control de acceso, gestión de errores y obligaciones legales aplicables.
- El asistente es una demostración administrativa y no sustituye el criterio de profesionales sanitarios ni debe diagnosticar.

## Autor

Proyecto personal de portfolio para practicar integración de APIs, automatización de procesos, backend con Node.js y conexión de un agente de IA con herramientas externas.
