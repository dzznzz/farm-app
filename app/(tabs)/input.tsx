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
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';

type TabType = 'harvest' | 'sales';

export default function InputScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabType>('harvest');
  const [farms, setFarms] = useState<{ id: string; name: string; crop_type: string }[]>([]);
  const [selectedFarm, setSelectedFarm] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
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
        if (data?.length) { setFarms(data); setSelectedFarm(data[0].id); }
      });
  }, [user]);

  const handleSave = async () => {
    if (!user || !selectedFarm || !quantity) {
      Alert.alert('입력 오류', '필수 항목을 입력하세요.');
      return;
    }
    setLoading(true);

    if (tab === 'harvest') {
      const { error } = await supabase.from('harvest_records').insert({
        user_id: user.id,
        farm_id: selectedFarm,
        date,
        quantity: parseFloat(quantity),
        unit,
        note,
      });
      if (error) Alert.alert('저장 실패', error.message);
      else { Alert.alert('저장 완료', '수확량이 기록되었습니다.'); resetForm(); }
    } else {
      const qty = parseFloat(quantity);
      const price = parseFloat(pricePerUnit);
      const { error } = await supabase.from('sales_records').insert({
        user_id: user.id,
        farm_id: selectedFarm,
        date,
        quantity: qty,
        price_per_unit: price,
        total_revenue: qty * price,
        buyer,
      });
      if (error) Alert.alert('저장 실패', error.message);
      else { Alert.alert('저장 완료', '판매 기록이 저장되었습니다.'); resetForm(); }
    }
    setLoading(false);
  };

  const resetForm = () => {
    setQuantity(''); setPricePerUnit(''); setBuyer(''); setNote('');
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
            <FormField label="날짜">
              <TextInput
                style={styles.input}
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textLight}
              />
            </FormField>

            {farms.length > 0 && (
              <FormField label="농장 선택">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {farms.map((f) => (
                    <TouchableOpacity
                      key={f.id}
                      style={[styles.farmChip, selectedFarm === f.id && styles.farmChipActive]}
                      onPress={() => setSelectedFarm(f.id)}
                    >
                      <Text style={[styles.farmChipText, selectedFarm === f.id && styles.farmChipTextActive]}>
                        {f.name} ({f.crop_type})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </FormField>
            )}

            <FormField label={tab === 'harvest' ? '수확량' : '판매량'}>
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="0"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="decimal-pad"
                />
                <View style={styles.unitContainer}>
                  {['kg', '개', '박스'].map((u) => (
                    <TouchableOpacity
                      key={u}
                      style={[styles.unitBtn, unit === u && styles.unitBtnActive]}
                      onPress={() => setUnit(u)}
                    >
                      <Text style={[styles.unitText, unit === u && styles.unitTextActive]}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </FormField>

            {tab === 'sales' && (
              <>
                <FormField label="단가 (원)">
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
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: Radius.full,
  },
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
  row: { flexDirection: 'row', gap: Spacing.sm },
  unitContainer: { flexDirection: 'row', gap: 4 },
  unitBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  unitBtnActive: { backgroundColor: Colors.primaryUltraLight, borderColor: Colors.primary },
  unitText: { fontSize: 13, color: Colors.textSub, fontWeight: '600' },
  unitTextActive: { color: Colors.primary },
  farmChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
    backgroundColor: Colors.background,
  },
  farmChipActive: { backgroundColor: Colors.primaryUltraLight, borderColor: Colors.primary },
  farmChipText: { fontSize: 13, color: Colors.textSub, fontWeight: '500' },
  farmChipTextActive: { color: Colors.primaryDark, fontWeight: '700' },
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
