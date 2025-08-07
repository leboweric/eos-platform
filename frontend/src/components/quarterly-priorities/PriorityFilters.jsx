import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, X, ChevronDown, ChevronRight, Eye, EyeOff } from 'lucide-react';

const PriorityFilters = ({ 
  searchQuery, 
  onSearchChange, 
  statusFilter, 
  onStatusFilterChange,
  ownerFilter,
  onOwnerFilterChange,
  teamMembers = [],
  density,
  onDensityChange,
  expandedSections,
  onExpandAll,
  onCollapseAll,
  showFilters,
  onToggleFilters
}) => {
  const [activeFilters, setActiveFilters] = useState([]);

  const clearAllFilters = () => {
    onSearchChange('');
    onStatusFilterChange('all');
    onOwnerFilterChange('all');
    setActiveFilters([]);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (searchQuery) count++;
    if (statusFilter !== 'all') count++;
    if (ownerFilter !== 'all') count++;
    return count;
  };

  return (
    <div className="space-y-4">
      {/* Main filter bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-3 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 min-w-0 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search priorities..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleFilters}
            className={`flex items-center space-x-2 ${
              getActiveFiltersCount() > 0 ? 'bg-blue-50 border-blue-200 text-blue-700' : ''
            }`}
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            {getActiveFiltersCount() > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {getActiveFiltersCount()}
              </Badge>
            )}
          </Button>
        </div>

        {/* View controls */}
        <div className="flex items-center space-x-2">
          {/* Density selector */}
          <Select value={density} onValueChange={onDensityChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="compact">Compact</SelectItem>
              <SelectItem value="comfortable">Comfortable</SelectItem>
              <SelectItem value="spacious">Spacious</SelectItem>
            </SelectContent>
          </Select>

          {/* Expand/Collapse all */}
          <Button 
            variant="outline"
            size="sm"
            onClick={onExpandAll}
            className="hidden sm:flex items-center"
          >
            <ChevronDown className="mr-1 h-4 w-4" />
            Expand All
          </Button>
          <Button 
            variant="outline"
            size="sm"
            onClick={onCollapseAll}
            className="hidden sm:flex items-center"
          >
            <ChevronRight className="mr-1 h-4 w-4" />
            Collapse All
          </Button>
        </div>
      </div>

      {/* Advanced filters (collapsible) */}
      {showFilters && (
        <div className="p-4 bg-gray-50 rounded-lg border space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Status filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Status</label>
              <Select value={statusFilter} onValueChange={onStatusFilterChange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="on-track">On Track</SelectItem>
                  <SelectItem value="off-track">Off Track</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Owner filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Owner</label>
              <Select value={ownerFilter} onValueChange={onOwnerFilterChange}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Owners</SelectItem>
                  {teamMembers.map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active filters display */}
          {getActiveFiltersCount() > 0 && (
            <div className="flex items-center gap-2 pt-2 border-t">
              <span className="text-sm text-gray-600">Active filters:</span>
              <div className="flex flex-wrap gap-2">
                {searchQuery && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Search: "{searchQuery}"
                    <button
                      onClick={() => onSearchChange('')}
                      className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {statusFilter !== 'all' && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Status: {statusFilter.replace('-', ' ')}
                    <button
                      onClick={() => onStatusFilterChange('all')}
                      className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {ownerFilter !== 'all' && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Owner: {teamMembers.find(m => m.id === ownerFilter)?.name || 'Unknown'}
                    <button
                      onClick={() => onOwnerFilterChange('all')}
                      className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear all
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PriorityFilters;