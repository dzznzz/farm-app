import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { DailyStat, BreakdownItem, PeriodType } from '../types';

export function getDateRange(period: 'day' | 'week' | 'month' | 'year') {
  const now = new Date();
  const start = new Date(now);
  if (period === 'day') start.setDate(now.getDate() - 7);
  else if (period === 'week') start.setDate(now.getDate() - 7 * 7);
  else if (period === 'month') start.setMonth(now.getMonth() - 7);
  else start.setFullYear(now.getFullYear() - 7);
  return {
    from: start.toISOString().split('T')[0],
    to: now.toISOString().split('T')[0],
  };
}

export function getCurrentAndPrevRange(period: PeriodType) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  let curFrom: string, curTo: string, prevFrom: string, prevTo: string;
  let prevYearFrom: string | null = null;
  let prevYearTo: string | null = null;

  if (period === 'day') {
    curFrom = todayStr; curTo = todayStr;
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yStr = yesterday.toISOString().split('T')[0];
    prevFrom = yStr; prevTo = yStr;
  } else if (period === 'week') {
    const dow = today.getDay();
    const daysFromMonday = dow === 0 ? 6 : dow - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysFromMonday);
    curFrom = monday.toISOString().split('T')[0]; curTo = todayStr;
    const lastMonday = new Date(monday);
    lastMonday.setDate(monday.getDate() - 7);
    const lastSunday = new Date(monday);
    lastSunday.setDate(monday.getDate() - 1);
    prevFrom = lastMonday.toISOString().split('T')[0];
    prevTo = lastSunday.toISOString().split('T')[0];
  } else if (period === 'month') {
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    curFrom = firstOfMonth.toISOString().split('T')[0]; curTo = todayStr;
    const firstOfLast = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastOfLast = new Date(today.getFullYear(), today.getMonth(), 0);
    prevFrom = firstOfLast.toISOString().split('T')[0];
    prevTo = lastOfLast.toISOString().split('T')[0];
    // 작년 동월
    const firstOfSameMonthLastYear = new Date(today.getFullYear() - 1, today.getMonth(), 1);
    const lastOfSameMonthLastYear = new Date(today.getFullYear() - 1, today.getMonth() + 1, 0);
    prevYearFrom = firstOfSameMonthLastYear.toISOString().split('T')[0];
    prevYearTo = lastOfSameMonthLastYear.toISOString().split('T')[0];
  } else {
    const firstOfYear = new Date(today.getFullYear(), 0, 1);
    curFrom = firstOfYear.toISOString().split('T')[0]; curTo = todayStr;
    const firstOfLastYear = new Date(today.getFullYear() - 1, 0, 1);
    const lastOfLastYear = new Date(today.getFullYear() - 1, 11, 31);
    prevFrom = firstOfLastYear.toISOString().split('T')[0];
    prevTo = lastOfLastYear.toISOString().split('T')[0];
  }

  return { curFrom, curTo, prevFrom, prevTo, prevYearFrom, prevYearTo };
}

export interface PeriodSummary {
  harvest: number;
  sales: number;
  revenue: number;
  netRevenue: number;
  stock: number;
  laborCost: number;
}

const applyFarm = (query: any, farmId?: string) =>
  farmId ? query.eq('farm_id', farmId) : query;

