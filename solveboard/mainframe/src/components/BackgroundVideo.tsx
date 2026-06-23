import { useEffect, useRef } from 'react';

const VIDEO_URL = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260530_042513_df96a13b-6155-4f6e-8b93-c9dee66fba08.mp4";
const SENSITIVITY = 0.8;

export default function BackgroundVideo() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  // Refs to manage mouse-scrubbing without triggering React re-renders
  const prevXRef = useRef<number | null>(null);
  const targetTimeRef = useRef<number>(0);
  const isSeekingRef = useRef<boolean>(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const video = videoRef.current;
      if (!video || isNaN(video.duration)) return;

      const currentX = e.clientX;
      if (prevXRef.current === null) {
        prevXRef.current = currentX;
        return;
      }

      const deltaX = currentX - prevXRef.current;
      prevXRef.current = currentX;

      // Calculate time offset based on screen width and sensitivity
      const timeOffset = (deltaX / window.innerWidth) * SENSITIVITY * video.duration;
      
      // Update target time and clamp between 0 and video duration
      let nextTime = targetTimeRef.current + timeOffset;
      if (nextTime < 0) nextTime = 0;
      if (nextTime > video.duration) nextTime = video.duration;
      targetTimeRef.current = nextTime;

      // Seek if not currently busy (prevent seek-flooding)
      if (!isSeekingRef.current) {
        isSeekingRef.current = true;
        video.currentTime = nextTime;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const handleSeeked = () => {
    const video = videoRef.current;
    if (!video) return;

    // Check if the targetTime has moved since we started seeking
    if (Math.abs(video.currentTime - targetTimeRef.current) > 0.05) {
      // Perform the queued seek to the latest targetTime
      video.currentTime = targetTimeRef.current;
    } else {
      // Seek complete! Open for new seeks
      isSeekingRef.current = false;
    }
  };

  const handleMouseLeave = () => {
    prevXRef.current = null;
  };

  return (
    <video
      ref={videoRef}
      onSeeked={handleSeeked}
      onLoadedMetadata={(e) => {
        targetTimeRef.current = e.currentTarget.currentTime;
      }}
      src={VIDEO_URL}
      muted
      playsInline
      preload="auto"
      className="fixed inset-0 w-full h-full object-cover z-0 pointer-events-none"
      style={{
        objectPosition: '70% center'
      }}
    />
  );
}
