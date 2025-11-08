

import React from 'react';
// FIX: Added file extension to import path.
import { StatCardData } from '../types.ts';

const StatCard: React.FC<StatCardData> = ({ title, value, change, changeType, icon }) => {
  const isIncrease = changeType === 'increase';
  const changeColor = isIncrease ? 'text-green-400' : 'text-red-400';
  
  return (
    <div className="bg-gray-800/50 border border-gray-700/50 p-5 rounded-xl shadow-lg flex flex-col justify-between">
      <div className="flex justify-between items-start">
        <h3 className="text-sm font-medium text-gray-400">{title}</h3>
        {icon}
      </div>
      <div>
        <p className="text-3xl font-bold text-white mt-2">{value}</p>
        <div className="flex items-center text-xs mt-1">
          <span className={`font-semibold ${changeColor}`}>{change}</span>
          <span className="text-gray-500 ml-1">vs last month</span>
        </div>
      </div>
    </div>
  );
};

export default StatCard;