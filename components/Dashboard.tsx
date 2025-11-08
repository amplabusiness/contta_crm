

import React, { useState, useEffect } from 'react';
// FIX: Added file extensions to import paths.
import StatCard from './StatCard.tsx';
import SalesChart from './SalesChart.tsx';
import DealStageChart from './DealStageChart.tsx';
import RecentActivity from './RecentActivity.tsx';
import AIAssistant from './AIAssistant.tsx';
import { fetchDashboardData } from '../services/apiService.ts';
import { StatCardData, SalesData, DealStageData, RecentActivity as RecentActivityType } from '../types.ts';

interface DashboardData {
  statCardsData: StatCardData[];
  salesChartData: SalesData[];
  dealStageData: DealStageData[];
  recentActivities: RecentActivityType[];
}

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const dashboardData = await fetchDashboardData();
        setData(dashboardData);
        setError(null);
      } catch (err) {
        setError("Falha ao carregar os dados do dashboard. Por favor, tente recarregar a página.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-16 h-16 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-400">
        <p>{error}</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Dashboard</h1>
      
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {data.statCardsData.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Column (Charts) */}
        <div className="xl:col-span-2 space-y-6">
          <SalesChart data={data.salesChartData} />
          <DealStageChart data={data.dealStageData} />
        </div>

        {/* Right Column (AI & Activity) */}
        <div className="space-y-6">
          <AIAssistant crmData={{ salesChartData: data.salesChartData, dealStageData: data.dealStageData }} />
          <RecentActivity activities={data.recentActivities} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;