import { Link } from 'react-router-dom';
import { Target } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getOrgTheme } from '../utils/themeUtils';
import { useAuthStore } from '../stores/authStore';

/**
 * Logo Component Collection
 * 
 * Available Components:
 * - Logo: Main logo component (PNG-based, not customizable)
 * - LogoSVG: SVG version with customizable colors
 * - LogoText: Text-only version with gradient support
 * - LogoIcon: Small icon version
 * 
 * To use themed versions:
 * <LogoText useThemeColors={true} />
 * <LogoSVG useThemeColors={true} />
 */

const Logo = ({ 
  variant = 'default', // default, hero, nav, minimal
  className = '',
  showTagline = false,
  animated = false,
  asLink = true,
  useThemeColors = false // New prop to enable theme-based coloring
}) => {
  const { user } = useAuthStore();
  const [themeColors, setThemeColors] = useState({
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#60A5FA'
  });

  useEffect(() => {
    if (useThemeColors) {
      const orgId = user?.organizationId || user?.organization_id || localStorage.getItem('organizationId');
      const savedTheme = getOrgTheme(orgId);
      if (savedTheme) {
        setThemeColors(savedTheme);
      }
    }
  }, [useThemeColors, user]);
  const sizes = {
    hero: 'h-20',
    default: 'h-12',
    nav: 'h-10',
    minimal: 'h-8'
  };

  const LogoContent = () => (
    <div className={`relative group ${className}`}>
      {/* Logo Image with Effects */}
      <div className="relative">
        {/* Glow effect on hover */}
        {animated && (
          <div className="absolute inset-0 bg-blue-500 opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500" />
        )}
        
        {/* Main Logo */}
        <img 
          src="/AXP_logo_upper_left_transparent.png?v=2" 
          alt="AXP - Adaptive Execution Platform Logo" 
          className={`
            ${sizes[variant]} 
            w-auto 
            transition-all 
            duration-300
            ${animated ? 'group-hover:scale-105 group-hover:brightness-110' : ''}
          `}
        />
        
        {/* Premium badge for hero variant */}
        {variant === 'hero' && (
          <div className="absolute -top-2 -right-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs px-2 py-1 rounded-full font-semibold animate-pulse">
            Platform
          </div>
        )}
      </div>

      {/* Tagline */}
      {showTagline && (
        <div className="mt-2">
          <p className="text-sm font-medium text-gray-600">
            Adaptive Execution Platform
          </p>
          <p className="text-xs text-gray-500">
            Your Framework. Your Terms.
          </p>
        </div>
      )}
    </div>
  );

  if (asLink) {
    return (
      <Link to="/" className="inline-block">
        <LogoContent />
      </Link>
    );
  }

  return <LogoContent />;
};

// Alternative SVG-based logo for better control
export const LogoSVG = ({ 
  className = '', 
  size = 120,
  primaryColor = '#1e40af',
  secondaryColor = '#3730a3',
  useThemeColors = false 
}) => {
  const { user } = useAuthStore();
  const [colors, setColors] = useState({
    primary: primaryColor,
    secondary: secondaryColor
  });

  useEffect(() => {
    if (useThemeColors) {
      const orgId = user?.organizationId || user?.organization_id || localStorage.getItem('organizationId');
      const savedTheme = getOrgTheme(orgId);
      if (savedTheme) {
        setColors({
          primary: savedTheme.primary,
          secondary: savedTheme.secondary
        });
      }
    }
  }, [useThemeColors, user]);

  // Generate unique ID for this instance to avoid conflicts
  const gradientId = `logoGradient-${Math.random().toString(36).substr(2, 9)}`;
  const shadowId = `logoShadow-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <svg 
      width={size} 
      height={size * 0.4} 
      viewBox="0 0 300 120" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.primary} />
          <stop offset="100%" stopColor={colors.secondary} />
        </linearGradient>
        <filter id={shadowId}>
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.1"/>
        </filter>
      </defs>
      
      <g filter={`url(#${shadowId})`}>
        {/* A */}
        <path 
          d="M 30 90 L 50 30 L 70 90 M 40 70 L 60 70" 
          stroke={`url(#${gradientId})`} 
          strokeWidth="8" 
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* X */}
        <path 
          d="M 100 30 L 140 90 M 140 30 L 100 90" 
          stroke={`url(#${gradientId})`} 
          strokeWidth="8" 
          fill="none"
          strokeLinecap="round"
        />
        
        {/* P */}
        <path 
          d="M 170 90 L 170 30 L 210 30 Q 230 30 230 50 Q 230 70 210 70 L 170 70" 
          stroke={`url(#${gradientId})`} 
          strokeWidth="8" 
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      
      {/* Animated accent dot */}
      <circle cx="245" cy="80" r="4" fill={`url(#${gradientId})`}>
        <animate 
          attributeName="opacity" 
          values="0;1;0" 
          dur="2s" 
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  );
};

// Minimal icon version for small spaces
export const LogoIcon = ({ size = 32, className = '' }) => {
  return (
    <div 
      className={`
        relative 
        w-${size/4} 
        h-${size/4} 
        bg-gradient-to-br 
        from-blue-600 
        to-indigo-600 
        rounded-lg 
        flex 
        items-center 
        justify-center 
        shadow-lg
        ${className}
      `}
    >
      <span className="text-white font-bold text-lg">AX</span>
    </div>
  );
};

// Text-based logo for navigation and places where we need pure text
export const LogoText = ({ 
  size = 'text-5xl',
  className = '',
  useThemeColors = false,
  gradient = true
}) => {
  const { user } = useAuthStore();
  const [themeColors, setThemeColors] = useState({
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#60A5FA'
  });

  useEffect(() => {
    if (useThemeColors) {
      const orgId = user?.organizationId || user?.organization_id || localStorage.getItem('organizationId');
      const savedTheme = getOrgTheme(orgId);
      if (savedTheme) {
        setThemeColors(savedTheme);
      }
    }
  }, [useThemeColors, user]);

  if (gradient && useThemeColors) {
    return (
      <span 
        className={`${size} font-bold bg-gradient-to-r bg-clip-text text-transparent ${className}`}
        style={{
          backgroundImage: `linear-gradient(to right, ${themeColors.primary}, ${themeColors.secondary})`
        }}
      >
        AXP
      </span>
    );
  }

  if (gradient) {
    return (
      <span className={`${size} font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent ${className}`}>
        AXP
      </span>
    );
  }

  return (
    <span 
      className={`${size} font-bold ${className}`}
      style={{ color: useThemeColors ? themeColors.primary : '#3B82F6' }}
    >
      AXP
    </span>
  );
};

export default Logo;