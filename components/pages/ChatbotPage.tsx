import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendChatMessage, getDailyUsage, ChatMessage } from '../../lib/gemini';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';
import { PhIcon } from '../ui/PhIcon';
import { pageStyles } from './shared';

const QUICK_QUESTIONS = [
  '이번 계절에 주의해야 할 병충해는?',
  '수확량을 늘리는 방법을 알려줘',
  '비료 사용 시기와 방법은?',
  '날씨에 따른 농작물 관리법은?',
];

interface Props {
  onBack: () => void;
  userId?: string;
}

export function ChatbotPage({ onBack, userId }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const flatRef = useRef<FlatList>(null);
  const storageKey = `chat_history_${userId ?? 'guest'}`;

  useEffect(() => {
    getDailyUsage().then((u) => setRemaining(u.remaining));
    AsyncStorage.getItem(storageKey).then((raw) => {
      if (raw) {
        const saved: ChatMessage[] = JSON.parse(raw);
        setMessages(saved);
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 100);
      }
    });
  }, [userId]);

  const saveMessages = async (updated: ChatMessage[]) => {
    await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const clearHistory = () => {
    Alert.alert('대화 초기화', '대화 기록을 모두 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => { setMessages([]); AsyncStorage.removeItem(storageKey); } },
    ]);
  };

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: ChatMessage = { role: 'user', content: text };
    const updatedWithUser = [...messages, userMsg];
    setMessages(updatedWithUser);
    setInput('');
    setLoading(true);
    try {
      const reply = await sendChatMessage(messages, text);
      const updatedWithReply = [...updatedWithUser, { role: 'model' as const, content: reply }];
      setMessages(updatedWithReply);
      saveMessages(updatedWithReply);
      getDailyUsage().then((u) => setRemaining(u.remaining));
    } catch (e: any) {
      const updatedWithError = [...updatedWithUser, { role: 'model' as const, content: e?.message ?? '죄송합니다. 잠시 후 다시 시도해주세요.' }];
      setMessages(updatedWithError);
      saveMessages(updatedWithError);
    }
    setLoading(false);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <SafeAreaView style={pageStyles.container}>
      <View style={pageStyles.subHeader}>
        <TouchableOpacity onPress={onBack}><Text style={pageStyles.backBtn}>←</Text></TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <PhIcon name="robot" size={20} color={Colors.text} />
          <Text style={pageStyles.subTitle}>농업 AI 챗봇</Text>
        </View>
        <View style={{ alignItems: 'flex-end', width: 50 }}>
          <Text style={styles.usageText}>{remaining !== null ? `${remaining}/50` : ''}</Text>
          {messages.length > 0 && (
            <TouchableOpacity onPress={clearHistory}>
              <Text style={{ fontSize: 10, color: Colors.textLight, marginTop: 2 }}>초기화</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.chatList}
          ListHeaderComponent={
            messages.length === 0 ? (
              <View style={styles.welcomeBox}>
                <PhIcon name="plant" size={48} color={Colors.primary} style={{ marginBottom: Spacing.md }} />
                <Text style={styles.welcomeText}>농업 전문 AI입니다.{'\n'}궁금한 것을 물어보세요!</Text>
                <View style={styles.quickBtns}>
                  {QUICK_QUESTIONS.map((q) => (
                    <TouchableOpacity key={q} style={styles.quickBtn} onPress={() => send(q)}>
                      <Text style={styles.quickBtnText}>{q}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.botBubble]}>
              <Text style={[styles.bubbleText, item.role === 'user' ? styles.userText : styles.botText]}>
                {item.content}
              </Text>
            </View>
          )}
        />
        {loading && (
          <View style={styles.typingIndicator}>
            <ActivityIndicator color={Colors.primary} size="small" />
            <Text style={styles.typingText}>답변 생성 중...</Text>
          </View>
        )}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.chatInput}
            value={input}
            onChangeText={setInput}
            placeholder="농업 관련 질문을 입력하세요..."
            placeholderTextColor={Colors.textLight}
            multiline
            onSubmitEditing={() => send(input)}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
            onPress={() => send(input)}
            disabled={!input.trim() || loading}
          >
            <Text style={styles.sendBtnText}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  usageText: { fontSize: 12, color: Colors.textSub, fontWeight: '500', width: 40, textAlign: 'right' },
  chatList: { padding: Spacing.md, flexGrow: 1 },
  welcomeBox: { alignItems: 'center', paddingVertical: Spacing.xl },
  welcomeEmoji: {},
  welcomeText: { ...Typography.body, textAlign: 'center', color: Colors.textSub, lineHeight: 24 },
  quickBtns: { marginTop: Spacing.lg, width: '100%', gap: Spacing.sm },
  quickBtn: { backgroundColor: Colors.primaryUltraLight, borderRadius: Radius.md, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.primaryLight },
  quickBtnText: { color: Colors.primaryDark, fontSize: 13, textAlign: 'center' },
  bubble: { maxWidth: '80%', marginBottom: Spacing.sm, borderRadius: Radius.lg, padding: Spacing.md },
  userBubble: { alignSelf: 'flex-end', backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  botBubble: { alignSelf: 'flex-start', backgroundColor: Colors.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.border },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  userText: { color: '#fff' },
  botText: { color: Colors.text },
  typingIndicator: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, gap: Spacing.sm },
  typingText: { ...Typography.caption },
  inputRow: { flexDirection: 'row', padding: Spacing.md, gap: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface },
  chatInput: { flex: 1, backgroundColor: Colors.background, borderRadius: Radius.full, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: Colors.text, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: Radius.full, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: Colors.border },
  sendBtnText: { color: '#fff', fontSize: 20, fontWeight: '700' },
});
