import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'circular' | 'rectangular' | 'text';
  width?: string | number;
  height?: string | number;
  lines?: number; // For text variant
  animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'default',
  width,
  height,
  lines = 1,
  animation = 'pulse',
  ...props
}) => {
  const baseClasses = cn(
    'bg-slate-200 dark:bg-slate-700',
    {
      'animate-pulse': animation === 'pulse',
      'animate-bounce': animation === 'wave',
      'rounded-md': variant === 'default' || variant === 'rectangular',
      'rounded-full': variant === 'circular',
      'rounded-sm': variant === 'text',
    },
    className
  );

  const style: React.CSSProperties = {
    width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
    height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
  };

  // Default heights for different variants
  if (!height) {
    switch (variant) {
      case 'text':
        style.height = '1em';
        break;
      case 'circular':
        style.height = width || '40px';
        break;
      case 'rectangular':
      case 'default':
        style.height = '2.5rem';
        break;
    }
  }

  if (variant === 'text' && lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={cn(baseClasses, {
              'w-full': index < lines - 1,
              'w-3/4': index === lines - 1, // Last line is shorter
            })}
            style={index === lines - 1 ? { ...style, width: '75%' } : style}
            {...props}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={baseClasses}
      style={style}
      {...props}
    />
  );
};

// Skeleton variants for common use cases
export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('p-6 border border-slate-200 dark:border-slate-700 rounded-lg space-y-4', className)}>
    <div className="flex items-center space-x-4">
      <Skeleton variant="circular" width={40} height={40} />
      <div className="space-y-2 flex-1">
        <Skeleton width="60%" height={20} />
        <Skeleton width="40%" height={16} />
      </div>
    </div>
    <Skeleton variant="text" lines={3} />
    <div className="flex space-x-2">
      <Skeleton width={80} height={32} />
      <Skeleton width={100} height={32} />
    </div>
  </div>
);

export const SkeletonTable: React.FC<{ 
  rows?: number; 
  columns?: number;
  className?: string;
}> = ({ 
  rows = 5, 
  columns = 4,
  className 
}) => (
  <div className={cn('space-y-4', className)}>
    {/* Table header */}
    <div className="flex space-x-4">
      {Array.from({ length: columns }).map((_, index) => (
        <Skeleton key={`header-${index}`} height={20} className="flex-1" />
      ))}
    </div>
    
    {/* Table rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={`row-${rowIndex}`} className="flex space-x-4">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton 
            key={`cell-${rowIndex}-${colIndex}`} 
            height={16} 
            className="flex-1"
          />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonStats: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6', className)}>
    {Array.from({ length: 4 }).map((_, index) => (
      <div key={index} className="p-6 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton width={60} height={16} />
            <Skeleton width={40} height={24} />
          </div>
          <Skeleton variant="circular" width={48} height={48} />
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonForm: React.FC<{ 
  fields?: number;
  className?: string;
}> = ({ 
  fields = 3,
  className 
}) => (
  <div className={cn('space-y-6', className)}>
    {Array.from({ length: fields }).map((_, index) => (
      <div key={index} className="space-y-2">
        <Skeleton width="25%" height={16} /> {/* Label */}
        <Skeleton width="100%" height={40} /> {/* Input */}
      </div>
    ))}
    
    <div className="flex space-x-4 pt-4">
      <Skeleton width={100} height={40} />
      <Skeleton width={80} height={40} />
    </div>
  </div>
);

export default Skeleton;