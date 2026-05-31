import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { DailyStat, BreakdownItem } from '../types';

export function getDateRange(period: 'day' | 'week' | 'month' | 'year') {
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
        .select('date, quantity, total_revenue, commission_amount, extra_cost')
        .eq('user_id', userId)
        .gte('date', from)
        .lte('date', to)
        .order('date'),
    ]);

    const map: Record<string, DailyStat> = {};

    harvestRes.data?.forEach((r) => {
      if (!map[r.date]) map[r.date] = { date: r.date, harvest: 0, sales: 0, revenue: 0, netRevenue: 0 };
      map[r.date].harvest += r.quantity;
    });

    salesRes.data?.forEach((r) => {
      if (!map[r.date]) map[r.date] = { date: r.date, harvest: 0, sales: 0, revenue: 0, netRevenue: 0 };
      map[r.date].sales += r.quantity;
      map[r.date].revenue += r.total_revenue;
      map[r.date].netRevenue += r.total_revenue - (r.commission_amount ?? 0) - (r.extra_cost ?? 0);
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
  const lastWeekStartStr = lastWeekStart.toISOString().split('T')[0];
  const lastWeekEndStr = lastWeekEnd.toISOString().split('T')[0];

  const [
    todayHarvest, yesterdayHarvest,
    weekHarvest, lastWeekHarvest,
    todaySales, yesterdaySales,
    weekSales, lastWeekSales,
  ] = await Promise.all([
    supabase.from('harvest_records').select('quantity').eq('user_id', userId).eq('date', todayStr),
    supabase.from('harvest_records').select('quantity').eq('user_id', userId).eq('date', yesterdayStr),
    supabase.from('harvest_records').select('quantity').eq('user_id', userId).gte('date', weekStartStr).lte('date', todayStr),
    supabase.from('harvest_records').select('quantity').eq('user_id', userId).gte('date', lastWeekStartStr).lte('date', lastWeekEndStr),
    supabase.from('sales_records').select('total_revenue').eq('user_id', userId).eq('date', todayStr),
    supabase.from('sales_records').select('total_revenue').eq('user_id', userId).eq('date', yesterdayStr),
    supabase.from('sales_records').select('total_revenue').eq('user_id', userId).gte('date', weekStartStr).lte('date', todayStr),
    supabase.from('sales_records').select('total_revenue').eq('user_id', userId).gte('date', lastWeekStartStr).lte('date', lastWeekEndStr),
  ]);

  const totalHarvestToday = todayHarvest.data?.reduce((s, r) => s + r.quantity, 0) ?? 0;
  const totalHarvestYesterday = yesterdayHarvest.data?.reduce((s, r) => s + r.quantity, 0) ?? 0;
  const totalHarvestWeek = weekHarvest.data?.reduce((s, r) => s + r.quantity, 0) ?? 0;
  const totalHarvestLastWeek = lastWeekHarvest.data?.reduce((s, r) => s + r.quantity, 0) ?? 0;
  const totalRevenueToday = todaySales.data?.reduce((s, r) => s + r.total_revenue, 0) ?? 0;
  const totalRevenueYesterday = yesterdaySales.data?.reduce((s, r) => s + r.total_revenue, 0) ?? 0;
  const totalRevenueWeek = weekSales.data?.reduce((s, r) => s + r.total_revenue, 0) ?? 0;
  const totalRevenueLastWeek = lastWeekSales.data?.reduce((s, r) => s + r.total_revenue, 0) ?? 0;

  const calcRate = (current: number, prev: number): number | null => {
    if (prev === 0) return null;
    return ((current - prev) / prev) * 100;
  };

  return {
    totalHarvestToday,
    totalRevenueToday,
    totalHarvestWeek,
    totalRevenueWeek,
    changeRateHarvestToday: calcRate(totalHarvestToday, totalHarvestYesterday),
    changeRateRevenueToday: calcRate(totalRevenueToday, totalRevenueYesterday),
    changeRateHarvestWeek: calcRate(totalHarvestWeek, totalHarvestLastWeek),
    changeRateRevenueWeek: calcRate(totalRevenueWeek, totalRevenueLastWeek),
  };
}

export async function fetchBreakdown(
  userId: string,
  from: string,
  to: string
): Promise<{ byCrop: BreakdownItem[]; byVariety: BreakdownItem[]; bySize: BreakdownItem[] }> {
  const [harvestRes, salesRes, otherRes] = await Promise.all([
    supabase.from('harvest_records')
      .select('crop_type, variety, size, quantity')
      .eq('user_id', userId).gte('date', from).lte('date', to),
    supabase.from('sales_records')
      .select('crop_type, variety, size, quantity')
      .eq('user_id', userId).gte('date', from).lte('date', to),
    supabase.from('other_records')
      .select('crop_type, variety, size, quantity')
      .eq('user_id', userId).gte('date', from).lte('date', to),
  ]);

  type Row = { crop_type?: string | null; variety?: string | null; size?: string | null; quantity: number };

  function aggregate(records: Row[] | null, keyFn: (r: Row) => string): Record<string, number> {
    const map: Record<string, number> = {};
    records?.forEach((r) => {
      const key = keyFn(r) || '미입력';
      map[key] = (map[key] || 0) + r.quantity;
    });
    return map;
  }

  function mergeKeys(
    harvestMap: Record<string, number>,
    salesMap: Record<string, number>,
    otherMap: Record<string, number>
  ): BreakdownItem[] {
    const keys = new Set([...Object.keys(harvestMap), ...Object.keys(salesMap), ...Object.keys(otherMap)]);
    return Array.from(keys)
      .map((k) => ({ key: k, harvest: harvestMap[k] || 0, sales: salesMap[k] || 0, other: otherMap[k] || 0 }))
      .sort((a, b) => (b.harvest + b.sales) - (a.harvest + a.sales));
  }

  return {
    byCrop: mergeKeys(
      aggregate(harvestRes.data, (r) => r.crop_type ?? ''),
      aggregate(salesRes.data, (r) => r.crop_type ?? ''),
      aggregate(otherRes.data, (r) => r.crop_type ?? '')
    ),
    byVariety: mergeKeys(
      aggregate(harvestRes.data, (r) => r.variety ?? ''),
      aggregate(salesRes.data, (r) => r.variety ?? ''),
      aggregate(otherRes.data, (r) => r.variety ?? '')
    ),
    bySize: mergeKeys(
      aggregate(harvestRes.data, (r) => r.size ?? ''),
      aggregate(salesRes.data, (r) => r.size ?? ''),
      aggregate(otherRes.data, (r) => r.size ?? '')
    ),
  };
}
