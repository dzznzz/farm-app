import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity,
  Modal, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { CalendarModal } from './CalendarModal';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';
import { DisplayRecord } from './RecordDetailModal';

type TabType = 'harvest' | 'sales' | 'other';
type OtherType = 'gift' | 'waste';

interface Farm { id: string; name: string; crop_type: string; is_primary?: boolean }
interface Entry { variety: string; size: string; quantity: string; unit: string }
interface WorkerEntry { name: string; hours: string; cost: string }
interface SizeInfo { name: string; range: string }

interface Props {
  visible: boolean;
  tab: TabType;
  farms: Farm[];
  userId: string;
  onClose: () => void;
  onSaved: () => void;
  editRecord?: DisplayRecord;
}

const BLUEBERRY_SIZES = ['대', '특', '왕특', '왕왕특'];
const DEFAULT_UNITS = ['kg', '박스'];

function getStepIds(tab: TabType): string[] {
  if (tab === 'harvest') return ['date', 'farm', 'crop', 'entries'];
  if (tab === 'sales')   return ['date', 'farm', 'crop', 'entries', 'price'];
  return                        ['date', 'farm', 'otherType', 'crop', 'entries'];
}

function getStepLabel(id: string, tab: TabType): string {
  const map: Record<string, string> = {
    date: '날짜', farm: '농장', crop: '작물', otherType: '구분',
    entries: tab === 'harvest' ? '수확 내역' : tab === 'sales' ? '판매 내역' : '수량 내역',
    price: '단가 (원)',
  };
  return map[id] ?? id;
}

