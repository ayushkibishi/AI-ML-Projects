'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UploadSimple, Camera, ArrowLeft, DownloadSimple, LinkSimple, Clock, 
  Hourglass, CheckCircle, Warning, MagnifyingGlass, Sparkle, SpeakerHigh,
  Cpu, GraduationCap
} from '@phosphor-icons/react';

import BoardEditor from './components/BoardEditor';
import TutorPanel from './components/TutorPanel';

import { useTypewriter } from '../hooks/useTypewriter';
import BackgroundVideo from './components/BackgroundVideo';
import MainframeNavbar from './components/MainframeNavbar';

// Configurable API base URL — defaults to localhost for development
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Define the 10 supported games
interface GameDef {
  id: string;
  name: string;
  category: 'Strategy' | 'Puzzle' | 'Mathematical';
  complexity: number; // 1-5
  description: string;
  icon: string;
  defaultState: any;
  defaultPlayer: string;
}

const SUPPORTED_GAMES: GameDef[] = [
  {
    id: 'chess',
    name: 'Chess',
    category: 'Strategy',
    complexity: 5,
    description: 'Solve positions using Stockfish. Get candidate moves and tactical evaluation.',
    icon: '♟',
    defaultState: [
      'r', 'n', 'b', 'q', 'k', 'b', 'n', 'r',
      'p', 'p', 'p', 'p', 'p', 'p', 'p', 'p',
      '', '', '', '', '', '', '', '',
      '', '', '', '', '', '', '', '',
      '', '', '', '', '', '', '', '',
      '', '', '', '', '', '', '', '',
      'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P',
      'R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'
    ],
    defaultPlayer: 'w'
  },
  {
    id: 'checkers',
    name: 'Checkers',
    category: 'Strategy',
    complexity: 3,
    description: 'Perfect checkers search. Captures are mandatory! Promotes pawns to Kings.',
    icon: '🔴',
    defaultState: [
      '', 'r', '', 'r', '', 'r', '', 'r',
      'r', '', 'r', '', 'r', '', 'r', '',
      '', 'r', '', 'r', '', 'r', '', 'r',
      '', '', '', '', '', '', '', '',
      '', '', '', '', '', '', '', '',
      'w', '', 'w', '', 'w', '', 'w', '',
      '', 'w', '', 'w', '', 'w', '', 'w',
      'w', '', 'w', '', 'w', '', 'w', ''
    ],
    defaultPlayer: 'w'
  },
  {
    id: 'connect4',
    name: 'Connect Four',
    category: 'Strategy',
    complexity: 2,
    description: 'Connect 4-in-a-row checker drops. Uses column-ordered minimax search.',
    icon: '🟡',
    defaultState: Array(42).fill(''),
    defaultPlayer: 'R'
  },
  {
    id: 'tictactoe',
    name: 'Tic-Tac-Toe',
    category: 'Strategy',
    complexity: 1,
    description: 'Perfect Tic-Tac-Toe minimax solver. Never lose another match.',
    icon: '❌',
    defaultState: Array(9).fill(''),
    defaultPlayer: 'X'
  },
  {
    id: 'reversi',
    name: 'Reversi (Othello)',
    category: 'Strategy',
    complexity: 4,
    description: 'Corner-control and mobility-focused othello disk solver.',
    icon: '🟢',
    defaultState: [
      '', '', '', '', '', '', '', '',
      '', '', '', '', '', '', '', '',
      '', '', '', '', '', '', '', '',
      '', '', '', 'W', 'B', '', '', '',
      '', '', '', 'B', 'W', '', '', '',
      '', '', '', '', '', '', '', '',
      '', '', '', '', '', '', '', '',
      '', '', '', '', '', '', '', ''
    ],
    defaultPlayer: 'B'
  },
  {
    id: 'gomoku',
    name: 'Gomoku',
    category: 'Strategy',
    complexity: 4,
    description: 'Align five stones on a 15x15 grid. Optimized search radius.',
    icon: '⚫',
    defaultState: Array(225).fill(''),
    defaultPlayer: 'B'
  },
  {
    id: 'sudoku',
    name: 'Sudoku',
    category: 'Mathematical',
    complexity: 3,
    description: 'Solve any Sudoku grid instantly using Constraint Satisfaction (MRV).',
    icon: '🔢',
    defaultState: [
      5, 3, 0, 0, 7, 0, 0, 0, 0,
      6, 0, 0, 1, 9, 5, 0, 0, 0,
      0, 9, 8, 0, 0, 0, 0, 6, 0,
      8, 0, 0, 0, 6, 0, 0, 0, 3,
      4, 0, 0, 8, 0, 3, 0, 0, 1,
      7, 0, 0, 0, 2, 0, 0, 0, 6,
      0, 6, 0, 0, 0, 0, 2, 8, 0,
      0, 0, 0, 4, 1, 9, 0, 0, 5,
      0, 0, 0, 0, 8, 0, 0, 7, 9
    ],
    defaultPlayer: ''
  },
  {
    id: '8puzzle',
    name: '8-Puzzle',
    category: 'Puzzle',
    complexity: 2,
    description: '3x3 sliding number puzzle. Solves using A* search with Manhattan heuristic.',
    icon: '🧩',
    defaultState: [1, 2, 3, 0, 4, 6, 7, 5, 8],
    defaultPlayer: ''
  },
  {
    id: '15puzzle',
    name: '15-Puzzle',
    category: 'Puzzle',
    complexity: 4,
    description: '4x4 sliding number puzzle. Fast A* solution path generator.',
    icon: '🔢',
    defaultState: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 0, 14, 15],
    defaultPlayer: ''
  },
  {
    id: 'rubik',
    name: "Rubik's Cube",
    category: 'Puzzle',
    complexity: 5,
    description: 'Full 3D face color solver. Generates step-by-step rotation moves.',
    icon: '🧱',
    // 54 character face sequence (W: White, R: Red, G: Green, Y: Yellow, O: Orange, B: Blue)
    // Represented in standard 6-face order: U, R, F, D, L, B (9 stickers each)
    defaultState: 'WWWWWWWWWRRRRRRRRRGGGGGGGGYYYYYYYYYOOOOOOOOOBBBBBBBBB',
    defaultPlayer: ''
  }
];

