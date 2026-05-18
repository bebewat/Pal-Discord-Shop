# Palworld Discord Shop

A new Discord-based shop system for Palworld. This project provides a Discord bot with shop browsing, purchasing, and inventory tracking.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file in the workspace root:

```env
DISCORD_TOKEN=your-bot-token
CLIENT_ID=your-application-id
GUILD_ID=your-test-guild-id
PALWORLD_API_URL=https://your-palworld-server.example
PALWORLD_ADMIN_TOKEN=your-palworld-server-admin-password
```

3. Build and run:

```bash
npm run build
npm start
```

4. During development:

```bash
npm run dev
```

## Palworld server integration

If `PALWORLD_API_URL` and `PALWORLD_ADMIN_TOKEN` are configured, the bot will call your Palworld backend to:

- verify and deduct player points/currency
- deliver the requested item or Pal in-game
- return success or failure information to Discord

The current implementation sends a POST request to:

`{PALWORLD_API_URL}/api/purchase`

with JSON payload:

```json
{
  "discordId": "discord-user-id",
  "itemId": "server-item-id",
  "quantity": 1,
  "price": 150
}
```

Make sure your Palworld server side can accept this call and authenticate the admin token.

## Commands

- `/shop` - show available shop items
- `/buy item_id:<id> quantity:<number>` - buy an item
- `/inventory` - show your bought items
- `/additem` - add a new item (admin only)
- `/restock` - update stock for an item (admin only)

## Data storage

Shop data is stored in `data/shop.json` automatically.

## Notes

- Ensure the bot has `applications.commands` and `bot` scopes when invited.
- Use `GUILD_ID` for fast local command registration.
