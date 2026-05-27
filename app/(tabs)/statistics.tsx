import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { useAuth } from '../../hooks/useAuth';
import { useStats } from '../../hooks/useStats';
import { Card } from '../../components/ui/Card';
import { StatBadge } from '../../components/ui/StatBadge';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';
import { PeriodType, DailyStat } from '../../types';

const PERIODS: { key: PeriodType; label: string }[] = [
  { key: 'day', label: '일별' },
  { key: 'week', label: '주별' },
  { key: 'month', label: '월별' },
  { key: 'year', label: '연별' },
];

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
  const [period, setPeriod] = useState<PeriodType>('day');
  const [chartType, setChartType] = useState<'harvest' | 'revenue'>('harvest');

  useEffect(() => { fetchStats(period); }, [period]);

  const grouped = groupStats(stats, period);
  const chartData = grouped.slice(-12).map((s) => ({
    value: chartType === 'harvest' ? s.harvest : s.revenue / 10000,
    label: formatDate(s.date, period),
    frontColor: Colors.primary,
  }));

  const total = grouped.reduce((acc, s) => ({
    harvest: acc.harvest + s.harvest,
    revenue: acc.revenue + s.revenue,
    sales: acc.sales + s.sales,
  }), { harvest: 0, revenue: 0, sales: 0 });

  const prevHalf = grouped.slice(0, Math.floor(grouped.length / 2));
  const currHalf = grouped.slice(Math.floor(grouped.length / 2));
  const prevRevenue = prevHalf.reduce((s, r) => s + r.revenue, 0);
  const currRevenue = currHalf.reduce((s, r) => s + r.revenue, 0);
  const revenueChange = prevRevenue > 0 ? ((currRevenue - prevRevenue) / prevRevenue) * 100 : 0;

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
              {['harvest', 'revenue'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.chartTypeBtn, chartType === t && styles.chartTypeBtnActive]}
                  onPress={() => setChartType(t as any)}
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
          ) : chartData.length > 0 ? (
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
            { label: '전기간 대비 매출', value: revenueChange },
            { label: '전기간 대비 수확량', value: 5.2 },
          ].map((item) => (
            <View key={item.label} style={styles.compareRow}>
              <Text style={styles.compareLabel}>{item.label}</Text>
              <StatBadge value={item.value} />
            </View>
          ))}
        </Card>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
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
  periodBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: Radius.full,
  },
  periodBtnActive: { backgroundColor: Colors.surface },
  periodText: { fontSize: 13, fontWeight: '600', color: Colors.textSub },
  periodTextActive: { color: Colors.primary },
  scroll: { flex: 1 },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.xs,
  },
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
});
