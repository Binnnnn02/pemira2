import React from 'react';
import type { AssessmentStatus, RecommendationType, UserRole } from '../../types';

interface BadgeProps {
  children?: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'sm',
  className = ''
}) => {
  const sizeClasses = size === 'sm' ? 'px-2.5 py-0.5 text-xs font-medium' : 'px-3 py-1 text-sm font-medium';

  const variantClasses = {
    primary: 'bg-indigo-50 text-indigo-700 border border-indigo-200/80',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200/80',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200/80',
    info: 'bg-sky-50 text-sky-700 border border-sky-200/80',
    purple: 'bg-purple-50 text-purple-700 border border-purple-200/80',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200/80'
  }[variant];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full ${sizeClasses} ${variantClasses} ${className}`}>
      {children}
    </span>
  );
};

export const RoleBadge: React.FC<{ role: UserRole }> = ({ role }) => {
  if (role === 'admin') {
    return <Badge variant="purple">Admin PEMIRA</Badge>;
  }
  return <Badge variant="primary">Pewawancara</Badge>;
};

export const AssessmentStatusBadge: React.FC<{ status?: AssessmentStatus | 'none' }> = ({ status }) => {
  if (status === 'submitted') {
    return (
      <Badge variant="success">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        Disubmit & Terkunci
      </Badge>
    );
  }
  if (status === 'draft') {
    return (
      <Badge variant="warning">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
        Draft Disimpan
      </Badge>
    );
  }
  return (
    <Badge variant="neutral">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
      Belum Dinilai
    </Badge>
  );
};

export const RecommendationBadge: React.FC<{ recommendation?: RecommendationType | null }> = ({
  recommendation
}) => {
  switch (recommendation) {
    case 'highly_recommended':
      return <Badge variant="success">Sangat Direkomendasikan</Badge>;
    case 'recommended':
      return <Badge variant="primary">Direkomendasikan</Badge>;
    case 'considered':
      return <Badge variant="warning">Dipertimbangkan</Badge>;
    case 'not_recommended':
      return <Badge variant="danger">Tidak Direkomendasikan</Badge>;
    default:
      return <Badge variant="neutral">-</Badge>;
  }
};

