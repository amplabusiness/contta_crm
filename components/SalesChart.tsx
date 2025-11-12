import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, type TooltipProps } from 'recharts';
// FIX: Added file extension to import path.
import { SalesData } from '../types.ts';

interface SalesChartProps {
  data: SalesData[];
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

const resolveNumericValue = (
  value: number | string | Array<number | string> | undefined,
): number => {
  if (typeof value === 'number') {
    return value;
  }

  if (Array.isArray(value)) {
    const [first] = value;
    const parsed = Number(first);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const CustomTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload, label }) => {
  if (!active || !payload?.length) {
    return null;
  }

  const [salesPoint, revenuePoint] = payload;
  const salesValue = resolveNumericValue(salesPoint?.value);
  const revenueValue = resolveNumericValue(revenuePoint?.value);

  return (
    <div className="bg-gray-800 border border-gray-600 p-3 rounded-lg shadow-xl">
      <p className="label font-bold text-white">{label}</p>
      <p className="text-blue-400">Sales: {salesValue}</p>
      <p className="text-indigo-400">Revenue: {formatCurrency(revenueValue)}</p>
    </div>
  );
};

const SalesChart: React.FC<SalesChartProps> = ({ data }) => {
  return (
    <div className="bg-gray-800/50 border border-gray-700/50 p-6 rounded-xl shadow-lg">
      <h3 className="text-lg font-semibold text-white mb-4">Sales Performance</h3>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
            <XAxis dataKey="name" stroke="#a0aec0" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#a0aec0" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(128, 90, 213, 0.1)' }} />
            <Legend wrapperStyle={{fontSize: "14px"}}/>
            <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }} />
            <Line type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }}/>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SalesChart;