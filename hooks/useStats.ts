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
  commissionTotal: number;
  extraCostTotal: number;
  otherExtraCostTotal: number;
}

// 조회 범위 적용:
//  · farmId 지정 → 해당 농장 전체(구성원 데이터 포함). RLS(015)가 접근을 보장.
//  · farmIds(접근 가능 농장 목록) 지정 → 그 농장 전체 + 본인의 농장 미지정(farm_id null) 기록.
//  · 둘 다 없으면 → 기존처럼 본인(user_id) 기록만.
const applyScope = (query: any, userId: string, farmId?: string, farmIds?: string[]) => {
  if (farmId) return query.eq('farm_id', farmId);
  if (farmIds && farmIds.length) {
    const list = farmIds.join(',');
    return query.or(`farm_id.in.(${list}),and(farm_id.is.null,user_id.eq.${userId})`);
  }
  return query.eq('user_id', userId);
};

export async function fetchPeriodSummary(
  userId: string,
  period: PeriodType,
  farmId?: string,
  farmIds?: string[],
): Promise<{ current: PeriodSummary; previous: PeriodSummary; previousYear?: PeriodSummary }> {
  const { curFrom, curTo, prevFrom, prevTo, prevYearFrom, prevYearTo } = getCurrentAndPrevRange(period);
  const scope = (q: any) => applyScope(q, userId, farmId, farmIds);

  const [cH, cS, cO, cL, pH, pS] = await Promise.all([
    scope(supabase.from('harvest_records').select('quantity').gte('date', curFrom).lte('date', curTo)),
    scope(supabase.from('sales_records').select('quantity, total_revenue, commission_amount, extra_cost').gte('date', curFrom).lte('date', curTo)),
    scope(supabase.from('other_records').select('quantity, extra_cost').gte('date', curFrom).lte('date', curTo)),
    scope(supabase.from('labor_records').select('labor_cost').gte('date', curFrom).lte('date', curTo)),
    scope(supabase.from('harvest_records').select('quantity').gte('date', prevFrom).lte('date', prevTo)),
    scope(supabase.from('sales_records').select('quantity, total_revenue, commission_amount, extra_cost').gte('date', prevFrom).lte('date', prevTo)),
  ]);

  const sum = (data: any[] | null, key: string) =>
    data?.reduce((s: number, r: any) => s + (r[key] ?? 0), 0) ?? 0;

  const curHarvest = sum(cH.data, 'quantity');
  const curSales = sum(cS.data, 'quantity');
  const curRevenue = sum(cS.data, 'total_revenue');
  const curCommission = sum(cS.data, 'commission_amount');
  const curExtraCost = sum(cS.data, 'extra_cost');
  const curNet = curRevenue - curCommission - curExtraCost;
  const curOther = sum(cO.data, 'quantity');
  const curOtherExtraCost = sum(cO.data, 'extra_cost');
  const curLabor = cL.error ? 0 : sum(cL.data, 'labor_cost');

  const prevRevenue = sum(pS.data, 'total_revenue');
  const prevNet = prevRevenue - sum(pS.data, 'commission_amount') - sum(pS.data, 'extra_cost');

  let previousYear: PeriodSummary | undefined;
  if (period === 'month' && prevYearFrom && prevYearTo) {
    const [pyH, pyS] = await Promise.all([
      scope(supabase.from('harvest_records').select('quantity').gte('date', prevYearFrom).lte('date', prevYearTo)),
      scope(supabase.from('sales_records').select('quantity, total_revenue, commission_amount, extra_cost').gte('date', prevYearFrom).lte('date', prevYearTo)),
    ]);
    const pyRevenue = sum(pyS.data, 'total_revenue');
    previousYear = {
      harvest: sum(pyH.data, 'quantity'),
      sales: sum(pyS.data, 'quantity'),
      revenue: pyRevenue,
      netRevenue: pyRevenue - sum(pyS.data, 'commission_amount') - sum(pyS.data, 'extra_cost'),
      stock: 0,
      laborCost: 0, commissionTotal: 0, extraCostTotal: 0, otherExtraCostTotal: 0,
    };
  }

  return {
    current: {
      harvest: curHarvest, sales: curSales, revenue: curRevenue,
      netRevenue: curNet - curLabor - curOtherExtraCost,
      stock: curHarvest - curSales - curOther,
      laborCost: curLabor,
      commissionTotal: curCommission,
      extraCostTotal: curExtraCost,
      otherExtraCostTotal: curOtherExtraCost,
    },
    previous: {
      harvest: sum(pH.data, 'quantity'),
      sales: sum(pS.data, 'quantity'),
      revenue: prevRevenue, netRevenue: prevNet,
      stock: 0, laborCost: 0, commissionTotal: 0, extraCostTotal: 0, otherExtraCostTotal: 0,
    },
    previousYear,
  };
}

