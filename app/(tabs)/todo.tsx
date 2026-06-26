import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, Switch, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useTabLeaveGuard } from '../../lib/tabLeaveGuard';
import { PhIcon } from '../../components/ui/PhIcon';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { myFarms, MyFarm } from '../../lib/farmAccess';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/ui/Card';
import { useToast } from '../../components/ui/Toast';
import { TimePickerModal } from '../../components/modals/TimePickerModal';
import { CalendarModal } from '../../components/modals/CalendarModal';
import { SelectModal } from '../../components/modals/SelectModal';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowAlert: true,
    }),
  });
}

interface Todo {
  id: string;
  date: string;
  time: string | null;
  text: string;
  completed: boolean;
  scope: 'personal' | 'shared';
  farmId: string | null;
  ownerId: string;
  authorName?: string | null; // 다른 구성원이 등록한 공유 할 일의 작성자명
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
  if (Platform.OS === 'web') return;
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
  const toast = useToast();
  const [showCalendar, setShowCalendar] = useState(false);
  const [showAlarmTooltip, setShowAlarmTooltip] = useState(false);
  const [showEditAlarmTooltip, setShowEditAlarmTooltip] = useState(false);
  // 개인/구성원 구분
  const [scope, setScope] = useState<'personal' | 'shared'>('personal');
  const [farmList, setFarmList] = useState<MyFarm[]>([]);
  const [sharedFarmId, setSharedFarmId] = useState<string | null>(null);
  const [showFarmPicker, setShowFarmPicker] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      Notifications.getPermissionsAsync();
    }
  }, []);

  // 참여 중인 농장 목록 (구성원 할 일의 농장 지정용) — 기본값은 대표 농장
  useEffect(() => {
    if (!user) return;
    myFarms(user.id).then((fs) => {
      setFarmList(fs);
      setSharedFarmId((prev) => prev ?? (fs.find((f) => f.is_primary) ?? fs[0])?.id ?? null);
    }).catch(() => {});
  }, [user]);

  const load = async (d: string) => {
    if (!user) return;
    // RLS: 본인 할 일 + 내가 속한 농장의 공유 할 일이 함께 조회된다.
    const { data } = await supabase
      .from('todos')
      .select('id, date, time, text, completed, scope, farm_id, user_id, created_at')
      .eq('date', d)
      .order('created_at');
    const rows = data ?? [];
    // 다른 구성원이 등록한 공유 할 일의 작성자 이름 매핑
    const otherIds = Array.from(new Set(
      rows.filter((r: any) => r.scope === 'shared' && r.user_id !== user.id).map((r: any) => r.user_id)
    ));
    let nameMap: Record<string, string> = {};
    if (otherIds.length) {
      const { data: profs } = await supabase.from('profiles').select('id, name').in('id', otherIds);
      (profs ?? []).forEach((p: any) => { nameMap[p.id] = p.name; });
    }
    const mapped: Todo[] = rows.map((r: any) => ({
      id: r.id, date: r.date, time: r.time, text: r.text, completed: r.completed,
      scope: r.scope ?? 'personal', farmId: r.farm_id ?? null, ownerId: r.user_id,
      authorName: r.scope === 'shared' && r.user_id !== user.id ? (nameMap[r.user_id] ?? '구성원') : null,
    }));
    setTodos(sortByTime(mapped));
  };

  useFocusEffect(useCallback(() => { load(date); }, [date, user]));

  // 저장 전 입력값이 있으면(추가 칸에 텍스트가 있거나 수정 중) 탭 이동 시 확인받는다.
  const hasUnsaved = newText.trim() !== '' || editingId !== null;
  const leaveGuard = useTabLeaveGuard('todo', () => hasUnsaved);

  // 탭을 떠나면 날짜·입력 칸을 최초 진입 상태(오늘)로 초기화
  useFocusEffect(useCallback(() => () => {
    setDate(today);
    setNewText('');
    setNewTime('00:00');
    setNewAlarm(false);
    setEditingId(null);
    setEditText('');
    setEditTime('');
    setEditAlarm(false);
    setShowTimePicker(false);
    setShowEditTimePicker(false);
    setShowCalendar(false);
    setShowAlarmTooltip(false);
    setShowEditAlarmTooltip(false);
    setScope('personal');
    setShowFarmPicker(false);
  }, [today]));

  const handleDateChange = (delta: number) => {
    const next = addDays(date, delta);
    setDate(next);
    load(next);
  };

  const handleAdd = async () => {
    const text = newText.trim();
    if (!text) { toast.error('내용을 입력해주세요.'); return; }
    if (!newTime.trim()) { toast.error('시간을 선택해주세요.'); return; }
    if (!user) return;

    const farmId = scope === 'shared' ? sharedFarmId : null;
    if (scope === 'shared' && !farmId) { toast.error('공유할 농장을 선택해주세요.'); return; }

    const { data, error } = await supabase
      .from('todos')
      .insert({ user_id: user.id, date, text, time: newTime, completed: false, scope, farm_id: farmId })
      .select()
      .single();
    if (!error && data) {
      if (newAlarm && Platform.OS !== 'web') {
        const granted = await requestNotificationPermission();
        if (granted) {
          await scheduleAlarm(data.id, date, newTime, text);
        }
      }
      const added: Todo = {
        id: data.id, date: data.date, time: data.time, text: data.text, completed: data.completed,
        scope: data.scope ?? 'personal', farmId: data.farm_id ?? null, ownerId: data.user_id, authorName: null,
      };
      setTodos((prev) => sortByTime([...prev, added]));
      setNewText('');
      setNewTime('00:00');
      setNewAlarm(false);
      toast.success('저장되었습니다.');
    } else if (error) {
      toast.error('저장에 실패했습니다.');
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
    toast.success('삭제되었습니다.');
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
      toast.success('수정되었습니다.');
    }
  };

  const handleClearCompleted = async () => {
    const completedIds = todos.filter((t) => t.completed).map((t) => t.id);
    if (!completedIds.length) return;
    await supabase.from('todos').delete().in('id', completedIds);
    await Promise.all(completedIds.map(cancelAlarm));
    setTodos((prev) => prev.filter((t) => !t.completed));
    toast.success(`${completedIds.length}개 삭제되었습니다.`);
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
          <TouchableOpacity onPress={() => setShowCalendar(true)} style={styles.dateLabel}>
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
              <PhIcon name="clipboard-text" size={48} color={Colors.textLight} style={{ marginBottom: 12 }} />
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
                            {editTime ? editTime : '시간'}
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
                      <View style={styles.alarmTooltipWrapper}>
                        <View style={styles.alarmRow}>
                          <TouchableOpacity
                            onPress={() => setShowEditAlarmTooltip((v) => !v)}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <PhIcon name="bell" size={14} color={Colors.textSub} />
                      <Text style={styles.alarmLabel}>알람 설정 (10분 전)</Text>
                    </View>
                          </TouchableOpacity>
                          <Switch
                            value={editAlarm}
                            onValueChange={setEditAlarm}
                            trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                            thumbColor={editAlarm ? Colors.primary : Colors.textLight}
                          />
                        </View>
                        {showEditAlarmTooltip && (
                          <View style={styles.tooltipFloating}>
                            <Text style={styles.tooltipText}>10분 전에 알람을 보내드려요. ㅁ-ㅁ7</Text>
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
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                          {todo.time ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                              <PhIcon name="clock" size={12} color={Colors.textSub} />
                              <Text style={styles.todoTime}>{todo.time}</Text>
                            </View>
                          ) : null}
                          {todo.scope === 'shared' ? (
                            <View style={styles.todoSharedBadge}>
                              <PhIcon name="users-three" size={10} color={Colors.primary} />
                              <Text style={styles.todoSharedText}>
                                {todo.authorName ? `구성원 · ${todo.authorName}` : '구성원'}
                              </Text>
                            </View>
                          ) : null}
                        </View>
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
            {/* 구분: 개인 / 구성원 */}
            <View style={styles.scopeRow}>
              <TouchableOpacity
                style={[styles.scopeBtn, scope === 'personal' && styles.scopeBtnActive]}
                onPress={() => setScope('personal')}
              >
                <PhIcon name="user" size={13} color={scope === 'personal' ? Colors.primary : Colors.textSub} />
                <Text style={[styles.scopeBtnText, scope === 'personal' && styles.scopeBtnTextActive]}>개인</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.scopeBtn, scope === 'shared' && styles.scopeBtnActive]}
                onPress={() => {
                  if (!farmList.length) { toast.info('참여 중인 농장이 없어요.'); return; }
                  setScope('shared');
                }}
              >
                <PhIcon name="users-three" size={13} color={scope === 'shared' ? Colors.primary : Colors.textSub} />
                <Text style={[styles.scopeBtnText, scope === 'shared' && styles.scopeBtnTextActive]}>구성원</Text>
              </TouchableOpacity>
              {scope === 'shared' && farmList.length > 1 && (
                <TouchableOpacity style={styles.farmPickBtn} onPress={() => setShowFarmPicker(true)}>
                  <Text style={styles.farmPickText} numberOfLines={1}>
                    {farmList.find((f) => f.id === sharedFarmId)?.name ?? '농장 선택'}
                  </Text>
                  <Text style={styles.farmPickArrow}>▾</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.addBottomRow}>
              <TouchableOpacity style={styles.addTimeBtn} onPress={() => setShowTimePicker(true)}>
                <Text style={[styles.addTimeBtnText, newTime ? styles.addTimeBtnActive : null]}>
                  {newTime ? newTime : '시간 선택'}
                </Text>
                {newTime ? (
                  <TouchableOpacity onPress={() => setNewTime('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={styles.addTimeClear}>✕</Text>
                  </TouchableOpacity>
                ) : null}
              </TouchableOpacity>
              <View style={styles.alarmTooltipWrapper}>
                <View style={styles.alarmToggle}>
                  <TouchableOpacity
                    onPress={() => setShowAlarmTooltip((v) => !v)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <PhIcon name="bell" size={16} color={Colors.textSub} />
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
                  <View style={styles.tooltipFloating}>
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
      <CalendarModal
        visible={showCalendar}
        value={date}
        onSelect={(d) => { setDate(d); load(d); setShowCalendar(false); }}
        onClose={() => setShowCalendar(false)}
      />
      <SelectModal
        visible={showFarmPicker}
        title="공유할 농장"
        options={farmList.map((f) => f.name)}
        value={farmList.find((f) => f.id === sharedFarmId)?.name ?? ''}
        onSelect={(name) => { const f = farmList.find((x) => x.name === name); if (f) setSharedFarmId(f.id); }}
        onClose={() => setShowFarmPicker(false)}
      />

      {/* 저장 전 입력값이 있는 상태에서 탭 이동 시 확인 */}
      <Modal visible={leaveGuard.dialogVisible} transparent animationType="fade" onRequestClose={leaveGuard.cancel}>
        <View style={styles.leaveOverlay}>
          <View style={styles.leaveDialog}>
            <Text style={styles.leaveTitle}>이동하시겠어요?</Text>
            <Text style={styles.leaveMsg}>
              입력한 내용이 아직 저장되지 않았어요.{'\n'}이동하면 입력한 정보가 사라집니다.
            </Text>
            <View style={styles.leaveBtns}>
              <TouchableOpacity style={styles.leaveCancelBtn} onPress={leaveGuard.cancel}>
                <Text style={styles.leaveCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.leaveConfirmBtn} onPress={leaveGuard.confirm}>
                <Text style={styles.leaveConfirmText}>이동</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  emptyEmoji: {},
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
  scopeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scopeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  scopeBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryUltraLight },
  scopeBtnText: { fontSize: 12, color: Colors.textSub, fontWeight: '600' },
  scopeBtnTextActive: { color: Colors.primary, fontWeight: '700' },
  farmPickBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  farmPickText: { fontSize: 12, color: Colors.text, fontWeight: '600', flexShrink: 1 },
  farmPickArrow: { fontSize: 11, color: Colors.textSub, paddingLeft: 6 },
  todoSharedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: Colors.primaryUltraLight, borderRadius: Radius.full,
    paddingHorizontal: 6, paddingVertical: 1,
  },
  todoSharedText: { fontSize: 10, color: Colors.primary, fontWeight: '700' },
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
  alarmSmallLabel: {},
  addBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg, justifyContent: 'center',
  },
  addBtnDisabled: { backgroundColor: Colors.border },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  alarmTooltipWrapper: { position: 'relative' },
  tooltipFloating: {
    position: 'absolute',
    bottom: '100%',
    right: 0,
    width: 230,
    backgroundColor: Colors.text,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: 6,
    zIndex: 200,
  },
  tooltipText: { fontSize: 12, color: '#fff', lineHeight: 18 },
  leaveOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  leaveDialog: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: Spacing.xl, width: 300,
  },
  leaveTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },
  leaveMsg: { fontSize: 14, color: Colors.textSub, lineHeight: 22, marginBottom: Spacing.lg },
  leaveBtns: { flexDirection: 'row', gap: 10 },
  leaveCancelBtn: {
    flex: 1, backgroundColor: Colors.primaryUltraLight,
    borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center',
  },
  leaveCancelText: { fontSize: 15, fontWeight: '600', color: Colors.primaryDark },
  leaveConfirmBtn: {
    flex: 1, backgroundColor: Colors.primary,
    borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center',
  },
  leaveConfirmText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
