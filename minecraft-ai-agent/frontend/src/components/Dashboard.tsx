'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Heart, Activity, Compass, Code, BrainCircuit, RefreshCw, AlertCircle, Play, Square, Zap } from 'lucide-react';
import ThreeBackground from './ThreeBackground';
import InventoryGrid from './InventoryGrid';
import ConsoleLogs from './ConsoleLogs';
import VoiceController from './VoiceController';
import MemoryMap from './MemoryMap';

const STAGE_ORDER = [
  'WOOD_AGE','STONE_AGE','IRON_AGE','FOOD_SECURE','DIAMOND_AGE',
  'GEAR_UP','NETHER_PREP','NETHER','FIND_STRONGHOLD','END_PORTAL',
  'KILL_DRAGON','GAME_COMPLETE'
];

const STAGE_LABELS: Record<string, string> = {
  WOOD_AGE: '🌲 Wood Age', STONE_AGE: '⛏️ Stone Age', IRON_AGE: '🔩 Iron Age',
  FOOD_SECURE: '🍖 Food Secured', DIAMOND_AGE: '💎 Diamond Age', GEAR_UP: '🛡️ Gearing Up',
  NETHER_PREP: '🔥 Nether Prep', NETHER: '👹 The Nether', FIND_STRONGHOLD: '🏰 Find Stronghold',
  END_PORTAL: '🌀 End Portal', KILL_DRAGON: '🐉 Kill Dragon', GAME_COMPLETE: '🏆 Complete!'
};

interface BotStatus {
  health: number;
  hunger: number;
  position: { x: number; y: number; z: number };
  inventory: Record<string, number>;
  current_goal: string | null;
  current_task: string | null;
}

interface LogMessage { timestamp: string; level: string; message: string; }

interface AutonomousState {
  is_active: boolean;
  current_stage: string;
  stage_label: string;
  goals_completed: number;
  progress_pct: number;
  next_goal?: string;
}

