import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/ui/Card';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';

interface Todo {
  id: string;
  date: string;
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

export default function TodoScreen() {
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newText, setNewText] = useState('');

  const load = async (d: string) => {
    if (!user) return;
    const { data } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', d)
      .order('created_at');
    setTodos(data ?? []);
  };

  useFocusEffect(useCallback(() => { load(date); }, [date, user]));

  const handleDateChange = (delta: number) => {
    const next = addDays(date, delta);
    setDate(next);
    load(next);
  };

  const handleAdd = async () => {
    const text = newText.trim();
    if (!text || !user) return;
    const { data, error } = await supabase
      .from('todos')
      .insert({ user_id: user.id, date, text, completed: false })
      .select()
      .single();
    if (!error && data) {
      setTodos((prev) => [...prev, data]);
      setNewText('');
    }
  };

  const handleToggle = async (id: string, completed: boolean) => {
    await supabase.from('todos').update({ completed: !completed }).eq('id', id);
    setTodos((prev) => prev.map((t) => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleDelete = (id: string) => {
    Alert.alert('삭제', '이 항목을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive', onPress: async () => {
          await supabase.from('todos').delete().eq('id', id);
          setTodos((prev) => prev.filter((t) => t.id !== id));
        },
      },
    ]);
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
          <TouchableOpacity onPress={() => setDate(today)} style={styles.dateLabel}>
            <Text style={styles.dateText}>{formatDisplayDate(date)}</Text>
            {date === today && <Text style={styles.todayBadge}>오늘</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => handleDateChange(1)}>
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>
        </View>
        {todos.length > 0 && (
          <Text style={styles.progressText}>
            {doneCount}/{todos.length} 완료
          </Text>
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
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => handleToggle(todo.id, todo.completed)}
                  >
                    <View style={[styles.checkboxInner, todo.completed && styles.checkboxChecked]}>
                      {todo.completed && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                  <Text style={[styles.todoText, todo.completed && styles.todoTextDone]}>
                    {todo.text}
                  </Text>
                  <TouchableOpacity onPress={() => handleDelete(todo.id)} style={styles.deleteBtn}>
                    <Text style={styles.deleteText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </Card>
          )}
        </ScrollView>

        <View style={styles.addBar}>
          <TextInput
            style={styles.addInput}
            placeholder="할 일 추가..."
            placeholderTextColor={Colors.textLight}
            value={newText}
            onChangeText={setNewText}
            onSubmitEditing={handleAdd}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[styles.addBtn, !newText.trim() && styles.addBtnDisabled]}
            onPress={handleAdd}
            disabled={!newText.trim()}
          >
            <Text style={styles.addBtnText}>추가</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  progressText: {
    ...Typography.caption, textAlign: 'center', color: Colors.primary,
    fontWeight: '700', marginTop: Spacing.sm,
  },
  scroll: { flex: 1 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { ...Typography.bodyBold, color: Colors.textSub },
  emptySubText: { ...Typography.caption, marginTop: 4 },
  listCard: { margin: Spacing.lg, padding: 0, overflow: 'hidden' },
  todoRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 14,
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
  todoText: { flex: 1, ...Typography.body, color: Colors.text },
  todoTextDone: { color: Colors.textLight, textDecorationLine: 'line-through' },
  deleteBtn: { padding: 6 },
  deleteText: { color: Colors.textLight, fontSize: 14 },
  addBar: {
    flexDirection: 'row', gap: Spacing.sm,
    padding: Spacing.md, paddingBottom: Spacing.lg,
    backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  addInput: {
    flex: 1, backgroundColor: Colors.background,
    borderRadius: Radius.md, paddingHorizontal: Spacing.md,
    paddingVertical: 12, fontSize: 15, color: Colors.text,
    borderWidth: 1, borderColor: Colors.border,
  },
  addBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg, justifyContent: 'center',
  },
  addBtnDisabled: { backgroundColor: Colors.border },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
