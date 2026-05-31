import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';

interface Props {
  visible: boolean;
  value: string;
  onSelect: (time: string) => void;
  onClose: () => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

export function TimePickerModal({ visible, value, onSelect, onClose }: Props) {
  const [hour, setHour] = useState('09');
  const [minute, setMinute] = useState('00');

  useEffect(() => {
    if (visible) {
      if (value) {
        const parts = value.split(':');
        setHour(parts[0] || '09');
        setMinute(parts[1] || '00');
      }
    }
  }, [visible]);

  const handleConfirm = () => {
    onSelect(`${hour}:${minute}`);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>시간 선택</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.pickerRow}>
            <View style={styles.col}>
              <Text style={styles.colLabel}>시</Text>
              <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                {HOURS.map((h) => (
                  <TouchableOpacity
                    key={h}
                    style={[styles.item, hour === h && styles.itemActive]}
                    onPress={() => setHour(h)}
                  >
                    <Text style={[styles.itemText, hour === h && styles.itemTextActive]}>{h}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Text style={styles.colon}>:</Text>

            <View style={styles.col}>
              <Text style={styles.colLabel}>분</Text>
              <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                {MINUTES.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.item, minute === m && styles.itemActive]}
                    onPress={() => setMinute(m)}
                  >
                    <Text style={[styles.itemText, minute === m && styles.itemTextActive]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={styles.preview}>
            <Text style={styles.previewText}>{hour}:{minute}</Text>
          </View>

          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
            <Text style={styles.confirmText}>확인</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: { ...Typography.h3 },
  closeBtn: { fontSize: 18, color: Colors.textSub },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  col: { flex: 1, alignItems: 'center' },
  colLabel: { ...Typography.label, marginBottom: Spacing.sm, color: Colors.textSub },
  scroll: { height: 200 },
  item: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: Radius.md,
    alignItems: 'center',
    width: '100%',
  },
  itemActive: { backgroundColor: Colors.primaryUltraLight },
  itemText: { fontSize: 20, color: Colors.textSub, fontWeight: '500' },
  itemTextActive: { color: Colors.primary, fontWeight: '800' },
  colon: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 44,
  },
  preview: {
    alignItems: 'center',
    marginVertical: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primaryUltraLight,
    borderRadius: Radius.md,
  },
  previewText: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 2,
  },
  confirmBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  confirmText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
