import React from 'react';
import { motion } from 'framer-motion';
import { Star, Plus, Check, Play, Info } from 'lucide-react';

export default function GlassCard({ movie, onClick, onWatchlistToggle, isWatchlisted }) {
  // Extract info from movie dict
  const { title_clean, year, genres, poster_url, imdb_rating, explanation } = movie;
  
  const displayGenres = Array.isArray(genres) && genres.length > 0 
    ? genres.slice(0, 2).join(' • ') 
    : (typeof genres === 'string' 
        ? genres.split('|').slice(0, 2).join(' • ') 
        : 'Movie');

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      whileHover={{ y: -8, scale: 1.03 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="relative flex-shrink-0 w-44 md:w-52 h-[320px] md:h-[360px] rounded-2xl overflow-hidden glass-card cursor-pointer group shadow-lg"
    >
      {/* Movie Poster Background */}
      <div 
        className="w-full h-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105" 
        style={{ backgroundImage: `url(${poster_url})` }}
      />
      
      {/* Darkness/Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-netflix-black via-netflix-black/60 to-transparent opacity-90 transition-all duration-300 group-hover:via-netflix-black/85" />

      {/* Watchlist Quick Toggle Button (Top-Right) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onWatchlistToggle(movie);
        }}
        className={`absolute top-3 right-3 z-10 flex items-center justify-center w-8 h-8 rounded-xl backdrop-blur-md transition-all duration-200 ${
          isWatchlisted 
            ? 'bg-netflix-red text-white' 
            : 'bg-black/40 text-white hover:bg-netflix-red hover:scale-110 border border-white/10'
        }`}
      >
        {isWatchlisted ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
      </button>

      {/* Info Icon (Top-Left) */}
      <div className="absolute top-3 left-3 z-10 flex items-center justify-center w-8 h-8 rounded-xl bg-black/40 border border-white/10 backdrop-blur-md">
        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
      </div>

      {/* Movie Content */}
      <div 
        className="absolute inset-x-0 bottom-0 p-4 flex flex-col justify-end gap-1.5 transition-all duration-300 group-hover:pb-6"
        onClick={() => onClick(movie)}
      >
        {/* Rating and Year */}
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-300">
          <span className="flex items-center gap-0.5 text-amber-400">
            <Star className="w-3.5 h-3.5 fill-amber-400" />
            {imdb_rating ? imdb_rating.toFixed(1) : '7.0'}
          </span>
          <span>•</span>
          <span>{year || 'N/A'}</span>
        </div>

        {/* Title */}
        <h3 className="text-sm md:text-base font-bold text-white leading-tight line-clamp-2 drop-shadow-md">
          {title_clean}
        </h3>

        {/* Genres */}
        <p className="text-[11px] text-gray-400 truncate">
          {displayGenres}
        </p>

        {/* Action icons shown on hover */}
        <div className="h-0 opacity-0 group-hover:h-8 group-hover:opacity-100 flex items-center gap-2 mt-2 transition-all duration-300 overflow-hidden">
          <button 
            className="flex items-center justify-center gap-1.5 px-3 py-1 bg-white text-black font-bold text-xs rounded-lg hover:bg-gray-200 transition-all w-full"
            onClick={() => onClick(movie)}
          >
            <Play className="w-3 h-3 fill-black" />
            Details
          </button>
        </div>
        
        {/* Explainable AI Reasoning (Small text banner) */}
        {explanation && (
          <div className="text-[10px] text-netflix-red font-semibold font-sans mt-1 line-clamp-1 border-t border-white/5 pt-1">
            {explanation}
          </div>
        )}

      </div>
    </motion.div>
  );
}
