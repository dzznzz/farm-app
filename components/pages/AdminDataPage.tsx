import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../ui/Card';
import { Toast, useToast } from '../ui/Toast';
import { PhIcon } from '../ui/PhIcon';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';
import { pageStyles } from './shared';
import { listCodes, listChildren, addCode, deleteCode, CommonCodeRow } from '../../lib/commonCode';

type AdminTab = 'crop' | 'variety' | 'size' | 'unit' | 'expense';

interface Props { onBack: () => void; readOnly?: boolean }

export function AdminDataPage({ onBack, readOnly = false }: Props) {
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <PhIcon name="database" size={20} color={Colors.text} />
          <Text style={pageStyles.subTitle}>데이터 관리</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {readOnly && (
        <View style={styles.readOnlyBanner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <PhIcon name="monitor" size={16} color={Colors.primaryDark} />
            <Text style={styles.readOnlyText}>PC에서만 수정이 가능합니다. 조회만 가능합니다.</Text>
          </View>
        </View>
      )}

      <View style={{ flex: 1 }} pointerEvents={readOnly ? 'none' : 'auto'}>
        <View style={styles.tabsRow}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
              onPress={() => setTab(t.key)}
            >
              <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'crop' && <CropTab />}
        {tab === 'variety' && <VarietyTab />}
        {tab === 'size' && <SizeTab />}
        {tab === 'unit' && <UnitTab />}
        {tab === 'expense' && <ExpenseTab />}
      </View>
    </SafeAreaView>
  );
}

// ── 작물 탭 ─────────────────────────────────────────────────────────────────
function CropTab() {
  const [crops, setCrops] = useState<CommonCodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const { toastMessage, toastVisible, showToast } = useToast();

  const load = async () => {
    setCrops(await listCodes('crop'));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const { error } = await addCode({ main: 'crop', name: newName.trim(), sortOrder: crops.length });
    if (error) showToast('저장 실패: ' + error.message);
    else { setNewName(''); await load(); showToast('저장되었습니다.'); }
    setSaving(false);
  };

  const remove = async (id: string) => {
    await deleteCode(id);
    setCrops((prev) => prev.filter((c) => c.id !== id));
    showToast('삭제되었습니다.');
  };

  return (
    <View style={{ flex: 1 }}>
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
              onSubmitEditing={add}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.addBtn} onPress={add} disabled={saving || !newName.trim()}>
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
                <TouchableOpacity onPress={() => remove(crop.id)} style={styles.deleteBtn}>
                  <Text style={styles.deleteBtnText}>삭제</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}
        <View style={{ height: Spacing.xl }} />
      </ScrollView>
      <Toast message={toastMessage} visible={toastVisible} />
    </View>
  );
}

// ── 품종 탭 ─────────────────────────────────────────────────────────────────
function VarietyTab() {
  const [crops, setCrops] = useState<CommonCodeRow[]>([]);
  const [selectedCrop, setSelectedCrop] = useState(''); // 작물 desc_code
  const [varieties, setVarieties] = useState<CommonCodeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const { toastMessage, toastVisible, showToast } = useToast();

  const selectedCropName = crops.find((c) => c.desc_code === selectedCrop)?.name ?? '';

  useEffect(() => {
    listCodes('crop').then((rows) => {
      setCrops(rows);
      if (rows.length > 0) setSelectedCrop(rows[0].desc_code);
    });
  }, []);

  const loadVarieties = async () => {
    setLoading(true);
    setVarieties(await listChildren('vari', 'crop', selectedCrop));
    setLoading(false);
  };

  useEffect(() => {
    if (!selectedCrop) return;
    loadVarieties();
  }, [selectedCrop]);

  const add = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const { error } = await addCode({
      main: 'vari', name: newName.trim(), sortOrder: varieties.length,
      parentMain: 'crop', parentDesc: selectedCrop,
    });
    if (error) { showToast('저장 실패: ' + error.message); }
    else { setNewName(''); await loadVarieties(); showToast('저장되었습니다.'); }
    setSaving(false);
  };

  const remove = async (id: string) => {
    await deleteCode(id);
    setVarieties((prev) => prev.filter((v) => v.id !== id));
    showToast('삭제되었습니다.');
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={pageStyles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.cropSelector}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {crops.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.cropChip, selectedCrop === c.desc_code && styles.cropChipActive]}
                onPress={() => setSelectedCrop(c.desc_code)}
              >
                <Text style={[styles.cropChipText, selectedCrop === c.desc_code && styles.cropChipTextActive]}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {selectedCrop ? (
          <>
            <Card style={styles.addCard}>
              <Text style={[Typography.bodyBold, { marginBottom: Spacing.sm }]}>{selectedCropName} 품종 추가</Text>
              <View style={styles.addRow}>
                <TextInput
                  style={styles.addInput}
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="예) 신틸라, 오닐"
                  placeholderTextColor={Colors.textLight}
                  onSubmitEditing={add}
                  returnKeyType="done"
                />
                <TouchableOpacity style={styles.addBtn} onPress={add} disabled={saving || !newName.trim()}>
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
                    <TouchableOpacity onPress={() => remove(v.id)} style={styles.deleteBtn}>
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
      <Toast message={toastMessage} visible={toastVisible} />
    </View>
  );
}

