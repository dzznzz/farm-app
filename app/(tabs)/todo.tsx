import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/ui/Card';
import { Toast, useToast } from '../../components/ui/Toast';
import { TimePickerModal } from '../../components/modals/TimePickerModal';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowAlert: true,
  }),
});

interface Todo {
  id: string;
  date: string;
  time: string | null;
  text: string;
  completed: boolean;
}

function formatDisplayDate(dateStr: string) {
  const d = new Date(dateStr);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

function addDays(dateStr: string, delta: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + delta);
  return d.toISOString().split('T')[0];
}

function sortByTime(todos: Todo[]) {
  return [...todos].sort((a, b) => {
    if (!a.time && !b.time) return 0;
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.localeCompare(b.time);
  });
}

async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function scheduleAlarm(todoId: string, date: string, time: string, text: string) {
  const [h, m] = time.split(':').map(Number);
  const triggerDate = new Date(`${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
  triggerDate.setMinutes(triggerDate.getMinutes() - 10);
  if (triggerDate <= new Date()) return;
  const id = await Notifications.scheduleNotificationAsync({
    content: { title: '할 일 알림 (10분 후)', body: text, sound: true },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
  });
  await AsyncStorage.setItem(`todo_alarm_${todoId}`, id);
}

async function cancelAlarm(todoId: string) {
  const id = await AsyncStorage.getItem(`todo_alarm_${todoId}`);
  if (id) {
    await Notifications.cancelScheduledNotificationAsync(id);
    await AsyncStorage.removeItem(`todo_alarm_${todoId}`);
  }
}

export default function TodoScreen() {
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newText, setNewText] = useState('');
  const [newTime, setNewTime] = useState('00:00');
  const [newAlarm, setNewAlarm] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editAlarm, setEditAlarm] = useState(false);
  const [showEditTimePicker, setShowEditTimePicker] = useState(false);
  const { toastMessage, toastVisible, showToast } = useToast();
  const [showAlarmTooltip, setShowAlarmTooltip] = useState(false);
  const [showEditAlarmTooltip, setShowEditAlarmTooltip] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      Notifications.getPermissionsAsync();
    }
  }, []);

  const load = async (d: string) => {
    if (!user) return;
    const { data } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', d)
      .order('created_at');
    setTodos(sortByTime(data ?? []));
  };

  useFocusEffect(useCallback(() => { load(date); }, [date, user]));

  const handleDateChange = (delta: number) => {
    const next = addDays(date, delta);
    setDate(next);
    load(next);
  };

  const handleAdd = async () => {
    const text = newText.trim();
    if (!text) { showToast('내용을 입력해주세요.'); return; }
    if (!newTime.trim()) { showToast('시간을 선택해주세요.'); return; }
    if (!user) return;

    const { data, error } = await supabase
      .from('todos')
      .insert({ user_id: user.id, date, text, time: newTime, completed: false })
      .select()
      .single();
    if (!error && data) {
      if (newAlarm && Platform.OS !== 'web') {
        const granted = await requestNotificationPermission();
        if (granted) {
          await scheduleAlarm(data.id, date, newTime, text);
        }
      }
      setTodos((prev) => sortByTime([...prev, data]));
      setNewText('');
      setNewTime('00:00');
      setNewAlarm(false);
      showToast('저장되었습니다.');
    }
  };

  const handleToggle = async (id: string, completed: boolean) => {
    await supabase.from('todos').update({ completed: !completed }).eq('id', id);
    if (!completed) await cancelAlarm(id);
    setTodos((prev) => prev.map((t) => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleDelete = async (id: string) => {
    await supabase.from('todos').delete().eq('id', id);
    await cancelAlarm(id);
    setTodos((prev) => prev.filter((t) => t.id !== id));
    showToast('삭제되었습니다.');
  };

  const handleStartEdit = async (todo: Todo) => {
    setEditingId(todo.id);
    setEditText(todo.text);
    setEditTime(todo.time ?? '');
    setShowEditAlarmTooltip(false);
    // 기존에 알람이 설정돼 있으면 스위치를 ON 상태로 복원
    if (Platform.OS !== 'web') {
      const existingId = await AsyncStorage.getItem(`todo_alarm_${todo.id}`);
      setEditAlarm(!!existingId);
    } else {
      setEditAlarm(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
    setEditTime('');
    setEditAlarm(false);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editText.trim()) return;
    const time = editTime.trim() || null;
    const { error } = await supabase
      .from('todos')
      .update({ text: editText.trim(), time })
      .eq('id', editingId);
    if (!error) {
      await cancelAlarm(editingId);
      if (editAlarm && time && Platform.OS !== 'web') {
        const granted = await requestNotificationPermission();
        if (granted) {
          await scheduleAlarm(editingId, date, time, editText.trim());
        }
      }
      setTodos((prev) => sortByTime(prev.map((t) =>
        t.id === editingId ? { ...t, text: editText.trim(), time } : t
      )));
      setEditingId(null);
      setEditText('');
      setEditTime('');
      setEditAlarm(false);
      showToast('수정되었습니다.');
    }
  };

  const handleClearCompleted = async () => {
    const completedIds = todos.filter((t) => t.completed).map((t) => t.id);
    if (!completedIds.length) return;
    await supabase.from('todos').delete().in('id', completedIds);
    await Promise.all(completedIds.map(cancelAlarm));
    setTodos((prev) => prev.filter((t) => !t.completed));
    showToast(`${completedIds.length}개 삭제되었습니다.`);
  };

  const doneCount = todos.filter((t) => t.completed).length;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={[Colors.primaryUltraLight, Colors.background]} style={styles.headerGradient}>
        <Text style={styles.title}>할 일</Text>
        <View style={styles.dateNav}>
          <TouchableOpacity style={styles.navBtn} onPress={() => handleDateChange(-1)}>
            <Text style={styles.navArrow}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setDate(today); load(today); }} style={styles.dateLabel}>
            <Text style={styles.dateText}>{formatDisplayDate(date)}</Text>
            {date === today && <Text style={styles.todayBadge}>오늘</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => handleDateChange(1)}>
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>
        </View>
        {todos.length > 0 && (
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>{doneCount}/{todos.length} 완료</Text>
            {doneCount > 0 && (
              <TouchableOpacity onPress={handleClearCompleted} style={styles.clearBtn}>
                <Text style={styles.clearBtnText}>완료 항목 삭제</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: Spacing.xl * 2 }}>
          {todos.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyText}>할 일이 없어요</Text>
              <Text style={styles.emptySubText}>아래에서 추가해보세요</Text>
            </View>
          ) : (
            <Card style={styles.listCard}>
              {todos.map((todo, i) => (
                <View key={todo.id} style={[styles.todoRow, i > 0 && styles.todoBorder]}>
                  {editingId === todo.id ? (
                    <View style={{ flex: 1 }}>
                      <TextInput
                        style={styles.editInput}
                        value={editText}
                        onChangeText={setEditText}
                        autoFocus
                        returnKeyType="done"
                      />
                      <View style={styles.editActions}>
                        <TouchableOpacity
                          style={styles.editTimeBtn}
                          onPress={() => setShowEditTimePicker(true)}
                        >
                          <Text style={[styles.editTimeBtnText, editTime ? styles.editTimeBtnActive : null]}>
                            {editTime ? `🕐 ${editTime}` : '⏰ 시간'}
                          </Text>
                          {editTime ? (
                            <TouchableOpacity
                              onPress={() => setEditTime('')}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Text style={styles.editTimeClear}>✕</Text>
                            </TouchableOpacity>
                          ) : null}
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.editSaveBtn} onPress={handleSaveEdit}>
                          <Text style={styles.editSaveBtnText}>저장</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.editCancelBtn} onPress={handleCancelEdit}>
                          <Text style={styles.editCancelBtnText}>취소</Text>
                        </TouchableOpacity>
                      </View>
                      <View>
                        <View style={styles.alarmRow}>
                          <TouchableOpacity
                            onPress={() => setShowEditAlarmTooltip((v) => !v)}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Text style={styles.alarmLabel}>🔔 알람 설정 (10분 전)</Text>
                          </TouchableOpacity>
                          <Switch
                            value={editAlarm}
                            onValueChange={setEditAlarm}
                            trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                            thumbColor={editAlarm ? Colors.primary : Colors.textLight}
                          />
                        </View>
                        {showEditAlarmTooltip && (
                          <View style={styles.tooltipBox}>
                            <Text style={styles.tooltipText}>지정한 시간의 10분 전 알람으로 알려드려요. ㅁ-ㅁ7</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={styles.checkbox}
                        onPress={() => handleToggle(todo.id, todo.completed)}
                      >
                        <View style={[styles.checkboxInner, todo.completed && styles.checkboxChecked]}>
                          {todo.completed ? <Text style={styles.checkmark}>✓</Text> : null}
                        </View>
                      </TouchableOpacity>
                      <View style={styles.todoContent}>
                        <Text style={[styles.todoText, todo.completed && styles.todoTextDone]}>
                          {todo.text}
                        </Text>
                        {todo.time ? (
                          <Text style={styles.todoTime}>🕐 {todo.time}</Text>
                        ) : null}
                      </View>
                      <TouchableOpacity onPress={() => handleStartEdit(todo)} style={styles.editBtn}>
                        <Text style={styles.editBtnText}>수정</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(todo.id)} style={styles.deleteBtn}>
                        <Text style={styles.deleteText}>삭제</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              ))}
            </Card>
          )}
        </ScrollView>

        <View style={styles.addBar}>
          <View style={styles.addInputGroup}>
            <TextInput
              style={styles.addInput}
              placeholder="할 일 추가..."
              placeholderTextColor={Colors.textLight}
              value={newText}
              onChangeText={setNewText}
              onSubmitEditing={handleAdd}
              returnKeyType="done"
            />
            <View style={styles.addBottomRow}>
              <TouchableOpacity style={styles.addTimeBtn} onPress={() => setShowTimePicker(true)}>
                <Text style={[styles.addTimeBtnText, newTime ? styles.addTimeBtnActive : null]}>
                  {newTime ? `🕐 ${newTime}` : '⏰ 시간 선택'}
                </Text>
                {newTime ? (
                  <TouchableOpacity onPress={() => setNewTime('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={styles.addTimeClear}>✕</Text>
                  </TouchableOpacity>
                ) : null}
              </TouchableOpacity>
              <View>
                <View style={styles.alarmToggle}>
                  <TouchableOpacity
                    onPress={() => setShowAlarmTooltip((v) => !v)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Text style={styles.alarmSmallLabel}>🔔</Text>
                  </TouchableOpacity>
                  <Switch
                    value={newAlarm}
                    onValueChange={setNewAlarm}
                    trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                    thumbColor={newAlarm ? Colors.primary : Colors.textLight}
                    style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                  />
                </View>
                {showAlarmTooltip && (
                  <View style={[styles.tooltipBox, styles.tooltipBoxBottom]}>
                    <Text style={styles.tooltipText}>지정한 시간의 10분 전 알람으로 알려드려요. ㅁ-ㅁ7</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.addBtn, !newText.trim() && styles.addBtnDisabled]}
            onPress={handleAdd}
            disabled={!newText.trim()}
          >
            <Text style={styles.addBtnText}>추가</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <TimePickerModal
        visible={showTimePicker}
        value={newTime}
        onSelect={setNewTime}
        onClose={() => setShowTimePicker(false)}
      />
      <TimePickerModal
        visible={showEditTimePicker}
        value={editTime}
        onSelect={setEditTime}
        onClose={() => setShowEditTimePicker(false)}
      />
      <Toast message={toastMessage} visible={toastVisible} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerGradient: { paddingBottom: Spacing.md },
  title: { ...Typography.h2, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, marginBottom: Spacing.sm },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },
  navBtn: { padding: 8 },
  navArrow: { fontSize: 28, color: Colors.primary, fontWeight: '300' },
  dateLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateText: { fontSize: 16, fontWeight: '700', color: Colors.text },
  todayBadge: {
    fontSize: 11, fontWeight: '700', color: Colors.primary,
    backgroundColor: Colors.primaryUltraLight, paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.primaryLight,
  },
  progressRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, marginTop: Spacing.sm,
  },
  progressText: { ...Typography.caption, color: Colors.primary, fontWeight: '700' },
  clearBtn: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.danger,
  },
  clearBtnText: { fontSize: 12, color: Colors.danger, fontWeight: '600' },
  scroll: { flex: 1 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { ...Typography.bodyBold, color: Colors.textSub },
  emptySubText: { ...Typography.caption, marginTop: 4 },
  listCard: { margin: Spacing.lg, padding: 0, overflow: 'hidden' },
  todoRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 12,
  },
  todoBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  checkbox: { marginRight: 12 },
  checkboxInner: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '800' },
  todoContent: { flex: 1 },
  todoText: { ...Typography.body, color: Colors.text },
  todoTextDone: { color: Colors.textLight, textDecorationLine: 'line-through' },
  todoTime: { fontSize: 12, color: Colors.textSub, marginTop: 2 },
  editBtn: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.primary,
    marginLeft: 8,
  },
  editBtnText: { color: Colors.primary, fontSize: 12, fontWeight: '600' },
  deleteBtn: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.danger,
    marginLeft: 8,
  },
  deleteText: { color: Colors.danger, fontSize: 12, fontWeight: '600' },
  editInput: {
    backgroundColor: Colors.background, borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm, paddingVertical: 8,
    fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.primary,
    marginBottom: 6,
  },
  editActions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  editTimeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.background, borderRadius: Radius.md,
    paddingHorizontal: 8, paddingVertical: 6,
    borderWidth: 1, borderColor: Colors.border,
  },
  editTimeBtnText: { fontSize: 12, color: Colors.textLight },
  editTimeBtnActive: { color: Colors.primary, fontWeight: '600' },
  editTimeClear: { fontSize: 11, color: Colors.textSub },
  editSaveBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  editSaveBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  editCancelBtn: {
    borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: Colors.border,
  },
  editCancelBtnText: { color: Colors.textSub, fontSize: 12, fontWeight: '600' },
  alarmRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 6, paddingHorizontal: 2,
  },
  alarmLabel: { fontSize: 12, color: Colors.textSub },
  addBar: {
    flexDirection: 'row', gap: Spacing.sm,
    padding: Spacing.md, paddingBottom: Spacing.lg,
    backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  addInputGroup: { flex: 1, gap: 6 },
  addInput: {
    backgroundColor: Colors.background,
    borderRadius: Radius.md, paddingHorizontal: Spacing.md,
    paddingVertical: 11, fontSize: 15, color: Colors.text,
    borderWidth: 1, borderColor: Colors.border,
  },
  addBottomRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addTimeBtn: {
    flex: 1, backgroundColor: Colors.background,
    borderRadius: Radius.md, paddingHorizontal: Spacing.md,
    paddingVertical: 9, borderWidth: 1, borderColor: Colors.border,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  addTimeBtnText: { fontSize: 13, color: Colors.textLight },
  addTimeBtnActive: { color: Colors.primary, fontWeight: '600' },
  addTimeClear: { fontSize: 13, color: Colors.textSub, paddingLeft: 8 },
  alarmToggle: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  alarmSmallLabel: { fontSize: 16 },
  addBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg, justifyContent: 'center',
  },
  addBtnDisabled: { backgroundColor: Colors.border },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  tooltipBox: {
    backgroundColor: Colors.text, borderRadius: Radius.md,
    padding: Spacing.sm, marginTop: 4,
  },
  tooltipBoxBottom: {
    backgroundColor: Colors.text, borderRadius: Radius.md,
    padding: Spacing.sm, marginBottom: 4,
  },
  tooltipText: { fontSize: 12, color: '#fff', lineHeight: 18 },
});
