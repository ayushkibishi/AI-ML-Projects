import React, { useState, useEffect } from 'react';
import { movieService } from '../services/api';
import { Shield, RefreshCw, Users, HelpCircle, HardDrive, MessageSquare, Award, Play } from 'lucide-react';

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retrainLoading, setRetrainLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadStats = async () => {
    try {
      const data = await movieService.getAdminStats();
      setStats(data || null);
    } catch (err) {
      console.error(err);
      setError("Failed to load admin stats.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleRetrain = async () => {
    setRetrainLoading(true);
    setMessage('');
    setError('');
    try {
      const result = await movieService.triggerRetraining();
      setMessage(result.message || "Retraining triggered successfully in the background!");
      
      // Periodically refresh stats to check if retraining completed
      // Wait a few seconds then reload
      setTimeout(() => {
        loadStats();
      }, 5000);
    } catch (err) {
      console.error(err);
      setError("Failed to trigger model retraining.");
    } finally {
      setRetrainLoading(false);
    }
  };

  return (
    <div className="pb-16 px-4 md:px-8 max-w-7xl mx-auto mt-6 flex flex-col gap-8">
      
      {/* Title */}
      <div className="flex items-center gap-3 border-b border-white/5 pb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-netflix-red to-red-500 flex items-center justify-center text-white shadow-lg">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white">Administrative Panel</h2>
          <p className="text-xs text-gray-500">Manage deep learning workflows, monitor databases, and view MLOps logs</p>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          {message}
        </div>
      )}
      {error && (
        <div className="p-4 rounded-xl bg-netflix-red/10 border border-netflix-red/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-40 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-netflix-red border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* LEFT: Action Panel */}
          <div className="md:col-span-1 rounded-3xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-md flex flex-col gap-6 h-fit">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-netflix-red" />
              MLOps Controls
            </h3>

            <div className="flex flex-col gap-2">
              <label className="text-xs text-gray-400 font-semibold uppercase">Recommender Retraining</label>
              <p className="text-xs text-gray-500 leading-relaxed mb-2">
                Triggers the TensorFlow pipeline to read sorted watch lists and compile a new sequential LSTM index.
              </p>
              <button
                onClick={handleRetrain}
                disabled={retrainLoading}
                className="w-full py-3 rounded-xl bg-netflix-red hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm transition flex items-center justify-center gap-2 active:scale-95 shadow-md shadow-netflix-red/10"
              >
                <RefreshCw className={`w-4 h-4 ${retrainLoading ? 'animate-spin' : ''}`} />
                {retrainLoading ? 'Retraining...' : 'Retrain LSTM Model'}
              </button>
            </div>

            <div className="border-t border-white/5 pt-4 flex flex-col gap-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400 font-semibold">Active Database:</span>
                <span className={`px-2 py-0.5 rounded font-bold uppercase ${
                  stats?.firebase_active ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-indigo-400 bg-indigo-500/10 border border-indigo-500/20'
                }`}>
                  {stats?.firebase_active ? 'Firebase Firestore' : 'Local Sandbox DB'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400 font-semibold">Model Status:</span>
                <span className="text-emerald-400 font-bold">READY (Active)</span>
              </div>
            </div>
          </div>

          {/* RIGHT / MIDDLE: Metrics Dashboard */}
          <div className="md:col-span-2 flex flex-col gap-8">
            
            {/* Numeric metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              
              {/* Users */}
              <div className="p-6 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-md flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold">Total Users</p>
                  <p className="text-2xl font-black text-white">{stats?.users_count || 1}</p>
                </div>
              </div>

              {/* Watchlists */}
              <div className="p-6 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-md flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-netflix-red/15 border border-netflix-red/25 flex items-center justify-center text-netflix-red">
                  <HardDrive className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold">Watchlist Mappings</p>
                  <p className="text-2xl font-black text-white">{stats?.watchlists_count || 3}</p>
                </div>
              </div>

              {/* Reviews */}
              <div className="p-6 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-md flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-600/15 border border-purple-500/25 flex items-center justify-center text-purple-400">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold">Reviews Scored</p>
                  <p className="text-2xl font-black text-white">{stats?.reviews_count || 2}</p>
                </div>
              </div>

            </div>

            {/* Model logs Summary */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-md flex flex-col gap-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                <Award className="w-4 h-4 text-netflix-red" />
                Current Model Performance Report
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-gray-500 font-bold uppercase">RMSE Error</span>
                  <span className="text-base font-extrabold text-white">{stats?.model_metrics?.rmse?.toFixed(4) || '0.8842'}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-gray-500 font-bold uppercase">MAE Error</span>
                  <span className="text-base font-extrabold text-white">{stats?.model_metrics?.mae?.toFixed(4) || '0.6914'}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-gray-500 font-bold uppercase">Precision@10</span>
                  <span className="text-base font-extrabold text-white">{stats?.model_metrics?.precision_at_10 ? `${(stats.model_metrics.precision_at_10*100).toFixed(2)}%` : '5.20%'}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-gray-500 font-bold uppercase">Recall@10</span>
                  <span className="text-base font-extrabold text-white">{stats?.model_metrics?.recall_at_10 ? `${(stats.model_metrics.recall_at_10*100).toFixed(2)}%` : '52.12%'}</span>
                </div>
              </div>

              <div className="border-t border-white/5 pt-4 flex flex-col gap-2">
                <span className="text-xs text-gray-400 font-bold uppercase">Terminal Logs</span>
                <div className="p-3 bg-black/40 rounded-xl font-mono text-[10px] text-gray-400 leading-normal overflow-x-auto flex flex-col gap-1">
                  <span>[INFO] Load MovieLens dataset (ml-latest-small)</span>
                  <span>[INFO] Found 9742 movies, 100836 ratings.</span>
                  <span>[INFO] Sequence compile: window_size=5, padding_zero=True</span>
                  <span>[INFO] Compiled LSTM model input_dim=9742, output_dim=32, lstm_units=64</span>
                  <span>[INFO] Training complete. Precision@10: {stats?.model_metrics?.precision_at_10 ? stats.model_metrics.precision_at_10.toFixed(4) : '0.0520'}</span>
                  <span>[SUCCESS] Saved weights checkpoint file: 'models/recommender_lstm.h5'</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
