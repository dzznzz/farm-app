import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Toast, useToast } from '../../components/ui/Toast';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';
import { CalendarModal } from '../../components/modals/CalendarModal';
import { SelectModal } from '../../components/modals/SelectModal';
import { SizeInfoModal, SizeData } from '../../components/modals/SizeInfoModal';

type TabType = 'harvest' | 'sales' | 'other';
type OtherType = 'gift' | 'waste';

const BLUEBERRY_SIZES = ['대', '특', '왕특', '왕왕특'];
const DEFAULT_SIZE_INFO: SizeData[] = [
  { name: '대', range: '14~16mm' },
  { name: '특', range: '16~18mm' },
  { name: '왕특', range: '18~20mm' },
  { name: '왕왕특', range: '20mm 이상' },
];
const DEFAULT_UNITS = ['kg', '박스'];

export default function InputScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabType>('harvest');
  const [farms, setFarms] = useState<{ id: string; name: string; crop_type: string }[]>([]);
  const [varieties, setVarieties] = useState<string[]>(['신틸라']);
  const [sizeOptions, setSizeOptions] = useState<string[]>(BLUEBERRY_SIZES);
  const [sizeInfoData, setSizeInfoData] = useState<SizeData[]>(DEFAULT_SIZE_INFO);
  const [unitOptions, setUnitOptions] = useState<string[]>(DEFAULT_UNITS);
  const [selectedFarm, setSelectedFarm] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [cropType, setCropType] = useState('블루베리');
  const [variety, setVariety] = useState('신틸라');
  const [size, setSize] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kg');
  const [customUnit, setCustomUnit] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [buyer, setBuyer] = useState('');
  const [note, setNote] = useState('');
  const [otherType, setOtherType] = useState<OtherType>('gift');
  const [recipient, setRecipient] = useState('');
  const [commissionRate, setCommissionRate] = useState('');
  const [extraCost, setExtraCost] = useState('');
  const [expenseTypes, setExpenseTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const { toastMessage, toastVisible, showToast } = useToast();
  const [showVarietySelect, setShowVarietySelect] = useState(false);
  const [showSizeInfo, setShowSizeInfo] = useState(false);

  // Fetch master data from DB
  useEffect(() => {
    supabase.from('harvest_units').select('name').order('sort_order').then(({ data }) => {
      if (data?.length) setUnitOptions(data.map((u) => u.name));
    });
    supabase.from('expense_types').select('name').order('sort_order').then(({ data }) => {
      if (data?.length) setExpenseTypes(data.map((e: any) => e.name));
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from('farms').select('id, name, crop_type').eq('user_id', user.id)
      .then(({ data }) => {
        if (data?.length) {
          setFarms(data);
          setSelectedFarm(data[0].id);
          if (data[0].crop_type) setCropType(data[0].crop_type);
        }
      });
  }, [user]);

  useEffect(() => {
    if (!cropType) return;
    // Fetch varieties from master table
    supabase.from('varieties_master').select('name').eq('crop_type', cropType).order('sort_order')
      .then(({ data }) => {
        if (data?.length) {
          const names = data.map((v: any) => v.name);
          setVarieties(names);
          if (!names.includes(variety)) setVariety(names[0]);
        } else {
          // Fallback to legacy varieties table
          supabase.from('varieties').select('name').eq('crop_type', cropType)
            .then(({ data: legacy }) => {
              if (legacy?.length) {
                const names = legacy.map((v: any) => v.name);
                setVarieties(names);
                if (!names.includes(variety)) setVariety(names[0]);
              }
            });
        }
      });

    // Fetch sizes from master table
    supabase.from('sizes_master').select('name, range_info').eq('crop_type', cropType).order('sort_order')
      .then(({ data }) => {
        if (data?.length) {
          setSizeOptions(data.map((s: any) => s.name));
          setSizeInfoData(data.map((s: any) => ({ name: s.name, range: s.range_info ?? '' })));
        } else {
          // Fallback to hardcoded
          setSizeOptions(BLUEBERRY_SIZES);
          setSizeInfoData(DEFAULT_SIZE_INFO);
        }
      });
  }, [cropType]);

  const finalUnit = unit === '직접입력' ? customUnit : unit;
  const allUnitOptions = [...unitOptions, '직접입력'];

  const handleFarmSelect = (farm: { id: string; name: string; crop_type: string }) => {
    setSelectedFarm(farm.id);
    if (farm.crop_type) setCropType(farm.crop_type);
  };

  const resetForm = () => {
    setQuantity(''); setPricePerUnit(''); setBuyer(''); setNote('');
    setSize(''); setRecipient(''); setCommissionRate(''); setExtraCost('');
  };

  const handleSave = async () => {
    if (!user) return;
    if (!date) { Alert.alert('입력 오류', '날짜를 선택해주세요.'); return; }
    if (!cropType.trim()) { Alert.alert('입력 오류', '작물을 입력해주세요.'); return; }
    if (!variety.trim()) { Alert.alert('입력 오류', '품종을 선택해주세요.'); return; }
    if (tab !== 'other' && !size.trim()) { Alert.alert('입력 오류', '사이즈를 선택하거나 입력해주세요.'); return; }
    if (!quantity || isNaN(parseFloat(quantity))) { Alert.alert('입력 오류', '수량을 올바르게 입력해주세요.'); return; }
    if (unit === '직접입력' && !customUnit.trim()) { Alert.alert('입력 오류', '단위를 직접 입력해주세요.'); return; }

    setLoading(true);

    const baseFields = {
      user_id: user.id,
      farm_id: selectedFarm || null,
      date,
      crop_type: cropType || null,
      variety: variety || null,
      size: size || null,
      quantity: parseFloat(quantity),
      unit: finalUnit,
    };

    if (tab === 'harvest') {
      const { error } = await supabase.from('harvest_records').insert({ ...baseFields, note: note || null });
      if (error) showToast(`저장 실패: ${error.message}`);
      else { showToast('저장되었습니다.'); resetForm(); }

    } else if (tab === 'sales') {
      const price = parseFloat(pricePerUnit);
      if (!pricePerUnit || isNaN(price)) {
        Alert.alert('입력 오류', '단가를 입력하세요.');
        setLoading(false);
        return;
      }
      const totalRevenue = parseFloat(quantity) * price;
      const cRate = parseFloat(commissionRate || '0') || 0;
      const cAmount = totalRevenue * cRate / 100;
      const eCost = parseFloat(extraCost || '0') || 0;
      // unit column excluded until supabase_migration_003.sql is applied
      const { unit: _unit, ...salesBase } = baseFields;
      const { error } = await supabase.from('sales_records').insert({
        ...salesBase,
        price_per_unit: price,
        total_revenue: totalRevenue,
        buyer: buyer || null,
        commission_rate: cRate,
        commission_amount: cAmount,
        extra_cost: eCost,
      });
      if (error) showToast(`저장 실패: ${error.message}`);
      else { showToast('저장되었습니다.'); resetForm(); }

    } else {
      const { error } = await supabase.from('other_records').insert({
        ...baseFields,
        type: otherType,
        recipient: otherType === 'gift' ? (recipient || null) : null,
        note: note || null,
      });
      if (error) showToast(`저장 실패: ${error.message}`);
      else { showToast('저장되었습니다.'); resetForm(); }
    }
    setLoading(false);
  };

  const TABS: { key: TabType; label: string }[] = [
    { key: 'harvest', label: '🌾 수확량' },
    { key: 'sales', label: '💰 판매' },
    { key: 'other', label: '📋 기타' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <LinearGradient colors={[Colors.primaryUltraLight, Colors.background]} style={styles.headerGradient}>
          <Text style={styles.title}>데이터 입력</Text>
          <View style={styles.tabContainer}>
            {TABS.map((t) => (
              <TouchableOpacity
                key={t.key}
                style={[styles.tabBtn, tab === t.key && styles.tabActive]}
                onPress={() => setTab(t.key)}
              >
                <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </LinearGradient>

        <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
          <Card style={styles.formCard}>

            {/* 날짜 */}
            <FormField label="날짜 *">
              <TouchableOpacity style={styles.dateBtn} onPress={() => setShowCalendar(true)}>
                <Text style={styles.dateBtnText}>📅 {date}</Text>
              </TouchableOpacity>
            </FormField>

            {/* 농장 선택 */}
            {farms.length > 0 && (
              <FormField label="농장 선택 *">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {farms.map((f) => (
                    <TouchableOpacity
                      key={f.id}
                      style={[styles.chip, selectedFarm === f.id && styles.chipActive]}
                      onPress={() => handleFarmSelect(f)}
                    >
                      <Text style={[styles.chipText, selectedFarm === f.id && styles.chipTextActive]}>{f.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </FormField>
            )}

            {/* 작물 */}
            <FormField label="작물">
              <TextInput
                style={styles.input}
                value={cropType}
                onChangeText={setCropType}
                placeholder="예) 블루베리, 딸기"
                placeholderTextColor={Colors.textLight}
              />
            </FormField>

            {/* 품종 */}
            <FormField label="품종">
              <TouchableOpacity style={styles.selectBtn} onPress={() => setShowVarietySelect(true)}>
                <Text style={styles.selectBtnText}>{variety || '품종 선택'}</Text>
                <Text style={styles.selectArrow}>▾</Text>
              </TouchableOpacity>
            </FormField>

            {/* 기타 탭: 구분 */}
            {tab === 'other' && (
              <FormField label="구분 *">
                <View style={styles.chipRow}>
                  {([['gift', '나눔'], ['waste', '폐기']] as [OtherType, string][]).map(([key, label]) => (
                    <TouchableOpacity
                      key={key}
                      style={[styles.chip, otherType === key && styles.chipActive]}
                      onPress={() => setOtherType(key)}
                    >
                      <Text style={[styles.chipText, otherType === key && styles.chipTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {tab === 'other' && otherType === 'gift' && (
                  <Text style={styles.hintText}>나눔: 판매 없이 본인 또는 지인에게 나눠준 양</Text>
                )}
                {tab === 'other' && otherType === 'waste' && (
                  <Text style={styles.hintText}>폐기: 품질 저하로 판매하지 못한 양</Text>
                )}
              </FormField>
            )}

            {/* 나눔일 때: 받는 분 */}
            {tab === 'other' && otherType === 'gift' && (
              <FormField label="받는 분 (선택)">
                <TextInput
                  style={styles.input}
                  value={recipient}
                  onChangeText={setRecipient}
                  placeholder="친구, 지인, 이웃 등"
                  placeholderTextColor={Colors.textLight}
                />
              </FormField>
            )}

            {/* 사이즈 */}
            <FormField label={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={fieldStyles.label}>사이즈{tab !== 'other' ? '' : ' (선택)'}</Text>
                <TouchableOpacity onPress={() => setShowSizeInfo(true)}>
                  <Text style={styles.infoIcon}>ℹ</Text>
                </TouchableOpacity>
              </View>
            }>
              <View style={styles.chipRow}>
                {sizeOptions.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, size === s && styles.chipActive]}
                    onPress={() => setSize(size === s ? '' : s)}
                  >
                    <Text style={[styles.chipText, size === s && styles.chipTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                value={sizeOptions.includes(size) ? '' : size}
                onChangeText={(v) => setSize(v)}
                placeholder="직접 입력 (예: 왕왕왕, 점보)"
                placeholderTextColor={Colors.textLight}
              />
            </FormField>

            {/* 수량 */}
            <FormField label={tab === 'harvest' ? '수확량 *' : tab === 'sales' ? '판매량 *' : '수량 *'}>
              <TextInput
                style={styles.input}
                value={quantity}
                onChangeText={setQuantity}
                placeholder="0"
                placeholderTextColor={Colors.textLight}
                keyboardType="decimal-pad"
              />
              <View style={styles.unitRow}>
                {allUnitOptions.map((u) => (
                  <TouchableOpacity
                    key={u}
                    style={[styles.unitChip, unit === u && styles.chipActive]}
                    onPress={() => setUnit(u)}
                  >
                    <Text style={[styles.unitChipText, unit === u && styles.chipTextActive]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {unit === '직접입력' && (
                <TextInput
                  style={[styles.input, { marginTop: 8 }]}
                  value={customUnit}
                  onChangeText={setCustomUnit}
                  placeholder="단위 입력 (예: 포, 줄, 트레이)"
                  placeholderTextColor={Colors.textLight}
                />
              )}
            </FormField>

            {/* 판매 전용 필드 */}
            {tab === 'sales' && (
              <>
                <FormField label="단가 (원) *">
                  <TextInput
                    style={styles.input}
                    value={pricePerUnit}
                    onChangeText={setPricePerUnit}
                    placeholder="0"
                    placeholderTextColor={Colors.textLight}
                    keyboardType="decimal-pad"
                  />
                </FormField>

                <FormField label="수수료 (%)">
                  <TextInput
                    style={styles.input}
                    value={commissionRate}
                    onChangeText={setCommissionRate}
                    placeholder="0 (없으면 비워두세요)"
                    placeholderTextColor={Colors.textLight}
                    keyboardType="decimal-pad"
                  />
                </FormField>

                <FormField label="부수비용 (원)">
                  <View style={styles.chipRow}>
                    {expenseTypes.map((et) => (
                      <TouchableOpacity
                        key={et}
                        style={styles.chip}
                        onPress={() => {}}
                      >
                        <Text style={styles.chipText}>{et}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    style={[styles.input, { marginTop: expenseTypes.length ? 8 : 0 }]}
                    value={extraCost}
                    onChangeText={setExtraCost}
                    placeholder="0 (택배비, 포장비 등 합계)"
                    placeholderTextColor={Colors.textLight}
                    keyboardType="decimal-pad"
                  />
                </FormField>

                {quantity && pricePerUnit ? (() => {
                  const rev = parseFloat(quantity || '0') * parseFloat(pricePerUnit || '0');
                  const cAmt = rev * (parseFloat(commissionRate || '0') || 0) / 100;
                  const eCost = parseFloat(extraCost || '0') || 0;
                  const net = rev - cAmt - eCost;
                  return (
                    <View style={styles.totalBox}>
                      <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>총 매출액</Text>
                        <Text style={styles.totalValue}>{rev.toLocaleString()}원</Text>
                      </View>
                      {(cAmt > 0 || eCost > 0) && (
                        <>
                          {cAmt > 0 && (
                            <View style={styles.totalRow}>
                              <Text style={styles.deductLabel}>수수료 ({commissionRate}%)</Text>
                              <Text style={styles.deductValue}>-{Math.round(cAmt).toLocaleString()}원</Text>
                            </View>
                          )}
                          {eCost > 0 && (
                            <View style={styles.totalRow}>
                              <Text style={styles.deductLabel}>부수비용</Text>
                              <Text style={styles.deductValue}>-{eCost.toLocaleString()}원</Text>
                            </View>
                          )}
                          <View style={[styles.totalRow, styles.netRow]}>
                            <Text style={styles.netLabel}>순수익</Text>
                            <Text style={[styles.totalValue, { color: net >= 0 ? Colors.success : Colors.danger }]}>
                              {Math.round(net).toLocaleString()}원
                            </Text>
                          </View>
                        </>
                      )}
                    </View>
                  );
                })() : null}

                <FormField label="구매자 (선택)">
                  <TextInput
                    style={styles.input}
                    value={buyer}
                    onChangeText={setBuyer}
                    placeholder="구매자명 또는 판매처"
                    placeholderTextColor={Colors.textLight}
                  />
                </FormField>
              </>
            )}

            {/* 메모 (수확/기타) */}
            {tab !== 'sales' && (
              <FormField label="메모 (선택)">
                <TextInput
                  style={[styles.input, styles.textarea]}
                  value={note}
                  onChangeText={setNote}
                  placeholder="특이사항이나 메모를 입력하세요"
                  placeholderTextColor={Colors.textLight}
                  multiline
                  numberOfLines={3}
                />
              </FormField>
            )}

            <Button
              title={tab === 'harvest' ? '수확량 저장' : tab === 'sales' ? '판매 기록 저장' : '기타 기록 저장'}
              onPress={handleSave}
              loading={loading}
              style={{ marginTop: Spacing.md }}
            />
          </Card>

          <View style={{ height: Spacing.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <CalendarModal
        visible={showCalendar}
        value={date}
        onSelect={setDate}
        onClose={() => setShowCalendar(false)}
      />
      <SelectModal
        visible={showVarietySelect}
        title="품종 선택"
        options={varieties}
        value={variety}
        onSelect={setVariety}
        onClose={() => setShowVarietySelect(false)}
        allowCustom
      />
      <SizeInfoModal
        visible={showSizeInfo}
        onClose={() => setShowSizeInfo(false)}
        sizes={sizeInfoData}
      />
      <Toast message={toastMessage} visible={toastVisible} />
    </SafeAreaView>
  );
}

function FormField({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: Spacing.md }}>
      {typeof label === 'string'
        ? <Text style={fieldStyles.label}>{label}</Text>
        : label}
      {children}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  label: { ...Typography.label, marginBottom: Spacing.xs },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerGradient: { paddingBottom: Spacing.lg },
  title: { ...Typography.h2, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, marginBottom: Spacing.md },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.border,
    borderRadius: Radius.full,
    padding: 3,
  },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: Radius.full },
  tabActive: { backgroundColor: Colors.surface },
  tabText: { fontSize: 13, fontWeight: '600', color: Colors.textSub },
  tabTextActive: { color: Colors.primary },
  scroll: { flex: 1 },
  formCard: { margin: Spacing.lg },
  input: {
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    padding: 14,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textarea: { height: 80, textAlignVertical: 'top' },
  dateBtn: {
    backgroundColor: Colors.background, borderRadius: Radius.md,
    padding: 14, borderWidth: 1, borderColor: Colors.border,
  },
  dateBtnText: { fontSize: 15, color: Colors.text, fontWeight: '500' },
  selectBtn: {
    backgroundColor: Colors.background, borderRadius: Radius.md, padding: 14,
    borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', justifyContent: 'space-between',
  },
  selectBtnText: { fontSize: 15, color: Colors.text },
  selectArrow: { fontSize: 14, color: Colors.textSub },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  chipActive: { backgroundColor: Colors.primaryUltraLight, borderColor: Colors.primary },
  chipText: { fontSize: 13, color: Colors.textSub, fontWeight: '500' },
  chipTextActive: { color: Colors.primaryDark, fontWeight: '700' },
  infoIcon: {
    fontSize: 16, color: Colors.primary, fontWeight: '700',
    width: 20, height: 20, textAlign: 'center', lineHeight: 20,
  },
  unitRow: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  unitChip: {
    flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background,
    minWidth: 60,
  },
  unitChipText: { fontSize: 13, color: Colors.textSub, fontWeight: '500' },
  hintText: { ...Typography.caption, marginTop: 6, color: Colors.textSub },
  totalBox: {
    backgroundColor: Colors.primaryUltraLight, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.md,
  },
  totalLabel: { ...Typography.caption },
  totalValue: { fontSize: 22, fontWeight: '800', color: Colors.primaryDark },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  deductLabel: { ...Typography.caption, color: Colors.textSub },
  deductValue: { ...Typography.caption, color: Colors.danger, fontWeight: '600' },
  netRow: { borderTopWidth: 1, borderTopColor: Colors.primaryLight, marginTop: 6, paddingTop: 6 },
  netLabel: { ...Typography.bodyBold, color: Colors.text },
});
