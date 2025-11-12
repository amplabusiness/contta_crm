import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
// FIX: Added file extension to import path.
import { DealStageData } from '../types.ts';

interface DealStageChartProps {
  data: DealStageData[];
}

interface DealStageTooltipItem {
  value?: number | string;
}

interface DealStageTooltipProps {
  active?: boolean;
  label?: string;
  payload?: DealStageTooltipItem[];
}

const resolveValue = (value: number | string | undefined): number => {
  if (typeof value === 'number') {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const CustomTooltip: React.FC<DealStageTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload?.length) {
    return null;
  }

  const primaryPayload = payload[0];
  const dealsCount = resolveValue(primaryPayload?.value);

  return (
    <div className="bg-gray-800 border border-gray-600 p-3 rounded-lg shadow-xl">
      <p className="font-bold text-white">{label}</p>
      <p className="text-blue-400">Deals: {dealsCount}</p>
    </div>
  );
};

const DealStageChart: React.FC<DealStageChartProps> = ({ data }) => {
  return (
    <div className="bg-gray-800/50 border border-gray-700/50 p-6 rounded-xl shadow-lg">
      <h3 className="text-lg font-semibold text-white mb-4">Deal Pipeline</h3>
      <div className="w-full h-[300px]">
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" stroke="#a0aec0" width={100} tickLine={false} axisLine={false} fontSize={12} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(128, 90, 213, 0.1)' }} />
            <Bar dataKey="value" barSize={20} radius={[0, 10, 10, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DealStageChart;