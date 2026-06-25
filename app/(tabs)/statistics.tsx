import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Easing, Platform, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { PieChart, LineChart } from 'react-native-gifted-charts';
import Svg, { Circle, G, Path, Line as SvgLine, Text as SvgText } from 'react-native-svg';
import { useAuth } from '../../hooks/useAuth';
import {
  fetchPeriodSummaryForRange, fetchStatsForRange,
  fetchPriceHistory, fetchBreakdown, fetchTrendDetail,
  PeriodSummary, PricePoint, TrendDetailRow,
} from '../../hooks/useStats';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { StatBadge } from '../../components/ui/StatBadge';
import { SummaryCard } from '../../components/cards/SummaryCard';
import { SummaryCardSkeleton, BarChartSkeleton } from '../../components/ui/Skeleton';
import { BreakdownModal } from '../../components/modals/BreakdownModal';
import { ExportModal } from '../../components/modals/ExportModal';
import { CalendarModal } from '../../components/modals/CalendarModal';
import { SelectModal } from '../../components/modals/SelectModal';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';
import { PeriodType, DailyStat } from '../../types';
import { PhIcon } from '../../components/ui/PhIcon';
import { hapticLight } from '../../lib/haptics';

const PERIODS: { key: PeriodType; label: string }[] = [
  { key: 'day', label: '일별' },
  { key: 'week', label: '주별' },
  { key: 'month', label: '월별' },
  { key: 'year', label: '연별' },
];

const COMPARE_LABELS: Record<PeriodType, { revenue: string; harvest: string }> = {
  day: { revenue: '어제 대비 매출', harvest: '어제 대비 수확량' },
  week: { revenue: '전주 대비 매출', harvest: '전주 대비 수확량' },
  month: { revenue: '전월 대비 매출', harvest: '전월 대비 수확량' },
  year: { revenue: '작년 대비 매출', harvest: '작년 대비 수확량' },
};

const DONUT_COLORS = ['#7C5CBF', '#A07BD4', '#5B8DD9', '#7EC8A0', '#E89F5D', '#D96B6B'];
const DONUT_OTHERS_COLOR = '#ccc';

// ── 선택 날짜 + 기간 → 범위 계산 ──
interface DateRange {
  from: string; to: string;
  prevFrom: string; prevTo: string;
  prevYearFrom?: string; prevYearTo?: string;
  label: string;
}

function computeSelectedRange(date: string, period: PeriodType): DateRange {
  if (period === 'day') {
    const prev = new Date(date); prev.setDate(prev.getDate() - 1);
    const prevStr = prev.toISOString().split('T')[0];
    const d = new Date(date);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return {
      from: date, to: date, prevFrom: prevStr, prevTo: prevStr,
      label: `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`,
    };
  }
  if (period === 'week') {
    const d = new Date(date);
    const dow = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    const from = monday.toISOString().split('T')[0];
    const to = sunday.toISOString().split('T')[0];
    const prevMonday = new Date(monday); prevMonday.setDate(monday.getDate() - 7);
    const prevSunday = new Date(prevMonday); prevSunday.setDate(prevMonday.getDate() + 6);
    const weekNum = Math.ceil(monday.getDate() / 7);
    return {
      from, to,
      prevFrom: prevMonday.toISOString().split('T')[0],
      prevTo: prevSunday.toISOString().split('T')[0],
      label: `${monday.getMonth() + 1}월 ${weekNum}주차`,
    };
  }
  if (period === 'month') {
    const [year, month] = date.split('-').map(Number);
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const prevM = month === 1 ? 12 : month - 1;
    const prevY = month === 1 ? year - 1 : year;
    const prevLastDay = new Date(prevY, prevM, 0).getDate();
    const pyLastDay = new Date(year - 1, month, 0).getDate();
    return {
      from, to,
      prevFrom: `${prevY}-${String(prevM).padStart(2, '0')}-01`,
      prevTo: `${prevY}-${String(prevM).padStart(2, '0')}-${String(prevLastDay).padStart(2, '0')}`,
      prevYearFrom: `${year - 1}-${String(month).padStart(2, '0')}-01`,
      prevYearTo: `${year - 1}-${String(month).padStart(2, '0')}-${String(pyLastDay).padStart(2, '0')}`,
      label: `${year}년 ${month}월`,
    };
  }
  // year
  const year = parseInt(date.slice(0, 4));
  return {
    from: `${year}-01-01`, to: `${year}-12-31`,
    prevFrom: `${year - 1}-01-01`, prevTo: `${year - 1}-12-31`,
    label: `${year}년`,
  };
}

function navigatePeriod(date: string, period: PeriodType, dir: 1 | -1): string {
  const d = new Date(date);
  if (period === 'day') d.setDate(d.getDate() + dir);
  else if (period === 'week') d.setDate(d.getDate() + dir * 7);
  else if (period === 'month') d.setMonth(d.getMonth() + dir);
  else d.setFullYear(d.getFullYear() + dir);
  return d.toISOString().split('T')[0];
}

function getBarFrom(to: string, period: PeriodType): string {
  const d = new Date(to);
  if (period === 'day') d.setDate(d.getDate() - 6);
  else if (period === 'week') d.setDate(d.getDate() - 6 * 7);
  else if (period === 'month') d.setMonth(d.getMonth() - 6);
  else d.setFullYear(d.getFullYear() - 6);
  return d.toISOString().split('T')[0];
}

// 날짜를 기간 단위 버킷 키로 변환 (groupStats와 동일 규칙)
function periodKeyOf(date: string, period: PeriodType): string {
  if (period === 'week') {
    const d = new Date(date);
    const dow = d.getDay();
    d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
    return d.toISOString().split('T')[0];
  }
  if (period === 'month') return date.slice(0, 7);
  if (period === 'year') return date.slice(0, 4);
  return date;
}

// 판매 단가 차트: 선택 기간 기준 -3 ~ +3 구간의 버킷(키·라벨) 목록
interface PriceBucket { key: string; label: string }
function getPriceBuckets(date: string, period: PeriodType): PriceBucket[] {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const buckets: PriceBucket[] = [];
  for (let off = -3; off <= 3; off++) {
    if (period === 'day') {
      const d = new Date(date); d.setDate(d.getDate() + off);
      const key = d.toISOString().split('T')[0];
      buckets.push({ key, label: `${d.getMonth() + 1}/${d.getDate()}` });
    } else if (period === 'week') {
      const d = new Date(date);
      const dow = d.getDay();
      d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1) + off * 7); // 해당 주 월요일
      const key = d.toISOString().split('T')[0];
      buckets.push({ key, label: `${d.getMonth() + 1}/${d.getDate()}` });
    } else if (period === 'month') {
      const [y, m] = date.split('-').map(Number);
      const d = new Date(y, (m - 1) + off, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets.push({ key, label: `${d.getMonth() + 1}월` });
    } else {
      const y = parseInt(date.slice(0, 4)) + off;
      buckets.push({ key: String(y), label: String(y) });
    }
  }
  return buckets;
}

