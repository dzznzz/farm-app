import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Colors, Spacing, Radius } from '../../constants/theme';

interface Props {
  visible: boolean;
  value: string;
  onSelect: (d: string) => void;
  onClose: () => void;
}

export function CalendarModal({ visible, value, onSelect, onClose }: Props) {
  const parsed = value.split('-');
  const [viewYear, setViewYear] = useState(parseInt(parsed[0]));
  const [viewMonth, setViewMonth] = useState(parseInt(parsed[1]) - 1);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const todayStr = new Date().toISOString().split('T')[0];

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1}>
        <TouchableOpacity activeOpacity={1} style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
              <Text style={styles.navText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthTitle}>{viewYear}년 {viewMonth + 1}월</Text>
            <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
              <Text style={styles.navText}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.weekRow}>
            {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
              <Text key={d} style={[styles.weekDay, i === 0 && { color: Colors.danger }, i === 6 && { color: Colors.primary }]}>
                {d}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((day, i) => {
              if (!day) return <View key={`e${i}`} style={styles.cell} />;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = dateStr === value;
              const isToday = dateStr === todayStr;
              const isSun = i % 7 === 0;
              const isSat = i % 7 === 6;
              return (
                <TouchableOpacity
                  key={dateStr}
                  style={[styles.cell, isSelected && styles.cellSelected, isToday && !isSelected && styles.cellToday]}
                  onPress={() => { onSelect(dateStr); onClose(); }}
                >
                  <Text style={[
                    styles.dayText,
                    isSelected && styles.daySelectedText,
                    !isSelected && isToday && { color: Colors.primary },
                    !isSelected && isSun && { color: Colors.danger },
                    !isSelected && isSat && { color: Colors.primary },
                  ]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>닫기</Text>
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
    padding: Spacing.lg, width: 320,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  navBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  navText: { fontSize: 24, color: Colors.primary, fontWeight: '700' },
  monthTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  weekRow: { flexDirection: 'row', marginBottom: Spacing.sm },
  weekDay: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: Colors.textSub },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  cellSelected: { backgroundColor: Colors.primary, borderRadius: Radius.full },
  cellToday: { borderWidth: 1, borderColor: Colors.primary, borderRadius: Radius.full },
  dayText: { fontSize: 14, color: Colors.text },
  daySelectedText: { color: '#fff', fontWeight: '700' },
  closeBtn: {
    marginTop: Spacing.md, backgroundColor: Colors.primaryUltraLight,
    borderRadius: Radius.md, paddingVertical: 10, alignItems: 'center',
  },
  closeBtnText: { color: Colors.primaryDark, fontWeight: '700' },
});
