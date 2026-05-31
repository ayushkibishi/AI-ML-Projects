import React from 'react';
import { ShieldAlert, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function AlertPanel({ alerts, onResolveAlert }) {
  
  const getSeverityStyle = (severity) => {
    switch (severity.toLowerCase()) {
      case 'critical':
      case 'high':
        return 'text-rose-500 bg-rose-950/40 border-rose-500/30';
      case 'medium':
        return 'text-amber-500 bg-amber-950/40 border-amber-500/30';
      default:
        return 'text-yellow-400 bg-yellow-950/40 border-yellow-500/20';
    }
  };

  const activeAlerts = alerts.filter(a => !a.resolved);
  const resolvedAlerts = alerts.filter(a => a.resolved);

  return (
    <div className="glass-panel rounded-xl border border-white/10 overflow-hidden flex flex-col h-full">
      <div className="p-4 bg-black/40 border-b border-white/5 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold tracking-wider font-orbitron uppercase text-cyan-400">
            AI Threat Warning Feeds
          </h3>
          <p className="text-[10px] text-gray-500 font-mono mt-0.5">
            Active Security logs ({activeAlerts.length})
          </p>
        </div>
        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping inline-block" />
      </div>

      {/* Alert items container */}
      <div className="p-4 overflow-y-auto max-h-[380px] space-y-3 flex-grow">
        {activeAlerts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500 font-mono">
            <ShieldCheck className="w-8 h-8 text-emerald-500 mb-2 animate-bounce" />
            <span className="text-xs">No active anomalies detected.</span>
            <p className="text-[9px] text-gray-600 mt-0.5">Office state: secure</p>
          </div>
        ) : (
          activeAlerts.map((alert) => (
            <div 
              key={alert.id}
              className={`p-3 rounded-lg border flex justify-between items-start gap-4 transition duration-200 hover:bg-slate-900/30 ${getSeverityStyle(alert.severity)}`}
            >
              <div className="flex gap-2.5">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 animate-pulse" />
                <div className="font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider">{alert.type}</span>
                    <span className="text-[8px] text-gray-500">{alert.timestamp}</span>
                  </div>
                  <p className="text-[11px] text-gray-300 mt-1 leading-relaxed">
                    {alert.details}
                  </p>
                </div>
              </div>

              <button
                onClick={() => onResolveAlert(alert.id)}
                title="Mark Resolved"
                className="px-2 py-1 bg-slate-950 border border-white/10 hover:border-emerald-500 hover:text-emerald-400 text-gray-400 text-[10px] font-semibold uppercase rounded transition shrink-0"
              >
                Clear
              </button>
            </div>
          ))
        )}

        {/* Resolved log separator */}
        {resolvedAlerts.length > 0 && (
          <div className="pt-4 border-t border-white/5 space-y-2">
            <span className="text-[8px] uppercase tracking-wider text-gray-500 font-bold font-mono">
              Cleared Anomalies Log
            </span>
            
            {resolvedAlerts.slice(0, 3).map((alert) => (
              <div 
                key={alert.id}
                className="p-2 bg-slate-950/40 border border-white/5 text-gray-500 rounded flex items-center justify-between font-mono text-[10px]"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="line-through">{alert.details}</span>
                </div>
                <span className="text-[8px] text-gray-600">{alert.timestamp}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
