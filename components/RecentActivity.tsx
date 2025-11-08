

import React from 'react';
// FIX: Added file extension to import path.
import { RecentActivity as RecentActivityType } from '../types.ts';

interface RecentActivityProps {
  activities: RecentActivityType[];
}

const RecentActivity: React.FC<RecentActivityProps> = ({ activities }) => {
  return (
    <div className="bg-gray-800/50 border border-gray-700/50 p-6 rounded-xl shadow-lg">
      <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
      <ul className="space-y-4">
        {activities.map((activity) => (
          <li key={activity.id} className="flex items-center space-x-3">
            <img src={activity.user.avatar} alt={activity.user.name} className="w-8 h-8 rounded-full" />
            <div className="text-sm">
              <p className="text-gray-300">
                <span className="font-semibold text-white">{activity.user.name}</span> {activity.action}{' '}
                <span className="font-semibold text-indigo-400">{activity.target}</span>
              </p>
              <p className="text-gray-500 text-xs">{activity.timestamp}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RecentActivity;