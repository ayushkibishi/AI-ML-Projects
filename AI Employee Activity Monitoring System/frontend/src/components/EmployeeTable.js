import React from 'react';
import { UserCheck, UserMinus, Plus, ShieldCheck } from 'lucide-react';

export default function EmployeeTable({ employees, onOpenRegister }) {
  return (
    <div className="glass-panel rounded-xl border border-white/10 overflow-hidden flex flex-col">
      <div className="p-4 bg-black/40 border-b border-white/5 flex justify-between items-center">
        <div>
          <h3 className="text-sm font-semibold tracking-wider font-orbitron uppercase text-cyan-400">
            Employee Directory & Status
          </h3>
          <p className="text-[10px] text-gray-500 font-mono mt-0.5">
            Synchronized with Firebase Firestore
          </p>
        </div>
        <button
          onClick={onOpenRegister}
          className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-black font-semibold text-xs rounded uppercase tracking-wider flex items-center gap-1.5 transition"
        >
          <Plus className="w-3.5 h-3.5" /> Enroll Staff
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-slate-950/40 text-[10px] uppercase font-mono text-gray-400">
              <th className="p-3 pl-4">Staff Profile</th>
              <th className="p-3">Department</th>
              <th className="p-3">Presence Status</th>
              <th className="p-3">AI Confidence</th>
              <th className="p-3 pr-4">Last Logged Seen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-xs">
            {employees.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-gray-500 font-mono">
                  No registered employee records found. Click 'Enroll Staff' to add profiles.
                </td>
              </tr>
            ) : (
              employees.map((emp) => {
                const isPresent = emp.attendance_status === "Present";
                return (
                  <tr key={emp.id} className="hover:bg-white/5 transition duration-150">
                    <td className="p-3 pl-4 flex items-center gap-3">
                      <div className="relative w-8 h-8 rounded-full bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                        {emp.photo_url ? (
                          <img 
                            src={`http://localhost:8000${emp.photo_url}`} 
                            alt={emp.name}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80"; // fallback avatar
                            }}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px] font-mono text-cyan-400">
                            {emp.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        )}
                        <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-slate-900 ${isPresent ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      </div>
                      <span className="font-semibold text-white font-mono">{emp.name}</span>
                    </td>
                    
                    <td className="p-3 text-gray-400 font-medium">
                      {emp.department}
                    </td>
                    
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono ${
                        isPresent 
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-rose-950/60 text-rose-400 border border-rose-500/20'
                      }`}>
                        {isPresent ? <UserCheck className="w-2.5 h-2.5" /> : <UserMinus className="w-2.5 h-2.5" />}
                        {emp.attendance_status}
                      </span>
                    </td>
                    
                    <td className="p-3 font-mono font-bold text-cyan-400">
                      {isPresent ? `${Math.round(emp.confidence * 100)}%` : '0%'}
                    </td>
                    
                    <td className="p-3 pr-4 text-gray-500 font-mono">
                      {emp.last_seen || 'Never'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
