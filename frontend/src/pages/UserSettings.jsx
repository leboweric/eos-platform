import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Lock, Mail, Shield } from 'lucide-react';
import ChangePasswordDialog from '../components/settings/ChangePasswordDialog';

const UserSettings = () => {
  const { user } = useAuthStore();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <User className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">User Settings</h1>
          <p className="text-gray-600">Manage your account settings and preferences</p>
        </div>
      </div>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Account Information
          </CardTitle>
          <CardDescription>
            Your account details and information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-500">Name</p>
            <p className="text-lg">{user?.firstName} {user?.lastName}</p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-500 flex items-center gap-1">
              <Mail className="h-4 w-4" />
              Email
            </p>
            <p className="text-lg">{user?.email}</p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-500 flex items-center gap-1">
              <Shield className="h-4 w-4" />
              Role
            </p>
            <p className="text-lg capitalize">{user?.role || 'Member'}</p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-500">Organization</p>
            <p className="text-lg">{user?.organizationName}</p>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Security
          </CardTitle>
          <CardDescription>
            Manage your password and security settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => setChangePasswordOpen(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Lock className="h-4 w-4" />
            Change Password
          </Button>
        </CardContent>
      </Card>

      {/* Change Password Dialog */}
      <ChangePasswordDialog 
        open={changePasswordOpen} 
        onOpenChange={setChangePasswordOpen}
      />
    </div>
  );
};

export default UserSettings;