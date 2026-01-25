'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  txHash?: string;
  link?: string;
}

export default function ShareModal({
  open,
  onClose,
  title = 'Jar created!',
  subtitle,
  txHash,
  link = '',
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="share-modal-root"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          {/* 1. Global Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
            onClick={onClose}
          />

          {/* 2. Modal Card */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="
              relative z-[101] w-full max-w-sm
              overflow-hidden rounded-3xl
              border border-white/10
              bg-[#0a0a0a]
              shadow-[0_24px_80px_rgba(0,0,0,0.8)]
            "
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
              <div>
                <h3 className="text-base font-bold text-white">{title}</h3>
                {subtitle && <p className="text-xs text-neutral-400">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                className="
                  flex h-8 w-8 items-center justify-center
                  rounded-full bg-white/5 text-neutral-400
                  hover:bg-white/10 hover:text-white
                  transition-colors
                "
              >
                {/* Close Icon */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              
              {/* Copy Link Section */}
              <div className="w-full space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 ml-1">
                  Share Link
                </label>
                
                <div 
                  onClick={handleCopy}
                  className="
                    group relative flex items-center justify-between
                    rounded-xl bg-white/5 px-4 py-3
                    border border-white/5
                    cursor-pointer
                    hover:bg-white/10 hover:border-white/10
                    transition-all duration-200
                  "
                >
                  <p className="mr-4 truncate text-sm text-neutral-300 font-mono">
                    {link.replace(/^https?:\/\//, '') || 'Generating...'}
                  </p>
                  
                  <div className="text-neutral-400 group-hover:text-white transition-colors">
                    {copied ? (
                      // ИСПРАВЛЕНО: Цвет галочки изменен на синий Base (#0052FF)
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#0052FF]"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons Grid */}
              <div className="mt-6 grid grid-cols-2 gap-3">
                 {/* Secondary: View Tx */}
                 <a
                  href={txHash ? `https://basescan.org/tx/${txHash}` : '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="
                    flex items-center justify-center rounded-xl bg-white/5 py-3
                    text-sm font-medium text-neutral-400 hover:bg-white/10 hover:text-white transition-colors
                  "
                 >
                   View tx
                 </a>
                 
                 {/* Primary: Open Page (Base Blue) */}
                 <a
                   href={link}
                   target="_blank"
                   rel="noreferrer"
                   className="
                     flex items-center justify-center gap-2 rounded-xl bg-[#0052FF] py-3
                     text-sm font-semibold text-white
                     shadow-[0_4px_12px_rgba(0,82,255,0.3)]
                     hover:bg-[#004AD9] active:scale-95
                     transition-all duration-200
                   "
                 >
                   Open Jar
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                 </a>
              </div>

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}