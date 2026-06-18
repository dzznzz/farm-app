import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity,
  Modal, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { listCodes, listVarietiesByCropName, listSizesByCropName } from '../../lib/commonCode';
import { CalendarModal } from './CalendarModal';
import { PhIcon } from '../ui/PhIcon';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';
import { DisplayRecord } from './RecordDetailModal';

type TabType = 'harvest' | 'sales' | 'other';
type OtherType = 'gift' | 'waste';

interface Farm { id: string; name: string; crop_type: string; is_primary?: boolean }
interface Entry {
  variety: string;
  size: string;
  quantity: string;
  unit: string;
  price?: string;
  existingId?: string; // 기존 레코드 ID (그룹 수정 시)
}
interface WorkerEntry { name: string; hours: string; cost: string }
interface SizeInfo { name: string; range: string }

interface Props {
  visible: boolean;
  tab: TabType;
  farms: Farm[];
  userId: string;
  initialDate?: string;
  onClose: () => void;
  onSaved: () => void;
  editRecord?: DisplayRecord;
  groupEditRecords?: DisplayRecord[]; // 그룹 전체 수정 모드
}

const BLUEBERRY_SIZES = ['대', '특', '왕특', '왕왕특'];
const DEFAULT_UNITS = ['kg', '박스'];

const SALE_TYPE_OPTIONS = ['온라인', '오프라인', '지인판매', '기타'];

const MINIMUM_HOURLY_WAGE = 10320; // 2026년 최저시급 (원/h)

function getStepIds(tab: TabType): string[] {
  if (tab === 'harvest') return ['date', 'farm', 'crop', 'entries'];
  if (tab === 'sales')   return ['date', 'farm', 'saleType', 'crop', 'entries'];
  return                        ['date', 'farm', 'otherType', 'crop', 'entries'];
}

function getStepLabel(id: string, tab: TabType): string {
  const map: Record<string, string> = {
    date: '날짜', farm: '농장', crop: '작물', otherType: '구분', saleType: '판매 유형',
    entries: tab === 'harvest' ? '수확 내역' : tab === 'sales' ? '판매 내역' : '수량 내역',
  };
  return map[id] ?? id;
}

// ── EntryDetailModal: 품종·사이즈·수량·단가를 한 번에 입력하는 상세 모달 ──
interface EntryDetailModalProps {
  visible: boolean;
  varieties: string[];
  sizeOptions: string[];
  sizeInfoData: SizeInfo[];
  unitOptions: string[];
  isSales: boolean;
  onAdd: (entry: Entry) => void;
  onClose: () => void;
}

