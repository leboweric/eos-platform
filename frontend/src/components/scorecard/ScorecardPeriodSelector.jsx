import React from 'react';
import { format, subMonths } from 'date-fns';
import { Calendar } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/DatePicker';
import { SCORECARD_PERIOD_OPTIONS } from '../../utils/scorecardDateUtils';
import { useTerminology } from '../../contexts/TerminologyContext';

const getOptionLabel = (value, getScorecardTimePeriodLabel) => {
  if (value === 'custom') return 'Custom Range';
  return getScorecardTimePeriodLabel(value);
};

const ScorecardPeriodSelector = ({
  preference,
  customDateRange,
  onChange,
  disabled = false,
  compact = false,
  className = '',
}) => {
  const { getScorecardTimePeriodLabel } = useTerminology();

  const handlePreferenceChange = (value) => {
    if (value === 'custom') {
      const today = new Date();
      const defaultStart = format(subMonths(today, 3), 'yyyy-MM-dd');
      const defaultEnd = format(today, 'yyyy-MM-dd');
      onChange({
        preference: value,
        customDateRange: customDateRange || { startDate: defaultStart, endDate: defaultEnd },
      });
      return;
    }

    onChange({ preference: value, customDateRange: null });
  };

  const handleCustomDateChange = (field, date) => {
    const dateStr = date ? format(date, 'yyyy-MM-dd') : '';
    onChange({
      preference: 'custom',
      customDateRange: {
        ...(customDateRange || {}),
        [field]: dateStr,
      },
    });
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <div className="flex items-center gap-2">
        {!compact && (
          <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Average Period:</span>
        )}
        <Calendar className="h-4 w-4 text-gray-500 shrink-0" />
        <Select value={preference} onValueChange={handlePreferenceChange} disabled={disabled}>
          <SelectTrigger
            className={`bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm ${
              compact ? 'h-8 text-sm w-[180px]' : 'w-[220px]'
            }`}
          >
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent className="bg-white/95 backdrop-blur-sm border-white/20 rounded-xl shadow-xl">
            {SCORECARD_PERIOD_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {getOptionLabel(option.value, getScorecardTimePeriodLabel)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {preference === 'custom' && (
        <div className="flex flex-wrap items-center gap-2">
          <DatePicker
            value={customDateRange?.startDate || ''}
            onChange={(date) => handleCustomDateChange('startDate', date)}
            placeholder="Start date"
            disabled={disabled}
            showQuickDates={false}
            className="w-[140px]"
          />
          <span className="text-sm text-gray-500">to</span>
          <DatePicker
            value={customDateRange?.endDate || ''}
            onChange={(date) => handleCustomDateChange('endDate', date)}
            placeholder="End date"
            disabled={disabled}
            showQuickDates={false}
            minDate={customDateRange?.startDate ? new Date(`${customDateRange.startDate}T12:00:00`) : null}
            className="w-[140px]"
          />
        </div>
      )}
    </div>
  );
};

export default ScorecardPeriodSelector;