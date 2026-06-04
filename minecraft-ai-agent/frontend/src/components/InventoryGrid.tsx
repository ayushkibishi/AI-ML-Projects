'use client';

import React from 'react';
import { PackageOpen, Compass } from 'lucide-react';

interface InventoryGridProps {
  inventory: Record<string, number>;
}

// Function to map standard item names to cute icons/emojis for rich visualization
const itemEmojiMap: Record<string, string> = {
  oak_log: '🪵',
  birch_log: '🪵',
  spruce_log: '🪵',
  oak_planks: '🧱',
  birch_planks: '🧱',
  spruce_planks: '🧱',
  stick: '🥢',
  crafting_table: '🛠️',
  wooden_pickaxe: '🪵⛏️',
  stone_pickaxe: '🪨⛏️',
  iron_pickaxe: '⚙️⛏️',
  diamond_pickaxe: '💎⛏️',
  cobblestone: '🪨',
  coal: '⬛',
  iron_ore: '🟫',
  iron_ingot: '🪙',
  furnace: '🔥',
  wheat: '🌾',
  apple: '🍎',
  bread: '🍞',
  diamond: '💎',
  dirt: '🟫',
  sand: '🟡',
  rotten_flesh: '🧟',
  beef: '🥩',
  porkchop: '🥩',
  mutton: '🥩',
  sword: '⚔️',
  shield: '🛡️',
  torch: '🕯️'
};

function getItemDisplay(name: string): { emoji: string; category: string } {
  const nameLower = name.toLowerCase();
  
  // Find key in map
  for (const key in itemEmojiMap) {
    if (nameLower.includes(key)) {
      return { emoji: itemEmojiMap[key], category: getCategory(nameLower) };
    }
  }
  
  // Fallbacks
  if (nameLower.includes('pickaxe') || nameLower.includes('axe') || nameLower.includes('shovel')) {
    return { emoji: '⛏️', category: 'tools' };
  }
  if (nameLower.includes('sword') || nameLower.includes('helmet') || nameLower.includes('chestplate')) {
    return { emoji: '⚔️', category: 'combat' };
  }
  if (nameLower.includes('ore') || nameLower.includes('ingot') || nameLower.includes('gem')) {
    return { emoji: '💎', category: 'materials' };
  }
  if (nameLower.includes('log') || nameLower.includes('plank') || nameLower.includes('wood')) {
    return { emoji: '🪵', category: 'blocks' };
  }
  
  return { emoji: '📦', category: 'other' };
}

function getCategory(name: string): string {
  if (name.includes('pickaxe') || name.includes('axe') || name.includes('table') || name.includes('furnace')) return 'tools';
  if (name.includes('sword') || name.includes('shield') || name.includes('bow')) return 'combat';
  if (name.includes('ore') || name.includes('ingot') || name.includes('coal') || name.includes('diamond')) return 'materials';
  if (name.includes('log') || name.includes('planks') || name.includes('dirt') || name.includes('cobble')) return 'blocks';
  if (name.includes('apple') || name.includes('bread') || name.includes('beef') || name.includes('pork') || name.includes('flesh')) return 'food';
  return 'other';
}

export default function InventoryGrid({ inventory }: InventoryGridProps) {
  const items = Object.entries(inventory);
  
  // Filter categories
  const categories = [
    { id: 'all', label: 'All Items' },
    { id: 'blocks', label: 'Blocks' },
    { id: 'tools', label: 'Tools' },
    { id: 'materials', label: 'Materials' },
    { id: 'food', label: 'Food' }
  ];
  
  const [activeTab, setActiveTab] = React.useState('all');
  
  const filteredItems = items.filter(([name]) => {
    if (activeTab === 'all') return true;
    const { category } = getItemDisplay(name);
    return category === activeTab;
  });

  return (
    <div className="glass-panel p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <PackageOpen className="text-mc-neonCyan w-5 h-5" />
          <h2 className="text-lg font-semibold tracking-wider text-slate-100">INVENTORY LOG</h2>
        </div>
        <span className="terminal-font text-xs text-mc-neonCyan bg-mc-neonCyan/10 px-2 py-0.5 rounded border border-mc-neonCyan/20">
          COUNT: {items.reduce((sum, [_, count]) => sum + count, 0)}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-4">
        {categories.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`text-xs px-2.5 py-1 rounded transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-mc-neonCyan/20 text-mc-neonCyan border border-mc-neonCyan/30 font-medium'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid Container */}
      <div className="flex-1 overflow-y-auto max-h-[250px] pr-1">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8 text-slate-500 text-sm">
            <Compass className="w-8 h-8 stroke-1 mb-2 animate-pulse text-slate-600" />
            <span>Inventory is empty.</span>
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
            {filteredItems.map(([name, count]) => {
              const { emoji } = getItemDisplay(name);
              const isRare = name.includes('diamond') || name.includes('iron_pickaxe') || name.includes('furnace');
              
              return (
                <div
                  key={name}
                  className={`group relative flex flex-col items-center justify-center aspect-square rounded-xl border p-2 transition-all duration-300 bg-slate-950/40 hover:bg-slate-900/60 ${
                    isRare 
                      ? 'border-mc-neonBlue/40 shadow-inner shadow-mc-neonBlue/5 hover:border-mc-neonBlue' 
                      : 'border-white/5 hover:border-white/20'
                  }`}
                  title={`${name.replace(/_/g, ' ').toUpperCase()}: ${count}`}
                >
                  {/* Emoji display */}
                  <span className="text-2xl mb-1 group-hover:scale-110 transition-transform duration-200">
                    {emoji}
                  </span>
                  
                  {/* Item counter */}
                  <span className="absolute bottom-1 right-2 text-xs font-bold text-slate-300 bg-black/60 px-1 rounded-md min-w-[16px] text-center border border-white/5 shadow-md">
                    {count}
                  </span>

                  {/* Hover tooltip for exact name */}
                  <div className="pointer-events-none absolute bottom-full mb-2 hidden group-hover:block z-25 bg-slate-950/95 text-slate-200 text-[10px] px-2 py-1 rounded border border-white/10 shadow-lg text-center w-[120px] left-1/2 -translate-x-1/2 break-all">
                    {name.replace(/_/g, ' ')}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
