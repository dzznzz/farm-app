import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';
import { fetchBreakdown } from '../../hooks/useStats';
import { BreakdownItem } from '../../types';

type TabKey = 'crop' | 'variety' | 'size';

interface Props {
  visible: boolean;
  onClose: () => void;
  userId: string;
  from: string;
  to: string;
  farmId?: string;
  farmIds?: string[];
}

export function BreakdownModal({ visible, onClose, userId, from, to, farmId, farmIds }: Props) {
  const [tab, setTab] = useState<TabKey>('crop');
  const [data, setData] = useState<{ byCrop: BreakdownItem[]; byVariety: BreakdownItem[]; bySize: BreakdownItem[] } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    fetchBreakdown(userId, from, to, farmId, farmIds).then((d) => { setData(d); setLoading(false); });
  }, [visible, userId, from, to, farmId, farmIds]);

  const items = data ? (tab === 'crop' ? data.byCrop : tab === 'variety' ? data.byVariety : data.bySize) : [];
  const maxVal = items.reduce((m, i) => Math.max(m, i.harvest, i.sales), 1);

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'crop', label: '작물별' },
    { key: 'variety', label: '품종별' },
    { key: 'size', label: '사이즈별' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.titleRow}>
            <Text style={styles.title}>상세 분석</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeX}>
              <Text style={styles.closeXText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tabs}>
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

          {loading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: 40 }} />
          ) : items.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>데이터가 없습니다</Text>
            </View>
          ) : (
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {items.map((item) => (
                <View key={item.key} style={styles.itemCard}>
                  <Text style={styles.itemKey}>{item.key}</Text>
                  <View style={styles.barRow}>
                    <Text style={styles.barLabel}>수확</Text>
                    <View style={styles.barBg}>
                      <View style={[styles.barFill, { width: `${(item.harvest / maxVal) * 100}%`, backgroundColor: Colors.primary }]} />
                    </View>
                    <Text style={styles.barValue}>{item.harvest.toLocaleString()}kg</Text>
                  </View>
                  <View style={styles.barRow}>
                    <Text style={styles.barLabel}>판매</Text>
                    <View style={styles.barBg}>
                      <View style={[styles.barFill, { width: `${(item.sales / maxVal) * 100}%`, backgroundColor: Colors.success }]} />
                    </View>
                    <Text style={styles.barValue}>{item.sales.toLocaleString()}kg</Text>
                  </View>
                  {item.other > 0 && (
                    <View style={styles.barRow}>
                      <Text style={styles.barLabel}>기타</Text>
                      <View style={styles.barBg}>
                        <View style={[styles.barFill, { width: `${(item.other / maxVal) * 100}%`, backgroundColor: Colors.danger }]} />
                      </View>
                      <Text style={styles.barValue}>{item.other.toLocaleString()}kg</Text>
                    </View>
                  )}
                </View>
              ))}
              <View style={{ height: Spacing.lg }} />
            </ScrollView>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
    padding: Spacing.lg, paddingBottom: Spacing.xl, maxHeight: '85%',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.md },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  title: { ...Typography.h3 },
  closeX: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  closeXText: { fontSize: 16, color: Colors.textSub },
  tabs: {
    flexDirection: 'row', backgroundColor: Colors.border, borderRadius: Radius.full,
    padding: 3, marginBottom: Spacing.md,
  },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: Radius.full },
  tabBtnActive: { backgroundColor: Colors.surface },
  tabText: { fontSize: 13, fontWeight: '600', color: Colors.textSub },
  tabTextActive: { color: Colors.primary },
  list: { flex: 1 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { ...Typography.body, color: Colors.textSub },
  itemCard: {
    backgroundColor: Colors.background, borderRadius: Radius.md, padding: Spacing.md,
    marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border,
  },
  itemKey: { ...Typography.bodyBold, marginBottom: Spacing.sm },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  barLabel: { width: 30, fontSize: 12, color: Colors.textSub, fontWeight: '600' },
  barBg: { flex: 1, height: 10, backgroundColor: Colors.border, borderRadius: 5, marginHorizontal: 8, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5 },
  barValue: { width: 60, fontSize: 12, color: Colors.text, fontWeight: '500', textAlign: 'right' },
});
