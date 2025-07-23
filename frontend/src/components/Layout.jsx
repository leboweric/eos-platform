import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import TrialBanner from './TrialBanner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { organizationService } from '../services/organizationService';
import DepartmentSelector from './DepartmentSelector';
import HelpWidget from './help/HelpWidget';
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
  GitBranch
} from 'lucide-react';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);
  const [logoKey, setLogoKey] = useState(Date.now()); // Force refresh of logo
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isOnLeadershipTeam } = useAuthStore();

  useEffect(() => {
    // Check if consultant is impersonating a client
    setIsImpersonating(localStorage.getItem('consultantImpersonating') === 'true');
    
    // Set logo URL if organization ID is available
    if (user?.organizationId) {
      const orgId = localStorage.getItem('impersonatedOrgId') || user.organizationId;
      setLogoUrl(organizationService.getLogoUrl(orgId));
    }
  }, [user]);
  
  // Refresh logo when returning to this page
  useEffect(() => {
    setLogoKey(Date.now());
  }, [location.pathname]);

  const baseNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: '2-Page Plan', href: '/business-blueprint', icon: Target, requiresLeadership: true },
    { name: 'Quarterly Priorities', href: '/quarterly-priorities', icon: CheckSquare },
    { name: 'Scorecard', href: '/scorecard', icon: BarChart3 },
    { name: 'Meetings', href: '/meetings', icon: Calendar },
    { name: 'To-Dos', href: '/todos', icon: ClipboardList },
    { name: 'Issues', href: '/issues', icon: MessageSquare },
    { name: 'Organizational Chart', href: '/organizational-chart', icon: GitBranch },
    { name: 'Departments', href: '/departments', icon: Building2 },
    { name: 'Team', href: '/users', icon: Users },
    { name: 'Organization', href: '/organization-settings', icon: Settings },
    { name: 'Billing', href: '/billing', icon: CreditCard },
  ];

  // Filter navigation based on user permissions
  const navigation = baseNavigation.filter(item => {
    // If item requires leadership and user is not on leadership team, hide it
    if (item.requiresLeadership && !isOnLeadershipTeam()) {
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

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:relative lg:inset-auto lg:flex lg:flex-col lg:min-h-screen
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between h-16 px-6 border-b">
          <Link to="/dashboard" className="flex items-center space-x-2">
            {logoUrl ? (
              <img 
                key={logoKey}
                src={`${logoUrl}?t=${logoKey}`} 
                alt={user?.organizationName} 
                className="h-10 w-auto max-w-[150px] object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div className="flex items-center space-x-2" style={{ display: logoUrl ? 'none' : 'flex' }}>
              <Target className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">Forty-2</span>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
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
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
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
        <div className="mt-auto p-4 border-t bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="flex-1">
              <div className="text-xs text-gray-500">Organization</div>
              <div className="text-sm font-medium text-gray-900 truncate">
                {user?.organizationName || 'Loading...'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-white border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden mr-3"
              >
                <Menu className="h-6 w-6" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900">
                {user?.organizationName && (
                  <span>{user.organizationName} </span>
                )}
                {navigation.find(item => item.href === location.pathname)?.name || 'Forty-2'}
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              {/* Department Selector - Global placement */}
              <DepartmentSelector className="border-2 border-blue-500" />
              
              {/* Leadership Team Badge */}
              {isOnLeadershipTeam() && (
                <Badge variant="default" className="bg-purple-600 hover:bg-purple-700">
                  Leadership Team
                </Badge>
              )}
              
              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.avatarUrl} alt={user?.firstName} />
                      <AvatarFallback>{getUserInitials()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => navigate('/user-settings')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => navigate('/user-settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">
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
        </main>
      </div>
      
      {/* Help Widget - appears on all pages */}
      <HelpWidget />
    </div>
  );
};

export default Layout;

