import { useState, useRef, useEffect, useCallback } from 'react';

// 탭 이동 시 "저장 전 입력값"이 있는 화면을 떠나기 전에 확인 받기 위한 가드.
// 화면(탭)이 자신의 가드를 등록하고, 탭 레이아웃의 tabPress 핸들러가 이를 조회한다.
export type TabGuard = {
  hasUnsaved: () => boolean;
  requestLeave: (proceed: () => void) => void;
};

const registry = new Map<string, TabGuard>();

export function getTabGuard(routeName: string): TabGuard | undefined {
  return registry.get(routeName);
}

/**
 * 현재 탭 화면에서 저장되지 않은 입력이 있을 때, 다른 탭으로 이동하기 전에
 * 확인 다이얼로그를 띄우기 위한 훅.
 *
 * @param routeName  탭 라우트 이름 (예: 'todo')
 * @param hasUnsaved 저장 전 입력값이 있는지 반환하는 함수 (항상 최신 값을 읽도록 ref 처리됨)
 */
export function useTabLeaveGuard(routeName: string, hasUnsaved: () => boolean) {
  const [dialogVisible, setDialogVisible] = useState(false);
  const proceedRef = useRef<(() => void) | null>(null);
  const hasUnsavedRef = useRef(hasUnsaved);
  hasUnsavedRef.current = hasUnsaved;

  useEffect(() => {
    const guard: TabGuard = {
      hasUnsaved: () => hasUnsavedRef.current(),
      requestLeave: (proceed) => {
        proceedRef.current = proceed;
        setDialogVisible(true);
      },
    };
    registry.set(routeName, guard);
    return () => {
      if (registry.get(routeName) === guard) registry.delete(routeName);
    };
  }, [routeName]);

  const confirm = useCallback(() => {
    setDialogVisible(false);
    const proceed = proceedRef.current;
    proceedRef.current = null;
    proceed?.();
  }, []);

  const cancel = useCallback(() => {
    setDialogVisible(false);
    proceedRef.current = null;
  }, []);

  return { dialogVisible, confirm, cancel };
}
