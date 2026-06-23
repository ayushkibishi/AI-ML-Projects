import { useState, useEffect } from 'react';
import { useTypewriter } from './hooks/useTypewriter';
import BackgroundVideo from './components/BackgroundVideo';
import Navbar from './components/Navbar';

export default function App() {
  const [showActions, setShowActions] = useState(false);
  const [copied, setCopied] = useState(false);

  // Trigger button reveal 400ms after page load
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowActions(true);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const typewriterText = "Glad you stopped in. Good taste tends to find us. Now, what are we building?";
  const { displayed, done } = useTypewriter(typewriterText, 38, 600);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText("hello@mainframe.co");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const whitePills = [
    "Pitch us an idea",
    "Come work here",
    "Send a brief hello",
    "See how we operate"
  ];

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Background mouse-scrub video */}
      <BackgroundVideo />

      {/* Foreground dark semi-transparent overlay to ensure content readability */}
      <div className="absolute inset-0 bg-black/10 z-[1] pointer-events-none" />

      {/* Header Navigation */}
      <Navbar />

      {/* Hero Content Section */}
      <main className="relative z-10 w-full h-full flex flex-col justify-end md:justify-center px-5 sm:px-8 md:px-10 pb-12 md:pb-0 overflow-hidden select-text">
        <div className="max-w-[640px] w-full text-left">
          
          {/* Blurred Intro Label */}
          <div 
            className="pointer-events-none select-none mb-5 sm:mb-6 text-black"
            style={{
              fontSize: 'clamp(18px, 4vw, 26px)',
              lineHeight: '1.3',
              fontWeight: 400,
              filter: 'blur(4px)'
            }}
          >
            Hey there, meet A.R.I.A,<br />
            Mainframe's Adaptive Response Interface Agent
          </div>

          {/* Typewriter Text Box */}
          <p 
            className="text-black mb-5 sm:mb-6 font-normal"
            style={{
              fontSize: 'clamp(18px, 4vw, 26px)',
              lineHeight: '1.35',
              minHeight: '54px'
            }}
          >
            {displayed}
            {!done && (
              <span 
                className="inline-block w-[2px] h-[1.1em] bg-black align-middle ml-[2px] cursor-blink"
              />
            )}
          </p>

          {/* Action Pill Buttons */}
          <div 
            className={`flex flex-wrap gap-y-1 transition-all duration-500 ease-out transform ${
              showActions ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}
          >
            {whitePills.map((label) => (
              <button
                key={label}
                className="inline-flex items-center justify-center bg-white text-black border border-black/10 rounded-full text-[13px] sm:text-[15px] px-4 sm:px-5 py-[0.3em] mx-[0.25em] mb-[0.4em] whitespace-nowrap cursor-pointer hover:bg-black hover:text-white transition-colors duration-200"
              >
                {label}
              </button>
            ))}

            {/* Copy Email Button */}
            <button
              onClick={handleCopyEmail}
              className="inline-flex items-center justify-center bg-transparent text-white border border-white rounded-full text-[13px] sm:text-[15px] px-4 sm:px-5 py-[0.3em] mx-[0.25em] mb-[0.4em] gap-2 sm:gap-3 whitespace-nowrap cursor-pointer hover:bg-white hover:text-black transition-colors duration-200"
            >
              <span>
                {copied ? "Copied!" : <>Reach us: <span className="underline underline-offset-1">hello@mainframe.co</span></>}
              </span>
              {!copied && (
                <svg 
                  className="w-[12px] h-[12px] fill-current" 
                  viewBox="0 0 24 24"
                >
                  <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                </svg>
              )}
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}
