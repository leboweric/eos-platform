import { Link } from 'react-router-dom';
import { Target } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getOrgTheme, saveOrgTheme } from '../utils/themeUtils';
import { useAuthStore } from '../stores/authStore';
import { organizationService } from '../services/organizationService';

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
  const [customLogoUrl, setCustomLogoUrl] = useState(null);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    if (useThemeColors) {
      try {
        const orgId = user?.organizationId || user?.organization_id || localStorage.getItem('organizationId');
        const savedTheme = getOrgTheme(orgId);
        if (savedTheme && savedTheme.primary && savedTheme.secondary) {
          setThemeColors(savedTheme);
        }
      } catch (error) {
        console.error('Error loading theme colors for main logo:', error);
      }
    }
  }, [useThemeColors, user]);

  // Load custom organization logo
  useEffect(() => {
    const loadCustomLogo = async () => {
      try {
        const orgId = user?.organizationId || user?.organization_id;
        if (orgId) {
          const logoUrl = organizationService.getLogoUrl(orgId);
          // Add timestamp to prevent caching
          setCustomLogoUrl(`${logoUrl}?t=${Date.now()}`);
        }
      } catch (error) {
        console.error('Error loading custom logo:', error);
        setLogoError(true);
      }
    };
    
    loadCustomLogo();
  }, [user]);
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
          src={customLogoUrl && !logoError ? customLogoUrl : "/AXP_logo_upper_left_transparent.png?v=2"}
          alt="AXP - Adaptive Execution Platform Logo" 
          className={`
            ${sizes[variant]} 
            w-auto 
            transition-all 
            duration-300
            ${animated ? 'group-hover:scale-105 group-hover:brightness-110' : ''}
          `}
          onError={() => {
            console.log('Custom logo failed to load, using default');
            setLogoError(true);
          }}
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
      try {
        const orgId = user?.organizationId || user?.organization_id || localStorage.getItem('organizationId');
        const savedTheme = getOrgTheme(orgId);
        if (savedTheme && savedTheme.primary && savedTheme.secondary) {
          setColors({
            primary: savedTheme.primary || primaryColor,
            secondary: savedTheme.secondary || secondaryColor
          });
        }
      } catch (error) {
        console.error('Error loading theme colors for SVG logo:', error);
      }
    }
  }, [useThemeColors, user, primaryColor, secondaryColor]);

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
// Now uses the new gradient logo image with dynamic color support
export const LogoText = ({ 
  size = 'text-5xl',
  className = '',
  useThemeColors = false,
  gradient = true,
  height = 'h-10'
}) => {
  const { user } = useAuthStore();
  const [themeColors, setThemeColors] = useState({
    primary: '#0D9488', // Default teal (matches the logo)
    secondary: '#0F766E',
    accent: '#14B8A6'
  });

  useEffect(() => {
    const loadTheme = async () => {
      if (useThemeColors) {
        try {
          const orgId = user?.organizationId || user?.organization_id || localStorage.getItem('organizationId');
          if (!orgId) return;
          
          const savedTheme = getOrgTheme(orgId);
          if (savedTheme && savedTheme.primary && savedTheme.secondary) {
            setThemeColors(savedTheme);
          } else {
            // Try to fetch from organization service if no saved theme
            try {
              const orgData = await organizationService.getOrganization();
              if (orgData && orgData.theme_primary_color) {
                const theme = {
                  primary: orgData.theme_primary_color || '#0D9488',
                  secondary: orgData.theme_secondary_color || '#0F766E',
                  accent: orgData.theme_accent_color || '#14B8A6'
                };
                setThemeColors(theme);
                saveOrgTheme(orgId, theme);
              }
            } catch (fetchError) {
              console.error('Failed to fetch organization theme for logo:', fetchError);
            }
          }
        } catch (error) {
          console.error('Error loading theme colors for logo:', error);
        }
      }
    };
    
    loadTheme();
  }, [useThemeColors, user]);

  // Calculate hue rotation based on theme color
  // The base logo is teal (~174 degrees hue)
  const getHueRotation = (hexColor) => {
    if (!hexColor || hexColor === '#0D9488') return 0; // No rotation for default teal
    
    // Convert hex to HSL to get hue
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    
    if (max !== min) {
      const d = max - min;
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    
    const targetHue = h * 360;
    const baseHue = 174; // Teal hue
    return targetHue - baseHue;
  };

  const hueRotation = useThemeColors ? getHueRotation(themeColors.primary) : 0;
  const filterStyle = hueRotation !== 0 ? { filter: `hue-rotate(${hueRotation}deg)` } : {};

  // Use the new gradient logo image with optional hue rotation
  return (
    <img 
      src="/axp-logo.png" 
      alt="AXP - Adaptive Execution Platform" 
      className={`${height} w-auto ${className}`}
      style={filterStyle}
    />
  );
};

export default Logo;