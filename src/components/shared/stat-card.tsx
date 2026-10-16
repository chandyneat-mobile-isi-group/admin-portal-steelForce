'use client';

import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { AnimatedCounter } from '@/components/shared/animated-counter';
import { Sparkline } from '@/components/shared/sparkline';
import { motion } from 'framer-motion';
import { useRef, ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  /** Supporting figures shown under the headline value. */
  detail?: string;
  trend?: number;
  trendLabel?: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  sparkData?: number[];
  sparkColor?: string;
  index?: number;
}

export function StatCard({
  title,
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  detail,
  trend = 0,
  trendLabel = 'vs last month',
  icon: Icon,
  iconColor,
  iconBg,
  sparkData = [],
  sparkColor = '#004A98',
  index = 0,
}: StatCardProps) {
  const isPositive = trend >= 0;
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(1000px) rotateY(${x * 4}deg) rotateX(${-y * 4}deg) translateZ(0)`;
  };

  const handleMouseLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg)';
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      style={{ transformStyle: 'preserve-3d', transition: 'transform 0.2s ease-out' }}
    >
      <Card className="p-5 border-surface card-shadow hover:card-shadow-hover transition-shadow duration-300 cursor-pointer" style={{ borderRadius: '18px' }}>
        <div className="flex items-start justify-between mb-4">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${iconBg}`}>
            <Icon size={20} strokeWidth={2} className={iconColor} />
          </div>
          {sparkData.length > 0 && (
            <div className="mt-1">
              <Sparkline data={sparkData} color={sparkColor} width={70} height={26} />
            </div>
          )}
        </div>

        <p className="text-[12px] text-muted-foreground font-medium mb-1">{title}</p>
        <div className="flex items-end justify-between">
          <p className="text-[26px] font-bold text-main leading-none">
            <AnimatedCounter value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
          </p>
        </div>
        {detail && <p className="mt-2 truncate text-[11.5px] text-muted-foreground">{detail}</p>}

        <div className="flex items-center gap-1.5 mt-3">
          <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${isPositive ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
            {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {isPositive ? '+' : ''}{trend}%
          </div>
          <span className="text-[10px] text-muted-foreground">{trendLabel}</span>
        </div>
      </Card>
    </motion.div>
  );
}

export function MotionCard({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