export function InputFormModal({ visible, tab, farms, userId, onClose, onSaved, editRecord }: Props) {
  const isEdit = !!editRecord;
  const today = new Date().toISOString().split('T')[0];
  const scrollRef = useRef<ScrollView>(null);

  // Step navigation (create mode only)
  const steps = getStepIds(tab);
  const [activeStep, setActiveStep] = useState(0); // 0 = first step active

  // Base fields
  const [date, setDate] = useState(today);
  const primaryFarm = farms.find(f => f.is_primary) ?? farms[0];
  const [farmId, setFarmId] = useState(primaryFarm?.id ?? '');
  const [cropType, setCropType] = useState(primaryFarm?.crop_type ?? '블루베리');
  const [otherType, setOtherType] = useState<OtherType>('gift');

  // Multi-entry (create mode)
  const [entries, setEntries] = useState<Entry[]>([]);
  const [newVariety, setNewVariety] = useState('');
  const [newSize, setNewSize] = useState('');
  const [customSizeMode, setCustomSizeMode] = useState(false);
  const [newQty, setNewQty] = useState('');
  const [newUnit, setNewUnit] = useState('kg');
  const [entryError, setEntryError] = useState('');
  const [showSizeInfo, setShowSizeInfo] = useState(false);

  // Edit mode single-entry fields
  const [editVariety, setEditVariety] = useState('');
  const [editSize, setEditSize] = useState('');
  const [editCustomSizeMode, setEditCustomSizeMode] = useState(false);
  const [editShowSizeInfo, setEditShowSizeInfo] = useState(false);
  const [editQty, setEditQty] = useState('');
  const [editUnit, setEditUnit] = useState('kg');

  // Workers (harvest only)
  const [workers, setWorkers] = useState<WorkerEntry[]>([]);
  const [wName, setWName] = useState('');
  const [wHours, setWHours] = useState('');
  const [wCost, setWCost] = useState('');
  const [workerError, setWorkerError] = useState('');

  // Sales
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [commissionRate, setCommissionRate] = useState('');
  const [commissionType, setCommissionType] = useState<'%' | '원'>('%');
  const [extraCost, setExtraCost] = useState('');
  const [buyer, setBuyer] = useState('');

  // Other
  const [recipient, setRecipient] = useState('');
  const [otherExtraCost, setOtherExtraCost] = useState('');
  const [note, setNote] = useState('');

  // DB options
  const [varieties, setVarieties] = useState<string[]>([]);
  const [sizeOptions, setSizeOptions] = useState<string[]>(BLUEBERRY_SIZES);
  const [sizeInfoData, setSizeInfoData] = useState<SizeInfo[]>([]);
  const [unitOptions, setUnitOptions] = useState<string[]>(DEFAULT_UNITS);
  const [showCalendar, setShowCalendar] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setActiveStep(0);
    const pFarm = farms.find(f => f.is_primary) ?? farms[0];
    setDate(today); setFarmId(pFarm?.id ?? ''); setCropType(pFarm?.crop_type ?? '블루베리');
    setOtherType('gift'); setEntries([]);
    setNewVariety(''); setNewSize(''); setCustomSizeMode(false); setNewQty(''); setNewUnit('kg');
    setEntryError(''); setShowSizeInfo(false);
    setEditVariety(''); setEditSize(''); setEditCustomSizeMode(false);
    setEditShowSizeInfo(false); setEditQty(''); setEditUnit('kg');
    setWorkers([]); setWName(''); setWHours(''); setWCost(''); setWorkerError('');
    setPricePerUnit(''); setCommissionRate(''); setCommissionType('%'); setExtraCost(''); setBuyer('');
    setRecipient(''); setOtherExtraCost(''); setNote('');
  };

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
    }
  }, [visible, editRecord]);

  // 모달 열릴 때 / farms 로드될 때 대표 농장 기본 선택 (등록·수정 공통)
  useEffect(() => {
    if (visible && !farmId && farms.length > 0) {
      const pFarm = farms.find(f => f.is_primary) ?? farms[0];
      setFarmId(pFarm.id);
      if (!isEdit && pFarm.crop_type) setCropType(pFarm.crop_type);
    }
  }, [visible, farms]);

  useEffect(() => {
    if (!visible) return;
    supabase.from('harvest_units').select('name').order('sort_order').then(({ data }) => {
      if (data?.length) setUnitOptions(data.map((u) => u.name));
    });
  }, [visible]);

  useEffect(() => {
    if (!cropType) return;
    supabase.from('varieties_master').select('name').eq('crop_type', cropType).order('sort_order')
      .then(({ data }) => { setVarieties(data?.length ? data.map((v: any) => v.name) : []); });
    supabase.from('sizes_master').select('name, range_info').eq('crop_type', cropType).order('sort_order')
      .then(({ data }) => {
        const opts = data?.length ? data.map((s: any) => s.name) : BLUEBERRY_SIZES;
        setSizeOptions(opts);
        setSizeInfoData(data?.length ? data.map((s: any) => ({ name: s.name, range: s.range_info ?? '' })) : []);
        // edit 모드: 기존 사이즈가 목록에 없으면 직접입력 모드
        if (isEdit && editRecord?.size && !opts.includes(editRecord.size)) {
          setEditCustomSizeMode(true);
        }
      });
  }, [cropType]);

  // ── Step helpers ──
  const isStepValid = (id: string): boolean => {
    if (id === 'date' || id === 'otherType' || id === 'farm') return true;
    if (id === 'crop') return !!cropType.trim();
    if (id === 'entries') return entries.length > 0;
    if (id === 'price') return !!pricePerUnit.trim() && !isNaN(parseFloat(pricePerUnit));
    return true;
  };

  const advanceStep = () => {
    setActiveStep((prev) => prev + 1);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 250);
  };

  // ── Entry helpers ──
  const addEntry = () => {
    if (!newVariety.trim()) { setEntryError('품종을 입력해주세요.'); return; }
    if (!newSize.trim()) { setEntryError('사이즈를 선택하거나 입력해주세요.'); return; }
    if (!newQty.trim() || isNaN(parseFloat(newQty))) { setEntryError('수량을 올바르게 입력해주세요.'); return; }
    setEntryError('');
    setEntries((prev) => [...prev, { variety: newVariety.trim(), size: newSize.trim(), quantity: newQty.trim(), unit: newUnit }]);
    setNewSize(''); setCustomSizeMode(false); setNewQty('');
  };

  const removeEntry = (i: number) => setEntries((prev) => prev.filter((_, idx) => idx !== i));

  // ── Worker helpers ──
  const addWorker = () => {
    if (!wName.trim()) { setWorkerError('이름을 입력해주세요.'); return; }
    if (!wCost.trim() || isNaN(parseFloat(wCost))) { setWorkerError('인건비를 입력해주세요.'); return; }
    setWorkerError('');
    setWorkers((prev) => [...prev, { name: wName.trim(), hours: wHours.trim(), cost: wCost.trim() }]);
    setWName(''); setWHours(''); setWCost('');
  };

  const removeWorker = (i: number) => setWorkers((prev) => prev.filter((_, idx) => idx !== i));

  // ── Save ──
  const validate = (): string | null => {
    if (!date) return '날짜를 선택해주세요.';
    if (!cropType.trim()) return '작물을 입력해주세요.';
    if (tab === 'other' && !otherType) return '구분을 선택해주세요.';

    if (isEdit) {
      if (!editVariety.trim()) return '품종을 입력해주세요.';
      if (!editSize.trim()) return '사이즈를 입력해주세요.';
      if (!editQty.trim() || isNaN(parseFloat(editQty))) return '수량을 올바르게 입력해주세요.';
    } else {
      if (entries.length === 0) return '항목을 1개 이상 추가해주세요.';
      for (const e of entries) {
        if (!e.variety.trim()) return '품종이 비어있는 항목이 있습니다.';
        if (!e.size.trim()) return '사이즈가 비어있는 항목이 있습니다.';
      }
    }

    if (tab === 'sales') {
      if (!pricePerUnit.trim() || isNaN(parseFloat(pricePerUnit))) return '단가를 입력해주세요.';
    }
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { Alert.alert('입력 오류', err); return; }
    setSaving(true);
    try {
      const baseFields = { user_id: userId, farm_id: farmId || null, date, crop_type: cropType || null };

      if (isEdit && editRecord) {
        // ── UPDATE single record ──
        const qty = parseFloat(editQty);

        if (editRecord.type === 'harvest') {
          await supabase.from('harvest_records').update({
            farm_id: farmId || null, date, crop_type: cropType || null,
            variety: editVariety || null, size: editSize || null,
            quantity: qty, unit: editUnit || null, note: note || null,
          }).eq('id', editRecord.id).throwOnError();

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
            extra_cost: eCost > 0 ? eCost : null, note: note || null,
          }).eq('id', editRecord.id).throwOnError();
        }

      } else {
        // ── INSERT multiple records ──
        if (tab === 'harvest') {
          const rows = entries.map((e) => ({
            ...baseFields, variety: e.variety || null, size: e.size || null,
            quantity: parseFloat(e.quantity), unit: e.unit, note: note || null,
          }));
          await supabase.from('harvest_records').insert(rows).throwOnError();

          if (workers.length > 0) {
            const laborRows = workers.map((w) => ({
              user_id: userId, date,
              worker_name: w.name,
              work_hours: w.hours ? parseFloat(w.hours) : null,
              labor_cost: parseFloat(w.cost) || 0,
            }));
            await supabase.from('labor_records').insert(laborRows).throwOnError();
          }

        } else if (tab === 'sales') {
          const price = parseFloat(pricePerUnit);
          const cInput = parseFloat(commissionRate || '0') || 0;
          const eCost = parseFloat(extraCost || '0') || 0;
          const rows = entries.map((e) => {
            const qty = parseFloat(e.quantity);
            const rev = qty * price;
            const cAmt = commissionType === '%' ? rev * cInput / 100 : cInput;
            return {
              ...baseFields, variety: e.variety || null, size: e.size || null, quantity: qty,
              price_per_unit: price, total_revenue: rev, buyer: buyer || null,
              commission_rate: commissionType === '%' ? cInput : 0,
              commission_amount: cAmt, extra_cost: eCost,
            };
          });
          await supabase.from('sales_records').insert(rows).throwOnError();

        } else {
          const eCost = parseFloat(otherExtraCost || '0') || 0;
          const rows = entries.map((e) => ({
            ...baseFields, variety: e.variety || null, size: e.size || null,
            quantity: parseFloat(e.quantity), unit: e.unit,
            type: otherType, recipient: otherType === 'gift' ? (recipient || null) : null,
            extra_cost: eCost > 0 ? eCost : null, note: note || null,
          }));
          await supabase.from('other_records').insert(rows).throwOnError();
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

  // Required count for progress badge (create mode)
  const currentStepDisplay = Math.min(activeStep + 1, totalSteps);

  // ── Entries step content ──
  const EntriesContent = () => (
    <>
      {entries.length > 0 && (
        <View style={styles.entryList}>
          {entries.map((e, i) => (
            <View key={i} style={[styles.entryRow, i < entries.length - 1 && { borderBottomWidth: 1, borderBottomColor: Colors.primaryLight }]}>
              <Text style={styles.entryText}>{e.variety} · {e.size} · {e.quantity}{e.unit}</Text>
              <TouchableOpacity onPress={() => removeEntry(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.entryRemove}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <View style={styles.entryForm}>
        {/* 품종 */}
        <Text style={styles.formLabel}>품종</Text>
        {varieties.length > 0 && (
          <View style={styles.chipRow}>
            {varieties.map((v) => (
              <TouchableOpacity key={v} style={[styles.chip, newVariety === v && styles.chipActive]}
                onPress={() => setNewVariety(v)}>
                <Text style={[styles.chipText, newVariety === v && styles.chipTextActive]}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <TextInput style={[styles.input, { marginTop: 6 }]} value={newVariety} onChangeText={setNewVariety}
          placeholder="품종 선택 또는 직접 입력" placeholderTextColor={Colors.textLight} />

        {/* 사이즈 */}
        <View style={styles.labelRow}>
          <Text style={styles.formLabel}>사이즈</Text>
          {sizeInfoData.length > 0 && (
            <TouchableOpacity onPress={() => setShowSizeInfo((v) => !v)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Text style={styles.infoIcon}>ℹ</Text>
            </TouchableOpacity>
          )}
        </View>
        {showSizeInfo && sizeInfoData.length > 0 && (
          <View style={styles.sizeInfoBox}>
            {sizeInfoData.map((s) => (
              <Text key={s.name} style={styles.sizeInfoText}>{s.name}{s.range ? ` : ${s.range}` : ''}</Text>
            ))}
          </View>
        )}
        <View style={styles.chipRow}>
          {sizeOptions.map((s) => (
            <TouchableOpacity key={s}
              style={[styles.chip, !customSizeMode && newSize === s && styles.chipActive]}
              onPress={() => { setCustomSizeMode(false); setNewSize(newSize === s ? '' : s); }}>
              <Text style={[styles.chipText, !customSizeMode && newSize === s && styles.chipTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.chip, customSizeMode && styles.chipActive]}
            onPress={() => { setCustomSizeMode(true); setNewSize(''); }}>
            <Text style={[styles.chipText, customSizeMode && styles.chipTextActive]}>직접 입력</Text>
          </TouchableOpacity>
        </View>
        {customSizeMode && (
          <TextInput style={[styles.input, { marginTop: 6 }]} value={newSize} onChangeText={setNewSize}
            placeholder="예) 왕왕특, 점보" placeholderTextColor={Colors.textLight} autoFocus />
        )}

        {/* 수량 */}
        <Text style={[styles.formLabel, { marginTop: Spacing.sm }]}>수량</Text>
        <View style={styles.qtyRow}>
          <TextInput style={[styles.input, { flex: 1 }]} value={newQty} onChangeText={setNewQty}
            placeholder="0" placeholderTextColor={Colors.textLight} keyboardType="decimal-pad" />
          <View style={styles.unitChipRow}>
            {unitOptions.map((u) => (
              <TouchableOpacity key={u} style={[styles.unitChip, newUnit === u && styles.chipActive]}
                onPress={() => setNewUnit(u)}>
                <Text style={[styles.chipText, newUnit === u && styles.chipTextActive]}>{u}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {entryError ? <Text style={styles.errorText}>{entryError}</Text> : null}
        <TouchableOpacity style={styles.addEntryBtn} onPress={addEntry}>
          <Text style={styles.addEntryBtnText}>+ 항목 추가</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  // ── Workers section (create harvest only) ──
  const WorkersSection = () => (
    <View style={styles.optionalSection}>
      <Text style={styles.optionalTitle}>작업자 정보 (선택)</Text>

      {workers.length > 0 && (
        <View style={styles.entryList}>
          {workers.map((w, i) => (
            <View key={i} style={[styles.entryRow, i < workers.length - 1 && { borderBottomWidth: 1, borderBottomColor: Colors.primaryLight }]}>
              <Text style={styles.entryText}>
                {w.name}{w.hours ? ` · ${w.hours}h` : ''} · {Number(w.cost).toLocaleString()}원
              </Text>
              <TouchableOpacity onPress={() => removeWorker(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
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
        <Text style={[styles.formLabel, { marginTop: 6 }]}>인건비 (원)</Text>
        <TextInput style={styles.input} value={wCost} onChangeText={setWCost}
          placeholder="0" placeholderTextColor={Colors.textLight} keyboardType="decimal-pad" />
        {workerError ? <Text style={styles.errorText}>{workerError}</Text> : null}
        <TouchableOpacity style={styles.addEntryBtn} onPress={addWorker}>
          <Text style={styles.addEntryBtnText}>+ 작업자 추가</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEdit ? `${tabLabel} 수정` : `${tabLabel} 입력`}</Text>
          {!isEdit && (
            <View style={styles.progressBadge}>
              <Text style={styles.progressText}>{currentStepDisplay}/{totalSteps}</Text>
            </View>
          )}
          {isEdit && <View style={{ width: 50 }} />}
        </View>

        <ScrollView ref={scrollRef} style={styles.scroll} keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 120 }}>

          {isEdit ? (
            /* ═══ EDIT MODE: same rich form as create ═══ */
            <>
              {/* 날짜 */}
              <SectionCard label="날짜">
                <TouchableOpacity style={styles.fieldBtn} onPress={() => setShowCalendar(true)}>
                  <Text style={styles.fieldBtnText}>📅 {date}</Text>
                </TouchableOpacity>
              </SectionCard>

              {/* 농장 */}
              <SectionCard label="농장">
                {farms.length === 0 ? (
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
                )}
              </SectionCard>

              {/* 작물 */}
              <SectionCard label="작물">
                <TextInput style={styles.input} value={cropType} onChangeText={setCropType}
                  placeholder="예) 블루베리, 딸기" placeholderTextColor={Colors.textLight} />
              </SectionCard>

              {/* 기타 구분 */}
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

              {/* 품종 */}
              <SectionCard label="품종">
                {varieties.length > 0 && (
                  <View style={styles.chipRow}>
                    {varieties.map((v) => (
                      <TouchableOpacity key={v}
                        style={[styles.chip, editVariety === v && styles.chipActive]}
                        onPress={() => setEditVariety(v)}>
                        <Text style={[styles.chipText, editVariety === v && styles.chipTextActive]}>{v}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                <TextInput style={[styles.input, { marginTop: varieties.length > 0 ? 6 : 0 }]}
                  value={editVariety} onChangeText={setEditVariety}
                  placeholder="품종 선택 또는 직접 입력" placeholderTextColor={Colors.textLight} />
              </SectionCard>

              {/* 사이즈 */}
              <SectionCard label="">
                <View style={styles.labelRow}>
                  <Text style={styles.formLabel}>사이즈</Text>
                  {sizeInfoData.length > 0 && (
                    <TouchableOpacity onPress={() => setEditShowSizeInfo((v) => !v)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                      <Text style={styles.infoIcon}>ℹ</Text>
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
                  <TouchableOpacity
                    style={[styles.chip, editCustomSizeMode && styles.chipActive]}
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

              {/* 수량 + 단위 */}
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

              {/* 판매 정보 */}
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
            /* ═══ CREATE MODE: step wizard ═══ */
            <>
              {steps.map((stepId, stepIdx) => {
                if (stepIdx > activeStep) return null;
                const isActiveStep = stepIdx === activeStep;
                const valid = isStepValid(stepId);
                const stepNum = stepIdx + 1;

                return (
                  <View key={stepId} style={[styles.stepCard, !isActiveStep && styles.stepCardDone]}>
                    {/* Step header */}
                    <View style={styles.stepHeader}>
                      <View style={styles.stepBadge}>
                        <Text style={styles.stepBadgeText}>{stepNum}/{totalSteps}</Text>
                      </View>
                      <Text style={styles.stepLabel}>{getStepLabel(stepId, tab)}</Text>
                    </View>

                    {/* Step body - always visible even for done steps */}
                    <View style={styles.stepBody}>
                      {/* DATE */}
                      {stepId === 'date' && (
                        <TouchableOpacity style={styles.fieldBtn} onPress={() => setShowCalendar(true)}>
                          <Text style={styles.fieldBtnText}>📅 {date}</Text>
                        </TouchableOpacity>
                      )}

                      {/* FARM */}
                      {stepId === 'farm' && (
                        farms.length === 0 ? (
                          <Text style={[styles.formLabel, { color: Colors.textSub }]}>등록된 농장이 없습니다. 더보기 → 농장 설정에서 추가하세요.</Text>
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

                      {/* OTHERTYPE */}
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

                      {/* CROP */}
                      {stepId === 'crop' && (
                        <TextInput style={styles.input} value={cropType} onChangeText={setCropType}
                          placeholder="예) 블루베리, 딸기" placeholderTextColor={Colors.textLight}
                          returnKeyType="done"
                          onSubmitEditing={() => { if (valid && isActiveStep) advanceStep(); }} />
                      )}

                      {/* ENTRIES */}
                      {stepId === 'entries' && EntriesContent()}

                      {/* PRICE */}
                      {stepId === 'price' && (
                        <TextInput style={styles.input} value={pricePerUnit} onChangeText={setPricePerUnit}
                          placeholder="0" placeholderTextColor={Colors.textLight}
                          keyboardType="decimal-pad" returnKeyType="done"
                          onSubmitEditing={() => { if (valid && isActiveStep) advanceStep(); }} />
                      )}

                      {/* 다음 버튼: 현재 active 스텝에만 표시 */}
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

              {/* 모든 스텝 완료 후 optional 섹션 */}
              {allStepsDone && (
                <>
                  {/* 작업자 (수확) */}
                  {tab === 'harvest' && WorkersSection()}

                  {/* Optional fields */}
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

        {/* 저장 버튼 */}
        <View style={styles.footer}>
          {saving ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <TouchableOpacity
              style={[styles.saveBtn, (!isEdit && !allStepsDone) && styles.saveBtnDimmed]}
              onPress={handleSave}
            >
              <Text style={styles.saveBtnText}>
                {isEdit ? '수정 저장' : allStepsDone ? `${tabLabel} 저장` : '모든 항목 입력 후 저장 가능'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      <CalendarModal visible={showCalendar} value={date}
        onSelect={(d) => { setDate(d); setShowCalendar(false); if (!isEdit) advanceStep(); }}
        onClose={() => setShowCalendar(false)} />
    </Modal>
  );
}

// ── Sub-components ──

function SectionCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={cardStyles.card}>
      <Text style={cardStyles.label}>{label}</Text>
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
  // Step cards
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
  // Fields
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
  chipText: { fontSize: 13, color: Colors.textSub, fontWeight: '500' },
  chipTextActive: { color: Colors.primaryDark, fontWeight: '700' },
  // Next button
  nextBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: 12, alignItems: 'center', marginTop: Spacing.sm,
  },
  nextBtnDisabled: { backgroundColor: Colors.border },
  nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  // Entry
  entryList: {
    backgroundColor: Colors.primaryUltraLight, borderRadius: Radius.md,
    padding: Spacing.sm, marginBottom: Spacing.sm,
  },
  entryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 5 },
  entryText: { ...Typography.caption, color: Colors.primaryDark, flex: 1 },
  entryRemove: { fontSize: 14, color: Colors.danger, paddingLeft: 8 },
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
  // Workers
  workerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 0 },
  // Optional section
  optionalSection: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm,
  },
  optionalTitle: { ...Typography.bodyBold, color: Colors.textSub, marginBottom: Spacing.sm },
  // Edit mode
  row3: { flexDirection: 'row', alignItems: 'flex-end' },
  subLabel: { ...Typography.label, marginBottom: 4 },
  // Footer
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
