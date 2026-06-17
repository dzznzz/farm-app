import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  ActivityIndicator, Platform, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { PhIcon } from '../../components/ui/PhIcon';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/ui/Card';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';
import { InputFormModal } from '../../components/modals/InputFormModal';
import { RecordDetailModal, DisplayRecord } from '../../components/modals/RecordDetailModal';
import { CalendarModal } from '../../components/modals/CalendarModal';

type TabType = 'harvest' | 'sales' | 'other';

const TABS: { key: TabType; label: string; icon: string; color: string }[] = [
  { key: 'harvest', label: '수확', icon: 'blueberry', color: Colors.primary },
  { key: 'sales', label: '판매', icon: 'money-wavy', color: Colors.success },
  { key: 'other', label: '기타', icon: 'clipboard-text', color: Colors.danger },
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

// ── 판매 묶음 그룹 (buyer + saleType 기준) ──
type SaleGroup = {
  farmId: string | null; farmName: string | null; cropType: string;
  saleType?: string | null; buyer?: string | null;
  records: DisplayRecord[];
  totalQty: number; totalRevenue: number; totalCommission: number; totalExtra: number;
};

function groupSalesRecords(records: DisplayRecord[]): SaleGroup[] {
  const groups: SaleGroup[] = [];
  for (const r of records) {
    const gKey = `${r.farmId ?? ''}::${r.cropType ?? ''}::${r.buyer ?? ''}::${r.saleType ?? ''}`;
    let group = groups.find(g =>
      `${g.farmId ?? ''}::${g.cropType}::${g.buyer ?? ''}::${g.saleType ?? ''}` === gKey
    );
    if (!group) {
      group = {
        farmId: r.farmId ?? null, farmName: r.farmName ?? null,
        cropType: r.cropType ?? '', saleType: r.saleType, buyer: r.buyer,
        records: [], totalQty: 0, totalRevenue: 0, totalCommission: 0, totalExtra: 0,
      };
      groups.push(group);
    }
    group.records.push(r);
    group.totalQty += r.quantity;
    group.totalRevenue += r.totalRevenue ?? 0;
    group.totalCommission += r.commissionAmount ?? 0;
    group.totalExtra += r.extraCost ?? 0;
  }
  return groups;
}

// ── Grouping types & logic ──
type SizeRow = { size: string; quantity: number; unit: string; revenue?: number; extraCost?: number; ids: string[] };
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
    if (r.type === 'other' && r.extraCost) sr.extraCost = (sr.extraCost ?? 0) + r.extraCost;
    sr.ids.push(r.id);
  }
  return groups;
}

