import * as dotenv from 'dotenv';

dotenv.config();

export const DISCORD_TOKEN = process.env.DISCORD_TOKEN ?? '';
export const CLIENT_ID = process.env.CLIENT_ID ?? '';
export const GUILD_ID = process.env.GUILD_ID ?? '';
export const DATA_PATH = process.env.DATA_PATH ?? './data';
export const PALWORLD_API_URL = process.env.PALWORLD_API_URL ?? '';
export const PALWORLD_ADMIN_TOKEN = process.env.PALWORLD_ADMIN_TOKEN ?? '';

if (!DISCORD_TOKEN) {
  throw new Error('Missing DISCORD_TOKEN in environment variables.');
}
