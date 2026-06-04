'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, HelpCircle, Volume2 } from 'lucide-react';

interface VoiceControllerProps {
  onSendCommand: (command: string) => Promise<void>;
  isProcessing: boolean;
}

export default function VoiceController({ onSendCommand, isProcessing }: VoiceControllerProps) {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [speakOutput, setSpeakOutput] = useState(true);

  // Initialize SpeechRecognition on mount if supported
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = 'en-US';

        rec.onstart = () => {
          setIsListening(true);
        };

        rec.onresult = (event: any) => {
          const resultText = event.results[0][0].transcript;
          setInputText(resultText);
          setIsListening(false);
        };

        rec.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        rec.onend = () => {
          setIsListening(false);
        };

        setRecognition(rec);
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognition) {
      alert('Speech recognition is not supported in this browser. Please try typing your command.');
      return;
    }

    if (isListening) {
      recognition.stop();
    } else {
      setInputText('');
      recognition.start();
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isProcessing) return;

    const cmd = inputText.trim();
    setInputText('');
    
    // Send command
    await onSendCommand(cmd);

    // If text to speech is active, we can call backend to synth voice response
    if (speakOutput) {
      speakBack(`Planning action for: ${cmd}`);
    }
  };

  const speakBack = async (text: string) => {
    try {
      const response = await fetch('http://localhost:8000/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
      }
    } catch (err) {
      console.warn('TTS playback error:', err);
    }
  };

  const suggestedCommands = [
    "Find wood logs",
    "Craft a stone pickaxe",
    "Navigate to coordinate 150 80",
    "Defeat nearby zombies"
  ];

  return (
    <div className="glass-panel p-6 flex flex-col h-full justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <Mic className="text-mc-neonCyan w-5 h-5" />
            <h2 className="text-lg font-semibold tracking-wider text-slate-100">COMMAND MATRIX</h2>
          </div>
          {/* TTS Audio toggle */}
          <button
            onClick={() => setSpeakOutput(!speakOutput)}
            className={`p-1 rounded transition-colors ${
              speakOutput ? 'text-mc-neonBlue bg-mc-neonBlue/15' : 'text-slate-500 hover:text-slate-400'
            }`}
            title={speakOutput ? "TTS synthesis active" : "TTS muted"}
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic Voice Waves visualizer */}
        {isListening && (
          <div className="flex items-center justify-center gap-1.5 h-16 bg-slate-950/60 rounded-xl border border-mc-neonCyan/30 mb-4 animate-pulse">
            <span className="w-1.5 h-6 bg-mc-neonCyan rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
            <span className="w-1.5 h-10 bg-mc-neonCyan rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            <span className="w-1.5 h-8 bg-mc-neonCyan rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
            <span className="w-1.5 h-12 bg-mc-neonCyan rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
            <span className="w-1.5 h-6 bg-mc-neonCyan rounded-full animate-bounce" style={{ animationDelay: '0.5s' }} />
            <span className="text-xs text-mc-neonCyan tracking-wider font-semibold uppercase terminal-font ml-2">Listening...</span>
          </div>
        )}

        {/* Suggestion tags */}
        <div className="mb-4">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-2 font-semibold">SUGGESTIONS:</span>
          <div className="flex flex-wrap gap-1.5">
            {suggestedCommands.map((cmd) => (
              <button
                key={cmd}
                onClick={() => setInputText(cmd)}
                className="text-[10px] bg-white/[0.02] border border-white/5 hover:border-mc-neonCyan/30 text-slate-400 hover:text-slate-200 px-2 py-1 rounded-lg transition-all duration-200"
              >
                "{cmd}"
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Input / Control Forms */}
      <form onSubmit={handleSend} className="relative mt-2">
        <div className="flex gap-2">
          {/* Audio toggle button */}
          <button
            type="button"
            onClick={toggleListening}
            className={`flex items-center justify-center p-3 rounded-xl border transition-all duration-300 shrink-0 ${
              isListening
                ? 'bg-mc-neonRed/10 border-mc-neonRed/40 text-mc-neonRed glow-border-red animate-pulse'
                : 'bg-slate-950/60 border-white/5 text-slate-400 hover:text-slate-200 hover:border-mc-neonCyan/40'
            }`}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          
          {/* Main prompt input bar */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder={isListening ? "Listening to voice input..." : "Input action parameters..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full h-full bg-slate-950/60 border border-white/5 rounded-xl px-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-mc-neonCyan/40 focus:ring-1 focus:ring-mc-neonCyan/20"
            />
          </div>

          {/* Send */}
          <button
            type="submit"
            disabled={!inputText.trim() || isProcessing}
            className={`flex items-center justify-center p-3 rounded-xl border transition-all duration-300 shrink-0 ${
              inputText.trim() && !isProcessing
                ? 'bg-mc-neonCyan/15 border-mc-neonCyan/40 text-mc-neonCyan hover:bg-mc-neonCyan/25'
                : 'bg-slate-950/20 border-white/5 text-slate-600 cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
