import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Colors, Spacing, Radius } from '../../constants/theme';

interface Props {
  visible: boolean;
  value: string;
  onSelect: (d: string) => void;
  onClose: () => void;
  maxDate?: string;
  mode?: 'day' | 'week' | 'month' | 'year';
}

const MONTHS_KO = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

export function CalendarModal({ visible, value, onSelect, onClose, maxDate, mode = 'day' }: Props) {
  const parsed = value.split('-');
  const [viewYear, setViewYear] = useState(parseInt(parsed[0]));
  const [viewMonth, setViewMonth] = useState(parseInt(parsed[1] ?? '1') - 1);

  const todayStr = new Date().toISOString().split('T')[0];
  const limitStr = maxDate ?? todayStr;
  const limitYM = limitStr.slice(0, 7);
  const limitYear = parseInt(limitStr.slice(0, 4));

  const handleToday = () => {
    const d = new Date();
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    onSelect(todayStr);
    onClose();
  };

  const Footer = () => (
    <View style={styles.footer}>
      <TouchableOpacity style={styles.todayBtn} onPress={handleToday}>
        <Text style={styles.todayBtnText}>오늘</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
        <Text style={styles.closeBtnText}>닫기</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Year picker ──
  if (mode === 'year') {
    const selectedYear = parseInt(value.slice(0, 4));
    const centerYear = viewYear;
    const years = Array.from({ length: 12 }, (_, i) => centerYear - 5 + i);
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1}>
          <TouchableOpacity activeOpacity={1} style={styles.container}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setViewYear(y => y - 12)} style={styles.navBtn}>
                <Text style={styles.navText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.monthTitle}>연도 선택</Text>
              <TouchableOpacity
                onPress={() => setViewYear(y => y + 12)}
                style={styles.navBtn}
                disabled={centerYear + 6 > limitYear}
              >
                <Text style={[styles.navText, centerYear + 6 > limitYear && { color: Colors.border }]}>›</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.periodGrid}>
              {years.map((y) => {
                const isSelected = y === selectedYear;
                const isDisabled = y > limitYear;
                return (
                  <TouchableOpacity
                    key={y}
                    style={{ width: '33.33%', padding: 4 }}
                    onPress={() => { if (!isDisabled) { onSelect(`${y}-01-01`); onClose(); } }}
                    disabled={isDisabled}
                  >
                    <View style={[styles.periodCellInner, isSelected && styles.periodCellSelected, isDisabled && { opacity: 0.35 }]}>
                      <Text style={[styles.periodCellText, isSelected && styles.periodCellTextSelected]}>
                        {y}년
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Footer />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  }

  // ── Month picker ──
  if (mode === 'month') {
    const selectedYM = value.slice(0, 7);
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1}>
          <TouchableOpacity activeOpacity={1} style={styles.container}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setViewYear(y => y - 1)} style={styles.navBtn}>
                <Text style={styles.navText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.monthTitle}>{viewYear}년</Text>
              <TouchableOpacity
                onPress={() => setViewYear(y => y + 1)}
                style={styles.navBtn}
                disabled={viewYear >= limitYear}
              >
                <Text style={[styles.navText, viewYear >= limitYear && { color: Colors.border }]}>›</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.periodGrid}>
              {MONTHS_KO.map((m, i) => {
                const ym = `${viewYear}-${String(i + 1).padStart(2, '0')}`;
                const isSelected = ym === selectedYM;
                const isDisabled = ym > limitYM;
                return (
                  <TouchableOpacity
                    key={m}
                    style={{ width: '25%', padding: 4 }}
                    onPress={() => { if (!isDisabled) { onSelect(`${ym}-01`); onClose(); } }}
                    disabled={isDisabled}
                  >
                    <View style={[styles.periodCellInner, isSelected && styles.periodCellSelected, isDisabled && { opacity: 0.35 }]}>
                      <Text style={[styles.periodCellText, isSelected && styles.periodCellTextSelected]}>
                        {m}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Footer />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  }

  // ── Day / Week picker ──
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);

  const viewYM = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
  const isNextMonthDisabled = viewYM >= limitYM;

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (isNextMonthDisabled) return;
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  // Week mode: compute selected week range from value
  let weekStart = '';
  let weekEnd = '';
  if (mode === 'week') {
    const selD = new Date(value);
    const dow = selD.getDay();
    const mon = new Date(selD);
    mon.setDate(selD.getDate() - (dow === 0 ? 6 : dow - 1));
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    weekStart = mon.toISOString().split('T')[0];
    weekEnd = sun.toISOString().split('T')[0];
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1}>
        <TouchableOpacity activeOpacity={1} style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
              <Text style={styles.navText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthTitle}>{viewYear}년 {viewMonth + 1}월</Text>
            <TouchableOpacity onPress={nextMonth} style={styles.navBtn} disabled={isNextMonthDisabled}>
              <Text style={[styles.navText, isNextMonthDisabled && { color: Colors.border }]}>›</Text>
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
              const isFuture = dateStr > limitStr;
              const isSun = i % 7 === 0;
              const isSat = i % 7 === 6;
              const isInWeek = mode === 'week' && !!weekStart && dateStr >= weekStart && dateStr <= weekEnd;
              return (
                <TouchableOpacity
                  key={dateStr}
                  style={[
                    styles.cell,
                    isInWeek && !isFuture && styles.cellInWeek,
                  ]}
                  onPress={() => { if (!isFuture) { onSelect(dateStr); onClose(); } }}
                  disabled={isFuture}
                >
                  <View style={[
                    styles.dayCircle,
                    isSelected && styles.dayCircleSelected,
                    isToday && !isSelected && !isInWeek && styles.dayCircleToday,
                  ]}>
                    <Text style={[
                      styles.dayText,
                      isFuture && styles.dayFutureText,
                      isSelected && styles.daySelectedText,
                      isInWeek && !isFuture && !isSelected && styles.dayInWeekText,
                      !isSelected && !isInWeek && !isFuture && isToday && { color: Colors.primary },
                      !isSelected && !isInWeek && !isFuture && isSun && { color: Colors.danger },
                      !isSelected && !isInWeek && !isFuture && isSat && { color: Colors.primary },
                    ]}>
                      {day}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <Footer />
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
  cellInWeek: { backgroundColor: Colors.primaryUltraLight, borderRadius: Radius.sm },
  dayCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dayCircleSelected: { backgroundColor: Colors.primary },
  dayCircleToday: { borderWidth: 1.5, borderColor: Colors.primary },
  dayText: { fontSize: 14, color: Colors.text },
  dayFutureText: { color: Colors.border },
  daySelectedText: { color: '#fff', fontWeight: '700' },
  dayInWeekText: { color: Colors.primaryDark, fontWeight: '600' },
  // Period grids (month / year picker)
  periodGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: Spacing.sm },
  periodCellInner: {
    paddingVertical: 11, alignItems: 'center', justifyContent: 'center',
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  periodCellSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  periodCellText: { fontSize: 13, fontWeight: '600', color: Colors.text },
  periodCellTextSelected: { color: '#fff', fontWeight: '700' },
  // Footer
  footer: { flexDirection: 'row', gap: 8, marginTop: Spacing.md },
  todayBtn: {
    flex: 1, backgroundColor: Colors.primary,
    borderRadius: Radius.md, paddingVertical: 10, alignItems: 'center',
  },
  todayBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  closeBtn: {
    flex: 1, backgroundColor: Colors.primaryUltraLight,
    borderRadius: Radius.md, paddingVertical: 10, alignItems: 'center',
  },
  closeBtnText: { color: Colors.primaryDark, fontWeight: '700', fontSize: 14 },
});
