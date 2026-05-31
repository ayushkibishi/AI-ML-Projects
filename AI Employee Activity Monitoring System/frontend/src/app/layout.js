import "./globals.css";

export const metadata = {
  title: "VisionTrack AI - Futuristic Smart Office Intelligence OS",
  description: "Real-time AI surveillance, workspace tracking, posture analysis, and employee presence analytics dashboard.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className="antialiased bg-[#030712] text-[#f3f4f6] min-h-screen">
        <div className="cyber-grid" />
        {children}
      </body>
    </html>
  );
}
