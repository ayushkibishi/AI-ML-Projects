import { Bot } from 'mineflayer';
import { Vec3 } from 'vec3';

export function getInventory(bot: Bot): Record<string, number> {
  const items = bot.inventory.items();
  const inventoryData: Record<string, number> = {};
  for (const item of items) {
    if (inventoryData[item.name]) {
      inventoryData[item.name] += item.count;
    } else {
      inventoryData[item.name] = item.count;
    }
  }
  return inventoryData;
}

export function getItemCount(bot: Bot, itemName: string): number {
  const inventory = getInventory(bot);
  return inventory[itemName] || 0;
}

export function getPosition(bot: Bot) {
  const pos = bot.entity.position;
  return {
    x: parseFloat(pos.x.toFixed(1)),
    y: parseFloat(pos.y.toFixed(1)),
    z: parseFloat(pos.z.toFixed(1))
  };
}

export function distanceTo(pos1: { x: number; y: number; z: number }, pos2: { x: number; y: number; z: number }): number {
  return Math.sqrt(
    Math.pow(pos1.x - pos2.x, 2) +
    Math.pow(pos1.y - pos2.y, 2) +
    Math.pow(pos1.z - pos2.z, 2)
  );
}

export function logToConsole(bot: Bot, socket: any, message: string, level: string = 'INFO') {
  console.log(`[${level}] ${message}`);
  if (socket && socket.readyState === 1) { // 1 means OPEN
    socket.send(JSON.stringify({
      type: 'log',
      data: {
        level,
        message,
        timestamp: new Date().toISOString()
      }
    }));
  }
}
