import React from 'react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { cn } from '../../../utils/cn';

interface BarChartProps {
  data: any[];
  xDataKey: string;
  bars: {
    dataKey: string;
    name?: string;
    color?: string;
    radius?: number;
    stackId?: string;
  }[];
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  layout?: 'horizontal' | 'vertical';
  className?: string;
}

export function BarChart({
  data,
  xDataKey,
  bars,
  height = 300,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  layout = 'vertical',
  className,
}: BarChartProps) {
  const defaultColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-gray-600">{entry.name}:</span>
              <span className="text-sm font-medium text-gray-900">
                {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart 
          data={data} 
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          layout={layout}
        >
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          )}
          <XAxis
            type={layout === 'horizontal' ? 'number' : 'category'}
            dataKey={layout === 'horizontal' ? undefined : xDataKey}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            dy={layout === 'vertical' ? 10 : 0}
            tickFormatter={layout === 'horizontal' ? (value) => 
              typeof value === 'number' && value >= 1000 
                ? `${(value / 1000).toFixed(0)}k`
                : value
              : undefined
            }
          />
          <YAxis
            type={layout === 'horizontal' ? 'category' : 'number'}
            dataKey={layout === 'horizontal' ? xDataKey : undefined}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickFormatter={layout === 'vertical' ? (value) => 
              typeof value === 'number' && value >= 1000 
                ? `${(value / 1000).toFixed(0)}k`
                : value
              : undefined
            }
            width={layout === 'horizontal' ? 80 : undefined}
          />
          {showTooltip && <Tooltip content={<CustomTooltip />} />}
          {showLegend && (
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="rect"
            />
          )}
          {bars.map((bar, index) => (
            <Bar
              key={bar.dataKey}
              dataKey={bar.dataKey}
              name={bar.name || bar.dataKey}
              fill={bar.color || defaultColors[index % defaultColors.length]}
              radius={bar.radius || [0, 2, 2, 0]}
              stackId={bar.stackId}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}