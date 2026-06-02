import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/ui/Card';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';
import { InputFormModal } from '../../components/modals/InputFormModal';
import { RecordDetailModal, DisplayRecord } from '../../components/modals/RecordDetailModal';

type TabType = 'harvest' | 'sales' | 'other';

const TABS: { key: TabType; label: string; color: string }[] = [
  { key: 'harvest', label: '🫐 수확', color: Colors.primary },
  { key: 'sales', label: '💰 판매', color: Colors.success },
  { key: 'other', label: '📋 기타', color: Colors.danger },
];

function addDays(dateStr: string, delta: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + delta);
  return d.toISOString().split('T')[0];
}

function formatDisplayDate(dateStr: string) {
  const d = new Date(dateStr);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

export default function InputScreen() {
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [tab, setTab] = useState<TabType>('harvest');
  const [records, setRecords] = useState<DisplayRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [farms, setFarms] = useState<{ id: string; name: string; crop_type: string; is_primary: boolean }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<DisplayRecord | null>(null);
  const [editRecord, setEditRecord] = useState<DisplayRecord | undefined>(undefined);

  useEffect(() => {
    if (!user) return;
    supabase.from('farms').select('id, name, crop_type, is_primary').eq('user_id', user.id)
      .then(({ data }) => { if (data?.length) setFarms(data); });
  }, [user]);

  const loadRecords = useCallback(async (d: string) => {
    if (!user) return;
    setLoading(true);
    const [hRes, sRes, oRes] = await Promise.all([
      supabase.from('harvest_records')
        .select('id, date, crop_type, variety, size, quantity, unit, note, created_at')
        .eq('user_id', user.id).eq('date', d).order('created_at', { ascending: false }),
      supabase.from('sales_records')
        .select('id, date, crop_type, variety, size, quantity, price_per_unit, total_revenue, commission_rate, commission_amount, extra_cost, buyer, created_at')
        .eq('user_id', user.id).eq('date', d).order('created_at', { ascending: false }),
      supabase.from('other_records')
        .select('id, date, crop_type, variety, size, quantity, unit, type, recipient, note, created_at')
        .eq('user_id', user.id).eq('date', d).order('created_at', { ascending: false }),
    ]);

    const combined: DisplayRecord[] = [
      ...(hRes.data ?? []).map((r: any): DisplayRecord => ({
        id: r.id, type: 'harvest', date: r.date,
        cropType: r.crop_type, variety: r.variety, size: r.size,
        quantity: r.quantity, unit: r.unit, note: r.note,
      })),
      ...(sRes.data ?? []).map((r: any): DisplayRecord => ({
        id: r.id, type: 'sales', date: r.date,
        cropType: r.crop_type, variety: r.variety, size: r.size,
        quantity: r.quantity, unit: null,
        pricePerUnit: r.price_per_unit, totalRevenue: r.total_revenue,
        commissionRate: r.commission_rate, commissionAmount: r.commission_amount,
        extraCost: r.extra_cost, buyer: r.buyer,
      })),
      ...(oRes.data ?? []).map((r: any): DisplayRecord => ({
        id: r.id, type: 'other', date: r.date,
        cropType: r.crop_type, variety: r.variety, size: r.size,
        quantity: r.quantity, unit: r.unit, note: r.note,
        otherSubType: r.type, recipient: r.recipient,
      })),
    ];

    setRecords(combined);
    setLoading(false);
  }, [user]);

  useFocusEffect(useCallback(() => { loadRecords(date); }, [date, loadRecords]));

  const handleDateChange = (delta: number) => {
    const next = addDays(date, delta);
    setDate(next);
    loadRecords(next);
  };

  const filtered = records.filter((r) => r.type === tab);

  const getTypeLabel = (r: DisplayRecord) => {
    if (r.type === 'harvest') return { text: '수확', color: Colors.primary, bg: Colors.primaryUltraLight };
    if (r.type === 'sales') return { text: '판매', color: Colors.success, bg: '#E8F5E9' };
    if (r.otherSubType === 'gift') return { text: '나눔', color: Colors.warning, bg: '#FFF8E1' };
    return { text: '폐기', color: Colors.danger, bg: Colors.dangerLight };
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <LinearGradient colors={[Colors.primaryUltraLight, Colors.background]} style={styles.headerGradient}>
        <Text style={styles.title}>데이터 입력</Text>

        {/* 날짜 네비게이션 */}
        <View style={styles.dateNav}>
          <TouchableOpacity style={styles.navBtn} onPress={() => handleDateChange(-1)}>
            <Text style={styles.navArrow}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setDate(today); loadRecords(today); }} style={styles.dateLabel}>
            <Text style={styles.dateText}>{formatDisplayDate(date)}</Text>
            {date === today && <Text style={styles.todayBadge}>오늘</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => handleDateChange(1)}>
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* 탭 */}
        <View style={styles.tabContainer}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabBtn, tab === t.key && styles.tabActive]}
              onPress={() => setTab(t.key)}
            >
              <Text style={[styles.tabText, tab === t.key && { color: t.color, fontWeight: '700' }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {/* 목록 */}
      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 100 }}>
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>
                {tab === 'harvest' ? '🫐' : tab === 'sales' ? '💰' : '📋'}
              </Text>
              <Text style={styles.emptyText}>
                {formatDisplayDate(date)} {tab === 'harvest' ? '수확' : tab === 'sales' ? '판매' : '기타'} 기록이 없습니다
              </Text>
              <Text style={styles.emptySubText}>아래 + 버튼으로 추가하세요</Text>
            </View>
          ) : (
            filtered.map((r) => {
              const lbl = getTypeLabel(r);
              return (
                <TouchableOpacity key={r.id} onPress={() => setSelectedRecord(r)} activeOpacity={0.75}>
                  <Card style={styles.recordCard}>
                    <View style={styles.recordRow}>
                      <View style={[styles.typeBadge, { backgroundColor: lbl.bg }]}>
                        <Text style={[styles.typeBadgeText, { color: lbl.color }]}>{lbl.text}</Text>
                      </View>
                      <View style={styles.recordInfo}>
                        <Text style={styles.recordMain} numberOfLines={1}>
                          {[r.cropType, r.variety, r.size].filter(Boolean).join(' · ')}
                        </Text>
                        <Text style={styles.recordSub}>
                          {r.quantity} {r.unit ?? 'kg'}
                          {r.type === 'sales' && r.totalRevenue
                            ? ` · ${r.totalRevenue.toLocaleString()}원`
                            : ''}
                        </Text>
                      </View>
                      <Text style={styles.chevron}>›</Text>
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowForm(true)} activeOpacity={0.85}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* 입력 폼 모달 */}
      <InputFormModal
        visible={showForm}
        tab={editRecord?.type ?? tab}
        farms={farms}
        userId={user?.id ?? ''}
        editRecord={editRecord}
        onClose={() => { setShowForm(false); setEditRecord(undefined); }}
        onSaved={() => { loadRecords(date); }}
      />

      {/* 레코드 상세/수정/삭제 모달 */}
      <RecordDetailModal
        visible={selectedRecord !== null}
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
        onDeleted={() => loadRecords(date)}
        onEdit={(r) => {
          setSelectedRecord(null);
          setEditRecord(r);
          setShowForm(true);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerGradient: { paddingBottom: Spacing.md },
  title: { ...Typography.h2, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, marginBottom: Spacing.sm },
  dateNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm,
  },
  navBtn: { padding: 8 },
  navArrow: { fontSize: 28, color: Colors.primary, fontWeight: '300' },
  dateLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateText: { fontSize: 16, fontWeight: '700', color: Colors.text },
  todayBadge: {
    fontSize: 11, fontWeight: '700', color: Colors.primary,
    backgroundColor: Colors.primaryUltraLight, paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.primaryLight,
  },
  tabContainer: {
    flexDirection: 'row', marginHorizontal: Spacing.lg,
    backgroundColor: Colors.border, borderRadius: Radius.full, padding: 3,
  },
  tabBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: Radius.full },
  tabActive: { backgroundColor: Colors.surface },
  tabText: { fontSize: 13, fontWeight: '600', color: Colors.textSub },
  scroll: { flex: 1 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { ...Typography.body, color: Colors.textSub, textAlign: 'center' },
  emptySubText: { ...Typography.caption, marginTop: 6, color: Colors.textLight },
  recordCard: { marginBottom: Spacing.sm, padding: 0, overflow: 'hidden' },
  recordRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.sm },
  typeBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  typeBadgeText: { fontSize: 12, fontWeight: '700' },
  recordInfo: { flex: 1 },
  recordMain: { ...Typography.bodyBold, marginBottom: 2 },
  recordSub: { ...Typography.caption, color: Colors.textSub },
  chevron: { fontSize: 20, color: Colors.textLight, fontWeight: '300' },
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 36 : 24,
    right: 24,
    width: 60, height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 8,
  },
  fabText: { color: '#fff', fontSize: 30, fontWeight: '300', lineHeight: 34 },
});
