import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../ui/Card';
import { useToast } from '../ui/Toast';
import { PhIcon } from '../ui/PhIcon';
import { SelectModal } from '../modals/SelectModal';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';
import { pageStyles } from './shared';
import {
  listCodes, listChildren, addCode, deleteCode,
  CommonCodeRow, MainCode,
} from '../../lib/commonCode';

interface Props { onBack: () => void; readOnly?: boolean }

// MAIN_CODE(관리 항목) 메타. 상단 탭 대신 select로 전체를 노출한다.
interface MainMeta {
  label: string;
  addTitle: string;
  placeholder: string;
  parent?: MainCode;   // 부모 코드가 필요한 경우(품종·사이즈는 작물에 종속)
  hasInfo?: boolean;   // 범위 등 부가정보 입력칸 사용(사이즈)
  desc?: string;
}

const MAIN_ORDER: MainCode[] = ['crop', 'vari', 'size', 'unit', 'exps'];

const MAIN_META: Record<MainCode, MainMeta> = {
  crop: { label: '작물', addTitle: '작물 추가', placeholder: '예) 블루베리, 딸기' },
  vari: { label: '품종', addTitle: '품종 추가', placeholder: '예) 신틸라, 오닐', parent: 'crop' },
  size: { label: '사이즈', addTitle: '사이즈 추가', placeholder: '이름 (예: 대)', parent: 'crop', hasInfo: true },
  unit: { label: '단위', addTitle: '단위 추가', placeholder: '예) 박스, 포, 트레이' },
  exps: {
    label: '비용 항목', addTitle: '비용 항목 추가', placeholder: '예) 택배비, 포장비, 인건비',
    desc: '판매 입력 시 부수비용 분류에 사용됩니다',
  },
};