export default function InputScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ tab?: string }>();
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [tab, setTab] = useState<TabType>('harvest');

  useEffect(() => {
    if (params.tab === 'harvest' || params.tab === 'sales' || params.tab === 'other') {
      setTab(params.tab);
    }
  }, [params.tab]);
  const [records, setRecords] = useState<DisplayRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [farms, setFarms] = useState<{ id: string; name: string; crop_type: string; is_primary: boolean }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<DisplayRecord | null>(null);
  const [editRecord, setEditRecord] = useState<DisplayRecord | undefined>(undefined);
  const [groupEditRecords, setGroupEditRecords] = useState<DisplayRecord[] | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<DisplayRecord[] | null>(null);
  const [expandedVarieties, setExpandedVarieties] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    supabase.from('farms').select('id, name, crop_type, is_primary').eq('user_id', user.id)
      .then(({ data }) => { if (data?.length) setFarms(data); });
  }, [user]);

  const loadRecords = useCallback(async (d: string) => {
    if (!user) return;
    setLoading(true);
    const [hRes, sRes, oRes, hnRes, onRes] = await Promise.all([
      supabase.from('harvest_records')
        .select('id, date, farm_id, crop_type, variety, size, quantity, unit, created_at')
        .eq('user_id', user.id).eq('date', d).order('created_at', { ascending: false }),
      supabase.from('sales_records')
        .select('id, date, farm_id, crop_type, variety, size, quantity, price_per_unit, total_revenue, commission_rate, commission_amount, extra_cost, buyer, sale_type, created_at')
        .eq('user_id', user.id).eq('date', d).order('created_at', { ascending: false }),
      supabase.from('other_records')
        .select('id, date, farm_id, crop_type, variety, size, quantity, unit, type, recipient, extra_cost, created_at')
        .eq('user_id', user.id).eq('date', d).order('created_at', { ascending: false }),
      supabase.from('harvest_notes')
        .select('farm_id, crop_type, note')
        .eq('user_id', user.id).eq('date', d),
      supabase.from('other_notes')
        .select('farm_id, crop_type, note')
        .eq('user_id', user.id).eq('date', d),
    ]);

    const getNote = (data: any[], farmId: string | null, cropType: string | null) =>
      data.find(n => (n.farm_id ?? null) === farmId && (n.crop_type ?? null) === cropType)?.note ?? null;

    const getFarmName = (farmId: string | null) =>
      farms.find(f => f.id === farmId)?.name ?? null;

    const combined: DisplayRecord[] = [
      ...(hRes.data ?? []).map((r: any): DisplayRecord => ({
        id: r.id, type: 'harvest', date: r.date,
        farmId: r.farm_id, farmName: getFarmName(r.farm_id),
        cropType: r.crop_type, variety: r.variety, size: r.size,
        quantity: r.quantity, unit: r.unit,
        note: getNote(hnRes.data ?? [], r.farm_id ?? null, r.crop_type ?? null),
      })),
      ...(sRes.data ?? []).map((r: any): DisplayRecord => ({
        id: r.id, type: 'sales', date: r.date,
        farmId: r.farm_id, farmName: getFarmName(r.farm_id),
        cropType: r.crop_type, variety: r.variety, size: r.size,
        quantity: r.quantity, unit: null,
        pricePerUnit: r.price_per_unit, totalRevenue: r.total_revenue,
        commissionRate: r.commission_rate, commissionAmount: r.commission_amount,
        extraCost: r.extra_cost, buyer: r.buyer, saleType: r.sale_type,
      })),
      ...(oRes.data ?? []).map((r: any): DisplayRecord => ({
        id: r.id, type: 'other', date: r.date,
        farmId: r.farm_id, farmName: getFarmName(r.farm_id),
        cropType: r.crop_type, variety: r.variety, size: r.size,
        quantity: r.quantity, unit: r.unit,
        note: getNote(onRes.data ?? [], r.farm_id ?? null, r.crop_type ?? null),
        otherSubType: r.type, recipient: r.recipient,
        extraCost: r.extra_cost,
      })),
    ];

    setRecords(combined);
    setLoading(false);
  }, [user, farms]);

  useFocusEffect(useCallback(() => { loadRecords(date); }, [date, loadRecords]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await loadRecords(date); }
    finally { setRefreshing(false); }
  }, [loadRecords, date]);

  const handleDateChange = (delta: number) => {
    const next = addDays(date, delta);
    setDate(next);
    loadRecords(next);
  };

  const filtered = records.filter((r) => r.type === tab);
  const grouped = groupByFarmCrop(filtered, tab);
  const saleGroups = groupSalesRecords(filtered);

  const openGroupEdit = (records: DisplayRecord[]) => {
    setGroupEditRecords(records);
    setEditRecord(undefined);
    setShowForm(true);
  };

  const handleDeleteGroup = (records: DisplayRecord[]) => {
    setDeleteTarget(records);
  };

  const toggleVariety = (key: string) => {
    setExpandedVarieties(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const type = deleteTarget[0]?.type;
    const table = type === 'harvest' ? 'harvest_records'
      : type === 'sales' ? 'sales_records' : 'other_records';
    await supabase.from(table).delete().in('id', deleteTarget.map(r => r.id));
    setDeleteTarget(null);
    loadRecords(date);
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
          <TouchableOpacity onPress={() => setShowCalendar(true)} style={styles.dateLabel}>
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <PhIcon name={t.icon as any} size={14} color={tab === t.key ? t.color : Colors.textSub} />
                <Text style={[styles.tabText, tab === t.key && { color: t.color, fontWeight: '700' }]}>
                  {t.label}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {loading && !refreshing ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
              colors={[Colors.primary]} tintColor={Colors.primary} />
          }
        >
          {(tab === 'sales' ? saleGroups.length === 0 : grouped.length === 0) ? (
            <View style={styles.empty}>
              <PhIcon
                name={tab === 'harvest' ? 'blueberry' : tab === 'sales' ? 'money-wavy' : 'clipboard-text'}
                size={48}
                color={Colors.textLight}
                style={{ marginBottom: 12 }}
              />
              <Text style={styles.emptyText}>
                {formatDisplayDate(date)} {tab === 'harvest' ? '수확' : tab === 'sales' ? '판매' : '기타'} 기록이 없습니다
              </Text>
              <Text style={styles.emptySubText}>아래 + 버튼으로 추가하세요</Text>
            </View>
          ) : tab === 'sales' ? (
            /* ── 판매: 묶음 단위 카드 ── */
            saleGroups.map((sg, gi) => {
              const netRev = sg.totalRevenue - sg.totalCommission - sg.totalExtra;
              // 품종별 그룹
              const varietyGroups: { variety: string; records: DisplayRecord[]; totalQty: number; totalRevenue: number }[] = [];
              for (const r of sg.records) {
                const v = r.variety ?? '';
                let vg = varietyGroups.find(x => x.variety === v);
                if (!vg) { vg = { variety: v, records: [], totalQty: 0, totalRevenue: 0 }; varietyGroups.push(vg); }
                vg.records.push(r);
                vg.totalQty += r.quantity;
                vg.totalRevenue += (r.totalRevenue ?? 0);
              }
              return (
                <Card key={gi} style={styles.groupCard}>
                    {/* 헤더 */}
                    <View style={styles.groupHeader}>
                      {sg.farmName && (
                        <View style={styles.farmBadge}>
                          <Text style={styles.farmBadgeText}>{sg.farmName}</Text>
                        </View>
                      )}
                      {sg.saleType && (
                        <View style={styles.saleTypeBadge}>
                          <Text style={styles.saleTypeBadgeText}>{sg.saleType}</Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }} />
                      <TouchableOpacity onPress={() => openGroupEdit(sg.records)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={styles.editHint}>수정 ›</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteGroup(sg.records)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <PhIcon name="trash" size={18} color={Colors.danger} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.groupSubHeader}>
                      <Text style={styles.groupCrop}>{sg.cropType || '(작물 미입력)'}</Text>
                      {sg.buyer && <Text style={styles.buyerText}>{sg.buyer}</Text>}
                    </View>

                    <View style={styles.divider} />

                    {/* 품종별 행 */}
                    {varietyGroups.map((vg, vi) => {
                      const vKey = `${gi}-${vg.variety}`;
                      const isOpen = expandedVarieties.has(vKey);
                      return (
                        <View key={vKey}>
                          <TouchableOpacity
                            style={[styles.saleVarietyRow, vi > 0 && styles.saleVarietyRowSep]}
                            onPress={() => toggleVariety(vKey)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.saleVarietyLabel}>{vg.variety || '—'}</Text>
                            <Text style={styles.saleVarietyQty}>{vg.totalQty}kg</Text>
                            <Text style={styles.saleVarietyRev}>{vg.totalRevenue.toLocaleString()}원</Text>
                            <Text style={styles.saleVarietyArrow}>{isOpen ? '▲' : '▼'}</Text>
                          </TouchableOpacity>
                          {isOpen && vg.records.map((r) => (
                            <View key={r.id} style={styles.saleItemRow}>
                              <Text style={styles.saleItemLabel} numberOfLines={1}>
                                {r.size || '—'}
                              </Text>
                              <Text style={styles.saleItemQty}>{r.quantity}kg</Text>
                              {r.pricePerUnit != null && (
                                <Text style={styles.saleItemPrice}>@{r.pricePerUnit.toLocaleString()}</Text>
                              )}
                              <Text style={styles.saleItemRev}>{(r.totalRevenue ?? 0).toLocaleString()}원</Text>
                            </View>
                          ))}
                        </View>
                      );
                    })}

                    <View style={styles.saleTotalRow}>
                      <Text style={styles.saleTotalLabel}>
                        합계 {sg.totalQty}kg
                      </Text>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.saleTotalRev}>{sg.totalRevenue.toLocaleString()}원</Text>
                        {sg.totalCommission > 0 && (
                          <Text style={styles.saleCommissionText}>수수료 {sg.totalCommission.toLocaleString()}원</Text>
                        )}
                        {(sg.totalCommission > 0 || sg.totalExtra > 0) && (
                          <Text style={styles.saleNetRev}>순 {netRev.toLocaleString()}원</Text>
                        )}
                      </View>
                    </View>
                </Card>
              );
            })
          ) : (
            /* ── 수확/기타: 농장+작물 그룹 카드 ── */
            grouped.map((group, gi) => {
              const grandTotal = group.varieties.reduce((sum, vg) => sum + vg.sizes.reduce((s2, sr) => s2 + sr.quantity, 0), 0);
              const grandTotalUnit = group.varieties[0]?.sizes[0]?.unit ?? 'kg';
              const totalItems = group.varieties.reduce((sum, vg) => sum + vg.sizes.length, 0);
              return (
                <Card
                  key={`${group.farmId}-${group.cropType}-${group.otherSubType ?? ''}-${gi}`}
                  style={styles.groupCard}
                >
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
                      <View style={{ flex: 1 }} />
                      <TouchableOpacity onPress={() => openGroupEdit(group.allRecords)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={styles.editHint}>수정 ›</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteGroup(group.allRecords)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <PhIcon name="trash" size={18} color={Colors.danger} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.groupSubHeader}>
                      <Text style={styles.groupCrop}>{group.cropType || '(작물 미입력)'}</Text>
                      {tab === 'other' && (() => {
                        const recipients = Array.from(new Set(group.allRecords.map(r => r.recipient).filter(Boolean)));
                        if (recipients.length === 0) return null;
                        return <Text style={styles.buyerText}>받는 분: {recipients.join(', ')}</Text>;
                      })()}
                    </View>

                    <View style={styles.divider} />

                    {group.varieties.map((vg, vi) => {
                      const varietyTotal = vg.sizes.reduce((sum, sr) => sum + sr.quantity, 0);
                      const varietyUnit = vg.sizes[0]?.unit ?? 'kg';
                      return (
                        <View key={`${vg.variety}-${vi}`}
                          style={[styles.varietyBlock, vi > 0 && styles.varietyBlockSep]}>
                          {vg.variety !== '' && <Text style={styles.varietyLabel}>{vg.variety}</Text>}
                          {vg.sizes.map((sr) => (
                            <View key={sr.size} style={styles.sizeRow}>
                              <Text style={styles.sizeLabel}>{sr.size || '—'}</Text>
                              <Text style={styles.sizeQty}>
                                {Number.isInteger(sr.quantity) ? sr.quantity : parseFloat(sr.quantity.toFixed(2))}{sr.unit}
                              </Text>
                            </View>
                          ))}
                          {(vg.sizes.length > 1 || tab === 'other') && (
                            <View style={styles.varietySubtotalRow}>
                              <Text style={styles.varietySubtotalLabel}>{vg.variety || ''} 소계</Text>
                              <Text style={styles.varietySubtotalValue}>
                                {Number.isInteger(varietyTotal) ? varietyTotal : parseFloat(varietyTotal.toFixed(2))}{varietyUnit}
                              </Text>
                            </View>
                          )}
                          {tab === 'other' && (() => {
                            const varietyExtraCost = vg.sizes.reduce((s, sr) => s + (sr.extraCost ?? 0), 0);
                            if (varietyExtraCost <= 0) return null;
                            return (
                              <View style={[styles.varietySubtotalRow, { backgroundColor: Colors.warningLight, marginTop: 2 }]}>
                                <Text style={[styles.varietySubtotalLabel, { color: Colors.warning }]}>부수비용</Text>
                                <Text style={[styles.varietySubtotalValue, { color: Colors.warning }]}>
                                  {varietyExtraCost.toLocaleString()}원
                                </Text>
                              </View>
                            );
                          })()}
                        </View>
                      );
                    })}

                    {(totalItems > 1 || tab === 'other') && (
                      <View style={styles.grandTotalRow}>
                        <Text style={styles.grandTotalLabel}>전체 합계</Text>
                        <Text style={styles.grandTotalValue}>
                          {Number.isInteger(grandTotal) ? grandTotal : parseFloat(grandTotal.toFixed(2))}{grandTotalUnit}
                        </Text>
                      </View>
                    )}
                    {tab === 'other' && (() => {
                      const totalExtraCost = group.allRecords.reduce((s, r) => s + (r.extraCost ?? 0), 0);
                      if (totalExtraCost <= 0) return null;
                      return (
                        <View style={[styles.grandTotalRow, { backgroundColor: Colors.warning }]}>
                          <Text style={styles.grandTotalLabel}>부수비용 합계</Text>
                          <Text style={styles.grandTotalValue}>{totalExtraCost.toLocaleString()}원</Text>
                        </View>
                      );
                    })()}
                </Card>
              );
            })
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

      <CalendarModal
        visible={showCalendar}
        value={date}
        onSelect={(d) => { setDate(d); loadRecords(d); setShowCalendar(false); }}
        onClose={() => setShowCalendar(false)}
      />

      <Modal visible={deleteTarget !== null} transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <View style={styles.deleteOverlay}>
          <View style={styles.deleteDialog}>
            <Text style={styles.deleteDialogTitle}>삭제 확인</Text>
            <Text style={styles.deleteDialogMsg}>
              {deleteTarget?.length ?? 0}개 항목을 삭제합니다.{'\n'}복구할 수 없습니다.
            </Text>
            <View style={styles.deleteDialogBtns}>
              <TouchableOpacity style={styles.deleteCancelBtn} onPress={() => setDeleteTarget(null)}>
                <Text style={styles.deleteCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteConfirmBtn} onPress={confirmDelete}>
                <Text style={styles.deleteConfirmText}>삭제</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  emptyEmoji: {},
  emptyText: { ...Typography.body, color: Colors.textSub, textAlign: 'center' },
  emptySubText: { ...Typography.caption, marginTop: 6, color: Colors.textLight },
  // Group card
  groupCard: { marginBottom: Spacing.md, padding: 0, elevation: 0 },
  groupHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: Spacing.md, paddingBottom: Spacing.sm,
  },
  groupSubHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    padding: Spacing.md, paddingBottom: Spacing.sm, paddingTop: Spacing.sm,
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
  groupCrop: { fontSize: 16, fontWeight: '800', color: Colors.text },
  editHint: { fontSize: 12, color: Colors.textLight },
  deleteGroupBtn: { fontSize: 16 },
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
  // 판매 카드
  saleTypeBadge: {
    backgroundColor: Colors.success + '22', borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  saleTypeBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.success },
  buyerText: { fontSize: 12, color: Colors.textSub, fontWeight: '600' },
  saleItemRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 7, paddingHorizontal: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.background,
  },
  saleItemLabel: { flex: 1, fontSize: 13, color: Colors.text, fontWeight: '500' },
  saleItemQty: { fontSize: 13, color: Colors.textSub, marginRight: 6, minWidth: 36, textAlign: 'right' },
  saleItemPrice: { fontSize: 12, color: Colors.textLight, marginRight: 8 },
  saleItemRev: { fontSize: 13, fontWeight: '700', color: Colors.primaryDark, minWidth: 70, textAlign: 'right' },
  saleTotalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    backgroundColor: Colors.primaryUltraLight, borderTopWidth: 1, borderTopColor: Colors.primaryLight,
  },
  saleTotalLabel: { fontSize: 13, fontWeight: '700', color: Colors.primaryDark },
  saleTotalRev: { fontSize: 14, color: Colors.success },
  saleCommissionText: { fontSize: 11, color: Colors.textSub, marginTop: 1 },
  saleNetRev: { fontSize: 13, fontWeight: '800', color: Colors.primaryDark, marginTop: 2 },
  saleVarietyRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: Spacing.md,
  },
  saleVarietyRowSep: { borderTopWidth: 1, borderTopColor: Colors.border },
  saleVarietyLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.text },
  saleVarietyQty: { fontSize: 13, color: Colors.textSub, marginRight: 6 },
  saleVarietyRev: { fontSize: 14, fontWeight: '700', color: Colors.primaryDark, minWidth: 70, textAlign: 'right' },
  saleVarietyArrow: { fontSize: 10, color: Colors.textLight, marginLeft: 8 },
  sizeQty: { fontSize: 17, fontWeight: '800', color: Colors.primaryDark, minWidth: 60, textAlign: 'right' },
  varietySubtotalRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 7, paddingHorizontal: 4, marginTop: 4,
    backgroundColor: Colors.primaryUltraLight, borderRadius: Radius.sm,
  },
  varietySubtotalLabel: { fontSize: 12, fontWeight: '700', color: Colors.primaryDark },
  varietySubtotalValue: { fontSize: 14, fontWeight: '800', color: Colors.primaryDark },
  grandTotalRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary,
    borderTopWidth: 1, borderTopColor: Colors.primaryDark,
  },
  grandTotalLabel: { fontSize: 13, fontWeight: '800', color: '#fff' },
  grandTotalValue: { fontSize: 16, fontWeight: '800', color: '#fff' },
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
  deleteOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  deleteDialog: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: Spacing.xl, width: 300,
  },
  deleteDialogTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },
  deleteDialogMsg: { fontSize: 14, color: Colors.textSub, lineHeight: 22, marginBottom: Spacing.lg },
  deleteDialogBtns: { flexDirection: 'row', gap: 10 },
  deleteCancelBtn: {
    flex: 1, backgroundColor: Colors.primaryUltraLight,
    borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center',
  },
  deleteCancelText: { fontSize: 15, fontWeight: '600', color: Colors.primaryDark },
  deleteConfirmBtn: {
    flex: 1, backgroundColor: Colors.danger,
    borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center',
  },
  deleteConfirmText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
