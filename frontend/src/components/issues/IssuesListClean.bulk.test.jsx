import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import IssuesListClean from './IssuesListClean';

vi.mock('../../stores/authStore', () => ({
  useAuthStore: () => ({
    user: { id: 'user-1', organizationId: 'org-1' }
  })
}));

vi.mock('../../services/organizationService', () => ({
  organizationService: {
    getOrganization: vi.fn().mockResolvedValue({
      theme_primary_color: '#3B82F6',
      theme_secondary_color: '#1E40AF',
      theme_accent_color: '#60A5FA'
    })
  }
}));

vi.mock('../../utils/themeUtils', () => ({
  getOrgTheme: () => ({ primary: '#3B82F6', secondary: '#1E40AF', accent: '#60A5FA' }),
  saveOrgTheme: vi.fn(),
  hexToRgba: (_color, alpha) => `rgba(59, 130, 246, ${alpha})`
}));

vi.mock('../../utils/debugTheme', () => ({
  debugTheme: vi.fn()
}));

const mockIssues = [
  {
    id: 'issue-1',
    title: 'Pipeline health',
    status: 'open',
    timeline: 'short_term',
    owner_name: 'Admin User',
    created_at: '2026-06-23T00:00:00.000Z'
  },
  {
    id: 'issue-2',
    title: 'Joel Time Card',
    status: 'open',
    timeline: 'short_term',
    owner_name: 'Admin User',
    created_at: '2026-06-23T00:00:00.000Z'
  }
];

function BulkSelectionHarness() {
  const [selectedIssueIds, setSelectedIssueIds] = useState([]);

  return (
    <>
      {selectedIssueIds.length > 0 && (
        <div data-testid="page-toolbar">Move to Long-Term ({selectedIssueIds.length})</div>
      )}
      <IssuesListClean
        issues={mockIssues}
        onEdit={vi.fn()}
        onStatusChange={vi.fn()}
        tableView
        enableBulkSelection
        enableDragDrop
        selectedIssueIds={selectedIssueIds}
        onSelectionChange={setSelectedIssueIds}
        currentTimeline="short_term"
        onBulkMoveTimeline={vi.fn()}
        isBulkMoving={false}
      />
    </>
  );
}

describe('IssuesListClean bulk selection smoke test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'addEventListener').mockImplementation(() => {});
    vi.spyOn(window, 'removeEventListener').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows Move to Long-Term toolbar after selecting an issue checkbox', async () => {
    const user = userEvent.setup();
    render(<BulkSelectionHarness />);

    const checkboxes = await screen.findAllByRole('checkbox', { name: 'Select issue' });
    await user.click(checkboxes[0]);

    await waitFor(() => {
      expect(screen.getByText('1 issue selected')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Move to Long-Term/i })).toBeInTheDocument();
      expect(screen.getByTestId('page-toolbar')).toHaveTextContent('Move to Long-Term (1)');
    });
  });

  it('shows Move to Long-Term for all selected issues via select-all', async () => {
    const user = userEvent.setup();
    render(<BulkSelectionHarness />);

    const checkboxes = await screen.findAllByRole('checkbox');
    await user.click(checkboxes[0]);

    await waitFor(() => {
      expect(screen.getByText('2 issues selected')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Move to Long-Term/i })).toBeInTheDocument();
      expect(screen.getByTestId('page-toolbar')).toHaveTextContent('Move to Long-Term (2)');
    });
  });
});