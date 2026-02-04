# WhatsApp Bot Service

A Node.js + Express WhatsApp bot that uses Gemini to reply to messages and stores per-user memory in MongoDB. It also exposes a QR page to authenticate and a ping route to keep Render awake.

## Routes

There are **4 routes**:

1. `GET /`
   - Shows the WhatsApp QR code page to authenticate the bot.
2. `GET /qr.json`
   - Returns the current QR code data and WhatsApp status.
3. `GET /health`
   - Basic status endpoint.
4. `GET /ping`
   - Keep-alive endpoint used by the self-ping timer.

## Features

- Gemini-powered replies to incoming WhatsApp messages.
- Per-user memory stored in MongoDB.
  - Stores **up to 200 total messages** per user (user + bot).
  - Uses **last 10 user** + **last 10 bot** messages for reply context.
- Daily limit of **30 messages per user** (configurable).
- QR login page for WhatsApp Web.
- Keep-alive ping every 11 minutes to avoid Render spin-down.

## How User IDs Work

WhatsApp sends IDs like `244929004469@c.us`. The bot strips non-digits to create a clean user ID, e.g. `244929004469`.

## MongoDB Collections

- `messages`
  - Stores each message with `{ userId, role, body, createdAt }`.
- `daily_counts`
  - Tracks `{ userId, dateKey, count, createdAt }` for daily limits.
- `users`
  - Stores `{ userId, firstMessageAt }` on the first message.

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
DAILY_LIMIT=30
MAX_MESSAGES_PER_USER=200

# Self-ping (optional, for Render)
BASE_URL=https://your-service.onrender.com
```

## Setup

1. Install dependencies
   - `npm install`
2. Start the service
   - `npm run dev`
3. Open the QR page
   - `http://localhost:3000/`

## Message Flow

1. User sends a message to the bot on WhatsApp.
2. Bot stores the user message in MongoDB.
3. Bot checks the daily limit.
4. Bot builds a prompt using the last messages.
5. Gemini generates a reply.
6. Bot sends the reply and stores it.
7. `cleanUp` keeps a maximum of 200 messages per user.

## Keep-Alive

Every 11 minutes the server calls `/ping`. This helps prevent Render from sleeping the service. To use it on Render, set `BASE_URL`.
