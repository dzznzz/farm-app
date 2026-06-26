import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { PhIcon } from '../../components/ui/PhIcon';
import { useAuth } from '../../hooks/useAuth';
import { fetchSummary } from '../../hooks/useStats';
import { accessibleFarmIds } from '../../lib/farmAccess';
import { supabase } from '../../lib/supabase';
import { SummaryCard } from '../../components/cards/SummaryCard';
import { Card } from '../../components/ui/Card';
import { PressableScale } from '../../components/ui/PressableScale';
import { WeatherWidget } from '../../components/widgets/WeatherWidget';
import { Colors, Spacing, Typography, Radius } from '../../constants/theme';

interface Todo {
  id: string;
  text: string;
  time: string | null;
  completed: boolean;
}

function sortByTime(todos: Todo[]) {
  return [...todos].sort((a, b) => {
    if (!a.time && !b.time) return 0;
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.localeCompare(b.time);
  });
}

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const today = new Date().toISOString().split('T')[0];
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
  const [todos, setTodos] = useState<Todo[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadTodos = async () => {
    if (!user) return;
    // RLS: 본인 할 일 + 내가 속한 농장의 공유 할 일이 함께 조회된다.
    const { data } = await supabase
      .from('todos')
      .select('id, text, time, completed')
      .eq('date', today)
      .order('created_at');
    setTodos(sortByTime(data ?? []));
  };

  const load = async () => {
    if (!user) return;
    // 홈 요약은 접근 가능한 농장(소유+참여) 전체 기준으로 집계
    const ids = await accessibleFarmIds(user.id).catch(() => [] as string[]);
    const [s, p] = await Promise.all([
      fetchSummary(user.id, ids),
      supabase.from('profiles').select('name, region').eq('id', user.id).single(),
    ]);
    setSummary(s);
    if (p.data) setProfile(p.data);
    setLoading(false);
    await loadTodos();
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

  const handleToggleTodo = async (id: string, completed: boolean) => {
    await supabase.from('todos').update({ completed: !completed }).eq('id', id);
    setTodos((prev) => prev.map((t) => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const now = new Date();
  const h = now.getHours();
  const greeting =
      (h >= 5  && h < 10) ? '좋은 아침이에요'
    : (h >= 10 && h < 17) ? '오늘도 화이팅'
    : '수고하셨어요';

  const QUICK_MENUS = [
    { iconName: 'blueberry', label: '수확 입력', color: Colors.primary, weight: "duotone", onPress: () => router.push({ pathname: '/(tabs)/input', params: { tab: 'harvest' } } as any) },
    { iconName: 'money-wavy', label: '판매 입력', color: Colors.success, weight: "duotone", onPress: () => router.push({ pathname: '/(tabs)/input', params: { tab: 'sales' } } as any) },
    { iconName: 'chart-line-up', label: '통계', color: Colors.danger, weight: "fill", onPress: () => router.push('/(tabs)/statistics' as any) },
    { iconName: 'phone', label: '연락처', color: Colors.yellow, weight: "fill", onPress: () => router.push({ pathname: '/(tabs)/more', params: { page: 'contacts' } } as any) },
    { iconName: 'robot', label: '챗봇', color: Colors.text, weight: "duotone", onPress: () => router.push({ pathname: '/(tabs)/more', params: { page: 'chatbot' } } as any) },
  ];

  const doneCount = todos.filter((t) => t.completed).length;

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
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 3 }}>
                <Text style={styles.greeting}>{greeting}</Text>
                <PhIcon name="hand-waving" size={15} color={Colors.yellow} />
              </View>
              <Text style={styles.name}>{profile?.name ?? '농장주'}님</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 3 }}>
                <PhIcon name="map-pin-area" size={16} color={Colors.danger} weight="duotone" />
                <Text style={styles.region}>{profile?.region ?? '지역 미설정'}</Text>
              </View>
            </View>
            <View style={styles.dateBadge}>
              <Text style={styles.dateText}>
                {now.getFullYear()}년 {now.getMonth() + 1}월 {now.getDate()}일
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* 1. 오늘 할 일 */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.todoHeader}
            onPress={() => router.push('/(tabs)/todo' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.sectionTitle}>오늘 할 일</Text>
            <View style={styles.todoMeta}>
              {todos.length > 0 && (
                <Text style={styles.todoBadge}>{doneCount}/{todos.length}</Text>
              )}
              <Text style={styles.todoArrow}>›</Text>
            </View>
          </TouchableOpacity>
          <Card style={styles.todoCard}>
            {todos.length === 0 ? (
              <TouchableOpacity onPress={() => router.push('/(tabs)/todo' as any)}>
                <Text style={styles.todoEmpty}>아직 할 일이 등록되지 않았어요. ㅁ-ㅁ7</Text>
              </TouchableOpacity>
            ) : (
              <>
                {todos.slice(0, 5).map((todo) => (
                  <TouchableOpacity
                    key={todo.id}
                    style={styles.todoItem}
                    onPress={() => handleToggleTodo(todo.id, todo.completed)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.todoCheck, todo.completed && styles.todoCheckDone]}>
                      {todo.completed ? <Text style={styles.todoCheckmark}>✓</Text> : null}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.todoText, todo.completed && styles.todoTextDone]}>
                        {todo.text}
                      </Text>
                      {todo.time ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 }}>
                          <PhIcon name="clock" size={11} color={Colors.textSub} />
                          <Text style={styles.todoTime}>{todo.time}</Text>
                        </View>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                ))}
                {todos.length > 5 && (
                  <TouchableOpacity
                    style={styles.todoMoreBtn}
                    onPress={() => router.push('/(tabs)/todo' as any)}
                  >
                    <Text style={styles.todoMoreText}>+{todos.length - 5}개 더 보기</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </Card>
        </View>

        {/* 2. 오늘의 요약 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>오늘의 요약</Text>
          <View style={styles.cardRow}>
            <PressableScale style={{ flex: 1 }} onPress={() => router.push({ pathname: '/(tabs)/statistics', params: { period: 'day' } } as any)}>
              <SummaryCard
                title="오늘 수확량"
                value={summary.totalHarvestToday.toLocaleString()}
                unit="kg"
                changeRate={summary.changeRateHarvestToday}
                compareLabel="어제 대비"
                icon="blueberry"
                color={Colors.primary}
              />
            </PressableScale>
            <View style={{ width: Spacing.sm }} />
            <PressableScale style={{ flex: 1 }} onPress={() => router.push({ pathname: '/(tabs)/statistics', params: { period: 'day' } } as any)}>
              <SummaryCard
                title="오늘 매출"
                value={(summary.totalRevenueToday / 10000).toFixed(1)}
                unit="만원"
                changeRate={summary.changeRateRevenueToday}
                compareLabel="어제 대비"
                icon="money-wavy"
                color={Colors.success}
              />
            </PressableScale>
          </View>
          <View style={styles.cardRow}>
            <PressableScale style={{ flex: 1 }} onPress={() => router.push({ pathname: '/(tabs)/statistics', params: { period: 'week' } } as any)}>
              <SummaryCard
                title="이번 주 수확"
                value={summary.totalHarvestWeek.toLocaleString()}
                unit="kg"
                changeRate={summary.changeRateHarvestWeek}
                compareLabel="저번 주 대비"
                icon="package"
                color={Colors.danger}
              />
            </PressableScale>
            <View style={{ width: Spacing.sm }} />
            <PressableScale style={{ flex: 1 }} onPress={() => router.push({ pathname: '/(tabs)/statistics', params: { period: 'week' } } as any)}>
              <SummaryCard
                title="이번 주 매출"
                value={(summary.totalRevenueWeek / 10000).toFixed(1)}
                unit="만원"
                changeRate={summary.changeRateRevenueWeek}
                compareLabel="저번 주 대비"
                icon="trend-up"
                color={Colors.warning}
              />
            </PressableScale>
          </View>
        </View>

        {/* 3. 날씨 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>오늘 날씨</Text>
          <WeatherWidget />
        </View>

        {/* 4. 빠른 메뉴 */}
        <View style={[styles.section, { marginBottom: Spacing.xl }]}>
          <Text style={styles.sectionTitle}>빠른 메뉴</Text>
          <View style={styles.quickMenuRow}>
            {QUICK_MENUS.map((item) => (
              <PressableScale key={item.label} onPress={item.onPress} style={styles.quickBtn}>
                <Card style={styles.quickCard}>
                  <PhIcon name={item.iconName as any} size={26} color={item.color} style={{ marginBottom: 6 }} weight={item.weight as any} />
                  <Text style={styles.quickLabel} numberOfLines={1}>{item.label}</Text>
                </Card>
              </PressableScale>
            ))}
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
  sectionTitle: { ...Typography.h3, marginBottom: Spacing.sm },
  cardRow: { flexDirection: 'row', marginBottom: Spacing.sm },
  // Todo widget
  todoHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  todoMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  todoBadge: {
    fontSize: 12, fontWeight: '700', color: Colors.primary,
    backgroundColor: Colors.primaryUltraLight, paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.primaryLight,
  },
  todoArrow: { fontSize: 22, color: Colors.primary, fontWeight: '300' },
  todoCard: { padding: 0, overflow: 'hidden' },
  todoItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  todoCheck: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
  },
  todoCheckDone: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  todoCheckmark: { color: '#fff', fontSize: 12, fontWeight: '800' },
  todoText: { fontSize: 14, color: Colors.text, fontWeight: '500' },
  todoTextDone: { color: Colors.textLight, textDecorationLine: 'line-through' },
  todoTime: { fontSize: 11, color: Colors.textSub, marginTop: 2 },
  todoEmpty: {
    textAlign: 'center', padding: Spacing.lg,
    color: Colors.textSub, fontSize: 14,
  },
  todoMoreBtn: { paddingVertical: 10, alignItems: 'center' },
  todoMoreText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  // Quick menu — 5개 균등 분할 (web/native 동일)
  quickMenuRow: { flexDirection: 'row', gap: Spacing.sm },
  quickBtn: { flex: 1 },
  quickCard: { alignItems: 'center', paddingVertical: 16, paddingHorizontal: 4 },
  quickLabel: { fontSize: 11, fontWeight: '700', color: Colors.text, textAlign: 'center' },
});