export async function fetchPeriodSummary(
  userId: string,
  period: PeriodType,
  farmId?: string,
): Promise<{ current: PeriodSummary; previous: PeriodSummary; previousYear?: PeriodSummary }> {
  const { curFrom, curTo, prevFrom, prevTo, prevYearFrom, prevYearTo } = getCurrentAndPrevRange(period);

  const [cH, cS, cO, cL, pH, pS] = await Promise.all([
    applyFarm(supabase.from('harvest_records').select('quantity').eq('user_id', userId).gte('date', curFrom).lte('date', curTo), farmId),
    applyFarm(supabase.from('sales_records').select('quantity, total_revenue, commission_amount, extra_cost').eq('user_id', userId).gte('date', curFrom).lte('date', curTo), farmId),
    applyFarm(supabase.from('other_records').select('quantity').eq('user_id', userId).gte('date', curFrom).lte('date', curTo), farmId),
    supabase.from('labor_records').select('labor_cost').eq('user_id', userId).gte('date', curFrom).lte('date', curTo),
    applyFarm(supabase.from('harvest_records').select('quantity').eq('user_id', userId).gte('date', prevFrom).lte('date', prevTo), farmId),
    applyFarm(supabase.from('sales_records').select('quantity, total_revenue, commission_amount, extra_cost').eq('user_id', userId).gte('date', prevFrom).lte('date', prevTo), farmId),
  ]);

  const sum = (data: any[] | null, key: string) =>
    data?.reduce((s: number, r: any) => s + (r[key] ?? 0), 0) ?? 0;

  const curHarvest = sum(cH.data, 'quantity');
  const curSales = sum(cS.data, 'quantity');
  const curRevenue = sum(cS.data, 'total_revenue');
  const curNet = curRevenue - sum(cS.data, 'commission_amount') - sum(cS.data, 'extra_cost');
  const curOther = sum(cO.data, 'quantity');
  const curLabor = cL.error ? 0 : sum(cL.data, 'labor_cost');

  const prevRevenue = sum(pS.data, 'total_revenue');
  const prevNet = prevRevenue - sum(pS.data, 'commission_amount') - sum(pS.data, 'extra_cost');

  let previousYear: PeriodSummary | undefined;
  if (period === 'month' && prevYearFrom && prevYearTo) {
    const [pyH, pyS] = await Promise.all([
      applyFarm(supabase.from('harvest_records').select('quantity').eq('user_id', userId).gte('date', prevYearFrom).lte('date', prevYearTo), farmId),
      applyFarm(supabase.from('sales_records').select('quantity, total_revenue, commission_amount, extra_cost').eq('user_id', userId).gte('date', prevYearFrom).lte('date', prevYearTo), farmId),
    ]);
    const pyRevenue = sum(pyS.data, 'total_revenue');
    previousYear = {
      harvest: sum(pyH.data, 'quantity'),
      sales: sum(pyS.data, 'quantity'),
      revenue: pyRevenue,
      netRevenue: pyRevenue - sum(pyS.data, 'commission_amount') - sum(pyS.data, 'extra_cost'),
      stock: 0,
      laborCost: 0,
    };
  }

  return {
    current: {
      harvest: curHarvest, sales: curSales, revenue: curRevenue,
      netRevenue: curNet - curLabor,
      stock: curHarvest - curSales - curOther,
      laborCost: curLabor,
    },
    previous: {
      harvest: sum(pH.data, 'quantity'),
      sales: sum(pS.data, 'quantity'),
      revenue: prevRevenue, netRevenue: prevNet,
      stock: 0, laborCost: 0,
    },
    previousYear,
  };
}

