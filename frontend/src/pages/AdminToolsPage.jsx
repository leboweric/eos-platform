import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  FileSpreadsheet,
  Target,
  AlertTriangle,
  CheckSquare,
  Upload,
  Lock,
  ArrowRight
} from 'lucide-react';

const AdminToolsPage = () => {
  const navigate = useNavigate();

  const tools = [
    {
      id: 'bulk-users',
      title: 'Bulk Import Users',
      description: 'Import multiple users at once using an Excel spreadsheet',
      icon: Users,
      color: 'blue',
      href: '/admin/bulk-import',
      available: true,
      stats: {
        label: 'Format',
        value: 'Excel/CSV'
      }
    },
    {
      id: 'import-scorecard',
      title: 'Import Scorecard',
      description: 'Import scorecard metrics and historical data from Ninety.io or other systems',
      icon: FileSpreadsheet,
      color: 'green',
      href: '/admin/import-scorecard',
      available: true,
      stats: {
        label: 'Source',
        value: 'Ninety.io'
      }
    },
    {
      id: 'import-priorities',
      title: 'Import Priorities',
      description: 'Bulk import quarterly priorities and rocks from external systems',
      icon: Target,
      color: 'purple',
      href: '/priorities/import',
      available: true,
      stats: {
        label: 'Source',
        value: 'Ninety.io'
      }
    },
    {
      id: 'import-issues',
      title: 'Import Issues',
      description: 'Import issues and IDS items from other platforms',
      icon: AlertTriangle,
      color: 'orange',
      href: '/issues/import',
      available: true,
      stats: {
        label: 'Source',
        value: 'Ninety.io'
      }
    },
    {
      id: 'import-todos',
      title: 'Import To-Dos',
      description: 'Import tasks and to-do items from Ninety.io or other systems',
      icon: CheckSquare,
      color: 'teal',
      href: '/admin/import-todos',
      available: true,
      stats: {
        label: 'Source',
        value: 'Ninety.io'
      }
    }
  ];

  const getColorClasses = (color) => {
    switch (color) {
      case 'blue':
        return {
          bg: 'bg-blue-50',
          icon: 'bg-blue-100',
          iconText: 'text-blue-600',
          button: 'bg-blue-600 hover:bg-blue-700'
        };
      case 'green':
        return {
          bg: 'bg-green-50',
          icon: 'bg-green-100',
          iconText: 'text-green-600',
          button: 'bg-green-600 hover:bg-green-700'
        };
      case 'purple':
        return {
          bg: 'bg-purple-50',
          icon: 'bg-purple-100',
          iconText: 'text-purple-600',
          button: 'bg-purple-600 hover:bg-purple-700'
        };
      case 'orange':
        return {
          bg: 'bg-orange-50',
          icon: 'bg-orange-100',
          iconText: 'text-orange-600',
          button: 'bg-orange-600 hover:bg-orange-700'
        };
      case 'teal':
        return {
          bg: 'bg-teal-50',
          icon: 'bg-teal-100',
          iconText: 'text-teal-600',
          button: 'bg-teal-600 hover:bg-teal-700'
        };
      default:
        return {
          bg: 'bg-gray-50',
          icon: 'bg-gray-100',
          iconText: 'text-gray-600',
          button: 'bg-gray-600 hover:bg-gray-700'
        };
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
            <Upload className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Tools</h1>
        </div>
        <p className="text-gray-600 text-lg">
          Powerful tools for importing data and managing your organization
        </p>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tools.map((tool) => {
          const colors = getColorClasses(tool.color);
          const Icon = tool.icon;

          return (
            <Card 
              key={tool.id}
              className={`relative overflow-hidden transition-all duration-300 ${
                tool.available 
                  ? 'hover:shadow-lg hover:-translate-y-1 cursor-pointer' 
                  : 'opacity-75'
              }`}
              onClick={() => tool.available && navigate(tool.href)}
            >
              {!tool.available && (
                <div className="absolute inset-0 bg-gray-900/5 backdrop-blur-[1px] z-10 flex items-center justify-center">
                  <div className="bg-white rounded-lg p-3 shadow-lg flex items-center gap-2">
                    <Lock className="h-5 w-5 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Coming Soon</span>
                  </div>
                </div>
              )}
              
              <div className={`absolute top-0 right-0 w-32 h-32 ${colors.bg} rounded-bl-[100px] opacity-50`} />
              
              <CardHeader className="relative">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-3 rounded-xl ${colors.icon}`}>
                    <Icon className={`h-8 w-8 ${colors.iconText}`} />
                  </div>
                  {tool.available ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      Available
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                      Coming Soon
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-xl font-bold text-gray-900">
                  {tool.title}
                </CardTitle>
                <CardDescription className="text-gray-600 mt-2">
                  {tool.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">
                        {tool.stats.label}
                      </p>
                      <p className="text-sm font-semibold text-gray-900 mt-1">
                        {tool.stats.value}
                      </p>
                    </div>
                  </div>
                  
                  {tool.available && (
                    <Button 
                      size="sm"
                      className={`${colors.button} text-white`}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(tool.href);
                      }}
                    >
                      Open Tool
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Section */}
      <Card className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-blue-600" />
            Import Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Always download and use the provided templates for best results</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Review the preview carefully before confirming any import</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Imports cannot be undone - make sure to backup your data first</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>For large imports, the process may take a few minutes to complete</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminToolsPage;