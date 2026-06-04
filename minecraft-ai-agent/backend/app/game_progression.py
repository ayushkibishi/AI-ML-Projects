"""
Minecraft Game Progression State Machine.

Determines the current tech-tree stage from bot inventory and returns the
next optimal natural-language goal string to pass to the Gemini planner.

Stage order (lowest → highest):
  WOOD_AGE → STONE_AGE → IRON_AGE → FOOD_SECURE → DIAMOND_AGE →
  GEAR_UP → NETHER_PREP → NETHER → FIND_STRONGHOLD → END_PORTAL →
  KILL_DRAGON → GAME_COMPLETE
"""
from typing import Dict, List, Optional

STAGE_ORDER = [
    "WOOD_AGE",
    "STONE_AGE",
    "IRON_AGE",
    "FOOD_SECURE",
    "DIAMOND_AGE",
    "GEAR_UP",
    "NETHER_PREP",
    "NETHER",
    "FIND_STRONGHOLD",
    "END_PORTAL",
    "KILL_DRAGON",
    "GAME_COMPLETE",
]

STAGE_LABELS = {
    "WOOD_AGE":        "🌲 Wood Age",
    "STONE_AGE":       "⛏️ Stone Age",
    "IRON_AGE":        "🔩 Iron Age",
    "FOOD_SECURE":     "🍖 Food Secured",
    "DIAMOND_AGE":     "💎 Diamond Age",
    "GEAR_UP":         "🛡️ Gearing Up",
    "NETHER_PREP":     "🔥 Nether Prep",
    "NETHER":          "👹 The Nether",
    "FIND_STRONGHOLD": "🏰 Find Stronghold",
    "END_PORTAL":      "🌀 End Portal",
    "KILL_DRAGON":     "🐉 Kill Dragon",
    "GAME_COMPLETE":   "🏆 Game Complete!",
}

# ---------------------------------------------------------------------------
# Inventory helpers
# ---------------------------------------------------------------------------

def _has(inv: dict, item: str, count: int = 1) -> bool:
    return inv.get(item, 0) >= count


def _has_any(inv: dict, items: List[str], count: int = 1) -> bool:
    return any(inv.get(i, 0) >= count for i in items)


def _total_food(inv: dict) -> int:
    food_items = [
        "cooked_beef", "cooked_porkchop", "cooked_chicken", "cooked_mutton",
        "cooked_rabbit", "cooked_salmon", "cooked_cod", "bread",
        "apple", "golden_apple", "carrot", "baked_potato", "mushroom_stew",
        "rabbit_stew",
    ]
    return sum(inv.get(f, 0) for f in food_items)


def _total_logs(inv: dict) -> int:
    log_types = [
        "oak_log", "birch_log", "spruce_log", "jungle_log",
        "acacia_log", "dark_oak_log", "mangrove_log", "cherry_log",
    ]
    return sum(inv.get(l, 0) for l in log_types)


# ---------------------------------------------------------------------------
# Stage detection
# ---------------------------------------------------------------------------

def _compute_stage_from_inventory(inv: dict) -> str:
    """Inspect inventory and return the highest unlocked stage."""

    # END_PORTAL: 12 eyes of ender ready
    if _has(inv, "ender_eye", 12):
        return "END_PORTAL"

    # FIND_STRONGHOLD: 6 blaze rods
    if _has(inv, "blaze_rod", 6):
        return "FIND_STRONGHOLD"

    # NETHER: portal materials ready
    if _has(inv, "obsidian", 10) and _has_any(inv, ["flint_and_steel"]):
        return "NETHER"

    # NETHER_PREP: full diamond combat set
    if (
        _has_any(inv, ["diamond_sword"])
        and _has_any(inv, ["diamond_chestplate"])
        and _has_any(inv, ["diamond_pickaxe"])
    ):
        return "NETHER_PREP"

    # GEAR_UP: raw diamonds in hand (enough to start crafting)
    if _has(inv, "diamond", 8):
        return "GEAR_UP"

    # DIAMOND_AGE: iron pickaxe + enough food
    if _has_any(inv, ["iron_pickaxe"]) and _total_food(inv) >= 16:
        return "DIAMOND_AGE"

    # FOOD_SECURE: iron pickaxe but low food
    if _has_any(inv, ["iron_pickaxe"]):
        return "FOOD_SECURE"

    # IRON_AGE: stone pickaxe
    if _has_any(inv, ["stone_pickaxe"]):
        return "IRON_AGE"

    # STONE_AGE: wooden pickaxe
    if _has_any(inv, ["wooden_pickaxe"]):
        return "STONE_AGE"

    return "WOOD_AGE"


def get_current_stage(inventory: dict, forced_stage: Optional[str] = None) -> str:
    """
    Returns the current game stage.

    forced_stage: stage stored in the autonomous session DB row.
    We never regress more than 2 stages from the session value
    (handles death / item loss gracefully).
    """
    inv = inventory or {}
    computed = _compute_stage_from_inventory(inv)

    if forced_stage is None or forced_stage not in STAGE_ORDER:
        return computed

    forced_idx = STAGE_ORDER.index(forced_stage)
    computed_idx = STAGE_ORDER.index(computed)

    # Allow regression of at most 2 stages (e.g. died and lost some gear)
    floor_idx = max(0, forced_idx - 2)
    return STAGE_ORDER[max(computed_idx, floor_idx)]


# ---------------------------------------------------------------------------
# Goal selection
# ---------------------------------------------------------------------------

def get_next_goal(
    stage: str,
    inventory: dict,
    health: float = 20.0,
    hunger: float = 20.0,
) -> str:
    """
    Returns the best next natural-language command string for the given stage.
    Survival overrides (eating / retreating) always take priority.
    """
    inv = inventory or {}

    # ── Survival overrides ──────────────────────────────────────────────────
    if hunger <= 8 and _total_food(inv) > 0:
        return "eat the best food from your inventory to restore hunger above 16"

    if health <= 6:
        return (
            "stop everything — find shelter, eat all available food, "
            "and wait until health is above 14 before continuing"
        )

    # ── Stage goals ─────────────────────────────────────────────────────────
    if stage == "WOOD_AGE":
        logs = _total_logs(inv)
        has_pickaxe = _has_any(inv, ["wooden_pickaxe"])
        if not has_pickaxe and (logs * 4) >= 12:
            return "craft a crafting table then craft a wooden pickaxe (3 planks + 2 sticks)"
        if logs < 20:
            return f"find trees and collect wood logs until you have 20 total (currently {logs})"
        return "craft a crafting table then craft a wooden pickaxe using 3 planks and 2 sticks"

    if stage == "STONE_AGE":
        cobble = inv.get("cobblestone", 0)
        if not _has_any(inv, ["stone_pickaxe"]):
            if cobble >= 3:
                return "craft a stone pickaxe using 3 cobblestone and 2 sticks at the crafting table"
            return f"mine cobblestone with your wooden pickaxe — need 3, have {cobble}"
        if cobble < 64:
            return f"mine cobblestone until you have 64 total (have {cobble})"
        return "craft a stone axe and stone sword at the crafting table"

    if stage == "IRON_AGE":
        iron_ingots = inv.get("iron_ingot", 0)
        raw_iron = inv.get("raw_iron", 0) + inv.get("iron_ore", 0)
        total_iron = iron_ingots + raw_iron

        if not _has_any(inv, ["stone_pickaxe", "iron_pickaxe"]):
            return "craft a stone pickaxe before mining iron"
        if total_iron < 24:
            return f"mine 24 iron ore underground at Y=40-55 with your stone pickaxe (have {total_iron}/24)"
        if raw_iron > 0 and iron_ingots < 12:
            return "craft a furnace from 8 cobblestone and smelt all raw iron ore using wood as fuel"
        if iron_ingots >= 12:
            return "craft an iron pickaxe (3 ingots + 2 sticks) and iron sword (2 ingots + 1 stick)"
        return "smelt your iron ore into ingots then craft iron tools"

    if stage == "FOOD_SECURE":
        food = _total_food(inv)
        if food < 32:
            return (
                f"find cows or pigs, kill them with your sword, cook the raw meat in a furnace, "
                f"collect 32 cooked food (have {food}/32)"
            )
        return "prepare for diamond mining: craft 32 torches using coal and sticks"

    if stage == "DIAMOND_AGE":
        diamonds = inv.get("diamond", 0)
        coal = inv.get("coal", 0) + inv.get("charcoal", 0)
        torches = inv.get("torch", 0)
        if coal < 16 and torches < 32:
            return "mine 16 coal ore to make torches before going to diamond level"
        if diamonds < 12:
            return (
                f"dig down to Y=12 and mine 12 diamonds with your iron pickaxe. "
                f"Place torches as you go. Watch out for lava! (have {diamonds}/12)"
            )
        return "you have enough diamonds — prepare to craft your full diamond set"

    if stage == "GEAR_UP":
        missing_pieces = []
        if not _has_any(inv, ["diamond_sword"]):
            missing_pieces.append("diamond sword (2 diamonds + 1 stick)")
        if not _has_any(inv, ["diamond_pickaxe"]):
            missing_pieces.append("diamond pickaxe (3 diamonds + 2 sticks)")
        if not _has_any(inv, ["diamond_chestplate"]):
            missing_pieces.append("diamond chestplate (8 diamonds)")
        if not _has_any(inv, ["diamond_helmet"]):
            missing_pieces.append("diamond helmet (5 diamonds)")
        if not _has_any(inv, ["diamond_leggings"]):
            missing_pieces.append("diamond leggings (7 diamonds)")
        if not _has_any(inv, ["diamond_boots"]):
            missing_pieces.append("diamond boots (4 diamonds)")
        if missing_pieces:
            return f"craft at the crafting table: {missing_pieces[0]}"
        return "equip all your diamond armour and tools — you are ready for the Nether!"

    if stage == "NETHER_PREP":
        obsidian = inv.get("obsidian", 0)
        if not _has_any(inv, ["flint_and_steel"]):
            flint = inv.get("flint", 0)
            if flint < 1:
                return "mine gravel to get flint, then craft flint and steel (1 flint + 1 iron ingot)"
            return "craft flint and steel using 1 flint and 1 iron ingot"
        if obsidian < 10:
            return f"mine 10 obsidian with your diamond pickaxe near lava at Y=10-20 (have {obsidian}/10)"
        return (
            "build a nether portal: arrange 10 obsidian in a 4-wide x 5-tall rectangle "
            "then light the inside with flint and steel"
        )

    if stage == "NETHER":
        blaze_rods = inv.get("blaze_rod", 0)
        if blaze_rods < 6:
            return (
                f"explore the Nether to find a Nether Fortress, "
                f"kill Blaze mobs, collect 6 blaze rods (have {blaze_rods}/6)"
            )
        return "you have enough blaze rods — return through the Nether portal to the Overworld"

    if stage == "FIND_STRONGHOLD":
        eyes = inv.get("ender_eye", 0)
        blaze_powder = inv.get("blaze_powder", 0)
        ender_pearls = inv.get("ender_pearl", 0)
        blaze_rods = inv.get("blaze_rod", 0)

        if blaze_rods > 0 and blaze_powder < 12:
            return f"craft blaze powder from blaze rods (1 rod = 2 powder). Have {blaze_rods} rods"
        if ender_pearls < 12:
            return f"hunt Endermen at night to collect 12 ender pearls (have {ender_pearls}/12)"
        if eyes < 12:
            return f"craft {12 - eyes} more eyes of ender (1 ender pearl + 1 blaze powder each)"
        return "throw an eye of ender and follow the direction it travels — it leads to the Stronghold"

    if stage == "END_PORTAL":
        return (
            "find the End Portal room inside the Stronghold, place eyes of ender "
            "in all 12 portal frames, then jump through to The End"
        )

    if stage == "KILL_DRAGON":
        return (
            "destroy all 10 End Crystals on the obsidian pillars using arrows, "
            "then attack the Ender Dragon with your diamond sword when it hovers. VICTORY!"
        )

    return "Congratulations! The Ender Dragon is defeated — Minecraft is complete!"


# ---------------------------------------------------------------------------
# Utility helpers
# ---------------------------------------------------------------------------

def get_stage_index(stage: str) -> int:
    try:
        return STAGE_ORDER.index(stage)
    except ValueError:
        return 0


def get_stage_progress_pct(stage: str) -> float:
    idx = get_stage_index(stage)
    return round((idx / (len(STAGE_ORDER) - 1)) * 100, 1)
