import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';
import { pageStyles } from './shared';

type AdminTab = 'crop' | 'variety' | 'size' | 'unit' | 'expense';

interface CropType { id: string; name: string; sort_order: number }
interface VarietyItem { id: string; crop_type: string; name: string }
interface SizeItem { id: string; crop_type: string; name: string; range_info: string | null }
interface UnitItem { id: string; name: string; sort_order: number }

interface Props {
  onBack: () => void;
}

export function AdminDataPage({ onBack }: Props) {
  const [tab, setTab] = useState<AdminTab>('crop');

  const TABS: { key: AdminTab; label: string }[] = [
    { key: 'crop', label: '작물' },
    { key: 'variety', label: '품종' },
    { key: 'size', label: '사이즈' },
    { key: 'unit', label: '단위' },
    { key: 'expense', label: '비용' },
  ];

  return (
    <SafeAreaView style={pageStyles.container}>
      <View style={pageStyles.subHeader}>
        <TouchableOpacity onPress={onBack}><Text style={pageStyles.backBtn}>←</Text></TouchableOpacity>
        <Text style={pageStyles.subTitle}>🗃️ 데이터 관리</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {tab === 'crop' && <CropTab />}
      {tab === 'variety' && <VarietyTab />}
      {tab === 'size' && <SizeTab />}
      {tab === 'unit' && <UnitTab />}
      {tab === 'expense' && <ExpenseTab />}
    </SafeAreaView>
  );
}

// ── 작물 탭 ─────────────────────────────────────────────────────────────────
function CropTab() {
  const [crops, setCrops] = useState<CropType[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from('crop_types').select('id, name, sort_order').order('sort_order');
    setCrops(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!newName.trim()) { Alert.alert('입력 오류', '작물 이름을 입력하세요.'); return; }
    setSaving(true);
    const { error } = await supabase.from('crop_types').insert({ name: newName.trim(), sort_order: crops.length });
    if (error) Alert.alert('저장 실패', error.message);
    else { setNewName(''); await load(); }
    setSaving(false);
  };

  const remove = (id: string, name: string) => {
    Alert.alert('삭제', `'${name}' 작물을 삭제할까요?\n관련 품종과 사이즈도 함께 삭제됩니다.`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive', onPress: async () => {
          await supabase.from('crop_types').delete().eq('id', id);
          load();
        },
      },
    ]);
  };

  return (
    <ScrollView style={pageStyles.scroll} keyboardShouldPersistTaps="handled">
      <Card style={styles.addCard}>
        <Text style={[Typography.bodyBold, { marginBottom: Spacing.sm }]}>작물 추가</Text>
        <View style={styles.addRow}>
          <TextInput
            style={styles.addInput}
            value={newName}
            onChangeText={setNewName}
            placeholder="예) 블루베리, 딸기"
            placeholderTextColor={Colors.textLight}
          />
          <TouchableOpacity style={styles.addBtn} onPress={add} disabled={saving}>
            <Text style={styles.addBtnText}>{saving ? '...' : '추가'}</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
      ) : (
        crops.map((crop) => (
          <Card key={crop.id} style={styles.itemCard}>
            <View style={styles.itemRow}>
              <Text style={Typography.bodyBold}>{crop.name}</Text>
              <TouchableOpacity onPress={() => remove(crop.id, crop.name)} style={styles.deleteBtn}>
                <Text style={styles.deleteBtnText}>삭제</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ))
      )}
      <View style={{ height: Spacing.xl }} />
    </ScrollView>
  );
}

