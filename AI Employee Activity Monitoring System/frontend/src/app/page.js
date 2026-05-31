'use client';

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Video, ShieldAlert, Users, Terminal, LogOut, Lock, 
  User, CheckCircle2, AlertOctagon, Power, HelpCircle, HardDrive, ShieldCheck, Heart 
} from 'lucide-react';
import ThreeCanvas from '../components/ThreeCanvas';
import SurveillanceFeed from '../components/SurveillanceFeed';
import DashboardStats from '../components/DashboardStats';
import ProductivityCharts from '../components/ProductivityCharts';
import EmployeeTable from '../components/EmployeeTable';
import AddEmployeeModal from '../components/AddEmployeeModal';
import AlertPanel from '../components/AlertPanel';
import VoiceAssistant from '../components/VoiceAssistant';
import ReportsPanel from '../components/ReportsPanel';

export default function Home() {
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userRole, setUserRole] = useState('Guest');
  const [userName, setUserName] = useState('');
  const [authError, setAuthError] = useState('');

  // Dashboard state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [employees, setEmployees] = useState([]);
  const [activePeople, setActivePeople] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [timeStr, setTimeStr] = useState('');

  // AI settings
  const [settings, setSettings] = useState({
    yolo_enabled: true,
    face_enabled: true,
    pose_enabled: true,
    activity_enabled: true,
    alert_sensitivity: 0.5,
    active_camera_id: 0
  });

  // Time Tick helper
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setTimeStr(d.toLocaleTimeString() + ' | ' + d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch employees & alerts from FastAPI REST server
  const fetchData = async () => {
    try {
      // Employees
      const empRes = await fetch('http://localhost:8000/api/employees');
      if (empRes.ok) {
        const empData = await empRes.json();
        setEmployees(empData);
      }
      
      // Alerts
      const altRes = await fetch('http://localhost:8000/api/alerts');
      if (altRes.ok) {
        const altData = await altRes.json();
        setAlerts(altData);
      }
    } catch (e) {
      console.warn('API Server offline. Falling back to local data simulations.');
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchData();
      // Periodically refresh list data
      const interval = setInterval(fetchData, 4000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

  // Handle Logins
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Authentication failed.');
      }

      const data = await res.json();
      setIsLoggedIn(true);
      setUserRole(data.role);
      setUserName(data.user.name);
    } catch (err) {
      setAuthError(err.message || 'Connecting error. Make sure FastAPI server is running.');
    }
  };

  // Resolve Alert API trigger
  const handleResolveAlert = async (alertId) => {
    try {
      const res = await fetch(`http://localhost:8000/api/alerts/${alertId}/resolve`, {
        method: 'POST'
      });
      if (res.ok) {
        // Optimistic local state update
        setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, resolved: true } : a));
      }
    } catch (e) {
      // Offline fallback
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, resolved: true } : a));
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setEmail('');
    setPassword('');
    setUserRole('Guest');
  };

  // Login Screen render
  if (!isLoggedIn) {
    return (
      <main className="min-h-screen flex items-center justify-center relative p-4 bg-[#030712] overflow-hidden select-none">
        
        {/* Holographic glowing orb background */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-pink-500/10 blur-[120px] pointer-events-none" />

        <div className="glass-panel border-cyan-500/20 rounded-2xl w-full max-w-md p-8 relative flex flex-col items-center shadow-2xl shadow-cyan-500/5 animate-fadeIn">
          
          {/* Neon Logo icon */}
          <div className="w-16 h-16 rounded-xl bg-slate-900 border border-cyan-500/30 flex items-center justify-center mb-4 relative shadow-lg shadow-cyan-500/10">
            <ShieldAlert className="w-8 h-8 text-cyan-400 animate-pulse" />
            <div className="absolute inset-0 border border-cyan-400 rounded-xl opacity-30 animate-ping" />
          </div>

          <div className="text-center mb-6">
            <h1 className="text-xl font-orbitron font-extrabold tracking-widest text-white uppercase flex items-center gap-1.5 justify-center">
              VisionTrack <span className="text-cyan-400">AI</span>
            </h1>
            <p className="text-[10px] text-gray-500 tracking-wider font-mono mt-1">
              SURVEILLANCE & WORKSPACE INTELLIGENCE OS
            </p>
          </div>

          {authError && (
            <div className="w-full p-3 mb-4 bg-rose-950/70 border border-rose-500/30 text-rose-300 text-[10px] font-mono rounded-lg flex items-center gap-2 leading-relaxed">
              <AlertOctagon className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="w-full space-y-4 font-mono">
            <div>
              <label className="block text-[9px] uppercase text-gray-400 font-bold mb-1.5">
                Authentication Code / Email
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@visiontrack.ai"
                  className="w-full bg-slate-950/60 border border-white/10 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-400 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] uppercase text-gray-400 font-bold mb-1.5">
                Verification Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full bg-slate-950/60 border border-white/10 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-400 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 mt-2 bg-cyan-500 hover:bg-cyan-600 text-black font-orbitron font-extrabold text-xs uppercase tracking-wider rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/20"
            >
              Sign In to System
            </button>
          </form>

          {/* Guest helper credentials hint */}
          <div className="mt-6 pt-4 border-t border-white/5 w-full text-center font-mono text-[9px] text-gray-600">
            <span>DEMO SIGN IN CODE:</span>
            <div className="mt-1 text-cyan-500/60 font-semibold select-text">
              admin@visiontrack.ai / password123
            </div>
          </div>

        </div>
      </main>
    );
  }

  // Dashboard Main Screen layout
  return (
    <main className="min-h-screen flex flex-col md:flex-row relative bg-[#030712] overflow-hidden select-none">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 glass-panel border-r border-white/10 flex flex-col justify-between shrink-0 z-20">
        
        {/* Title Identity */}
        <div>
          <div className="p-5 border-b border-white/5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-900 border border-cyan-500/30 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <h1 className="font-orbitron font-bold text-xs tracking-wider text-white uppercase">
                VisionTrack <span className="text-cyan-400">AI</span>
              </h1>
              <span className="text-[8px] text-gray-500 font-mono tracking-widest block mt-0.5 uppercase">
                WORKSPACE INTEL OS
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5 font-mono text-xs">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full py-2.5 px-3 rounded-lg flex items-center gap-3 font-semibold transition ${
                activeTab === 'dashboard'
                  ? 'bg-cyan-950/40 text-cyan-400 border border-cyan-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" /> Operations Panel
            </button>

            <button
              onClick={() => setActiveTab('surveillance')}
              className={`w-full py-2.5 px-3 rounded-lg flex items-center gap-3 font-semibold transition ${
                activeTab === 'surveillance'
                  ? 'bg-cyan-950/40 text-cyan-400 border border-cyan-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Video className="w-4 h-4" /> Live Surveillance
            </button>

            <button
              onClick={() => setActiveTab('roster')}
              className={`w-full py-2.5 px-3 rounded-lg flex items-center gap-3 font-semibold transition ${
                activeTab === 'roster'
                  ? 'bg-cyan-950/40 text-cyan-400 border border-cyan-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Users className="w-4 h-4" /> Employee Database
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`w-full py-2.5 px-3 rounded-lg flex items-center gap-3 font-semibold transition ${
                activeTab === 'reports'
                  ? 'bg-cyan-950/40 text-cyan-400 border border-cyan-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Terminal className="w-4 h-4" /> Intelligence Reports
            </button>
          </nav>
        </div>

        {/* System Health Diagnostics & User profile footer */}
        <div className="p-4 border-t border-white/5 font-mono text-[9px] text-gray-500 space-y-4">
          <div className="space-y-2">
            <span className="font-bold uppercase tracking-wider text-[8px]">CORE MODULES LOAD</span>
            <div className="flex items-center justify-between">
              <span>FastAPI Link:</span>
              <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                <CheckCircle2 className="w-2.5 h-2.5" /> ONLINE
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Database Sync:</span>
              <span className="text-cyan-400 font-bold flex items-center gap-0.5">
                <CheckCircle2 className="w-2.5 h-2.5" /> FIRESTORE
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-white/5 flex items-center justify-between">
            <div>
              <span className="text-[8px] block uppercase font-bold text-cyan-400">{userName}</span>
              <span className="text-gray-600 block mt-0.5 uppercase tracking-wider">{userRole}</span>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-2 text-gray-500 hover:text-rose-400 hover:bg-rose-950/20 border border-transparent hover:border-rose-500/20 rounded transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

      </aside>

      {/* Main Panel Content Area */}
      <section className="flex-grow flex flex-col min-w-0 max-h-screen overflow-y-auto relative z-10 p-4 lg:p-6">
        
        {/* Top Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-6 border-b border-white/5 font-mono">
          <div>
            <h2 className="text-lg font-orbitron font-extrabold tracking-wider text-white uppercase">
              {activeTab === 'dashboard' && 'Control Room Operations'}
              {activeTab === 'surveillance' && 'AI Surveillance Feeds'}
              {activeTab === 'roster' && 'Registered Employee Database'}
              {activeTab === 'reports' && 'Compiled Workspace Telemetry'}
            </h2>
            <span className="text-[10px] text-gray-500">
              System Core Epoch: {timeStr}
            </span>
          </div>

          {/* Telemetry diagnostics stats */}
          <div className="flex flex-wrap gap-2 text-[10px] uppercase font-bold">
            <span className="px-2.5 py-1 bg-cyan-950/40 text-cyan-400 border border-cyan-500/20 rounded flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5" /> SECURE GRID
            </span>
            <span className="px-2.5 py-1 bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 rounded flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> FIREWALL STATE: ACTIVE
            </span>
          </div>
        </header>

        {/* Tab Routing Renderer */}
        <div className="py-6 flex-grow">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Telemetry Grid */}
              <DashboardStats 
                employees={employees} 
                activeCount={activePeople.length} 
                alerts={alerts} 
              />

              {/* Interactive 3D and Alerts Panel */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                
                {/* 3D Hologram Area */}
                <div className="xl:col-span-2 glass-panel rounded-2xl border border-white/10 p-4 overflow-hidden relative flex flex-col justify-between group">
                  <div>
                    <span className="text-[9px] uppercase font-mono text-cyan-400 font-bold tracking-widest block mb-1">
                      Cyber Model Matrix
                    </span>
                    <h3 className="text-sm font-semibold tracking-wider font-orbitron uppercase text-white">
                      Futuristic Hologram Office Blueprints
                    </h3>
                  </div>
                  
                  <div className="flex-grow flex items-center justify-center min-h-[300px]">
                    <ThreeCanvas />
                  </div>
                  
                  <span className="text-[9px] font-mono text-gray-600 block mt-2">
                    Left: Rotating global grid vertices. Right: Wireframe office layout.
                  </span>
                </div>

                {/* Alarm panel */}
                <div>
                  <AlertPanel alerts={alerts} onResolveAlert={handleResolveAlert} />
                </div>
              </div>

              {/* Recharts Diagrams */}
              <ProductivityCharts activePeople={activePeople} />

              {/* Voice Command panel */}
              <VoiceAssistant 
                settings={settings}
                setSettings={setSettings}
                activePeople={activePeople}
                captureScreenshot={() => {
                  setActiveTab('surveillance');
                  setTimeout(() => {
                    const canvas = document.querySelector('canvas');
                    if (canvas) {
                      const link = document.createElement('a');
                      link.download = `Voice_Capture_${Date.now()}.png`;
                      link.href = canvas.toDataURL();
                      link.click();
                    }
                  }, 1000);
                }}
              />

            </div>
          )}

          {activeTab === 'surveillance' && (
            <div className="space-y-6 animate-fadeIn">
              <SurveillanceFeed 
                settings={settings}
                setSettings={setSettings}
                onActivePeopleChange={setActivePeople}
              />
              
              {/* Sub-panel voice assistant */}
              <VoiceAssistant 
                settings={settings}
                setSettings={setSettings}
                activePeople={activePeople}
                captureScreenshot={() => {
                  const canvas = document.querySelector('canvas');
                  if (canvas) {
                    const link = document.createElement('a');
                    link.download = `CCTV_Capture_${Date.now()}.png`;
                    link.href = canvas.toDataURL();
                    link.click();
                  }
                }}
              />
            </div>
          )}

          {activeTab === 'roster' && (
            <div className="space-y-6 animate-fadeIn">
              <EmployeeTable 
                employees={employees} 
                onOpenRegister={() => setIsRegisterOpen(true)} 
              />
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-6 animate-fadeIn max-w-4xl">
              <ReportsPanel />
            </div>
          )}
        </div>

        {/* Modal Bio-register Popup */}
        <AddEmployeeModal
          isOpen={isRegisterOpen}
          onClose={() => setIsRegisterOpen(false)}
          onRegisterSuccess={fetchData}
        />

        {/* System copyright footer */}
        <footer className="mt-auto pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-gray-600 font-mono text-[9px] gap-2">
          <span>VisionTrack AI Smart Office OS. All security privileges enforced.</span>
          <span className="flex items-center gap-1">
            Engineered with <Heart className="w-3.5 h-3.5 text-rose-500 fill-current" /> by DeepMind Agentic Team
          </span>
        </footer>

      </section>
    </main>
  );
}
