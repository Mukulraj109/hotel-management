import React from 'react';
import { cn } from '../../utils/cn';
import { Button } from '../ui/Button';

interface FilterOption {
  key: string;
  label: string;
  type: 'select' | 'date' | 'daterange' | 'search' | 'toggle';
  options?: { value: string; label: string }[];
  placeholder?: string;
  defaultValue?: any;
}

interface FilterBarProps {
  filters: FilterOption[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  onReset?: () => void;
  onApply?: () => void;
  showApplyButton?: boolean;
  className?: string;
}

export function FilterBar({
  filters,
  values,
  onChange,
  onReset,
  onApply,
  showApplyButton = false,
  className,
}: FilterBarProps) {
  const handleReset = () => {
    filters.forEach(filter => {
      onChange(filter.key, filter.defaultValue || '');
    });
    onReset && onReset();
  };

  const renderFilter = (filter: FilterOption) => {
    const value = values[filter.key] || filter.defaultValue || '';

    switch (filter.type) {
      case 'select':
        return (
          <select
            key={filter.key}
            value={value}
            onChange={(e) => onChange(filter.key, e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">{filter.placeholder || `Select ${filter.label}`}</option>
            {filter.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'date':
        return (
          <input
            key={filter.key}
            type="date"
            value={value}
            onChange={(e) => onChange(filter.key, e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        );

      case 'daterange':
        return (
          <div key={filter.key} className="flex space-x-2">
            <input
              type="date"
              value={value?.start || ''}
              onChange={(e) => onChange(filter.key, { ...value, start: e.target.value })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Start date"
            />
            <input
              type="date"
              value={value?.end || ''}
              onChange={(e) => onChange(filter.key, { ...value, end: e.target.value })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="End date"
            />
          </div>
        );

      case 'search':
        return (
          <div key={filter.key} className="relative">
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(filter.key, e.target.value)}
              placeholder={filter.placeholder || `Search ${filter.label}`}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        );

      case 'toggle':
        return (
          <label key={filter.key} className="flex items-center">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => onChange(filter.key, e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">{filter.label}</span>
          </label>
        );

      default:
        return null;
    }
  };

  return (
    <div className={cn('bg-white p-4 rounded-lg border border-gray-200 shadow-sm', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Filters</h3>
        <div className="flex items-center space-x-2">
          {showApplyButton && onApply && (
            <Button variant="primary" size="sm" onClick={onApply}>
              Apply
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={handleReset}>
            Reset
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filters.map((filter) => (
          <div key={filter.key} className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              {filter.label}
            </label>
            {renderFilter(filter)}
          </div>
        ))}
      </div>
    </div>
  );
}

interface QuickFiltersProps {
  options: {
    key: string;
    label: string;
    icon?: React.ReactNode;
  }[];
  activeFilter: string;
  onChange: (key: string) => void;
  className?: string;
}

export function QuickFilters({
  options,
  activeFilter,
  onChange,
  className,
}: QuickFiltersProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {options.map((option) => (
        <Button
          key={option.key}
          variant={activeFilter === option.key ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => onChange(option.key)}
          className="flex items-center space-x-2"
        >
          {option.icon && <span className="w-4 h-4">{option.icon}</span>}
          <span>{option.label}</span>
        </Button>
      ))}
    </div>
  );
}