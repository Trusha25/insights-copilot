import React from 'react';

export default function LockOverlay() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/[0.02] via-cyan-400/[0.04] to-violet-400/[0.05] backdrop-blur-[1px]" />
      <div className="pointer-events-none absolute -right-12 -top-14 h-36 w-36 rounded-full bg-cyan-400/10 blur-3xl transition-opacity duration-300 group-hover:opacity-100" />
    </>
  );
}