export function useStats(userId: string | undefined, farmId?: string, farmIds?: string[]) {
  const [stats, setStats] = useState<DailyStat[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async (period: 'day' | 'week' | 'month' | 'year') => {
    if (!userId) return;
    setLoading(true);
    const { from, to } = getDateRange(period);

    const [harvestRes, salesRes] = await Promise.all([
      applyScope(
        supabase.from('harvest_records').select('date, quantity').gte('date', from).lte('date', to).order('date'),
        userId, farmId, farmIds
      ),
      applyScope(
        supabase.from('sales_records').select('date, quantity, total_revenue, commission_amount, extra_cost').gte('date', from).lte('date', to).order('date'),
        userId, farmId, farmIds
      ),
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

    setStats(Object.values(map).sort((a, b) => a.date.localeCompare(b.date)));
    setLoading(false);
  }, [userId, farmId, farmIds]);

  return { stats, loading, fetchStats };
}

export interface PricePoint {
  date: string;
  price: number;
  label: string;
  crop: string;
  variety: string;
  size: string;
}

export async function fetchPriceHistory(
  userId: string,
  from: string,
  to: string,
  farmId?: string,
  farmIds?: string[],
): Promise<PricePoint[]> {
  const q = applyScope(
    supabase.from('sales_records')
      .select('date, price_per_unit, crop_type, variety, size')
      .gte('date', from).lte('date', to)
      .order('date')
      .limit(2000),
    userId, farmId, farmIds,
  );
  const { data } = await q;
  return (data ?? [])
    .filter((r: any) => r.price_per_unit > 0)
    .map((r: any) => ({
      date: r.date,
      price: r.price_per_unit ?? 0,
      label: [r.crop_type, r.variety, r.size].filter(Boolean).join(' '),
      crop: r.crop_type ?? '',
      variety: r.variety ?? '',
      size: r.size ?? '',
    }));
}

// 막대 차트 상세: 기간 막대 선택 시 작물·품종·사이즈별 내역을 보여주기 위한 원시 데이터
export interface TrendDetailRow {
  date: string;
  crop: string;
  variety: string;
  size: string;
  value: number; // harvest: 수량(kg) / sales: 매출(원)
}

export async function fetchTrendDetail(
  userId: string, from: string, to: string, farmId?: string, farmIds?: string[],
): Promise<{ harvest: TrendDetailRow[]; sales: TrendDetailRow[] }> {
  const [h, s] = await Promise.all([
    applyScope(supabase.from('harvest_records').select('date, crop_type, variety, size, quantity').gte('date', from).lte('date', to), userId, farmId, farmIds),
    applyScope(supabase.from('sales_records').select('date, crop_type, variety, size, total_revenue').gte('date', from).lte('date', to), userId, farmId, farmIds),
  ]);
  const mapRow = (valueKey: string) => (r: any): TrendDetailRow => ({
    date: r.date,
    crop: r.crop_type ?? '',
    variety: r.variety ?? '',
    size: r.size ?? '',
    value: r[valueKey] ?? 0,
  });
  return {
    harvest: (h.data ?? []).map(mapRow('quantity')),
    sales: (s.data ?? []).map(mapRow('total_revenue')),
  };
}

export async function fetchSummary(userId: string, farmIds?: string[]) {
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

  const scope = (q: any) => applyScope(q, userId, undefined, farmIds);
  const [
    todayHarvest, yesterdayHarvest, weekHarvest, lastWeekHarvest,
    todaySales, yesterdaySales, weekSales, lastWeekSales,
  ] = await Promise.all([
    scope(supabase.from('harvest_records').select('quantity').eq('date', todayStr)),
    scope(supabase.from('harvest_records').select('quantity').eq('date', yesterdayStr)),
    scope(supabase.from('harvest_records').select('quantity').gte('date', weekStartStr).lte('date', todayStr)),
    scope(supabase.from('harvest_records').select('quantity').gte('date', lastWeekStartStr).lte('date', lastWeekEndStr)),
    scope(supabase.from('sales_records').select('total_revenue').eq('date', todayStr)),
    scope(supabase.from('sales_records').select('total_revenue').eq('date', yesterdayStr)),
    scope(supabase.from('sales_records').select('total_revenue').gte('date', weekStartStr).lte('date', todayStr)),
    scope(supabase.from('sales_records').select('total_revenue').gte('date', lastWeekStartStr).lte('date', lastWeekEndStr)),
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
  userId: string, from: string, to: string, farmId?: string, farmIds?: string[]
): Promise<{ byCrop: BreakdownItem[]; byVariety: BreakdownItem[]; bySize: BreakdownItem[]; byVarietySize: BreakdownItem[] }> {
  const scope = (q: any) => applyScope(q, userId, farmId, farmIds);
  const [harvestRes, salesRes, otherRes] = await Promise.all([
    scope(supabase.from('harvest_records').select('crop_type, variety, size, quantity').gte('date', from).lte('date', to)),
    scope(supabase.from('sales_records').select('crop_type, variety, size, quantity').gte('date', from).lte('date', to)),
    scope(supabase.from('other_records').select('crop_type, variety, size, quantity').gte('date', from).lte('date', to)),
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
  farmIds?: string[],
): Promise<{ current: PeriodSummary; previous: PeriodSummary }> {
  const scope = (q: any) => applyScope(q, userId, farmId, farmIds);
  const [cH, cS, cO, cL, pH, pS] = await Promise.all([
    scope(supabase.from('harvest_records').select('quantity').gte('date', curFrom).lte('date', curTo)),
    scope(supabase.from('sales_records').select('quantity, total_revenue, commission_amount, extra_cost').gte('date', curFrom).lte('date', curTo)),
    scope(supabase.from('other_records').select('quantity, extra_cost').gte('date', curFrom).lte('date', curTo)),
    scope(supabase.from('labor_records').select('labor_cost').gte('date', curFrom).lte('date', curTo)),
    scope(supabase.from('harvest_records').select('quantity').gte('date', prevFrom).lte('date', prevTo)),
    scope(supabase.from('sales_records').select('quantity, total_revenue, commission_amount, extra_cost').gte('date', prevFrom).lte('date', prevTo)),
  ]);
  const sum = (data: any[] | null, key: string) => data?.reduce((s: number, r: any) => s + (r[key] ?? 0), 0) ?? 0;
  const curRevenue = sum(cS.data, 'total_revenue');
  const curCommission = sum(cS.data, 'commission_amount');
  const curExtraCost = sum(cS.data, 'extra_cost');
  const curNet = curRevenue - curCommission - curExtraCost;
  const curOtherExtraCost = sum(cO.data, 'extra_cost');
  const curLabor = cL.error ? 0 : sum(cL.data, 'labor_cost');
  const curHarvest = sum(cH.data, 'quantity');
  const curSales = sum(cS.data, 'quantity');
  const prevRevenue = sum(pS.data, 'total_revenue');
  return {
    current: {
      harvest: curHarvest, sales: curSales, revenue: curRevenue,
      netRevenue: curNet - curLabor - curOtherExtraCost,
      stock: curHarvest - curSales - sum(cO.data, 'quantity'),
      laborCost: curLabor,
      commissionTotal: curCommission,
      extraCostTotal: curExtraCost,
      otherExtraCostTotal: curOtherExtraCost,
    },
    previous: {
      harvest: sum(pH.data, 'quantity'), sales: sum(pS.data, 'quantity'),
      revenue: prevRevenue,
      netRevenue: prevRevenue - sum(pS.data, 'commission_amount') - sum(pS.data, 'extra_cost'),
      stock: 0, laborCost: 0, commissionTotal: 0, extraCostTotal: 0, otherExtraCostTotal: 0,
    },
  };
}

// 바차트용: 특정 날짜 범위의 일별 통계
export async function fetchStatsForRange(userId: string, from: string, to: string, farmId?: string, farmIds?: string[]): Promise<DailyStat[]> {
  const [harvestRes, salesRes] = await Promise.all([
    applyScope(supabase.from('harvest_records').select('date, quantity').gte('date', from).lte('date', to).order('date'), userId, farmId, farmIds),
    applyScope(supabase.from('sales_records').select('date, quantity, total_revenue, commission_amount, extra_cost').gte('date', from).lte('date', to).order('date'), userId, farmId, farmIds),
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
