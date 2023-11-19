'use client';
import { cn } from '@/cn';
import { motion, useAnimation } from 'framer-motion';

export const GlowSquare: React.FC<{
  children?: React.ReactNode;
  width?: number;
  height?: number;
  background?: string;
  index: number;
  onClick?: () => void;
}> = ({ children, width = 200, height = 200, background = 'black', index, onClick }) => {
  const movementControls = useAnimation();
  const opacityControls = useAnimation();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={opacityControls}
      className="relative overflow-hidden"
      style={{
        width,
        height,
        background,
      }}
      onHoverStart={() => {
        opacityControls.start({
          opacity: 1,
          transition: {
            ease: 'circIn',
            duration: 1,
          },
        });
        movementControls.start({
          rotate: index + 360,
          transition: {
            ease: [0.42, 0, 0.58, 1],
            duration: 1.5,
            repeat: Infinity,
          },
        });
      }}
      onHoverEnd={() => {
        setTimeout(() => {
          opacityControls.start({
            opacity: 0,
            transition: {
              ease: 'linear',
              duration: 1,
            },
          });
          setTimeout(() => {
            movementControls.stop();
          }, 1500);
        }, 1000);
      }}
    >
      <motion.div
        className={cn('absolute top-[-25%] left-[-25%]', 'bg-gradient-conic from-white to-[transparent]')}
        style={{
          width: width * 1.5,
          height: height * 1.5,
        }}
        animate={movementControls}
        transition={movementControls}
      />
      <div
        className="w-[94%] h-[94%] absolute top-[3%] left-[3%]"
        style={{
          background,
        }}
        onClick={onClick}
      >
        {children}
      </div>
    </motion.div>
  );
};
