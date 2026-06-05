'use client';

import * as React from 'react';
import { motion, useReducedMotion, type HTMLMotionProps } from 'motion/react';

type RevealProps = HTMLMotionProps<'div'> & {
  /** Stagger delay in seconds. */
  delay?: number;
  /** Travel distance in px. */
  y?: number;
  once?: boolean;
};

/**
 * Scroll-into-view fade + rise. Respects prefers-reduced-motion.
 *   <Reveal delay={0.1}>...</Reveal>
 */
export function Reveal({ children, delay = 0, y = 18, once = true, ...props }: RevealProps) {
  const reduce = useReducedMotion();
  if (reduce) {
    return <div {...(props as React.ComponentProps<'div'>)}>{children as React.ReactNode}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: '-80px' }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