// ── 사이즈 탭 ────────────────────────────────────────────────────────────────
function SizeTab() {
  const [crops, setCrops] = useState<CommonCodeRow[]>([]);
  const [selectedCrop, setSelectedCrop] = useState(''); // 작물 desc_code
  const [sizes, setSizes] = useState<CommonCodeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRange, setNewRange] = useState('');
  const [saving, setSaving] = useState(false);
  const { toastMessage, toastVisible, showToast } = useToast();

  const selectedCropName = crops.find((c) => c.desc_code === selectedCrop)?.name ?? '';

  useEffect(() => {
    listCodes('crop').then((rows) => {
      setCrops(rows);
      if (rows.length > 0) setSelectedCrop(rows[0].desc_code);
    });
  }, []);

  const loadSizes = async () => {
    if (!selectedCrop) return;
    setLoading(true);
    setSizes(await listChildren('size', 'crop', selectedCrop));
    setLoading(false);
  };

  useEffect(() => { loadSizes(); }, [selectedCrop]);

  const add = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const { error } = await addCode({
      main: 'size', name: newName.trim(), sortOrder: sizes.length,
      parentMain: 'crop', parentDesc: selectedCrop, info: newRange.trim() || null,
    });
    if (error) showToast('저장 실패: ' + error.message);
    else { setNewName(''); setNewRange(''); await loadSizes(); showToast('저장되었습니다.'); }
    setSaving(false);
  };

  const remove = async (id: string) => {
    await deleteCode(id);
    setSizes((prev) => prev.filter((s) => s.id !== id));
    showToast('삭제되었습니다.');
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={pageStyles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.cropSelector}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {crops.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.cropChip, selectedCrop === c.desc_code && styles.cropChipActive]}
                onPress={() => setSelectedCrop(c.desc_code)}
              >
                <Text style={[styles.cropChipText, selectedCrop === c.desc_code && styles.cropChipTextActive]}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {selectedCrop ? (
          <>
            <Card style={styles.addCard}>
              <Text style={[Typography.bodyBold, { marginBottom: Spacing.sm }]}>{selectedCropName} 사이즈 추가</Text>
              <View style={styles.addRow}>
                <TextInput style={[styles.addInput, { flex: 1 }]} value={newName} onChangeText={setNewName} placeholder="이름 (예: 대)" placeholderTextColor={Colors.textLight} returnKeyType="next" />
              </View>
              <View style={[styles.addRow, { marginTop: 8 }]}>
                <TextInput style={[styles.addInput, { flex: 1 }]} value={newRange} onChangeText={setNewRange} placeholder="범위 (예: 14~16mm, 선택)" placeholderTextColor={Colors.textLight} onSubmitEditing={add} returnKeyType="done" />
                <TouchableOpacity style={styles.addBtn} onPress={add} disabled={saving || !newName.trim()}>
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
                      {s.info ? <Text style={Typography.caption}>{s.info}</Text> : null}
                    </View>
                    <TouchableOpacity onPress={() => remove(s.id)} style={styles.deleteBtn}>
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
      <Toast message={toastMessage} visible={toastVisible} />
    </View>
  );
}

// ── 단위 탭 ─────────────────────────────────────────────────────────────────
function UnitTab() {
  const [units, setUnits] = useState<CommonCodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const { toastMessage, toastVisible, showToast } = useToast();

  const load = async () => {
    setUnits(await listCodes('unit'));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const { error } = await addCode({ main: 'unit', name: newName.trim(), sortOrder: units.length });
    if (error) showToast('저장 실패: ' + error.message);
    else { setNewName(''); await load(); showToast('저장되었습니다.'); }
    setSaving(false);
  };

  const remove = async (id: string) => {
    await deleteCode(id);
    setUnits((prev) => prev.filter((u) => u.id !== id));
    showToast('삭제되었습니다.');
  };

  return (
    <View style={{ flex: 1 }}>
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
              onSubmitEditing={add}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.addBtn} onPress={add} disabled={saving || !newName.trim()}>
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
                <TouchableOpacity onPress={() => remove(u.id)} style={styles.deleteBtn}>
                  <Text style={styles.deleteBtnText}>삭제</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}
        <View style={{ height: Spacing.xl }} />
      </ScrollView>
      <Toast message={toastMessage} visible={toastVisible} />
    </View>
  );
}

// ── 비용항목 탭 ──────────────────────────────────────────────────────────────
function ExpenseTab() {
  const [items, setItems] = useState<CommonCodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const { toastMessage, toastVisible, showToast } = useToast();

  const load = async () => {
    setItems(await listCodes('exps'));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const { error } = await addCode({ main: 'exps', name: newName.trim(), sortOrder: items.length });
    if (error) showToast('저장 실패: ' + error.message);
    else { setNewName(''); await load(); showToast('저장되었습니다.'); }
    setSaving(false);
  };

  const remove = async (id: string) => {
    await deleteCode(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    showToast('삭제되었습니다.');
  };

  return (
    <View style={{ flex: 1 }}>
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
              onSubmitEditing={add}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.addBtn} onPress={add} disabled={saving || !newName.trim()}>
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
                <TouchableOpacity onPress={() => remove(item.id)} style={styles.deleteBtn}>
                  <Text style={styles.deleteBtnText}>삭제</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}
        <View style={{ height: Spacing.xl }} />
      </ScrollView>
      <Toast message={toastMessage} visible={toastVisible} />
    </View>
  );
}

const styles = StyleSheet.create({
  readOnlyBanner: {
    backgroundColor: '#FFF3CD', borderBottomWidth: 1, borderBottomColor: '#FFD700',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
  },
  readOnlyText: { fontSize: 13, fontWeight: '600', color: '#856404', textAlign: 'center' },
  tabsRow: {
    flexDirection: 'row', margin: Spacing.lg, marginBottom: 0,
    backgroundColor: Colors.border, borderRadius: Radius.full, padding: 3,
  },
  tabBtn: { flex: 1, paddingVertical: 9, paddingHorizontal: 18, alignItems: 'center', borderRadius: Radius.full },
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
