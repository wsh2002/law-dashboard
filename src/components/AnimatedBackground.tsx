import { motion } from 'framer-motion';

/** 全页底：柔和渐变 + 低对比光斑，不抢主内容、偏「分析后台」气质 */
const AnimatedBackground = () => {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden
    >
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/25" />
      <div
        className="absolute inset-0 opacity-[0.4] mix-blend-soft-light"
        style={{
          background:
            'radial-gradient(ellipse 120% 80% at 50% -20%, oklch(0.7 0.08 250 / 0.12), transparent 55%), radial-gradient(ellipse 90% 60% at 100% 50%, oklch(0.8 0.05 200 / 0.08), transparent 50%)',
        }}
      />
      <motion.div
        className="absolute -left-1/4 top-0 h-[min(60vh,28rem)] w-[min(60vh,28rem)] rounded-full bg-primary/[0.07] blur-3xl"
        animate={{ x: [0, 24, 0], y: [0, 12, 0] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute right-0 top-1/3 h-[min(50vh,24rem)] w-[min(50vh,24rem)] rounded-full bg-chart-1/[0.09] blur-3xl"
        animate={{ x: [0, -20, 0], y: [0, 20, 0] }}
        transition={{ duration: 32, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-0 left-1/3 h-[min(40vh,20rem)] w-[min(40vh,20rem)] rounded-full bg-violet-500/[0.06] blur-3xl"
        animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.65, 0.5] }}
        transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
};

export default AnimatedBackground;
