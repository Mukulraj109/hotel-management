import React, { useState } from 'react';
import { cn } from '../../utils/cn';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (value: any, row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  title?: string;
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  sortable?: boolean;
  pagination?: boolean;
  pageSize?: number;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  actions?: React.ReactNode;
  className?: string;
}

export function DataTable<T extends Record<string, any>>({
  title,
  data,
  columns,
  loading = false,
  searchable = false,
  searchPlaceholder = 'Search...',
  sortable = true,
  pagination = true,
  pageSize = 10,
  emptyMessage = 'No data available',
  onRowClick,
  actions,
  className,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: keyof T | string;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter data based on search term
  const filteredData = searchable && Array.isArray(data)
    ? data.filter((row) =>
        Object.values(row).some((value) =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : Array.isArray(data) ? data : [];

  // Sort data
  const sortedData = sortable && sortConfig
    ? [...filteredData].sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      })
    : filteredData;

  // Paginate data
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = pagination
    ? sortedData.slice(startIndex, startIndex + pageSize)
    : sortedData;

  const handleSort = (columnKey: keyof T | string) => {
    const column = columns.find(col => col.key === columnKey);
    if (!column?.sortable && !sortable) return;

    setSortConfig(current => {
      if (current?.key === columnKey) {
        return current.direction === 'asc'
          ? { key: columnKey, direction: 'desc' }
          : null;
      }
      return { key: columnKey, direction: 'asc' };
    });
  };

  const getSortIcon = (columnKey: keyof T | string) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return (
        <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }

    return sortConfig.direction === 'asc' ? (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
      </svg>
    );
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      {(title || searchable || actions) && (
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              {title && <CardTitle>{title}</CardTitle>}
            </div>
            <div className="flex items-center space-x-4">
              {searchable && (
                <Input
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-64"
                />
              )}
              {actions}
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent className="p-0 flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto scrollbar-thin flex-1">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                {columns.map((column, index) => (
                  <th
                    key={index}
                    className={cn(
                      'px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider',
                      column.align === 'center' && 'text-center',
                      column.align === 'right' && 'text-right',
                      (column.sortable || sortable) && 'cursor-pointer hover:text-gray-700',
                    )}
                    style={{ width: column.width }}
                    onClick={() => (column.sortable || sortable) && handleSort(column.key)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column.header}</span>
                      {(column.sortable || sortable) && getSortIcon(column.key)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                Array.from({ length: pageSize }, (_, index) => (
                  <tr key={index}>
                    {columns.map((_, colIndex) => (
                      <td key={colIndex} className="px-6 py-4">
                        <div className="animate-pulse bg-gray-200 h-4 rounded"></div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className={cn(
                      'hover:bg-gray-50',
                      onRowClick && 'cursor-pointer'
                    )}
                    onClick={() => onRowClick && onRowClick(row)}
                  >
                    {columns.map((column, colIndex) => {
                      const value = row[column.key];
                      return (
                        <td
                          key={colIndex}
                          className={cn(
                            'px-6 py-4 whitespace-nowrap text-sm text-gray-900',
                            column.align === 'center' && 'text-center',
                            column.align === 'right' && 'text-right'
                          )}
                        >
                          {column.render ? column.render(value, row) : value}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {startIndex + 1} to {Math.min(startIndex + pageSize, sortedData.length)} of {sortedData.length} results
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNumber = i + 1;
                  return (
                    <Button
                      key={pageNumber}
                      variant={currentPage === pageNumber ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setCurrentPage(pageNumber)}
                    >
                      {pageNumber}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}