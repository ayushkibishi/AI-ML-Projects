import React, { useState, useEffect } from 'react';
import { movieService } from '../services/api';
import GlassCard from '../components/GlassCard';
import SkeletonLoader from '../components/SkeletonLoader';
import { Search, SlidersHorizontal, RefreshCw, X, Play, Plus, Info, Heart } from 'lucide-react';

export default function Home({ onSelectMovie }) {
  // Movie lists state
  const [recommendations, setRecommendations] = useState([]);
  const [trending, setTrending] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [sciFiMovies, setSciFiMovies] = useState([]);
  const [actionMovies, setActionMovies] = useState([]);
  
  // Search state
  const [searchActive, setSearchActive] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [minRating, setMinRating] = useState('');
  const [genresList, setGenresList] = useState([]);
  
  // App UI states
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [heroMovie, setHeroMovie] = useState(null);

  // Load initial data
  useEffect(() => {
    async function loadBrowseData() {
      setLoading(true);
      try {
        // Fetch recommendations and trending
        const recData = await movieService.getRecommendations({ limit: 10 });
        setRecommendations(recData.recommendations || []);
        setTrending(recData.trending || []);
        
        // Fetch user watchlist
        const watchData = await movieService.getWatchlist();
        setWatchlist(watchData || []);
        
        // Set hero banner movie (Interstellar if available, otherwise first recommendation/trending)
        const interstellar = recData.recommendations.find(m => m.movieId === 109487) || 
                             recData.trending.find(m => m.movieId === 109487);
        setHeroMovie(interstellar || recData.recommendations[0] || recData.trending[0] || null);

        // Fetch genres
        const genres = await movieService.getGenres();
        setGenresList(genres || []);

        // Load specific rails
        const sf = await movieService.searchMovies({ genre: 'Sci-Fi', limit: 10 });
        setSciFiMovies(sf.results || []);
        const act = await movieService.searchMovies({ genre: 'Action', limit: 10 });
        setActionMovies(act.results || []);

      } catch (err) {
        console.error("Error loading home browse data: ", err);
      } finally {
        setLoading(false);
      }
    }
    
    loadBrowseData();
  }, []);

  // Handle Watchlist Toggles
  const handleWatchlistToggle = async (movie) => {
    const isAlreadyIn = watchlist.some(m => m.movieId === movie.movieId);
    try {
      if (isAlreadyIn) {
        // Remove
        await movieService.removeFromWatchlist(movie.movieId);
        setWatchlist(prev => prev.filter(m => m.movieId !== movie.movieId));
      } else {
        // Add
        await movieService.addToWatchlist(movie.movieId, movie.title_clean || movie.title, movie.tmdbId);
        // Fetch updated watchlist to get exact schema object
        const updated = await movieService.getWatchlist();
        setWatchlist(updated || []);
      }
    } catch (err) {
      console.error("Error toggling watchlist: ", err);
    }
  };

  // Perform search
  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    
    // Check if any filter is set
    if (!searchQuery && !selectedGenre && !selectedYear && !minRating) {
      setSearchActive(false);
      return;
    }
    
    setSearchActive(true);
    setSearchLoading(true);
    
    try {
      const results = await movieService.searchMovies({
        query: searchQuery || undefined,
        genre: selectedGenre || undefined,
        year: selectedYear ? parseInt(selectedYear) : undefined,
        min_rating: minRating ? parseFloat(minRating) : undefined,
        limit: 30
      });
      setSearchResults(results.results || []);
    } catch (err) {
      console.error("Search failed: ", err);
    } finally {
      setSearchLoading(false);
    }
  };

  // Clear filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedGenre('');
    setSelectedYear('');
    setMinRating('');
    setSearchActive(false);
    setSearchResults([]);
  };

  // Re-trigger search when filters update
  useEffect(() => {
    if (selectedGenre || selectedYear || minRating) {
      handleSearch();
    }
  }, [selectedGenre, selectedYear, minRating]);

  return (
    <div className="pb-16 px-4 md:px-8 max-w-7xl mx-auto flex flex-col gap-10">
      
      {/* Search and Filters panel */}
      <form onSubmit={handleSearch} className="w-full flex flex-col md:flex-row gap-4 mt-6 p-4 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md">
        
        {/* Keyword Search */}
        <div className="relative flex-grow">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search movie titles (e.g. Inception, Toy Story)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-netflix-red/50 transition"
          />
        </div>
        
        {/* Filters Box */}
        <div className="flex flex-wrap md:flex-nowrap gap-3">
          {/* Genre select */}
          <select
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="px-3.5 py-3 rounded-xl bg-netflix-darkGray border border-white/10 text-gray-300 text-sm focus:outline-none focus:border-netflix-red/50 transition cursor-pointer"
          >
            <option value="">All Genres</option>
            {genresList.map(g => <option key={g} value={g}>{g}</option>)}
          </select>

          {/* Year input */}
          <input
            type="number"
            placeholder="Year"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-24 px-3.5 py-3 rounded-xl bg-netflix-darkGray border border-white/10 text-gray-300 text-sm focus:outline-none focus:border-netflix-red/50 transition text-center"
          />

          {/* Rating */}
          <select
            value={minRating}
            onChange={(e) => setMinRating(e.target.value)}
            className="px-3.5 py-3 rounded-xl bg-netflix-darkGray border border-white/10 text-gray-300 text-sm focus:outline-none focus:border-netflix-red/50 transition cursor-pointer"
          >
            <option value="">Any Rating</option>
            <option value="4.5">★ 4.5+</option>
            <option value="4.0">★ 4.0+</option>
            <option value="3.5">★ 3.5+</option>
            <option value="3.0">★ 3.0+</option>
          </select>
          
          <button
            type="submit"
            className="px-5 py-3 rounded-xl bg-netflix-red hover:bg-red-700 text-white text-sm font-bold transition shadow-md flex items-center justify-center gap-1.5"
          >
            <Search className="w-4 h-4" />
            Find
          </button>

          {(searchActive || searchQuery || selectedGenre || selectedYear || minRating) && (
            <button
              type="button"
              onClick={clearFilters}
              className="p-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white transition flex items-center justify-center"
              title="Reset Filters"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>

      {searchActive ? (
        // Search Results view
        <div className="flex flex-col gap-6">
          <h2 className="text-xl md:text-2xl font-bold border-l-4 border-netflix-red pl-3 flex items-center gap-2">
            Search Results
            <span className="text-xs text-gray-500 font-normal">({searchResults.length} found)</span>
          </h2>
          
          {searchLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-[320px] md:h-[360px] rounded-2xl bg-white/5 border border-white/5 animate-pulse" />
              ))}
            </div>
          ) : searchResults.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {searchResults.map((movie) => (
                <GlassCard
                  key={movie.movieId}
                  movie={movie}
                  onClick={onSelectMovie}
                  onWatchlistToggle={handleWatchlistToggle}
                  isWatchlisted={watchlist.some(m => m.movieId === movie.movieId)}
                />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center rounded-3xl border border-white/5 bg-white/[0.01]">
              <p className="text-gray-400">No movies match your filters.</p>
              <button onClick={clearFilters} className="mt-4 text-sm text-netflix-red hover:underline font-bold">
                Clear all filters and show home browse
              </button>
            </div>
          )}
        </div>
      ) : (
        // Default Browse Dashboard
        <>
          {/* Spotlight Hero Banner */}
          {loading ? (
            <SkeletonLoader type="hero" />
          ) : (
            heroMovie && (
              <div 
                className="relative w-full h-[55vh] md:h-[65vh] rounded-[2.5rem] overflow-hidden shadow-2xl group border border-white/10"
              >
                {/* Background image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-105"
                  style={{ backgroundImage: `url(${heroMovie.poster_url || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200'})` }}
                />
                
                {/* Glowing Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-netflix-black via-netflix-black/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-netflix-black/85 via-netflix-black/30 to-transparent" />

                {/* Hero contents */}
                <div className="absolute inset-x-0 bottom-0 p-8 md:p-16 flex flex-col justify-end items-start gap-4 max-w-2xl">
                  {/* Genre tag */}
                  <span className="px-3.5 py-1.5 rounded-xl bg-netflix-red/95 font-bold text-xs tracking-wider uppercase shadow-md shadow-netflix-red/30">
                    💡 Spotlit AI recommendation
                  </span>

                  {/* Title */}
                  <h1 className="text-3xl md:text-5xl font-black text-white leading-tight drop-shadow-lg">
                    {heroMovie.title_clean}
                  </h1>

                  {/* Rating + details */}
                  <div className="flex items-center gap-4 text-sm font-semibold text-gray-300">
                    <span className="flex items-center gap-1 text-amber-400">
                      ★ {heroMovie.imdb_rating ? heroMovie.imdb_rating.toFixed(1) : '8.7'}
                    </span>
                    <span>•</span>
                    <span>{heroMovie.year}</span>
                    <span>•</span>
                    <span>{heroMovie.runtime ? `${heroMovie.runtime} min` : '169 min'}</span>
                  </div>

                  {/* Overview */}
                  <p className="text-gray-400 text-sm md:text-base leading-relaxed line-clamp-3 mb-2">
                    {heroMovie.overview || "Embark on an epic space adventure that pushes the boundaries of human discovery and emotional bonds across time and space."}
                  </p>

                  {/* CTA Buttons */}
                  <div className="flex gap-4 w-full sm:w-auto">
                    <button 
                      onClick={() => onSelectMovie(heroMovie)}
                      className="px-6 py-3.5 bg-white text-black font-extrabold text-sm rounded-xl hover:bg-gray-200 transition shadow-lg flex items-center justify-center gap-2 flex-grow sm:flex-grow-0 active:scale-95"
                    >
                      <Play className="w-4 h-4 fill-black" />
                      View Details
                    </button>
                    
                    <button 
                      onClick={() => handleWatchlistToggle(heroMovie)}
                      className={`px-6 py-3.5 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 border flex-grow sm:flex-grow-0 active:scale-95 ${
                        watchlist.some(m => m.movieId === heroMovie.movieId)
                          ? 'bg-netflix-red border-netflix-red text-white'
                          : 'bg-black/45 border-white/10 hover:bg-white/10 text-white'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      {watchlist.some(m => m.movieId === heroMovie.movieId) ? 'My List' : 'Add to List'}
                    </button>
                  </div>
                </div>
              </div>
            )
          )}

          {/* horizontally scrolling rails */}
          
          {/* AI recommendations rail */}
          <div className="flex flex-col gap-3">
            <h2 className="text-lg md:text-xl font-bold border-l-4 border-netflix-red pl-3 flex items-center gap-2.5">
              <span>Tailored For You</span>
              <span className="text-[10px] text-gray-500 font-semibold px-2 py-0.5 border border-white/10 rounded-md bg-white/5 uppercase">Deep Learning LSTM + CF</span>
            </h2>
            {loading ? (
              <SkeletonLoader count={5} />
            ) : recommendations.length > 0 ? (
              <div className="flex gap-5 overflow-x-auto pb-4 pt-1 snap-x scrollbar-thin">
                {recommendations.map((movie) => (
                  <GlassCard
                    key={movie.movieId}
                    movie={movie}
                    onClick={onSelectMovie}
                    onWatchlistToggle={handleWatchlistToggle}
                    isWatchlisted={watchlist.some(m => m.movieId === movie.movieId)}
                  />
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 rounded-2xl border border-white/5">
                No recommendations found. Rate a few movies to personalize your recommendations list!
              </div>
            )}
          </div>

          {/* Watchlist rail */}
          {watchlist.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-lg md:text-xl font-bold border-l-4 border-netflix-red pl-3 flex items-center gap-2.5">
                <Heart className="w-4 h-4 text-netflix-red fill-netflix-red" />
                <span>My Watchlist</span>
                <span className="text-xs text-gray-500 font-normal">({watchlist.length})</span>
              </h2>
              <div className="flex gap-5 overflow-x-auto pb-4 pt-1 snap-x">
                {watchlist.map((movie) => (
                  <GlassCard
                    key={movie.movieId}
                    movie={{
                      ...movie,
                      // Ensure properties mapping matches backend details
                      title_clean: movie.title, 
                      imdb_rating: movie.rating || 7.0,
                      poster_url: tmdb_client._get_fallback_poster(movie.genres) // client fallback
                    }}
                    onClick={onSelectMovie}
                    onWatchlistToggle={handleWatchlistToggle}
                    isWatchlisted={true}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Trending rail */}
          <div className="flex flex-col gap-3">
            <h2 className="text-lg md:text-xl font-bold border-l-4 border-netflix-red pl-3">
              Trending Worldwide
            </h2>
            {loading ? (
              <SkeletonLoader count={5} />
            ) : trending.length > 0 ? (
              <div className="flex gap-5 overflow-x-auto pb-4 pt-1 snap-x">
                {trending.map((movie) => (
                  <GlassCard
                    key={movie.movieId}
                    movie={movie}
                    onClick={onSelectMovie}
                    onWatchlistToggle={handleWatchlistToggle}
                    isWatchlisted={watchlist.some(m => m.movieId === movie.movieId)}
                  />
                ))}
              </div>
            ) : null}
          </div>

          {/* Sci Fi rail */}
          <div className="flex flex-col gap-3">
            <h2 className="text-lg md:text-xl font-bold border-l-4 border-netflix-red pl-3">
              Science Fiction & Space Exploration
            </h2>
            {loading ? (
              <SkeletonLoader count={5} />
            ) : sciFiMovies.length > 0 ? (
              <div className="flex gap-5 overflow-x-auto pb-4 pt-1 snap-x">
                {sciFiMovies.map((movie) => (
                  <GlassCard
                    key={movie.movieId}
                    movie={movie}
                    onClick={onSelectMovie}
                    onWatchlistToggle={handleWatchlistToggle}
                    isWatchlisted={watchlist.some(m => m.movieId === movie.movieId)}
                  />
                ))}
              </div>
            ) : null}
          </div>

          {/* Action rail */}
          <div className="flex flex-col gap-3">
            <h2 className="text-lg md:text-xl font-bold border-l-4 border-netflix-red pl-3">
              Action & High-Octane Thrillers
            </h2>
            {loading ? (
              <SkeletonLoader count={5} />
            ) : actionMovies.length > 0 ? (
              <div className="flex gap-5 overflow-x-auto pb-4 pt-1 snap-x">
                {actionMovies.map((movie) => (
                  <GlassCard
                    key={movie.movieId}
                    movie={movie}
                    onClick={onSelectMovie}
                    onWatchlistToggle={handleWatchlistToggle}
                    isWatchlisted={watchlist.some(m => m.movieId === movie.movieId)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </>
      )}

    </div>
  );
}

// Simple local client fallback mapping for helper functions inside component
const tmdb_client = {
  _get_fallback_poster: (genres_list) => {
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
};
