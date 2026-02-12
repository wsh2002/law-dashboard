import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const PARTICLE_COUNT = 50;

export const AnimatedBackground = () => {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    size: number;
    duration: number;
    delay: number;
    type: 'circle' | 'square';
  }>>([]);

  useEffect(() => {
    const newParticles = Array.from({ length: PARTICLE_COUNT }).map((_, i) => ({
      id: i,
      x: Math.random() * 100, // percentage
      size: Math.random() * 15 + 8, // 8px to 23px
      duration: Math.random() * 15 + 10, // 10s to 25s
      delay: Math.random() * 5,
      type: (Math.random() > 0.5 ? 'circle' : 'square') as 'circle' | 'square',
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-slate-50">
      {/* 漂浮的渐变圆 1 */}
      <motion.div
        className="absolute -top-40 -left-40 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30"
        animate={{
          x: [0, 100, 0],
          y: [0, 50, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      {/* 漂浮的渐变圆 2 */}
      <motion.div
        className="absolute top-0 right-0 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30"
        animate={{
          x: [0, -100, 0],
          y: [0, 100, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      {/* 漂浮的渐变圆 3 */}
      <motion.div
        className="absolute -bottom-40 left-20 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30"
        animate={{
          x: [0, 50, 0],
          y: [0, -50, 0],
          scale: [1, 1.3, 1],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* 漂浮的渐变圆 4 */}
      <motion.div
        className="absolute bottom-40 right-40 w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30"
        animate={{
          x: [0, -70, 0],
          y: [0, -30, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* 动态飘落效果 */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className={`absolute bg-gradient-to-br from-blue-500/40 to-purple-600/40 backdrop-blur-sm border border-white/40 shadow-sm ${
            particle.type === 'circle' ? 'rounded-full' : 'rounded-lg'
          }`}
          style={{
            left: `${particle.x}%`,
            width: particle.size,
            height: particle.size,
            top: -50,
          }}
          animate={{
            y: ['0vh', '100vh'],
            rotate: [0, 360],
            opacity: [0, 0.8, 0],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
};
