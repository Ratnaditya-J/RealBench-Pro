import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  dot?: boolean;
  pulse?: boolean;
}

export default function Badge({ 
  children, 
  variant = 'default', 
  size = 'md', 
  className = '',
  dot = false,
  pulse = false,
}: BadgeProps) {
  const variants = {
    default: 'bg-slate-700/50 text-slate-300 border-slate-600/50',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    danger: 'bg-red-500/10 text-red-400 border-red-500/30',
    info: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  };

  const dotColors = {
    default: 'bg-slate-400',
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    danger: 'bg-red-400',
    info: 'bg-blue-400',
    purple: 'bg-purple-400',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  return (
    <span 
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium border
        ${variants[variant]} ${sizes[size]} ${className}
      `}
    >
      {dot && (
        <span 
          className={`
            w-1.5 h-1.5 rounded-full ${dotColors[variant]}
            ${pulse ? 'animate-pulse' : ''}
          `}
        />
      )}
      {children}
    </span>
  );
}

export function SafetyBadge({ severity }: { severity: 'critical' | 'high' | 'medium' | 'low' | 'none' }) {
  const config = {
    critical: { variant: 'danger' as const, label: 'CRITICAL', dot: true, pulse: true },
    high: { variant: 'warning' as const, label: 'HIGH', dot: true, pulse: false },
    medium: { variant: 'info' as const, label: 'MEDIUM', dot: false, pulse: false },
    low: { variant: 'default' as const, label: 'LOW', dot: false, pulse: false },
    none: { variant: 'success' as const, label: 'SAFE', dot: true, pulse: false },
  };

  const { variant, label, dot, pulse } = config[severity];

  return (
    <Badge variant={variant} dot={dot} pulse={pulse}>
      {label}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const getConfig = (status: string) => {
    const lower = status.toLowerCase();
    if (lower.includes('success') || lower.includes('complete')) {
      return { variant: 'success' as const, dot: true };
    }
    if (lower.includes('fail') || lower.includes('error')) {
      return { variant: 'danger' as const, dot: true, pulse: true };
    }
    if (lower.includes('running') || lower.includes('progress')) {
      return { variant: 'info' as const, dot: true, pulse: true };
    }
    if (lower.includes('pending') || lower.includes('waiting') || lower.includes('scheduled')) {
      return { variant: 'warning' as const, dot: true };
    }
    return { variant: 'default' as const, dot: false };
  };

  const config = getConfig(status);

  return (
    <Badge {...config}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

// Score badge with gradient based on value
export function ScoreBadge({ score, showLabel = true }: { score: number; showLabel?: boolean }) {
  const getVariant = (score: number) => {
    if (score >= 0.8) return 'success';
    if (score >= 0.6) return 'info';
    if (score >= 0.4) return 'warning';
    return 'danger';
  };

  return (
    <Badge variant={getVariant(score) as any}>
      {(score * 100).toFixed(1)}%
      {showLabel && <span className="opacity-60 ml-1">score</span>}
    </Badge>
  );
}
