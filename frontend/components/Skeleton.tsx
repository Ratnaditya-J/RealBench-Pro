interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  count?: number;
}

export default function Skeleton({ 
  className = '', 
  variant = 'text',
  width,
  height,
  count = 1 
}: SkeletonProps) {
  const baseClass = 'animate-pulse bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 bg-[length:200%_100%]';
  
  const variants = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const style = {
    width: width || (variant === 'text' ? '100%' : undefined),
    height: height || (variant === 'circular' ? width : undefined),
  };

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${baseClass} ${variants[variant]} ${className}`}
          style={style}
        />
      ))}
    </>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton width="40%" height={16} />
          <Skeleton width="60%" height={32} />
        </div>
        <Skeleton variant="circular" width={40} height={40} />
      </div>
      <Skeleton width="50%" height={14} />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 pb-3 border-b border-slate-700">
        <Skeleton width="15%" height={14} />
        <Skeleton width="25%" height={14} />
        <Skeleton width="20%" height={14} />
        <Skeleton width="20%" height={14} />
        <Skeleton width="15%" height={14} />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-3">
          <Skeleton width="15%" height={20} />
          <Skeleton width="25%" height={20} />
          <Skeleton width="20%" height={20} />
          <Skeleton width="20%" height={20} />
          <Skeleton width="15%" height={20} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonLeaderboard() {
  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Podium skeletons */}
      <div className="mt-8">
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 text-center space-y-4">
          <Skeleton variant="circular" width={64} height={64} className="mx-auto" />
          <Skeleton width="60%" height={20} className="mx-auto" />
          <Skeleton width="40%" height={32} className="mx-auto" />
        </div>
      </div>
      <div>
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 text-center space-y-4">
          <Skeleton variant="circular" width={80} height={80} className="mx-auto" />
          <Skeleton width="70%" height={24} className="mx-auto" />
          <Skeleton width="50%" height={40} className="mx-auto" />
        </div>
      </div>
      <div className="mt-12">
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 text-center space-y-4">
          <Skeleton variant="circular" width={56} height={56} className="mx-auto" />
          <Skeleton width="50%" height={18} className="mx-auto" />
          <Skeleton width="35%" height={28} className="mx-auto" />
        </div>
      </div>
    </div>
  );
}
