import React, { useState, useEffect } from 'react';
import { movieService } from '../services/api';
import GlassCard from '../components/GlassCard';
import { Heart, Search, HelpCircle } from 'lucide-react';

export default function Watchlist({ onSelectMovie, setActivePage }) {
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWatchlist = async () => {
    setLoading(true);
    try {
      const data = await movieService.getWatchlist();
      setWatchlist(data || []);
    } catch (err) {
      console.error("Failed to fetch watchlist: ", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const handleWatchlistToggle = async (movie) => {
    try {
      // Remove since it's already watchlisted on this page
      await movieService.removeFromWatchlist(movie.movieId);
      setWatchlist(prev => prev.filter(m => m.movieId !== movie.movieId));
    } catch (err) {
      console.error("Error removing from watchlist: ", err);
    }
  };

  return (
    <div className="pb-16 px-4 md:px-8 max-w-7xl mx-auto mt-6 flex flex-col gap-6">
      
      {/* Title */}
      <h2 className="text-xl md:text-2xl font-bold border-l-4 border-netflix-red pl-3 flex items-center gap-2">
        <Heart className="w-5 h-5 text-netflix-red fill-netflix-red" />
        My Watchlist
        <span className="text-xs text-gray-500 font-normal">({watchlist.length} movies saved)</span>
      </h2>

      {loading ? (
        // Grid load skeletons
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[320px] md:h-[360px] rounded-2xl bg-white/5 border border-white/5 animate-pulse" />
          ))}
        </div>
      ) : watchlist.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {watchlist.map((movie) => (
            <GlassCard
              key={movie.movieId}
              movie={{
                ...movie,
                title_clean: movie.title, 
                imdb_rating: movie.rating || 7.0,
                // Client fallback poster resolver
                poster_url: movie.poster_url || _get_local_poster(movie.genres)
              }}
              onClick={onSelectMovie}
              onWatchlistToggle={handleWatchlistToggle}
              isWatchlisted={true}
            />
          ))}
        </div>
      ) : (
        // Empty Watchlist prompt
        <div className="py-24 text-center rounded-3xl border border-white/5 bg-white/[0.01] flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-gray-500">
            <Heart className="w-6 h-6" />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-bold text-white">Your List is Empty</h3>
            <p className="text-sm text-gray-400 max-w-sm">Add movies to your watchlist from the browse screen and they will sync here in real time.</p>
          </div>
          <button 
            onClick={() => setActivePage('home')}
            className="mt-2 px-5 py-3 rounded-xl bg-netflix-red hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-1.5 active:scale-95 shadow-md shadow-netflix-red/10"
          >
            <Search className="w-4 h-4" />
            Browse Movies
          </button>
        </div>
      )}

    </div>
  );
}

// Simple fallback genre helper for local watchlist page
function _get_local_poster(genres_list) {
  const GENRE_POSTERS = {
    "action": "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=500&auto=format&fit=crop&q=60",
    "adventure": "https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=500&auto=format&fit=crop&q=60",
    "animation": "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=60",
    "children": "https://images.unsplash.com/photo-1485546246426-74dc88dec4d9?w=500&auto=format&fit=crop&q=60",
    "comedy": "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=500&auto=format&fit=crop&q=60",
    "crime": "https://images.unsplash.com/photo-1453733190148-c44698c265f8?w=500&auto=format&fit=crop&q=60",
    "documentary": "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=500&auto=format&fit=crop&q=60",
    "drama": "https://images.unsplash.com/photo-1478812954026-9c750f0e89fc?w=500&auto=format&fit=crop&q=60",
    "fantasy": "https://images.unsplash.com/photo-1519074069444-1ba4e6663104?w=500&auto=format&fit=crop&q=60",
    "film-noir": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=60",
    "horror": "https://images.unsplash.com/photo-1505635552518-3448ff116af3?w=500&auto=format&fit=crop&q=60",
    "musical": "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=500&auto=format&fit=crop&q=60",
    "mystery": "https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=500&auto=format&fit=crop&q=60",
    "romance": "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=500&auto=format&fit=crop&q=60",
    "sci-fi": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500&auto=format&fit=crop&q=60",
    "thriller": "https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=500&auto=format&fit=crop&q=60",
    "war": "https://images.unsplash.com/photo-1507608869274-d3177c8bb4c7?w=500&auto=format&fit=crop&q=60",
    "western": "https://images.unsplash.com/photo-1533240332313-0db49b439ad3?w=500&auto=format&fit=crop&q=60",
    "default": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60"
  };
  let genres_arr = [];
  if (Array.isArray(genres_list)) {
    genres_arr = genres_list;
  } else if (typeof genres_list === 'string') {
    genres_arr = genres_list.split('|');
  }
  if (genres_arr.length === 0) return GENRE_POSTERS["default"];
  for (let g of genres_arr) {
    let g_low = g.toLowerCase();
    if (GENRE_POSTERS[g_low]) return GENRE_POSTERS[g_low];
  }
  return GENRE_POSTERS["default"];
}