// 판매 단가 원시 데이터를 가져올 [from, to] 범위 (선택 기간 -3 ~ +3 구간 전체)
function getPriceRange(date: string, period: PeriodType): { from: string; to: string } {
  const buckets = getPriceBuckets(date, period);
  const first = buckets[0].key;
  const last = buckets[buckets.length - 1].key;
  if (period === 'day') return { from: first, to: last };
  if (period === 'week') {
    const end = new Date(last); end.setDate(end.getDate() + 6); // 마지막 주 일요일
    return { from: first, to: end.toISOString().split('T')[0] };
  }
  if (period === 'month') {
    const [ly, lm] = last.split('-').map(Number);
    const end = new Date(ly, lm, 0); // 마지막 달 말일
    return { from: `${first}-01`, to: end.toISOString().split('T')[0] };
  }
  return { from: `${first}-01-01`, to: `${last}-12-31` };
}

function fillFullRange(grouped: DailyStat[], period: PeriodType, from: string, to: string): DailyStat[] {
  const map: Record<string, DailyStat> = {};
  grouped.forEach(d => { map[d.date] = d; });
  const empty = (date: string): DailyStat => ({ date, harvest: 0, sales: 0, revenue: 0, netRevenue: 0 });
  const result: DailyStat[] = [];
  if (period === 'day') {
    const start = new Date(from); const end = new Date(to);
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1))
      result.push(map[d.toISOString().split('T')[0]] ?? empty(d.toISOString().split('T')[0]));
  } else if (period === 'week') {
    const start = new Date(from);
    const dow = start.getDay();
    start.setDate(start.getDate() - (dow === 0 ? 6 : dow - 1));
    const end = new Date(to);
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 7)) {
      const key = d.toISOString().split('T')[0];
      result.push(map[key] ?? empty(key));
    }
  } else if (period === 'month') {
    const d = new Date(from.slice(0, 7) + '-01');
    const endYM = to.slice(0, 7);
    while (d.toISOString().slice(0, 7) <= endYM) {
      const key = d.toISOString().slice(0, 7);
      result.push(map[key] ?? empty(key));
      d.setMonth(d.getMonth() + 1);
    }
  } else {
    const sy = parseInt(from.slice(0, 4)); const ey = parseInt(to.slice(0, 4));
    for (let y = sy; y <= ey; y++) result.push(map[String(y)] ?? empty(String(y)));
  }
  return result;
}

function groupStats(stats: DailyStat[], period: PeriodType): DailyStat[] {
  if (period === 'day') return stats;
  const map: Record<string, DailyStat> = {};
  stats.forEach((s) => {
    let key = s.date;
    if (period === 'week') {
      const d = new Date(s.date);
      const dow = d.getDay();
      d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
      key = d.toISOString().split('T')[0];
    } else if (period === 'month') {
      key = s.date.slice(0, 7);
    } else if (period === 'year') {
      key = s.date.slice(0, 4);
    }
    if (!map[key]) map[key] = { date: key, harvest: 0, sales: 0, revenue: 0, netRevenue: 0 };
    map[key].harvest += s.harvest;
    map[key].sales += s.sales;
    map[key].revenue += s.revenue;
    map[key].netRevenue += s.netRevenue ?? s.revenue;
  });
  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
}

