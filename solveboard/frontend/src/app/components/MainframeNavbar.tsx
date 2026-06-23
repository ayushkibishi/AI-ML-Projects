'use client';

import React from 'react';

interface MainframeNavbarProps {
  currentView: 'home' | 'aboutme';
  onViewChange: (view: 'home' | 'aboutme') => void;
  onLaunchSolver: () => void;
}

export default function MainframeNavbar({ 
  currentView, 
  onViewChange, 
  onLaunchSolver 
}: MainframeNavbarProps) {

  const handleLogoClick = () => {
    onViewChange('home');
  };

  return (
    <nav className="fixed top-0 left-0 w-full z-50 px-5 sm:px-8 py-4 sm:py-5 grid grid-cols-3 items-center bg-transparent pointer-events-none font-body">
      {/* Logo (left) */}
      <div className="flex justify-start" />

      {/* AI Name (center) */}
      <div className="flex justify-center">
        <button 
          onClick={handleLogoClick}
          className="text-[21px] sm:text-[26px] tracking-tight font-heading leading-none text-black select-none font-bold bg-transparent border-none cursor-pointer p-0 pointer-events-auto"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          A.R.I.A
        </button>
      </div>

      {/* Empty spacer to keep the center layout perfectly balanced (right) */}
      <div className="flex justify-end" />
    </nav>
  );
}
