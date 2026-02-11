import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'gray' | 'green' | 'yellow' | 'red' | 'blue' | 'purple';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({
  children,
  variant = 'gray',
  size = 'md',
  className = '',
}: BadgeProps): React.ReactElement {
  const variantStyles = {
    gray: 'bg-gray-100 text-gray-800',
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
    blue: 'bg-blue-100 text-blue-800',
    purple: 'bg-purple-100 text-purple-800',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  const combinedClassName = `
    inline-flex items-center font-medium rounded-full
    ${variantStyles[variant]}
    ${sizeStyles[size]}
    ${className}
  `.trim();

  return <span className={combinedClassName}>{children}</span>;
}

// Status Badge helper for delivery statuses
export function getStatusBadgeVariant(
  status: string
): 'gray' | 'green' | 'yellow' | 'red' | 'blue' | 'purple' {
  switch (status) {
    case 'Requested':
      return 'blue';
    case 'Assigned':
      return 'purple';
    case 'InTransit':
      return 'yellow';
    case 'Delivered':
      return 'green';
    case 'Failed':
      return 'red';
    case 'Cancelled':
      return 'gray';
    default:
      return 'gray';
  }
}
