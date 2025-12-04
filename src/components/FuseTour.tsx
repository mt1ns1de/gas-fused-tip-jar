'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import Image from 'next/image';

type Step = {
  id: number;
  title: string;
  body: string;
};

const STEPS: Step[] = [
  {
    id: 1,
    title: 'Cap = gas ceiling',
    body: 'Cap is the max gas price your jar accepts. If gas jumps above this level, tips just revert and no one overpays.',
  },
  {
    id: 2,
    title: 'Presets instead of gas math',
    body: 'Auto tracks current gas. Low is about 1.1×, medium about 1.5×, high about 2.0×. Pick a preset and we set the cap for you.',
  },
  {
    id: 3,
    title: 'Profiles: Conservative / Balanced / Aggressive',
    body: 'Conservative sticks close to current gas. Balanced is the default for most days. Aggressive is for mints and spikes.',
  },
];

const TOUR_HIDE_KEY = 'gf-fuse-tour:hidden';

export default function FuseTour() {
  const { isConnected } = useAccount();
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  // авто-показ при первом подключении кошелька
  useEffect(() => {
    if (!isConnected) {
      setOpen(false);
      return;
    }

    try {
      const hidden =
        typeof window !== 'undefined'
          ? window.localStorage.getItem(TOUR_HIDE_KEY)
          : null;
      if (hidden === '1') {
        setOpen(false);
        return;
      }
    } catch {
      // если localStorage недоступен — просто покажем тур
    }

    setStepIndex(0);
    setOpen(true);
  }, [isConnected]);

  const current = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const handleNext = () => {
    if (!isLast) {
      setStepIndex((i) => i + 1);
    } else {
      setOpen(false);
    }
  };

  const handleSkip = () => {
    setOpen(false);
  };

  const handleNever = () => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(TOUR_HIDE_KEY, '1');
      }
    } catch {
      // ок, если не смогли сохранить флаг
    }
    setOpen(false);
  };

  // ручной запуск тура по кнопке "?";
  const handleManualOpen = () => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(TOUR_HIDE_KEY);
      }
    } catch {
      // если localStorage не доступен — просто продолжаем
    }
    setStepIndex(0);
    setOpen(true);
  };

  return (
    <>
      {/* ЦЕНТРАЛЬНЫЙ ОВЕРЛЕЙ + ЗАТЕМНЕНИЕ/BLUR ФОНА */}
      <AnimatePresence>
        {open && current && (
          <motion.div
            key="fuse-tour-shell"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="
              fixed inset-0 z-40
              flex items-center justify-center
              pointer-events-none
            "
          >
            {/* затемнение и размытие всего, что позади тура */}
            <div className="pointer-events-none absolute inset-0 bg-black/40 backdrop-blur-sm" />

            <motion.div
              layout
              className="pointer-events-auto relative w-full max-w-xl px-4"
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <motion.div
                layout
                className="
                  rounded-3xl
                  bg-gradient-to-r from-[#1d4ed8]/80 via-[#0ea5e9]/70 to-[#1d4ed8]/80
                  p-[1px]
                  shadow-[0_24px_80px_rgba(15,23,42,0.9)]
                "
              >
                <motion.div
                  layout
                  className="
                    rounded-3xl
                    border border-white/5
                    bg-black/90
                    px-5 py-4
                    text-sm text-neutral-100
                    backdrop-blur-xl
                  "
                >
                  {/* Верх: мини Орби + заголовок + шаги */}
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="
                          flex h-7 w-7 items-center justify-center
                          rounded-full bg-black/80
                          shadow-[0_0_0_1px_rgba(15,23,42,0.9)]
                        "
                      >
                        <Image
                          src="/gf-mascot.png"
                          alt="Orbby"
                          width={20}
                          height={20}
                          className="select-none"
                        />
                      </div>
                      <AnimatePresence mode="wait">
                        <motion.h3
                          key={current.id + '-title'}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.16, ease: 'easeOut' }}
                          className="text-sm font-semibold"
                        >
                          {current.title}
                        </motion.h3>
                      </AnimatePresence>
                    </div>
                    <span className="text-[11px] uppercase tracking-[0.12em] text-neutral-400">
                      {stepIndex + 1}/{STEPS.length}
                    </span>
                  </div>

                  {/* Текст шага */}
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={current.id + '-body'}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className="text-sm text-neutral-200"
                    >
                      {current.body}
                    </motion.p>
                  </AnimatePresence>

                  {/* Прогресс-бар */}
                  <div className="mt-3 h-[2px] w-full overflow-hidden rounded-full bg-white/5">
                    <motion.div
                      initial={false}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.35, ease: 'easeInOut' }}
                      className="h-full rounded-full bg-[#3b82f6]"
                    />
                  </div>

                  {/* Кнопки */}
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={handleSkip}
                      className="
                        text-xs text-neutral-400
                        underline underline-offset-2 decoration-neutral-600
                        hover:text-neutral-200 hover:decoration-neutral-300
                      "
                    >
                      Skip for now
                    </button>

                    <div className="flex items-center gap-2">
                      {isLast && (
                        <button
                          type="button"
                          onClick={handleNever}
                          className="
                            rounded-full bg-white/5 px-3 py-1.5
                            text-xs font-medium text-neutral-200
                            shadow-[0_0_0_1px_rgba(15,23,42,0.9)]
                            hover:bg-white/10
                          "
                        >
                          Don&apos;t show again
                        </button>
                      )}

                      <motion.button
                        type="button"
                        onClick={handleNext}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.97 }}
                        transition={{
                          type: 'spring',
                          stiffness: 260,
                          damping: 20,
                        }}
                        className="
                          rounded-full bg-white/10 px-4 py-1.5
                          text-xs font-medium text-white
                          shadow-[0_0_0_1px_rgba(15,23,42,0.9)]
                          hover:bg-white/16
                        "
                      >
                        {isLast ? 'Got it' : 'Next'}
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Кнопка помощи "?" — в правом верхнем углу карточки Create Jar */}
      <button
        type="button"
        onClick={handleManualOpen}
        className="
          absolute right-4 top-4 z-20
          flex h-9 w-9 items-center justify-center
          rounded-full border border-white/20 bg-white/10
          text-sm font-medium text-neutral-100
          backdrop-blur-md
          shadow-[0_10px_30px_rgba(15,23,42,0.8)]
          hover:bg-white/16
        "
      >
        ?
      </button>
    </>
  );
}
