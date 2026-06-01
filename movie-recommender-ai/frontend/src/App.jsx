import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Watchlist from './pages/Watchlist';
import Chat from './pages/Chat';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import Login from './pages/Login';
import MovieDetails from './pages/MovieDetails';

function AppContent() {
  const { currentUser } = useAuth();
  const [activePage, setActivePage] = useState('home');
  const [selectedMovie, setSelectedMovie] = useState(null);

  // If not authenticated, render Login/Signup page
  if (!currentUser) {
    return <Login />;
  }

  // Active page selector
  const renderActivePage = () => {
    switch (activePage) {
      case 'home':
        return <Home onSelectMovie={setSelectedMovie} />;
      case 'watchlist':
        return <Watchlist onSelectMovie={setSelectedMovie} setActivePage={setActivePage} />;
      case 'chat':
        return <Chat />;
      case 'analytics':
        return <Dashboard />;
      case 'admin':
        return <Admin />;
      default:
        return <Home onSelectMovie={setSelectedMovie} />;
    }
  };

  return (
    <div className="min-h-screen bg-netflix-black text-white flex flex-col font-sans">
      {/* Sticky Header */}
      <Navbar activePage={activePage} setActivePage={setActivePage} />
      
      {/* Active Screen Grid layout */}
      <main className="flex-grow">
        {renderActivePage()}
      </main>

      {/* Details overlay modal */}
      {selectedMovie && (
        <MovieDetails 
          movie={selectedMovie} 
          onClose={() => setSelectedMovie(null)} 
        />
      )}

      {/* Footer footer */}
      <footer className="w-full py-8 mt-auto text-center border-t border-white/5 text-xs text-gray-600 bg-[#111]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between px-6 gap-3">
          <span className="font-semibold tracking-wider text-gray-500 uppercase">
            CineMate © 2026
          </span>
          <p>
            Powered by FastAPI, React, TensorFlow (LSTM), and Google Gemini API.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
