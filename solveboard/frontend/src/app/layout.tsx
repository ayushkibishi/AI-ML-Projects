import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Universal AI Board Game Solver & Tutor | Antigravity",
  description: "Upload photos of Chess, Sudoku, Connect Four, Checkers, Rubik's Cube, Reversi, and more. Instantly scan, edit, solve positions, and receive voice-tutored explanations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-full flex flex-col`}>{children}</body>
    </html>
  );
}

