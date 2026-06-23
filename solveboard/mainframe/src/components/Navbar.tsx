import React, { useState } from 'react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  const navLinks = ["Labs", "Studio", "Openings", "Shop"];

  return (
    <>
      <nav className="fixed top-0 left-0 w-full z-50 px-5 sm:px-8 py-4 sm:py-5 flex justify-between items-center bg-transparent pointer-events-auto">
        {/* Logo (left) */}
        <a href="#" className="flex items-center gap-3 select-none text-black">
          <span 
            className="text-[21px] sm:text-[26px] tracking-tight font-heading leading-none"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Mainframe®
          </span>
          <span 
            className="text-[25px] sm:text-[30px] leading-none text-black select-none"
            style={{ letterSpacing: '-0.02em' }}
          >
            ✳︎
          </span>
        </a>

        {/* Desktop Nav Links (center) */}
        <div className="hidden md:flex items-center text-[23px] text-black">
          {navLinks.map((link, idx) => (
            <React.Fragment key={link}>
              <a 
                href={`#${link.toLowerCase()}`} 
                className="hover:opacity-60 transition-opacity duration-200"
              >
                {link}
              </a>
              {idx < navLinks.length - 1 && <span className="select-none font-normal">,&nbsp;</span>}
            </React.Fragment>
          ))}
        </div>

        {/* Desktop CTA (right) */}
        <a 
          href="#contact" 
          className="hidden md:block text-[23px] text-black underline underline-offset-2 hover:opacity-60 transition-opacity duration-200"
        >
          Get in touch
        </a>

        {/* Mobile Hamburger Button */}
        <button 
          onClick={toggleMenu} 
          className="md:hidden flex flex-col justify-center items-center gap-[5px] w-8 h-8 z-50 focus:outline-none cursor-pointer"
          aria-label="Toggle Menu"
        >
          <span 
            className={`w-6 h-[2px] bg-black transition-all duration-300 transform ${
              isOpen ? 'rotate-45 translate-y-[7px]' : ''
            }`} 
          />
          <span 
            className={`w-6 h-[2px] bg-black transition-all duration-300 ${
              isOpen ? 'opacity-0' : 'opacity-100'
            }`} 
          />
          <span 
            className={`w-6 h-[2px] bg-black transition-all duration-300 transform ${
              isOpen ? '-rotate-45 -translate-y-[7px]' : ''
            }`} 
          />
        </button>
      </nav>

      {/* Mobile Overlay Menu */}
      <div 
        className={`fixed inset-0 bg-white/95 backdrop-blur-sm z-40 md:hidden flex flex-col justify-center items-start px-8 gap-8 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {navLinks.map((link) => (
          <a 
            key={link}
            href={`#${link.toLowerCase()}`}
            onClick={() => setIsOpen(false)}
            className="text-[32px] font-medium text-black hover:opacity-60 transition-opacity duration-200"
          >
            {link}
          </a>
        ))}
        <a 
          href="#contact"
          onClick={() => setIsOpen(false)}
          className="text-[32px] font-medium text-black underline underline-offset-4 hover:opacity-60 transition-opacity duration-200"
        >
          Get in touch
        </a>
      </div>
    </>
  );
}
