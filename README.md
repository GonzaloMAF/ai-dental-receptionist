# AI Dental Receptionist

An AI-powered voice receptionist prototype for dental clinics, built with Node.js and Express. The assistant can check appointment availability, schedule appointments in Google Calendar, and provide a web dashboard to review upcoming appointments and call summaries.

> **Status:** Portfolio prototype. External services and credentials must be configured to run the complete workflow. It is not ready for real patient use without additional security, privacy, and compliance reviews.

## Features

- AI voice assistant powered by Vapi.
- Google Calendar availability checks.
- Appointment scheduling with time-slot and overlap validation.
- Node.js and Express webhook for handling assistant tool calls.
- Password-protected dashboard for viewing upcoming appointments and call summaries.
- Demo landing page with an option to start a voice call.
- Environment-based configuration to keep credentials out of the source code.

## Tech Stack

- **Runtime:** Node.js and JavaScript
- **Backend:** Express
- **Integrations:** Google Calendar API and Vapi
- **Date and time handling:** Luxon
- **Frontend:** HTML, CSS and JavaScript

## Project Structure

- `server.js` — Webhook, calendar integration and dashboard.
- `assistant.json` — Vapi assistant configuration.
- `scripts/crear-asistente.js` — Script to create or update the assistant.
- `landing/index.html` — Demo landing page.
- `.env.example` — Environment variable template.
- `INSTALAR.md` — Detailed setup guide in Spanish.
- `package.json` — Project dependencies and scripts.

## Requirements

- Node.js 20.6 or later.
- A Vapi account and API credentials.
- A Google Cloud project with the Google Calendar API enabled.
- A Google Calendar and a service account with calendar access.
- A public HTTPS endpoint for receiving Vapi webhooks during local testing.

## Getting Started

1. Clone the repository:

   ```bash
   git clone https://github.com/GonzaloMAF/recepcionista-dental-ia.git
   cd recepcionista-dental-ia
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create your environment file:

   ```bash
   copy .env.example .env
   ```

   On macOS or Linux, use `cp .env.example .env`.

4. Configure the required environment variables and Google Calendar credentials. Never commit your real `.env` file or private credentials.

5. Follow the detailed setup instructions in `INSTALAR.md`.

6. Start the development server:

   ```bash
   npm run dev
   ```

   Open `http://localhost:3000` and check that the server responds as expected.

## Limitations and Security

- This is a demonstration project, not a production-ready healthcare system.
- Call logs are stored locally and may not persist across restarts or deployments.
- Dashboard authentication is intentionally basic and requires strengthening before production use.
- Real-world deployment would require additional access controls, error handling, data protection measures and compliance reviews.
- The assistant is intended for administrative tasks and does not provide medical diagnoses.

## Author

Personal portfolio project exploring AI voice agents, API integration, workflow automation and backend development with Node.js.
