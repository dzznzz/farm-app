import AsyncStorage from '@react-native-async-storage/async-storage';

const API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// 무료 티어: 하루 14,400회 / 분당 30회
const DAILY_LIMIT = 50;
const STORAGE_KEY = 'groq_usage';

const SYSTEM_PROMPT = `당신은 한국 농업 전문가 AI 어시스턴트입니다.
다음 역할을 수행합니다:
- 농작물 재배, 수확 시기, 병충해 방제 조언
- 날씨와 계절에 따른 농작물 관리 방법 안내
- 수확량 증대 및 품질 향상 전략 제시
- 농업 관련 최신 정보 및 기술 공유
- 판매 및 유통 관련 조언

항상 친절하고 전문적으로 답변하세요.
한국 농업 환경에 맞는 실용적인 조언을 제공하세요.
답변은 간결하고 명확하게 작성하세요.`;

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

interface UsageRecord {
  date: string;
  count: number;
}

async function getUsage(): Promise<UsageRecord> {
  const today = new Date().toISOString().split('T')[0];
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw) {
    const record: UsageRecord = JSON.parse(raw);
    if (record.date === today) return record;
  }
  return { date: today, count: 0 };
}

async function incrementUsage(): Promise<void> {
  const usage = await getUsage();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...usage, count: usage.count + 1 }));
}

export async function getDailyUsage(): Promise<{ count: number; limit: number; remaining: number }> {
  const usage = await getUsage();
  return { count: usage.count, limit: DAILY_LIMIT, remaining: DAILY_LIMIT - usage.count };
}

export async function sendChatMessage(
  messages: ChatMessage[],
  userMessage: string
): Promise<string> {
  const usage = await getUsage();
  if (usage.count >= DAILY_LIMIT) {
    throw new Error(`오늘 무료 사용량(${DAILY_LIMIT}회)을 모두 사용했습니다.\n내일 자정에 초기화됩니다.`);
  }

  const groqMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages.map((m) => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.content })),
    { role: 'user', content: userMessage },
  ];

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: groqMessages,
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error('무료 한도에 도달했습니다. 잠시 후 다시 이용해주세요.');
    }
    throw new Error('챗봇 응답에 실패했습니다. 잠시 후 다시 시도해주세요.');
  }

  await incrementUsage();
  return data.choices?.[0]?.message?.content ?? '응답을 받지 못했습니다.';
}
