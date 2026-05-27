import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { DailyStat } from '../types';

function getDateRange(period: 'day' | 'week' | 'month' | 'year') {
  const now = new Date();
  const start = new Date(now);

  if (period === 'day') start.setDate(now.getDate() - 30);
  else if (period === 'week') start.setDate(now.getDate() - 12 * 7);
  else if (period === 'month') start.setMonth(now.getMonth() - 12);
  else start.setFullYear(now.getFullYear() - 5);

  return {
    from: start.toISOString().split('T')[0],
    to: now.toISOString().split('T')[0],
  };
}

export function useStats(userId: string | undefined) {
  const [stats, setStats] = useState<DailyStat[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async (period: 'day' | 'week' | 'month' | 'year') => {
    if (!userId) return;
    setLoading(true);

    const { from, to } = getDateRange(period);

    const [harvestRes, salesRes] = await Promise.all([
      supabase
        .from('harvest_records')
        .select('date, quantity')
        .eq('user_id', userId)
        .gte('date', from)
        .lte('date', to)
        .order('date'),
      supabase
        .from('sales_records')
        .select('date, quantity, total_revenue')
        .eq('user_id', userId)
        .gte('date', from)
        .lte('date', to)
        .order('date'),
    ]);

    const map: Record<string, DailyStat> = {};

    harvestRes.data?.forEach((r) => {
      if (!map[r.date]) map[r.date] = { date: r.date, harvest: 0, sales: 0, revenue: 0 };
      map[r.date].harvest += r.quantity;
    });

    salesRes.data?.forEach((r) => {
      if (!map[r.date]) map[r.date] = { date: r.date, harvest: 0, sales: 0, revenue: 0 };
      map[r.date].sales += r.quantity;
      map[r.date].revenue += r.total_revenue;
    });

    setStats(Object.values(map).sort((a, b) => a.date.localeCompare(b.date)));
    setLoading(false);
  }, [userId]);

  return { stats, loading, fetchStats };
}

export async function fetchSummary(userId: string) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekStartStr = weekStart.toISOString().split('T')[0];

  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(weekStart.getDate() - 7);
  const lastWeekEnd = new Date(weekStart);
  lastWeekEnd.setDate(weekStart.getDate() - 1);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0];
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0];

  const lastWeekStartStr = lastWeekStart.toISOString().split('T')[0];
  const lastWeekEndStr = lastWeekEnd.toISOString().split('T')[0];

  const [todayHarvest, yesterdayHarvest, weekHarvest, lastWeekHarvest, monthRevenue, lastMonthRevenue] = await Promise.all([
    supabase.from('harvest_records').select('quantity').eq('user_id', userId).eq('date', todayStr),
    supabase.from('harvest_records').select('quantity').eq('user_id', userId).eq('date', yesterdayStr),
    supabase.from('harvest_records').select('quantity').eq('user_id', userId).gte('date', weekStartStr).lte('date', todayStr),
    supabase.from('harvest_records').select('quantity').eq('user_id', userId).gte('date', lastWeekStartStr).lte('date', lastWeekEndStr),
    supabase.from('sales_records').select('total_revenue').eq('user_id', userId).gte('date', monthStart).lte('date', todayStr),
    supabase.from('sales_records').select('total_revenue').eq('user_id', userId).gte('date', lastMonthStart).lte('date', lastMonthEnd),
  ]);

  const totalHarvestToday = todayHarvest.data?.reduce((s, r) => s + r.quantity, 0) ?? 0;
  const totalHarvestYesterday = yesterdayHarvest.data?.reduce((s, r) => s + r.quantity, 0) ?? 0;
  const totalHarvestWeek = weekHarvest.data?.reduce((s, r) => s + r.quantity, 0) ?? 0;
  const totalHarvestLastWeek = lastWeekHarvest.data?.reduce((s, r) => s + r.quantity, 0) ?? 0;
  const totalRevenueMonth = monthRevenue.data?.reduce((s, r) => s + r.total_revenue, 0) ?? 0;
  const totalRevenueLastMonth = lastMonthRevenue.data?.reduce((s, r) => s + r.total_revenue, 0) ?? 0;

  const calcRate = (current: number, prev: number): number | null => {
    if (prev === 0) return null;
    return ((current - prev) / prev) * 100;
  };

  return {
    totalHarvestToday,
    totalHarvestWeek,
    totalRevenueMonth,
    changeRateToday: calcRate(totalHarvestToday, totalHarvestYesterday),
    changeRateWeek: calcRate(totalHarvestWeek, totalHarvestLastWeek),
    changeRateMonth: calcRate(totalRevenueMonth, totalRevenueLastMonth),
  };
}
