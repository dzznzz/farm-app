import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useAuth } from '../../hooks/useAuth';
import { sendChatMessage, getDailyUsage, ChatMessage } from '../../lib/gemini';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';

type PageType = 'menu' | 'chatbot' | 'harvest';

const QUICK_QUESTIONS = [
  '이번 계절에 주의해야 할 병충해는?',
  '수확량을 늘리는 방법을 알려줘',
  '비료 사용 시기와 방법은?',
  '날씨에 따른 농작물 관리법은?',
];

export default function MoreScreen() {
  const { user, signOut } = useAuth();
  const [page, setPage] = useState<PageType>('menu');

  if (page === 'chatbot') return <ChatbotPage onBack={() => setPage('menu')} userId={user?.id} />;
  if (page === 'harvest') return <HarvestPage onBack={() => setPage('menu')} userId={user?.id} />;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={[Colors.primaryUltraLight, Colors.background]} style={styles.headerGradient}>
        <Text style={styles.title}>더보기</Text>
      </LinearGradient>
      <ScrollView style={styles.scroll}>
        <Card style={styles.menuCard}>
          {[
            { label: '🤖 농업 AI 챗봇', desc: '농작물 관리 전문 상담', onPress: () => setPage('chatbot') },
            { label: '🗺️ 수확 동선 추적', desc: 'GPS로 수확 경로 기록', onPress: () => setPage('harvest') },
          ].map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuItem, i > 0 && styles.menuBorder]}
              onPress={item.onPress}
            >
              <View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuDesc}>{item.desc}</Text>
              </View>
              <Text style={{ color: Colors.textLight, fontSize: 18 }}>›</Text>
            </TouchableOpacity>
          ))}
        </Card>

        <Card style={[styles.menuCard, { marginTop: 0 }]}>
          {[
            { label: '⚙️ 농장 설정', desc: '농장 및 작물 관리' },
            { label: '👤 프로필 수정', desc: '계정 정보 변경' },
          ].map((item, i) => (
            <TouchableOpacity key={item.label} style={[styles.menuItem, i > 0 && styles.menuBorder]}>
              <View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuDesc}>{item.desc}</Text>
              </View>
              <Text style={{ color: Colors.textLight, fontSize: 18 }}>›</Text>
            </TouchableOpacity>
          ))}
        </Card>

        <TouchableOpacity onPress={signOut} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>로그아웃</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function ChatbotPage({ onBack, userId }: { onBack: () => void; userId?: string }) {
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
    <SafeAreaView style={styles.container}>
      <View style={styles.subHeader}>
        <TouchableOpacity onPress={onBack}><Text style={styles.backBtn}>←</Text></TouchableOpacity>
        <Text style={styles.subTitle}>🤖 농업 AI 챗봇</Text>
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
                <Text style={styles.welcomeEmoji}>🌾</Text>
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

function HarvestPage({ onBack, userId }: { onBack: () => void; userId?: string }) {
  const [isTracking, setIsTracking] = useState(false);
  const [tracks, setTracks] = useState<{ lat: number; lng: number }[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const locationSub = useRef<Location.LocationSubscription | null>(null);

  const startTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '위치 권한을 허용해주세요.');
      return;
    }

    if (!userId) return;

    const { data: session } = await supabase.from('harvest_sessions').insert({
      user_id: userId,
      started_at: new Date().toISOString(),
      is_active: true,
    }).select().single();

    if (!session) return;
    setSessionId(session.id);
    setIsTracking(true);
    setTracks([]);

    locationSub.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 30000, distanceInterval: 10 },
      async (loc) => {
        const point = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        setTracks((prev) => [...prev, point]);
        await supabase.from('harvest_tracks').insert({
          session_id: session.id,
          lat: point.lat,
          lng: point.lng,
          recorded_at: new Date().toISOString(),
        });
      }
    );
  };

  const stopTracking = async () => {
    locationSub.current?.remove();
    locationSub.current = null;
    setIsTracking(false);
    if (sessionId) {
      await supabase.from('harvest_sessions').update({
        ended_at: new Date().toISOString(),
        is_active: false,
      }).eq('id', sessionId);
    }
    Alert.alert('완료', `총 ${tracks.length}개 위치가 기록되었습니다.`);
  };

  useEffect(() => () => { locationSub.current?.remove(); }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.subHeader}>
        <TouchableOpacity onPress={onBack}><Text style={styles.backBtn}>←</Text></TouchableOpacity>
        <Text style={styles.subTitle}>🗺️ 수확 동선 추적</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll}>
        <Card style={{ margin: Spacing.lg, alignItems: 'center' }}>
          <Text style={{ fontSize: 72, marginBottom: Spacing.md }}>
            {isTracking ? '🔴' : '🟢'}
          </Text>
          <Text style={Typography.h3}>
            {isTracking ? '추적 중...' : '추적 대기 중'}
          </Text>
          {isTracking && (
            <Text style={[Typography.caption, { marginTop: 8 }]}>
              기록된 위치: {tracks.length}개
            </Text>
          )}
          <View style={{ marginTop: Spacing.lg, width: '100%' }}>
            {!isTracking ? (
              <Button title="🌾 수확 시작" onPress={startTracking} />
            ) : (
              <Button title="⏹ 수확 완료" onPress={stopTracking} variant="outline" />
            )}
          </View>
        </Card>

        <Card style={{ margin: Spacing.lg, marginTop: 0 }}>
          <Text style={[Typography.bodyBold, { marginBottom: Spacing.md }]}>사용 방법</Text>
          {[
            '수확 시작 버튼을 누르면 GPS 추적이 시작됩니다.',
            '30초 간격으로 위치가 자동으로 기록됩니다.',
            '수확 완료 버튼을 누르면 동선이 저장됩니다.',
            'Apple Watch 연동 시 더 정확한 추적이 가능합니다.',
          ].map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <Text style={styles.tipNum}>{i + 1}</Text>
              <Text style={[Typography.caption, { flex: 1 }]}>{tip}</Text>
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerGradient: { paddingBottom: Spacing.lg },
  title: { ...Typography.h2, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  scroll: { flex: 1 },
  menuCard: { margin: Spacing.lg, marginBottom: Spacing.sm, padding: 0, overflow: 'hidden' },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  menuBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  menuLabel: { ...Typography.bodyBold, marginBottom: 2 },
  menuDesc: { ...Typography.caption },
  signOutBtn: { margin: Spacing.lg, alignItems: 'center', paddingVertical: Spacing.md },
  signOutText: { color: Colors.danger, fontSize: 16, fontWeight: '600' },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    paddingTop: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { fontSize: 22, color: Colors.primary, fontWeight: '600' },
  usageText: { fontSize: 12, color: Colors.textSub, fontWeight: '500', width: 40, textAlign: 'right' },
  subTitle: { ...Typography.h3 },
  chatList: { padding: Spacing.md, flexGrow: 1 },
  welcomeBox: { alignItems: 'center', paddingVertical: Spacing.xl },
  welcomeEmoji: { fontSize: 48, marginBottom: Spacing.md },
  welcomeText: { ...Typography.body, textAlign: 'center', color: Colors.textSub, lineHeight: 24 },
  quickBtns: { marginTop: Spacing.lg, width: '100%', gap: Spacing.sm },
  quickBtn: {
    backgroundColor: Colors.primaryUltraLight,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  quickBtnText: { color: Colors.primaryDark, fontSize: 13, textAlign: 'center' },
  bubble: {
    maxWidth: '80%',
    marginBottom: Spacing.sm,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  userBubble: { alignSelf: 'flex-end', backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  botBubble: { alignSelf: 'flex-start', backgroundColor: Colors.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.border },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  userText: { color: '#fff' },
  botText: { color: Colors.text },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  typingText: { ...Typography.caption },
  inputRow: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chatInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: Radius.full,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.border },
  sendBtnText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  tipRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xs },
  tipNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primaryUltraLight,
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
  },
});
