import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { BarChart } from 'react-native-gifted-charts';
import { useAuth } from '../../hooks/useAuth';
import { useStats, getDateRange } from '../../hooks/useStats';
import { supabase } from '../../lib/supabase';
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
  if (period === 'day') return stats.slice(-30);

  const map: Record<string, DailyStat> = {};
  stats.forEach((s) => {
    let key = s.date;
    if (period === 'week') {
      const d = new Date(s.date);
      d.setDate(d.getDate() - d.getDay());
      key = d.toISOString().split('T')[0];
    } else if (period === 'month') {
      key = s.date.slice(0, 7);
    } else if (period === 'year') {
      key = s.date.slice(0, 4);
    }
    if (!map[key]) map[key] = { date: key, harvest: 0, sales: 0, revenue: 0 };
    map[key].harvest += s.harvest;
    map[key].sales += s.sales;
    map[key].revenue += s.revenue;
  });
  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
}

function formatDate(date: string, period: PeriodType): string {
  if (period === 'year') return date;
  if (period === 'month') return date.slice(5);
  const d = new Date(date);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function StatisticsScreen() {
  const { user } = useAuth();
  const { stats, loading, fetchStats } = useStats(user?.id);
  const { period: paramPeriod } = useLocalSearchParams<{ period?: string }>();
  const [period, setPeriod] = useState<PeriodType>((paramPeriod as PeriodType) ?? 'day');
  const [chartType, setChartType] = useState<'harvest' | 'revenue'>('harvest');
  const [wasteTotal, setWasteTotal] = useState(0);
  const [wasteLoading, setWasteLoading] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showExport, setShowExport] = useState(false);

  useEffect(() => { fetchStats(period); }, [period, user?.id]);

  useEffect(() => {
    if (paramPeriod && ['day', 'week', 'month', 'year'].includes(paramPeriod)) {
      setPeriod(paramPeriod as PeriodType);
    }
  }, [paramPeriod]);

  useFocusEffect(
    useCallback(() => { fetchStats(period); }, [period, fetchStats])
  );

  useEffect(() => {
    if (!user) return;
    setWasteLoading(true);
    (async () => {
      const { data } = await supabase
        .from('other_records')
        .select('quantity')
        .eq('user_id', user.id);
      setWasteTotal(data?.reduce((s: any, r: any) => s + r.quantity, 0) ?? 0);
      setWasteLoading(false);
    })();
  }, [user]);

  const grouped = groupStats(stats, period);
  const chartData = grouped.slice(-12).map((s) => ({
    value: chartType === 'harvest' ? s.harvest : s.revenue / 10000,
    label: formatDate(s.date, period),
    frontColor: Colors.primary,
  }));
  const hasChartData = chartData.some((d) => d.value > 0);

  const total = grouped.reduce((acc, s) => ({
    harvest: acc.harvest + s.harvest,
    revenue: acc.revenue + s.revenue,
    sales: acc.sales + s.sales,
  }), { harvest: 0, revenue: 0, sales: 0 });

  // 가장 최근 기간 vs 그 이전 기간 비교
  const lastPeriod = grouped[grouped.length - 1];
  const prevPeriod = grouped[grouped.length - 2];

  const revenueChange = lastPeriod && prevPeriod && prevPeriod.revenue > 0
    ? ((lastPeriod.revenue - prevPeriod.revenue) / prevPeriod.revenue) * 100
    : null;

  const harvestChange = lastPeriod && prevPeriod && prevPeriod.harvest > 0
    ? ((lastPeriod.harvest - prevPeriod.harvest) / prevPeriod.harvest) * 100
    : null;

  const labels = COMPARE_LABELS[period];
  const stockRemaining = total.harvest - total.sales - wasteTotal;
  const { from: breakdownFrom, to: breakdownTo } = getDateRange(period);

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
        <View style={styles.summaryRow}>
          {[
            { label: '총 수확량', value: `${total.harvest.toLocaleString()}kg`, color: Colors.primary },
            { label: '총 판매량', value: `${total.sales.toLocaleString()}kg`, color: Colors.primaryDark },
            { label: '총 매출', value: `${(total.revenue / 10000).toFixed(0)}만원`, color: Colors.success },
          ].map((item) => (
            <Card key={item.label} style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{item.label}</Text>
              <Text style={[styles.summaryValue, { color: item.color }]}>{item.value}</Text>
            </Card>
          ))}
        </View>

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
              barWidth={chartData.length > 8 ? 18 : 28}
              spacing={chartData.length > 8 ? 6 : 12}
              roundedTop
              roundedBottom
              hideRules
              xAxisThickness={0}
              yAxisThickness={0}
              yAxisTextStyle={{ color: Colors.textSub, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: Colors.textSub, fontSize: 9 }}
              noOfSections={4}
              maxValue={Math.max(...chartData.map((d) => d.value), 1) * 1.2}
              gradientColor={Colors.primaryLight}
              isAnimated
            />
          ) : (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyText}>데이터가 없습니다</Text>
              <Text style={styles.emptySubText}>입력 탭에서 데이터를 추가하세요</Text>
            </View>
          )}
        </Card>

        <Card style={styles.compareCard}>
          <Text style={[Typography.h3, { marginBottom: Spacing.md }]}>기간 비교</Text>
          {[
            { label: labels.revenue, value: revenueChange },
            { label: labels.harvest, value: harvestChange },
          ].map((item) => (
            <View key={item.label} style={styles.compareRow}>
              <Text style={styles.compareLabel}>{item.label}</Text>
              {item.value !== null ? (
                <StatBadge value={item.value} />
              ) : (
                <Text style={styles.noDataText}>이전 데이터 없음</Text>
              )}
            </View>
          ))}
        </Card>

        <Card style={styles.stockCard}>
          <Text style={[Typography.h3, { marginBottom: Spacing.md }]}>잔여 재고</Text>
          <View style={styles.stockRow}>
            <View style={styles.stockItem}>
              <Text style={styles.stockLabel}>수확량</Text>
              <Text style={[styles.stockValue, { color: Colors.primary }]}>
                {total.harvest.toLocaleString()}kg
              </Text>
            </View>
            <Text style={styles.stockOp}>−</Text>
            <View style={styles.stockItem}>
              <Text style={styles.stockLabel}>판매량</Text>
              <Text style={[styles.stockValue, { color: Colors.primaryDark }]}>
                {total.sales.toLocaleString()}kg
              </Text>
            </View>
            <Text style={styles.stockOp}>−</Text>
            <View style={styles.stockItem}>
              <Text style={styles.stockLabel}>기타</Text>
              <Text style={[styles.stockValue, { color: Colors.danger }]}>
                {wasteLoading ? '...' : `${wasteTotal.toLocaleString()}kg`}
              </Text>
            </View>
          </View>
          <View style={styles.stockDivider} />
          <View style={styles.stockResultRow}>
            <Text style={styles.stockResultLabel}>재고</Text>
            <Text style={[styles.stockResultValue, { color: stockRemaining >= 0 ? Colors.success : Colors.danger }]}>
              {stockRemaining.toLocaleString()}kg
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

      {user && (
        <BreakdownModal
          visible={showBreakdown}
          onClose={() => setShowBreakdown(false)}
          userId={user.id}
          from={breakdownFrom}
          to={breakdownTo}
        />
      )}
      {user && (
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
  summaryRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, gap: Spacing.xs },
  summaryCard: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md },
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
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  compareLabel: { ...Typography.body },
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
