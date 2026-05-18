import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { DATA_PATH, PALWORLD_API_URL, PALWORLD_ADMIN_TOKEN } from './config';

export interface ShopItem {
  id: string;
  serverId?: string;
  name: string;
  description: string;
  price: number;
  stock: number;
}

export interface PlayerInventoryItem {
  id: string;
  quantity: number;
}

export interface ShopData {
  items: ShopItem[];
  inventories: Record<string, PlayerInventoryItem[]>;
}

export interface PalworldPurchaseResult {
  success: boolean;
  error?: string;
  delivered?: boolean;
  remainingCoins?: number;
}

export interface BuyResult {
  item?: ShopItem;
  inventory?: PlayerInventoryItem[];
  error?: string;
  serverResult?: PalworldPurchaseResult;
}

const defaultItems: ShopItem[] = [
  {
    id: 'p01',
    serverId: 'PAL_POTION',
    name: 'Pal Potion',
    description: 'Restores one Pal to full health.',
    price: 150,
    stock: 30
  },
  {
    id: 'p02',
    serverId: 'MYSTIC_BERRY',
    name: 'Mystic Berry',
    description: 'A rare berry that increases Pal friendship.',
    price: 230,
    stock: 18
  },
  {
    id: 'p03',
    serverId: 'WARP_SCROLL',
    name: 'Warp Scroll',
    description: 'Teleports the user to the nearest base.',
    price: 500,
    stock: 6
  }
];

const filePath = join(DATA_PATH, 'shop.json');
const isPalworldEnabled = Boolean(PALWORLD_API_URL && PALWORLD_ADMIN_TOKEN);

function ensureDataFile() {
  if (!existsSync(DATA_PATH)) {
    mkdirSync(DATA_PATH, { recursive: true });
  }

  if (!existsSync(filePath)) {
    const initialData: ShopData = {
      items: defaultItems,
      inventories: {}
    };
    writeFileSync(filePath, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

function readData(): ShopData {
  ensureDataFile();
  return JSON.parse(readFileSync(filePath, 'utf-8')) as ShopData;
}

function writeData(data: ShopData) {
  ensureDataFile();
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function listItems(): ShopItem[] {
  const data = readData();
  return data.items;
}

export function getItem(id: string): ShopItem | undefined {
  const data = readData();
  return data.items.find(item => item.id === id);
}

export function addItem(item: Omit<ShopItem, 'id'>): ShopItem {
  const data = readData();
  const newItem: ShopItem = { ...item, id: uuidv4() };
  data.items.push(newItem);
  writeData(data);
  return newItem;
}

export function updateStock(id: string, amount: number): ShopItem | undefined {
  const data = readData();
  const item = data.items.find(item => item.id === id);
  if (!item) return undefined;
  item.stock = Math.max(0, item.stock + amount);
  writeData(data);
  return item;
}

async function deliverToPalworld(userId: string, item: ShopItem, quantity: number): Promise<PalworldPurchaseResult> {
  if (!item.serverId) {
    return { success: false, error: 'Item does not have a Palworld server ID.' };
  }

  if (!isPalworldEnabled) {
    return { success: false, error: 'Palworld server integration is not configured.' };
  }

  const endpoint = `${PALWORLD_API_URL.replace(/\/$/, '')}/api/purchase`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PALWORLD_ADMIN_TOKEN}`
      },
      body: JSON.stringify({
        discordId: userId,
        itemId: item.serverId,
        quantity,
        price: item.price
      })
    });

    if (!response.ok) {
      return { success: false, error: `Palworld server returned ${response.status}` };
    }

    const data = await response.json();
    if (!data.success) {
      return { success: false, error: data.error ?? 'Palworld purchase failed.' };
    }

    return {
      success: true,
      delivered: Boolean(data.delivered),
      remainingCoins: typeof data.remainingCoins === 'number' ? data.remainingCoins : undefined
    };
  } catch (error) {
    return { success: false, error: `Palworld integration error: ${String(error)}` };
  }
}

export async function buyItem(userId: string, itemId: string, quantity = 1): Promise<BuyResult> {
  const data = readData();
  const item = data.items.find(item => item.id === itemId);

  if (!item) {
    return { error: 'Item not found.' };
  }

  if (item.stock < quantity) {
    return { error: `Only ${item.stock} unit(s) are available.` };
  }

  let serverResult: PalworldPurchaseResult | undefined;

  if (item.serverId) {
    serverResult = await deliverToPalworld(userId, item, quantity);
    if (!serverResult.success) {
      return { error: serverResult.error };
    }
  }

  item.stock -= quantity;
  const inventory = data.inventories[userId] ?? [];
  const inventoryItem = inventory.find(entry => entry.id === item.id);

  if (inventoryItem) {
    inventoryItem.quantity += quantity;
  } else {
    inventory.push({ id: item.id, quantity });
  }

  data.inventories[userId] = inventory;
  writeData(data);

  return { item, inventory, serverResult };
}

export function getInventory(userId: string): PlayerInventoryItem[] {
  const data = readData();
  return data.inventories[userId] ?? [];
}

export function getAvailableItemsText(): string {
  return listItems()
    .map(item => `**${item.id}** ${item.serverId ? `(${item.serverId}) ` : ''}- ${item.name} | ${item.price} coins | stock: ${item.stock}\n${item.description}`)
    .join('\n\n');
}
