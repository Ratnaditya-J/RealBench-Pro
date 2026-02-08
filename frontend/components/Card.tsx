import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  id?: string;
  title?: string | ReactNode;
  subtitle?: string;
  action?: ReactNode;
  variant?: 'default' | 'glass' | 'gradient';
  hover?: boolean;
}

export default function Card({ 
  children, 
  className = '', 
  id,
  title, 
  subtitle, 
  action,
  variant = 'default',
  hover = false,
}: CardProps) {
  const variants = {
    default: 'bg-slate-800/50 border-slate-700/50',
    glass: 'bg-white/5 backdrop-blur-xl border-white/10',
    gradient: 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50',
  };

  const hoverClass = hover 
    ? 'hover:border-slate-600 hover:shadow-xl hover:shadow-black/20 hover:-translate-y-0.5 cursor-pointer' 
    : '';

  return (
    <div 
      id={id}
      className={`
        rounded-xl border shadow-lg transition-all duration-300
        ${variants[variant]}
        ${hoverClass}
        ${className}
      `}
    >
      {(title || subtitle || action) && (
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div>
            {title && (
              <h3 className="text-lg font-semibold text-white">{title}</h3>
            )}
            {subtitle && (
              <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}

export function CardGrid({ 
  children, 
  className = '', 
  cols = 4 
}: { 
  children: ReactNode; 
  className?: string; 
  cols?: 2 | 3 | 4;
}) {
  const gridCols = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`grid ${gridCols[cols]} gap-6 ${className}`}>
      {children}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function StatCard({
  title,
  value,
  change,
  icon,
  trend,
  variant = 'default',
}: StatCardProps) {
  const trendConfig = {
    up: { color: 'text-emerald-400', arrow: '↑' },
    down: { color: 'text-red-400', arrow: '↓' },
    neutral: { color: 'text-slate-400', arrow: '' },
  };

  const variantConfig = {
    default: 'from-slate-800/80 to-slate-900/80 border-slate-700/50',
    success: 'from-emerald-900/40 to-slate-900/80 border-emerald-700/30',
    warning: 'from-amber-900/40 to-slate-900/80 border-amber-700/30',
    danger: 'from-red-900/40 to-slate-900/80 border-red-700/30',
  };

  const trendInfo = trend ? trendConfig[trend] : trendConfig.neutral;

  return (
    <div 
      className={`
        bg-gradient-to-br ${variantConfig[variant]} 
        rounded-xl border shadow-lg p-6
        hover:shadow-xl hover:shadow-black/20 transition-all duration-300
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">{title}</p>
          <p className="text-4xl font-bold text-white mt-2 tracking-tight">{value}</p>
          {change && (
            <p className={`text-sm mt-2 flex items-center gap-1 ${trendInfo.color}`}>
              {trendInfo.arrow && <span className="font-medium">{trendInfo.arrow}</span>}
              {change}
            </p>
          )}
        </div>
        {icon && (
          <div className="p-3 rounded-lg bg-white/5 text-slate-400">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

// Animated number component for stat cards
export function AnimatedNumber({ value, duration = 1000 }: { value: number; duration?: number }) {
  return <span>{value}</span>; // TODO: Add animation with framer-motion
}