export default function Dashboard() {
  const [status, setStatus] = useState<BotStatus>({
    health: 20, hunger: 20, position: { x: 0, y: 64, z: 0 }, inventory: {}, current_goal: null, current_task: null
  });
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [memories, setMemories] = useState<any[]>([]);
  const [skillsCount, setSkillsCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [apiError, setApiError] = useState(false);
  const [autonomous, setAutonomous] = useState<AutonomousState>({
    is_active: false, current_stage: 'WOOD_AGE', stage_label: '🌲 Wood Age',
    goals_completed: 0, progress_pct: 0
  });
  const [gameComplete, setGameComplete] = useState(false);

  const fetchBaselineData = useCallback(async () => {
    try {
      setApiError(false);
      const [statusRes, logsRes, memoriesRes, skillsRes, autoRes] = await Promise.all([
        fetch('http://localhost:8000/api/status'),
        fetch('http://localhost:8000/api/logs'),
        fetch('http://localhost:8000/api/memory'),
        fetch('http://localhost:8000/api/skills'),
        fetch('http://localhost:8000/api/autonomous/status'),
      ]);
      if (statusRes.ok) setStatus(await statusRes.json());
      if (logsRes.ok) setLogs((await logsRes.json()).reverse());
      if (memoriesRes.ok) setMemories(await memoriesRes.json());
      if (skillsRes.ok) setSkillsCount((await skillsRes.json()).length);
      if (autoRes.ok) {
        const a = await autoRes.json();
        setAutonomous(prev => ({ ...prev, ...a }));
      }
    } catch (err) { setApiError(true); }
  }, []);

  useEffect(() => {
    fetchBaselineData();
    const wsUrl = 'ws://localhost:8000/ws/frontend';
    let socket: WebSocket;
    const connect = () => {
      socket = new WebSocket(wsUrl);
      socket.onopen = () => setWsConnected(true);
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'status_update') {
            const t = payload.data;
            setStatus({ health: t.health, hunger: t.hunger, position: { x: t.x, y: t.y, z: t.z }, inventory: t.inventory, current_goal: t.current_goal, current_task: t.current_task });
          } else if (payload.type === 'log_message') {
            setLogs(prev => [...prev.slice(-199), payload.data]);
          } else if (payload.type === 'skill_registered') {
            setSkillsCount(c => c + 1);
          } else if (payload.type === 'autonomous_update') {
            const d = payload.data;
            setAutonomous({ is_active: true, current_stage: d.stage, stage_label: d.stage_label, goals_completed: d.goals_completed, progress_pct: d.progress_pct, next_goal: d.next_goal });
          } else if (payload.type === 'game_complete') {
            setGameComplete(true);
            setAutonomous(prev => ({ ...prev, is_active: false, current_stage: 'GAME_COMPLETE', stage_label: '🏆 Complete!', progress_pct: 100 }));
          }
        } catch (err) {}
      };
      socket.onclose = () => { setWsConnected(false); setTimeout(connect, 5000); };
      socket.onerror = () => setWsConnected(false);
    };
    connect();
    return () => { if (socket) socket.close(); };
  }, [fetchBaselineData]);

  const handleSendCommand = async (command: string) => {
    setIsProcessing(true);
    setLogs(prev => [...prev, { timestamp: new Date().toISOString(), level: 'INFO', message: `Command: "${command}"` }]);
    try {
      const res = await fetch('http://localhost:8000/api/command', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command })
      });
      if (!res.ok) throw new Error('HTTP error');
    } catch (err: any) {
      setLogs(prev => [...prev, { timestamp: new Date().toISOString(), level: 'ERROR', message: `Command failed: ${err.message}` }]);
    } finally { setIsProcessing(false); }
  };

  const handleStartAutonomous = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch('http://localhost:8000/api/autonomous/start', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setAutonomous(prev => ({ ...prev, is_active: true, current_stage: data.stage, stage_label: data.stage_label, progress_pct: data.progress_pct }));
        setLogs(prev => [...prev, { timestamp: new Date().toISOString(), level: 'INFO', message: `🤖 Autonomous mode started at stage: ${data.stage_label}` }]);
      }
    } catch (err) {} finally { setIsProcessing(false); }
  };

  const handleStopAutonomous = async () => {
    try {
      await fetch('http://localhost:8000/api/autonomous/stop', { method: 'POST' });
      setAutonomous(prev => ({ ...prev, is_active: false }));
      setLogs(prev => [...prev, { timestamp: new Date().toISOString(), level: 'INFO', message: '⏹ Autonomous mode stopped.' }]);
    } catch (err) {}
  };

  const stageIdx = STAGE_ORDER.indexOf(autonomous.current_stage);

  return (
    <div className="min-h-screen relative p-4 md:p-8 flex flex-col justify-between overflow-x-hidden">
      <ThreeBackground />

      {/* Game Complete Banner */}
      {gameComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="text-center p-12 glass-panel border-mc-gold/50 bg-mc-gold/10 max-w-lg">
            <div className="text-7xl mb-4">🏆</div>
            <h1 className="text-4xl font-bold text-mc-gold mb-2">MINECRAFT COMPLETE!</h1>
            <p className="text-slate-300 mb-6">The Ender Dragon has been defeated. The AI conquered Minecraft autonomously!</p>
            <p className="text-mc-neonGreen font-bold terminal-font">{autonomous.goals_completed} GOALS COMPLETED</p>
            <button onClick={() => setGameComplete(false)} className="mt-6 px-6 py-2 bg-mc-gold/20 border border-mc-gold/40 rounded-xl text-mc-gold hover:bg-mc-gold/30 transition-colors">Close</button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-mc-neonBlue/15 rounded-xl border border-mc-neonBlue/30 shadow-[0_0_15px_rgba(59,130,246,0.15)] animate-pulse">
            <BrainCircuit className="w-8 h-8 text-mc-neonBlue" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-widest text-slate-100 uppercase glow-text-blue select-none">Minecraft AI Agent</h1>
            <p className="text-[10px] text-slate-500 tracking-widest uppercase terminal-font mt-0.5">AUTONOMOUS CONTROL DECK • NEURAL DEPLOYMENT</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {apiError && (
            <div className="flex items-center gap-1.5 text-xs text-mc-neonRed bg-mc-neonRed/10 px-3 py-1.5 rounded-xl border border-mc-neonRed/20 animate-pulse">
              <AlertCircle className="w-4 h-4" /><span>SERVER OFFLINE</span>
            </div>
          )}
          <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border ${wsConnected ? 'text-mc-neonGreen bg-mc-neonGreen/10 border-mc-neonGreen/20' : 'text-mc-gold bg-mc-gold/10 border-mc-gold/20 animate-pulse'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-mc-neonGreen animate-pulse' : 'bg-mc-gold'}`} />
            <span className="terminal-font uppercase">{wsConnected ? 'WS LIVE' : 'CONNECTING'}</span>
          </div>
          <button onClick={fetchBaselineData} className="p-1.5 bg-slate-950/60 hover:bg-slate-900 border border-white/5 rounded-xl text-slate-400 hover:text-slate-200 transition-colors"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </header>

      {/* ═══ AUTONOMOUS MODE PANEL ═══ */}
      <section className="glass-panel p-5 mb-6 border-mc-neonPurple/30 bg-mc-neonPurple/5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
          {/* Stage info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-mc-neonPurple" />
              <span className="text-[10px] text-mc-neonPurple uppercase tracking-widest font-bold">AUTONOMOUS MODE</span>
              {autonomous.is_active && (
                <span className="text-[9px] bg-mc-neonGreen/20 text-mc-neonGreen border border-mc-neonGreen/30 px-2 py-0.5 rounded-full animate-pulse">ACTIVE</span>
              )}
            </div>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-lg font-bold text-slate-100">{autonomous.stage_label}</span>
              <span className="text-xs text-slate-500 terminal-font">{autonomous.goals_completed} goals done</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-800/60 rounded-full h-3 overflow-hidden border border-white/5">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${autonomous.progress_pct}%`,
                  background: 'linear-gradient(90deg, #7c3aed, #a78bfa, #c4b5fd)'
                }}
              />
            </div>
            {/* Stage tick marks */}
            <div className="flex justify-between mt-1">
              {STAGE_ORDER.slice(0, -1).map((s, i) => (
                <div key={s} className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
                  i <= stageIdx ? 'bg-mc-neonPurple shadow-[0_0_6px_rgba(167,139,250,0.8)]' : 'bg-slate-700'
                }`} title={STAGE_LABELS[s]} />
              ))}
            </div>

            {/* Next goal preview */}
            {autonomous.next_goal && autonomous.is_active && (
              <p className="text-xs text-slate-400 mt-2 terminal-font truncate">
                <span className="text-mc-neonCyan">NEXT →</span> {autonomous.next_goal}
              </p>
            )}
          </div>

          {/* Control Buttons */}
          <div className="flex gap-3 shrink-0">
            {!autonomous.is_active ? (
              <button
                id="btn-start-autonomous"
                onClick={handleStartAutonomous}
                disabled={isProcessing}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-200 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #16a34a, #22c55e)', boxShadow: '0 0 20px rgba(34,197,94,0.4)' }}
              >
                <Play className="w-4 h-4 fill-white" />
                START AUTONOMOUS
              </button>
            ) : (
              <button
                id="btn-stop-autonomous"
                onClick={handleStopAutonomous}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-200"
                style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)', boxShadow: '0 0 20px rgba(239,68,68,0.4)' }}
              >
                <Square className="w-4 h-4 fill-white" />
                STOP
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Telemetry Bar */}
      <section className="glass-panel p-4 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-mc-neonRed/10 border border-mc-neonRed/20 rounded-xl text-mc-neonRed"><Heart className="w-5 h-5 fill-mc-neonRed/20" /></div>
          <div><span className="text-[10px] text-slate-500 uppercase tracking-widest block font-semibold">VITAL SIGNS</span>
            <div className="flex items-baseline gap-1"><span className="text-xl font-bold terminal-font text-mc-neonRed">{status.health.toFixed(1)}</span><span className="text-[10px] text-slate-500">/ 20</span></div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-mc-gold/10 border border-mc-gold/20 rounded-xl text-mc-gold"><Activity className="w-5 h-5" /></div>
          <div><span className="text-[10px] text-slate-500 uppercase tracking-widest block font-semibold">NUTRITION</span>
            <div className="flex items-baseline gap-1"><span className="text-xl font-bold terminal-font text-mc-gold">{status.hunger}</span><span className="text-[10px] text-slate-500">/ 20</span></div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-mc-neonCyan/10 border border-mc-neonCyan/20 rounded-xl text-mc-neonCyan"><Compass className="w-5 h-5 animate-spin" style={{ animationDuration: '20s' }} /></div>
          <div><span className="text-[10px] text-slate-500 uppercase tracking-widest block font-semibold">SPATIAL INDEX</span>
            <span className="text-sm font-bold terminal-font text-mc-neonCyan truncate block max-w-[120px]">{status.position.x}, {status.position.y}, {status.position.z}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-mc-neonPurple/10 border border-mc-neonPurple/20 rounded-xl text-mc-neonPurple"><Code className="w-5 h-5" /></div>
          <div><span className="text-[10px] text-slate-500 uppercase tracking-widest block font-semibold">SKILL BANK</span>
            <span className="text-xl font-bold terminal-font text-mc-neonPurple">{skillsCount} SKILLS</span>
          </div>
        </div>
      </section>

      {/* Active goal banner */}
      {status.current_goal && (
        <div className="glass-panel p-4 mb-6 border-mc-neonBlue/30 bg-mc-neonBlue/5 relative overflow-hidden flex items-center justify-between flex-col sm:flex-row gap-4">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-mc-neonBlue" />
          <div>
            <span className="text-[10px] text-mc-neonBlue uppercase tracking-widest font-bold">CURRENT GOAL</span>
            <h3 className="text-lg font-bold text-slate-200 uppercase mt-0.5">&quot;{status.current_goal}&quot;</h3>
          </div>
          <div className="bg-slate-950/60 border border-white/5 rounded-xl px-4 py-2 text-right shrink-0">
            <span className="text-[9px] text-slate-500 uppercase block font-semibold">ACTIVE SUBTASK</span>
            <span className="text-xs text-mc-neonCyan terminal-font uppercase font-medium">{status.current_task || 'PROCESSING'}</span>
          </div>
        </div>
      )}

      {/* Main grid */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch mb-6">
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="flex-1"><VoiceController onSendCommand={handleSendCommand} isProcessing={isProcessing} /></div>
          <div className="flex-1"><InventoryGrid inventory={status.inventory} /></div>
        </div>
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="flex-1"><MemoryMap memories={memories} botPos={status.position} /></div>
          <div className="flex-1"><ConsoleLogs logs={logs} onClear={() => setLogs([])} /></div>
        </div>
      </main>

      <footer className="text-center text-[10px] text-slate-600 tracking-wider font-medium select-none border-t border-white/5 pt-3">
        MINECRAFT AI AGENT v2.0 • AUTONOMOUS MODE • FASTAPI + NEXTJS + GEMINI • 2026
      </footer>
    </div>
  );
}