// ── 품종 탭 ─────────────────────────────────────────────────────────────────
function VarietyTab() {
  const [crops, setCrops] = useState<CropType[]>([]);
  const [selectedCrop, setSelectedCrop] = useState('');
  const [varieties, setVarieties] = useState<VarietyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('crop_types').select('id, name, sort_order').order('sort_order')
      .then(({ data }) => {
        if (data) { setCrops(data); if (data.length > 0) setSelectedCrop(data[0].name); }
      });
  }, []);

  useEffect(() => {
    if (!selectedCrop) return;
    setLoading(true);
    supabase.from('varieties_master').select('id, crop_type, name').eq('crop_type', selectedCrop).order('sort_order')
      .then(({ data }) => { setVarieties(data ?? []); setLoading(false); });
  }, [selectedCrop]);

  const add = async () => {
    if (!newName.trim()) { Alert.alert('입력 오류', '품종 이름을 입력하세요.'); return; }
    setSaving(true);
    const { error } = await supabase.from('varieties_master').insert({
      crop_type: selectedCrop, name: newName.trim(), sort_order: varieties.length,
    });
    if (error) Alert.alert('저장 실패', error.message);
    else { setNewName(''); setLoading(true); supabase.from('varieties_master').select('id, crop_type, name').eq('crop_type', selectedCrop).order('sort_order').then(({ data }) => { setVarieties(data ?? []); setLoading(false); }); }
    setSaving(false);
  };

  const remove = (id: string, name: string) => {
    Alert.alert('삭제', `'${name}' 품종을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => { await supabase.from('varieties_master').delete().eq('id', id); setVarieties((v) => v.filter((x) => x.id !== id)); } },
    ]);
  };

  return (
    <ScrollView style={pageStyles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.cropSelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {crops.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.cropChip, selectedCrop === c.name && styles.cropChipActive]}
              onPress={() => setSelectedCrop(c.name)}
            >
              <Text style={[styles.cropChipText, selectedCrop === c.name && styles.cropChipTextActive]}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {selectedCrop ? (
        <>
          <Card style={styles.addCard}>
            <Text style={[Typography.bodyBold, { marginBottom: Spacing.sm }]}>{selectedCrop} 품종 추가</Text>
            <View style={styles.addRow}>
              <TextInput
                style={styles.addInput}
                value={newName}
                onChangeText={setNewName}
                placeholder="예) 신틸라, 오닐"
                placeholderTextColor={Colors.textLight}
              />
              <TouchableOpacity style={styles.addBtn} onPress={add} disabled={saving}>
                <Text style={styles.addBtnText}>{saving ? '...' : '추가'}</Text>
              </TouchableOpacity>
            </View>
          </Card>

          {loading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
          ) : (
            varieties.map((v) => (
              <Card key={v.id} style={styles.itemCard}>
                <View style={styles.itemRow}>
                  <Text style={Typography.bodyBold}>{v.name}</Text>
                  <TouchableOpacity onPress={() => remove(v.id, v.name)} style={styles.deleteBtn}>
                    <Text style={styles.deleteBtnText}>삭제</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))
          )}
        </>
      ) : (
        <View style={{ alignItems: 'center', marginTop: 40 }}>
          <Text style={[Typography.body, { color: Colors.textSub }]}>먼저 작물을 선택하세요</Text>
        </View>
      )}
      <View style={{ height: Spacing.xl }} />
    </ScrollView>
  );
}

// ── 사이즈 탭 ────────────────────────────────────────────────────────────────
function SizeTab() {
  const [crops, setCrops] = useState<CropType[]>([]);
  const [selectedCrop, setSelectedCrop] = useState('');
  const [sizes, setSizes] = useState<SizeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRange, setNewRange] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('crop_types').select('id, name, sort_order').order('sort_order')
      .then(({ data }) => {
        if (data) { setCrops(data); if (data.length > 0) setSelectedCrop(data[0].name); }
      });
  }, []);

  const loadSizes = async () => {
    if (!selectedCrop) return;
    setLoading(true);
    const { data } = await supabase.from('sizes_master').select('id, crop_type, name, range_info').eq('crop_type', selectedCrop).order('sort_order');
    setSizes(data ?? []);
    setLoading(false);
  };

  useEffect(() => { loadSizes(); }, [selectedCrop]);

  const add = async () => {
    if (!newName.trim()) { Alert.alert('입력 오류', '사이즈 이름을 입력하세요.'); return; }
    setSaving(true);
    const { error } = await supabase.from('sizes_master').insert({
      crop_type: selectedCrop, name: newName.trim(),
      range_info: newRange.trim() || null, sort_order: sizes.length,
    });
    if (error) Alert.alert('저장 실패', error.message);
    else { setNewName(''); setNewRange(''); await loadSizes(); }
    setSaving(false);
  };

  const remove = (id: string, name: string) => {
    Alert.alert('삭제', `'${name}' 사이즈를 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => { await supabase.from('sizes_master').delete().eq('id', id); setSizes((s) => s.filter((x) => x.id !== id)); } },
    ]);
  };

  return (
    <ScrollView style={pageStyles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.cropSelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {crops.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.cropChip, selectedCrop === c.name && styles.cropChipActive]}
              onPress={() => setSelectedCrop(c.name)}
            >
              <Text style={[styles.cropChipText, selectedCrop === c.name && styles.cropChipTextActive]}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {selectedCrop ? (
        <>
          <Card style={styles.addCard}>
            <Text style={[Typography.bodyBold, { marginBottom: Spacing.sm }]}>{selectedCrop} 사이즈 추가</Text>
            <View style={styles.addRow}>
              <TextInput style={[styles.addInput, { flex: 1 }]} value={newName} onChangeText={setNewName} placeholder="이름 (예: 대)" placeholderTextColor={Colors.textLight} />
            </View>
            <View style={[styles.addRow, { marginTop: 8 }]}>
              <TextInput style={[styles.addInput, { flex: 1 }]} value={newRange} onChangeText={setNewRange} placeholder="범위 (예: 14~16mm, 선택)" placeholderTextColor={Colors.textLight} />
              <TouchableOpacity style={styles.addBtn} onPress={add} disabled={saving}>
                <Text style={styles.addBtnText}>{saving ? '...' : '추가'}</Text>
              </TouchableOpacity>
            </View>
          </Card>

          {loading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
          ) : (
            sizes.map((s) => (
              <Card key={s.id} style={styles.itemCard}>
                <View style={styles.itemRow}>
                  <View>
                    <Text style={Typography.bodyBold}>{s.name}</Text>
                    {s.range_info ? <Text style={Typography.caption}>{s.range_info}</Text> : null}
                  </View>
                  <TouchableOpacity onPress={() => remove(s.id, s.name)} style={styles.deleteBtn}>
                    <Text style={styles.deleteBtnText}>삭제</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))
          )}
        </>
      ) : null}
      <View style={{ height: Spacing.xl }} />
    </ScrollView>
  );
}

