'use client';

import React, { useState } from 'react';
import { Map, MapPin, Compass } from 'lucide-react';

interface Landmark {
  label: string;
  category: string;
  x: number;
  y: number;
  z: number;
  description: string;
}

interface MemoryMapProps {
  memories: Landmark[];
  botPos: { x: number; y: number; z: number };
}

export default function MemoryMap({ memories, botPos }: MemoryMapProps) {
  const [selectedLandmark, setSelectedLandmark] = useState<Landmark | null>(null);

  // We determine boundaries dynamically to center grid plotting
  const allCoords = [...memories.map(m => ({ x: m.x, z: m.z })), { x: botPos.x, z: botPos.z }];
  const minX = Math.min(...allCoords.map(c => c.x)) - 50;
  const maxX = Math.max(...allCoords.map(c => c.x)) + 50;
  const minZ = Math.min(...allCoords.map(c => c.z)) - 50;
  const maxZ = Math.max(...allCoords.map(c => c.z)) + 50;
  
  const widthRange = maxX - minX || 100;
  const heightRange = maxZ - minZ || 100;

  // Convert game coordinates to percentage coordinates for rendering
  const getPercentageCoords = (x: number, z: number) => {
    const left = ((x - minX) / widthRange) * 100;
    const top = ((z - minZ) / heightRange) * 100;
    return { left: `${left}%`, top: `${top}%` };
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'village':
        return 'bg-mc-gold border-mc-gold';
      case 'mine':
      case 'iron_cave':
        return 'bg-mc-neonPurple border-mc-neonPurple';
      case 'house':
      case 'chest':
        return 'bg-mc-neonGreen border-mc-neonGreen';
      default:
        return 'bg-mc-neonCyan border-mc-neonCyan';
    }
  };

  return (
    <div className="glass-panel p-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <Map className="text-mc-neonCyan w-5 h-5" />
          <h2 className="text-lg font-semibold tracking-wider text-slate-100">MEMORY LANDMARKS</h2>
        </div>
        <span className="terminal-font text-xs text-mc-neonCyan">
          MAP POS: {botPos.x}, {botPos.z}
        </span>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 h-[350px]">
        {/* Map Radar Grid Box */}
        <div className="flex-1 bg-slate-950/80 rounded-xl relative border border-white/5 overflow-hidden flex items-center justify-center p-4">
          {/* Subtle grid pattern background */}
          <div className="absolute inset-0 bg-grid-pattern opacity-30 bg-[size:20px_20px]" />
          
          {/* Radar circular lines */}
          <div className="absolute w-[280px] h-[280px] border border-white/[0.02] rounded-full" />
          <div className="absolute w-[180px] h-[180px] border border-white/[0.03] rounded-full animate-pulse" />
          <div className="absolute w-[80px] h-[80px] border border-white/[0.04] rounded-full" />
          
          {/* Axis indicators */}
          <div className="absolute w-full h-[1px] bg-white/[0.02]" />
          <div className="absolute h-full w-[1px] bg-white/[0.02]" />

          {/* Plotting points */}
          <div className="absolute inset-4">
            {/* Plot memories */}
            {memories.map((mem, idx) => {
              const style = getPercentageCoords(mem.x, mem.z);
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedLandmark(mem)}
                  className={`absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full border-2 transition-transform duration-200 hover:scale-125 z-10 cursor-pointer ${getCategoryColor(
                    mem.category
                  )}`}
                  style={{ left: style.left, top: style.top }}
                  title={`${mem.label} (${mem.x}, ${mem.z})`}
                />
              );
            })}

            {/* Plot Bot (with pulsing cyan glow) */}
            {(() => {
              const style = getPercentageCoords(botPos.x, botPos.z);
              return (
                <div
                  className="absolute w-4 h-4 -ml-2 -mt-2 bg-mc-neonBlue border-2 border-white rounded-full z-20 shadow-[0_0_10px_rgba(59,130,246,0.8)]"
                  style={{ left: style.left, top: style.top }}
                  title={`BOT POSITION: ${botPos.x}, ${botPos.y}, ${botPos.z}`}
                >
                  <span className="absolute inset-0 rounded-full bg-mc-neonBlue/40 animate-ping" />
                </div>
              );
            })()}
          </div>

          <div className="absolute bottom-2 left-3 text-[10px] text-slate-500 terminal-font uppercase">
            Radar Scale: Dynamic Grid
          </div>
        </div>

        {/* Landmarks Details Panel */}
        <div className="w-full lg:w-[220px] flex flex-col justify-between overflow-y-auto max-h-[350px] pr-1">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-2 font-semibold">LANDMARKS LIST:</span>
            {memories.length === 0 ? (
              <div className="text-slate-600 text-xs py-4 flex items-center gap-2">
                <Compass className="w-4 h-4" />
                <span>No landmarks mapped.</span>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
                {memories.map((mem, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedLandmark(mem)}
                    className={`w-full text-left p-2 rounded-lg border text-xs transition-all duration-200 ${
                      selectedLandmark?.label === mem.label
                        ? 'bg-mc-neonCyan/10 border-mc-neonCyan/30 text-slate-200'
                        : 'bg-slate-950/40 border-white/5 text-slate-400 hover:bg-slate-950/60 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold truncate">
                      <span className={`w-1.5 h-1.5 rounded-full ${getCategoryColor(mem.category)}`} />
                      {mem.label}
                    </div>
                    <div className="text-[10px] text-slate-500 terminal-font mt-0.5">
                      X:{mem.x} Y:{mem.y} Z:{mem.z}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Detailed summary */}
          {selectedLandmark && (
            <div className="mt-4 p-3 bg-slate-950/90 rounded-lg border border-white/5 text-xs text-slate-400">
              <div className="font-semibold text-slate-200 flex items-center gap-1 mb-1">
                <MapPin className="w-3.5 h-3.5 text-mc-neonCyan" />
                {selectedLandmark.label}
              </div>
              <p className="text-[11px] leading-relaxed mb-2 text-slate-400">{selectedLandmark.description}</p>
              <div className="text-[9px] text-slate-500 terminal-font">
                CAT: {selectedLandmark.category.toUpperCase()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
