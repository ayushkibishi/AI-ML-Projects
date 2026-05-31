'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, ShieldAlert, Monitor, VideoOff, Settings, Eye, Play, Square } from 'lucide-react';

export default function SurveillanceFeed({ settings, setSettings, onActivePeopleChange }) {
  const canvasRef = useRef(null);
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fps, setFps] = useState(0);
  const [occupancy, setOccupancy] = useState(0);
  const [latestAlert, setLatestAlert] = useState(null);
  
  // Local UI stream controls
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const timerRef = useRef(null);

  // Connection settings
  const serverUrl = 'ws://localhost:8000/ws/surveillance';

  // Toggle state
  const handleModuleToggle = (moduleKey) => {
    const updated = { ...settings, [moduleKey]: !settings[moduleKey] };
    setSettings(updated);
    
    // Sync immediately over WebSocket
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(updated));
    }
  };

  // Connect to surveillance WebSocket stream
  const connectStream = () => {
    setErrorMsg('');
    setIsConnected(false);

    if (socketRef.current) {
      socketRef.current.close();
    }

    try {
      const socket = new WebSocket(serverUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
        console.log('[Surveillance WS] Connected to backend feed.');
        // Send current settings
        socket.send(JSON.stringify(settings));
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const frameBase64 = payload.frame;
          const telemetry = payload.telemetry;

          setFps(telemetry.fps);
          setOccupancy(telemetry.occupancy);
          if (onActivePeopleChange) {
            onActivePeopleChange(telemetry.active_people);
          }

          if (telemetry.alerts && telemetry.alerts.length > 0) {
            setLatestAlert(telemetry.alerts[telemetry.alerts.length - 1]);
          }

          // Draw base64 image on canvas
          const img = new Image();
          img.src = frameBase64;
          img.onload = () => {
            const canvas = canvasRef.current;
            if (canvas) {
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            }
          };
        } catch (err) {
          console.error('[Surveillance WS] Error parsing frame payload:', err);
        }
      };

      socket.onerror = (err) => {
        console.error('[Surveillance WS] Socket error:', err);
        setErrorMsg('Streaming service offline. Reconnecting...');
      };

      socket.onclose = () => {
        setIsConnected(false);
        // Retry connection in 3 seconds
        setTimeout(() => {
          if (socketRef.current?.readyState === WebSocket.CLOSED) {
            connectStream();
          }
        }, 3500);
      };

    } catch (e) {
      setErrorMsg('Failed to open socket connection.');
    }
  };

  useEffect(() => {
    connectStream();
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      clearInterval(timerRef.current);
    };
  }, []);

  // Screenshot capture function
  const captureScreenshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `VisionTrack_Capture_${new Date().toISOString()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  // Recording timer simulation
  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      clearInterval(timerRef.current);
      alert(`Recording saved! Total length: ${recordTime}s (Saved in VisionTrack /recordings/)`);
      setRecordTime(0);
    } else {
      setIsRecording(true);
      setRecordTime(0);
      timerRef.current = setInterval(() => {
        setRecordTime((t) => t + 1);
      }, 1000);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
      
      {/* CCTV View Finder Panel */}
      <div className="xl:col-span-3 glass-panel rounded-xl overflow-hidden border border-white/10 flex flex-col relative group">
        {/* Top telemetry bar */}
        <div className="p-3 bg-black/60 border-b border-white/5 flex items-center justify-between font-mono text-xs z-10">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-bold tracking-wider text-cyan-400">
              <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'} inline-block`} />
              CAM-01 [EAST_WING_SECURE]
            </span>
            <span className="text-gray-400">FPS: {fps}</span>
            <span className="text-gray-400">OCCUPANCY: {occupancy}</span>
          </div>
          
          <div className="flex items-center gap-2">
            {isRecording && (
              <span className="text-rose-500 flex items-center gap-1 font-bold animate-pulse mr-2">
                ● REC {Math.floor(recordTime / 60)}:{(recordTime % 60).toString().padStart(2, '0')}
              </span>
            )}
            <button 
              onClick={connectStream} 
              title="Reconnect Feed"
              className="p-1 hover:text-cyan-400 text-gray-400 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Video Canvas Container */}
        <div className="relative flex-grow min-h-[350px] md:min-h-[480px] bg-slate-950 flex items-center justify-center">
          
          {/* Main surveillance canvas */}
          <canvas 
            ref={canvasRef} 
            width={640} 
            height={480} 
            className="w-full h-full max-h-[500px] object-cover" 
          />

          {!isConnected && (
            <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center gap-4 text-center p-6 z-20">
              <VideoOff className="w-12 h-12 text-rose-500 animate-bounce" />
              <div>
                <h4 className="font-semibold text-lg text-white">Surveillance Stream Offline</h4>
                <p className="text-sm text-gray-400 mt-1 max-w-sm">
                  {errorMsg || 'Connecting to FastAPIs WebSocket stream... Make sure the backend server is running.'}
                </p>
              </div>
              <button 
                onClick={connectStream}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-black text-xs font-semibold uppercase tracking-wider rounded transition"
              >
                Retry Link
              </button>
            </div>
          )}
          
          {/* Laser overlay effect when system is active */}
          {isConnected && (
            <div className="absolute inset-0 pointer-events-none border border-cyan-400/20">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-400" />
              
              {/* Laser sweep line overlay */}
              <div className="absolute left-0 right-0 h-[2px] bg-cyan-400/30 scan-laser" />
            </div>
          )}

          {/* Quick Status overlay toast */}
          {latestAlert && !latestAlert.resolved && (
            <div className="absolute bottom-4 left-4 bg-rose-950/90 border border-rose-500 rounded p-2.5 flex items-center gap-2 max-w-xs font-mono text-[10px] text-rose-200 animate-pulse z-10">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <div>
                <span className="font-bold text-rose-400 uppercase">{latestAlert.type}</span>
                <p className="text-gray-300 leading-tight">{latestAlert.details}</p>
              </div>
            </div>
          )}
        </div>

        {/* Dashboard Canvas Controls */}
        <div className="p-3 bg-black/40 border-t border-white/5 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={captureScreenshot}
              disabled={!isConnected}
              className="px-3.5 py-1.5 bg-cyan-950/60 hover:bg-cyan-500 hover:text-black border border-cyan-400/40 text-cyan-400 text-xs font-medium rounded flex items-center gap-1.5 transition disabled:opacity-40 disabled:pointer-events-none"
            >
              <Camera className="w-3.5 h-3.5" /> Snapshot
            </button>
            <button
              onClick={toggleRecording}
              disabled={!isConnected}
              className={`px-3.5 py-1.5 border text-xs font-medium rounded flex items-center gap-1.5 transition disabled:opacity-40 disabled:pointer-events-none ${
                isRecording 
                  ? 'bg-rose-950/80 border-rose-500 text-rose-400 hover:bg-rose-500 hover:text-black' 
                  : 'bg-slate-900 border-white/10 hover:bg-white hover:text-black text-gray-300'
              }`}
            >
              {isRecording ? (
                <>
                  <Square className="w-3 h-3 fill-current" /> Stop REC
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" /> Record Feed
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-3 font-mono text-[10px]">
            <span className="text-gray-500">Camera Source:</span>
            <select className="bg-slate-900 border border-white/10 text-cyan-400 px-2 py-1 rounded text-xs">
              <option value="0">Default Webcam (Live)</option>
              <option value="1">CAM-02 (Secure Lobby - Mock)</option>
              <option value="2">CAM-03 (Server Vault - Mock)</option>
            </select>
          </div>
        </div>
      </div>

      {/* AI Controls & Diagnostics Panel */}
      <div className="glass-panel rounded-xl p-4 border border-white/10 flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-semibold tracking-wider font-orbitron uppercase text-cyan-400 mb-4 flex items-center gap-1.5">
            <Settings className="w-4 h-4" /> AI Module Control
          </h3>
          
          <div className="space-y-4">
            
            {/* YOLO object identifier */}
            <div className="flex flex-col gap-2.5 p-3 rounded-lg bg-slate-950/50 border border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-300">YOLOv8 Detection</span>
                <input 
                  type="checkbox" 
                  checked={settings.yolo_enabled} 
                  onChange={() => handleModuleToggle('yolo_enabled')}
                  className="w-8 h-4 rounded-full bg-slate-800 accent-cyan-400 cursor-pointer"
                />
              </div>
              <p className="text-[10px] text-gray-500 leading-normal">
                Detects people boundaries and electronic devices in real-time.
              </p>
            </div>

            {/* Face verification */}
            <div className="flex flex-col gap-2.5 p-3 rounded-lg bg-slate-950/50 border border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-300">Face Recognition</span>
                <input 
                  type="checkbox" 
                  checked={settings.face_enabled} 
                  onChange={() => handleModuleToggle('face_enabled')}
                  className="w-8 h-4 rounded-full bg-slate-800 accent-cyan-400 cursor-pointer"
                />
              </div>
              <p className="text-[10px] text-gray-500 leading-normal">
                Compares facial embeddings to cross-reference registered employee identity.
              </p>
            </div>

            {/* Skeleton pose tracker */}
            <div className="flex flex-col gap-2.5 p-3 rounded-lg bg-slate-950/50 border border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-300">Pose Estimation</span>
                <input 
                  type="checkbox" 
                  checked={settings.pose_enabled} 
                  onChange={() => handleModuleToggle('pose_enabled')}
                  className="w-8 h-4 rounded-full bg-slate-800 accent-cyan-400 cursor-pointer"
                />
              </div>
              <p className="text-[10px] text-gray-500 leading-normal">
                Maps 33-point MediaPipe body joints to analyze postures.
              </p>
            </div>

            {/* Activity analyzer */}
            <div className="flex flex-col gap-2.5 p-3 rounded-lg bg-slate-950/50 border border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-300">Activity Analytics</span>
                <input 
                  type="checkbox" 
                  checked={settings.activity_enabled} 
                  onChange={() => handleModuleToggle('activity_enabled')}
                  className="w-8 h-4 rounded-full bg-slate-800 accent-cyan-400 cursor-pointer"
                />
              </div>
              <p className="text-[10px] text-gray-500 leading-normal">
                Triggers alarms for sleep, inactivity, phone usage, and group meetings.
              </p>
            </div>
          </div>
        </div>

        {/* Diagnostic sensitivity bar */}
        <div className="mt-6 pt-4 border-t border-white/5">
          <div className="flex justify-between items-center text-xs mb-2">
            <span className="text-gray-400">Alert Sensitivity</span>
            <span className="text-cyan-400 font-mono font-bold">{Math.round(settings.alert_sensitivity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.alert_sensitivity}
            onChange={(e) => setSettings({ ...settings, alert_sensitivity: parseFloat(e.target.value) })}
            className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <div className="flex justify-between text-[8px] text-gray-600 mt-1 uppercase font-mono">
            <span>Relaxed</span>
            <span>Balanced</span>
            <span>Strict</span>
          </div>
        </div>

      </div>
    </div>
  );
}
