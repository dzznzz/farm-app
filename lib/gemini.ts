const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

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

export async function sendChatMessage(
  messages: ChatMessage[],
  userMessage: string
): Promise<string> {
  const contents = [
    ...messages.map((m) => ({
      role: m.role,
      parts: [{ text: m.content }],
    })),
    {
      role: 'user',
      parts: [{ text: userMessage }],
    },
  ];

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!res.ok) throw new Error('챗봇 응답에 실패했습니다.');
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '응답을 받지 못했습니다.';
}
