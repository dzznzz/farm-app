import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../hooks/useAuth';
import { fetchSummary } from '../../hooks/useStats';
import { supabase } from '../../lib/supabase';
import { SummaryCard } from '../../components/cards/SummaryCard';
import { Card } from '../../components/ui/Card';
import { WeatherWidget } from '../../components/widgets/WeatherWidget';
import { Colors, Spacing, Typography, Radius } from '../../constants/theme';

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState({
    totalHarvestToday: 0,
    totalRevenueToday: 0,
    totalHarvestWeek: 0,
    totalRevenueWeek: 0,
    changeRateHarvestToday: null as number | null,
    changeRateRevenueToday: null as number | null,
    changeRateHarvestWeek: null as number | null,
    changeRateRevenueWeek: null as number | null,
  });
  const [profile, setProfile] = useState<{ name: string; region: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const [s, p] = await Promise.all([
      fetchSummary(user.id),
      supabase.from('profiles').select('name, region').eq('id', user.id).single(),
    ]);
    setSummary(s);
    if (p.data) setProfile(p.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  useFocusEffect(
    useCallback(() => { if (user) load(); }, [user])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const now = new Date();
  const greeting = now.getHours() < 12 ? '좋은 아침이에요' : now.getHours() < 18 ? '안녕하세요' : '수고하셨어요';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        <LinearGradient colors={[Colors.primaryUltraLight, Colors.background]} style={styles.headerGradient}>
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>{greeting} 👋</Text>
              <Text style={styles.name}>{profile?.name ?? '농장주'}님</Text>
              <Text style={styles.region}>📍 {profile?.region ?? '지역 미설정'}</Text>
            </View>
            <View style={styles.dateBadge}>
              <Text style={styles.dateText}>
                {now.getFullYear()}년 {now.getMonth() + 1}월 {now.getDate()}일
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* 날씨 위젯 */}
        <View style={styles.section}>
          <WeatherWidget />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>오늘의 요약</Text>
          <View style={styles.cardRow}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.8} onPress={() => router.push({ pathname: '/(tabs)/statistics', params: { period: 'day' } } as any)}>
              <SummaryCard
                title="오늘 수확량"
                value={summary.totalHarvestToday.toLocaleString()}
                unit="kg"
                changeRate={summary.changeRateHarvestToday}
                compareLabel="어제 대비"
                icon="🫐"
                color={Colors.primary}
              />
            </TouchableOpacity>
            <View style={{ width: Spacing.sm }} />
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.8} onPress={() => router.push({ pathname: '/(tabs)/statistics', params: { period: 'day' } } as any)}>
              <SummaryCard
                title="오늘 매출"
                value={(summary.totalRevenueToday / 10000).toFixed(1)}
                unit="만원"
                changeRate={summary.changeRateRevenueToday}
                compareLabel="어제 대비"
                icon="💰"
                color={Colors.success}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.cardRow}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.8} onPress={() => router.push({ pathname: '/(tabs)/statistics', params: { period: 'week' } } as any)}>
              <SummaryCard
                title="이번 주 수확"
                value={summary.totalHarvestWeek.toLocaleString()}
                unit="kg"
                changeRate={summary.changeRateHarvestWeek}
                compareLabel="저번 주 대비"
                icon="📦"
              />
            </TouchableOpacity>
            <View style={{ width: Spacing.sm }} />
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.8} onPress={() => router.push({ pathname: '/(tabs)/statistics', params: { period: 'week' } } as any)}>
              <SummaryCard
                title="이번 주 매출"
                value={(summary.totalRevenueWeek / 10000).toFixed(1)}
                unit="만원"
                changeRate={summary.changeRateRevenueWeek}
                compareLabel="저번 주 대비"
                icon="📈"
                color={Colors.warning}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.section, { marginBottom: Spacing.xl }]}>
          <Text style={styles.sectionTitle}>빠른 메뉴</Text>
          <View style={styles.cardRow}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.8} onPress={() => router.push('/(tabs)/input' as any)}>
              <Card style={styles.quickCard}>
                <Text style={styles.quickEmoji}>🫐</Text>
                <Text style={styles.quickLabel}>수확 입력</Text>
              </Card>
            </TouchableOpacity>
            <View style={{ width: Spacing.sm }} />
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.8} onPress={() => router.push('/(tabs)/input' as any)}>
              <Card style={styles.quickCard}>
                <Text style={styles.quickEmoji}>💰</Text>
                <Text style={styles.quickLabel}>판매 입력</Text>
              </Card>
            </TouchableOpacity>
          </View>
          <View style={styles.cardRow}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.8} onPress={() => router.push('/(tabs)/statistics' as any)}>
              <Card style={styles.quickCard}>
                <Text style={styles.quickEmoji}>📊</Text>
                <Text style={styles.quickLabel}>통계 보기</Text>
              </Card>
            </TouchableOpacity>
            <View style={{ width: Spacing.sm }} />
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.8} onPress={() => router.push({ pathname: '/(tabs)/more', params: { page: 'chatbot' } } as any)}>
              <Card style={styles.quickCard}>
                <Text style={styles.quickEmoji}>🤖</Text>
                <Text style={styles.quickLabel}>챗봇 상담</Text>
              </Card>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  scroll: { flexGrow: 1 },
  headerGradient: {},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: Spacing.lg,
    paddingTop: Spacing.md,
  },
  greeting: { ...Typography.caption, color: Colors.textSub },
  name: { fontSize: 24, fontWeight: '800', color: Colors.text, marginTop: 2 },
  region: { ...Typography.caption, marginTop: 4, color: Colors.textSub },
  dateBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.md,
  },
  dateText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  section: { paddingHorizontal: Spacing.lg, marginTop: Spacing.lg },
  sectionTitle: { ...Typography.h3, marginBottom: Spacing.md },
  cardRow: { flexDirection: 'row', marginBottom: Spacing.sm },
  quickCard: { alignItems: 'center', paddingVertical: Spacing.md },
  quickEmoji: { fontSize: 32, marginBottom: 8 },
  quickLabel: { ...Typography.bodyBold, color: Colors.text },
});
