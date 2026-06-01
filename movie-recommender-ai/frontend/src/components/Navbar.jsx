import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Film, User, LogOut, MessageSquare, BarChart2, Heart, Shield } from 'lucide-react';

export default function Navbar({ activePage, setActivePage }) {
  const { currentUser, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Browse', icon: Film },
    { id: 'watchlist', label: 'My List', icon: Heart },
    { id: 'chat', label: 'AI Chat', icon: MessageSquare },
    { id: 'analytics', label: 'Taste Profile', icon: BarChart2 },
    { id: 'admin', label: 'Admin Panel', icon: Shield }
  ];

  return (
    <nav className="sticky top-0 z-50 w-full px-6 py-4 transition-all duration-300 bg-opacity-70 bg-netflix-black backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActivePage('home')}>
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-netflix-red to-red-500 shadow-lg shadow-netflix-red/30">
            <Film className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-wider text-white uppercase font-sans">
            Cine<span className="text-netflix-red text-glow">Mate</span>
          </span>
        </div>

        {/* Navigation Items */}
        <div className="hidden md:flex items-center gap-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'text-netflix-red bg-netflix-red/10 border-b-2 border-netflix-red' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Profile Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1 rounded-full hover:bg-white/5 transition-all duration-200"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
              {currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : 'US'}
            </div>
            <span className="hidden sm:inline text-sm font-medium text-gray-300 hover:text-white">
              {currentUser?.name || 'Account'}
            </span>
          </button>

          {dropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-10 w-full h-full" 
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-3 w-56 rounded-xl border border-white/10 bg-netflix-darkGray shadow-2xl p-2 z-20 backdrop-blur-xl">
                <div className="px-3 py-2.5 border-b border-white/5 mb-1.5">
                  <p className="text-xs text-gray-500">Logged in as</p>
                  <p className="text-sm font-medium text-white truncate">{currentUser?.email}</p>
                </div>
                
                {/* Mobile navigation duplicate */}
                <div className="md:hidden flex flex-col mb-1 border-b border-white/5 pb-1">
                  {navItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActivePage(item.id);
                        setDropdownOpen(false);
                      }}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left ${
                        activePage === item.id ? 'text-netflix-red bg-netflix-red/10' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    logout();
                    setDropdownOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-red-600/10 hover:text-red-500 transition-all duration-150"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </nav>
  );
}
