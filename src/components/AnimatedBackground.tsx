import { motion } from 'framer-motion';

const AnimatedBackground = () => {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden
    >
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50/40" />

      <div
        className="absolute inset-0 opacity-[0.35] mix-blend-soft-light"
        style={{
          background:
            'radial-gradient(ellipse 100% 70% at 50% -10%, oklch(0.75 0.1 250 / 0.15), transparent 60%), radial-gradient(ellipse 80% 50% at 100% 50%, oklch(0.82 0.06 200 / 0.1), transparent 50%), radial-gradient(ellipse 60% 40% at 0% 80%, oklch(0.85 0.05 280 / 0.06), transparent 50%)',
        }}
      />

      <motion.div
        className="absolute -left-[15%] top-[5%] h-[min(55vh,26rem)] w-[min(55vh,26rem)] rounded-full bg-blue-400/[0.04] blur-3xl"
        animate={{ x: [0, 30, 0], y: [0, 15, 0] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute right-[-5%] top-[30%] h-[min(45vh,22rem)] w-[min(45vh,22rem)] rounded-full bg-indigo-400/[0.05] blur-3xl"
        animate={{ x: [0, -25, 0], y: [0, 25, 0] }}
        transition={{ duration: 35, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-[-5%] left-[30%] h-[min(40vh,20rem)] w-[min(40vh,20rem)] rounded-full bg-violet-400/[0.04] blur-3xl"
        animate={{ scale: [1, 1.06, 1], opacity: [0.45, 0.6, 0.45] }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-[60%] right-[30%] h-[min(30vh,16rem)] w-[min(30vh,16rem)] rounded-full bg-cyan-400/[0.03] blur-3xl"
        animate={{ x: [0, 18, 0], y: [0, -12, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
};

export default AnimatedBackground;
