import React from 'react';

export default function SkeletonLoader({ type = 'card', count = 5 }) {
  if (type === 'card') {
    return (
      <div className="flex gap-4 overflow-x-hidden py-4">
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className="flex-shrink-0 w-44 md:w-52 h-[320px] md:h-[360px] rounded-2xl bg-white/5 border border-white/5 animate-pulse flex flex-col justify-end p-4 gap-3"
          >
            <div className="h-4 bg-white/10 rounded w-1/3" />
            <div className="h-6 bg-white/10 rounded w-4/5" />
            <div className="h-3 bg-white/10 rounded w-1/2" />
            <div className="h-8 bg-white/10 rounded w-full mt-2" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'hero') {
    return (
      <div className="w-full h-[55vh] md:h-[70vh] rounded-3xl bg-white/5 border border-white/5 animate-pulse flex flex-col justify-end p-8 md:p-16 gap-4">
        <div className="h-4 bg-white/10 rounded w-24" />
        <div className="h-12 bg-white/10 rounded w-2/3 md:w-1/2" />
        <div className="h-6 bg-white/10 rounded w-full md:w-3/4" />
        <div className="flex gap-4 mt-4">
          <div className="h-10 bg-white/10 rounded-xl w-32" />
          <div className="h-10 bg-white/10 rounded-xl w-32" />
        </div>
      </div>
    );
  }

  return null;
}
