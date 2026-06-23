'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, CaretLeft, CaretRight, SpeakerHigh, SpeakerX, ChartLineUp, Student, Lightning } from '@phosphor-icons/react';

interface TutorPanelProps {
  gameType: string;
  solutionData: any; // API response containing solution path, explanations, voice_url, etc.
  difficultyLevel: string;
  onChangeDifficulty: (level: string) => void;
  onPlayStep: (stepIndex: number) => void; // callback when replaying steps
}

export default function TutorPanel({
  gameType,
  solutionData,
  difficultyLevel,
  onChangeDifficulty,
  onPlayStep,
}: TutorPanelProps) {
  const normalizedGame = gameType.toLowerCase().replace(/-/g, '').replace(/\s/g, '');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1500); // ms per step
  const [audioEnabled, setAudioEnabled] = useState(true);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);

  const steps = solutionData?.steps || [];
  const numSteps = steps.length || 0;

  // Clean play timer on unmount
  useEffect(() => {
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, []);

  // Update current step or play speech when solution changes
  useEffect(() => {
    setCurrentStep(0);
    setIsPlaying(false);
    if (solutionData?.voice_url && audioEnabled) {
      playAudio(solutionData.voice_url);
    }
  }, [solutionData]);

  // Handle Autoplay Loop
  useEffect(() => {
    if (isPlaying && numSteps > 0) {
      playTimerRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          const next = prev + 1;
          if (next >= numSteps) {
            setIsPlaying(false);
            if (playTimerRef.current) clearInterval(playTimerRef.current);
            return prev;
          }
          onPlayStep(next);
          return next;
        });
      }, playbackSpeed);
    } else {
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
        playTimerRef.current = null;
      }
    }

    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, numSteps, playbackSpeed]);

  const playAudio = (url: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const fullUrl = url.startsWith('http') ? url : `http://localhost:8000${url}`;
    audioRef.current = new Audio(fullUrl);
    audioRef.current.play().catch(err => console.log("Audio playback failed: ", err));
  };

  const handleTogglePlay = () => {
    if (numSteps === 0) return;
    setIsPlaying(!isPlaying);
  };

  const handleStepNext = () => {
    if (currentStep < numSteps - 1) {
      const next = currentStep + 1;
      setCurrentStep(next);
      onPlayStep(next);
    }
  };

  const handleStepPrev = () => {
    if (currentStep > 0) {
      const prev = currentStep - 1;
      setCurrentStep(prev);
      onPlayStep(prev);
    }
  };

  const handleLevelChange = (level: string) => {
    onChangeDifficulty(level);
  };

  const getActiveExplanation = () => {
    if (numSteps > 0 && steps[currentStep]?.explanations) {
      return steps[currentStep].explanations[difficultyLevel] || '';
    }
    return solutionData?.explanations?.[difficultyLevel] || 'No explanation available.';
  };

  // Compute chess/checkers game analytics
  const score = solutionData?.score || 0;
  const evaluation = solutionData?.evaluation || 'Even';
  
  // Custom mock analytics for visual completeness
  const getAnalytics = () => {
    const absScore = Math.abs(score);
    let accuracy = 85;
    let blunders = 0;
    let mistakes = 1;
    
    if (evaluation.includes('-') || score < -200) {
      accuracy = 62;
      blunders = 1;
      mistakes = 2;
    } else if (score > 300) {
      accuracy = 96;
      blunders = 0;
      mistakes = 0;
    }
    
    return { accuracy, blunders, mistakes };
  };

  const analytics = getAnalytics();

  return (
    <div className="flex flex-col gap-4 bg-card/60 backdrop-blur-md p-5 rounded-2xl border border-border/80 shadow-xl w-full">
      {/* HEADER WITH DIFFICULTY LEVEL */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <Student size={20} className="text-accent" />
          <h2 className="font-semibold text-slate-100">AI Tutor Mode</h2>
        </div>
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-border/40">
          {['beginner', 'intermediate', 'advanced'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => handleLevelChange(lvl)}
              className={`px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold rounded-md transition ${difficultyLevel === lvl ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-white'}`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* STEP NAVIGATION CONTROLS */}
      {numSteps > 0 && (
        <div className="flex flex-col gap-2 bg-slate-950/40 p-3 rounded-xl border border-border/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">
              Step {currentStep + 1} of {numSteps}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleStepPrev}
                disabled={currentStep === 0}
                className="p-1 rounded bg-card border border-border/40 text-slate-200 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-card transition"
              >
                <CaretLeft size={16} />
              </button>
              <button
                onClick={handleTogglePlay}
                className="px-3 py-1 text-xs rounded-full bg-primary hover:bg-primary-hover text-white flex items-center gap-1 font-bold shadow-md transition"
              >
                {isPlaying ? (
                  <>
                    <Pause size={12} weight="fill" /> Pause
                  </>
                ) : (
                  <>
                    <Play size={12} weight="fill" /> Auto Play
                  </>
                )}
              </button>
              <button
                onClick={handleStepNext}
                disabled={currentStep === numSteps - 1}
                className="p-1 rounded bg-card border border-border/40 text-slate-200 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-card transition"
              >
                <CaretRight size={16} />
              </button>
            </div>
          </div>

          {/* Autoplay Speed Control */}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-muted whitespace-nowrap">Play Speed:</span>
            <input
              type="range"
              min="800"
              max="3000"
              step="200"
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-accent"
            />
            <span className="text-[9px] font-mono text-muted">{(playbackSpeed/1000).toFixed(1)}s</span>
          </div>
        </div>
      )}

      {/* EXPLANATION AREA */}
      <div className="bg-slate-950 p-4 rounded-xl border border-border/40 min-h-[100px] flex flex-col justify-between gap-3 shadow-inner relative overflow-hidden">
        {/* Decorative corner glow */}
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/10 rounded-full blur-xl pointer-events-none" />

        <div className="flex flex-col gap-1.5">
          <span className="text-[9px] uppercase tracking-widest font-bold text-accent flex items-center gap-1">
            <Lightning size={10} weight="fill" /> Explanation
          </span>
          <p className="text-sm text-slate-200 leading-relaxed font-sans">
            {getActiveExplanation()}
          </p>
        </div>

        {/* Audio Speaker buttons */}
        <div className="flex justify-between items-center mt-2 border-t border-border/20 pt-2">
          <span className="text-[10px] text-muted">
            Evaluation: <strong className="text-slate-100 font-mono">{evaluation}</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setAudioEnabled(!audioEnabled);
                if (audioEnabled && audioRef.current) audioRef.current.pause();
              }}
              className={`p-1.5 rounded-full border transition-colors ${audioEnabled ? 'bg-primary/20 text-primary border-primary/30' : 'bg-slate-800 text-muted border-border/30'}`}
              title={audioEnabled ? "Voice output enabled" : "Voice output muted"}
            >
              {audioEnabled ? <SpeakerHigh size={14} /> : <SpeakerX size={14} />}
            </button>
            {solutionData?.voice_url && (
              <button
                onClick={() => playAudio(solutionData.voice_url)}
                className="text-[10px] text-accent hover:text-amber-400 font-semibold flex items-center gap-1 transition"
              >
                Replay Audio
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SOLUTION STEP TIMELINE */}
      {numSteps > 0 && (
        <div className="flex flex-col gap-2 bg-slate-950/20 p-3 rounded-xl border border-border/20">
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Step-by-Step Path</span>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            {steps.map((s: any, idx: number) => {
              const isActive = currentStep === idx;
              // Format move labels based on properties
              const moveLabel = typeof s.move === 'string' ? s.move : s.tile ? `Tile ${s.tile} ${s.direction}` : s.direction || `Step ${idx+1}`;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    setCurrentStep(idx);
                    onPlayStep(idx);
                  }}
                  className={`flex-shrink-0 px-3.5 py-2 rounded-xl border text-left transition duration-150 flex flex-col gap-0.5 min-w-[100px] cursor-pointer
                    ${isActive 
                      ? 'bg-accent/15 border-accent text-white shadow-md shadow-accent/5' 
                      : 'bg-slate-950/40 border-border/30 text-muted hover:text-slate-100 hover:border-border'}
                  `}
                >
                  <span className={`text-[9px] font-bold uppercase ${isActive ? 'text-accent' : 'text-slate-400'}`}>
                    Step {idx + 1}
                  </span>
                  <span className="text-xs font-extrabold font-mono truncate max-w-[120px]">
                    {moveLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* TACTICAL & STRATEGIC INSIGHTS */}
      <div className="grid grid-cols-2 gap-3 mt-1">
        <div className="bg-slate-950/30 border border-border/30 p-3 rounded-xl flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-400">Tactical Intent</span>
          <p className="text-xs text-muted leading-snug">
            {solutionData?.tactical_intent || "Neutralizes immediate board threats and prepares localized coordination vectors."}
          </p>
        </div>
        <div className="bg-slate-950/30 border border-border/30 p-3 rounded-xl flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-400">Strategic Outlook</span>
          <p className="text-xs text-muted leading-snug">
            {solutionData?.strategic_outlook || "Improves overall spatial control while securing long-term grid piece stability."}
          </p>
        </div>
      </div>

      {/* ANALYTICS SECTION (For Chess/Checkers/Connect4/Reversi) */}
      {['chess', 'checkers', 'connect4', 'reversi', 'othello'].includes(normalizedGame) && (
        <div className="mt-2 border-t border-border/40 pt-4">
          <div className="flex items-center gap-1.5 mb-2">
            <ChartLineUp size={16} className="text-slate-300" />
            <span className="text-xs font-bold text-slate-300">Position Performance</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-950/50 p-2 rounded-lg border border-border/20">
              <p className="text-[9px] uppercase tracking-wider text-muted">Accuracy</p>
              <p className="text-base font-extrabold text-emerald-400">{analytics.accuracy}%</p>
            </div>
            <div className="bg-slate-950/50 p-2 rounded-lg border border-border/20">
              <p className="text-[9px] uppercase tracking-wider text-muted">Mistakes</p>
              <p className="text-base font-extrabold text-amber-500">{analytics.mistakes}</p>
            </div>
            <div className="bg-slate-950/50 p-2 rounded-lg border border-border/20">
              <p className="text-[9px] uppercase tracking-wider text-muted">Blunders</p>
              <p className="text-base font-extrabold text-red-500">{analytics.blunders}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
