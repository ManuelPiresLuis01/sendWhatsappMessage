# WhatsApp Bot Service

A Node.js + Express WhatsApp bot that uses Gemini to reply to messages and stores per-user memory in MongoDB. It also exposes a QR page to authenticate, a ping route to keep Render awake, and a support email endpoint.

## Routes

There are **5 routes**:

1. `GET /`
   - Shows the WhatsApp QR code page to authenticate the bot.
2. `GET /qr.json`
   - Returns the current QR code data and WhatsApp status.
3. `GET /health`
   - Basic status endpoint.
4. `GET /ping`
   - Keep-alive endpoint used by the self-ping timer.
5. `POST /api/support`
   - Sends a support email to the user and to the admin inbox.

## Plans (Business Rules)

**Free**
- 30 messages/day
- Memory cap: 200 messages stored per user (user + bot)
- Basic support

**Premium**
- 1,000 messages/day
- Memory cap: 1,500 messages stored per user (user + bot)
- Priority support
- No ads

If a user hits the daily limit, the bot sends a payment/upgrade message and **does not** reply with Gemini until the next day or after upgrading.

## Features

- Gemini-powered replies to incoming WhatsApp messages.
- Per-user memory stored in MongoDB.
  - Stores **up to plan limit** per user (user + bot).
  - Uses **last 10 user** + **last 10 bot** messages for reply context.
- Daily limit enforced per user.
- QR login page for WhatsApp Web.
- Keep-alive ping every 11 minutes to avoid Render spin-down.
- Support email endpoint with SMTP.

## How User IDs Work

WhatsApp sends IDs like `244929004469@c.us`. The bot strips non-digits to create a clean user ID, e.g. `244929004469`.

## MongoDB Collections

- `messages`
  - Stores each message with `{ userId, role, body, createdAt }`.
- `daily_counts`
  - Tracks `{ userId, dateKey, count, createdAt }` for daily limits.
- `users`
  - Stores `{ userId, firstMessageAt, plan, supportTier, adsEnabled }`.

## Environment Variables

Create a `.env` file (or copy `.env.example`) and set:

```bash
# Server
PORT=3000

# Gemini
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash

# MongoDB (memory)
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=whatsapp_bot
MEMORY_LIMIT=10

# Self-ping (optional, for Render)
BASE_URL=https://your-service.onrender.com

# Support email
CORS_ORIGIN=*
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password_here
SMTP_FROM=your_email@gmail.com
SUPPORT_TO=manuelpiresluis@gmail.com

# Puppeteer/Chrome (Render)
PUPPETEER_EXECUTABLE_PATH=/opt/render/.cache/puppeteer/chrome/linux-*/chrome
```

## Render Deployment (Chrome fix)

Render doesn’t ship Chrome by default. This project installs Chrome at build time with:

```
npm run postinstall
```

That runs:
```
npx puppeteer browsers install chrome
```

If Chrome isn’t found, the app will attempt to resolve the binary under `/opt/render/.cache/puppeteer/chrome/...` automatically. You can also set `PUPPETEER_EXECUTABLE_PATH` explicitly.

## Setup

1. Install dependencies
   - `npm install`
2. Start the service
   - `npm run dev`
3. Open the QR page
   - `http://localhost:3000/`

## Support Email

Send a POST request to `/api/support` with JSON:

```json
{
  "name": "Your Name",
  "email": "you@email.com",
  "message": "Your message"
}
```

The server sends an email to the user and to the support inbox.

## Message Flow

1. User sends a message to the bot on WhatsApp.
2. Bot stores the user message in MongoDB.
3. Bot checks the daily limit for the user plan.
4. Bot builds a prompt using the last messages.
5. Gemini generates a reply.
6. Bot sends the reply and stores it.
7. `cleanUp` keeps the maximum messages allowed by the plan.

## Keep-Alive

Every 11 minutes the server calls `/ping`. This helps prevent Render from sleeping the service. To use it on Render, set `BASE_URL`.
