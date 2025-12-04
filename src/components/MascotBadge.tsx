import Image from 'next/image';
import { motion } from 'framer-motion';

export default function MascotBadge() {
  return (
    <div className="group relative inline-flex items-center">
      {/* Живой Орби */}
      <motion.div
        className="
          flex h-16 w-16 items-center justify-center
          rounded-3xl bg-[#0B1221]
          overflow-hidden
        "
        // мягкое «дыхание» и плавание
        animate={{ y: [0, -1.5, 0, 1.5, 0], scale: [1, 1.02, 1, 1.02, 1] }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        whileHover={{
          scale: 1.08,
          y: 0,
          transition: { duration: 0.18, ease: 'easeOut' },
        }}
      >
        <Image
          src="/gf-mascot.png"
          alt="Orbby"
          width={56}
          height={56}
          className="select-none"
        />
      </motion.div>

      {/* Тултип справа в стиле Base-карточек */}
      <div
        className="
          pointer-events-none
          absolute left-20 top-1/2 -translate-y-1/2

          px-3 py-2
          rounded-lg
          bg-white/5
          border border-white/10
          backdrop-blur-md

          text-[12px] text-neutral-200
          w-max max-w-xs

          opacity-0 translate-x-1
          transition-all duration-200
          group-hover:opacity-100 group-hover:translate-x-0
        "
      >
        Orbby keeps an eye on your fuse.
      </div>
    </div>
  );
}
