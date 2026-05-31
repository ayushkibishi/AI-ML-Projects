'use client';

import React, { useState } from 'react';
import { FileText, Download, RefreshCw, Terminal, Check } from 'lucide-react';

export default function ReportsPanel() {
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/reports/generate');
      if (!res.ok) throw new Error('Failed to retrieve intelligence report.');
      const data = await res.json();
      setReport(data.report);
    } catch (err) {
      console.error(err);
      setReport('Failed to fetch AI Intelligence report from FastAPI server. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchReport();
  }, []);

  const downloadReport = () => {
    if (!report) return;
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `VisionTrack_Intelligence_Report_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
  };

  const copyToClipboard = () => {
    if (!report) return;
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-panel rounded-xl border border-white/10 overflow-hidden flex flex-col h-full">
      <div className="p-4 bg-black/40 border-b border-white/5 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold tracking-wider font-orbitron uppercase text-cyan-400">
            Workspace Intelligence Reports
          </h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchReport}
            disabled={loading}
            className="p-1 hover:text-cyan-400 text-gray-400 transition disabled:opacity-40"
            title="Refresh Report"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="p-4 flex-grow flex flex-col">
        {loading ? (
          <div className="flex-grow flex flex-col items-center justify-center p-8 text-gray-500 font-mono text-xs gap-2">
            <span className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            Analyzing office logs & compiling metrics...
          </div>
        ) : (
          <div className="flex-grow flex flex-col justify-between gap-4">
            <pre className="p-4 bg-slate-950 border border-white/5 text-[10px] text-gray-300 font-mono rounded-lg overflow-auto leading-relaxed max-h-[300px] flex-grow select-text whitespace-pre-wrap">
              {report || 'Generating reports...'}
            </pre>

            <div className="flex gap-2">
              <button
                onClick={downloadReport}
                disabled={!report || report.startsWith('Failed')}
                className="flex-grow py-2 bg-cyan-500 hover:bg-cyan-600 border border-cyan-400/40 text-black font-semibold text-xs font-mono uppercase tracking-wider rounded transition flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none"
              >
                <Download className="w-3.5 h-3.5" /> Export Report (.txt)
              </button>
              <button
                onClick={copyToClipboard}
                disabled={!report}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-white/10 text-white font-semibold text-xs font-mono uppercase tracking-wider rounded transition flex items-center justify-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <FileText className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
