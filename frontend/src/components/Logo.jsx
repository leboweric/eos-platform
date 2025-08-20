import { Link } from 'react-router-dom';
import { Target } from 'lucide-react';

const Logo = ({ 
  variant = 'default', // default, hero, nav, minimal
  className = '',
  showTagline = false,
  animated = false,
  asLink = true 
}) => {
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
export const LogoSVG = ({ className = '', size = 120 }) => {
  return (
    <svg 
      width={size} 
      height={size * 0.4} 
      viewBox="0 0 300 120" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e40af" />
          <stop offset="100%" stopColor="#3730a3" />
        </linearGradient>
        <filter id="logoShadow">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.1"/>
        </filter>
      </defs>
      
      <g filter="url(#logoShadow)">
        {/* A */}
        <path 
          d="M 30 90 L 50 30 L 70 90 M 40 70 L 60 70" 
          stroke="url(#logoGradient)" 
          strokeWidth="8" 
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* X */}
        <path 
          d="M 100 30 L 140 90 M 140 30 L 100 90" 
          stroke="url(#logoGradient)" 
          strokeWidth="8" 
          fill="none"
          strokeLinecap="round"
        />
        
        {/* P */}
        <path 
          d="M 170 90 L 170 30 L 210 30 Q 230 30 230 50 Q 230 70 210 70 L 170 70" 
          stroke="url(#logoGradient)" 
          strokeWidth="8" 
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      
      {/* Animated accent dot */}
      <circle cx="245" cy="80" r="4" fill="url(#logoGradient)">
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

export default Logo;