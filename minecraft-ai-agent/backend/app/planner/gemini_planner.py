import os
import json
import logging
import re
from typing import List, Dict, Any, Tuple
import google.generativeai as genai
from backend.app.config import settings
from backend.app.memory.faiss_store import FAISSMemoryStore

logger = logging.getLogger("Planner")

class GeminiPlanner:
    def __init__(self, memory_store: FAISSMemoryStore):
        self.memory_store = memory_store
        self.api_key_set = bool(settings.GEMINI_API_KEY)
        
        if self.api_key_set:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.model = genai.GenerativeModel(settings.GEMINI_MODEL)
            logger.info("Gemini API initialized successfully.")
        else:
            logger.warning("GEMINI_API_KEY not found. Running in Offline Mock Planner mode.")

    def _call_gemini(self, prompt: str) -> dict:
        """Call Gemini API and parse JSON response. Returns None on failure."""
        try:
            response = self.model.generate_content(prompt)
            raw_text = response.text.strip()
            if raw_text.startswith("```"):
                raw_text = re.sub(r"^```(?:json)?\n", "", raw_text)
                raw_text = re.sub(r"\n```$", "", raw_text)
            return json.loads(raw_text.strip())
        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            return None

    def plan_and_generate_code(
        self,
        command: str,
        bot_status: Dict[str, Any],
        available_skills: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Creates a multi-step plan and generates JavaScript skill code for a user command.
        """
        if not self.api_key_set:
            return self._generate_mock_plan(command, bot_status, available_skills)

        memories = self.memory_store.query_memory(command, k=3)
        memory_str = json.dumps(memories, indent=2)
        skills_str = json.dumps(
            [{"name": s["name"], "description": s["description"]} for s in available_skills],
            indent=2
        )

        prompt = f"""
You are the AI brain of a Minecraft Bot running on Mineflayer (Node.js).
User Command: "{command}"

Current Bot Status:
- Position: X={bot_status.get('x')}, Y={bot_status.get('y')}, Z={bot_status.get('z')}
- Health: {bot_status.get('health')}/20
- Hunger: {bot_status.get('hunger')}/20
- Inventory: {json.dumps(bot_status.get('inventory', {}))}

Relevant Memories: {memory_str}
Available Skills: {skills_str}

Important Mineflayer APIs:
- Navigation: const {{ Movements, goals }} = require('mineflayer-pathfinder'); await bot.pathfinder.goto(new goals.GoalNear(x,y,z,range))
- Mining: await bot.collectBlock.collect(block)
- Crafting: bot.recipesFor(itemId, null, 1, craftingTable)[0]; await bot.craft(recipe, count, table)
- Combat: bot.pvp.attack(entity)
- Find blocks: bot.findBlocks({{ matching: blockTypeId, maxDistance: 64, count: N }})
- Find entity: bot.nearestEntity(filter)
- Open furnace: const f = await bot.openFurnace(block); await f.putInput(...); await f.putFuel(...); await f.takeOutput()

The code has access to pre-built helper functions:
  await collectWood(bot, count) - collect wood logs
  await craftItem(bot, itemName, amount) - craft items at crafting table
  await mineBlocks(bot, blockName, count) - mine specific blocks
  await smeltItems(bot, ingredientName, fuelName, count) - smelt in furnace
  await killMobs(bot, mobType, count) - kill mobs with pvp
  await eatFood(bot) - eat best food from inventory
  await equipBestGear(bot) - equip best armour/tools
  await digToY(bot, targetY) - dig down to a Y level
  await craftPlanksAndSticks(bot) - craft planks then sticks
  await moveTo(bot, x, y, z, range) - pathfind to coordinates
  await waitForDay(bot) - sleep through night or wait

TASK: Respond with ONLY valid JSON (no markdown):
{{
  "explanation": "reasoning string",
  "steps": ["step1", "step2"],
  "execution_code": "async function execute(bot) {{ ... }}"
}}
"""
        result = self._call_gemini(prompt)
        if result:
            return result
        return self._generate_mock_plan(command, bot_status, available_skills, error_msg="API returned invalid JSON")

    def plan_next_autonomous_goal(
        self,
        goal: str,
        bot_status: Dict[str, Any],
        available_skills: List[Dict[str, Any]],
        stage: str
    ) -> Dict[str, Any]:
        """
        Like plan_and_generate_code but with full Minecraft progression context.
        Called by the autonomous loop after each task completes.
        """
        if not self.api_key_set:
            return self._generate_autonomous_fallback(goal, bot_status, stage)

        skills_str = json.dumps(
            [{"name": s["name"], "description": s["description"]} for s in available_skills],
            indent=2
        )

        prompt = f"""
You are the autonomous AI brain of a Minecraft bot that is COMPLETING THE ENTIRE GAME alone.
The bot must progress from nothing to defeating the Ender Dragon without human help.

Current Game Stage: {stage}
Next Goal To Achieve: "{goal}"

Bot Status:
- Position: X={bot_status.get('x')}, Y={bot_status.get('y')}, Z={bot_status.get('z')}
- Health: {bot_status.get('health')}/20
- Hunger: {bot_status.get('hunger')}/20
- Inventory: {json.dumps(bot_status.get('inventory', {}))}

Available Reusable Skills: {skills_str}

Pre-built helper functions available in code:
  await collectWood(bot, count) - collect N wood logs from trees
  await craftItem(bot, itemName, amount) - craft items (handles crafting table placement)
  await mineBlocks(bot, blockName, count) - mine specific blocks
  await smeltItems(bot, ingredientName, fuelName, count) - smelt in furnace
  await killMobs(bot, mobType, count) - kill mobs with pvp plugin
  await eatFood(bot) - eat best food from inventory
  await equipBestGear(bot) - equip best available armour/tools
  await digToY(bot, targetY) - dig straight down to a Y level
  await craftPlanksAndSticks(bot) - craft planks then sticks from logs
  await moveTo(bot, x, y, z, range) - pathfind to location
  await waitForDay(bot) - sleep through night or wait for dawn

Rules:
1. Write FOCUSED code that accomplishes EXACTLY the stated goal
2. Use the helper functions above — they are already defined and available
3. Handle errors gracefully — catch exceptions and return false if something fails
4. Keep the execute function focused, not trying to do too many things at once
5. Always call bot.chat() to announce what you are doing
6. Return true on success, false on failure

Respond ONLY with valid JSON (no markdown wrapping):
{{
  "explanation": "your reasoning",
  "steps": ["step1", "step2", "step3"],
  "execution_code": "async function execute(bot) {{\\n  // code here\\n  return true;\\n}}"
}}
"""
        result = self._call_gemini(prompt)
        if result:
            return result
        return self._generate_autonomous_fallback(goal, bot_status, stage)

    def _generate_autonomous_fallback(
        self,
        goal: str,
        bot_status: Dict[str, Any],
        stage: str
    ) -> Dict[str, Any]:
        """
        Rule-based fallback for autonomous mode when Gemini is unavailable.
        Maps stage names to pre-written skill invocations.
        """
        logger.info(f"Autonomous fallback for stage={stage}, goal={goal}")
        
        stage_code_map = {
            "WOOD_AGE": (
                ["Find trees", "Collect 20 logs", "Craft pickaxe"],
                """
async function execute(bot) {
    bot.chat('Stage: Wood Age — collecting logs and crafting wooden pickaxe');
    await collectWood(bot, 20);
    await craftPlanksAndSticks(bot);
    await craftItem(bot, 'crafting_table', 1);
    await craftItem(bot, 'wooden_pickaxe', 1);
    bot.chat('Wooden pickaxe crafted!');
    return true;
}
"""
            ),
            "STONE_AGE": (
                ["Mine 64 cobblestone", "Craft stone pickaxe"],
                """
async function execute(bot) {
    bot.chat('Stage: Stone Age — mining cobblestone');
    await mineBlocks(bot, 'cobblestone', 64);
    await craftItem(bot, 'stone_pickaxe', 1);
    await craftItem(bot, 'stone_sword', 1);
    bot.chat('Stone tools crafted!');
    return true;
}
"""
            ),
            "IRON_AGE": (
                ["Mine 24 iron ore", "Smelt iron", "Craft iron tools"],
                """
async function execute(bot) {
    bot.chat('Stage: Iron Age — mining and smelting iron');
    await mineBlocks(bot, 'iron_ore', 12);
    await mineBlocks(bot, 'raw_iron', 12);
    await craftItem(bot, 'furnace', 1);
    await smeltItems(bot, 'raw_iron', 'oak_log', 12);
    await craftItem(bot, 'iron_pickaxe', 1);
    await craftItem(bot, 'iron_sword', 1);
    bot.chat('Iron tools ready!');
    return true;
}
"""
            ),
            "FOOD_SECURE": (
                ["Hunt cows", "Cook meat", "Collect 32 food"],
                """
async function execute(bot) {
    bot.chat('Stage: Food — hunting and cooking meat');
    await killMobs(bot, 'cow', 8);
    await smeltItems(bot, 'raw_beef', 'oak_log', 8);
    bot.chat('Food secured!');
    return true;
}
"""
            ),
            "DIAMOND_AGE": (
                ["Dig to Y=12", "Mine 12 diamonds"],
                """
async function execute(bot) {
    bot.chat('Stage: Diamond Age — heading underground!');
    await digToY(bot, 12);
    await mineBlocks(bot, 'diamond_ore', 6);
    await mineBlocks(bot, 'deepslate_diamond_ore', 6);
    bot.chat('Diamonds collected!');
    return true;
}
"""
            ),
            "GEAR_UP": (
                ["Craft diamond sword", "Craft diamond pickaxe", "Craft diamond armour"],
                """
async function execute(bot) {
    bot.chat('Stage: Gear Up — crafting full diamond set');
    await craftItem(bot, 'diamond_sword', 1);
    await craftItem(bot, 'diamond_pickaxe', 1);
    await craftItem(bot, 'diamond_chestplate', 1);
    await craftItem(bot, 'diamond_helmet', 1);
    await craftItem(bot, 'diamond_leggings', 1);
    await craftItem(bot, 'diamond_boots', 1);
    await equipBestGear(bot);
    bot.chat('Full diamond gear equipped!');
    return true;
}
"""
            ),
            "NETHER_PREP": (
                ["Mine obsidian", "Craft flint and steel", "Build nether portal"],
                """
async function execute(bot) {
    bot.chat('Stage: Nether Prep — mining obsidian for portal');
    await mineBlocks(bot, 'obsidian', 10);
    await craftItem(bot, 'flint_and_steel', 1);
    bot.chat('Portal materials ready! Building portal...');
    return true;
}
"""
            ),
            "NETHER": (
                ["Find nether fortress", "Kill blazes", "Collect 6 blaze rods"],
                """
async function execute(bot) {
    bot.chat('Stage: Nether — searching for Nether Fortress and blazes');
    await killMobs(bot, 'blaze', 6);
    bot.chat('Blaze rods collected!');
    return true;
}
"""
            ),
            "FIND_STRONGHOLD": (
                ["Craft eyes of ender", "Follow to stronghold"],
                """
async function execute(bot) {
    bot.chat('Stage: Find Stronghold — crafting eyes of ender');
    await craftItem(bot, 'blaze_powder', 6);
    await killMobs(bot, 'enderman', 12);
    await craftItem(bot, 'ender_eye', 12);
    bot.chat('Eyes of Ender crafted! Following them to the stronghold...');
    return true;
}
"""
            ),
            "END_PORTAL": (
                ["Locate end portal", "Activate portal", "Enter The End"],
                """
async function execute(bot) {
    bot.chat('Stage: End Portal — activating portal to The End');
    bot.chat('Searching for stronghold end portal room...');
    return true;
}
"""
            ),
            "KILL_DRAGON": (
                ["Destroy end crystals", "Attack Ender Dragon", "VICTORY!"],
                """
async function execute(bot) {
    bot.chat('Stage: KILL DRAGON — destroying end crystals and attacking the dragon!');
    await equipBestGear(bot);
    const dragon = bot.nearestEntity(e => e.name === 'ender_dragon');
    if (dragon) {
        bot.pvp.attack(dragon);
        bot.chat('Attacking the Ender Dragon!');
    } else {
        bot.chat('Searching for Ender Dragon...');
    }
    return true;
}
"""
            ),
        }
        
        steps, code = stage_code_map.get(stage, (
            ["Execute next action"],
            'async function execute(bot) { bot.chat("Autonomous mode active — computing next action..."); return true; }'
        ))
        
        return {
            "explanation": f"Offline autonomous plan for stage: {stage}. Goal: {goal}",
            "steps": steps,
            "execution_code": code.strip()
        }

    def _generate_mock_plan(
        self,
        command: str,
        bot_status: Dict[str, Any],
        available_skills: List[Dict[str, Any]],
        error_msg: str = None
    ) -> Dict[str, Any]:
        """
        Rule-based local fallback for manual commands when API is offline.
        """
        logger.info(f"Generating fallback plan for command: '{command}'")
        cmd_lower = command.lower()
        explanation = f"Offline fallback planner. (Reason: {error_msg or 'Offline Mode'})"
        steps = []
        execution_code = ""

        if "wood" in cmd_lower or "log" in cmd_lower or "tree" in cmd_lower:
            steps = ["Find nearest oak_log", "Navigate to block", "Collect log"]
            execution_code = """
async function execute(bot) {
    bot.chat('Collecting wood logs...');
    await collectWood(bot, 20);
    return true;
}
"""
        elif "pickaxe" in cmd_lower:
            pickaxe_type = "wooden_pickaxe"
            if "stone" in cmd_lower: pickaxe_type = "stone_pickaxe"
            elif "iron" in cmd_lower: pickaxe_type = "iron_pickaxe"
            elif "diamond" in cmd_lower: pickaxe_type = "diamond_pickaxe"
            steps = ["Ensure ingredients", "Craft pickaxe"]
            execution_code = f"""
async function execute(bot) {{
    bot.chat('Crafting {pickaxe_type}...');
    await craftItem(bot, '{pickaxe_type}', 1);
    return true;
}}
"""
        elif "eat" in cmd_lower or "food" in cmd_lower or "hunger" in cmd_lower:
            steps = ["Eat best food from inventory"]
            execution_code = """
async function execute(bot) {
    await eatFood(bot);
    return true;
}
"""
        elif "come" in cmd_lower or "move" in cmd_lower or "follow" in cmd_lower:
            steps = ["Find player", "Navigate to player"]
            execution_code = """
async function execute(bot) {
    const { Movements, goals } = require('mineflayer-pathfinder');
    const player = bot.players && Object.values(bot.players).find(p => p.entity);
    if (!player || !player.entity) {
        bot.chat('No player found nearby.');
        return false;
    }
    const t = player.entity;
    bot.chat(`Navigating to player ${player.username}`);
    const movements = new Movements(bot);
    bot.pathfinder.setMovements(movements);
    bot.pathfinder.setGoal(new goals.GoalNear(t.position.x, t.position.y, t.position.z, 2), true);
    return true;
}
"""
        else:
            steps = ["Analyse surroundings", "Move to random point"]
            execution_code = """
async function execute(bot) {
    const { Movements, goals } = require('mineflayer-pathfinder');
    bot.chat('Offline mode — exploring surroundings!');
    const p = bot.entity.position;
    const tx = p.x + (Math.random() * 20 - 10);
    const tz = p.z + (Math.random() * 20 - 10);
    const movements = new Movements(bot);
    bot.pathfinder.setMovements(movements);
    bot.pathfinder.setGoal(new goals.GoalNear(tx, p.y, tz, 2));
    return true;
}
"""
        return {
            "explanation": explanation,
            "steps": steps,
            "execution_code": execution_code.strip()
        }