function EntryDetailModal({
  visible, varieties, sizeOptions, sizeInfoData, unitOptions, isSales, onAdd, onClose,
}: EntryDetailModalProps) {
  const [variety, setVariety] = useState('');
  const [varietyCustom, setVarietyCustom] = useState(false);
  const [size, setSize] = useState('');
  const [sizeCustom, setSizeCustom] = useState(false);
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState(unitOptions[0] ?? 'kg');
  const [price, setPrice] = useState('');
  const [showSizeInfo, setShowSizeInfo] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setVariety(''); setVarietyCustom(varieties.length === 0);
      setSize(''); setSizeCustom(false);
      setQty(''); setUnit(unitOptions[0] ?? 'kg'); setPrice('');
      setShowSizeInfo(false); setError('');
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = () => {
    if (!variety.trim()) { setError('품종을 입력해주세요.'); return; }
    if (!size.trim()) { setError('사이즈를 입력해주세요.'); return; }
    if (!qty.trim() || isNaN(parseFloat(qty))) { setError('수량을 입력해주세요.'); return; }
    if (isSales && (!price.trim() || isNaN(parseFloat(price)))) { setError('단가를 입력해주세요.'); return; }
    onAdd({
      variety: variety.trim(), size: size.trim(), quantity: qty.trim(),
      unit, price: isSales ? price : undefined,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={seStyles.overlay} activeOpacity={1} onPress={onClose}>
          <TouchableOpacity activeOpacity={1} style={seStyles.sheet}>
            <View style={seStyles.handle} />
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={seStyles.header}>내역 추가</Text>

              {/* 품종 */}
              <Text style={seStyles.label}>품종</Text>
              <View style={seStyles.chipRow}>
                {varieties.map((v) => (
                  <TouchableOpacity key={v}
                    style={[seStyles.chip, !varietyCustom && variety === v && seStyles.chipActive]}
                    onPress={() => { setVariety(v); setVarietyCustom(false); }}>
                    <Text style={[seStyles.chipText, !varietyCustom && variety === v && seStyles.chipTextActive]}>{v}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[seStyles.chip, varietyCustom && seStyles.chipActive]}
                  onPress={() => { setVarietyCustom(true); setVariety(''); }}>
                  <Text style={[seStyles.chipText, varietyCustom && seStyles.chipTextActive]}>직접 입력</Text>
                </TouchableOpacity>
              </View>
              {(varietyCustom || varieties.length === 0) && (
                <TextInput style={[seStyles.input, { marginTop: 6 }]} value={variety} onChangeText={setVariety}
                  placeholder="품종 직접 입력" placeholderTextColor={Colors.textLight} />
              )}

              {/* 사이즈 */}
              <View style={seStyles.labelRow}>
                <Text style={seStyles.label}>사이즈</Text>
                {sizeInfoData.length > 0 && (
                  <TouchableOpacity onPress={() => setShowSizeInfo((v) => !v)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <PhIcon name="info" size={16} color={Colors.textSub} />
                  </TouchableOpacity>
                )}
              </View>
              {showSizeInfo && sizeInfoData.length > 0 && (
                <View style={seStyles.sizeInfoBox}>
                  {sizeInfoData.map((s) => (
                    <Text key={s.name} style={seStyles.sizeInfoText}>{s.name}{s.range ? ` : ${s.range}` : ''}</Text>
                  ))}
                </View>
              )}
              <View style={seStyles.chipRow}>
                {sizeOptions.map((s) => (
                  <TouchableOpacity key={s}
                    style={[seStyles.chip, !sizeCustom && size === s && seStyles.chipActive]}
                    onPress={() => { setSize(s); setSizeCustom(false); }}>
                    <Text style={[seStyles.chipText, !sizeCustom && size === s && seStyles.chipTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[seStyles.chip, sizeCustom && seStyles.chipActive]}
                  onPress={() => { setSizeCustom(true); setSize(''); }}>
                  <Text style={[seStyles.chipText, sizeCustom && seStyles.chipTextActive]}>직접 입력</Text>
                </TouchableOpacity>
              </View>
              {sizeCustom && (
                <TextInput style={[seStyles.input, { marginTop: 6 }]} value={size} onChangeText={setSize}
                  placeholder="예) 왕왕특, 점보" placeholderTextColor={Colors.textLight} />
              )}

              {/* 수량 */}
              <Text style={seStyles.label}>수량</Text>
              <View style={seStyles.row}>
                <TextInput style={[seStyles.input, { flex: 1 }]} value={qty} onChangeText={setQty}
                  placeholder="0" placeholderTextColor={Colors.textLight} keyboardType="decimal-pad" />
                <View style={seStyles.unitRow}>
                  {unitOptions.map((u) => (
                    <TouchableOpacity key={u}
                      style={[seStyles.unitChip, unit === u && seStyles.unitChipActive]}
                      onPress={() => setUnit(u)}>
                      <Text style={[seStyles.unitText, unit === u && seStyles.unitTextActive]}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {isSales && (
                <>
                  <Text style={seStyles.label}>단가 (원)</Text>
                  <TextInput style={seStyles.input} value={price} onChangeText={setPrice}
                    placeholder="0" placeholderTextColor={Colors.textLight} keyboardType="decimal-pad" />
                </>
              )}

              {!!error && <Text style={seStyles.error}>{error}</Text>}

              <TouchableOpacity style={seStyles.addBtn} onPress={handleAdd}>
                <Text style={seStyles.addBtnText}>추가</Text>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const seStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.lg, paddingBottom: 40, maxHeight: '88%',
  },
  handle: {
    width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2,
    alignSelf: 'center', marginBottom: Spacing.md,
  },
  header: { ...Typography.h3, marginBottom: Spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  chipActive: { backgroundColor: Colors.primaryUltraLight, borderColor: Colors.primary },
  chipText: { fontSize: 14, color: Colors.textSub, fontWeight: '600' },
  chipTextActive: { color: Colors.primaryDark, fontWeight: '700' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sizeInfoBox: {
    backgroundColor: Colors.primaryUltraLight, borderRadius: Radius.md,
    padding: Spacing.sm, marginTop: 6,
  },
  sizeInfoText: { fontSize: 12, color: Colors.primaryDark, lineHeight: 18 },
  label: { ...Typography.label, marginBottom: 4, marginTop: Spacing.sm },
  input: {
    backgroundColor: Colors.background, borderRadius: Radius.md,
    padding: 13, fontSize: 16, color: Colors.text,
    borderWidth: 1, borderColor: Colors.border,
  },
  row: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  unitRow: { flexDirection: 'row', gap: 6 },
  unitChip: {
    paddingHorizontal: 14, paddingVertical: 13, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  unitChipActive: { backgroundColor: Colors.primaryUltraLight, borderColor: Colors.primary },
  unitText: { fontSize: 14, color: Colors.textSub, fontWeight: '600' },
  unitTextActive: { color: Colors.primaryDark, fontWeight: '700' },
  error: { fontSize: 12, color: Colors.danger, marginTop: 8, fontWeight: '600' },
  addBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: 15, alignItems: 'center', marginTop: Spacing.md,
  },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});

// ── upsert helpers (같은 farm/crop/variety/size 있으면 qty 누적, 없으면 insert) ──
async function upsertHarvest(row: any) {
  let q = supabase.from('harvest_records').select('id, quantity')
    .eq('user_id', row.user_id).eq('date', row.date);
  q = row.farm_id ? q.eq('farm_id', row.farm_id) : q.is('farm_id', null);
  q = row.crop_type ? q.eq('crop_type', row.crop_type) : q.is('crop_type', null);
  q = row.variety ? q.eq('variety', row.variety) : q.is('variety', null);
  q = row.size ? q.eq('size', row.size) : q.is('size', null);
  const { data: existing } = await (q as any).maybeSingle();
  if (existing) {
    await supabase.from('harvest_records')
      .update({ quantity: existing.quantity + row.quantity })
      .eq('id', existing.id).throwOnError();
  } else {
    await supabase.from('harvest_records').insert(row).throwOnError();
  }
}

async function upsertSales(row: any) {
  let q = supabase.from('sales_records').select('id, quantity, total_revenue')
    .eq('user_id', row.user_id).eq('date', row.date);
  q = row.farm_id ? q.eq('farm_id', row.farm_id) : q.is('farm_id', null);
  q = row.crop_type ? q.eq('crop_type', row.crop_type) : q.is('crop_type', null);
  q = row.variety ? q.eq('variety', row.variety) : q.is('variety', null);
  q = row.size ? q.eq('size', row.size) : q.is('size', null);
  q = row.sale_type ? q.eq('sale_type', row.sale_type) : q.is('sale_type', null);
  q = row.price_per_unit != null ? q.eq('price_per_unit', row.price_per_unit) : q.is('price_per_unit', null);
  const { data: existing } = await (q as any).maybeSingle();
  if (existing) {
    const newQty = existing.quantity + row.quantity;
    const newRev = existing.total_revenue + row.total_revenue;
    await supabase.from('sales_records')
      .update({
        quantity: newQty, total_revenue: newRev,
        price_per_unit: row.price_per_unit, // 최신 단가로 덮어쓰기
      })
      .eq('id', existing.id).throwOnError();
  } else {
    await supabase.from('sales_records').insert(row).throwOnError();
  }
}

async function saveNote(
  table: 'harvest_notes' | 'other_notes',
  { userId, date, farmId, cropType, note }: {
    userId: string; date: string; farmId: string | null; cropType: string | null; note: string;
  }
) {
  let q: any = supabase.from(table).delete()
    .eq('user_id', userId).eq('date', date);
  q = farmId ? q.eq('farm_id', farmId) : q.is('farm_id', null);
  q = cropType ? q.eq('crop_type', cropType) : q.is('crop_type', null);
  await q;
  if (note.trim()) {
    await supabase.from(table).insert({
      user_id: userId, date, farm_id: farmId, crop_type: cropType, note: note.trim(),
    }).throwOnError();
  }
}

async function upsertOther(row: any) {
  let q = supabase.from('other_records').select('id, quantity')
    .eq('user_id', row.user_id).eq('date', row.date).eq('type', row.type);
  q = row.farm_id ? q.eq('farm_id', row.farm_id) : q.is('farm_id', null);
  q = row.crop_type ? q.eq('crop_type', row.crop_type) : q.is('crop_type', null);
  q = row.variety ? q.eq('variety', row.variety) : q.is('variety', null);
  q = row.size ? q.eq('size', row.size) : q.is('size', null);
  const { data: existing } = await (q as any).maybeSingle();
  if (existing) {
    await supabase.from('other_records')
      .update({ quantity: existing.quantity + row.quantity })
      .eq('id', existing.id).throwOnError();
  } else {
    await supabase.from('other_records').insert(row).throwOnError();
  }
}

// 품종 asc → 사이즈 sort_order asc 정렬
function sortEntries(entries: Entry[], sizeOptions: string[]): Entry[] {
  return [...entries].sort((a, b) => {
    const v = a.variety.localeCompare(b.variety, 'ko');
    if (v !== 0) return v;
    const ai = sizeOptions.indexOf(a.size);
    const bi = sizeOptions.indexOf(b.size);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.size.localeCompare(b.size, 'ko');
  });
}

// ── Main InputFormModal ──
export function InputFormModal({
  visible, tab, farms, userId, initialDate, onClose, onSaved, editRecord, groupEditRecords,
}: Props) {
  const isEdit = !!editRecord;
  const isGroupEdit = !!groupEditRecords?.length;
  const today = new Date().toISOString().split('T')[0];
  const scrollRef = useRef<ScrollView>(null);

  const steps = getStepIds(tab);
  const [activeStep, setActiveStep] = useState(0);

  const [date, setDate] = useState(initialDate ?? today);
  const primaryFarm = farms.find(f => f.is_primary) ?? farms[0];
  const [farmId, setFarmId] = useState(primaryFarm?.id ?? '');
  const [cropType, setCropType] = useState(primaryFarm?.crop_type ?? '블루베리');
  const [otherType, setOtherType] = useState<OtherType>('gift');

  const [entries, setEntries] = useState<Entry[]>([]);
  const [originalEntryIds, setOriginalEntryIds] = useState<string[]>([]); // 그룹 수정 시 원본 ID 추적
  const [entryModalVisible, setEntryModalVisible] = useState(false);
  const [entryError, setEntryError] = useState('');

  // Edit mode fields
  const [editVariety, setEditVariety] = useState('');
  const [showEditVarietyInput, setShowEditVarietyInput] = useState(false);
  const [editSize, setEditSize] = useState('');
  const [editCustomSizeMode, setEditCustomSizeMode] = useState(false);
  const [editShowSizeInfo, setEditShowSizeInfo] = useState(false);
  const [editQty, setEditQty] = useState('');
  const [editUnit, setEditUnit] = useState('kg');

  // Workers
  const [workers, setWorkers] = useState<WorkerEntry[]>([]);
  const [wName, setWName] = useState('');
  const [wHours, setWHours] = useState('');
  const [wCost, setWCost] = useState(String(MINIMUM_HOURLY_WAGE));
  const [workerError, setWorkerError] = useState('');
  const [savedLaborRecords, setSavedLaborRecords] = useState<
    { id: string; worker_name: string; work_hours: number | null; labor_cost: number }[]
  >([]);

  // Sales / Other
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [commissionRate, setCommissionRate] = useState('');
  const [commissionType, setCommissionType] = useState<'%' | '원'>('%');
  const [extraCost, setExtraCost] = useState('');
  const [buyer, setBuyer] = useState('');
  const [recipient, setRecipient] = useState('');
  const [saleType, setSaleType] = useState('');
  const [customSaleType, setCustomSaleType] = useState('');
  const [otherExtraCost, setOtherExtraCost] = useState('');
  const [note, setNote] = useState('');

  // DB options
  const [cropOptions, setCropOptions] = useState<string[]>([]);
  const [showCropInput, setShowCropInput] = useState(false);
  const [varieties, setVarieties] = useState<string[]>([]);
  const [sizeOptions, setSizeOptions] = useState<string[]>(BLUEBERRY_SIZES);
  const [sizeInfoData, setSizeInfoData] = useState<SizeInfo[]>([]);
  const [unitOptions, setUnitOptions] = useState<string[]>(DEFAULT_UNITS);
  const [showCalendar, setShowCalendar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingHarvest, setLoadingHarvest] = useState(false);

  const reset = () => {
    setActiveStep(0);
    const pFarm = farms.find(f => f.is_primary) ?? farms[0];
    setDate(initialDate ?? today);
    setFarmId(pFarm?.id ?? '');
    setCropType(pFarm?.crop_type ?? '블루베리');
    setOtherType('gift'); setEntries([]); setOriginalEntryIds([]);
    setShowCropInput(false);
    setEntryModalVisible(false); setEntryError('');
    setEditVariety(''); setShowEditVarietyInput(false); setEditSize(''); setEditCustomSizeMode(false);
    setEditShowSizeInfo(false); setEditQty(''); setEditUnit('kg');
    setWorkers([]); setWName(''); setWHours(''); setWCost(String(MINIMUM_HOURLY_WAGE)); setWorkerError('');
    setSavedLaborRecords([]);
    setPricePerUnit(''); setCommissionRate(''); setCommissionType('%'); setExtraCost(''); setBuyer('');
    setRecipient(''); setOtherExtraCost(''); setNote('');
    setSaleType(''); setCustomSaleType('');
  };

  // 단일 레코드 수정 모드 / create 모드 날짜 동기화
  useEffect(() => {
    if (!visible) { reset(); return; }
    if (isEdit && editRecord) {
      setDate(editRecord.date);
      setCropType(editRecord.cropType ?? '');
      setOtherType((editRecord.otherSubType as OtherType) ?? 'gift');
      setEditVariety(editRecord.variety ?? '');
      setEditSize(editRecord.size ?? '');
      setEditQty(String(editRecord.quantity));
      setEditUnit(editRecord.unit ?? 'kg');
      setNote(editRecord.note ?? '');
      setPricePerUnit(editRecord.pricePerUnit != null ? String(editRecord.pricePerUnit) : '');
      setCommissionRate(editRecord.commissionRate != null ? String(editRecord.commissionRate) : '');
      setExtraCost(editRecord.extraCost != null ? String(editRecord.extraCost) : '');
      setBuyer(editRecord.buyer ?? '');
      setRecipient(editRecord.recipient ?? '');
      if (editRecord.farmId) setFarmId(editRecord.farmId);
      return;
    }
    // 신규 입력 모드: 입력 화면에서 선택된 날짜로 동기화
    if (!isGroupEdit) setDate(initialDate ?? today);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // 그룹 수정 모드 - 기존 항목 전체 pre-fill
  useEffect(() => {
    if (!visible || !isGroupEdit || !groupEditRecords?.length) return;
    const first = groupEditRecords[0];
    setDate(first.date);
    if (first.farmId) setFarmId(first.farmId);
    setCropType(first.cropType ?? '');
    if (tab === 'other') setOtherType((first.otherSubType as OtherType) ?? 'gift');
    if (tab === 'harvest' || tab === 'other') setNote(first.note ?? '');

    if (tab === 'sales') {
      // 수수료 타입 판별
      const rate = first.commissionRate ?? 0;
      const amount = first.commissionAmount ?? 0;
      if (rate > 0) {
        setCommissionType('%'); setCommissionRate(String(rate));
      } else if (amount > 0) {
        setCommissionType('원'); setCommissionRate(String(amount));
      } else {
        setCommissionType('%'); setCommissionRate('');
      }
      setExtraCost(first.extraCost != null && first.extraCost > 0 ? String(first.extraCost) : '');
      setBuyer(first.buyer ?? '');
      // 판매 유형
      const st = (first as any).saleType ?? '';
      if (SALE_TYPE_OPTIONS.slice(0, -1).includes(st)) {
        setSaleType(st); setCustomSaleType('');
      } else if (st) {
        setSaleType('기타'); setCustomSaleType(st);
      } else {
        setSaleType(''); setCustomSaleType('');
      }
    }

    const preEntries: Entry[] = groupEditRecords.map(r => ({
      variety: r.variety ?? '',
      size: r.size ?? '',
      quantity: String(r.quantity),
      unit: r.unit ?? 'kg',
      price: r.pricePerUnit != null ? String(r.pricePerUnit) : undefined,
      existingId: r.id,
    }));
    setEntries(sortEntries(preEntries, sizeOptions));
    setOriginalEntryIds(groupEditRecords.map(r => r.id));
    setActiveStep(steps.length); // allStepsDone
  }, [visible, isGroupEdit, groupEditRecords]);

  useEffect(() => {
    if (visible && !farmId && farms.length > 0) {
      const pFarm = farms.find(f => f.is_primary) ?? farms[0];
      setFarmId(pFarm.id);
      if (!isEdit && !isGroupEdit && pFarm.crop_type) setCropType(pFarm.crop_type);
    }
  }, [visible, farms]);

  useEffect(() => {
    if (!visible) return;
    listCodes('unit').then((rows) => {
      if (rows.length) setUnitOptions(rows.map((u) => u.name));
    });
    listCodes('crop').then((rows) => setCropOptions(rows.map((c) => c.name)));
  }, [visible]);

  useEffect(() => {
    if (!visible || !userId || !date || tab !== 'harvest') { setSavedLaborRecords([]); return; }
    supabase.from('labor_records')
      .select('id, worker_name, work_hours, labor_cost')
      .eq('user_id', userId)
      .eq('date', date)
      .then(({ data, error }) => {
        if (error) console.error('[labor_records fetch error]', error);
        setSavedLaborRecords(data ?? []);
      });
  }, [visible, userId, date, tab]);

  useEffect(() => {
    if (!cropType) return;
    listVarietiesByCropName(cropType)
      .then((rows) => {
        const list = rows.map((v) => v.name);
        setVarieties(list);
        if (editVariety && !list.includes(editVariety)) setShowEditVarietyInput(true);
      });
    listSizesByCropName(cropType)
      .then((rows) => {
        const opts = rows.length ? rows.map((s) => s.name) : BLUEBERRY_SIZES;
        setSizeOptions(opts);
        setSizeInfoData(rows.length ? rows.map((s) => ({ name: s.name, range: s.info ?? '' })) : []);
        if (isEdit && editRecord?.size && !opts.includes(editRecord.size)) setEditCustomSizeMode(true);
      });
  }, [cropType]);

  const resolvedSaleType = saleType === '기타' ? customSaleType.trim() : saleType;

  const isStepValid = (id: string): boolean => {
    if (id === 'date' || id === 'otherType' || id === 'farm') return true;
    if (id === 'saleType') return !!resolvedSaleType;
    if (id === 'crop') return !!cropType.trim();
    if (id === 'entries') return entries.length > 0;
    return true;
  };

  const advanceStep = () => {
    setActiveStep((prev) => prev + 1);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 250);
  };

  const removeEntry = (i: number) => setEntries((prev) => prev.filter((_, idx) => idx !== i));

  const updateEntry = (i: number, field: 'quantity' | 'price', value: string) =>
    setEntries((prev) => prev.map((e, idx) => idx === i ? { ...e, [field]: value } : e));

  const addWorker = () => {
    if (!wName.trim()) { setWorkerError('이름을 입력해주세요.'); return; }
    if (!wCost.trim() || isNaN(parseFloat(wCost))) { setWorkerError('인건비를 입력해주세요.'); return; }
    setWorkerError('');
    setWorkers((prev) => [...prev, { name: wName.trim(), hours: wHours.trim(), cost: wCost.trim() }]);
    setWName(''); setWHours(''); setWCost(String(MINIMUM_HOURLY_WAGE));
  };

  const removeWorker = (i: number) => setWorkers((prev) => prev.filter((_, idx) => idx !== i));

  const deleteSavedWorker = async (id: string) => {
    const { error } = await supabase.from('labor_records').delete().eq('id', id);
    if (error) { Alert.alert('삭제 실패', error.message); return; }
    setSavedLaborRecords((prev) => prev.filter((r) => r.id !== id));
  };

  // ── 수확데이터 가져오기 ──
  const loadFromHarvest = async () => {
    if (!userId || !date) return;
    setLoadingHarvest(true);
    try {
      const baseQ = supabase.from('harvest_records')
        .select('variety, size, quantity, unit')
        .eq('user_id', userId)
        .eq('date', date);
      const { data, error } = await (farmId ? baseQ.eq('farm_id', farmId) : baseQ);
      if (error || !data?.length) {
        Alert.alert('안내', `${date} 날짜의 수확 데이터가 없습니다.`);
        return;
      }
      // 동일 품종+사이즈 합산
      const merged: Record<string, Entry> = {};
      for (const r of data) {
        const key = `${r.variety ?? ''}|${r.size ?? ''}`;
        if (merged[key]) {
          merged[key].quantity = String(parseFloat(merged[key].quantity) + r.quantity);
        } else {
          merged[key] = {
            variety: r.variety ?? '',
            size: r.size ?? '',
            quantity: String(r.quantity),
            unit: r.unit ?? 'kg',
            price: '',
          };
        }
      }
      setEntries(sortEntries(Object.values(merged), sizeOptions));
    } catch {
      Alert.alert('오류', '수확 데이터를 불러오는 데 실패했습니다.');
    } finally {
      setLoadingHarvest(false);
    }
  };

  // ── Save ──
  const validate = (): string | null => {
    if (!date) return '날짜를 선택해주세요.';
    if (!cropType.trim()) return '작물을 입력해주세요.';
    if (tab === 'other' && !otherType) return '구분을 선택해주세요.';
    if (isEdit) {
      if (!editVariety.trim()) return '품종을 입력해주세요.';
      if (!editSize.trim()) return '사이즈를 입력해주세요.';
      if (!editQty.trim() || isNaN(parseFloat(editQty))) return '수량을 올바르게 입력해주세요.';
      if (tab === 'sales') {
        if (!pricePerUnit.trim() || isNaN(parseFloat(pricePerUnit))) return '단가를 입력해주세요.';
      }
    } else {
      if (entries.length === 0) return '항목을 1개 이상 추가해주세요.';
      for (const e of entries) {
        if (!e.variety.trim()) return '품종이 비어있는 항목이 있습니다.';
        if (!e.size.trim()) return '사이즈가 비어있는 항목이 있습니다.';
      }
      if (tab === 'sales') {
        if (entries.some(e => !e.price?.trim() || isNaN(parseFloat(e.price!)))) {
          return '모든 판매 항목의 단가를 입력해주세요.';
        }
      }
    }
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { Alert.alert('입력 오류', err); return; }
    setSaving(true);
    try {
      const baseFields = { user_id: userId, farm_id: farmId || null, date, crop_type: cropType || null };

      // ── 단일 레코드 수정 ──
      if (isEdit && editRecord) {
        const qty = parseFloat(editQty);
        if (editRecord.type === 'harvest') {
          await supabase.from('harvest_records').update({
            farm_id: farmId || null, date, crop_type: cropType || null,
            variety: editVariety || null, size: editSize || null,
            quantity: qty, unit: editUnit || null,
          }).eq('id', editRecord.id).throwOnError();
          await saveNote('harvest_notes', { userId, date, farmId: farmId || null, cropType: cropType || null, note });
        } else if (editRecord.type === 'sales') {
          const price = parseFloat(pricePerUnit) || 0;
          const cRate = parseFloat(commissionRate) || 0;
          const eCost = parseFloat(extraCost) || 0;
          const rev = qty * price;
          await supabase.from('sales_records').update({
            farm_id: farmId || null, date, crop_type: cropType || null,
            variety: editVariety || null, size: editSize || null,
            quantity: qty, price_per_unit: price, total_revenue: rev,
            commission_rate: cRate, commission_amount: rev * cRate / 100,
            extra_cost: eCost, buyer: buyer || null,
          }).eq('id', editRecord.id).throwOnError();
        } else {
          const eCost = parseFloat(otherExtraCost) || 0;
          await supabase.from('other_records').update({
            farm_id: farmId || null, date, crop_type: cropType || null,
            variety: editVariety || null, size: editSize || null,
            quantity: qty, unit: editUnit || null,
            type: otherType,
            recipient: otherType === 'gift' ? (recipient || null) : null,
            extra_cost: eCost > 0 ? eCost : null,
          }).eq('id', editRecord.id).throwOnError();
          await saveNote('other_notes', { userId, date, farmId: farmId || null, cropType: cropType || null, note });
        }

      // ── 그룹 수정 ──
      } else if (isGroupEdit) {
        const table = tab === 'harvest' ? 'harvest_records'
          : tab === 'sales' ? 'sales_records' : 'other_records';

        // 삭제된 항목 처리
        const finalIds = entries.map(e => e.existingId).filter(Boolean) as string[];
        const toDelete = originalEntryIds.filter(id => !finalIds.includes(id));
        for (const id of toDelete) {
          await supabase.from(table).delete().eq('id', id).throwOnError();
        }

        // 기존 항목 UPDATE, 새 항목 INSERT(upsert)
        for (const e of entries) {
          const qty = parseFloat(e.quantity);
          if (e.existingId) {
            if (tab === 'harvest') {
              await supabase.from('harvest_records').update({
                farm_id: farmId || null, date, crop_type: cropType || null,
                variety: e.variety || null, size: e.size || null,
                quantity: qty, unit: e.unit,
              }).eq('id', e.existingId).throwOnError();
            } else if (tab === 'sales') {
              const price = parseFloat(e.price ?? '0');
              const cInput2 = parseFloat(commissionRate || '0') || 0;
              const rev2 = qty * price;
              const cAmt2 = commissionType === '%' ? rev2 * cInput2 / 100 : cInput2;
              await supabase.from('sales_records').update({
                farm_id: farmId || null, date, crop_type: cropType || null,
                variety: e.variety || null, size: e.size || null,
                quantity: qty, price_per_unit: price, total_revenue: rev2,
                commission_rate: commissionType === '%' ? cInput2 : 0,
                commission_amount: cAmt2,
                extra_cost: parseFloat(extraCost || '0') || 0,
                buyer: buyer || null,
                sale_type: resolvedSaleType || null,
              }).eq('id', e.existingId).throwOnError();
            } else {
              await supabase.from('other_records').update({
                farm_id: farmId || null, date, crop_type: cropType || null,
                variety: e.variety || null, size: e.size || null,
                quantity: qty, unit: e.unit, type: otherType,
              }).eq('id', e.existingId).throwOnError();
            }
          } else {
            // 새로 추가된 항목 → upsert
            if (tab === 'harvest') {
              await upsertHarvest({ ...baseFields, variety: e.variety || null, size: e.size || null, quantity: qty, unit: e.unit });
            } else if (tab === 'sales') {
              const price = parseFloat(e.price ?? '0');
              const rev = qty * price;
              const cIn = parseFloat(commissionRate || '0') || 0;
              const cAmtN = commissionType === '%' ? rev * cIn / 100 : cIn;
              await upsertSales({ ...baseFields, variety: e.variety || null, size: e.size || null, quantity: qty, price_per_unit: price, total_revenue: rev, buyer: buyer || null, commission_rate: commissionType === '%' ? cIn : 0, commission_amount: cAmtN, extra_cost: parseFloat(extraCost || '0') || 0, sale_type: resolvedSaleType || null });
            } else {
              await upsertOther({ ...baseFields, variety: e.variety || null, size: e.size || null, quantity: qty, unit: e.unit, type: otherType, recipient: otherType === 'gift' ? (recipient || null) : null, extra_cost: null });
            }
          }
        }
        if (tab === 'harvest') {
          await saveNote('harvest_notes', { userId, date, farmId: farmId || null, cropType: cropType || null, note });
          const pendingWorkers = [...workers];
          if (wName.trim() && wCost.trim() && !isNaN(parseFloat(wCost))) {
            pendingWorkers.push({ name: wName.trim(), hours: wHours.trim(), cost: wCost.trim() });
          }
          if (pendingWorkers.length > 0) {
            const laborRows = pendingWorkers.map((w) => {
              const hours = parseFloat(w.hours) || 0;
              const rate = parseFloat(w.cost) || 0;
              return {
                user_id: userId, farm_id: farmId || null, date,
                worker_name: w.name,
                work_hours: hours > 0 ? hours : null,
                labor_cost: hours > 0 ? hours * rate : rate,
              };
            });
            const { data: insertedLabor, error: laborError } = await supabase
              .from('labor_records').insert(laborRows).select('id, worker_name, work_hours, labor_cost');
            if (laborError) {
              console.error('[labor_records insert error]', laborError);
              throw new Error(`인건비 저장 실패: ${laborError.message}`);
            }
            setSavedLaborRecords((prev) => [...prev, ...(insertedLabor ?? [])]);
          }
        } else if (tab === 'other') {
          await saveNote('other_notes', { userId, date, farmId: farmId || null, cropType: cropType || null, note });
        }

      // ── 신규 입력 (upsert) ──
      } else {
        if (tab === 'harvest') {
          for (const e of entries) {
            await upsertHarvest({
              ...baseFields, variety: e.variety || null, size: e.size || null,
              quantity: parseFloat(e.quantity), unit: e.unit,
            });
          }
          await saveNote('harvest_notes', { userId, date, farmId: farmId || null, cropType: cropType || null, note });
          const pendingWorkers = [...workers];
          if (wName.trim() && wCost.trim() && !isNaN(parseFloat(wCost))) {
            pendingWorkers.push({ name: wName.trim(), hours: wHours.trim(), cost: wCost.trim() });
          }
          if (pendingWorkers.length > 0) {
            const laborRows = pendingWorkers.map((w) => {
              const hours = parseFloat(w.hours) || 0;
              const rate = parseFloat(w.cost) || 0;
              return {
                user_id: userId, farm_id: farmId || null, date,
                worker_name: w.name,
                work_hours: hours > 0 ? hours : null,
                labor_cost: hours > 0 ? hours * rate : rate,
              };
            });
            const { data: insertedLabor, error: laborError } = await supabase
              .from('labor_records').insert(laborRows).select('id, worker_name, work_hours, labor_cost');
            if (laborError) {
              console.error('[labor_records insert error]', laborError);
              throw new Error(`인건비 저장 실패: ${laborError.message}`);
            }
            setSavedLaborRecords((prev) => [...prev, ...(insertedLabor ?? [])]);
          }
        } else if (tab === 'sales') {
          const cInput = parseFloat(commissionRate || '0') || 0;
          const eCost = parseFloat(extraCost || '0') || 0;
          for (const e of entries) {
            const qty = parseFloat(e.quantity);
            const price = parseFloat(e.price ?? '0');
            const rev = qty * price;
            const cAmt = commissionType === '%' ? rev * cInput / 100 : cInput;
            await upsertSales({
              ...baseFields, variety: e.variety || null, size: e.size || null, quantity: qty,
              price_per_unit: price, total_revenue: rev, buyer: buyer || null,
              commission_rate: commissionType === '%' ? cInput : 0,
              commission_amount: cAmt, extra_cost: eCost,
              sale_type: resolvedSaleType || null,
            });
          }
        } else {
          const eCost = parseFloat(otherExtraCost || '0') || 0;
          for (const e of entries) {
            await upsertOther({
              ...baseFields, variety: e.variety || null, size: e.size || null,
              quantity: parseFloat(e.quantity), unit: e.unit,
              type: otherType, recipient: otherType === 'gift' ? (recipient || null) : null,
              extra_cost: eCost > 0 ? eCost : null,
            });
          }
          await saveNote('other_notes', { userId, date, farmId: farmId || null, cropType: cropType || null, note });
        }
      }

      onSaved(); onClose();
    } catch (e: any) {
      Alert.alert('저장 실패', e.message ?? '알 수 없는 오류');
    } finally {
      setSaving(false);
    }
  };

  const tabLabel = tab === 'harvest' ? '수확' : tab === 'sales' ? '판매' : '기타';
  const totalSteps = steps.length;
  const allStepsDone = activeStep >= totalSteps;
  const currentStepDisplay = Math.min(activeStep + 1, totalSteps);

  // 작물 선택: 공통코드에 등록된 작물을 칩으로 고르거나 직접 입력.
  // cropType 이 공통코드 목록에 없으면(기존 레코드 등) 자동으로 직접 입력 모드.
  const cropIsCustom = showCropInput || (!!cropType && cropOptions.length > 0 && !cropOptions.includes(cropType));
  const CropField = (onSubmit?: () => void) => (
    <>
      <View style={styles.chipRow}>
        {cropOptions.map((c) => (
          <TouchableOpacity key={c}
            style={[styles.chip, !cropIsCustom && cropType === c && styles.chipActive]}
            onPress={() => { setShowCropInput(false); setCropType(c); }}>
            <Text style={[styles.chipText, !cropIsCustom && cropType === c && styles.chipTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.chip, styles.sizeChipAction, cropIsCustom && styles.chipActive]}
          onPress={() => { setShowCropInput(true); setCropType(''); }}>
          <Text style={[styles.chipText, cropIsCustom && styles.chipTextActive]}>직접 입력</Text>
        </TouchableOpacity>
      </View>
      {(cropIsCustom || cropOptions.length === 0) && (
        <TextInput style={[styles.input, { marginTop: 6 }]} value={cropType} onChangeText={setCropType}
          placeholder="예) 블루베리, 딸기" placeholderTextColor={Colors.textLight}
          returnKeyType="done" onSubmitEditing={onSubmit} />
      )}
    </>
  );

  const EntriesContent = () => {
    const varietyGroups: { variety: string; indices: number[] }[] = [];
    entries.forEach((e, i) => {
      const last = varietyGroups[varietyGroups.length - 1];
      if (last && last.variety === e.variety) {
        last.indices.push(i);
      } else {
        varietyGroups.push({ variety: e.variety, indices: [i] });
      }
    });
    const grandTotal = entries.reduce((s, e) => s + (parseFloat(e.quantity) || 0), 0);
    const grandTotalUnit = entries[0]?.unit ?? 'kg';
    return (
    <>
      <TouchableOpacity style={styles.addEntryBox} onPress={() => setEntryModalVisible(true)} activeOpacity={0.7}>
        <View style={styles.addEntryBoxIcon}><Text style={styles.addEntryBoxPlus}>+</Text></View>
        <Text style={styles.addEntryBoxText}>내역 추가</Text>
      </TouchableOpacity>
      {!!entryError && <Text style={styles.errorText}>{entryError}</Text>}

      {tab === 'sales' && (
        <TouchableOpacity
          style={[styles.harvestImportBtn, loadingHarvest && { opacity: 0.5 }, { marginTop: Spacing.sm }]}
          onPress={loadFromHarvest}
          disabled={loadingHarvest}
        >
          <Text style={styles.harvestImportText}>
            {loadingHarvest ? '불러오는 중...' : '수확데이터 가져오기'}
          </Text>
        </TouchableOpacity>
      )}

      {entries.length > 0 && (
        <View style={[styles.entryList, { marginTop: Spacing.sm }]}>
          {varietyGroups.map((vg, vgi) => {
            const varietyTotal = vg.indices.reduce((s, i) => s + (parseFloat(entries[i].quantity) || 0), 0);
            const vUnit = entries[vg.indices[0]]?.unit ?? 'kg';
            return (
              <View key={vg.variety + vgi} style={[styles.entryVarietyGroup, vgi > 0 && styles.entryVarietyGroupSep]}>
                <Text style={styles.entryVarietyHeader}>{vg.variety}</Text>
                {vg.indices.map((i) => {
                  const e = entries[i];
                  return (
                    <View key={i} style={styles.entrySizeBlock}>
                      <View style={styles.entrySizeRow}>
                        <Text style={styles.entrySizeLabel}>{e.size || '—'}</Text>
                        <TouchableOpacity onPress={() => removeEntry(i)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                          <Text style={styles.entryRemove}>✕</Text>
                        </TouchableOpacity>
                      </View>
                      {tab === 'sales' ? (
                        <View style={{ gap: 4, marginTop: 4 }}>
                          <View style={styles.entryEditInline}>
                            <TextInput
                              style={styles.entryEditInput}
                              value={e.quantity}
                              onChangeText={(v) => updateEntry(i, 'quantity', v)}
                              keyboardType="decimal-pad"
                              placeholder="0"
                              placeholderTextColor={Colors.textLight}
                            />
                            <Text style={styles.entryEditUnit}>{e.unit}</Text>
                          </View>
                          <View style={styles.entryEditInline}>
                            <TextInput
                              style={[styles.entryEditInput]}
                              value={e.price ?? ''}
                              onChangeText={(v) => updateEntry(i, 'price', v)}
                              keyboardType="decimal-pad"
                              placeholder="단가 (원)"
                              placeholderTextColor={Colors.textLight}
                            />
                            <Text style={styles.entryEditUnit}>원</Text>
                          </View>
                        </View>
                      ) : (
                        <View style={[styles.entryEditInline, { marginTop: 4 }]}>
                          <TextInput
                            style={styles.entryEditInput}
                            value={e.quantity}
                            onChangeText={(v) => updateEntry(i, 'quantity', v)}
                            keyboardType="decimal-pad"
                            placeholder="0"
                            placeholderTextColor={Colors.textLight}
                          />
                          <Text style={styles.entryEditUnit}>{e.unit}</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
                {vg.indices.length > 1 && (
                  <View style={styles.entrySubtotalRow}>
                    <Text style={styles.entrySubtotalLabel}>{vg.variety} 소계</Text>
                    <Text style={styles.entrySubtotalValue}>
                      {Number.isInteger(varietyTotal) ? varietyTotal : parseFloat(varietyTotal.toFixed(2))}{vUnit}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
          {entries.length > 1 && (
            <View style={styles.entryGrandTotalRow}>
              <Text style={styles.entryGrandTotalLabel}>전체 합계</Text>
              <Text style={styles.entryGrandTotalValue}>
                {Number.isInteger(grandTotal) ? grandTotal : parseFloat(grandTotal.toFixed(2))}{grandTotalUnit}
              </Text>
            </View>
          )}
        </View>
      )}

    </>
    );
  };

  const WorkersSection = () => (
    <View style={styles.optionalSection}>
      <Text style={styles.optionalTitle}>작업자 정보 (선택)</Text>
      {savedLaborRecords.length > 0 && (
        <View style={{ marginBottom: 8 }}>
          <Text style={[styles.formLabel, { color: Colors.textSub, marginBottom: 4 }]}>저장된 인건비</Text>
          {savedLaborRecords.map((r) => (
            <View key={r.id} style={[styles.entryRow, { borderWidth: 1, borderColor: Colors.primaryLight, marginBottom: 4 }]}>
              <Text style={[styles.entryMain, { color: Colors.primary, flex: 1 }]}>
                ✓ {r.worker_name}
                {r.work_hours
                  ? ` · ${r.work_hours}h · ${Number(r.labor_cost).toLocaleString()}원`
                  : ` · ${Number(r.labor_cost).toLocaleString()}원`}
              </Text>
              <TouchableOpacity onPress={() => deleteSavedWorker(r.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.entryRemove}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
      {workers.length > 0 && (
        <View style={styles.entryList}>
          {workers.map((w, i) => (
            <View key={i}
              style={[styles.entryRow, i < workers.length - 1 && { borderBottomWidth: 1, borderBottomColor: Colors.primaryLight }]}>
              <Text style={styles.entryMain}>
                {w.name}{w.hours
                  ? ` · ${w.hours}h × ${Number(w.cost).toLocaleString()}원 = ${(parseFloat(w.hours) * parseFloat(w.cost)).toLocaleString()}원`
                  : ` · ${Number(w.cost).toLocaleString()}원`}
              </Text>
              <TouchableOpacity onPress={() => removeWorker(i)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.entryRemove}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
      <View style={styles.entryForm}>
        <View style={styles.workerRow}>
          <View style={{ flex: 2 }}>
            <Text style={styles.formLabel}>이름</Text>
            <TextInput style={styles.input} value={wName} onChangeText={setWName}
              placeholder="작업자 이름" placeholderTextColor={Colors.textLight} />
          </View>
          <View style={{ flex: 1, marginLeft: 6 }}>
            <Text style={styles.formLabel}>근무시간</Text>
            <TextInput style={styles.input} value={wHours} onChangeText={setWHours}
              placeholder="시간" placeholderTextColor={Colors.textLight} keyboardType="decimal-pad" />
          </View>
        </View>
        <Text style={[styles.formLabel, { marginTop: 6 }]}>시급 (원/h)</Text>
        <TextInput style={styles.input} value={wCost} onChangeText={setWCost}
          placeholder={String(MINIMUM_HOURLY_WAGE)} placeholderTextColor={Colors.textLight} keyboardType="decimal-pad" />
        {!!wHours && !!wCost && !isNaN(parseFloat(wCost)) && parseFloat(wHours) > 0 && (
          <Text style={[styles.formLabel, { color: Colors.primary, marginTop: 4 }]}>
            {`= ${(parseFloat(wHours) * parseFloat(wCost)).toLocaleString()}원 (${wHours}h × ${Number(wCost).toLocaleString()}원)`}
          </Text>
        )}
        {!!workerError && <Text style={styles.errorText}>{workerError}</Text>}
        <TouchableOpacity style={styles.addEntryBtn} onPress={addWorker}>
          <Text style={styles.addEntryBtnText}>+ 작업자 추가</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const headerTitle = isGroupEdit ? `${tabLabel} 수정` : isEdit ? `${tabLabel} 수정` : `${tabLabel} 입력`;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{headerTitle}</Text>
          {!isEdit && !isGroupEdit ? (
            <View style={styles.progressBadge}>
              <Text style={styles.progressText}>{currentStepDisplay}/{totalSteps}</Text>
            </View>
          ) : (
            <View style={{ width: 50 }} />
          )}
        </View>

        <ScrollView ref={scrollRef} style={styles.scroll} keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 120 }}>

          {isEdit ? (
            // ── 단일 레코드 수정 폼 ──
            <>
              <SectionCard label="날짜">
                <TouchableOpacity style={styles.fieldBtn} onPress={() => setShowCalendar(true)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <PhIcon name="calendar" size={16} color={Colors.primary} />
                    <Text style={styles.fieldBtnText}>{date}</Text>
                  </View>
                </TouchableOpacity>
              </SectionCard>
              <SectionCard label="농장">
                {farms.length === 0 ? (
                  <Text style={[styles.formLabel, { color: Colors.textSub }]}>
                    등록된 농장이 없습니다.
                  </Text>
                ) : (
                  <View style={styles.chipRow}>
                    {farms.map((f) => (
                      <TouchableOpacity key={f.id}
                        style={[styles.chip, farmId === f.id && styles.chipActive]}
                        onPress={() => { setFarmId(f.id); if (f.crop_type) setCropType(f.crop_type); }}>
                        <Text style={[styles.chipText, farmId === f.id && styles.chipTextActive]}>
                          {f.name}{f.is_primary ? ' ★' : ''}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </SectionCard>
              <SectionCard label="작물">
                {CropField()}
              </SectionCard>
              {tab === 'other' && (
                <SectionCard label="구분">
                  <View style={styles.chipRow}>
                    {([['gift', '나눔'], ['waste', '폐기']] as [OtherType, string][]).map(([k, l]) => (
                      <TouchableOpacity key={k} style={[styles.chip, otherType === k && styles.chipActive]}
                        onPress={() => setOtherType(k)}>
                        <Text style={[styles.chipText, otherType === k && styles.chipTextActive]}>{l}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </SectionCard>
              )}
              <SectionCard label="품종">
                <View style={styles.chipRow}>
                  {varieties.map((v) => (
                    <TouchableOpacity key={v}
                      style={[styles.chip, editVariety === v && !showEditVarietyInput && styles.chipActive]}
                      onPress={() => { setEditVariety(v); setShowEditVarietyInput(false); }}>
                      <Text style={[styles.chipText, editVariety === v && !showEditVarietyInput && styles.chipTextActive]}>{v}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={[styles.chip, styles.sizeChipAction, showEditVarietyInput && styles.chipActive]}
                    onPress={() => { setShowEditVarietyInput(true); setEditVariety(''); }}>
                    <Text style={[styles.chipText, showEditVarietyInput && styles.chipTextActive]}>직접 입력</Text>
                  </TouchableOpacity>
                </View>
                {(showEditVarietyInput || varieties.length === 0) && (
                  <TextInput style={[styles.input, { marginTop: 6 }]}
                    value={editVariety} onChangeText={setEditVariety}
                    placeholder="품종 직접 입력" placeholderTextColor={Colors.textLight} />
                )}
              </SectionCard>
              <SectionCard label="">
                <View style={styles.labelRow}>
                  <Text style={styles.formLabel}>사이즈</Text>
                  {sizeInfoData.length > 0 && (
                    <TouchableOpacity onPress={() => setEditShowSizeInfo(v => !v)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                      <PhIcon name="info" size={16} color={Colors.textSub} />
                    </TouchableOpacity>
                  )}
                </View>
                {editShowSizeInfo && sizeInfoData.length > 0 && (
                  <View style={styles.sizeInfoBox}>
                    {sizeInfoData.map((s) => (
                      <Text key={s.name} style={styles.sizeInfoText}>
                        {s.name}{s.range ? ` : ${s.range}` : ''}
                      </Text>
                    ))}
                  </View>
                )}
                <View style={styles.chipRow}>
                  {sizeOptions.map((s) => (
                    <TouchableOpacity key={s}
                      style={[styles.chip, !editCustomSizeMode && editSize === s && styles.chipActive]}
                      onPress={() => { setEditCustomSizeMode(false); setEditSize(editSize === s ? '' : s); }}>
                      <Text style={[styles.chipText, !editCustomSizeMode && editSize === s && styles.chipTextActive]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={[styles.chip, editCustomSizeMode && styles.chipActive]}
                    onPress={() => { setEditCustomSizeMode(true); setEditSize(''); }}>
                    <Text style={[styles.chipText, editCustomSizeMode && styles.chipTextActive]}>직접 입력</Text>
                  </TouchableOpacity>
                </View>
                {editCustomSizeMode && (
                  <TextInput style={[styles.input, { marginTop: 6 }]}
                    value={editSize} onChangeText={setEditSize}
                    placeholder="예) 왕왕특, 점보" placeholderTextColor={Colors.textLight} autoFocus />
                )}
              </SectionCard>
              <SectionCard label="수량">
                <View style={styles.qtyRow}>
                  <TextInput style={[styles.input, { flex: 1 }]} value={editQty} onChangeText={setEditQty}
                    keyboardType="decimal-pad" placeholder="0" placeholderTextColor={Colors.textLight} />
                  <View style={styles.unitChipRow}>
                    {unitOptions.map((u) => (
                      <TouchableOpacity key={u}
                        style={[styles.unitChip, editUnit === u && styles.chipActive]}
                        onPress={() => setEditUnit(u)}>
                        <Text style={[styles.chipText, editUnit === u && styles.chipTextActive]}>{u}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </SectionCard>
              {tab === 'sales' && (
                <SectionCard label="판매 정보">
                  <Text style={styles.subLabel}>단가 (원) *</Text>
                  <TextInput style={[styles.input, { marginBottom: 6 }]} value={pricePerUnit}
                    onChangeText={setPricePerUnit} keyboardType="decimal-pad"
                    placeholder="0" placeholderTextColor={Colors.textLight} />
                  <Text style={styles.subLabel}>수수료율 (%)</Text>
                  <TextInput style={[styles.input, { marginBottom: 6 }]} value={commissionRate}
                    onChangeText={setCommissionRate} keyboardType="decimal-pad"
                    placeholder="0" placeholderTextColor={Colors.textLight} />
                  <Text style={styles.subLabel}>부수비용 (원)</Text>
                  <TextInput style={[styles.input, { marginBottom: 6 }]} value={extraCost}
                    onChangeText={setExtraCost} keyboardType="decimal-pad"
                    placeholder="0" placeholderTextColor={Colors.textLight} />
                  <Text style={styles.subLabel}>구매자</Text>
                  <TextInput style={styles.input} value={buyer} onChangeText={setBuyer}
                    placeholder="구매자명" placeholderTextColor={Colors.textLight} />
                </SectionCard>
              )}
              {tab === 'other' && otherType === 'gift' && (
                <SectionCard label="받는 분">
                  <TextInput style={styles.input} value={recipient} onChangeText={setRecipient}
                    placeholder="친구, 지인, 이웃 등" placeholderTextColor={Colors.textLight} />
                </SectionCard>
              )}
              {tab === 'other' && (
                <SectionCard label="부수비용 (원)">
                  <TextInput style={styles.input} value={otherExtraCost} onChangeText={setOtherExtraCost}
                    keyboardType="decimal-pad" placeholder="0" placeholderTextColor={Colors.textLight} />
                </SectionCard>
              )}
              {tab !== 'sales' && (
                <SectionCard label="메모">
                  <TextInput style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
                    value={note} onChangeText={setNote}
                    placeholder="특이사항" placeholderTextColor={Colors.textLight} multiline />
                </SectionCard>
              )}
            </>
          ) : (
            // ── 신규 입력 / 그룹 수정 (스텝 위자드) ──
            <>
              {steps.map((stepId, stepIdx) => {
                if (stepIdx > activeStep) return null;
                const isActiveStep = stepIdx === activeStep;
                const valid = isStepValid(stepId);

                return (
                  <View key={stepId} style={[styles.stepCard, !isActiveStep && styles.stepCardDone]}>
                    <View style={styles.stepHeader}>
                      <View style={styles.stepBadge}>
                        <Text style={styles.stepBadgeText}>{stepIdx + 1}/{totalSteps}</Text>
                      </View>
                      <Text style={styles.stepLabel}>{getStepLabel(stepId, tab)}</Text>
                    </View>
                    <View style={styles.stepBody}>
                      {stepId === 'date' && (
                        <TouchableOpacity style={styles.fieldBtn} onPress={() => setShowCalendar(true)}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <PhIcon name="calendar" size={16} color={Colors.primary} />
                    <Text style={styles.fieldBtnText}>{date}</Text>
                  </View>
                        </TouchableOpacity>
                      )}
                      {stepId === 'farm' && (
                        farms.length === 0 ? (
                          <Text style={[styles.formLabel, { color: Colors.textSub }]}>
                            등록된 농장이 없습니다. 더보기 → 농장 설정에서 추가하세요.
                          </Text>
                        ) : (
                          <View style={styles.chipRow}>
                            {farms.map((f) => (
                              <TouchableOpacity key={f.id}
                                style={[styles.chip, farmId === f.id && styles.chipActive]}
                                onPress={() => { setFarmId(f.id); if (f.crop_type) setCropType(f.crop_type); }}>
                                <Text style={[styles.chipText, farmId === f.id && styles.chipTextActive]}>
                                  {f.name}{f.is_primary ? ' ★' : ''}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )
                      )}
                      {stepId === 'otherType' && (
                        <View style={styles.chipRow}>
                          {([['gift', '나눔'], ['waste', '폐기']] as [OtherType, string][]).map(([k, l]) => (
                            <TouchableOpacity key={k} style={[styles.chip, otherType === k && styles.chipActive]}
                              onPress={() => setOtherType(k)}>
                              <Text style={[styles.chipText, otherType === k && styles.chipTextActive]}>{l}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}

                      {stepId === 'saleType' && (
                        <>
                          <View style={styles.chipRow}>
                            {SALE_TYPE_OPTIONS.map((t) => (
                              <TouchableOpacity key={t}
                                style={[styles.chip, saleType === t && styles.chipActive]}
                                onPress={() => { setSaleType(t); if (t !== '기타') setCustomSaleType(''); }}>
                                <Text style={[styles.chipText, saleType === t && styles.chipTextActive]}>{t}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                          {saleType === '기타' && (
                            <TextInput style={[styles.input, { marginTop: 8 }]}
                              value={customSaleType} onChangeText={setCustomSaleType}
                              placeholder="판매 유형 직접 입력" placeholderTextColor={Colors.textLight}
                              autoFocus />
                          )}
                        </>
                      )}
                      {stepId === 'crop' && CropField(() => { if (valid && isActiveStep) advanceStep(); })}
                      {stepId === 'entries' && EntriesContent()}

                      {isActiveStep && !allStepsDone && (
                        <TouchableOpacity
                          style={[styles.nextBtn, !valid && styles.nextBtnDisabled]}
                          onPress={() => { if (valid) advanceStep(); }}
                          disabled={!valid}
                        >
                          <Text style={styles.nextBtnText}>
                            {valid ? '다음 →' : '값을 입력하면 다음으로 이동'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}

              {allStepsDone && (
                <>
                  {tab === 'harvest' && WorkersSection()}
                  <View style={styles.optionalSection}>
                    <Text style={styles.optionalTitle}>선택 항목</Text>
                    {tab === 'sales' && (
                      <>
                        <Text style={styles.formLabel}>수수료</Text>
                        <View style={styles.chipRow}>
                          {(['%', '원'] as const).map((t) => (
                            <TouchableOpacity key={t} style={[styles.chip, commissionType === t && styles.chipActive]}
                              onPress={() => setCommissionType(t)}>
                              <Text style={[styles.chipText, commissionType === t && styles.chipTextActive]}>
                                {t === '%' ? '비율 (%)' : '금액 (원)'}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        <TextInput style={[styles.input, { marginTop: 6, marginBottom: Spacing.sm }]}
                          value={commissionRate} onChangeText={setCommissionRate}
                          placeholder="없으면 비워두세요" placeholderTextColor={Colors.textLight}
                          keyboardType="decimal-pad" />
                        <Text style={styles.formLabel}>부수비용 (원)</Text>
                        <TextInput style={[styles.input, { marginBottom: Spacing.sm }]}
                          value={extraCost} onChangeText={setExtraCost}
                          placeholder="택배비, 포장비 등" placeholderTextColor={Colors.textLight}
                          keyboardType="decimal-pad" />
                        <Text style={styles.formLabel}>구매자</Text>
                        <TextInput style={styles.input} value={buyer} onChangeText={setBuyer}
                          placeholder="구매자명 또는 판매처" placeholderTextColor={Colors.textLight} />
                      </>
                    )}
                    {tab === 'harvest' && (
                      <>
                        <Text style={styles.formLabel}>메모</Text>
                        <TextInput style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
                          value={note} onChangeText={setNote}
                          placeholder="특이사항" placeholderTextColor={Colors.textLight} multiline />
                      </>
                    )}
                    {tab === 'other' && (
                      <>
                        {otherType === 'gift' && (
                          <>
                            <Text style={styles.formLabel}>받는 분</Text>
                            <TextInput style={[styles.input, { marginBottom: Spacing.sm }]}
                              value={recipient} onChangeText={setRecipient}
                              placeholder="친구, 지인, 이웃 등" placeholderTextColor={Colors.textLight} />
                          </>
                        )}
                        <Text style={styles.formLabel}>부수비용 (원)</Text>
                        <TextInput style={styles.input} value={otherExtraCost} onChangeText={setOtherExtraCost}
                          placeholder="관련 비용" placeholderTextColor={Colors.textLight}
                          keyboardType="decimal-pad" />
                      </>
                    )}
                  </View>
                </>
              )}
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {saving ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <TouchableOpacity
              style={[styles.saveBtn, (!isEdit && !isGroupEdit && !allStepsDone) && styles.saveBtnDimmed]}
              onPress={handleSave}
            >
              <Text style={styles.saveBtnText}>
                {isEdit || isGroupEdit ? '수정 저장' : allStepsDone ? `${tabLabel} 저장` : '모든 항목 입력 후 저장 가능'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      <CalendarModal visible={showCalendar} value={date}
        onSelect={(d) => { setDate(d); setShowCalendar(false); if (!isEdit && !isGroupEdit) advanceStep(); }}
        onClose={() => setShowCalendar(false)} />

      <EntryDetailModal
        visible={entryModalVisible}
        varieties={varieties}
        sizeOptions={sizeOptions}
        sizeInfoData={sizeInfoData}
        unitOptions={unitOptions}
        isSales={tab === 'sales'}
        onAdd={(entry) => {
          setEntryError('');
          setEntries(prev => sortEntries([...prev, entry], sizeOptions));
        }}
        onClose={() => setEntryModalVisible(false)}
      />
    </Modal>
  );
}

function SectionCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={cardStyles.card}>
      {!!label && <Text style={cardStyles.label}>{label}</Text>}
      {children}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    marginBottom: Spacing.sm, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  label: { ...Typography.bodyBold, marginBottom: Spacing.sm },
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.md, paddingTop: Spacing.lg,
    borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface,
  },
  closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 18, color: Colors.textSub },
  headerTitle: { ...Typography.h3 },
  progressBadge: {
    backgroundColor: Colors.primaryUltraLight, borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  progressText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  scroll: { flex: 1 },
  stepCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    marginBottom: Spacing.sm, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  stepCardDone: { borderColor: Colors.primaryLight },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  stepBadge: {
    backgroundColor: Colors.primaryUltraLight, borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  stepBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  stepLabel: { ...Typography.bodyBold },
  stepBody: {},
  fieldBtn: {
    backgroundColor: Colors.background, borderRadius: Radius.md,
    padding: 14, borderWidth: 1, borderColor: Colors.border,
  },
  fieldBtnText: { fontSize: 15, color: Colors.text, fontWeight: '500' },
  input: {
    backgroundColor: Colors.background, borderRadius: Radius.md,
    padding: 12, fontSize: 15, color: Colors.text,
    borderWidth: 1, borderColor: Colors.border,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  chipActive: { backgroundColor: Colors.primaryUltraLight, borderColor: Colors.primary },
  sizeChipAction: { borderColor: Colors.primary, borderStyle: 'dashed' },
  chipText: { fontSize: 13, color: Colors.textSub, fontWeight: '500' },
  chipTextActive: { color: Colors.primaryDark, fontWeight: '700' },
  nextBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: 12, alignItems: 'center', marginTop: Spacing.sm,
  },
  nextBtnDisabled: { backgroundColor: Colors.border },
  nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  entryList: {
    backgroundColor: Colors.primaryUltraLight, borderRadius: Radius.md,
    padding: Spacing.sm, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.primaryLight,
  },
  entryRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 8, paddingHorizontal: 4,
  },
  entryVarietyGroup: { marginBottom: 4 },
  entryVarietyGroupSep: { borderTopWidth: 1, borderTopColor: Colors.primaryLight, marginTop: 4, paddingTop: 6 },
  entryVarietyHeader: { fontSize: 12, fontWeight: '800', color: Colors.primaryDark, marginBottom: 2, paddingHorizontal: 2 },
  entrySizeBlock: { paddingVertical: 5, paddingHorizontal: 2 },
  entrySizeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  entrySizeLabel: { fontSize: 14, fontWeight: '700', color: Colors.text },
  entrySubtotalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, paddingHorizontal: 4, paddingVertical: 5, backgroundColor: Colors.surface, borderRadius: Radius.sm },
  entrySubtotalLabel: { fontSize: 11, fontWeight: '700', color: Colors.primaryDark },
  entrySubtotalValue: { fontSize: 13, fontWeight: '800', color: Colors.primaryDark },
  entryGrandTotalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, paddingHorizontal: 4, paddingVertical: 8, backgroundColor: Colors.primary, borderRadius: Radius.sm },
  entryGrandTotalLabel: { fontSize: 12, fontWeight: '800', color: '#fff' },
  entryGrandTotalValue: { fontSize: 14, fontWeight: '800', color: '#fff' },
  entryBlock: { paddingVertical: 10 },
  entryBlockBorder: { borderBottomWidth: 1, borderBottomColor: Colors.primaryLight },
  entryBlockHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  entryEditRow: { flexDirection: 'row', gap: 10 },
  entryEditGroup: { flex: 1 },
  entryEditLabel: { fontSize: 11, fontWeight: '600', color: Colors.textSub, marginBottom: 3 },
  entryEditInline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  entryEditInput: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: Radius.sm,
    paddingHorizontal: 8, paddingVertical: 6, fontSize: 14, color: Colors.text,
    borderWidth: 1, borderColor: Colors.primaryLight,
  },
  entryEditUnit: { fontSize: 12, color: Colors.textSub, fontWeight: '600' },
  entryMain: { fontSize: 14, fontWeight: '700', color: Colors.primaryDark },
  entrySub: { fontSize: 12, color: Colors.textSub, marginTop: 2 },
  entryRemove: { fontSize: 15, color: Colors.danger, paddingLeft: 10 },
  harvestImportBtn: {
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    paddingVertical: 12, alignItems: 'center', marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  harvestImportText: { fontSize: 14, fontWeight: '700', color: Colors.primaryDark },
  entryForm: {
    backgroundColor: Colors.background, borderRadius: Radius.md,
    padding: Spacing.sm, borderWidth: 1, borderColor: Colors.border,
  },
  formLabel: { ...Typography.label, marginBottom: 4, marginTop: Spacing.xs },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoIcon: { fontSize: 15, color: Colors.primary, fontWeight: '700', width: 20, textAlign: 'center' },
  sizeInfoBox: {
    backgroundColor: Colors.primaryUltraLight, borderRadius: Radius.sm,
    padding: Spacing.sm, marginVertical: 4,
  },
  sizeInfoText: { ...Typography.caption, color: Colors.primaryDark, marginVertical: 1 },
  sizeHint: { fontSize: 11, color: Colors.textLight, marginTop: 4, marginLeft: 2, marginBottom: -2 },
  qtyRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  unitChipRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  unitChip: {
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  errorText: { fontSize: 12, color: Colors.danger, marginTop: 6, fontWeight: '600' },
  addEntryBtn: {
    backgroundColor: Colors.primaryUltraLight, borderRadius: Radius.md,
    paddingVertical: 12, alignItems: 'center', marginTop: Spacing.sm,
    borderWidth: 1, borderColor: Colors.primaryLight,
  },
  addEntryBtnText: { color: Colors.primaryDark, fontWeight: '700', fontSize: 14 },
  addEntryBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.primaryLight, borderStyle: 'dashed',
    paddingVertical: 16, marginTop: Spacing.sm,
  },
  addEntryBoxIcon: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  addEntryBoxPlus: { color: '#fff', fontSize: 18, fontWeight: '700', lineHeight: 20 },
  addEntryBoxText: { fontSize: 15, fontWeight: '700', color: Colors.primaryDark },
  workerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 0 },
  optionalSection: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm,
  },
  optionalTitle: { ...Typography.bodyBold, color: Colors.textSub, marginBottom: Spacing.sm },
  subLabel: { ...Typography.label, marginBottom: 4 },
  footer: {
    padding: Spacing.lg, paddingBottom: Spacing.xl,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: 16, alignItems: 'center',
  },
  saveBtnDimmed: { backgroundColor: Colors.border },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
