'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Sparkles, AlertCircle } from 'lucide-react';

export default function VoiceAssistant({ settings, setSettings, activePeople, captureScreenshot }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [assistantResponse, setAssistantResponse] = useState('System ready. State your command.');
  const [recognition, setRecognition] = useState(null);
  
  const [speakVolume, setSpeakVolume] = useState(true);

  // Initialize Speech Recognition on Mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = 'en-US';

        rec.onstart = () => {
          setIsListening(true);
          setTranscript('Listening...');
        };

        rec.onerror = (e) => {
          console.error('[VoiceAssistant] Speech error:', e);
          setIsListening(false);
          setTranscript('Could not capture voice.');
        };

        rec.onend = () => {
          setIsListening(false);
        };

        rec.onresult = (event) => {
          const text = event.results[0][0].transcript.toLowerCase();
          setTranscript(text);
          processCommand(text);
        };

        setRecognition(rec);
      }
    }
  }, [settings, activePeople]);

  // Voice synthesis helper
  const speakResponse = (text) => {
    if (!speakVolume || typeof window === 'undefined') return;
    const synth = window.speechSynthesis;
    if (synth) {
      synth.cancel(); // stop previous speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 0.95; // slightly lower pitch for AI OS feel
      // Find a default english/robot voice if possible
      const voices = synth.getVoices();
      const engVoice = voices.find(v => v.lang.startsWith('en-'));
      if (engVoice) utterance.voice = engVoice;
      synth.speak(utterance);
    }
  };

  // Process matching commands
  const processCommand = (command) => {
    console.log('[VoiceAssistant] Executing voice command:', command);
    
    if (command.includes('enable yolo') || command.includes('turn on yolo') || command.includes('enable detection')) {
      setSettings(prev => ({ ...prev, yolo_enabled: true }));
      const msg = "YOLO object detection module enabled.";
      setAssistantResponse(msg);
      speakResponse(msg);
    }
    else if (command.includes('disable yolo') || command.includes('turn off yolo') || command.includes('disable detection')) {
      setSettings(prev => ({ ...prev, yolo_enabled: false }));
      const msg = "YOLO object detection module deactivated.";
      setAssistantResponse(msg);
      speakResponse(msg);
    }
    else if (command.includes('enable face') || command.includes('turn on face')) {
      setSettings(prev => ({ ...prev, face_enabled: true }));
      const msg = "Face verification database synchronized.";
      setAssistantResponse(msg);
      speakResponse(msg);
    }
    else if (command.includes('disable face') || command.includes('turn off face')) {
      setSettings(prev => ({ ...prev, face_enabled: false }));
      const msg = "Facial identification module disabled.";
      setAssistantResponse(msg);
      speakResponse(msg);
    }
    else if (command.includes('enable pose') || command.includes('enable skeleton') || command.includes('turn on pose')) {
      setSettings(prev => ({ ...prev, pose_enabled: true }));
      const msg = "MediaPipe skeletal tracking initialized.";
      setAssistantResponse(msg);
      speakResponse(msg);
    }
    else if (command.includes('disable pose') || command.includes('disable skeleton') || command.includes('turn off pose')) {
      setSettings(prev => ({ ...prev, pose_enabled: false }));
      const msg = "Pose estimation module turned off.";
      setAssistantResponse(msg);
      speakResponse(msg);
    }
    else if (command.includes('screenshot') || command.includes('capture screen') || command.includes('take snap')) {
      const msg = "Capturing viewport snapshot.";
      setAssistantResponse(msg);
      speakResponse(msg);
      if (captureScreenshot) {
        setTimeout(captureScreenshot, 500);
      }
    }
    else if (command.includes('occupancy') || command.includes('who is present') || command.includes('status') || command.includes('how many people')) {
      const count = activePeople.length;
      const msg = `System check operational. Current office occupancy is ${count} ${count === 1 ? 'person' : 'people'}.`;
      setAssistantResponse(msg);
      speakResponse(msg);
    }
    else if (command.includes('help') || command.includes('what can i say')) {
      const msg = "Available commands: enable yolo, disable yolo, enable face, disable face, status report, capture screen.";
      setAssistantResponse(msg);
      speakResponse(msg);
    }
    else {
      const msg = `Command: ${command} not recognized. Say help for options.`;
      setAssistantResponse(msg);
      speakResponse(msg);
    }
  };

  const toggleListening = () => {
    if (!recognition) {
      alert('Speech Recognition is not supported by your current browser. Try Chrome/Edge.');
      return;
    }
    
    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  return (
    <div className="glass-panel rounded-xl border border-white/10 p-4 font-mono flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0 flex-grow">
        <button
          onClick={toggleListening}
          className={`p-2.5 rounded-full border transition duration-200 shrink-0 ${
            isListening 
              ? 'bg-rose-500 border-rose-400 text-black animate-pulse' 
              : 'bg-cyan-950/60 border-cyan-500/20 hover:border-cyan-400 text-cyan-400'
          }`}
          title={isListening ? "Stop listening" : "Start Voice command"}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <div className="min-w-0 flex-grow text-xs leading-normal">
          <div className="flex items-center gap-1.5 text-[9px] uppercase font-bold text-gray-500">
            <Sparkles className="w-3 h-3 text-cyan-400 animate-spin" />
            <span>AI Voice Command Terminal</span>
          </div>
          {transcript && (
            <p className="text-gray-400 mt-0.5 truncate">
              User: <span className="text-white font-semibold">"{transcript}"</span>
            </p>
          )}
          <p className="text-cyan-400 mt-0.5 font-bold truncate">
            Core AI: "{assistantResponse}"
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        {/* Voice synthesis toggle */}
        <button
          onClick={() => setSpeakVolume(!speakVolume)}
          className={`p-1.5 rounded border text-xs transition ${
            speakVolume 
              ? 'bg-cyan-950/40 border-cyan-500/20 text-cyan-400' 
              : 'bg-slate-900 border-white/5 text-gray-500'
          }`}
          title={speakVolume ? "Mute Speech Synthesis" : "Unmute Speech Synthesis"}
        >
          <Volume2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
