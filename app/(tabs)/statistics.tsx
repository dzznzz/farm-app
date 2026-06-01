import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { BarChart } from 'react-native-gifted-charts';
import { useAuth } from '../../hooks/useAuth';
import { useStats, getCurrentAndPrevRange, fetchPeriodSummary, PeriodSummary } from '../../hooks/useStats';
import { Card } from '../../components/ui/Card';
import { StatBadge } from '../../components/ui/StatBadge';
import { BreakdownModal } from '../../components/modals/BreakdownModal';
import { ExportModal } from '../../components/modals/ExportModal';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';
import { PeriodType, DailyStat } from '../../types';

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

const EMPTY_SUMMARY: PeriodSummary = { harvest: 0, sales: 0, revenue: 0, netRevenue: 0, stock: 0, laborCost: 0 };

export default function StatisticsScreen() {
  const { user } = useAuth();
  const { stats, loading, fetchStats } = useStats(user?.id);
  const { period: paramPeriod } = useLocalSearchParams<{ period?: string }>();
  const [period, setPeriod] = useState<PeriodType>((paramPeriod as PeriodType) ?? 'day');
  const [chartType, setChartType] = useState<'harvest' | 'revenue'>('harvest');
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [periodSummary, setPeriodSummary] = useState<{ current: PeriodSummary; previous: PeriodSummary }>({
    current: EMPTY_SUMMARY,
    previous: EMPTY_SUMMARY,
  });
  const [summaryLoading, setSummaryLoading] = useState(false);

  const loadAll = useCallback(async (p: PeriodType) => {
    if (!user) return;
    fetchStats(p);
    setSummaryLoading(true);
    const result = await fetchPeriodSummary(user.id, p);
    setPeriodSummary(result);
    setSummaryLoading(false);
  }, [user, fetchStats]);

  useEffect(() => { loadAll(period); }, [period, user?.id]);

  useEffect(() => {
    if (paramPeriod && ['day', 'week', 'month', 'year'].includes(paramPeriod)) {
      setPeriod(paramPeriod as PeriodType);
    }
  }, [paramPeriod]);

  useFocusEffect(useCallback(() => { loadAll(period); }, [period, loadAll]));

  const grouped = groupStats(stats, period);
  const chartData = grouped.slice(-7).map((s) => ({
    value: chartType === 'harvest' ? s.harvest : s.revenue / 10000,
    label: formatDate(s.date, period),
    frontColor: Colors.primary,
  }));
  const hasChartData = chartData.some((d) => d.value > 0);

  const cur = periodSummary.current;
  const prev = periodSummary.previous;
  const labels = COMPARE_LABELS[period];

  const revenueRate = prev.revenue > 0
    ? ((cur.revenue - prev.revenue) / prev.revenue) * 100
    : null;
  const harvestRate = prev.harvest > 0
    ? ((cur.harvest - prev.harvest) / prev.harvest) * 100
    : null;

  const { curFrom, curTo } = getCurrentAndPrevRange(period);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={[Colors.primaryUltraLight, Colors.background]} style={styles.headerGradient}>
        <Text style={styles.title}>통계</Text>
        <View style={styles.periodTabs}>
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[styles.periodBtn, period === p.key && styles.periodBtnActive]}
              onPress={() => setPeriod(p.key)}
            >
              <Text style={[styles.periodText, period === p.key && styles.periodTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      <ScrollView style={styles.scroll}>
        {/* 요약 카드 */}
        {summaryLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.lg }} />
        ) : (
          <View style={styles.summaryGrid}>
            {[
              { label: '수확량', value: `${cur.harvest.toLocaleString()}kg`, color: Colors.primary },
              { label: '판매량', value: `${cur.sales.toLocaleString()}kg`, color: Colors.primaryDark },
              { label: '매출', value: `${(cur.revenue / 10000).toFixed(1)}만원`, color: Colors.success },
              { label: '순수익', value: `${(cur.netRevenue / 10000).toFixed(1)}만원`, color: Colors.warning },
            ].map((item) => (
              <Card key={item.label} style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>{item.label}</Text>
                <Text style={[styles.summaryValue, { color: item.color }]}>{item.value}</Text>
              </Card>
            ))}
            {cur.laborCost > 0 && (
              <Card style={styles.laborCard}>
                <Text style={styles.summaryLabel}>인건비 차감</Text>
                <Text style={[styles.summaryValue, { color: Colors.danger }]}>
                  −{(cur.laborCost / 10000).toFixed(1)}만원
                </Text>
              </Card>
            )}
          </View>
        )}

        {/* 추이 차트 */}
        <Card style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={Typography.h3}>
              {chartType === 'harvest' ? '수확량 추이' : '매출 추이'}
            </Text>
            <View style={styles.chartTypeTabs}>
              {(['harvest', 'revenue'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.chartTypeBtn, chartType === t && styles.chartTypeBtnActive]}
                  onPress={() => setChartType(t)}
                >
                  <Text style={[styles.chartTypeText, chartType === t && styles.chartTypeTextActive]}>
                    {t === 'harvest' ? '수확' : '매출'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {loading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: 40 }} />
          ) : chartData.length > 0 && hasChartData ? (
            <BarChart
              data={chartData}
              barWidth={chartData.length > 5 ? 24 : 32}
              spacing={chartData.length > 5 ? 10 : 16}
              roundedTop
              roundedBottom
              hideRules
              xAxisThickness={0}
              yAxisThickness={0}
              yAxisTextStyle={{ color: Colors.textSub, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: Colors.textSub, fontSize: 9 }}
              noOfSections={4}
              maxValue={Math.max(...chartData.map((d) => d.value), 1) * 1.2}
            />
          ) : (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyText}>데이터가 없습니다</Text>
              <Text style={styles.emptySubText}>입력 탭에서 데이터를 추가하세요</Text>
            </View>
          )}
        </Card>

        {/* 기간 비교 */}
        <Card style={styles.compareCard}>
          <Text style={[Typography.h3, { marginBottom: Spacing.md }]}>기간 비교</Text>

          {/* 매출 비교 */}
          <View style={styles.compareRow}>
            <Text style={styles.compareLabel}>{labels.revenue}</Text>
            <View style={styles.compareRight}>
              <Text style={styles.compareValues}>
                {formatRevenue(cur.revenue)} / {formatRevenue(prev.revenue)}
              </Text>
              {revenueRate !== null
                ? <StatBadge value={revenueRate} />
                : <Text style={styles.noDataText}>이전 데이터 없음</Text>}
            </View>
          </View>

          {/* 수확량 비교 */}
          <View style={[styles.compareRow, { marginTop: Spacing.sm }]}>
            <Text style={styles.compareLabel}>{labels.harvest}</Text>
            <View style={styles.compareRight}>
              <Text style={styles.compareValues}>
                {formatHarvest(cur.harvest)} / {formatHarvest(prev.harvest)}
              </Text>
              {harvestRate !== null
                ? <StatBadge value={harvestRate} />
                : <Text style={styles.noDataText}>이전 데이터 없음</Text>}
            </View>
          </View>
        </Card>

        {/* 잔여 재고 */}
        <Card style={styles.stockCard}>
          <Text style={[Typography.h3, { marginBottom: Spacing.md }]}>잔여 재고 (이번 기간)</Text>
          <View style={styles.stockRow}>
            <View style={styles.stockItem}>
              <Text style={styles.stockLabel}>수확량</Text>
              <Text style={[styles.stockValue, { color: Colors.primary }]}>
                {cur.harvest.toLocaleString()}kg
              </Text>
            </View>
            <Text style={styles.stockOp}>−</Text>
            <View style={styles.stockItem}>
              <Text style={styles.stockLabel}>판매량</Text>
              <Text style={[styles.stockValue, { color: Colors.primaryDark }]}>
                {cur.sales.toLocaleString()}kg
              </Text>
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

        <TouchableOpacity style={styles.breakdownBtn} onPress={() => setShowBreakdown(true)}>
          <Text style={styles.breakdownBtnText}>📊 작물·품종·사이즈별 상세 분석</Text>
          <Text style={{ color: Colors.primary, fontSize: 16 }}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.breakdownBtn, { marginTop: Spacing.sm }]} onPress={() => setShowExport(true)}>
          <Text style={styles.breakdownBtnText}>📥 Google Sheets로 월간 데이터 내보내기</Text>
          <Text style={{ color: Colors.primary, fontSize: 16 }}>›</Text>
        </TouchableOpacity>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      {user && showBreakdown && (
        <BreakdownModal
          visible={showBreakdown}
          onClose={() => setShowBreakdown(false)}
          userId={user.id}
          from={curFrom}
          to={curTo}
        />
      )}
      {user && showExport && (
        <ExportModal
          visible={showExport}
          onClose={() => setShowExport(false)}
          userId={user.id}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerGradient: { paddingBottom: Spacing.lg },
  title: { ...Typography.h2, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, marginBottom: Spacing.md },
  periodTabs: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.border,
    borderRadius: Radius.full,
    padding: 3,
  },
  periodBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: Radius.full },
  periodBtnActive: { backgroundColor: Colors.surface },
  periodText: { fontSize: 13, fontWeight: '600', color: Colors.textSub },
  periodTextActive: { color: Colors.primary },
  scroll: { flex: 1 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, gap: Spacing.xs },
  summaryCard: { width: '48%', alignItems: 'center', paddingVertical: Spacing.md },
  laborCard: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm },
  summaryLabel: { ...Typography.caption, marginBottom: 4 },
  summaryValue: { fontSize: 14, fontWeight: '800' },
  chartCard: { margin: Spacing.lg, marginTop: Spacing.sm },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  chartTypeTabs: { flexDirection: 'row', gap: 4 },
  chartTypeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chartTypeBtnActive: { backgroundColor: Colors.primaryUltraLight, borderColor: Colors.primary },
  chartTypeText: { fontSize: 12, color: Colors.textSub, fontWeight: '600' },
  chartTypeTextActive: { color: Colors.primary },
  emptyChart: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { ...Typography.body, color: Colors.textSub },
  emptySubText: { ...Typography.caption, marginTop: 4 },
  compareCard: { marginHorizontal: Spacing.lg, marginTop: 0 },
  compareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: Spacing.xs,
  },
  compareLabel: { ...Typography.body, flex: 1 },
  compareRight: { alignItems: 'flex-end', gap: 4 },
  compareValues: { fontSize: 12, color: Colors.textSub, fontWeight: '600' },
  noDataText: { ...Typography.caption, color: Colors.textLight },
  stockCard: { marginHorizontal: Spacing.lg, marginTop: Spacing.sm },
  stockRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stockItem: { flex: 1, alignItems: 'center' },
  stockLabel: { ...Typography.caption, marginBottom: 4 },
  stockValue: { fontSize: 15, fontWeight: '700' },
  stockOp: { fontSize: 18, color: Colors.textSub, marginHorizontal: 4 },
  stockDivider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.md },
  stockResultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stockResultLabel: { ...Typography.bodyBold },
  stockResultValue: { fontSize: 22, fontWeight: '800' },
  breakdownBtn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: Spacing.lg, marginTop: Spacing.sm, backgroundColor: Colors.primaryUltraLight,
    borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.primaryLight,
  },
  breakdownBtnText: { ...Typography.bodyBold, color: Colors.primaryDark },
});
