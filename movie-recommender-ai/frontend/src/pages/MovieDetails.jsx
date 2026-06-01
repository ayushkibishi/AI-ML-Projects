import React, { useState, useEffect } from 'react';
import { movieService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { X, Star, Clock, User, MessageSquare, Compass, Send, CheckCircle2 } from 'lucide-react';

export default function MovieDetails({ movie, onClose }) {
  const { currentUser } = useAuth();
  
  // Movie details state
  const [details, setDetails] = useState(movie);
  const [reviews, setReviews] = useState([]);
  const [sentimentSummary, setSentimentSummary] = useState({ positive: 0, negative: 0, neutral: 1 });
  const [loading, setLoading] = useState(true);
  
  // Rating and review form state
  const [userRating, setUserRating] = useState(0);
  const [reviewContent, setReviewContent] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  useEffect(() => {
    async function fetchFullDetailsAndReviews() {
      setLoading(true);
      try {
        // 1. Fetch full details (includes TMDB overview, cast, trailer)
        const fullDetails = await movieService.getMovieDetails(movie.movieId);
        setDetails(fullDetails);
        
        // 2. Fetch reviews
        const reviewData = await movieService.getMovieReviews(movie.movieId);
        setReviews(reviewData.reviews || []);
        if (reviewData.summary && reviewData.summary.count > 0) {
          setSentimentSummary(reviewData.summary.average_sentiment);
        }

        // 3. Find if user already rated this in their watchlist
        const watchlist = await movieService.getWatchlist();
        const watchedItem = watchlist.find(m => m.movieId === movie.movieId);
        if (watchedItem && watchedItem.rating) {
          setUserRating(watchedItem.rating);
          setRatingSubmitted(true);
        }
      } catch (err) {
        console.error("Error loading movie details/reviews: ", err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchFullDetailsAndReviews();
  }, [movie.movieId]);

  // Submit Rating
  const handleRatingSubmit = async (ratingVal) => {
    setUserRating(ratingVal);
    try {
      await movieService.submitRating(movie.movieId, ratingVal);
      setRatingSubmitted(true);
    } catch (err) {
      console.error("Failed to submit rating: ", err);
    }
  };

  // Submit Review
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewContent.trim() || reviewContent.length < 5) return;
    
    setReviewLoading(true);
    try {
      const result = await movieService.submitReview(movie.movieId, reviewContent);
      setReviews(prev => [result.review, ...prev]);
      
      // Re-fetch reviews to update summary average sentiment
      const updatedReviews = await movieService.getMovieReviews(movie.movieId);
      setReviews(updatedReviews.reviews || []);
      if (updatedReviews.summary) {
        setSentimentSummary(updatedReviews.summary.average_sentiment);
      }
      
      setReviewContent('');
      setReviewSubmitted(true);
      setTimeout(() => setReviewSubmitted(false), 3000);
    } catch (err) {
      console.error("Failed to submit review: ", err);
    } finally {
      setReviewLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-netflix-black/85 backdrop-blur-md flex items-center justify-center p-4">
      {/* Click outside backdrop to close */}
      <div className="fixed inset-0 cursor-pointer" onClick={onClose} />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-4xl rounded-3xl overflow-hidden glass-panel border border-white/10 shadow-2xl flex flex-col max-h-[90vh] z-10">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-xl bg-black/50 text-gray-400 hover:text-white hover:bg-netflix-red transition"
        >
          <X className="w-5 h-5" />
        </button>

        {loading ? (
          // Loading spinner
          <div className="py-40 flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-netflix-red border-t-transparent animate-spin" />
            <p className="text-sm text-gray-400">Assembling cinematic metadata...</p>
          </div>
        ) : (
          <div className="overflow-y-auto flex-grow">
            
            {/* Trailer / Backdrop Header Section */}
            <div className="relative w-full h-[35vh] sm:h-[45vh] bg-black">
              {details.trailer_url ? (
                <iframe
                  title={`${details.title_clean} Trailer`}
                  src={`${details.trailer_url}?autoplay=0&mute=0`}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div 
                  className="w-full h-full bg-cover bg-center" 
                  style={{ backgroundImage: `url(${details.poster_url})` }}
                />
              )}
              {/* Bottom Gradient overlay */}
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-netflix-darkGray to-transparent pointer-events-none" />
            </div>

            {/* Movie details core */}
            <div className="p-6 md:p-8 flex flex-col gap-6 bg-netflix-darkGray">
              
              {/* Title & Metadata row */}
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl md:text-3xl font-black text-white">{details.title_clean}</h2>
                  <span className="px-2.5 py-1 rounded bg-white/10 font-bold text-xs text-gray-300">
                    {details.year}
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-gray-400">
                  <span className="flex items-center gap-1 text-amber-400">
                    <Star className="w-4 h-4 fill-amber-400" />
                    IMDb {details.imdb_rating ? details.imdb_rating.toFixed(1) : '7.5'}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {details.runtime ? `${details.runtime} mins` : '120 mins'}
                  </span>
                  <span>•</span>
                  <span className="text-gray-300">
                    {Array.isArray(details.genres) 
                      ? details.genres.join(', ') 
                      : (typeof details.genres === 'string' 
                          ? details.genres.replace(/\|/g, ', ') 
                          : '')}
                  </span>
                </div>
              </div>

              {/* Explainable AI Block */}
              {movie.explanation && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-netflix-red/10 border border-netflix-red/20">
                  <Compass className="w-5 h-5 text-netflix-red flex-shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-netflix-red uppercase tracking-wider">AI Taste Explanation</span>
                    <span className="text-sm text-gray-300 font-sans">{movie.explanation}</span>
                  </div>
                </div>
              )}

              {/* Overview & Cast Column */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Description */}
                <div className="md:col-span-2 flex flex-col gap-2">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-gray-400">Overview</h4>
                  <p className="text-gray-300 text-sm leading-relaxed">{details.overview}</p>
                </div>
                
                {/* Cast details */}
                <div className="flex flex-col gap-2">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-gray-400">Cast Members</h4>
                  <p className="text-gray-300 text-sm leading-relaxed">{details.cast}</p>
                  
                  {/* Rating Module */}
                  <div className="mt-4 flex flex-col gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      {ratingSubmitted ? 'Your Submitted Rating' : 'Rate This Movie'}
                    </h4>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => handleRatingSubmit(star)}
                          className="focus:outline-none transition-transform hover:scale-110"
                        >
                          <Star 
                            className={`w-6 h-6 ${
                              star <= userRating 
                                ? 'text-amber-400 fill-amber-400' 
                                : 'text-gray-600 hover:text-amber-300'
                            }`} 
                          />
                        </button>
                      ))}
                      {userRating > 0 && (
                        <span className="text-sm font-bold text-amber-400 ml-1.5">{userRating.toFixed(1)} / 5.0</span>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Divider */}
              <div className="border-t border-white/5 my-2" />

              {/* Sentiment Analyzer Gauge */}
              <div className="flex flex-col gap-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-netflix-red" />
                  NLP Sentiment Summary
                  <span className="text-xs text-gray-500 font-normal">({reviews.length} reviews analyzed)</span>
                </h3>

                {reviews.length > 0 ? (
                  <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-3 max-w-md">
                    <div className="flex items-center justify-between text-xs font-bold text-gray-400">
                      <span>Sentiment Distribution</span>
                      <span className="text-netflix-red">Real-Time AI Gauge</span>
                    </div>

                    {/* Progress bars */}
                    <div className="flex flex-col gap-2.5 mt-1.5">
                      {/* Positive */}
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-xs font-semibold text-emerald-400">
                          <span>Positive</span>
                          <span>{Math.round(sentimentSummary.positive * 100)}%</span>
                        </div>
                        <div className="w-full h-2 rounded bg-black/40 overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 transition-all duration-500" 
                            style={{ width: `${sentimentSummary.positive * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Neutral */}
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-xs font-semibold text-gray-400">
                          <span>Neutral</span>
                          <span>{Math.round(sentimentSummary.neutral * 100)}%</span>
                        </div>
                        <div className="w-full h-2 rounded bg-black/40 overflow-hidden">
                          <div 
                            className="h-full bg-gray-500 transition-all duration-500" 
                            style={{ width: `${sentimentSummary.neutral * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Negative */}
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-xs font-semibold text-red-400">
                          <span>Negative</span>
                          <span>{Math.round(sentimentSummary.negative * 100)}%</span>
                        </div>
                        <div className="w-full h-2 rounded bg-black/40 overflow-hidden">
                          <div 
                            className="h-full bg-red-500 transition-all duration-500" 
                            style={{ width: `${sentimentSummary.negative * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">No review sentiment metrics computed yet. Write a review to activate the gauge.</p>
                )}
              </div>

              {/* Reviews write & lists */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Submit review */}
                <div className="flex flex-col gap-3">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-gray-400">Write a Review</h4>
                  
                  {reviewSubmitted && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                      <CheckCircle2 className="w-4.5 h-4.5" />
                      <span>Review submitted & scored by AI sentiment analyzer!</span>
                    </div>
                  )}

                  <form onSubmit={handleReviewSubmit} className="flex flex-col gap-3">
                    <textarea
                      placeholder="Write your review here... Be descriptive (minimum 5 characters) so the NLP BERT model can accurately classify your tone."
                      rows="4"
                      value={reviewContent}
                      onChange={(e) => setReviewContent(e.target.value)}
                      className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-netflix-red/50 transition resize-none"
                    />
                    <button
                      type="submit"
                      disabled={reviewLoading || reviewContent.trim().length < 5}
                      className="self-end px-5 py-3 rounded-xl bg-netflix-red hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs transition flex items-center gap-1.5 active:scale-95 shadow-md shadow-netflix-red/10"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Analyze & Post
                    </button>
                  </form>
                </div>

                {/* Reviews list */}
                <div className="flex flex-col gap-4">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-gray-400">User Reviews</h4>
                  
                  {reviews.length > 0 ? (
                    <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto pr-2">
                      {reviews.map((rev) => {
                        const score = rev.sentiment?.sentiment || 'neutral';
                        const scoreColor = score === 'positive' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 
                                           score === 'negative' ? 'text-red-400 border-red-500/30 bg-red-500/10' : 
                                           'text-gray-400 border-white/10 bg-white/5';
                        return (
                          <div key={rev.id} className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 flex flex-col gap-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1.5 font-bold text-gray-300">
                                <User className="w-3.5 h-3.5 text-gray-500" />
                                {rev.userEmail ? rev.userEmail.split('@')[0] : 'user'}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[10px] border font-bold capitalize ${scoreColor}`}>
                                {score}
                              </span>
                            </div>
                            <p className="text-gray-400 text-xs leading-relaxed">{rev.content}</p>
                            <span className="text-[10px] text-gray-600 font-medium self-end">
                              {new Date(rev.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic py-6">No reviews posted yet. Be the first!</p>
                  )}
                </div>

              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
