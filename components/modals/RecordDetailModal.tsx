import { View, Text, StyleSheet, Modal, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { PhIcon } from '../ui/PhIcon';
import { supabase } from '../../lib/supabase';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';

export type RecordType = 'harvest' | 'sales' | 'other';

export interface DisplayRecord {
  id: string;
  type: RecordType;
  date: string;
  ownerId?: string | null;
  farmId?: string | null;
  farmName?: string | null;
  cropType: string | null;
  variety: string | null;
  size: string | null;
  quantity: number;
  unit: string | null;
  note?: string | null;
  pricePerUnit?: number | null;
  totalRevenue?: number | null;
  commissionRate?: number | null;
  commissionAmount?: number | null;
  extraCost?: number | null;
  buyer?: string | null;
  saleType?: string | null;
  otherSubType?: string | null;
  recipient?: string | null;
}

interface Props {
  visible: boolean;
  record: DisplayRecord | null;
  onClose: () => void;
  onDeleted: () => void;
  onEdit: (record: DisplayRecord) => void;
}

export function RecordDetailModal({ visible, record, onClose, onDeleted, onEdit }: Props) {
  if (!record) return null;

  const handleDelete = () => {
    Alert.alert(
      '삭제 확인',
      '삭제된 내용은 복구할 수 없습니다.\n정말 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            const table = record.type === 'harvest' ? 'harvest_records'
              : record.type === 'sales' ? 'sales_records' : 'other_records';
            const { error } = await supabase.from(table).delete().eq('id', record.id);
            if (error) { Alert.alert('오류', error.message); return; }
            if (record.type === 'harvest') {
              await supabase.from('labor_records').delete().eq('date', record.date);
            }
            onDeleted();
            onClose();
          },
        },
      ]
    );
  };

  const typeLabel = record.type === 'harvest' ? '수확'
    : record.type === 'sales' ? '판매'
    : record.otherSubType === 'gift' ? '나눔' : '폐기';
  const typeIcon = record.type === 'harvest' ? 'blueberry'
    : record.type === 'sales' ? 'money-wavy'
    : record.otherSubType === 'gift' ? 'handshake' : 'trash';
  const typeColor = record.type === 'harvest' ? Colors.primary
    : record.type === 'sales' ? Colors.success : Colors.danger;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.sheetHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <PhIcon name={typeIcon as any} size={16} color={typeColor} />
              <Text style={[styles.typeBadge, { color: typeColor }]}>{typeLabel}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
            <View style={styles.rows}>
              <Row label="날짜" value={record.date} />
              {record.farmName && <Row label="농장" value={record.farmName} />}
              {record.cropType && <Row label="작물" value={record.cropType} />}
              {record.variety && <Row label="품종" value={record.variety} />}
              {record.size && <Row label="사이즈" value={record.size} />}
              <Row label="수량" value={`${record.quantity} ${record.unit ?? 'kg'}`} />
              {record.type === 'sales' && record.saleType &&
                <Row label="판매 유형" value={record.saleType} />}
              {record.type === 'sales' && record.pricePerUnit != null &&
                <Row label="단가" value={`${record.pricePerUnit.toLocaleString()}원`} />}
              {record.type === 'sales' && record.totalRevenue != null &&
                <Row label="매출" value={`${record.totalRevenue.toLocaleString()}원`} />}
              {record.type === 'sales' && (record.commissionAmount ?? 0) > 0 &&
                <Row label="수수료" value={`${record.commissionAmount!.toLocaleString()}원`} />}
              {(record.type === 'sales' || record.type === 'other') && (record.extraCost ?? 0) > 0 &&
                <Row label="부수비용" value={`${record.extraCost!.toLocaleString()}원`} />}
              {record.type === 'sales' && record.buyer && <Row label="구매자" value={record.buyer} />}
              {record.type === 'other' && record.recipient && <Row label="받는 분" value={record.recipient} />}
              {record.note && <Row label="메모" value={record.note} />}
            </View>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.editBtn} onPress={() => { onClose(); onEdit(record); }}>
                <Text style={styles.editBtnText}>수정</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                <Text style={styles.deleteBtnText}>삭제</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: Spacing.lg, paddingBottom: 40, maxHeight: '80%',
  },
  handle: {
    width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2,
    alignSelf: 'center', marginTop: 12, marginBottom: Spacing.sm,
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Spacing.md,
  },
  typeBadge: { fontSize: 16, fontWeight: '700' },
  closeText: { fontSize: 18, color: Colors.textSub },
  rows: {
    backgroundColor: Colors.background, borderRadius: Radius.md,
    overflow: 'hidden', marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  rowLabel: { ...Typography.caption, color: Colors.textSub, width: 72 },
  rowValue: { ...Typography.body, flex: 1, textAlign: 'right' },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  editBtn: {
    flex: 1, backgroundColor: Colors.primaryUltraLight, borderRadius: Radius.md,
    paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: Colors.primary,
  },
  editBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 15 },
  deleteBtn: {
    flex: 1, backgroundColor: Colors.dangerLight, borderRadius: Radius.md,
    paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: Colors.danger,
  },
  deleteBtnText: { color: Colors.danger, fontWeight: '700', fontSize: 15 },
});
