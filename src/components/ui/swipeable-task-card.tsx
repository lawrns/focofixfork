'use client';

import { ReactNode, useRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { CheckCircle2, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwipeableTaskCardProps {
  children: ReactNode;
  onComplete?: () => void;
  onArchive?: () => void;
  disabled?: boolean;
  className?: string;
}

export function SwipeableTaskCard({
  children,
  onComplete,
  onArchive,
  disabled = false,
  className,
}: SwipeableTaskCardProps) {
  const x = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const completeOpacity = useTransform(x, [0, 100], [0, 1]);
  const completeScale = useTransform(x, [0, 100], [0.5, 1]);

  const archiveOpacity = useTransform(x, [0, -100], [0, 1]);
  const archiveScale = useTransform(x, [0, -100], [0.5, 1]);

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100;

    if (info.offset.x > threshold && onComplete) {
      onComplete();
      x.set(0);
    } else if (info.offset.x < -threshold && onArchive) {
      onArchive();
      x.set(0);
    } else {
      x.set(0);
    }
  };

  if (disabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={cn('relative overflow-hidden', className)} ref={containerRef}>
      {/* Complete action background (right swipe) */}
      <motion.div
        className="absolute inset-y-0 left-0 flex items-center pl-4 bg-green-500 rounded-lg"
        style={{
          opacity: completeOpacity,
          width: '100%',
        }}
      >
        <motion.div
          style={{ scale: completeScale }}
          className="flex items-center gap-2 text-white font-medium"
        >
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-sm">Complete</span>
        </motion.div>
      </motion.div>

      {/* Archive action background (left swipe) */}
      <motion.div
        className="absolute inset-y-0 right-0 flex items-center justify-end pr-4 bg-red-500 rounded-lg"
        style={{
          opacity: archiveOpacity,
          width: '100%',
        }}
      >
        <motion.div
          style={{ scale: archiveScale }}
          className="flex items-center gap-2 text-white font-medium"
        >
          <span className="text-sm">Archive</span>
          <Archive className="h-5 w-5" />
        </motion.div>
      </motion.div>

      {/* Draggable card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -150, right: 150 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative z-10 cursor-grab active:cursor-grabbing"
      >
        {children}
      </motion.div>
    </div>
  );
}
