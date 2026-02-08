import { LucideIcon, Inbox, Trophy, Shield, Play, BarChart3 } from 'lucide-react';
import Button from './Button';
import Link from 'next/link';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  variant?: 'default' | 'leaderboard' | 'safety' | 'evaluation';
}

const variantConfig = {
  default: {
    icon: Inbox,
    gradient: 'from-slate-500 to-slate-600',
    iconBg: 'bg-slate-700/50',
  },
  leaderboard: {
    icon: Trophy,
    gradient: 'from-yellow-500 to-amber-600',
    iconBg: 'bg-yellow-500/10',
  },
  safety: {
    icon: Shield,
    gradient: 'from-emerald-500 to-green-600',
    iconBg: 'bg-emerald-500/10',
  },
  evaluation: {
    icon: BarChart3,
    gradient: 'from-blue-500 to-purple-600',
    iconBg: 'bg-blue-500/10',
  },
};

export default function EmptyState({ 
  icon, 
  title, 
  description, 
  action,
  variant = 'default' 
}: EmptyStateProps) {
  const config = variantConfig[variant];
  const Icon = icon || config.icon;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {/* Animated icon container */}
      <div className="relative mb-6">
        {/* Glow effect */}
        <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} blur-2xl opacity-20 animate-pulse`} />
        
        {/* Icon circle */}
        <div className={`relative w-20 h-20 rounded-2xl ${config.iconBg} border border-white/10 flex items-center justify-center`}>
          <Icon className="w-10 h-10 text-slate-400" strokeWidth={1.5} />
        </div>
        
        {/* Decorative rings */}
        <div className="absolute inset-0 rounded-2xl border border-white/5 scale-125 opacity-50" />
        <div className="absolute inset-0 rounded-2xl border border-white/5 scale-150 opacity-25" />
      </div>

      {/* Text */}
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-slate-400 max-w-sm mb-6 leading-relaxed">{description}</p>

      {/* Action button */}
      {action && (
        action.href ? (
          <Link href={action.href}>
            <Button variant="primary" size="lg" className="group">
              <Play className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
              {action.label}
            </Button>
          </Link>
        ) : (
          <Button variant="primary" size="lg" onClick={action.onClick} className="group">
            <Play className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
            {action.label}
          </Button>
        )
      )}
    </div>
  );
}
