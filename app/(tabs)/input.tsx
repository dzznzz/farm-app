import { useState, useEffect } from 'react';
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
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';

type TabType = 'harvest' | 'sales';

const SIZE_OPTIONS = ['소', '중', '대', '특'];

export default function InputScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabType>('harvest');
  const [farms, setFarms] = useState<{ id: string; name: string; crop_type: string }[]>([]);
  const [selectedFarm, setSelectedFarm] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [cropType, setCropType] = useState('');
  const [variety, setVariety] = useState('');
  const [size, setSize] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kg');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [buyer, setBuyer] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('farms').select('id, name, crop_type').eq('user_id', user.id)
      .then(({ data }) => {
        if (data?.length) {
          setFarms(data);
          setSelectedFarm(data[0].id);
          setCropType(data[0].crop_type);
        }
      });
  }, [user]);

  const handleFarmSelect = (farm: { id: string; name: string; crop_type: string }) => {
    setSelectedFarm(farm.id);
    setCropType(farm.crop_type);
  };

  const handleSave = async () => {
    if (!user || !selectedFarm || !quantity) {
      Alert.alert('입력 오류', '농장, 수량은 필수 입력입니다.');
      return;
    }
    setLoading(true);

    if (tab === 'harvest') {
      const { error } = await supabase.from('harvest_records').insert({
        user_id: user.id,
        farm_id: selectedFarm,
        date,
        crop_type: cropType || null,
        variety: variety || null,
        size: size || null,
        quantity: parseFloat(quantity),
        unit,
        note: note || null,
      });
      if (error) Alert.alert('저장 실패', error.message);
      else { Alert.alert('저장 완료', '수확량이 기록되었습니다.'); resetForm(); }
    } else {
      const qty = parseFloat(quantity);
      const price = parseFloat(pricePerUnit);
      if (!pricePerUnit || isNaN(price)) {
        Alert.alert('입력 오류', '단가를 입력하세요.');
        setLoading(false);
        return;
      }
      const { error } = await supabase.from('sales_records').insert({
        user_id: user.id,
        farm_id: selectedFarm,
        date,
        crop_type: cropType || null,
        variety: variety || null,
        size: size || null,
        quantity: qty,
        price_per_unit: price,
        total_revenue: qty * price,
        buyer: buyer || null,
      });
      if (error) Alert.alert('저장 실패', error.message);
      else { Alert.alert('저장 완료', '판매 기록이 저장되었습니다.'); resetForm(); }
    }
    setLoading(false);
  };

  const resetForm = () => {
    setQuantity(''); setPricePerUnit(''); setBuyer(''); setNote('');
    setVariety(''); setSize('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <LinearGradient colors={[Colors.primaryUltraLight, Colors.background]} style={styles.headerGradient}>
          <Text style={styles.title}>데이터 입력</Text>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabBtn, tab === 'harvest' && styles.tabActive]}
              onPress={() => setTab('harvest')}
            >
              <Text style={[styles.tabText, tab === 'harvest' && styles.tabTextActive]}>🌾 수확량</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, tab === 'sales' && styles.tabActive]}
              onPress={() => setTab('sales')}
            >
              <Text style={[styles.tabText, tab === 'sales' && styles.tabTextActive]}>💰 판매</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
          <Card style={styles.formCard}>

            {/* 날짜 */}
            <FormField label="날짜 *">
              <TextInput
                style={styles.input}
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textLight}
              />
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
                      <Text style={[styles.chipText, selectedFarm === f.id && styles.chipTextActive]}>
                        {f.name}
                      </Text>
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
                placeholder="예) 딸기, 토마토, 상추"
                placeholderTextColor={Colors.textLight}
              />
            </FormField>

            {/* 품종 */}
            <FormField label="품종">
              <TextInput
                style={styles.input}
                value={variety}
                onChangeText={setVariety}
                placeholder="예) 설향, 금실, 죽향"
                placeholderTextColor={Colors.textLight}
              />
            </FormField>

            {/* 사이즈 */}
            <FormField label="사이즈">
              <View style={styles.chipRow}>
                {SIZE_OPTIONS.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, size === s && styles.chipActive]}
                    onPress={() => setSize(size === s ? '' : s)}
                  >
                    <Text style={[styles.chipText, size === s && styles.chipTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
                <TextInput
                  style={[styles.input, styles.sizeInput]}
                  value={SIZE_OPTIONS.includes(size) ? '' : size}
                  onChangeText={(v) => setSize(v)}
                  placeholder="직접 입력"
                  placeholderTextColor={Colors.textLight}
                  onFocus={() => { if (SIZE_OPTIONS.includes(size)) setSize(''); }}
                />
              </View>
            </FormField>

            {/* 수량 */}
            <FormField label={tab === 'harvest' ? '수확량 *' : '판매량 *'}>
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="0"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="decimal-pad"
                />
                <View style={styles.chipRow}>
                  {['kg', '개', '박스'].map((u) => (
                    <TouchableOpacity
                      key={u}
                      style={[styles.chip, unit === u && styles.chipActive]}
                      onPress={() => setUnit(u)}
                    >
                      <Text style={[styles.chipText, unit === u && styles.chipTextActive]}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
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

                {quantity && pricePerUnit ? (
                  <View style={styles.totalBox}>
                    <Text style={styles.totalLabel}>총 매출액</Text>
                    <Text style={styles.totalValue}>
                      {(parseFloat(quantity || '0') * parseFloat(pricePerUnit || '0')).toLocaleString()}원
                    </Text>
                  </View>
                ) : null}

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

            {/* 메모 */}
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

            <Button
              title={tab === 'harvest' ? '수확량 저장' : '판매 기록 저장'}
              onPress={handleSave}
              loading={loading}
              style={{ marginTop: Spacing.md }}
            />
          </Card>

          <View style={{ height: Spacing.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: Spacing.md }}>
      <Text style={fieldStyles.label}>{label}</Text>
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
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.textSub },
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
  sizeInput: { flex: 1, paddingVertical: 8, minWidth: 80 },
  row: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  chipActive: { backgroundColor: Colors.primaryUltraLight, borderColor: Colors.primary },
  chipText: { fontSize: 13, color: Colors.textSub, fontWeight: '500' },
  chipTextActive: { color: Colors.primaryDark, fontWeight: '700' },
  totalBox: {
    backgroundColor: Colors.primaryUltraLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  totalLabel: { ...Typography.caption },
  totalValue: { fontSize: 24, fontWeight: '800', color: Colors.primaryDark, marginTop: 4 },
});
