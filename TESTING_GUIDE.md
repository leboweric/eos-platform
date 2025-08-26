# Testing the Adaptive Framework Technology
## How to Test Without Affecting Production

### Option 1: Feature Flag in Current App (RECOMMENDED) ✅
**Same URL, special test mode for your account**

```javascript
// frontend/src/pages/QuarterlyPrioritiesPageAdaptive.jsx
import { useAuthStore } from '../stores/authStore';
import AdaptiveObjectiveCard from '../components/adaptive/AdaptiveObjectiveCard';
import PriorityCard from '../components/priorities/PriorityCard';

export default function QuarterlyPrioritiesPage() {
  const { user } = useAuthStore();
  
  // Enable adaptive mode for specific test accounts
  const TEST_ACCOUNTS = [
    'eric@axplatform.app',
    'test@axplatform.app'
  ];
  
  const useAdaptiveFramework = TEST_ACCOUNTS.includes(user.email) || 
                               new URLSearchParams(window.location.search).get('adaptive') === 'true';
  
  if (useAdaptiveFramework) {
    // Show new adaptive interface
    return <AdaptivePrioritiesView />;
  }
  
  // Show current interface for everyone else
  return <CurrentPrioritiesView />;
}
```

**Access it by:**
- Your regular login: https://axplatform.app
- Add `?adaptive=true` to any URL to test: https://axplatform.app/quarterly-priorities?adaptive=true
- Only you see the new version, all other users see normal version

---

### Option 2: Test Page in Production (SAFEST) ✅
**Add a hidden test page only you know about**

```javascript
// frontend/src/App.jsx
// Add this route but don't link to it anywhere
<Route 
  path="/test-adaptive-framework" 
  element={
    <ProtectedRoute requiredRole="admin">
      <TestAdaptiveFramework />
    </ProtectedRoute>
  } 
/>
```

```javascript
// frontend/src/pages/TestAdaptiveFramework.jsx
import { useState } from 'react';
import AdaptiveObjectiveCard from '../components/adaptive/AdaptiveObjectiveCard';
import { Button } from '@/components/ui/button';

export default function TestAdaptiveFramework() {
  const [framework, setFramework] = useState('eos');
  
  // Create test data
  const testObjective = {
    id: 'test-1',
    title: 'Increase Revenue by 25%',
    description: 'Q1 2025 Growth Target',
    framework_type: framework,
    current_value: 15,
    target_value: 25,
    owner_id: 'test-user',
    timeframe_start: '2025-01-01',
    timeframe_end: '2025-03-31',
    framework_attributes: {
      milestones: [
        { id: 1, title: 'Launch new product', completed: true },
        { id: 2, title: 'Onboard 10 enterprise clients', completed: false }
      ],
      confidence: 0.7,
      start_value: 0
    }
  };
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">
        Adaptive Framework Test Page
        <span className="ml-2 text-sm text-gray-500">Patent Pending</span>
      </h1>
      
      {/* Framework Switcher */}
      <div className="mb-6 flex gap-2">
        <Button 
          onClick={() => setFramework('eos')}
          variant={framework === 'eos' ? 'default' : 'outline'}
        >
          EOS View
        </Button>
        <Button 
          onClick={() => setFramework('okr')}
          variant={framework === 'okr' ? 'default' : 'outline'}
        >
          OKR View
        </Button>
        <Button 
          onClick={() => setFramework('4dx')}
          variant={framework === '4dx' ? 'default' : 'outline'}
        >
          4DX View
        </Button>
      </div>
      
      {/* Watch the same data transform! */}
      <div className="space-y-4">
        <AdaptiveObjectiveCard 
          universalObjective={testObjective}
          framework={framework}
          onUpdate={(obj) => console.log('Updated:', obj)}
          onComplete={(id) => console.log('Completed:', id)}
          onCheckIn={(id, data) => console.log('Check-in:', id, data)}
        />
      </div>
      
      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h3 className="font-semibold mb-2">What's Different:</h3>
        <div className="text-sm space-y-1">
          <p><strong>EOS:</strong> Binary progress, milestones, Done/Not Done</p>
          <p><strong>OKR:</strong> 0.0-1.0 scoring, confidence tracking, graduated progress</p>
          <p><strong>4DX:</strong> Lead/lag measures, scoreboard, commitments</p>
        </div>
      </div>
    </div>
  );
}
```

**Access via:** https://axplatform.app/test-adaptive-framework (only you know this URL)

---

### Option 3: Local Testing with Production Database
**Run locally but connect to production data**

```bash
# In your local environment
cd frontend
npm run dev

# Set your .env to point to production API
VITE_API_URL=https://api.axplatform.app
```

Then modify locally to test new features before deploying.

---

### Option 4: Subdomain for Beta Features
**Create a beta subdomain (requires DNS setup)**

- Production: https://axplatform.app
- Beta/Test: https://beta.axplatform.app

Deploy adaptive features only to beta subdomain:
```javascript
// Check if on beta subdomain
const isBeta = window.location.hostname.includes('beta.');

if (isBeta) {
  // Show adaptive features
}
```

---

### Option 5: Organization-Level Toggle
**Enable for specific test organizations**

```sql
-- Enable adaptive framework for your test org
UPDATE organizations 
SET settings = jsonb_set(settings, '{features}', '{"adaptive_framework": true}')
WHERE id = 'your-test-org-uuid';
```

```javascript
// In your app
const { organization } = useAuthStore();

if (organization?.settings?.features?.adaptive_framework) {
  // Show new adaptive interface
}
```

---

## Quick Start Testing Steps

### 1. Add Test Route (5 minutes)
```javascript
// In App.jsx, add:
import TestAdaptiveFramework from './pages/TestAdaptiveFramework';

// In routes:
<Route path="/test-adaptive" element={<TestAdaptiveFramework />} />
```

### 2. Create Test Page
Copy the TestAdaptiveFramework.jsx code above

### 3. Test It
- Login normally
- Navigate to: /test-adaptive
- Try switching frameworks
- See the same data display differently!

### 4. No Risk
- This page is isolated
- No other users can see it
- Production data is safe
- Current app unaffected

---

## Demo Script for Testing

1. **Login** to your normal account
2. **Navigate** to `/test-adaptive` 
3. **Create a test objective** as EOS Rock
4. **Watch it transform**:
   - Click "OKR View" - see it become a Key Result with 0.65 score
   - Click "EOS View" - see it return to binary Rock with milestones
   - Click "4DX View" - see it become a WIG with scoreboards
5. **Same data, different framework!** 🎉

---

## Production Testing Checklist

- [ ] Test page works with sample data
- [ ] Framework switching changes display
- [ ] No console errors
- [ ] Current pages unaffected
- [ ] Test with real data (create test objective)
- [ ] Verify database writes to universal_objectives
- [ ] Test rollback (switch back to old view)

This way you can test everything safely in production without any risk!