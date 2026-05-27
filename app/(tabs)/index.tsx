import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../hooks/useAuth';
import { fetchSummary } from '../../hooks/useStats';
import { supabase } from '../../lib/supabase';
import { SummaryCard } from '../../components/cards/SummaryCard';
import { Card } from '../../components/ui/Card';
import { Colors, Spacing, Typography } from '../../constants/theme';

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState({ totalHarvestToday: 0, totalHarvestWeek: 0, totalRevenueMonth: 0 });
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
                {now.getMonth() + 1}월 {now.getDate()}일
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>오늘의 요약</Text>
          <View style={styles.cardRow}>
            <SummaryCard
              title="오늘 수확량"
              value={summary.totalHarvestToday.toLocaleString()}
              unit="kg"
              changeRate={12.5}
              compareLabel="어제 대비"
              icon="🌾"
              color={Colors.primary}
            />
            <View style={{ width: Spacing.sm }} />
            <SummaryCard
              title="이번 주 수확"
              value={summary.totalHarvestWeek.toLocaleString()}
              unit="kg"
              changeRate={-3.2}
              compareLabel="저번주 대비"
              icon="📦"
            />
          </View>

          <View style={styles.cardRow}>
            <SummaryCard
              title="이번 달 매출"
              value={(summary.totalRevenueMonth / 10000).toFixed(0)}
              unit="만원"
              changeRate={8.1}
              compareLabel="저번달 대비"
              icon="💰"
              color={Colors.success}
            />
            <View style={{ width: Spacing.sm }} />
            <View style={{ flex: 1 }} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>빠른 메뉴</Text>
          <View style={styles.quickMenuGrid}>
            {[
              { label: '수확 입력', emoji: '🌾', route: '/(tabs)/input' },
              { label: '판매 입력', emoji: '💰', route: '/(tabs)/input' },
              { label: '통계 보기', emoji: '📊', route: '/(tabs)/statistics' },
              { label: '챗봇 상담', emoji: '🤖', route: '/(tabs)/more' },
            ].map((item) => (
              <TouchableOpacity
                key={item.label}
                style={styles.quickItem}
                onPress={() => router.push(item.route as any)}
              >
                <Card style={styles.quickCard}>
                  <Text style={styles.quickEmoji}>{item.emoji}</Text>
                  <Text style={styles.quickLabel}>{item.label}</Text>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.section, { marginBottom: Spacing.xl }]}>
          <Text style={styles.sectionTitle}>오늘의 농업 팁</Text>
          <Card>
            <Text style={styles.tipEmoji}>💡</Text>
            <Text style={styles.tipText}>
              수확 후 농산물은 빠른 냉각이 품질 유지의 핵심입니다.
              수확 직후 예냉 처리로 신선도를 오래 유지하세요.
            </Text>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  scroll: { flexGrow: 1 },
  headerGradient: { paddingBottom: Spacing.lg },
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
    borderRadius: 12,
  },
  dateText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  section: { paddingHorizontal: Spacing.lg, marginTop: Spacing.lg },
  sectionTitle: { ...Typography.h3, marginBottom: Spacing.md },
  cardRow: { flexDirection: 'row', marginBottom: Spacing.sm },
  quickMenuGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  quickItem: { width: '47%' },
  quickCard: { alignItems: 'center', paddingVertical: Spacing.md },
  quickEmoji: { fontSize: 32, marginBottom: 8 },
  quickLabel: { ...Typography.bodyBold, color: Colors.text },
  tipEmoji: { fontSize: 24, marginBottom: 8 },
  tipText: { ...Typography.body, color: Colors.textSub, lineHeight: 22 },
});