export function useStats(userId: string | undefined, farmId?: string) {
  const [stats, setStats] = useState<DailyStat[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async (period: 'day' | 'week' | 'month' | 'year') => {
    if (!userId) return;
    setLoading(true);
    const { from, to } = getDateRange(period);

    const [harvestRes, salesRes] = await Promise.all([
      applyFarm(
        supabase.from('harvest_records').select('date, quantity').eq('user_id', userId).gte('date', from).lte('date', to).order('date'),
        farmId
      ),
      applyFarm(
        supabase.from('sales_records').select('date, quantity, total_revenue, commission_amount, extra_cost').eq('user_id', userId).gte('date', from).lte('date', to).order('date'),
        farmId
      ),
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
  }, [userId, farmId]);

  return { stats, loading, fetchStats };
}

export interface PricePoint {
  date: string;
  price: number;
  label: string;
}

export async function fetchPriceHistory(
  userId: string,
  from: string,
  to: string,
  farmId?: string,
): Promise<PricePoint[]> {
  const q = applyFarm(
    supabase.from('sales_records')
      .select('date, price_per_unit, crop_type, variety, size')
      .eq('user_id', userId).gte('date', from).lte('date', to)
      .order('date', { ascending: true })
      .limit(20),
    farmId,
  );
  const { data } = await q;
  return (data ?? [])
    .filter((r: any) => r.price_per_unit > 0)
    .map((r: any) => ({
      date: r.date,
      price: r.price_per_unit ?? 0,
      label: [r.crop_type, r.variety, r.size].filter(Boolean).join(' '),
    }));
}

export async function fetchSummary(userId: string) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const dow = today.getDay();
  const daysFromMonday = dow === 0 ? 6 : dow - 1;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - daysFromMonday);
  const weekStartStr = weekStart.toISOString().split('T')[0];
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(weekStart.getDate() - 7);
  const lastWeekEnd = new Date(weekStart);
  lastWeekEnd.setDate(weekStart.getDate() - 1);
  const lastWeekStartStr = lastWeekStart.toISOString().split('T')[0];
  const lastWeekEndStr = lastWeekEnd.toISOString().split('T')[0];

  const [
    todayHarvest, yesterdayHarvest, weekHarvest, lastWeekHarvest,
    todaySales, yesterdaySales, weekSales, lastWeekSales,
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

  const s = (d: any, k: string) => d?.data?.reduce((acc: number, r: any) => acc + (r[k] ?? 0), 0) ?? 0;
  const calcRate = (cur: number, prev: number): number | null =>
    prev === 0 ? null : ((cur - prev) / prev) * 100;

  return {
    totalHarvestToday: s(todayHarvest, 'quantity'),
    totalRevenueToday: s(todaySales, 'total_revenue'),
    totalHarvestWeek: s(weekHarvest, 'quantity'),
    totalRevenueWeek: s(weekSales, 'total_revenue'),
    changeRateHarvestToday: calcRate(s(todayHarvest, 'quantity'), s(yesterdayHarvest, 'quantity')),
    changeRateRevenueToday: calcRate(s(todaySales, 'total_revenue'), s(yesterdaySales, 'total_revenue')),
    changeRateHarvestWeek: calcRate(s(weekHarvest, 'quantity'), s(lastWeekHarvest, 'quantity')),
    changeRateRevenueWeek: calcRate(s(weekSales, 'total_revenue'), s(lastWeekSales, 'total_revenue')),
  };
}

export async function fetchBreakdown(
  userId: string, from: string, to: string, farmId?: string
): Promise<{ byCrop: BreakdownItem[]; byVariety: BreakdownItem[]; bySize: BreakdownItem[]; byVarietySize: BreakdownItem[] }> {
  const applyFarm = (q: any) => farmId ? q.eq('farm_id', farmId) : q;
  const [harvestRes, salesRes, otherRes] = await Promise.all([
    applyFarm(supabase.from('harvest_records').select('crop_type, variety, size, quantity').eq('user_id', userId).gte('date', from).lte('date', to)),
    applyFarm(supabase.from('sales_records').select('crop_type, variety, size, quantity').eq('user_id', userId).gte('date', from).lte('date', to)),
    applyFarm(supabase.from('other_records').select('crop_type, variety, size, quantity').eq('user_id', userId).gte('date', from).lte('date', to)),
  ]);

  type Row = { crop_type?: string | null; variety?: string | null; size?: string | null; quantity: number };
  function aggregate(records: Row[] | null, keyFn: (r: Row) => string): Record<string, number> {
    const map: Record<string, number> = {};
    records?.forEach((r) => { const key = keyFn(r) || '미입력'; map[key] = (map[key] || 0) + r.quantity; });
    return map;
  }
  function mergeKeys(h: Record<string, number>, s: Record<string, number>, o: Record<string, number>): BreakdownItem[] {
    const keys = new Set([...Object.keys(h), ...Object.keys(s), ...Object.keys(o)]);
    return Array.from(keys)
      .map((k) => ({ key: k, harvest: h[k] || 0, sales: s[k] || 0, other: o[k] || 0 }))
      .sort((a, b) => (b.harvest + b.sales) - (a.harvest + a.sales));
  }

  const vsKey = (r: Row) => [r.variety, r.size].filter(Boolean).join(' · ') || '미입력';
  return {
    byCrop: mergeKeys(aggregate(harvestRes.data, r => r.crop_type ?? ''), aggregate(salesRes.data, r => r.crop_type ?? ''), aggregate(otherRes.data, r => r.crop_type ?? '')),
    byVariety: mergeKeys(aggregate(harvestRes.data, r => r.variety ?? ''), aggregate(salesRes.data, r => r.variety ?? ''), aggregate(otherRes.data, r => r.variety ?? '')),
    bySize: mergeKeys(aggregate(harvestRes.data, r => r.size ?? ''), aggregate(salesRes.data, r => r.size ?? ''), aggregate(otherRes.data, r => r.size ?? '')),
    byVarietySize: mergeKeys(aggregate(harvestRes.data, vsKey), aggregate(salesRes.data, vsKey), aggregate(otherRes.data, vsKey)),
  };
}

// 커스텀 날짜 범위 요약
export async function fetchPeriodSummaryForRange(
  userId: string,
  curFrom: string, curTo: string,
  prevFrom: string, prevTo: string,
  farmId?: string,
): Promise<{ current: PeriodSummary; previous: PeriodSummary }> {
  const [cH, cS, cO, cL, pH, pS] = await Promise.all([
    applyFarm(supabase.from('harvest_records').select('quantity').eq('user_id', userId).gte('date', curFrom).lte('date', curTo), farmId),
    applyFarm(supabase.from('sales_records').select('quantity, total_revenue, commission_amount, extra_cost').eq('user_id', userId).gte('date', curFrom).lte('date', curTo), farmId),
    applyFarm(supabase.from('other_records').select('quantity').eq('user_id', userId).gte('date', curFrom).lte('date', curTo), farmId),
    supabase.from('labor_records').select('labor_cost').eq('user_id', userId).gte('date', curFrom).lte('date', curTo),
    applyFarm(supabase.from('harvest_records').select('quantity').eq('user_id', userId).gte('date', prevFrom).lte('date', prevTo), farmId),
    applyFarm(supabase.from('sales_records').select('quantity, total_revenue, commission_amount, extra_cost').eq('user_id', userId).gte('date', prevFrom).lte('date', prevTo), farmId),
  ]);
  const sum = (data: any[] | null, key: string) => data?.reduce((s: number, r: any) => s + (r[key] ?? 0), 0) ?? 0;
  const curRevenue = sum(cS.data, 'total_revenue');
  const curNet = curRevenue - sum(cS.data, 'commission_amount') - sum(cS.data, 'extra_cost');
  const curLabor = cL.error ? 0 : sum(cL.data, 'labor_cost');
  const curHarvest = sum(cH.data, 'quantity');
  const curSales = sum(cS.data, 'quantity');
  const prevRevenue = sum(pS.data, 'total_revenue');
  return {
    current: {
      harvest: curHarvest, sales: curSales, revenue: curRevenue,
      netRevenue: curNet - curLabor,
      stock: curHarvest - curSales - sum(cO.data, 'quantity'),
      laborCost: curLabor,
    },
    previous: {
      harvest: sum(pH.data, 'quantity'), sales: sum(pS.data, 'quantity'),
      revenue: prevRevenue,
      netRevenue: prevRevenue - sum(pS.data, 'commission_amount') - sum(pS.data, 'extra_cost'),
      stock: 0, laborCost: 0,
    },
  };
}

// 바차트용: 특정 날짜 범위의 일별 통계
export async function fetchStatsForRange(userId: string, from: string, to: string, farmId?: string): Promise<DailyStat[]> {
  const [harvestRes, salesRes] = await Promise.all([
    applyFarm(supabase.from('harvest_records').select('date, quantity').eq('user_id', userId).gte('date', from).lte('date', to).order('date'), farmId),
    applyFarm(supabase.from('sales_records').select('date, quantity, total_revenue, commission_amount, extra_cost').eq('user_id', userId).gte('date', from).lte('date', to).order('date'), farmId),
  ]);
  const map: Record<string, DailyStat> = {};
  harvestRes.data?.forEach((r: any) => {
    if (!map[r.date]) map[r.date] = { date: r.date, harvest: 0, sales: 0, revenue: 0, netRevenue: 0 };
    map[r.date].harvest += r.quantity;
  });
  salesRes.data?.forEach((r: any) => {
    if (!map[r.date]) map[r.date] = { date: r.date, harvest: 0, sales: 0, revenue: 0, netRevenue: 0 };
    map[r.date].sales += r.quantity;
    map[r.date].revenue += r.total_revenue;
    map[r.date].netRevenue += r.total_revenue - (r.commission_amount ?? 0) - (r.extra_cost ?? 0);
  });
  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
}