function formatDate(date: string, period: PeriodType): string {
  if (period === 'year') return date;
  if (period === 'month') return date.slice(5);
  const d = new Date(date);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatRevenue(v: number): string {
  if (v >= 10000) return `${(v / 10000).toFixed(1)}만`;
  return `${v.toLocaleString()}원`;
}

function formatHarvest(v: number): string {
  return `${v.toLocaleString()}kg`;
}

const EMPTY_SUMMARY: PeriodSummary = { harvest: 0, sales: 0, revenue: 0, netRevenue: 0, stock: 0, laborCost: 0, commissionTotal: 0, extraCostTotal: 0, otherExtraCostTotal: 0 };

export default function StatisticsScreen() {
  const { user } = useAuth();
  const { period: paramPeriod } = useLocalSearchParams<{ period?: string }>();
  const today = new Date().toISOString().split('T')[0];

  const [period, setPeriod] = useState<PeriodType>((paramPeriod as PeriodType) ?? 'day');
  const [selectedDate, setSelectedDate] = useState(today);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [chartType, setChartType] = useState<'harvest' | 'revenue'>('harvest');
  const [donutTab, setDonutTab] = useState<'crop' | 'variety' | 'size'>('crop');

  // 차트 인터랙션: 탭으로 선택한 항목 (도넛 조각 / 막대)
  const [selectedDonut, setSelectedDonut] = useState<number | null>(null);
  const [selectedBar, setSelectedBar] = useState<number | null>(null);

  const spinAnim = useRef(new Animated.Value(0)).current;
  const [isSpinning, setIsSpinning] = useState(false);

  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showExport, setShowExport] = useState(false);

  // 농장 필터
  const [farms, setFarms] = useState<{ id: string; name: string }[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string | undefined>(undefined);

  const [periodSummary, setPeriodSummary] = useState<{
    current: PeriodSummary; previous: PeriodSummary; previousYear?: PeriodSummary;
  }>({ current: EMPTY_SUMMARY, previous: EMPTY_SUMMARY });
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [barStats, setBarStats] = useState<DailyStat[]>([]);
  const [barLoading, setBarLoading] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const [donutData, setDonutData] = useState<Awaited<ReturnType<typeof fetchBreakdown>> | null>(null);

  // 막대 차트 상세(작물·품종·사이즈별) — 막대 선택 시 사용
  const [trendDetail, setTrendDetail] = useState<{ harvest: TrendDetailRow[]; sales: TrendDetailRow[] }>({ harvest: [], sales: [] });

  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [priceCrop, setPriceCrop] = useState<string | null>(null);
  const [priceVariety, setPriceVariety] = useState<string | null>(null);
  const [priceSize, setPriceSize] = useState<string | null>(null);
  const [priceSelectField, setPriceSelectField] = useState<'crop' | 'variety' | 'size' | null>(null);
  const [priceChartWidth, setPriceChartWidth] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase.from('farms').select('id, name').eq('user_id', user.id)
      .then(({ data }) => setFarms(data ?? []));
  }, [user]);

  const loadAll = useCallback(async (p: PeriodType, date: string) => {
    if (!user) return;
    const range = computeSelectedRange(date, p);
    const { from: curF, to: curT, prevFrom: prevF, prevTo: prevT } = range;

    setSummaryLoading(true);
    setBarLoading(true);

    const barF = getBarFrom(curT, p);
    // 판매 단가: 선택 기간 -3 ~ +3 구간 전체를 가져와 버킷별 평균을 계산
    const priceRange = getPriceRange(date, p);

    const [summaryResult, statsData, breakdownResult, prices, detail] = await Promise.all([
      fetchPeriodSummaryForRange(user.id, curF, curT, prevF, prevT, selectedFarmId),
      fetchStatsForRange(user.id, barF, curT, selectedFarmId),
      fetchBreakdown(user.id, curF, curT, selectedFarmId),
      fetchPriceHistory(user.id, priceRange.from, priceRange.to, selectedFarmId),
      fetchTrendDetail(user.id, barF, curT, selectedFarmId),
    ]);

    let previousYear: PeriodSummary | undefined;
    if (p === 'month' && range.prevYearFrom && range.prevYearTo) {
      const pyResult = await fetchPeriodSummaryForRange(
        user.id, range.prevYearFrom, range.prevYearTo,
        range.prevYearFrom, range.prevYearTo, selectedFarmId
      );
      previousYear = pyResult.current;
    }

    setPeriodSummary({ current: summaryResult.current, previous: summaryResult.previous, previousYear });
    setBarStats(statsData);
    setDonutData(breakdownResult);
    setPriceHistory(prices);
    setTrendDetail(detail);
    setSummaryLoading(false);
    setBarLoading(false);
  }, [user, selectedFarmId]);

  useEffect(() => {
    loadAll(period, selectedDate);
  }, [period, selectedDate, selectedFarmId, user?.id]);

  useEffect(() => {
    if (paramPeriod && ['day', 'week', 'month', 'year'].includes(paramPeriod)) {
      setPeriod(paramPeriod as PeriodType);
    }
  }, [paramPeriod]);

  useFocusEffect(useCallback(() => { loadAll(period, selectedDate); }, [period, selectedDate, loadAll]));

  // 탭을 떠나면 조회 조건·선택 상태를 최초 진입 상태로 초기화
  useFocusEffect(useCallback(() => () => {
    setPeriod('day');
    setSelectedDate(today);
    setChartType('harvest');
    setDonutTab('crop');
    setSelectedDonut(null);
    setSelectedBar(null);
    setSelectedFarmId(undefined);
    setPriceCrop(null);
    setPriceVariety(null);
    setPriceSize(null);
    setPriceSelectField(null);
    setShowDatePicker(false);
    setShowBreakdown(false);
    setShowExport(false);
  }, [today]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await loadAll(period, selectedDate); }
    finally { setRefreshing(false); }
  }, [loadAll, period, selectedDate]);

  // ── 파생 계산값 ──
  const range = computeSelectedRange(selectedDate, period);
  const { from: curFrom, to: curTo, label: rangeLabel } = range;
  const barFrom = getBarFrom(curTo, period);

  const grouped = groupStats(barStats, period);
  const fullRange = fillFullRange(grouped, period, barFrom, curTo);
  const chartData = fullRange.map((s) => {
    const val = chartType === 'harvest' ? s.harvest : s.revenue / 10000;
    const hasVal = val > 0;
    const valueText = chartType === 'harvest'
      ? (val >= 1000 ? `${(val / 1000).toFixed(1)}t` : `${Number.isInteger(val) ? val : val.toFixed(1)}`)
      : `${val.toFixed(1)}만`;
    return {
      value: val,
      valueText,
      label: formatDate(s.date, period),
      dateKey: s.date,
      frontColor: hasVal ? Colors.primary : Colors.border,
    };
  });
  const chartMax = Math.max(...chartData.map((d) => d.value), 1);

  // 판매 단가: 작물·품종·사이즈 select(데이터관리 방식)로 구분 선택
  const ALL = '전체';
  const priceCropOptions = [ALL, ...Array.from(new Set(priceHistory.map((p) => p.crop).filter(Boolean)))];
  // 선택된 작물에 따라 품종 옵션 좁힘 (cascading)
  const cropFiltered = priceHistory.filter((p) => !priceCrop || priceCrop === ALL || p.crop === priceCrop);
  const priceVarietyOptions = [ALL, ...Array.from(new Set(cropFiltered.map((p) => p.variety).filter(Boolean)))];
  const varietyFiltered = cropFiltered.filter((p) => !priceVariety || priceVariety === ALL || p.variety === priceVariety);
  const priceSizeOptions = [ALL, ...Array.from(new Set(varietyFiltered.map((p) => p.size).filter(Boolean)))];
  const sizeFiltered = varietyFiltered.filter((p) => !priceSize || priceSize === ALL || p.size === priceSize);
  const activePriceCrop = priceCrop && priceCropOptions.includes(priceCrop) ? priceCrop : ALL;
  const activePriceVariety = priceVariety && priceVarietyOptions.includes(priceVariety) ? priceVariety : ALL;
  const activePriceSize = priceSize && priceSizeOptions.includes(priceSize) ? priceSize : ALL;
  // 선택 기간 -3 ~ +3 구간으로 버킷팅 → 버킷별 평균 단가(판매 없는 구간은 0원)
  const priceBuckets = getPriceBuckets(selectedDate, period);
  const priceBucketAgg: Record<string, { sum: number; count: number }> = {};
  priceBuckets.forEach((b) => { priceBucketAgg[b.key] = { sum: 0, count: 0 }; });
  sizeFiltered.forEach((p) => {
    const k = periodKeyOf(p.date, period);
    if (priceBucketAgg[k]) { priceBucketAgg[k].sum += p.price; priceBucketAgg[k].count += 1; }
  });
  const priceChartData = priceBuckets.map((b) => {
    const agg = priceBucketAgg[b.key];
    const avg = agg.count > 0 ? Math.round(agg.sum / agg.count) : 0;
    return { value: avg, label: b.label, dataPointText: avg.toLocaleString() };
  });
  const priceMax = Math.max(...priceChartData.map((d) => d.value), 1);
  // 차트가 카드 너비를 꽉 채우도록 포인트 간격 계산 (y축 44 + 좌우 여백 제외)
  const priceSpacing = priceChartWidth > 0 && priceChartData.length > 1
    ? Math.max(24, (priceChartWidth - 44 - 20 - 24) / (priceChartData.length - 1))
    : 48;

  // 도넛 데이터
  const donutItems = donutData
    ? (donutTab === 'crop' ? donutData.byCrop
      : donutTab === 'variety' ? donutData.byVariety
      : donutData.byVarietySize)
    : [];
  const donutTotal = donutItems.reduce((s, i) => s + i.harvest, 0);
  const topItems = donutItems.slice(0, 6).filter(i => i.harvest > 0);
  const pieData = topItems.map((item, i) => ({
    value: item.harvest,
    color: DONUT_COLORS[i % DONUT_COLORS.length],
    label: item.key,
  }));
  // 상위 6개 외 나머지는 "기타"로 묶어 도넛/표를 100%로 채움
  const othersValue = donutTotal - topItems.reduce((s, i) => s + i.harvest, 0);
  if (othersValue > 0.0001) {
    pieData.push({ value: othersValue, color: DONUT_OTHERS_COLOR, label: '기타' });
  }

  // 탭/데이터가 바뀌면 차트 선택 해제
  useEffect(() => { setSelectedDonut(null); }, [donutTab, donutData]);
  useEffect(() => { setSelectedBar(null); }, [chartType, barStats]);

  // 선택된 차트 항목 파생값
  const selectedDonutItem = selectedDonut != null && selectedDonut < pieData.length ? pieData[selectedDonut] : null;
  const selectedDonutPct = selectedDonutItem && donutTotal > 0
    ? ((selectedDonutItem.value / donutTotal) * 100).toFixed(1) : null;
  const toggleDonut = (i: number) => { hapticLight(); setSelectedDonut((prev) => (prev === i ? null : i)); };

  const selectedBarItem = selectedBar != null && selectedBar < chartData.length ? chartData[selectedBar] : null;
  const barTotal = chartData.reduce((s, d) => s + d.value, 0);
  const selectedBarPct = selectedBarItem && barTotal > 0
    ? ((selectedBarItem.value / barTotal) * 100).toFixed(1) : null;
  const toggleBar = (i: number) => { hapticLight(); setSelectedBar((prev) => (prev === i ? null : i)); };

  // 선택한 막대(기간)의 작물-품종 → 사이즈별 상세 내역
  const fmtBarVal = (v: number) => chartType === 'harvest'
    ? `${Number.isInteger(v) ? v.toLocaleString() : parseFloat(v.toFixed(1)).toLocaleString()}kg`
    : `${Math.round(v).toLocaleString()}원`;
  type BarSizeRow = { size: string; value: number };
  type BarCVGroup = { crop: string; variety: string; total: number; sizes: BarSizeRow[] };
  const selectedBarRows: TrendDetailRow[] = selectedBarItem
    ? (chartType === 'harvest' ? trendDetail.harvest : trendDetail.sales)
        .filter((r) => periodKeyOf(r.date, period) === selectedBarItem.dateKey)
    : [];
  const barDetailTotal = selectedBarRows.reduce((s, r) => s + r.value, 0);
  const barDetailGroups: BarCVGroup[] = (() => {
    const groups: BarCVGroup[] = [];
    for (const r of selectedBarRows) {
      let g = groups.find((x) => x.crop === r.crop && x.variety === r.variety);
      if (!g) { g = { crop: r.crop, variety: r.variety, total: 0, sizes: [] }; groups.push(g); }
      g.total += r.value;
      let sz = g.sizes.find((s) => s.size === r.size);
      if (!sz) { sz = { size: r.size, value: 0 }; g.sizes.push(sz); }
      sz.value += r.value;
    }
    groups.forEach((g) => g.sizes.sort((a, b) => b.value - a.value));
    groups.sort((a, b) => b.total - a.total);
    return groups;
  })();

  // 도넛 회전 애니메이션
  useEffect(() => {
    if (pieData.length === 0) return;
    spinAnim.stopAnimation();
    setIsSpinning(true);
    spinAnim.setValue(0);
    Animated.timing(spinAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start(({ finished }) => { if (finished) setIsSpinning(false); });
  }, [donutTab, donutData]);

  const donutSpin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const cur = periodSummary.current;
  const prev = periodSummary.previous;
  const py = periodSummary.previousYear;
  const labels = COMPARE_LABELS[period];
  const revenueRate = prev.revenue > 0 ? ((cur.revenue - prev.revenue) / prev.revenue) * 100 : null;
  const harvestRate = prev.harvest > 0 ? ((cur.harvest - prev.harvest) / prev.harvest) * 100 : null;
  const pyRevenueRate = py && py.revenue > 0 ? ((cur.revenue - py.revenue) / py.revenue) * 100 : null;
  const pyHarvestRate = py && py.harvest > 0 ? ((cur.harvest - py.harvest) / py.harvest) * 100 : null;
  const salesRate = prev.sales > 0 ? ((cur.sales - prev.sales) / prev.sales) * 100 : null;
  const netRevenueRate = prev.netRevenue > 0 ? ((cur.netRevenue - prev.netRevenue) / prev.netRevenue) * 100 : null;
  const salesLabel = labels.harvest.replace('수확량', '판매량');
  const netRevenueLabel = labels.revenue.replace('매출', '순수익');

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={[Colors.primaryUltraLight, Colors.background]} style={styles.headerGradient}>
        <Text style={styles.title}>통계</Text>

        {/* 기간 탭 */}
        <View style={styles.periodTabs}>
          {PERIODS.map((p) => (
            <TouchableOpacity key={p.key}
              style={[styles.periodBtn, period === p.key && styles.periodBtnActive]}
              onPress={() => setPeriod(p.key)}>
              <Text style={[styles.periodText, period === p.key && styles.periodTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 날짜 네비게이터 */}
        <View style={styles.dateNav}>
          <TouchableOpacity style={styles.dateNavArrowBtn}
            onPress={() => setSelectedDate(navigatePeriod(selectedDate, period, -1))}>
            <Text style={styles.dateNavArrow}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dateNavLabel} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.dateNavText}>{rangeLabel}</Text>
            <Text style={styles.dateNavHint}>탭하여 날짜 선택</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dateNavArrowBtn}
            disabled={range.to >= today}
            onPress={() => setSelectedDate(navigatePeriod(selectedDate, period, 1))}>
            <Text style={[styles.dateNavArrow, range.to >= today && { color: Colors.border }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* 농장 필터 */}
        {farms.length >= 2 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={styles.farmFilterScroll} contentContainerStyle={styles.farmFilterContent}>
            <TouchableOpacity style={[styles.farmChip, !selectedFarmId && styles.farmChipActive]}
              onPress={() => setSelectedFarmId(undefined)}>
              <Text style={[styles.farmChipText, !selectedFarmId && styles.farmChipTextActive]}>전체</Text>
            </TouchableOpacity>
            {farms.map((f) => (
              <TouchableOpacity key={f.id}
                style={[styles.farmChip, selectedFarmId === f.id && styles.farmChipActive]}
                onPress={() => setSelectedFarmId(f.id)}>
                <Text style={[styles.farmChipText, selectedFarmId === f.id && styles.farmChipTextActive]}>{f.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
            colors={[Colors.primary]} tintColor={Colors.primary} />
        }
      >
        {/* 요약 카드 */}
        {summaryLoading ? (
          <SummaryCardSkeleton />
        ) : (
          <View style={styles.summarySection}>
            <View style={styles.summaryRow}>
              <SummaryCard
                icon="blueberry" title="수확량"
                value={cur.harvest.toLocaleString()} unit="kg"
                changeRate={harvestRate} compareLabel={labels.harvest}
                color={Colors.primary}
              />
              <SummaryCard
                icon="money-wavy" title="판매량"
                value={cur.sales.toLocaleString()} unit="kg"
                changeRate={salesRate} compareLabel={salesLabel}
                color={Colors.primaryDark}
              />
            </View>
            <View style={styles.summaryRow}>
              <SummaryCard
                icon="currency-krw" title="매출"
                value={(cur.revenue / 10000).toFixed(1)} unit="만원"
                changeRate={revenueRate} compareLabel={labels.revenue}
                color={Colors.success}
              />
              <SummaryCard
                icon="trend-up" title="순수익"
                value={(cur.netRevenue / 10000).toFixed(1)} unit="만원"
                changeRate={netRevenueRate} compareLabel={netRevenueLabel}
                color={Colors.warning}
              />
            </View>
            {(cur.commissionTotal > 0 || cur.extraCostTotal > 0 || cur.laborCost > 0 || cur.otherExtraCostTotal > 0) && (() => {
              const total = cur.commissionTotal + cur.extraCostTotal + cur.laborCost + cur.otherExtraCostTotal;
              return (
                <Card style={styles.laborCard}>
                  <View style={styles.deductionHeader}>
                    <Text style={styles.deductionTitle}>차감 내역</Text>
                    <Text style={[styles.deductionValue, { color: Colors.danger }]}>
                      −{formatRevenue(total)}
                    </Text>
                  </View>
                  {cur.commissionTotal > 0 && (
                    <View style={styles.deductionRow}>
                      <Text style={styles.deductionLabel}>수수료</Text>
                      <Text style={[styles.deductionValue, { color: Colors.textSub }]}>
                        −{formatRevenue(cur.commissionTotal)}
                      </Text>
                    </View>
                  )}
                  {cur.extraCostTotal > 0 && (
                    <View style={styles.deductionRow}>
                      <Text style={styles.deductionLabel}>판매 부수비용</Text>
                      <Text style={[styles.deductionValue, { color: Colors.textSub }]}>
                        −{formatRevenue(cur.extraCostTotal)}
                      </Text>
                    </View>
                  )}
                  {cur.otherExtraCostTotal > 0 && (
                    <View style={styles.deductionRow}>
                      <Text style={styles.deductionLabel}>기타 부수비용</Text>
                      <Text style={[styles.deductionValue, { color: Colors.textSub }]}>
                        −{formatRevenue(cur.otherExtraCostTotal)}
                      </Text>
                    </View>
                  )}
                  {cur.laborCost > 0 && (
                    <View style={styles.deductionRow}>
                      <Text style={styles.deductionLabel}>인건비</Text>
                      <Text style={[styles.deductionValue, { color: Colors.textSub }]}>
                        −{formatRevenue(cur.laborCost)}
                      </Text>
                    </View>
                  )}
                </Card>
              );
            })()}
          </View>
        )}

        {/* 도넛 차트 */}
        <Card style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={Typography.h3}>구성 비율</Text>
          </View>
          <View style={styles.donutTabs}>
            {([['crop', '작물별'], ['variety', '품종별'], ['size', '품종·사이즈별']] as const).map(([k, l]) => (
              <TouchableOpacity key={k}
                style={[styles.donutTab, donutTab === k && styles.donutTabActive]}
                onPress={() => setDonutTab(k)}>
                <Text style={[styles.donutTabText, donutTab === k && styles.donutTabTextActive]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {pieData.length > 0 ? (
            <View style={styles.donutBody}>
              {Platform.OS !== 'web' ? (
                <Animated.View style={{ transform: [{ rotate: donutSpin }] }}>
                  <PieChart donut
                    data={pieData.map((p, i) => (i === selectedDonut ? { ...p, focused: true } : p))}
                    radius={100} innerRadius={60} showText={false}
                    extraRadius={12}
                    onPress={(_item: any, index: number) => toggleDonut(index)}
                    centerLabelComponent={() => (
                      <View style={{ alignItems: 'center' }}>
                        {selectedDonutItem ? (
                          <>
                            <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '700', color: selectedDonutItem.color, maxWidth: 88, textAlign: 'center' }}>{selectedDonutItem.label}</Text>
                            <Text style={{ fontSize: 16, fontWeight: '800', color: Colors.text }}>{selectedDonutItem.value.toLocaleString()}</Text>
                            <Text style={{ fontSize: 11, color: Colors.textSub }}>kg · {selectedDonutPct}%</Text>
                          </>
                        ) : (
                          <>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.primary }}>{donutTotal.toLocaleString()}</Text>
                            <Text style={{ fontSize: 11, color: Colors.textSub }}>kg</Text>
                          </>
                        )}
                      </View>
                    )}
                  />
                </Animated.View>
              ) : (
                <View style={styles.webDonutWrap}>
                  {/* 정적 -90° 회전으로 12시 방향에서 시작 (origin prop은 web DOM 에러 발생) */}
                  <Animated.View style={{ transform: [{ rotate: donutSpin }, { rotate: '-90deg' }] }}>
                    <Svg width={200} height={200}>
                      <G>
                        {(() => {
                          const r = 80;
                          const c = 2 * Math.PI * r;
                          const pieSum = pieData.reduce((s, p) => s + p.value, 0);
                          let acc = 0;
                          return pieData.map((item, i) => {
                            const frac = pieSum > 0 ? item.value / pieSum : 0;
                            const seg = (
                              <Circle
                                key={i} cx={100} cy={100} r={r} fill="none"
                                stroke={item.color} strokeWidth={40}
                                opacity={selectedDonut === null || i === selectedDonut ? 1 : 0.3}
                                strokeDasharray={`${frac * c} ${c}`}
                                strokeDashoffset={-acc * c}
                                {...({ onPress: null, onClick: () => toggleDonut(i), style: { cursor: 'pointer' } } as any)}
                              />
                            );
                            acc += frac;
                            return seg;
                          });
                        })()}
                      </G>
                    </Svg>
                  </Animated.View>
                  <View style={styles.webDonutCenter} pointerEvents="none">
                    {selectedDonutItem ? (
                      <>
                        <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '700', color: selectedDonutItem.color, maxWidth: 96, textAlign: 'center' }}>{selectedDonutItem.label}</Text>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: Colors.text }}>{selectedDonutItem.value.toLocaleString()}</Text>
                        <Text style={{ fontSize: 12, color: Colors.textSub }}>kg · {selectedDonutPct}%</Text>
                      </>
                    ) : (
                      <>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.primary }}>{donutTotal.toLocaleString()}</Text>
                        <Text style={{ fontSize: 12, color: Colors.textSub }}>kg</Text>
                      </>
                    )}
                  </View>
                </View>
              )}
              <View style={styles.donutTable}>
                <View style={styles.donutTableHeader}>
                  <Text style={[styles.donutTableHeaderText, { flex: 1 }]}>항목</Text>
                  <Text style={[styles.donutTableHeaderText, { width: 76, textAlign: 'right' }]}>수량</Text>
                  <Text style={[styles.donutTableHeaderText, { width: 50, textAlign: 'right' }]}>비율</Text>
                </View>
                {pieData.map((item, i) => {
                  const pct = donutTotal > 0 ? ((item.value / donutTotal) * 100).toFixed(1) : '0';
                  const isSel = i === selectedDonut;
                  return (
                    <TouchableOpacity key={i} activeOpacity={0.7}
                      style={[styles.donutTableRow, isSel && styles.donutTableRowActive]}
                      onPress={() => toggleDonut(i)}>
                      <View style={[styles.donutDot, { backgroundColor: item.color }]} />
                      <Text style={[styles.donutTableLabel, isSel && styles.donutTableLabelActive]} numberOfLines={1}>{item.label}</Text>
                      <Text style={[styles.donutTableValue, isSel && { color: item.color, fontWeight: '800' }]}>{item.value.toLocaleString()}kg</Text>
                      <Text style={[styles.donutTablePct, isSel && { color: item.color, fontWeight: '800' }]}>{pct}%</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyText}>데이터가 없습니다</Text>
              <Text style={styles.emptySubText}>위 날짜 네비게이터로 기간을 변경해보세요</Text>
            </View>
          )}
        </Card>

        {/* 막대 차트 */}
        <Card style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={Typography.h3}>{chartType === 'harvest' ? '수확량 추이' : '매출 추이'}</Text>
            <View style={styles.chartTypeTabs}>
              {(['harvest', 'revenue'] as const).map((t) => (
                <TouchableOpacity key={t}
                  style={[styles.chartTypeBtn, chartType === t && styles.chartTypeBtnActive]}
                  onPress={() => setChartType(t)}>
                  <Text style={[styles.chartTypeText, chartType === t && styles.chartTypeTextActive]}>
                    {t === 'harvest' ? '수확' : '매출'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          {barLoading ? (
            <BarChartSkeleton />
          ) : (
            <View style={styles.hBarChart}>
              {chartData.map((d, i) => {
                const hasVal = d.value > 0;
                const isSel = i === selectedBar;
                return (
                  <TouchableOpacity key={i} activeOpacity={hasVal ? 0.7 : 1} disabled={!hasVal}
                    style={[styles.hBarRow, isSel && styles.hBarRowActive]}
                    onPress={() => toggleBar(i)}>
                    <Text style={[styles.hBarLabel, isSel && styles.hBarLabelActive]}>{d.label}</Text>
                    <View style={styles.hBarAxis} />
                    <View style={styles.hBarTrack}>
                      <View style={[styles.hBarFill, {
                        width: `${(d.value / chartMax) * 100}%`,
                        backgroundColor: isSel ? Colors.primaryDark : d.frontColor,
                      }]} />
                    </View>
                    <Text style={[styles.hBarValue, isSel && styles.hBarValueActive]}>{d.value > 0 ? d.valueText : '−'}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          {selectedBarItem && (
            <View style={styles.barDetail}>
              <View style={styles.barDetailHeaderRow}>
                <View style={styles.barTooltipDot} />
                <Text style={styles.barDetailHeaderText}>
                  <Text style={styles.barTooltipLabel}>{selectedBarItem.label}</Text>
                  {`  전체 ${fmtBarVal(barDetailTotal)}`}
                  {selectedBarPct ? `  ·  전체의 ${selectedBarPct}%` : ''}
                </Text>
              </View>
              {barDetailGroups.length === 0 ? (
                <Text style={styles.barDetailEmpty}>상세 내역이 없습니다</Text>
              ) : (
                barDetailGroups.map((g, gi) => (
                  <View key={gi} style={styles.barDetailGroup}>
                    <Text style={styles.barDetailCV}>
                      [{[g.crop, g.variety].filter(Boolean).join('-') || '미입력'}]
                      <Text style={styles.barDetailCVTotal}>{`  ${fmtBarVal(g.total)}`}</Text>
                    </Text>
                    <Text style={styles.barDetailSizes}>
                      {g.sizes.map((s) => `${s.size || '—'} ${fmtBarVal(s.value)}`).join(', ')}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}
        </Card>

        {/* 기간 비교 */}
        <Card style={styles.compareCard}>
          <Text style={[Typography.h3, { marginBottom: Spacing.md }]}>기간 비교</Text>
          <View style={styles.compareRow}>
            <Text style={styles.compareLabel}>{labels.revenue}</Text>
            <View style={styles.compareRight}>
              <Text style={styles.compareValues}>{formatRevenue(cur.revenue)} / {formatRevenue(prev.revenue)}</Text>
              {revenueRate !== null ? <StatBadge value={revenueRate} /> : <Text style={styles.noDataText}>이전 데이터 없음</Text>}
            </View>
          </View>
          <View style={[styles.compareRow, { marginTop: Spacing.sm }]}>
            <Text style={styles.compareLabel}>{labels.harvest}</Text>
            <View style={styles.compareRight}>
              <Text style={styles.compareValues}>{formatHarvest(cur.harvest)} / {formatHarvest(prev.harvest)}</Text>
              {harvestRate !== null ? <StatBadge value={harvestRate} /> : <Text style={styles.noDataText}>이전 데이터 없음</Text>}
            </View>
          </View>
          {period === 'month' && py && (
            <>
              <View style={styles.compareDivider}>
                <Text style={styles.compareDividerText}>작년 동월 비교</Text>
              </View>
              <View style={styles.compareRow}>
                <Text style={styles.compareLabel}>작년 동월 매출</Text>
                <View style={styles.compareRight}>
                  <Text style={styles.compareValues}>{formatRevenue(cur.revenue)} / {formatRevenue(py.revenue)}</Text>
                  {pyRevenueRate !== null ? <StatBadge value={pyRevenueRate} /> : <Text style={styles.noDataText}>데이터 없음</Text>}
                </View>
              </View>
              <View style={[styles.compareRow, { marginTop: Spacing.sm }]}>
                <Text style={styles.compareLabel}>작년 동월 수확량</Text>
                <View style={styles.compareRight}>
                  <Text style={styles.compareValues}>{formatHarvest(cur.harvest)} / {formatHarvest(py.harvest)}</Text>
                  {pyHarvestRate !== null ? <StatBadge value={pyHarvestRate} /> : <Text style={styles.noDataText}>데이터 없음</Text>}
                </View>
              </View>
            </>
          )}
        </Card>

        {/* 잔여 재고 */}
        <Card style={styles.stockCard}>
          <Text style={[Typography.h3, { marginBottom: Spacing.md }]}>잔여 재고 (선택 기간)</Text>
          <View style={styles.stockRow}>
            <View style={styles.stockItem}>
              <Text style={styles.stockLabel}>수확량</Text>
              <Text style={[styles.stockValue, { color: Colors.primary }]}>{cur.harvest.toLocaleString()}kg</Text>
            </View>
            <Text style={styles.stockOp}>−</Text>
            <View style={styles.stockItem}>
              <Text style={styles.stockLabel}>판매량</Text>
              <Text style={[styles.stockValue, { color: Colors.primaryDark }]}>{cur.sales.toLocaleString()}kg</Text>
            </View>
            <Text style={styles.stockOp}>−</Text>
            <View style={styles.stockItem}>
              <Text style={styles.stockLabel}>기타</Text>
              <Text style={[styles.stockValue, { color: Colors.danger }]}>
                {(cur.harvest - cur.sales - cur.stock).toLocaleString()}kg
              </Text>
            </View>
          </View>
          <View style={styles.stockDivider} />
          <View style={styles.stockResultRow}>
            <Text style={styles.stockResultLabel}>재고</Text>
            <Text style={[styles.stockResultValue, { color: cur.stock >= 0 ? Colors.success : Colors.danger }]}>
              {cur.stock.toLocaleString()}kg
            </Text>
          </View>
        </Card>

        {/* 최근 판매 단가 */}
        {priceHistory.length > 0 && (
          <Card style={styles.priceCard}>
            <Text style={Typography.h3}>판매 단가 추이</Text>
            <Text style={styles.priceSubLabel}>
              {`선택 ${PERIODS.find((p) => p.key === period)?.label} ±3 구간${period === 'day' ? '' : ' 평균'} · 판매 없는 구간은 0원`}
            </Text>
            <View style={styles.priceSelectRow}>
              <TouchableOpacity style={styles.priceSelect} activeOpacity={0.7}
                onPress={() => { hapticLight(); setPriceSelectField('crop'); }}>
                <Text style={styles.priceSelectLabel}>작물</Text>
                <Text style={styles.priceSelectValue} numberOfLines={1}>{activePriceCrop}</Text>
                <Text style={styles.priceSelectCaret}>▾</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.priceSelect} activeOpacity={0.7}
                onPress={() => { hapticLight(); setPriceSelectField('variety'); }}>
                <Text style={styles.priceSelectLabel}>품종</Text>
                <Text style={styles.priceSelectValue} numberOfLines={1}>{activePriceVariety}</Text>
                <Text style={styles.priceSelectCaret}>▾</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.priceSelect} activeOpacity={0.7}
                onPress={() => { hapticLight(); setPriceSelectField('size'); }}>
                <Text style={styles.priceSelectLabel}>사이즈</Text>
                <Text style={styles.priceSelectValue} numberOfLines={1}>{activePriceSize}</Text>
                <Text style={styles.priceSelectCaret}>▾</Text>
              </TouchableOpacity>
            </View>
            <View onLayout={(e) => setPriceChartWidth(e.nativeEvent.layout.width)}>
              {priceChartData.length > 0 && priceChartWidth > 0 && (
                Platform.OS !== 'web' ? (
                  <LineChart
                    data={priceChartData}
                    thickness={2.5}
                    color={Colors.primary}
                    dataPointsColor={Colors.primaryDark}
                    curved areaChart
                    startFillColor={Colors.primary}
                    startOpacity={0.15}
                    endFillColor={Colors.primary}
                    endOpacity={0.01}
                    hideRules
                    xAxisThickness={1} xAxisColor={Colors.border}
                    yAxisThickness={0}
                    yAxisTextStyle={{ color: Colors.textSub, fontSize: 9 }}
                    xAxisLabelTextStyle={{ color: Colors.textSub, fontSize: 9 }}
                    yAxisLabelWidth={44}
                    noOfSections={4}
                    maxValue={priceMax * 1.25}
                    width={priceChartWidth - 44}
                    spacing={priceSpacing}
                    initialSpacing={20}
                    textColor={Colors.text}
                    textFontSize={9}
                    textShiftY={-6}
                    isAnimated animationDuration={500}
                  />
                ) : (() => {
                  const H = 180, padL = 48, padR = 14, padT = 18, padB = 26;
                  const plotW = priceChartWidth - padL - padR;
                  const plotH = H - padT - padB;
                  const maxV = priceMax * 1.25;
                  const n = priceChartData.length;
                  const xAt = (i: number) => (n === 1 ? padL + plotW / 2 : padL + (i / (n - 1)) * plotW);
                  const yAt = (v: number) => padT + (1 - v / maxV) * plotH;
                  const linePath = priceChartData
                    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i)} ${yAt(d.value)}`)
                    .join(' ');
                  const areaPath = `${linePath} L ${xAt(n - 1)} ${padT + plotH} L ${xAt(0)} ${padT + plotH} Z`;
                  const sections = 4;
                  return (
                    <Svg width={priceChartWidth} height={H}>
                      {Array.from({ length: sections + 1 }).map((_, s) => {
                        const v = (maxV / sections) * s;
                        const y = yAt(v);
                        return (
                          <G key={s}>
                            <SvgLine x1={padL} y1={y} x2={priceChartWidth - padR} y2={y}
                              stroke={Colors.border} strokeWidth={s === 0 ? 1 : 0.5} />
                            <SvgText x={padL - 6} y={y + 3} fontSize={9} fill={Colors.textSub} textAnchor="end">
                              {Math.round(v).toLocaleString()}
                            </SvgText>
                          </G>
                        );
                      })}
                      <Path d={areaPath} fill={Colors.primary} fillOpacity={0.12} />
                      <Path d={linePath} stroke={Colors.primary} strokeWidth={2.5} fill="none" />
                      {priceChartData.map((d, i) => (
                        <G key={i}>
                          <Circle cx={xAt(i)} cy={yAt(d.value)} r={3.5} fill={Colors.primaryDark} />
                          <SvgText x={xAt(i)} y={yAt(d.value) - 8} fontSize={9} fill={Colors.text} textAnchor="middle">
                            {d.value.toLocaleString()}
                          </SvgText>
                          <SvgText x={xAt(i)} y={H - 8} fontSize={9} fill={Colors.textSub} textAnchor="middle">
                            {d.label}
                          </SvgText>
                        </G>
                      ))}
                    </Svg>
                  );
                })()
              )}
            </View>
          </Card>
        )}
        <TouchableOpacity style={[styles.breakdownBtn, { marginTop: Spacing.sm }]} onPress={() => setShowExport(true)}>
          <PhIcon name="table" size={16} color={Colors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.breakdownBtnText}>Google Sheets로 월간 데이터 내보내기</Text>
          <Text style={{ color: Colors.primary, fontSize: 16 }}>›</Text>
        </TouchableOpacity>
        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      {user && showBreakdown && (
        <BreakdownModal visible={showBreakdown} onClose={() => setShowBreakdown(false)}
          userId={user.id} from={curFrom} to={curTo} farmId={selectedFarmId} />
      )}
      {user && showExport && (
        <ExportModal visible={showExport} onClose={() => setShowExport(false)} userId={user.id} />
      )}
      <CalendarModal
        visible={showDatePicker}
        value={selectedDate}
        maxDate={today}
        mode={period === 'day' ? 'day' : period === 'week' ? 'week' : period === 'month' ? 'month' : 'year'}
        onSelect={(d) => { setSelectedDate(d); setShowDatePicker(false); }}
        onClose={() => setShowDatePicker(false)}
      />
      <SelectModal
        visible={priceSelectField !== null}
        title={priceSelectField === 'crop' ? '작물 선택' : priceSelectField === 'variety' ? '품종 선택' : '사이즈 선택'}
        options={priceSelectField === 'crop' ? priceCropOptions : priceSelectField === 'variety' ? priceVarietyOptions : priceSizeOptions}
        value={priceSelectField === 'crop' ? activePriceCrop : priceSelectField === 'variety' ? activePriceVariety : activePriceSize}
        onSelect={(v) => {
          if (priceSelectField === 'crop') { setPriceCrop(v); setPriceVariety(null); setPriceSize(null); }
          else if (priceSelectField === 'variety') { setPriceVariety(v); setPriceSize(null); }
          else setPriceSize(v);
        }}
        onClose={() => setPriceSelectField(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerGradient: { paddingBottom: Spacing.md },
  title: { ...Typography.h2, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, marginBottom: Spacing.sm },
  periodTabs: {
    flexDirection: 'row', marginHorizontal: Spacing.lg,
    backgroundColor: Colors.border, borderRadius: Radius.full, padding: 3, marginBottom: Spacing.sm,
  },
  periodBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: Radius.full },
  periodBtnActive: { backgroundColor: Colors.surface },
  periodText: { fontSize: 13, fontWeight: '600', color: Colors.textSub },
  periodTextActive: { color: Colors.primary },
  // 날짜 네비게이터
  dateNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm,
  },
  dateNavArrowBtn: { padding: 8 },
  dateNavArrow: { fontSize: 28, color: Colors.primary, fontWeight: '300' },
  dateNavLabel: { flex: 1, alignItems: 'center' },
  dateNavText: { fontSize: 17, fontWeight: '800', color: Colors.text },
  dateNavHint: { fontSize: 10, color: Colors.textLight, marginTop: 1 },
  farmFilterScroll: { marginTop: Spacing.xs },
  farmFilterContent: { paddingHorizontal: Spacing.lg, gap: 6 },
  farmChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  farmChipActive: { backgroundColor: Colors.primaryUltraLight, borderColor: Colors.primary },
  farmChipText: { fontSize: 12, fontWeight: '600', color: Colors.textSub },
  farmChipTextActive: { color: Colors.primaryDark },
  scroll: { flex: 1 },
  summarySection: { paddingTop: Spacing.md, gap: Spacing.sm },
  summaryRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm },
  laborCard: { marginHorizontal: Spacing.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm },
  summaryLabel: { ...Typography.caption, marginBottom: 4 },
  summaryValue: { fontSize: 14, fontWeight: '800' },
  deductionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  deductionTitle: { ...Typography.bodyBold },
  deductionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  deductionLabel: { ...Typography.caption, color: Colors.textSub },
  deductionValue: { fontSize: 13, fontWeight: '700' },
  chartCard: { marginHorizontal: Spacing.md, marginTop: Spacing.sm, marginBottom: 0 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  chartTypeTabs: { flexDirection: 'row', gap: 4 },
  chartTypeBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  chartTypeBtnActive: { backgroundColor: Colors.primaryUltraLight, borderColor: Colors.primary },
  chartTypeText: { fontSize: 12, color: Colors.textSub, fontWeight: '600' },
  chartTypeTextActive: { color: Colors.primary },
  // 도넛
  donutTabs: { flexDirection: 'row', gap: 6, marginBottom: Spacing.md },
  donutTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  donutTabActive: { backgroundColor: Colors.primaryUltraLight, borderColor: Colors.primary },
  donutTabText: { fontSize: 12, color: Colors.textSub, fontWeight: '600' },
  donutTabTextActive: { color: Colors.primaryDark, fontWeight: '700' },
  donutBody: { alignItems: 'center', gap: Spacing.md },
  donutDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  donutTable: { width: '100%', borderRadius: Radius.md, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  donutTableHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: Colors.primaryUltraLight },
  donutTableHeaderText: { fontSize: 12, fontWeight: '700', color: Colors.textSub },
  donutTableRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 11, borderTopWidth: 1, borderTopColor: Colors.border },
  donutTableRowActive: { backgroundColor: Colors.primaryUltraLight },
  donutTableLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.text },
  donutTableLabelActive: { fontWeight: '800', color: Colors.text },
  donutTableValue: { width: 76, fontSize: 13, fontWeight: '700', color: Colors.primaryDark, textAlign: 'right' },
  donutTablePct: { width: 50, fontSize: 12, color: Colors.textSub, textAlign: 'right', fontWeight: '600' },
  emptyChart: { alignItems: 'center', paddingVertical: 32 },
  webDonutWrap: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center' },
  webDonutCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  emptyText: { ...Typography.body, color: Colors.textSub },
  emptySubText: { ...Typography.caption, marginTop: 4, color: Colors.textLight },
  compareCard: { marginHorizontal: Spacing.md, marginTop: Spacing.sm },
  compareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: Spacing.xs },
  compareLabel: { ...Typography.body, flex: 1 },
  compareRight: { alignItems: 'flex-end', gap: 4 },
  compareValues: { fontSize: 12, color: Colors.textSub, fontWeight: '600' },
  noDataText: { ...Typography.caption, color: Colors.textLight },
  compareDivider: {
    marginVertical: Spacing.sm, paddingVertical: Spacing.xs,
    borderTopWidth: 1, borderTopColor: Colors.border, alignItems: 'center',
  },
  compareDividerText: { ...Typography.caption, color: Colors.textLight },
  stockCard: { marginHorizontal: Spacing.md, marginTop: Spacing.sm },
  stockRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stockItem: { flex: 1, alignItems: 'center' },
  stockLabel: { ...Typography.caption, marginBottom: 4 },
  stockValue: { fontSize: 15, fontWeight: '700' },
  stockOp: { fontSize: 18, color: Colors.textSub, marginHorizontal: 4 },
  stockDivider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.md },
  stockResultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stockResultLabel: { ...Typography.bodyBold },
  stockResultValue: { fontSize: 22, fontWeight: '800' },
  priceCard: { marginHorizontal: Spacing.md, marginTop: Spacing.sm },
  priceSubLabel: { ...Typography.caption, marginTop: 2, marginBottom: Spacing.sm },
  priceSelectRow: { flexDirection: 'row', gap: 6, paddingBottom: Spacing.md },
  priceSelect: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  priceSelectLabel: { fontSize: 11, color: Colors.textSub, fontWeight: '600' },
  priceSelectValue: { flex: 1, fontSize: 12, color: Colors.text, fontWeight: '700' },
  priceSelectCaret: { fontSize: 10, color: Colors.textSub },
  // 가로 막대 차트 (web)
  hBarChart: { gap: 8, paddingVertical: 4 },
  hBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2, borderRadius: Radius.sm },
  hBarRowActive: { backgroundColor: Colors.primaryUltraLight },
  hBarLabel: { width: 44, fontSize: 11, color: Colors.textSub, textAlign: 'right' },
  hBarLabelActive: { color: Colors.primaryDark, fontWeight: '800' },
  hBarAxis: { width: 2, alignSelf: 'stretch', backgroundColor: Colors.border },
  hBarTrack: {
    flex: 1, height: 18, backgroundColor: Colors.primaryUltraLight,
    borderTopRightRadius: 9, borderBottomRightRadius: 9, overflow: 'hidden',
  },
  hBarFill: { height: '100%', borderTopRightRadius: 9, borderBottomRightRadius: 9 },
  hBarValue: { width: 56, fontSize: 11, fontWeight: '700', color: Colors.text },
  hBarValueActive: { color: Colors.primaryDark, fontWeight: '800' },
  barDetail: {
    marginTop: Spacing.sm, paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: Colors.primaryUltraLight, borderRadius: Radius.md,
  },
  barDetailHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barDetailHeaderText: { flex: 1, fontSize: 12, color: Colors.textSub },
  barDetailEmpty: { fontSize: 12, color: Colors.textSub, marginTop: 8 },
  barDetailGroup: {
    marginTop: 8, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: Colors.primaryLight,
  },
  barDetailCV: { fontSize: 12.5, fontWeight: '800', color: Colors.text },
  barDetailCVTotal: { fontSize: 12, fontWeight: '700', color: Colors.primaryDark },
  barDetailSizes: { fontSize: 12, color: Colors.textSub, marginTop: 3, lineHeight: 18 },
  barTooltipDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primaryDark },
  barTooltipLabel: { fontSize: 13, fontWeight: '800', color: Colors.primaryDark },
  breakdownBtn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: Spacing.md, marginTop: Spacing.sm,
    backgroundColor: Colors.primaryUltraLight, borderRadius: Radius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.primaryLight,
  },
  breakdownBtnText: { ...Typography.bodyBold, color: Colors.primaryDark },
});
