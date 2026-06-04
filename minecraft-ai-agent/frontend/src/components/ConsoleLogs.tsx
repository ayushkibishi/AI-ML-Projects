'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Terminal, ShieldAlert, CheckCircle, Search, Trash2 } from 'lucide-react';

interface LogMessage {
  timestamp: string;
  level: string;
  message: string;
}

interface ConsoleLogsProps {
  logs: LogMessage[];
  onClear: () => void;
}

export default function ConsoleLogs({ logs, onClear }: ConsoleLogsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('ALL');

  // Auto-scroll logic
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          log.level.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = filterLevel === 'ALL' || log.level.toUpperCase() === filterLevel;
    return matchesSearch && matchesLevel;
  });

  const getLogLevelStyle = (level: string) => {
    switch (level.toUpperCase()) {
      case 'ERROR':
        return 'text-mc-neonRed bg-mc-neonRed/10 border-mc-neonRed/20';
      case 'WARNING':
        return 'text-mc-gold bg-mc-gold/10 border-mc-gold/20';
      case 'SUCCESS':
        return 'text-mc-neonGreen bg-mc-neonGreen/10 border-mc-neonGreen/20';
      default:
        return 'text-mc-neonCyan bg-mc-neonCyan/10 border-mc-neonCyan/20';
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    } catch {
      return '00:00:00';
    }
  };

  return (
    <div className="glass-panel p-6 flex flex-col h-full">
      {/* Panel Header */}
      <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <Terminal className="text-mc-neonCyan w-5 h-5 animate-pulse" />
          <h2 className="text-lg font-semibold tracking-wider text-slate-100">LOG CONSOLE</h2>
        </div>
        <button
          onClick={onClear}
          className="text-slate-400 hover:text-mc-neonRed transition-colors duration-200 p-1 rounded hover:bg-white/5"
          title="Clear console logs"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Control bar */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950/60 border border-white/5 rounded-lg py-1.5 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-mc-neonCyan/40 focus:ring-1 focus:ring-mc-neonCyan/20"
          />
        </div>
        {/* Level Filter */}
        <div className="flex gap-1">
          {['ALL', 'INFO', 'WARNING', 'ERROR'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilterLevel(lvl)}
              className={`text-[10px] px-2.5 py-1.5 rounded-lg border transition-all duration-200 ${
                filterLevel === lvl
                  ? 'bg-mc-neonCyan/10 text-mc-neonCyan border-mc-neonCyan/30 font-semibold'
                  : 'text-slate-400 bg-slate-950/40 border-white/5 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Terminal view */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto min-h-[220px] max-h-[350px] bg-slate-950/80 rounded-xl p-4 border border-white/5 terminal-font text-xs leading-relaxed scrollbar-thin select-text"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-slate-600 flex items-center justify-center h-full gap-2">
            <CheckCircle className="w-4 h-4 text-slate-700" />
            <span>No console log entries found.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLogs.map((log, idx) => (
              <div key={idx} className="flex items-start gap-2 border-b border-white/[0.01] pb-1 hover:bg-white/[0.01] transition-colors">
                <span className="text-[10px] text-slate-500 select-none shrink-0 pt-0.5">
                  [{formatTime(log.timestamp)}]
                </span>
                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border shrink-0 uppercase select-none ${getLogLevelStyle(log.level)}`}>
                  {log.level}
                </span>
                <span className="text-slate-300 break-words whitespace-pre-wrap flex-1">
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
