'use client';

import React from 'react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, 
  BarChart, Bar, RadialBarChart, RadialBar, Legend, Cell 
} from 'recharts';

export default function ProductivityCharts({ activePeople }) {
  // 1. Mock Timeline Attendance Data
  const attendanceTimelineData = [
    { hour: '09:00 AM', present: 2, limit: 10 },
    { hour: '11:00 AM', present: 4, limit: 10 },
    { hour: '01:00 PM', present: 3, limit: 10 },
    { hour: '03:00 PM', present: 5, limit: 10 },
    { hour: '05:00 PM', present: 4, limit: 10 },
    { hour: '07:00 PM', present: 1, limit: 10 }
  ];

  // 2. Compute Department Density from activePeople list
  const deptCounts = {
    "AI Research": 0,
    "Product Design": 0,
    "Operations": 0
  };

  activePeople.forEach(p => {
    const dept = p.department;
    if (dept in deptCounts) {
      deptCounts[dept]++;
    } else {
      deptCounts[dept] = 1;
    }
  });

  const departmentDensityData = Object.keys(deptCounts).map(dept => ({
    name: dept,
    density: deptCounts[dept],
    capacity: dept === "AI Research" ? 8 : (dept === "Product Design" ? 6 : 5)
  }));

  // 3. Compute Posture Breakdowns from activePeople
  const activityCounts = {
    sitting: 0,
    standing: 0,
    walking: 0,
    sleeping: 0,
    "phone usage": 0
  };

  // Add default active people stats if list is empty for rendering
  if (activePeople.length === 0) {
    activityCounts.sitting = 2;
    activityCounts.standing = 1;
    activityCounts.walking = 1;
    activityCounts.sleeping = 0;
  } else {
    activePeople.forEach(p => {
      const act = p.activity;
      if (act in activityCounts) {
        activityCounts[act]++;
      } else {
        activityCounts[act] = 1;
      }
    });
  }

  const activityColors = {
    sitting: "#06b6d4",       // Cyan
    standing: "#10b981",     // Emerald
    walking: "#8b5cf6",      // Purple
    sleeping: "#ef4444",     // Red
    "phone usage": "#ec4899"  // Magenta
  };

  const postureBreakdownData = Object.keys(activityCounts).map(act => ({
    name: act.toUpperCase(),
    value: activityCounts[act] || 0.1, // small placeholder to draw if zero
    fill: activityColors[act] || "#ffffff"
  }));

  // Custom tooltips
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-950/90 border border-white/10 p-2 text-[10px] font-mono rounded">
          <span className="text-white font-bold">{payload[0].name}</span>
          <p className="text-cyan-400 mt-0.5">Value: {payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* 1. Daily Attendance Area Chart */}
      <div className="glass-panel rounded-xl p-4 border border-white/10 flex flex-col justify-between">
        <div>
          <span className="text-[10px] uppercase font-mono text-gray-500 font-bold tracking-widest block mb-1">
            Analytics Node 01
          </span>
          <h3 className="text-sm font-semibold tracking-wider font-orbitron uppercase text-cyan-400 mb-4">
            Presence Timeline
          </h3>
        </div>
        
        <div className="h-[200px] w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={attendanceTimelineData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPresence" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="hour" stroke="#4b5563" fontSize={8} tickLine={false} />
              <YAxis stroke="#4b5563" fontSize={8} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="present" 
                name="Active Presence"
                stroke="#06b6d4" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorPresence)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Department Density Bar Chart */}
      <div className="glass-panel rounded-xl p-4 border border-white/10 flex flex-col justify-between">
        <div>
          <span className="text-[10px] uppercase font-mono text-gray-500 font-bold tracking-widest block mb-1">
            Analytics Node 02
          </span>
          <h3 className="text-sm font-semibold tracking-wider font-orbitron uppercase text-cyan-400 mb-4">
            Zone Room Density
          </h3>
        </div>
        
        <div className="h-[200px] w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={departmentDensityData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#4b5563" fontSize={8} tickLine={false} />
              <YAxis stroke="#4b5563" fontSize={8} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="density" name="Count" fill="#ec4899" radius={[4, 4, 0, 0]}>
                {departmentDensityData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={index === 0 ? "#06b6d4" : (index === 1 ? "#ec4899" : "#8b5cf6")} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Posture Breakdown Radial Chart */}
      <div className="glass-panel rounded-xl p-4 border border-white/10 flex flex-col justify-between">
        <div>
          <span className="text-[10px] uppercase font-mono text-gray-500 font-bold tracking-widest block mb-1">
            Analytics Node 03
          </span>
          <h3 className="text-sm font-semibold tracking-wider font-orbitron uppercase text-cyan-400 mb-4">
            Posture Distribution
          </h3>
        </div>
        
        <div className="h-[200px] w-full mt-2 relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart 
              cx="50%" 
              cy="50%" 
              innerRadius="20%" 
              outerRadius="90%" 
              barSize={10} 
              data={postureBreakdownData}
            >
              <RadialBar
                minAngle={15}
                background={{ fill: 'rgba(255,255,255,0.03)' }}
                clockWise
                dataKey="value"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                iconSize={5} 
                layout="vertical" 
                verticalAlign="middle" 
                align="right"
                wrapperStyle={{ fontSize: '8px', fontFamily: 'monospace', color: '#9ca3af' }}
              />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
