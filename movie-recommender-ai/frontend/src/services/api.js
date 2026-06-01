import axios from 'axios';

// Get API URL from environment, fallback to localhost FastAPI port
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to automatically inject bearer auth token
api.interceptors.request.use(
  (config) => {
    // We retrieve the token from localStorage or context state.
    // For convenience in this interceptor, we can pull the currentUser token 
    // from state, or check localStorage session (for mock) / Firebase token cache.
    // To make it easy, we read from the user session. 
    // The easiest way is to read the cached token from local storage or from
    // the AuthContext. The AuthContext stores token in currentUser. We can fetch it
    // from a global variable set by AuthContext or just read it from localStorage
    // since the currentUser is persisted or we fetch it dynamically.
    // Let's check for both standard firebase tokens and local mock session storage.
    let token = null;
    
    // Check local storage mock session
    const mockSession = localStorage.getItem("mock_session");
    if (mockSession) {
      try {
        const user = JSON.parse(mockSession);
        token = `mock-token-${user.email.split('@')[0]}`;
      } catch (e) {
        // ignore
      }
    }
    
    // Fallback: Check if Firebase token is stored under a general key
    const firebaseSession = localStorage.getItem("firebase_token");
    if (firebaseSession) {
      token = firebaseSession;
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const movieService = {
  searchMovies: async (params) => {
    const response = await api.get('/movies/search', { params });
    return response.data;
  },
  
  getGenres: async () => {
    const response = await api.get('/movies/genres');
    return response.data;
  },
  
  getMovieDetails: async (movieId) => {
    const response = await api.get(`/movies/${movieId}`);
    return response.data;
  },
  
  getMovieReviews: async (movieId) => {
    const response = await api.get(`/movies/${movieId}/reviews`);
    return response.data;
  },
  
  submitReview: async (movieId, content) => {
    const response = await api.post(`/movies/${movieId}/review`, { content });
    return response.data;
  },
  
  submitRating: async (movieId, rating) => {
    const response = await api.post(`/movies/${movieId}/rate`, { rating });
    return response.data;
  },
  
  // Watchlist
  getWatchlist: async () => {
    const response = await api.get('/movies/watchlist/all');
    return response.data;
  },
  
  addToWatchlist: async (movieId, title, tmdbId) => {
    const response = await api.post('/movies/watchlist/add', { movieId, title, tmdbId });
    return response.data;
  },
  
  removeFromWatchlist: async (movieId) => {
    const response = await api.delete(`/movies/watchlist/remove/${movieId}`);
    return response.data;
  },
  
  toggleWatched: async (movieId, value) => {
    const response = await api.post(`/movies/watchlist/${movieId}/watched`, { value });
    return response.data;
  },
  
  toggleFavorite: async (movieId, value) => {
    const response = await api.post(`/movies/watchlist/${movieId}/favorite`, { value });
    return response.data;
  },
  
  // Recommendations
  getRecommendations: async (params) => {
    const response = await api.get('/recommend/', { params });
    return response.data;
  },
  
  // Chat
  sendChatMessage: async (message) => {
    const response = await api.post('/chat/', { message });
    return response.data;
  },
  
  // Admin
  getAdminStats: async () => {
    const response = await api.get('/admin/stats');
    return response.data;
  },
  
  triggerRetraining: async () => {
    const response = await api.post('/admin/retrain');
    return response.data;
  }
};

export default api;