// ── 단위 탭 ─────────────────────────────────────────────────────────────────
function UnitTab() {
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from('harvest_units').select('id, name, sort_order').order('sort_order');
    setUnits(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!newName.trim()) { Alert.alert('입력 오류', '단위 이름을 입력하세요.'); return; }
    setSaving(true);
    const { error } = await supabase.from('harvest_units').insert({ name: newName.trim(), sort_order: units.length });
    if (error) Alert.alert('저장 실패', error.message);
    else { setNewName(''); await load(); }
    setSaving(false);
  };

  const remove = (id: string, name: string) => {
    Alert.alert('삭제', `'${name}' 단위를 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => { await supabase.from('harvest_units').delete().eq('id', id); setUnits((u) => u.filter((x) => x.id !== id)); } },
    ]);
  };

  return (
    <ScrollView style={pageStyles.scroll} keyboardShouldPersistTaps="handled">
      <Card style={styles.addCard}>
        <Text style={[Typography.bodyBold, { marginBottom: Spacing.sm }]}>단위 추가</Text>
        <View style={styles.addRow}>
          <TextInput
            style={styles.addInput}
            value={newName}
            onChangeText={setNewName}
            placeholder="예) 박스, 포, 트레이"
            placeholderTextColor={Colors.textLight}
          />
          <TouchableOpacity style={styles.addBtn} onPress={add} disabled={saving}>
            <Text style={styles.addBtnText}>{saving ? '...' : '추가'}</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
      ) : (
        units.map((u) => (
          <Card key={u.id} style={styles.itemCard}>
            <View style={styles.itemRow}>
              <Text style={Typography.bodyBold}>{u.name}</Text>
              <TouchableOpacity onPress={() => remove(u.id, u.name)} style={styles.deleteBtn}>
                <Text style={styles.deleteBtnText}>삭제</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ))
      )}
      <View style={{ height: Spacing.xl }} />
    </ScrollView>
  );
}

// ── 비용항목 탭 ──────────────────────────────────────────────────────────────
interface ExpenseItem { id: string; name: string; sort_order: number }

function ExpenseTab() {
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from('expense_types').select('id, name, sort_order').order('sort_order');
    setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!newName.trim()) { Alert.alert('입력 오류', '비용 항목 이름을 입력하세요.'); return; }
    setSaving(true);
    const { error } = await supabase.from('expense_types').insert({ name: newName.trim(), sort_order: items.length });
    if (error) Alert.alert('저장 실패', error.message);
    else { setNewName(''); await load(); }
    setSaving(false);
  };

  const remove = (id: string, name: string) => {
    Alert.alert('삭제', `'${name}' 항목을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => { await supabase.from('expense_types').delete().eq('id', id); setItems((p) => p.filter((x) => x.id !== id)); } },
    ]);
  };

  return (
    <ScrollView style={pageStyles.scroll} keyboardShouldPersistTaps="handled">
      <Card style={styles.addCard}>
        <Text style={[Typography.bodyBold, { marginBottom: Spacing.sm }]}>비용 항목 추가</Text>
        <Text style={[Typography.caption, { marginBottom: Spacing.sm, color: Colors.textSub }]}>
          판매 입력 시 부수비용 분류에 사용됩니다
        </Text>
        <View style={styles.addRow}>
          <TextInput
            style={styles.addInput}
            value={newName}
            onChangeText={setNewName}
            placeholder="예) 택배비, 포장비, 인건비"
            placeholderTextColor={Colors.textLight}
          />
          <TouchableOpacity style={styles.addBtn} onPress={add} disabled={saving}>
            <Text style={styles.addBtnText}>{saving ? '...' : '추가'}</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
      ) : (
        items.map((item) => (
          <Card key={item.id} style={styles.itemCard}>
            <View style={styles.itemRow}>
              <Text style={Typography.bodyBold}>{item.name}</Text>
              <TouchableOpacity onPress={() => remove(item.id, item.name)} style={styles.deleteBtn}>
                <Text style={styles.deleteBtnText}>삭제</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ))
      )}
      <View style={{ height: Spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabsScroll: { margin: Spacing.lg, marginBottom: 0 },
  tabs: {
    flexDirection: 'row', backgroundColor: Colors.border,
    borderRadius: Radius.full, padding: 3,
  },
  tabBtn: { paddingVertical: 9, paddingHorizontal: 18, alignItems: 'center', borderRadius: Radius.full },
  tabBtnActive: { backgroundColor: Colors.surface },
  tabText: { fontSize: 13, fontWeight: '600', color: Colors.textSub },
  tabTextActive: { color: Colors.primary },
  addCard: { margin: Spacing.lg, marginBottom: Spacing.sm },
  addRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  addInput: {
    flex: 1, backgroundColor: Colors.background, borderRadius: Radius.md, padding: 12,
    fontSize: 14, color: Colors.text, borderWidth: 1, borderColor: Colors.border,
  },
  addBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 12, alignItems: 'center', justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  itemCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deleteBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.danger,
  },
  deleteBtnText: { color: Colors.danger, fontSize: 13, fontWeight: '600' },
  cropSelector: {
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  cropChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background,
    marginRight: 8,
  },
  cropChipActive: { backgroundColor: Colors.primaryUltraLight, borderColor: Colors.primary },
  cropChipText: { fontSize: 13, color: Colors.textSub, fontWeight: '500' },
  cropChipTextActive: { color: Colors.primaryDark, fontWeight: '700' },
});
