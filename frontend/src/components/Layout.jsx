import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useTerminology } from '../contexts/TerminologyContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import TrialBanner from './TrialBanner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { organizationService } from '../services/organizationService';
import DepartmentSelector from './DepartmentSelector';
import DarkModeToggle from './DarkModeToggle';
import HelpWidget from './help/HelpWidget';
import { LogoText } from './Logo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Target,
  Home,
  Users,
  BarChart3,
  Calendar,
  CheckSquare,
  MessageSquare,
  ClipboardList,
  Menu,
  X,
  LogOut,
  Settings,
  User,
  Building2,
  CreditCard,
  ArrowLeft,
  Briefcase,
  Cloud,
  GitBranch,
  FileText,
  TrendingUp
} from 'lucide-react';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);
  const [logoKey] = useState(Date.now()); // Cache buster for logo
  const [hideSidebar, setHideSidebar] = useState(false);
  const [logoSize, setLogoSize] = useState(() => {
    return parseInt(localStorage.getItem('logoSize') || '100');
  });
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isOnLeadershipTeam } = useAuthStore();
  const { labels } = useTerminology();

  useEffect(() => {
    // Check if consultant is impersonating a client
    setIsImpersonating(localStorage.getItem('consultantImpersonating') === 'true');
    
    // Set logo URL if organization ID is available
    if (user?.organizationId) {
      const orgId = localStorage.getItem('impersonatedOrgId') || user.organizationId;
      setLogoUrl(organizationService.getLogoUrl(orgId));
    }
  }, [user]);
  
  // Listen for logo size changes
  useEffect(() => {
    const handleLogoSizeChange = (event) => {
      setLogoSize(event.detail);
    };
    
    window.addEventListener('logoSizeChanged', handleLogoSizeChange);
    
    return () => {
      window.removeEventListener('logoSizeChanged', handleLogoSizeChange);
    };
  }, []);
  
  // Check for temporary sidebar hide flag
  useEffect(() => {
    setHideSidebar(sessionStorage.getItem('hideSidebarTemp') === 'true');
  }, [location.pathname]);

  const baseNavigation = [
    { name: 'My AXP', href: '/dashboard', icon: Home },
    { name: labels?.priorities || 'Quarterly Priorities', href: '/quarterly-priorities', icon: CheckSquare },
    { name: labels?.scorecard || 'Scorecard', href: '/scorecard', icon: BarChart3 },
    { name: labels?.todos || 'To-Dos', href: '/todos', icon: ClipboardList },
    { name: labels?.issues || 'Issues', href: '/issues', icon: MessageSquare },
    { name: 'Meetings', href: '/meetings', icon: Calendar },
    { name: labels?.processes || 'Processes', href: '/processes', icon: FileText },
    { name: labels?.business_blueprint_label || '2-Page Plan', href: '/business-blueprint', icon: Target },
    { name: labels?.accountability_chart_label || 'Organizational Chart', href: '/organizational-chart', icon: GitBranch },
    { name: 'Document Repository', href: '/documents', icon: FileText },
    { name: 'Departments', href: '/departments', icon: Building2, requiresAdmin: true },
    { name: 'Users', href: '/users', icon: Users, requiresAdmin: true },
    { name: 'Organization', href: '/organization-settings', icon: Settings, requiresAdmin: true },
    { name: 'Storage Config', href: '/organization-settings/storage', icon: Cloud, requiresAdmin: true },
    { name: 'Terminology', href: '/terminology-settings', icon: Settings, requiresAdmin: true },
    { name: 'Billing', href: '/billing', icon: CreditCard, requiresAdmin: true },
  ];

  // Check if user is super admin (you)
  const isSuperAdmin = () => {
    const superAdminEmails = ['eric@axplatform.app', 'ericlebow@gmail.com']; // Add your email(s) here
    return superAdminEmails.includes(user?.email?.toLowerCase());
  };

  // Filter navigation based on user permissions
  const navigation = baseNavigation.filter(item => {
    // If item requires super admin and user is not super admin, hide it
    if (item.requiresSuperAdmin && !isSuperAdmin()) {
      return false;
    }
    // If item requires leadership and user is not on leadership team, hide it
    if (item.requiresLeadership && !isOnLeadershipTeam()) {
      return false;
    }
    // If item requires admin and user is not admin, hide it
    if (item.requiresAdmin && user?.role !== 'admin') {
      return false;
    }
    return true;
  });

  // Add Consultant Dashboard if user is consultant and not impersonating
  if (user?.isConsultant && !isImpersonating) {
    navigation.unshift({ name: 'Consultant Dashboard', href: '/consultant', icon: Briefcase });
  }

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleReturnToConsultant = () => {
    // Clear impersonation state
    localStorage.removeItem('consultantImpersonating');
    localStorage.removeItem('impersonatedOrgId');
    // Force reload to refresh auth state
    window.location.href = '/consultant';
  };

  const getUserInitials = () => {
    if (!user) return 'U';
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Hidden when hideSidebar flag is set */}
      {!hideSidebar && (
        <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:relative lg:inset-auto lg:flex lg:flex-col lg:min-h-screen
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between h-20 px-6 border-b">
          <Link to="/dashboard" className="flex items-center space-x-2">
            {logoUrl ? (
              <img 
                key={logoKey}
                src={`${logoUrl}?t=${logoKey}`} 
                alt={user?.organizationName} 
                className="object-contain"
                style={{
                  height: `${96 * (logoSize / 100)}px`,
                  maxWidth: `${300 * (logoSize / 100)}px`,
                  width: 'auto'
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div 
              className="flex items-center"
              style={{ display: logoUrl ? 'none' : 'flex' }}
            >
              <LogoText useThemeColors={true} />
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-600 dark:text-gray-400"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                    ${isActive
                      ? 'bg-primary text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
                    }
                  `}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Organization info */}
        <div className="mt-auto p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center space-x-3">
            <div className="flex-1">
              <div className="text-xs text-gray-500 dark:text-gray-400">Organization</div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {user?.organizationName || 'Loading...'}
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-b border-slate-200/50 dark:border-gray-700/50 px-4 py-4 shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center flex-1">
              {!hideSidebar && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden mr-3 hover:bg-slate-100/50 dark:hover:bg-gray-700/50 p-2 rounded-lg transition-all duration-200"
                >
                  <Menu className="h-6 w-6 text-slate-700 dark:text-gray-300" />
                </button>
              )}
              <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                {user?.organizationName && (
                  <span>{user.organizationName} </span>
                )}
                {navigation.find(item => item.href === location.pathname)?.name || 'AXP'}
              </h1>
            </div>

            {/* Center Logo */}
            <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center">
              <LogoText useThemeColors={true} />
            </div>

            <div className="flex items-center space-x-4">
              {/* Department Selector - Global placement */}
              <DepartmentSelector />
              
              {/* Dark Mode Toggle */}
              <DarkModeToggle />
              
              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-slate-100/50 transition-all duration-200 p-0">
                    <Avatar className="h-10 w-10 ring-2 ring-white shadow-lg">
                      <AvatarImage src={user?.avatarUrl} alt={user?.firstName} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-sm">{getUserInitials()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-white/20 dark:border-gray-700/20 rounded-xl shadow-xl" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-gray-700 dark:to-gray-800 rounded-t-lg -m-1 p-3 mb-2">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-bold leading-none text-slate-900 dark:text-gray-100">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs leading-none text-slate-600 dark:text-gray-400 font-medium">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-slate-200/50" />
                  <DropdownMenuItem onSelect={() => navigate('/user-settings')} className="hover:bg-slate-50/80 rounded-lg mx-1 transition-all duration-200 cursor-pointer">
                    <User className="mr-2 h-4 w-4 text-slate-600" />
                    <span className="font-medium text-slate-700">Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => navigate('/user-settings')} className="hover:bg-slate-50/80 rounded-lg mx-1 transition-all duration-200 cursor-pointer">
                    <Settings className="mr-2 h-4 w-4 text-slate-600" />
                    <span className="font-medium text-slate-700">Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-slate-200/50" />
                  <DropdownMenuItem onSelect={handleLogout} className="hover:bg-red-50/80 rounded-lg mx-1 transition-all duration-200 text-red-600 cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span className="font-medium">Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto bg-gray-50 dark:bg-gray-900 transition-colors">
          <TrialBanner />
          {isImpersonating && (
            <Alert className="mb-4 border-blue-200 bg-blue-50">
              <AlertDescription className="flex items-center justify-between">
                <span>
                  You are currently viewing this organization as a Strategy Consultant.
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReturnToConsultant}
                  className="ml-4"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Return to Consultant Dashboard
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {children}
          
          {/* Footer */}
          <div className="mt-auto pt-8 pb-4 text-center">
            <p className="text-xs text-gray-400">
              Patent Pending Serial No. 63/870,133 • AXP™ - Adaptive Execution Platform™
            </p>
          </div>
        </main>
      </div>
      
      {/* Help Widget - appears on all pages */}
      <HelpWidget />
    </div>
  );
};

export default Layout;

