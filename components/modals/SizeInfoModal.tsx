import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { PhIcon } from '../ui/PhIcon';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';

export interface SizeData {
  name: string;
  range: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  sizes: SizeData[];
}

export function SizeInfoModal({ visible, onClose, sizes }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1}>
        <TouchableOpacity activeOpacity={1} style={styles.container}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: Spacing.md }}>
            <PhIcon name="blueberry" size={20} color={Colors.primary} />
            <Text style={[styles.title, { marginBottom: 0 }]}>블루베리 사이즈 기준</Text>
          </View>
          {sizes.map((s) => (
            <View key={s.name} style={styles.row}>
              <View style={styles.badge}>
                <Text style={styles.badgeName}>{s.name}</Text>
              </View>
              <Text style={styles.range}>{s.range}</Text>
            </View>
          ))}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>확인</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  container: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: Spacing.lg, width: 280,
  },
  title: { ...Typography.h3, marginBottom: Spacing.md, textAlign: 'center' },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  badge: {
    backgroundColor: Colors.primaryUltraLight, borderRadius: Radius.md,
    paddingHorizontal: 12, paddingVertical: 4, minWidth: 60, alignItems: 'center',
  },
  badgeName: { color: Colors.primaryDark, fontWeight: '700', fontSize: 14 },
  range: { marginLeft: Spacing.md, ...Typography.body, color: Colors.textSub },
  closeBtn: {
    marginTop: Spacing.md, backgroundColor: Colors.primaryUltraLight,
    borderRadius: Radius.md, paddingVertical: 10, alignItems: 'center',
  },
  closeBtnText: { color: Colors.primaryDark, fontWeight: '700' },
});