export function AdminDataPage({ onBack, readOnly = false }: Props) {
  const toast = useToast();

  const [selectedMain, setSelectedMain] = useState<MainCode>('crop');
  const [pickerOpen, setPickerOpen] = useState(false);

  const [crops, setCrops] = useState<CommonCodeRow[]>([]);     // 부모 작물 목록(+ 작물 항목 자체)
  const [selectedCrop, setSelectedCrop] = useState('');        // 선택된 작물 desc_code
  const [items, setItems] = useState<CommonCodeRow[]>([]);     // 비-작물(단위/비용/품종/사이즈) 목록
  const [loading, setLoading] = useState(true);

  const [newName, setNewName] = useState('');
  const [newRange, setNewRange] = useState('');
  const [saving, setSaving] = useState(false);

  const meta = MAIN_META[selectedMain];
  const isHierarchical = !!meta.parent;
  const displayItems = selectedMain === 'crop' ? crops : items;
  const selectedCropName = crops.find((c) => c.desc_code === selectedCrop)?.name ?? '';

  const reloadCrops = useCallback(async () => {
    const rows = await listCodes('crop');
    setCrops(rows);
    setSelectedCrop((prev) => (prev && rows.some((r) => r.desc_code === prev))
      ? prev
      : (rows[0]?.desc_code ?? ''));
    return rows;
  }, []);

  const loadItems = useCallback(async () => {
    if (selectedMain === 'crop') return; // crops 상태가 목록을 담당
    setLoading(true);
    if (meta.parent) {
      if (!selectedCrop) { setItems([]); setLoading(false); return; }
      setItems(await listChildren(selectedMain, meta.parent, selectedCrop));
    } else {
      setItems(await listCodes(selectedMain));
    }
    setLoading(false);
  }, [selectedMain, selectedCrop, meta.parent]);

  useEffect(() => { reloadCrops().then(() => setLoading(false)); }, [reloadCrops]);
  useEffect(() => { loadItems(); }, [loadItems]);

  const changeMain = (m: MainCode) => {
    setSelectedMain(m);
    setNewName('');
    setNewRange('');
  };

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    if (isHierarchical && !selectedCrop) { toast.error('먼저 작물을 선택하세요'); return; }
    setSaving(true);
    const { error } = await addCode({
      main: selectedMain,
      name,
      sortOrder: displayItems.length,
      parentMain: meta.parent,
      parentDesc: meta.parent ? selectedCrop : undefined,
      info: meta.hasInfo ? (newRange.trim() || null) : undefined,
    });
    if (error) { toast.error('저장 실패: ' + error.message); setSaving(false); return; }
    setNewName('');
    setNewRange('');
    if (selectedMain === 'crop') await reloadCrops();
    else await loadItems();
    toast.success('저장되었습니다.');
    setSaving(false);
  };

  const remove = async (id: string) => {
    await deleteCode(id);
    if (selectedMain === 'crop') await reloadCrops();
    else setItems((prev) => prev.filter((x) => x.id !== id));
    toast.success('삭제되었습니다.');
  };

  const addTitle = isHierarchical && selectedCropName
    ? `${selectedCropName} ${meta.label} 추가`
    : meta.addTitle;

  const showAddCard = !isHierarchical || !!selectedCrop;

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
        <ScrollView style={pageStyles.scroll} keyboardShouldPersistTaps="handled">
          {/* 관리 항목(MAIN_CODE) 선택 — select 방식 */}
          <View style={styles.selectBlock}>
            <Text style={styles.selectLabel}>관리 항목</Text>
            <TouchableOpacity style={styles.mainSelect} onPress={() => setPickerOpen(true)} activeOpacity={0.7}>
              <Text style={styles.mainSelectValue}>{meta.label}</Text>
              <Text style={styles.caret}>▾</Text>
            </TouchableOpacity>
          </View>

          {/* 품종·사이즈: 부모 작물 선택 */}
          {isHierarchical && (
            crops.length > 0 ? (
              <View style={styles.cropSelector}>
                <Text style={styles.cropSelectorLabel}>작물</Text>
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
            ) : (
              <View style={styles.emptyHint}>
                <Text style={[Typography.body, { color: Colors.textSub }]}>먼저 작물을 추가하세요</Text>
              </View>
            )
          )}

          {/* 추가 카드 */}
          {showAddCard && (
            <Card style={styles.addCard}>
              <Text style={[Typography.bodyBold, { marginBottom: Spacing.sm }]}>{addTitle}</Text>
              {meta.desc && (
                <Text style={[Typography.caption, { marginBottom: Spacing.sm, color: Colors.textSub }]}>{meta.desc}</Text>
              )}
              {meta.hasInfo ? (
                <>
                  <View style={styles.addRow}>
                    <TextInput style={[styles.addInput, { flex: 1 }]} value={newName} onChangeText={setNewName} placeholder={meta.placeholder} placeholderTextColor={Colors.textLight} returnKeyType="next" />
                  </View>
                  <View style={[styles.addRow, { marginTop: 8 }]}>
                    <TextInput style={[styles.addInput, { flex: 1 }]} value={newRange} onChangeText={setNewRange} placeholder="범위 (예: 14~16mm, 선택)" placeholderTextColor={Colors.textLight} onSubmitEditing={add} returnKeyType="done" />
                    <TouchableOpacity style={styles.addBtn} onPress={add} disabled={saving || !newName.trim()}>
                      <Text style={styles.addBtnText}>{saving ? '...' : '추가'}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <View style={styles.addRow}>
                  <TextInput
                    style={styles.addInput}
                    value={newName}
                    onChangeText={setNewName}
                    placeholder={meta.placeholder}
                    placeholderTextColor={Colors.textLight}
                    onSubmitEditing={add}
                    returnKeyType="done"
                  />
                  <TouchableOpacity style={styles.addBtn} onPress={add} disabled={saving || !newName.trim()}>
                    <Text style={styles.addBtnText}>{saving ? '...' : '추가'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Card>
          )}

          {/* 목록 */}
          {loading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
          ) : (
            displayItems.map((item) => (
              <Card key={item.id} style={styles.itemCard}>
                <View style={styles.itemRow}>
                  <View>
                    <Text style={Typography.bodyBold}>{item.name}</Text>
                    {selectedMain === 'size' && item.info ? <Text style={Typography.caption}>{item.info}</Text> : null}
                  </View>
                  <TouchableOpacity onPress={() => remove(item.id)} style={styles.deleteBtn}>
                    <Text style={styles.deleteBtnText}>삭제</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))
          )}
          <View style={{ height: Spacing.xl }} />
        </ScrollView>
      </View>

      <SelectModal
        visible={pickerOpen}
        title="관리 항목 선택"
        options={MAIN_ORDER.map((m) => MAIN_META[m].label)}
        value={meta.label}
        onSelect={(label) => {
          const m = MAIN_ORDER.find((x) => MAIN_META[x].label === label);
          if (m) changeMain(m);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  readOnlyBanner: {
    backgroundColor: '#FFF3CD', borderBottomWidth: 1, borderBottomColor: '#FFD700',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
  },
  readOnlyText: { fontSize: 13, fontWeight: '600', color: '#856404', textAlign: 'center' },
  // MAIN_CODE select
  selectBlock: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
  selectLabel: { ...Typography.label, marginBottom: 6 },
  mainSelect: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  mainSelectValue: { ...Typography.bodyBold, color: Colors.text },
  caret: { fontSize: 14, color: Colors.textSub },
  addCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.sm },
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
  emptyHint: { alignItems: 'center', marginTop: 40 },
  cropSelector: {
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm,
  },
  cropSelectorLabel: { ...Typography.label, marginBottom: 6 },
  cropChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background,
    marginRight: 8,
  },
  cropChipActive: { backgroundColor: Colors.primaryUltraLight, borderColor: Colors.primary },
  cropChipText: { fontSize: 13, color: Colors.textSub, fontWeight: '500' },
  cropChipTextActive: { color: Colors.primaryDark, fontWeight: '700' },
});
