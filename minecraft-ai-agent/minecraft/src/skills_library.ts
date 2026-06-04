/**
 * MINECRAFT AI AGENT — BUILT-IN SKILL LIBRARY
 *
 * This module exports a string of JavaScript helper functions that are
 * prepended to every dynamically-generated skill's code before execution.
 * This gives Gemini-generated code access to reliable, pre-tested helpers.
 */

export const SKILL_LIBRARY_CODE = `
// ============================================================
// MINECRAFT AI AGENT — BUILT-IN SKILL LIBRARY v2.0
// All helpers are async. First argument is always 'bot'.
// These are available inside every generated execute() function.
// ============================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getItemCount(bot, itemName) {
  return bot.inventory.items()
    .filter(i => i.name === itemName)
    .reduce((sum, i) => sum + i.count, 0);
}

function getBestFood(bot) {
  const priority = [
    'golden_apple','cooked_beef','cooked_porkchop','cooked_chicken',
    'bread','cooked_mutton','cooked_rabbit','cooked_salmon','baked_potato',
    'carrot','apple','cooked_cod'
  ];
  for (const food of priority) {
    const itemData = bot.registry.itemsByName[food];
    if (!itemData) continue;
    const item = bot.inventory.findInventoryItem(itemData.id, null, false);
    if (item) return item;
  }
  return null;
}

async function eatFood(bot) {
  const food = getBestFood(bot);
  if (!food) { bot.chat('No food available!'); return false; }
  await bot.equip(food, 'hand');
  await bot.consume();
  bot.chat('Ate food — hunger restored.');
  return true;
}

async function equipItem(bot, itemName, slot) {
  const itemData = bot.registry.itemsByName[itemName];
  if (!itemData) return false;
  const item = bot.inventory.findInventoryItem(itemData.id, null, false);
  if (!item) return false;
  try { await bot.equip(item, slot); return true; } catch(e) { return false; }
}

async function equipBestGear(bot) {
  const armour = {
    head:  ['diamond_helmet','iron_helmet','chainmail_helmet','golden_helmet','leather_helmet'],
    torso: ['diamond_chestplate','iron_chestplate','chainmail_chestplate','golden_chestplate','leather_chestplate'],
    legs:  ['diamond_leggings','iron_leggings','chainmail_leggings','golden_leggings','leather_leggings'],
    feet:  ['diamond_boots','iron_boots','chainmail_boots','golden_boots','leather_boots'],
  };
  for (const [slot, list] of Object.entries(armour)) {
    for (const item of list) {
      if (await equipItem(bot, item, slot)) break;
    }
  }
  for (const weapon of ['diamond_sword','iron_sword','stone_sword','wooden_sword']) {
    if (await equipItem(bot, weapon, 'hand')) break;
  }
  bot.chat('Equipped best available gear.');
}

async function moveTo(bot, x, y, z, range = 2) {
  const { Movements, goals } = require('mineflayer-pathfinder');
  const movements = new Movements(bot);
  bot.pathfinder.setMovements(movements);
  try {
    await bot.pathfinder.goto(new goals.GoalNear(x, y, z, range));
  } catch(e) { /* path blocked or timeout — continue */ }
}

async function collectWood(bot, count = 20) {
  const logNames = [
    'oak_log','birch_log','spruce_log','jungle_log',
    'acacia_log','dark_oak_log','mangrove_log','cherry_log'
  ];
  let collected = 0;
  const maxAttempts = count * 4;
  let attempts = 0;
  bot.chat('Collecting ' + count + ' wood logs...');
  while (collected < count && attempts < maxAttempts) {
    attempts++;
    let targetBlock = null;
    let minDist = Infinity;
    for (const logName of logNames) {
      const blockType = bot.registry.blocksByName[logName];
      if (!blockType) continue;
      const found = bot.findBlocks({ matching: blockType.id, maxDistance: 64, count: 5 });
      for (const pos of found) {
        const b = bot.blockAt(pos);
        if (!b) continue;
        const d = bot.entity.position.distanceTo(b.position);
        if (d < minDist) { minDist = d; targetBlock = b; }
      }
    }
    if (!targetBlock) {
      bot.chat('No trees nearby — wandering to find more...');
      const p = bot.entity.position;
      await moveTo(bot, p.x + (Math.random()-0.5)*60, p.y, p.z + (Math.random()-0.5)*60, 3);
      await sleep(1000);
      continue;
    }
    try {
      await bot.collectBlock.collect(targetBlock);
      collected++;
      bot.chat('Logs: ' + collected + '/' + count);
    } catch(e) { await sleep(300); }
  }
  bot.chat('Wood collection done: ' + collected + ' logs.');
  return collected >= count;
}

async function ensureCraftingTable(bot) {
  const tableType = bot.registry.blocksByName['crafting_table'];
  if (!tableType) return null;
  let table = bot.findBlock({ matching: tableType.id, maxDistance: 6 });
  if (table) { await moveTo(bot, table.position.x, table.position.y, table.position.z, 2); return table; }
  const tableItemData = bot.registry.itemsByName['crafting_table'];
  let tableItem = tableItemData ? bot.inventory.findInventoryItem(tableItemData.id, null, false) : null;
  if (!tableItem) {
    // Craft planks from logs
    const logTypes = ['oak_log','birch_log','spruce_log','jungle_log','acacia_log','dark_oak_log'];
    const plankTypes = ['oak_planks','birch_planks','spruce_planks','jungle_planks','acacia_planks','dark_oak_planks'];
    for (let i = 0; i < logTypes.length; i++) {
      const logData = bot.registry.itemsByName[logTypes[i]];
      if (!logData) continue;
      const log = bot.inventory.findInventoryItem(logData.id, null, false);
      if (log && log.count > 0) {
        const plankData = bot.registry.itemsByName[plankTypes[i]];
        if (!plankData) continue;
        const recipe = bot.recipesFor(plankData.id, null, 1, null)[0];
        if (recipe) { try { await bot.craft(recipe, 4, null); } catch(e) {} }
        break;
      }
    }
    // Craft crafting_table
    if (tableItemData) {
      const recipe = bot.recipesFor(tableItemData.id, null, 1, null)[0];
      if (recipe) { try { await bot.craft(recipe, 1, null); } catch(e) {} }
    }
    tableItem = tableItemData ? bot.inventory.findInventoryItem(tableItemData.id, null, false) : null;
  }
  if (!tableItem) { bot.chat('Cannot get crafting table'); return null; }
  const pos = bot.entity.position.floored();
  for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1],[2,0],[-2,0],[0,2],[0,-2]]) {
    const surface = bot.blockAt(pos.offset(dx,-1,dz));
    if (!surface || surface.name === 'air' || surface.name === 'water' || surface.name === 'lava') continue;
    try {
      const freshItem = bot.inventory.findInventoryItem(tableItemData.id, null, false);
      if (!freshItem) break;
      await bot.equip(freshItem, 'hand');
      await bot.placeBlock(surface, new (require('vec3').Vec3)(0,1,0));
      table = bot.findBlock({ matching: tableType.id, maxDistance: 6 });
      if (table) { await moveTo(bot, table.position.x, table.position.y, table.position.z, 2); return table; }
    } catch(e) {}
  }
  return null;
}

async function craftPlanksAndSticks(bot) {
  const logTypes = ['oak_log','birch_log','spruce_log','jungle_log','acacia_log','dark_oak_log','mangrove_log'];
  const plankTypes = ['oak_planks','birch_planks','spruce_planks','jungle_planks','acacia_planks','dark_oak_planks','mangrove_planks'];
  for (let i = 0; i < logTypes.length; i++) {
    const logData = bot.registry.itemsByName[logTypes[i]];
    if (!logData) continue;
    const log = bot.inventory.findInventoryItem(logData.id, null, false);
    if (log && log.count > 0) {
      const plankData = bot.registry.itemsByName[plankTypes[i]];
      if (!plankData) continue;
      const recipe = bot.recipesFor(plankData.id, null, 1, null)[0];
      if (recipe) { try { await bot.craft(recipe, Math.min(log.count, 8), null); } catch(e) {} }
    }
  }
  const stickData = bot.registry.itemsByName['stick'];
  if (stickData) {
    const recipe = bot.recipesFor(stickData.id, null, 1, null)[0];
    if (recipe) { try { await bot.craft(recipe, 8, null); } catch(e) {} }
  }
}

async function craftItem(bot, itemName, amount = 1) {
  const itemData = bot.registry.itemsByName[itemName];
  if (!itemData) { bot.chat('Unknown item: ' + itemName); return false; }
  let recipe = bot.recipesFor(itemData.id, null, 1, null)[0];
  let craftingTable = null;
  if (!recipe) {
    craftingTable = await ensureCraftingTable(bot);
    if (craftingTable) recipe = bot.recipesFor(itemData.id, null, 1, craftingTable)[0];
  }
  if (!recipe) { bot.chat('No recipe for ' + itemName + ' — missing ingredients?'); return false; }
  try {
    await bot.craft(recipe, amount, craftingTable);
    bot.chat('Crafted ' + amount + 'x ' + itemName);
    return true;
  } catch(e) { bot.chat('Crafting failed: ' + e.message); return false; }
}

async function mineBlocks(bot, blockName, count = 1, maxDist = 32) {
  let mined = 0;
  bot.chat('Mining ' + count + 'x ' + blockName + '...');
  while (mined < count) {
    const blockType = bot.registry.blocksByName[blockName];
    if (!blockType) break;
    const blocks = bot.findBlocks({ matching: blockType.id, maxDistance: maxDist, count: 1 });
    if (blocks.length === 0) { bot.chat('No ' + blockName + ' found nearby'); break; }
    const block = bot.blockAt(blocks[0]);
    if (!block) break;
    try {
      await bot.collectBlock.collect(block);
      mined++;
      bot.chat('Mined ' + mined + '/' + count + ' ' + blockName);
    } catch(e) { await sleep(300); }
  }
  return mined >= count;
}

async function digToY(bot, targetY) {
  const currentY = Math.floor(bot.entity.position.y);
  bot.chat('Digging from Y=' + currentY + ' to Y=' + targetY);
  if (currentY <= targetY + 1) return true;
  for (const p of ['diamond_pickaxe','iron_pickaxe','stone_pickaxe','wooden_pickaxe']) {
    if (await equipItem(bot, p, 'hand')) break;
  }
  let safety = 0;
  while (Math.floor(bot.entity.position.y) > targetY + 1 && safety < 300) {
    safety++;
    const pos = bot.entity.position.floored();
    const b1 = bot.blockAt(pos.offset(0,-1,0));
    const b2 = bot.blockAt(pos.offset(0,-2,0));
    if (b1 && (b1.name === 'lava' || b1.name === 'flowing_lava')) {
      bot.chat('Lava detected! Moving sideways...');
      await moveTo(bot, pos.x + 3, pos.y, pos.z, 1);
      continue;
    }
    if (b1 && b1.name !== 'air') { try { await bot.dig(b1); } catch(e) {} }
    if (b2 && b2.name !== 'air') { try { await bot.dig(b2); } catch(e) {} }
    await sleep(100);
  }
  bot.chat('Reached Y=' + Math.floor(bot.entity.position.y));
  return true;
}

async function buildFurnace(bot) {
  const furnaceType = bot.registry.blocksByName['furnace'];
  if (!furnaceType) return null;
  let furnaceBlock = bot.findBlock({ matching: furnaceType.id, maxDistance: 8 });
  if (furnaceBlock) { await moveTo(bot, furnaceBlock.position.x, furnaceBlock.position.y, furnaceBlock.position.z, 2); return furnaceBlock; }
  const furnaceItemData = bot.registry.itemsByName['furnace'];
  let furnaceItem = furnaceItemData ? bot.inventory.findInventoryItem(furnaceItemData.id, null, false) : null;
  if (!furnaceItem) {
    await craftItem(bot, 'furnace', 1);
    furnaceItem = furnaceItemData ? bot.inventory.findInventoryItem(furnaceItemData.id, null, false) : null;
  }
  if (!furnaceItem) { bot.chat('Cannot get furnace'); return null; }
  const pos = bot.entity.position.floored();
  for (const [dx, dz] of [[2,0],[-2,0],[0,2],[0,-2],[3,0],[-3,0]]) {
    const surface = bot.blockAt(pos.offset(dx,-1,dz));
    if (!surface || surface.name === 'air') continue;
    try {
      const freshItem = bot.inventory.findInventoryItem(furnaceItemData.id, null, false);
      if (!freshItem) break;
      await bot.equip(freshItem, 'hand');
      await bot.placeBlock(surface, new (require('vec3').Vec3)(0,1,0));
      furnaceBlock = bot.findBlock({ matching: furnaceType.id, maxDistance: 8 });
      if (furnaceBlock) { await moveTo(bot, furnaceBlock.position.x, furnaceBlock.position.y, furnaceBlock.position.z, 2); return furnaceBlock; }
    } catch(e) {}
  }
  return null;
}

async function smeltItems(bot, ingredientName, fuelName, count = 1) {
  bot.chat('Smelting ' + count + 'x ' + ingredientName + ' using ' + fuelName);
  const furnaceBlock = await buildFurnace(bot);
  if (!furnaceBlock) { bot.chat('No furnace available'); return false; }
  try {
    const furnace = await bot.openFurnace(furnaceBlock);
    const ingData = bot.registry.itemsByName[ingredientName];
    const fuelData = bot.registry.itemsByName[fuelName];
    const ingItem = ingData ? bot.inventory.findInventoryItem(ingData.id, null, false) : null;
    const fuelItem = fuelData ? bot.inventory.findInventoryItem(fuelData.id, null, false) : null;
    if (!ingItem) { furnace.close(); bot.chat('No ' + ingredientName + ' to smelt'); return false; }
    if (!fuelItem) { furnace.close(); bot.chat('No ' + fuelName + ' fuel'); return false; }
    await furnace.putInput(ingItem, null, Math.min(count, ingItem.count));
    await furnace.putFuel(fuelItem, null, Math.min(Math.max(1, Math.ceil(count / 8)), fuelItem.count));
    // Wait for smelting
    await new Promise(resolve => {
      const check = setInterval(() => { if (furnace.outputItem()) { clearInterval(check); resolve(null); } }, 2000);
      setTimeout(() => { clearInterval(check); resolve(null); }, count * 13000 + 5000);
    });
    if (furnace.outputItem()) await furnace.takeOutput();
    furnace.close();
    bot.chat('Smelting done!');
    return true;
  } catch(e) { bot.chat('Smelting error: ' + e.message); return false; }
}

async function killMobs(bot, mobType, count = 1) {
  bot.chat('Hunting ' + count + 'x ' + mobType);
  for (const w of ['diamond_sword','iron_sword','stone_sword','wooden_sword']) {
    if (await equipItem(bot, w, 'hand')) break;
  }
  let killed = 0;
  const deadline = Date.now() + 120000;
  while (killed < count && Date.now() < deadline) {
    const entity = bot.nearestEntity(e =>
      e.name && e.name.toLowerCase() === mobType.toLowerCase() &&
      bot.entity.position.distanceTo(e.position) < 48
    );
    if (!entity) {
      const p = bot.entity.position;
      await moveTo(bot, p.x + (Math.random()-0.5)*40, p.y, p.z + (Math.random()-0.5)*40, 3);
      await sleep(2000);
      continue;
    }
    try {
      await moveTo(bot, entity.position.x, entity.position.y, entity.position.z, 2);
      bot.pvp.attack(entity);
      await new Promise(resolve => {
        const check = setInterval(() => {
          if (!bot.entities[entity.id]) { clearInterval(check); bot.pvp.stop(); resolve(null); }
        }, 500);
        setTimeout(() => { clearInterval(check); bot.pvp.stop(); resolve(null); }, 30000);
      });
      killed++;
      bot.chat('Killed ' + killed + '/' + count + ' ' + mobType);
      await sleep(800);
    } catch(e) { await sleep(1000); }
  }
  return killed > 0;
}

async function waitForDay(bot) {
  if (bot.time && bot.time.timeOfDay < 13000) return;
  const bedNames = [
    'red_bed','white_bed','orange_bed','magenta_bed','light_blue_bed',
    'yellow_bed','lime_bed','pink_bed','gray_bed','cyan_bed','blue_bed','black_bed'
  ];
  for (const bedName of bedNames) {
    const bedType = bot.registry.blocksByName[bedName];
    if (!bedType) continue;
    const bed = bot.findBlock({ matching: bedType.id, maxDistance: 10 });
    if (bed) {
      try {
        await moveTo(bot, bed.position.x, bed.position.y, bed.position.z, 2);
        await bot.sleep(bed);
        bot.chat('Sleeping through the night...');
        await sleep(4000);
        return;
      } catch(e) {}
    }
  }
  bot.chat('No bed — waiting for dawn...');
  await sleep(12000);
}
`;