export default function Home() {
  const [view, setView] = useState<'landing' | 'solver'>('landing');
  const [currentView, setCurrentView] = useState<'home' | 'aboutme'>('home');
  const [showActions, setShowActions] = useState(false);
  const [copied, setCopied] = useState(false);

  // Trigger button reveal 400ms after page load
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowActions(true);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const typewriterText = " Developer: Harshpal Singh Solanki\nUniversal AI Board Game Solver & Tutor.";
  const { displayed, done } = useTypewriter(typewriterText, 38, 600);

  // Auto-launch solver if url contains ?game=...
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('game')) {
        setView('solver');
      }
    }
  }, []);

  const [selectedGame, setSelectedGame] = useState<GameDef | null>(null);
  const [boardState, setBoardState] = useState<any>(null);
  const [activePlayer, setActivePlayer] = useState<string>('w');
  const [difficultyLevel, setDifficultyLevel] = useState<string>('beginner');
  
  // CV upload states
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [warpedImage, setWarpedImage] = useState<string | null>(null);
  const [isProcessingCv, setIsProcessingCv] = useState<boolean>(false);
  const [cvConfidence, setCvConfidence] = useState<number | null>(null);
  
  // Solver states
  const [solverResult, setSolverResult] = useState<any>(null);
  const [isSolving, setIsSolving] = useState<boolean>(false);
  const [activeBestMove, setActiveBestMove] = useState<any>(null);

  // History states
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  // Camera stream states
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/history`);
      if (res.ok) {
        const data = await res.json();
        setHistoryList(data);
      }
    } catch (err) {
      console.log('Failed to fetch history list: ', err);
    }
  };

  const handleToggleHistory = () => {
    setShowHistory((prev) => {
      const next = !prev;
      if (next) fetchHistory();
      return next;
    });
  };

  const handleSelectGame = (game: GameDef) => {
    setSelectedGame(game);
    setBoardState(game.defaultState);
    setActivePlayer(game.defaultPlayer);
    setUploadedImage(null);
    setWarpedImage(null);
    setSolverResult(null);
    setActiveBestMove(null);
    setCvConfidence(null);
  };

  // CAMERA INTERACTION
  const startCamera = async () => {
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert("Could not access camera: " + err);
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "camera_capture.jpg", { type: "image/jpeg" });
            handleFileUpload(file);
          }
        }, "image/jpeg");
      }
      stopCamera();
    }
  };

  // UPLOAD FILE & CV RUN
  const handleFileUploadClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsProcessingCv(true);
    setUploadedImage(URL.createObjectURL(file));
    setWarpedImage(null);
    setCvConfidence(null);
    setSolverResult(null);
    setActiveBestMove(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("game_type", selectedGame?.id || "");

    try {
      const res = await fetch(`${API_BASE_URL}/api/upload`, {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        if (data.warped_image_url) {
          setWarpedImage(`${API_BASE_URL}${data.warped_image_url}`);
        }
        if (data.detected_state && data.detected_state.length > 0) {
          setBoardState(data.detected_state);
        }
        setCvConfidence(Math.round(data.confidence * 100));
      } else {
        alert("Failed to process image grid.");
      }
    } catch (err) {
      console.error(err);
      alert("Connection error to CV engine.");
    } finally {
      setIsProcessingCv(false);
    }
  };

  // SOLVE ACTION
  const handleSolve = async () => {
    if (!selectedGame) return;
    setIsSolving(true);
    setSolverResult(null);
    setActiveBestMove(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/solve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_type: selectedGame.id,
          state: boardState,
          player: activePlayer,
          level: difficultyLevel
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSolverResult(data);
        if (data.best_move !== undefined) {
          setActiveBestMove(data.best_move);
        }
        fetchHistory(); // refresh sidebar history list
      } else {
        alert("Solver was unable to solve this position. Check board configuration.");
      }
    } catch (err) {
      alert("Connection error to Solver engine.");
    } finally {
      setIsSolving(false);
    }
  };

  // Replay callback when clicking steps
  const handlePlayStep = (stepIdx: number) => {
    if (solverResult?.steps && solverResult.steps[stepIdx]) {
      const stepObj = solverResult.steps[stepIdx];
      
      // Update best move highlighting for current step
      if (selectedGame?.id === 'rubik') {
        // Rubik solution sequence is visual
        setActiveBestMove(stepObj.move);
      } else if (selectedGame?.id.includes('puzzle')) {
        // sliding puzzle moves tile
        setActiveBestMove(stepObj);
      } else if (stepObj.move !== undefined) {
        setActiveBestMove(stepObj.move);
      }
      
      // Show the intermediate board state if provided in step
      if (stepObj.board) {
        setBoardState(stepObj.board);
      }
    }
  };

  // Export PDF (prints basic solution)
  const handleExportPdf = () => {
    window.print();
  };

  // Copy shareable link
  const handleShareLink = () => {
    const serializedState = encodeURIComponent(JSON.stringify(boardState));
    const url = `${window.location.origin}?game=${selectedGame?.id}&state=${serializedState}`;
    navigator.clipboard.writeText(url);
    alert("Shareable link copied to clipboard!");
  };

  return (
    <div className="min-h-screen text-black flex flex-col antialiased relative font-body select-text">
      {/* Background mouse-scrub video */}
      <BackgroundVideo />

      {/* Foreground light frosted overlay to ensure content readability */}
      <div className="absolute inset-0 bg-white/5 z-[1] pointer-events-none" />

      {/* Mainframe Navbar */}
      <MainframeNavbar 
        currentView={currentView}
        onViewChange={(v) => {
          setSelectedGame(null);
          setCurrentView(v);
        }}
        onLaunchSolver={() => {
          setSelectedGame(null);
          setCurrentView('home');
          setTimeout(() => {
            const gridEl = document.getElementById('game-selection-grid');
            if (gridEl) gridEl.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }}
      />

      {!selectedGame ? (
        // 1. DUAL FRONT PAGE (LANDING + GAME SELECTION)
        <main className="relative z-10 w-full min-h-screen flex items-center pt-24 px-5 sm:px-8 md:px-10 pb-12 overflow-y-auto">
          <div className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 xl:gap-16 items-center">
            
            {/* Left Column: Game Selection or About Me Grid */}
            {currentView === 'home' ? (
              <div id="game-selection-grid" className="lg:col-span-7 flex flex-col justify-center bg-white/40 border border-black/10 backdrop-blur-md p-6 sm:p-8 rounded-3xl shadow-lg animate-fade-in">
                <div className="mb-6">
                  <h2 className="text-xl md:text-2xl font-bold text-black flex items-center gap-2 font-heading">
                    Select a Game or Puzzle <Sparkle className="text-black" size={20} weight="fill" />
                  </h2>
                  <p className="text-xs text-slate-700 mt-1">Choose a game to solve, take a photo, and receive step-by-step visual tutoring.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[55vh] overflow-y-auto pr-2 scrollbar-thin">
                  {SUPPORTED_GAMES.map((game) => (
                    <button
                      key={game.id}
                      onClick={() => handleSelectGame(game)}
                      className="group text-left p-4 bg-white/60 hover:bg-black border border-black/10 rounded-2xl transition-all duration-300 flex flex-col justify-between min-h-[140px] shadow-sm hover:shadow-black/5 relative overflow-hidden cursor-pointer"
                    >
                      <div className="flex flex-col gap-1 w-full">
                        <div className="flex justify-between items-center w-full">
                          <span className="text-2xl filter drop-shadow-sm">{game.icon}</span>
                          <span className="text-[8px] uppercase tracking-wider font-bold px-2 py-0.5 bg-black/5 border border-black/10 text-slate-700 rounded-full group-hover:bg-white/20 group-hover:text-white group-hover:border-white/25">
                            {game.category}
                          </span>
                        </div>
                        <h3 className="font-bold text-base text-black mt-2 group-hover:text-white transition font-heading">{game.name}</h3>
                        <p className="text-[11px] text-slate-700 leading-relaxed line-clamp-2 group-hover:text-slate-200">{game.description}</p>
                      </div>

                      <div className="flex items-center gap-1.5 mt-3 border-t border-black/5 group-hover:border-white/10 pt-2 w-full">
                        <span className="text-[8px] uppercase text-slate-500 group-hover:text-slate-300 font-bold">Complexity:</span>
                        <div className="flex gap-0.5">
                          {Array(5).fill(0).map((_, i) => (
                            <div 
                              key={i} 
                              className={`w-1.5 h-1.5 rounded-full ${i < game.complexity ? 'bg-black group-hover:bg-white' : 'bg-black/10 group-hover:bg-white/20'}`} 
                            />
                          ))}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.4 }}
                className="lg:col-span-7 flex flex-col justify-center bg-white/40 border border-black/10 backdrop-blur-md p-6 sm:p-8 rounded-3xl shadow-lg text-black animate-fade-in"
              >
                <div className="mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center text-2xl text-white font-heading font-bold shadow-md">
                      ✳︎
                    </div>
                    <div>
                      <h2 className="text-xl md:text-2xl font-bold text-black font-heading leading-tight">
                        A.R.I.A Profile
                      </h2>
                      <p className="text-xs text-slate-700 font-semibold tracking-wider uppercase">Adaptive Response Interface Agent</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-5 max-h-[55vh] overflow-y-auto pr-2 scrollbar-thin">
                  <p className="text-sm text-slate-800 leading-relaxed font-body">
                    A.R.I.A is a state-of-the-art interactive gaming intelligence built for the Mainframe ecosystem. Designed as a pair-programmer, helper, and cognitive tutor, A.R.I.A helps users master mathematical, strategic, and logical puzzle domains.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Neural Solver Spec */}
                    <div className="p-4 bg-white/60 border border-black/5 rounded-2xl flex flex-col gap-1.5 hover:bg-white/80 transition duration-200">
                      <div className="flex items-center gap-2 text-black">
                        <Cpu size={18} weight="bold" />
                        <h3 className="font-bold text-xs uppercase tracking-wider">Neural Game Solver</h3>
                      </div>
                      <p className="text-[11px] text-slate-700 leading-relaxed">
                        Combines minimax trees with alpha-beta pruning, constraint-satisfaction, and A* search pathfinding to solve logical board positions instantly.
                      </p>
                    </div>

                    {/* Computer Vision Spec */}
                    <div className="p-4 bg-white/60 border border-black/5 rounded-2xl flex flex-col gap-1.5 hover:bg-white/80 transition duration-200">
                      <div className="flex items-center gap-2 text-black">
                        <Camera size={18} weight="bold" />
                        <h3 className="font-bold text-xs uppercase tracking-wider">Computer Vision Scan</h3>
                      </div>
                      <p className="text-[11px] text-slate-700 leading-relaxed">
                        Features perspective transformations, grid line detection, and pixel classification to digitize physical board states via camera.
                      </p>
                    </div>

                    {/* Cognitive Tutor Spec */}
                    <div className="p-4 bg-white/60 border border-black/5 rounded-2xl flex flex-col gap-1.5 hover:bg-white/80 transition duration-200">
                      <div className="flex items-center gap-2 text-black">
                        <GraduationCap size={18} weight="bold" />
                        <h3 className="font-bold text-xs uppercase tracking-wider">Cognitive AI Tutor</h3>
                      </div>
                      <p className="text-[11px] text-slate-700 leading-relaxed">
                        Provides customizable difficulty settings (beginner, intermediate, master) with speech synthesis to explain complex candidate moves.
                      </p>
                    </div>

                    {/* Specifications Spec */}
                    <div className="p-4 bg-white/60 border border-black/5 rounded-2xl flex flex-col gap-1.5 hover:bg-white/80 transition duration-200">
                      <div className="flex items-center gap-2 text-black">
                        <Sparkle size={18} weight="bold" />
                        <h3 className="font-bold text-xs uppercase tracking-wider">Architecture Specs</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-slate-700 pt-0.5">
                        <div><strong>Core Version:</strong> 2.6.0</div>
                        <div><strong>Latency:</strong> &lt; 85ms</div>
                        <div><strong>Interface:</strong> NextJS</div>
                        <div><strong>Backend:</strong> FastAPI</div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-black/5 pt-4 mt-1">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-black mb-1 flex items-center gap-1.5 font-heading">
                      👤 Lead Developer
                    </h3>
                    <p className="text-[11px] text-slate-700 leading-relaxed font-body">
                      Created by <strong>Harshpal Singh Solanki</strong>, an AI/ML engineer specializing in computer vision, deep reinforcement learning, and modern web applications. Harshpal built the custom perspective-warping grids, image piece classifiers, and minimax game solver engines powering this application.
                    </p>
                  </div>

                  <div className="mt-2">
                    <button
                      onClick={() => setCurrentView('home')}
                      className="w-full px-6 py-2.5 bg-black hover:bg-zinc-800 text-white rounded-xl font-bold text-xs shadow-md transition duration-300 cursor-pointer text-center"
                    >
                      Launch Game Solver
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Right Column: Brand Hero Text */}
            <div className="lg:col-span-5 text-left flex flex-col justify-center pt-20 lg:pt-40">
              {/* Blurred Intro Label */}
              <motion.div 
                className="select-none mb-5 sm:mb-6 font-bold text-black"
                style={{
                  fontSize: 'clamp(28px, 5vw, 42px)',
                  lineHeight: '1.25',
                  fontFamily: '"Bitcount Prop Single", sans-serif',
                  whiteSpace: 'pre-wrap',
                  marginTop: '50px', // slide it down by 50px
                }}
                animate={{
                  y: [0, -6, 0]
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                {displayed}
                <span className="cursor-blink">|</span>
              </motion.div>



              {/* Action Pill Buttons */}
              <div 
                className={`flex flex-wrap gap-y-1 transition-all transform`}
                style={{
                  transition: 'opacity 0.4s ease, transform 0.4s ease',
                  opacity: showActions ? 1 : 0,
                  transform: showActions ? 'translateY(0)' : 'translateY(8px)'
                }}
              >
                <button
                  onClick={() => {
                    setCurrentView('home');
                    setTimeout(() => {
                      const gridEl = document.getElementById('game-selection-grid');
                      if (gridEl) gridEl.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                  className="inline-flex items-center justify-center bg-white text-black border border-black/10 rounded-full text-[13px] sm:text-[14px] px-4 py-[0.3em] mx-[0.2em] mb-[0.4em] whitespace-nowrap cursor-pointer hover:bg-black hover:text-white transition-colors duration-200 font-semibold animate-pulse"
                >
                  Select a Game
                </button>
                <button
                  onClick={() => setCurrentView('aboutme')}
                  className="inline-flex items-center justify-center bg-white text-black border border-black/10 rounded-full text-[13px] sm:text-[14px] px-4 py-[0.3em] mx-[0.2em] mb-[0.4em] whitespace-nowrap cursor-pointer hover:bg-black hover:text-white transition-colors duration-200 font-semibold"
                >
                  About A.R.I.A
                </button>
                <button
                  onClick={() => alert("Scanning Tips:\n\n1. Capture the photo directly from above the board (avoid angled perspective distortion).\n2. Ensure even lighting with minimal harsh shadows across the grid.\n3. Verify and correct individual pieces in the interactive board editor before calculating solutions.")}
                  className="inline-flex items-center justify-center bg-white text-black border border-black/10 rounded-full text-[13px] sm:text-[14px] px-4 py-[0.3em] mx-[0.2em] mb-[0.4em] whitespace-nowrap cursor-pointer hover:bg-black hover:text-white transition-colors duration-200 font-semibold"
                >
                  Scanning Guide
                </button>
              </div>
            </div>

          </div>
        </main>
      ) : (
        // 2. ACTIVE SOLVER WORKSPACE
        <div className="relative z-10 w-full min-h-screen flex flex-col">
          {/* HEADER */}
          <header className="border-b border-black/10 bg-white/70 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => { setSelectedGame(null); setCurrentView('home'); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-black/10 bg-white hover:bg-black hover:text-white text-xs transition font-semibold text-black cursor-pointer"
              >
                ← Back
              </button>
              <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center text-xl shadow-md border border-black/20 text-white font-heading font-bold">
                ✳︎
              </div>
              <div>
                <h1 className="text-lg font-bold text-black font-heading leading-tight">Antigravity Solver & Tutor</h1>
                <p className="text-[9px] text-slate-600 tracking-wider uppercase font-semibold">Universal AI Board Game Solver</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => { setSelectedGame(null); setCurrentView('home'); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-black/10 bg-white hover:bg-black hover:text-white text-xs transition font-semibold text-black cursor-pointer"
              >
                Home
              </button>
              <button
                onClick={handleToggleHistory}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-black/10 bg-white hover:bg-black hover:text-white text-xs transition font-semibold text-black cursor-pointer"
              >
                <Clock size={14} /> History
              </button>
            </div>
          </header>

          {/* MAIN CONTAINER */}
          <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 flex gap-8">
            
            {/* LEFT SIDEBAR: HISTORY LIST */}
            <AnimatePresence>
              {showHistory && (
                <motion.aside
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 320, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="bg-white/80 backdrop-blur-md border border-black/10 rounded-2xl p-4 flex flex-col gap-4 max-h-[80vh] overflow-y-auto shadow-md"
                >
                  <div className="flex justify-between items-center border-b border-black/5 pb-2">
                    <h3 className="font-bold text-black flex items-center gap-1.5 text-sm font-heading"><Clock size={16} /> Recent Solves</h3>
                    <button onClick={() => setShowHistory(false)} className="text-[10px] text-slate-500 hover:text-black uppercase font-bold cursor-pointer">Close</button>
                  </div>
                  <div className="flex flex-col gap-3">
                    {historyList.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-6">No solves logged yet.</p>
                    ) : (
                      historyList.map((entry) => (
                        <button
                          key={entry.id}
                          onClick={() => {
                            const game = SUPPORTED_GAMES.find(g => g.id === entry.game_type);
                            if (game) {
                              setSelectedGame(game);
                              setBoardState(entry.detected_state);
                              if (entry.solution) {
                                setSolverResult(entry.solution);
                                if (entry.solution.best_move) setActiveBestMove(entry.solution.best_move);
                              }
                              setShowHistory(false);
                            }
                          }}
                          className="text-left p-3 rounded-xl bg-white/50 hover:bg-black hover:text-white border border-black/5 hover:border-black transition group cursor-pointer"
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-slate-900 group-hover:text-white capitalize font-heading">{entry.game_type}</span>
                            <span className="text-[9px] text-slate-500 group-hover:text-slate-300">{new Date(entry.timestamp).toLocaleDateString()}</span>
                          </div>
                          <p className="text-[10px] text-slate-600 group-hover:text-slate-200 truncate">
                            Result: {entry.solution?.evaluation || 'Solved'}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </motion.aside>
              )}
            </AnimatePresence>

            {/* WORKSPACE AREA */}
            <div className="flex-1 flex flex-col gap-8">
              <motion.div
                key="solver-active"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="flex flex-col gap-6"
              >
                {/* Back button and title */}
                <div className="flex items-center justify-between border-b border-black/10 pb-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => { setSelectedGame(null); setCurrentView('home'); }}
                      className="p-2 rounded-xl bg-white border border-black/10 hover:bg-black hover:text-white transition cursor-pointer text-black"
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{selectedGame.icon}</span>
                        <h2 className="text-xl font-bold text-black font-heading">{selectedGame.name} Solver</h2>
                      </div>
                      <p className="text-xs text-slate-700">Upload an image of the board or manually configure it below.</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={handleShareLink}
                      className="p-2 rounded-xl bg-white border border-black/10 hover:bg-black hover:text-white flex items-center gap-1.5 text-xs transition cursor-pointer text-black"
                      title="Share link"
                    >
                      <LinkSimple size={14} /> <span className="hidden sm:inline">Share</span>
                    </button>
                    <button
                      onClick={handleExportPdf}
                      className="p-2 rounded-xl bg-white border border-black/10 hover:bg-black hover:text-white flex items-center gap-1.5 text-xs transition cursor-pointer text-black"
                      title="Export solution"
                    >
                      <DownloadSimple size={14} /> <span className="hidden sm:inline">Export PDF</span>
                    </button>
                  </div>
                </div>

                {/* UPPER DIVISION: UPLOAD & VISION PIPELINE */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Photo Upload Area */}
                  <div className="bg-white/70 backdrop-blur-md p-5 rounded-2xl border border-black/10 flex flex-col gap-4 justify-between min-h-[300px] relative shadow-sm text-black">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-black flex items-center gap-1.5">
                        <UploadSimple size={16} /> 1. Upload or Capture Photo
                      </span>
                      {cvConfidence !== null && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${cvConfidence > 70 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          CV Accuracy: {cvConfidence}%
                        </span>
                      )}
                    </div>

                    {/* Camera display or uploader placeholder */}
                    <div className="border-2 border-dashed border-black/10 hover:border-black rounded-xl overflow-hidden aspect-video bg-black/5 flex flex-col items-center justify-center relative transition duration-200 min-h-[220px]">
                      {isCameraActive ? (
                        <>
                          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                          <button
                            onClick={capturePhoto}
                            className="absolute bottom-4 px-4 py-2 bg-black hover:bg-zinc-800 text-white rounded-full text-xs font-bold shadow-md flex items-center gap-1 transition cursor-pointer"
                          >
                            <Camera size={14} /> Capture State
                          </button>
                        </>
                      ) : uploadedImage ? (
                        <div className="relative w-full h-full flex items-center justify-center">
                          <img src={warpedImage || uploadedImage} alt="Warped state" className="max-h-full max-w-full object-contain" />
                          {isProcessingCv && (
                            <div className="absolute inset-0 bg-white/75 backdrop-blur-xs flex flex-col items-center justify-center gap-3">
                              <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-black animate-spin" />
                              <span className="text-xs text-slate-700">Analyzing board state...</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 p-6 text-center">
                          <UploadSimple size={36} className="text-slate-400 opacity-60 animate-pulse" />
                          <p className="text-xs text-slate-900 font-semibold">Drag & drop photo here or upload from device</p>
                          <p className="text-[10px] text-slate-500">Supports Chess, Sudoku, Connect4 grids, etc.</p>
                          <div className="flex gap-2 mt-4">
                            <button
                              onClick={handleFileUploadClick}
                              className="px-4 py-1.5 bg-white hover:bg-black hover:text-white border border-black/10 text-xs rounded-lg font-semibold transition cursor-pointer text-black"
                            >
                              Browse Files
                            </button>
                            <button
                              onClick={startCamera}
                              className="px-4 py-1.5 bg-black hover:bg-zinc-800 text-white text-xs rounded-lg font-semibold flex items-center gap-1 transition cursor-pointer"
                            >
                              <Camera size={14} /> Live Camera
                            </button>
                          </div>
                        </div>
                      )}
                      
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                      />
                      <canvas ref={canvasRef} className="hidden" />
                    </div>

                    <p className="text-[10px] text-slate-500 text-center italic">Tip: Take photos directly from above the board to minimize distortion.</p>
                  </div>

                  {/* Interactive Board Editor */}
                  <div className="bg-white/70 backdrop-blur-md p-5 rounded-2xl border border-black/10 flex flex-col gap-4 shadow-sm text-black">
                    <span className="text-xs font-bold text-black flex items-center gap-1.5">
                      🧩 2. Interactive Board Configuration
                    </span>
                    
                    <div className="flex-1 flex items-center justify-center py-4 bg-black/5 rounded-xl border border-black/5">
                      <BoardEditor
                        gameType={selectedGame.id}
                        state={boardState}
                        onChangeState={setBoardState}
                        activePlayer={activePlayer}
                        onChangePlayer={setActivePlayer}
                        bestMove={activeBestMove}
                      />
                    </div>

                    <button
                      onClick={handleSolve}
                      disabled={isSolving || isProcessingCv}
                      className="w-full py-3 bg-black hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-black text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-1.5 transition duration-300 cursor-pointer"
                    >
                      {isSolving ? (
                        <>
                          <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                          Calculating Solution...
                        </>
                      ) : (
                        <>
                          🪄 Solve Position & Open Tutor
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* LOWER DIVISION: STEP BY STEP TUTOR */}
                {solverResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 gap-6"
                  >
                    <TutorPanel
                      gameType={selectedGame.id}
                      solutionData={solverResult}
                      difficultyLevel={difficultyLevel}
                      onChangeDifficulty={setDifficultyLevel}
                      onPlayStep={handlePlayStep}
                    />
                  </motion.div>
                )}

              </motion.div>
            </div>
          </main>
        </div>
      )}

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-black/10 bg-white/20 text-center py-4 text-[10px] text-slate-700 mt-8 font-body">
        © 2026 Antigravity Team. Pair-programmed with Antigravity AI. Powered by Next.js, FastAPI & OpenCV.
      </footer>
    </div>
  );
}
