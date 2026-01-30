import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

const LandingPage: React.FC = () => {
  const { setViewMode } = useStore();

  const screenshotUrl = '/landing-screenshot.png';

  return (
    <div className="relative min-h-screen w-full bg-[#0B0C15] text-white font-sans overflow-hidden">
      {/* Background: subtle stars + gradients */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] bg-[size:28px_28px] opacity-40" />
        <motion.div
          className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.25),transparent_70%)] blur-3xl"
          animate={{ y: [0, 18, 0], opacity: [0.7, 0.9, 0.7] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-20 right-[-120px] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.18),transparent_70%)] blur-3xl"
          animate={{ y: [0, -14, 0], opacity: [0.5, 0.75, 0.5] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Ray Tracing Lines */}
      <motion.div
        className="pointer-events-none absolute -left-1/3 top-1/4 h-px w-[140%] bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-30"
        initial={{ x: -200, opacity: 0 }}
        animate={{ x: 200, opacity: 0.3 }}
        transition={{ duration: 6, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
      />
      <motion.div
        className="pointer-events-none absolute -left-1/2 top-2/3 h-px w-[160%] bg-gradient-to-r from-transparent via-cyan-300/30 to-transparent opacity-20"
        initial={{ x: 220, opacity: 0 }}
        animate={{ x: -220, opacity: 0.25 }}
        transition={{ duration: 8, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
      />

      {/* Navbar */}
      <motion.nav
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="fixed inset-x-0 top-0 z-30 border-b border-white/10 bg-black/20 backdrop-blur-md"
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3 font-mono text-sm tracking-[0.3em] text-white/80">
            <img
              src="/flux-logo.png"
              alt="Flux Matrix logo"
              className="h-7 w-7 rounded-md object-contain"
            />
            FLUX MATRIX
          </div>
          <div className="flex items-center gap-4 text-sm">
            <button
              onClick={() => setViewMode('study')}
              className="text-white/70 hover:text-white transition-colors"
            >
              Sign In
            </button>
            <motion.button
              onClick={() => setViewMode('register')}
              className="rounded-full border border-white/10 bg-gradient-to-r from-cyan-300/30 to-violet-500/30 px-5 py-2 text-white shadow-[0_0_20px_rgba(124,58,237,0.25)] transition hover:shadow-[0_0_28px_rgba(34,211,238,0.35)]"
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
            >
              Get Started
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* Hero */}
      <section className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 pt-28 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="text-4xl md:text-6xl font-semibold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70"
        >
          The Knowledge Stream for Sharp Minds.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
          className="mt-5 max-w-2xl text-base md:text-lg text-white/60"
        >
          Flux Matrix brings high-end AI math reasoning into a precision grid.
          OCR, structured tags, and deep analysis flow together like a living system.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
          className="relative mt-12 w-full max-w-4xl"
        >
          <motion.div
            className="absolute inset-x-0 -bottom-10 h-40 bg-[radial-gradient(circle,rgba(124,58,237,0.35),transparent_70%)] blur-2xl"
            animate={{ opacity: [0.45, 0.8, 0.45], scale: [0.95, 1.05, 0.95] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_40px_120px_rgba(0,0,0,0.6)]"
            style={{ transform: 'perspective(1200px) rotateX(15deg)' }}
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div
              className="h-72 md:h-96 w-full rounded-2xl bg-gradient-to-br from-white/10 via-white/5 to-white/10"
              style={{
                backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03)), url(${screenshotUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            />
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
          className="mt-10 flex items-center gap-4"
        >
          <button
            onClick={() => setViewMode('register')}
            className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#0B0C15] shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:shadow-[0_0_40px_rgba(124,58,237,0.4)] transition"
          >
            Get Started
          </button>
          <button
            onClick={() => setViewMode('study')}
            className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition"
          >
            Sign In <ArrowRight size={16} />
          </button>
        </motion.div>
      </section>
    </div>
  );
};

export default LandingPage;
