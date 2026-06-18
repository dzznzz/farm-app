import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * 햅틱(미세 진동) 헬퍼.
 * - web에서는 진동 API가 없으므로 no-op.
 * - 에러가 나도 UI 흐름을 막지 않도록 전부 무시.
 */

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

/** 가벼운 탭 — 탭 전환, 카드/버튼 터치 */
export function hapticLight() {
  if (!isNative) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** 중간 세기 — 주요 액션 버튼 */
export function hapticMedium() {
  if (!isNative) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

/** 선택 변경 — 토글/세그먼트 전환 */
export function hapticSelection() {
  if (!isNative) return;
  Haptics.selectionAsync().catch(() => {});
}

/** 저장/완료 성공 */
export function hapticSuccess() {
  if (!isNative) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

/** 삭제/오류 */
export function hapticError() {
  if (!isNative) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}
