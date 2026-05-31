import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, FlatList } from 'react-native';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';

interface Props {
  visible: boolean;
  title: string;
  options: string[];
  value: string;
  onSelect: (v: string) => void;
  onClose: () => void;
  allowCustom?: boolean;
}

export function SelectModal({ visible, title, options, value, onSelect, onClose, allowCustom }: Props) {
  const [customInput, setCustomInput] = useState('');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>
          <FlatList
            data={options}
            keyExtractor={(item) => item}
            style={{ maxHeight: 300 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.option, value === item && styles.optionSelected]}
                onPress={() => { onSelect(item); onClose(); }}
              >
                <Text style={[styles.optionText, value === item && styles.optionTextSelected]}>{item}</Text>
                {value === item && <Text style={styles.check}>✓</Text>}
              </TouchableOpacity>
            )}
          />
          {allowCustom && (
            <View style={styles.customRow}>
              <TextInput
                style={styles.customInput}
                value={customInput}
                onChangeText={setCustomInput}
                placeholder="직접 입력..."
                placeholderTextColor={Colors.textLight}
              />
              <TouchableOpacity
                style={styles.customBtn}
                onPress={() => { if (customInput.trim()) { onSelect(customInput.trim()); onClose(); } }}
              >
                <Text style={styles.customBtnText}>추가</Text>
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>취소</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
    padding: Spacing.lg, paddingBottom: Spacing.xl,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border,
    alignSelf: 'center', marginBottom: Spacing.md,
  },
  title: { ...Typography.h3, marginBottom: Spacing.md },
  option: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  optionSelected: { backgroundColor: Colors.primaryUltraLight, marginHorizontal: -Spacing.lg, paddingHorizontal: Spacing.lg },
  optionText: { ...Typography.body },
  optionTextSelected: { color: Colors.primaryDark, fontWeight: '600' },
  check: { color: Colors.primary, fontSize: 16, fontWeight: '700' },
  customRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  customInput: {
    flex: 1, backgroundColor: Colors.background, borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: Colors.text,
    borderWidth: 1, borderColor: Colors.border,
  },
  customBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, alignItems: 'center', justifyContent: 'center',
  },
  customBtnText: { color: '#fff', fontWeight: '700' },
  closeBtn: {
    marginTop: Spacing.md, backgroundColor: Colors.background, borderRadius: Radius.md,
    paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  closeBtnText: { color: Colors.textSub, fontWeight: '600' },
});
