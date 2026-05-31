import React from 'react';
import { Users, Percent, ShieldAlert, Cpu, Activity, Clock } from 'lucide-react';

export default function DashboardStats({ employees, activeCount, alerts }) {
  const totalEmployees = employees.length || 3;
  const occupancyPercent = totalEmployees > 0 ? Math.round((activeCount / totalEmployees) * 100) : 0;
  
  const unresolvedAlerts = alerts.filter(a => !a.resolved).length;
  
  const stats = [
    {
      title: "Active Headcount",
      value: `${activeCount} / ${totalEmployees}`,
      desc: "Present employees in surveilled space",
      icon: Users,
      color: "text-cyan-400",
      border: "border-cyan-500/20"
    },
    {
      title: "Workspace Density",
      value: `${occupancyPercent}%`,
      desc: "Office floor occupancy percentage",
      icon: Percent,
      color: "text-magenta-400",
      border: "border-pink-500/20"
    },
    {
      title: "Threat Alerts Logged",
      value: unresolvedAlerts,
      desc: "Active security/posture violations",
      icon: ShieldAlert,
      color: unresolvedAlerts > 0 ? "text-rose-500 animate-pulse" : "text-emerald-400",
      border: unresolvedAlerts > 0 ? "border-red-500/30" : "border-emerald-500/20"
    },
    {
      title: "VisionTrack OS Core",
      value: "99.8%",
      desc: "AI Inference telemetry load health",
      icon: Cpu,
      color: "text-emerald-400",
      border: "border-emerald-500/20"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-6">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <div 
            key={i} 
            className={`glass-panel rounded-xl p-4 border ${stat.border} relative flex flex-col justify-between overflow-hidden group hover:scale-[1.02] transition duration-200`}
          >
            {/* Micro background gradient glow */}
            <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-cyan-500/5 rounded-full blur-xl group-hover:bg-cyan-500/10 transition" />
            
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400 font-mono">
                {stat.title}
              </span>
              <Icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            
            <div>
              <h2 className="text-2xl font-orbitron font-extrabold tracking-tight mt-1 mb-1 text-white">
                {stat.value}
              </h2>
              <p className="text-[10px] text-gray-500 leading-snug">
                {stat.desc}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
