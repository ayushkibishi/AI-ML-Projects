'use client';

import React, { useState } from 'react';
import { Trash, Plus, Circle } from '@phosphor-icons/react';

interface BoardEditorProps {
  gameType: string;
  state: any; // array or string
  onChangeState: (newState: any) => void;
  activePlayer: string;
  onChangePlayer: (player: string) => void;
  bestMove: any; // highlights the solver recommendation
  currentStepIndex?: number; // to show moves during replay
}

export default function BoardEditor({
  gameType,
  state,
  onChangeState,
  activePlayer,
  onChangePlayer,
  bestMove,
  currentStepIndex = -1,
}: BoardEditorProps) {
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [rubikSelectedFace, setRubikSelectedFace] = useState<string>('U');
  const normalizedGame = gameType.toLowerCase().replace(/-/g, '').replace(/\s/g, '');

  // Helper to check if a cell is highlighted as best move
  const isHighlighted = (idx: number, type: 'source' | 'destination' | 'general' = 'general') => {
    if (!bestMove) return false;
    
    if (normalizedGame === 'chess') {
      // bestMove is UCI like "e2e4"
      const cols = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      const srcCol = cols.indexOf(bestMove[0]);
      const srcRow = 8 - parseInt(bestMove[1]);
      const dstCol = cols.indexOf(bestMove[2]);
      const dstRow = 8 - parseInt(bestMove[3]);
      
      const srcIdx = srcRow * 8 + srcCol;
      const dstIdx = dstRow * 8 + dstCol;
      
      if (type === 'source') return idx === srcIdx;
      if (type === 'destination') return idx === dstIdx;
    } else if (normalizedGame === 'checkers') {
      // bestMove is {"from": int, "to": int, "captures": []}
      if (type === 'source') return idx === bestMove.from;
      if (type === 'destination') return idx === bestMove.to;
    } else if (normalizedGame === 'connectfour' || normalizedGame === 'connect4') {
      // bestMove is column number (0-6). Highlight the top open cell in that column
      if (bestMove === idx % 7) {
        // Find if this cell is the one where the disc falls
        // Connect 4 rows go from 0 (top) to 5 (bottom)
        for (let r = 5; r >= 0; r--) {
          if (state[r * 7 + (idx % 7)] === '') {
            return idx === r * 7 + (idx % 7);
          }
        }
      }
    } else if (normalizedGame === 'tictactoe' || normalizedGame === 'reversi' || normalizedGame === 'othello' || normalizedGame === 'gomoku') {
      return idx === bestMove;
    }
    return false;
  };

  // CHESS EDITOR
  if (normalizedGame === 'chess') {
    const board = Array.isArray(state) ? state : Array(64).fill('');
    const pieces = [
      { char: 'P', label: 'White Pawn' }, { char: 'R', label: 'White Rook' },
      { char: 'N', label: 'White Knight' }, { char: 'B', label: 'White Bishop' },
      { char: 'Q', label: 'White Queen' }, { char: 'K', label: 'White King' },
      { char: 'p', label: 'Black Pawn' }, { char: 'r', label: 'Black Rook' },
      { char: 'n', label: 'Black Knight' }, { char: 'b', label: 'Black Bishop' },
      { char: 'q', label: 'Black Queen' }, { char: 'k', label: 'Black King' },
    ];
    
    const unicodePieces: Record<string, string> = {
      'P': '♙', 'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔',
      'p': '♟', 'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚'
    };

    const handleCellClick = (idx: number) => {
      setSelectedCell(selectedCell === idx ? null : idx);
    };

    const selectPiece = (pieceChar: string) => {
      if (selectedCell !== null) {
        const newBoard = [...board];
        newBoard[selectedCell] = pieceChar;
        onChangeState(newBoard);
        setSelectedCell(null);
      }
    };

    return (
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-4 mb-2">
          <span className="text-sm text-muted">Active Player:</span>
          <button
            onClick={() => onChangePlayer('w')}
            className={`px-3 py-1 text-xs rounded font-medium transition ${activePlayer === 'w' ? 'bg-accent text-white' : 'bg-card text-muted hover:text-white'}`}
          >
            White to Move
          </button>
          <button
            onClick={() => onChangePlayer('b')}
            className={`px-3 py-1 text-xs rounded font-medium transition ${activePlayer === 'b' ? 'bg-accent text-white' : 'bg-card text-muted hover:text-white'}`}
          >
            Black to Move
          </button>
        </div>
        <div className="grid grid-cols-8 gap-0 border-4 border-slate-900 rounded-lg overflow-hidden max-w-[400px] w-full aspect-square relative bg-emerald-900">
          {board.map((cell, idx) => {
            const row = Math.floor(idx / 8);
            const col = idx % 8;
            const isDark = (row + col) % 2 === 1;
            const isSrc = isHighlighted(idx, 'source');
            const isDst = isHighlighted(idx, 'destination');
            
            return (
              <button
                key={idx}
                onClick={() => handleCellClick(idx)}
                className={`relative flex items-center justify-center text-4xl font-semibold aspect-square transition-all
                  ${isDark ? 'bg-[#15803D]' : 'bg-[#D1FAE5] text-slate-900'}
                  ${isSrc ? 'ring-4 ring-emerald-500 ring-inset bg-emerald-700/80' : ''}
                  ${isDst ? 'ring-4 ring-amber-500 ring-inset bg-amber-700/80' : ''}
                  ${selectedCell === idx ? 'scale-95 brightness-75 ring-2 ring-white' : 'hover:brightness-95'}
                `}
              >
                <span className={cell.toLowerCase() === cell ? 'text-black' : 'text-slate-100 drop-shadow-md'}>
                  {unicodePieces[cell] || ''}
                </span>
                {/* Visual coordinate helpers on border cells */}
                {col === 0 && <span className="absolute left-0.5 top-0.5 text-[8px] opacity-40 font-mono">{8 - row}</span>}
                {row === 7 && <span className="absolute right-1 bottom-0.5 text-[8px] opacity-40 font-mono">{['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'][col]}</span>}
              </button>
            );
          })}
        </div>

        {selectedCell !== null && (
          <div className="bg-card p-3 rounded-xl border border-border w-full max-w-[400px]">
            <p className="text-xs text-muted mb-2 text-center">Select Piece for square {['a','b','c','d','e','f','g','h'][selectedCell%8]}{8-Math.floor(selectedCell/8)}:</p>
            <div className="grid grid-cols-6 gap-2 mb-2">
              {pieces.map((p) => (
                <button
                  key={p.char}
                  onClick={() => selectPiece(p.char)}
                  className="flex items-center justify-center p-2 rounded bg-slate-800 hover:bg-slate-700 text-2xl transition"
                  title={p.label}
                >
                  {unicodePieces[p.char]}
                </button>
              ))}
            </div>
            <button
              onClick={() => selectPiece('')}
              className="w-full py-1 text-xs bg-red-950/40 text-red-400 border border-red-900/30 rounded flex items-center justify-center gap-1 hover:bg-red-900/20 transition"
            >
              <Trash size={12} /> Clear Square
            </button>
          </div>
        )}
      </div>
    );
  }

  // CHECKERS EDITOR
  if (normalizedGame === 'checkers') {
    const board = Array.isArray(state) ? state : Array(64).fill('');
    const handleCellClick = (idx: number) => {
      if ((Math.floor(idx / 8) + (idx % 8)) % 2 === 0) return; // Standard checkers only on dark cells
      const current = board[idx];
      let next = '';
      if (current === '') next = 'r';
      else if (current === 'r') next = 'R';
      else if (current === 'R') next = 'w';
      else if (current === 'w') next = 'W';
      else if (current === 'W') next = '';
      
      const newBoard = [...board];
      newBoard[idx] = next;
      onChangeState(newBoard);
    };

    return (
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-4 mb-2">
          <span className="text-sm text-muted">Active Player:</span>
          <button
            onClick={() => onChangePlayer('r')}
            className={`px-3 py-1 text-xs rounded font-medium transition ${activePlayer === 'r' ? 'bg-red-600 text-white' : 'bg-card text-muted hover:text-white'}`}
          >
            Red Moves
          </button>
          <button
            onClick={() => onChangePlayer('w')}
            className={`px-3 py-1 text-xs rounded font-medium transition ${activePlayer === 'w' ? 'bg-slate-200 text-slate-900' : 'bg-card text-muted hover:text-white'}`}
          >
            White Moves
          </button>
        </div>
        <div className="grid grid-cols-8 gap-0 border-4 border-slate-950 rounded-lg overflow-hidden max-w-[400px] w-full aspect-square bg-[#334155]">
          {board.map((cell, idx) => {
            const row = Math.floor(idx / 8);
            const col = idx % 8;
            const isDark = (row + col) % 2 === 1;
            const isSrc = isHighlighted(idx, 'source');
            const isDst = isHighlighted(idx, 'destination');

            return (
              <button
                key={idx}
                disabled={!isDark}
                onClick={() => handleCellClick(idx)}
                className={`relative flex items-center justify-center aspect-square transition-all
                  ${isDark ? 'bg-[#0F172A] hover:bg-[#1E293B] cursor-pointer' : 'bg-[#F1F5F9] cursor-not-allowed'}
                  ${isSrc ? 'ring-4 ring-emerald-500 ring-inset bg-emerald-950/60' : ''}
                  ${isDst ? 'ring-4 ring-amber-500 ring-inset bg-amber-950/60' : ''}
                `}
              >
                {cell !== '' && (
                  <div
                    className={`w-4/5 h-4/5 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105
                      ${cell.toLowerCase() === 'r' ? 'bg-gradient-to-br from-red-500 to-red-700' : 'bg-gradient-to-br from-slate-100 to-slate-300 border border-slate-400'}
                    `}
                  >
                    {cell === cell.toUpperCase() && (
                      <span className="text-yellow-400 text-lg font-bold">★</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-muted text-center italic">Click dark squares repeatedly to cycle: Red ➔ Red King ➔ White ➔ White King ➔ Empty</p>
      </div>
    );
  }

  // CONNECT FOUR EDITOR
  if (normalizedGame === 'connectfour' || normalizedGame === 'connect4') {
    const board = Array.isArray(state) ? state : Array(42).fill('');
    const handleColClick = (colIdx: number) => {
      // Find the lowest empty cell in this column
      const newBoard = [...board];
      let rowPlaced = -1;
      for (let r = 5; r >= 0; r--) {
        if (newBoard[r * 7 + colIdx] === '') {
          rowPlaced = r;
          break;
        }
      }
      
      if (rowPlaced !== -1) {
        newBoard[rowPlaced * 7 + colIdx] = activePlayer;
        onChangeState(newBoard);
      } else {
        // If column is full, clicking it clears it entirely (helpful editor function!)
        for (let r = 0; r < 6; r++) {
          newBoard[r * 7 + colIdx] = '';
        }
        onChangeState(newBoard);
      }
    };

    return (
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-4 mb-2">
          <span className="text-sm text-muted">Active Placer:</span>
          <button
            onClick={() => onChangePlayer('R')}
            className={`px-3 py-1 text-xs rounded font-medium transition ${activePlayer === 'R' ? 'bg-red-600 text-white' : 'bg-card text-muted hover:text-white'}`}
          >
            Red
          </button>
          <button
            onClick={() => onChangePlayer('Y')}
            className={`px-3 py-1 text-xs rounded font-medium transition ${activePlayer === 'Y' ? 'bg-yellow-500 text-slate-950' : 'bg-card text-muted hover:text-white'}`}
          >
            Yellow
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1.5 p-3 bg-blue-700 border-4 border-blue-900 rounded-2xl max-w-[380px] w-full shadow-2xl">
          {board.map((cell, idx) => {
            const col = idx % 7;
            const isHighlight = isHighlighted(idx, 'general');
            
            return (
              <button
                key={idx}
                onClick={() => handleColClick(col)}
                className={`aspect-square rounded-full flex items-center justify-center transition-all bg-[#0F172A] relative
                  ${cell === 'R' ? 'bg-gradient-to-br from-red-500 to-red-700' : ''}
                  ${cell === 'Y' ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' : ''}
                  ${isHighlight ? 'ring-4 ring-emerald-400 ring-offset-2 ring-offset-blue-700 animate-pulse' : 'hover:scale-105'}
                `}
              >
                {cell === '' && (
                  <div className="w-1/3 h-1/3 rounded-full bg-blue-950/20 border border-blue-900/35" />
                )}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-muted text-center italic">Click columns to drop a disc. Clicking a full column clears it.</p>
      </div>
    );
  }

  // TIC-TAC-TOE EDITOR
  if (normalizedGame === 'tictactoe') {
    const board = Array.isArray(state) ? state : Array(9).fill('');
    const handleCellClick = (idx: number) => {
      const current = board[idx];
      const next = current === '' ? 'X' : current === 'X' ? 'O' : '';
      const newBoard = [...board];
      newBoard[idx] = next;
      onChangeState(newBoard);
    };

    return (
      <div className="flex flex-col items-center gap-4">
        <div className="grid grid-cols-3 gap-3 bg-slate-900 p-3 rounded-2xl border border-slate-800 max-w-[300px] w-full aspect-square">
          {board.map((cell, idx) => {
            const isHighlight = isHighlighted(idx, 'general');
            
            return (
              <button
                key={idx}
                onClick={() => handleCellClick(idx)}
                className={`flex items-center justify-center text-5xl font-extrabold aspect-square rounded-xl transition-all bg-[#1E293B] hover:bg-[#334155]
                  ${isHighlight ? 'ring-4 ring-emerald-500' : ''}
                  ${cell === 'X' ? 'text-amber-500' : 'text-emerald-500'}
                `}
              >
                {cell}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-muted text-center italic">Click squares to cycle: X ➔ O ➔ Empty</p>
      </div>
    );
  }

  // REVERSI / OTHELLO EDITOR
  if (normalizedGame === 'reversi' || normalizedGame === 'othello') {
    const board = Array.isArray(state) ? state : Array(64).fill('');
    const handleCellClick = (idx: number) => {
      const current = board[idx];
      const next = current === '' ? 'B' : current === 'B' ? 'W' : '';
      const newBoard = [...board];
      newBoard[idx] = next;
      onChangeState(newBoard);
    };

    return (
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-4 mb-2">
          <span className="text-sm text-muted">Active Player:</span>
          <button
            onClick={() => onChangePlayer('B')}
            className={`px-3 py-1 text-xs rounded font-medium transition ${activePlayer === 'B' ? 'bg-slate-950 text-white' : 'bg-card text-muted hover:text-white'}`}
          >
            Black to Move
          </button>
          <button
            onClick={() => onChangePlayer('W')}
            className={`px-3 py-1 text-xs rounded font-medium transition ${activePlayer === 'W' ? 'bg-slate-100 text-slate-950' : 'bg-card text-muted hover:text-white'}`}
          >
            White to Move
          </button>
        </div>
        <div className="grid grid-cols-8 gap-1 p-2 bg-[#0F5A31] border-4 border-emerald-950 rounded-xl max-w-[380px] w-full aspect-square">
          {board.map((cell, idx) => {
            const isHighlight = isHighlighted(idx, 'general');
            
            return (
              <button
                key={idx}
                onClick={() => handleCellClick(idx)}
                className={`relative aspect-square rounded bg-[#166534] hover:bg-[#15803D] transition-all flex items-center justify-center
                  ${isHighlight ? 'ring-4 ring-amber-500 animate-pulse' : ''}
                `}
              >
                {cell !== '' && (
                  <div
                    className={`w-[85%] h-[85%] rounded-full shadow-lg transition-transform hover:scale-105
                      ${cell === 'B' ? 'bg-gradient-to-br from-neutral-800 to-black' : 'bg-gradient-to-br from-neutral-100 to-slate-300'}
                    `}
                  />
                )}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-muted text-center italic">Click squares to cycle: Black ➔ White ➔ Empty</p>
      </div>
    );
  }

  // GOMOKU EDITOR
  if (normalizedGame === 'gomoku') {
    const board = Array.isArray(state) ? state : Array(225).fill('');
    const handleCellClick = (idx: number) => {
      const current = board[idx];
      const next = current === '' ? 'B' : current === 'B' ? 'W' : '';
      const newBoard = [...board];
      newBoard[idx] = next;
      onChangeState(newBoard);
    };

    return (
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-4 mb-2">
          <span className="text-sm text-muted">Active Player:</span>
          <button
            onClick={() => onChangePlayer('B')}
            className={`px-3 py-1 text-xs rounded font-medium transition ${activePlayer === 'B' ? 'bg-black text-white' : 'bg-card text-muted hover:text-white'}`}
          >
            Black Stones
          </button>
          <button
            onClick={() => onChangePlayer('W')}
            className={`px-3 py-1 text-xs rounded font-medium transition ${activePlayer === 'W' ? 'bg-slate-100 text-slate-950' : 'bg-card text-muted hover:text-white'}`}
          >
            White Stones
          </button>
        </div>
        <div className="grid grid-cols-15 gap-0.5 p-1 bg-[#D8A462] border-2 border-[#7A4E1B] rounded-lg max-w-[420px] w-full aspect-square">
          {board.map((cell, idx) => {
            const isHighlight = isHighlighted(idx, 'general');
            
            return (
              <button
                key={idx}
                onClick={() => handleCellClick(idx)}
                className={`relative aspect-square border border-[#8C6239]/20 flex items-center justify-center hover:bg-[#8C6239]/10 transition-colors
                  ${isHighlight ? 'bg-amber-600/30' : ''}
                `}
              >
                {/* Horizontal and vertical gridlines */}
                <div className="absolute top-1/2 left-0 w-full h-[1px] bg-[#5C3E1B]/30" />
                <div className="absolute left-1/2 top-0 h-full w-[1px] bg-[#5C3E1B]/30" />
                
                {cell !== '' && (
                  <div
                    className={`w-[85%] h-[85%] rounded-full shadow-md z-10
                      ${cell === 'B' ? 'bg-black' : 'bg-slate-100 border border-slate-400'}
                    `}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // SUDOKU EDITOR
  if (normalizedGame === 'sudoku') {
    const board = Array.isArray(state) ? state : Array(81).fill(0);
    const handleCellClick = (idx: number) => {
      setSelectedCell(selectedCell === idx ? null : idx);
    };

    const selectNumber = (num: number) => {
      if (selectedCell !== null) {
        const newBoard = [...board];
        newBoard[selectedCell] = num;
        onChangeState(newBoard);
        setSelectedCell(null);
      }
    };

    return (
      <div className="flex flex-col items-center gap-4">
        <div className="grid grid-cols-9 gap-0.5 bg-slate-800 p-1 border-2 border-slate-900 rounded-xl max-w-[380px] w-full aspect-square">
          {board.map((cell, idx) => {
            const row = Math.floor(idx / 9);
            const col = idx % 9;
            
            // Border separators for 3x3 blocks
            const borderRight = (col === 2 || col === 5) ? 'border-r-2 border-slate-950' : '';
            const borderBottom = (row === 2 || row === 5) ? 'border-b-2 border-slate-950' : '';
            
            // Solver recommendation highlight
            const isHighlight = bestMove?.index === idx;

            return (
              <button
                key={idx}
                onClick={() => handleCellClick(idx)}
                className={`flex items-center justify-center text-lg font-bold aspect-square transition-all
                  ${(Math.floor(row / 3) + Math.floor(col / 3)) % 2 === 0 ? 'bg-slate-950' : 'bg-slate-900'}
                  ${borderRight} ${borderBottom}
                  ${isHighlight ? 'bg-amber-600/40 text-amber-300 font-extrabold animate-pulse' : 'text-slate-100'}
                  ${selectedCell === idx ? 'bg-amber-500/20 text-amber-400 ring-2 ring-amber-400 ring-inset' : 'hover:bg-slate-800'}
                `}
              >
                {cell !== 0 ? cell : ''}
              </button>
            );
          })}
        </div>

        {selectedCell !== null && (
          <div className="bg-card p-3 rounded-xl border border-border w-full max-w-[380px]">
            <p className="text-xs text-muted mb-2 text-center">Select value for cell (Row {Math.floor(selectedCell/9)+1}, Col {selectedCell%9+1}):</p>
            <div className="grid grid-cols-5 gap-2 mb-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <button
                  key={n}
                  onClick={() => selectNumber(n)}
                  className="py-2 font-bold rounded bg-slate-800 hover:bg-slate-700 text-center transition"
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => selectNumber(0)}
                className="py-2 text-xs font-semibold rounded bg-red-950/40 text-red-400 border border-red-900/30 hover:bg-red-900/20 transition flex items-center justify-center"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // SLIDING PUZZLES EDITOR (8-Puzzle / 15-Puzzle)
  if (normalizedGame === '8puzzle' || normalizedGame === '15puzzle' || normalizedGame === '8-puzzle' || normalizedGame === '15-puzzle') {
    const board = Array.isArray(state) ? state : Array(normalizedGame.startsWith('8') ? 9 : 16).fill(0);
    const size = normalizedGame.startsWith('8') ? 3 : 4;
    
    const handleCellClick = (idx: number) => {
      // Interactive sliding: check if clicked cell is adjacent to the empty spot (0)
      const emptyIdx = board.indexOf(0);
      const r = Math.floor(idx / size);
      const c = idx % size;
      const er = Math.floor(emptyIdx / size);
      const ec = emptyIdx % size;

      const isAdjacent = (Math.abs(r - er) + Math.abs(c - ec)) === 1;
      if (isAdjacent) {
        const newBoard = [...board];
        newBoard[emptyIdx] = board[idx];
        newBoard[idx] = 0;
        onChangeState(newBoard);
      }
    };

    return (
      <div className="flex flex-col items-center gap-4">
        <div className={`grid grid-cols-${size} gap-2 bg-slate-950 p-3 rounded-2xl border border-slate-900 max-w-[340px] w-full aspect-square`}>
          {board.map((cell, idx) => {
            const isHighlight = bestMove?.tile === cell;
            return (
              <button
                key={idx}
                disabled={cell === 0}
                onClick={() => handleCellClick(idx)}
                className={`flex items-center justify-center text-2xl font-extrabold aspect-square rounded-xl transition-all
                  ${cell === 0 ? 'bg-transparent cursor-default' : 'bg-[#1E293B] hover:bg-[#334155] border border-slate-800 text-slate-100 shadow-md'}
                  ${isHighlight ? 'ring-4 ring-emerald-500 animate-pulse bg-emerald-950/30' : ''}
                `}
              >
                {cell !== 0 ? cell : ''}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-muted text-center italic">Click adjacent numbers to slide them into the empty slot.</p>
      </div>
    );
  }

  // RUBIK'S CUBE EDITOR
  if (normalizedGame === 'rubikscube' || normalizedGame === 'rubik') {
    // 54 sticker list representation
    const board = typeof state === 'string' ? state.split('') : Array(54).fill('W');
    
    // Rubik face names and colors palette
    const faces = [
      { name: 'U', label: 'Up (White)', offset: 9 * 0, colorClass: 'bg-slate-100 text-slate-900' },
      { name: 'L', label: 'Left (Orange)', offset: 9 * 4, colorClass: 'bg-orange-500 text-white' },
      { name: 'F', label: 'Front (Green)', offset: 9 * 2, colorClass: 'bg-emerald-600 text-white' },
      { name: 'R', label: 'Right (Red)', offset: 9 * 1, colorClass: 'bg-red-600 text-white' },
      { name: 'B', label: 'Back (Blue)', offset: 9 * 5, colorClass: 'bg-blue-600 text-white' },
      { name: 'D', label: 'Down (Yellow)', offset: 9 * 3, colorClass: 'bg-yellow-400 text-slate-900' }
    ];

    const rubikColors: Record<string, string> = {
      'W': '#F8FAFC', 'Y': '#FACC15', 'R': '#EF4444', 
      'O': '#F97316', 'G': '#10B981', 'B': '#3B82F6'
    };

    const colorLabels: Record<string, string> = {
      'W': 'White', 'Y': 'Yellow', 'R': 'Red', 'O': 'Orange', 'G': 'Green', 'B': 'Blue'
    };

    const handleStickerClick = (faceOffset: number, stickerIdx: number) => {
      setSelectedCell(faceOffset + stickerIdx);
    };

    const selectColor = (colorChar: string) => {
      if (selectedCell !== null) {
        const newBoard = [...board];
        newBoard[selectedCell] = colorChar;
        onChangeState(newBoard.join(''));
        setSelectedCell(null);
      }
    };

    // Render active face stickers
    const activeFaceObj = faces.find(f => f.name === rubikSelectedFace)!;
    const faceStickers = board.slice(activeFaceObj.offset, activeFaceObj.offset + 9);

    return (
      <div className="flex flex-col items-center gap-4 w-full">
        {/* Face selector */}
        <div className="flex items-center gap-2 flex-wrap justify-center max-w-[400px]">
          {faces.map(f => (
            <button
              key={f.name}
              onClick={() => setRubikSelectedFace(f.name)}
              className={`px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-1
                ${rubikSelectedFace === f.name ? 'bg-accent text-white ring-2 ring-amber-400' : 'bg-card text-muted hover:text-white'}
              `}
            >
              {f.name} ({f.label.split(' ')[0]})
            </button>
          ))}
        </div>

        {/* 3x3 active face grid */}
        <div className="flex flex-col items-center p-4 bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-[320px] aspect-square justify-center">
          <p className="text-xs text-muted mb-2 font-bold">{activeFaceObj.label} Face</p>
          <div className="grid grid-cols-3 gap-1.5 w-full aspect-square p-2 bg-slate-950 rounded-xl">
            {faceStickers.map((color, idx) => {
              const stickerGlobalIdx = activeFaceObj.offset + idx;
              return (
                <button
                  key={idx}
                  onClick={() => handleStickerClick(activeFaceObj.offset, idx)}
                  style={{ backgroundColor: rubikColors[color] || '#475569' }}
                  className={`aspect-square rounded-md transition-all hover:scale-105 border border-black/30 flex items-center justify-center
                    ${selectedCell === stickerGlobalIdx ? 'ring-4 ring-white animate-pulse' : ''}
                  `}
                >
                  {/* Center stickers define the face and shouldn't be edited if possible */}
                  {idx === 4 && <span className="text-[9px] font-bold mix-blend-difference text-white">CENTER</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Color picker */}
        {selectedCell !== null && (
          <div className="bg-card p-3 rounded-xl border border-border w-full max-w-[320px] shadow-lg animate-in fade-in zoom-in-95 duration-150">
            <p className="text-xs text-muted mb-2 text-center">Pick color for sticker {selectedCell % 9 + 1}:</p>
            <div className="grid grid-cols-6 gap-2">
              {Object.keys(rubikColors).map((colorChar) => (
                <button
                  key={colorChar}
                  onClick={() => selectColor(colorChar)}
                  style={{ backgroundColor: rubikColors[colorChar] }}
                  className="aspect-square rounded-lg border border-black/30 hover:scale-110 transition duration-150"
                  title={colorLabels[colorChar]}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return <div className="text-center text-red-500">Board editor not implemented for this game.</div>;
}
