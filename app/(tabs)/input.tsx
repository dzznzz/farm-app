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

// ── Grouping types & logic ──
type SizeRow = { size: string; quantity: number; unit: string; revenue?: number; ids: string[] };
type VarietyGroup = { variety: string; sizes: SizeRow[] };
type FarmCropGroup = {
  farmId: string | null;
  farmName: string | null;
  cropType: string;
  otherSubType?: string;
  varieties: VarietyGroup[];
  allRecords: DisplayRecord[];
};

function groupByFarmCrop(records: DisplayRecord[], recordType: TabType): FarmCropGroup[] {
  const groups: FarmCropGroup[] = [];
  for (const r of records) {
    const subType = recordType === 'other' ? (r.otherSubType ?? '') : '';
    const gKey = `${r.farmId ?? ''}::${r.cropType ?? ''}::${subType}`;
    let group = groups.find(g =>
      `${g.farmId ?? ''}::${g.cropType}::${g.otherSubType ?? ''}` === gKey
    );
    if (!group) {
      group = {
        farmId: r.farmId ?? null,
        farmName: r.farmName ?? null,
        cropType: r.cropType ?? '',
        otherSubType: subType || undefined,
        varieties: [],
        allRecords: [],
      };
      groups.push(group);
    }
    group.allRecords.push(r);
    const variety = r.variety ?? '';
    let vg = group.varieties.find(v => v.variety === variety);
    if (!vg) { vg = { variety, sizes: [] }; group.varieties.push(vg); }
    const size = r.size ?? '';
    let sr = vg.sizes.find(s => s.size === size);
    if (!sr) {
      sr = { size, quantity: 0, unit: r.unit ?? 'kg', ids: [] };
      if (r.type === 'sales') sr.revenue = 0;
      vg.sizes.push(sr);
    }
    sr.quantity += r.quantity;
    if (r.type === 'sales' && r.totalRevenue) sr.revenue = (sr.revenue ?? 0) + r.totalRevenue;
    sr.ids.push(r.id);
  }
  return groups;
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
  const [groupEditRecords, setGroupEditRecords] = useState<DisplayRecord[] | undefined>(undefined);

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
        .select('id, date, farm_id, crop_type, variety, size, quantity, unit, note, created_at')
        .eq('user_id', user.id).eq('date', d).order('created_at', { ascending: false }),
      supabase.from('sales_records')
        .select('id, date, farm_id, crop_type, variety, size, quantity, price_per_unit, total_revenue, commission_rate, commission_amount, extra_cost, buyer, created_at')
        .eq('user_id', user.id).eq('date', d).order('created_at', { ascending: false }),
      supabase.from('other_records')
        .select('id, date, farm_id, crop_type, variety, size, quantity, unit, type, recipient, extra_cost, note, created_at')
        .eq('user_id', user.id).eq('date', d).order('created_at', { ascending: false }),
    ]);

    const getFarmName = (farmId: string | null) =>
      farms.find(f => f.id === farmId)?.name ?? null;

    const combined: DisplayRecord[] = [
      ...(hRes.data ?? []).map((r: any): DisplayRecord => ({
        id: r.id, type: 'harvest', date: r.date,
        farmId: r.farm_id, farmName: getFarmName(r.farm_id),
        cropType: r.crop_type, variety: r.variety, size: r.size,
        quantity: r.quantity, unit: r.unit, note: r.note,
      })),
      ...(sRes.data ?? []).map((r: any): DisplayRecord => ({
        id: r.id, type: 'sales', date: r.date,
        farmId: r.farm_id, farmName: getFarmName(r.farm_id),
        cropType: r.crop_type, variety: r.variety, size: r.size,
        quantity: r.quantity, unit: null,
        pricePerUnit: r.price_per_unit, totalRevenue: r.total_revenue,
        commissionRate: r.commission_rate, commissionAmount: r.commission_amount,
        extraCost: r.extra_cost, buyer: r.buyer,
      })),
      ...(oRes.data ?? []).map((r: any): DisplayRecord => ({
        id: r.id, type: 'other', date: r.date,
        farmId: r.farm_id, farmName: getFarmName(r.farm_id),
        cropType: r.crop_type, variety: r.variety, size: r.size,
        quantity: r.quantity, unit: r.unit, note: r.note,
        otherSubType: r.type, recipient: r.recipient,
        extraCost: r.extra_cost,
      })),
    ];

    setRecords(combined);
    setLoading(false);
  }, [user, farms]);

  useFocusEffect(useCallback(() => { loadRecords(date); }, [date, loadRecords]));

  const handleDateChange = (delta: number) => {
    const next = addDays(date, delta);
    setDate(next);
    loadRecords(next);
  };

  const filtered = records.filter((r) => r.type === tab);
  const grouped = groupByFarmCrop(filtered, tab);

  const openGroupEdit = (group: FarmCropGroup) => {
    setGroupEditRecords(group.allRecords);
    setEditRecord(undefined);
    setShowForm(true);
  };

  const otherTypeLabel = (subType?: string) =>
    subType === 'gift' ? '나눔' : subType === 'waste' ? '폐기' : '';

  const otherTypeColor = (subType?: string) =>
    subType === 'gift' ? Colors.warning : Colors.danger;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={[Colors.primaryUltraLight, Colors.background]} style={styles.headerGradient}>
        <Text style={styles.title}>데이터 입력</Text>

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

        <View style={styles.tabContainer}>
          {TABS.map((t) => (
            <TouchableOpacity key={t.key}
              style={[styles.tabBtn, tab === t.key && styles.tabActive]}
              onPress={() => setTab(t.key)}>
              <Text style={[styles.tabText, tab === t.key && { color: t.color, fontWeight: '700' }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 100 }}>
          {grouped.length === 0 ? (
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
            grouped.map((group, gi) => (
              <TouchableOpacity
                key={`${group.farmId}-${group.cropType}-${group.otherSubType ?? ''}-${gi}`}
                onPress={() => openGroupEdit(group)}
                activeOpacity={0.75}
              >
                <Card style={styles.groupCard}>
                  {/* 카드 헤더 */}
                  <View style={styles.groupHeader}>
                    {group.farmName && (
                      <View style={styles.farmBadge}>
                        <Text style={styles.farmBadgeText}>{group.farmName}</Text>
                      </View>
                    )}
                    {tab === 'other' && group.otherSubType && (
                      <View style={[styles.typeBadge, { backgroundColor: otherTypeColor(group.otherSubType) + '22' }]}>
                        <Text style={[styles.typeBadgeText, { color: otherTypeColor(group.otherSubType) }]}>
                          {otherTypeLabel(group.otherSubType)}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.groupCrop}>{group.cropType || '(작물 미입력)'}</Text>
                    <Text style={styles.editHint}>수정 ›</Text>
                  </View>

                  <View style={styles.divider} />

                  {/* 품종 그룹 */}
                  {group.varieties.map((vg, vi) => (
                    <View key={`${vg.variety}-${vi}`}
                      style={[styles.varietyBlock, vi > 0 && styles.varietyBlockSep]}>
                      {vg.variety !== '' && (
                        <Text style={styles.varietyLabel}>{vg.variety}</Text>
                      )}
                      {vg.sizes.map((sr) => (
                        <View key={sr.size} style={styles.sizeRow}>
                          <Text style={styles.sizeLabel}>{sr.size || '—'}</Text>
                          <View style={styles.sizeRight}>
                            {tab === 'sales' && (sr.revenue ?? 0) > 0 && (
                              <Text style={styles.sizeRevenue}>
                                {sr.revenue!.toLocaleString()}원
                              </Text>
                            )}
                            <Text style={styles.sizeQty}>
                              {Number.isInteger(sr.quantity)
                                ? sr.quantity
                                : parseFloat(sr.quantity.toFixed(2))}{sr.unit}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  ))}
                </Card>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => {
        setGroupEditRecords(undefined);
        setEditRecord(undefined);
        setShowForm(true);
      }} activeOpacity={0.85}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <InputFormModal
        visible={showForm}
        tab={tab}
        farms={farms}
        userId={user?.id ?? ''}
        initialDate={date}
        editRecord={editRecord}
        groupEditRecords={groupEditRecords}
        onClose={() => { setShowForm(false); setEditRecord(undefined); setGroupEditRecords(undefined); }}
        onSaved={() => { loadRecords(date); }}
      />

      {/* 개별 레코드 상세 (RecordDetailModal은 그룹 수정 폼에서 대체됨, 필요 시 유지) */}
      <RecordDetailModal
        visible={selectedRecord !== null}
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
        onDeleted={() => loadRecords(date)}
        onEdit={(r) => {
          setSelectedRecord(null);
          setEditRecord(r);
          setGroupEditRecords(undefined);
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
  // Group card
  groupCard: { marginBottom: Spacing.md, padding: 0, overflow: 'hidden' },
  groupHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: Spacing.md, paddingBottom: Spacing.sm,
  },
  farmBadge: {
    backgroundColor: Colors.primaryUltraLight, borderRadius: Radius.full,
    paddingHorizontal: 9, paddingVertical: 3,
    borderWidth: 1, borderColor: Colors.primaryLight,
  },
  farmBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.primaryDark },
  typeBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full,
  },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },
  groupCrop: { fontSize: 16, fontWeight: '800', color: Colors.text, flex: 1 },
  editHint: { fontSize: 12, color: Colors.textLight },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.md },
  varietyBlock: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: 4 },
  varietyBlockSep: { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 2 },
  varietyLabel: {
    fontSize: 12, fontWeight: '700', color: Colors.textSub,
    marginBottom: 2, marginLeft: 4,
  },
  sizeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: Colors.background,
  },
  sizeLabel: { fontSize: 15, color: Colors.text, flex: 1, marginLeft: 6, fontWeight: '500' },
  sizeRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sizeRevenue: { fontSize: 13, color: Colors.success, fontWeight: '600' },
  sizeQty: { fontSize: 17, fontWeight: '800', color: Colors.primaryDark, minWidth: 60, textAlign: 'right' },
  // FAB
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 36 : 24,
    right: 24,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 8,
  },
  fabText: { color: '#fff', fontSize: 30, fontWeight: '300', lineHeight: 34 },
});
