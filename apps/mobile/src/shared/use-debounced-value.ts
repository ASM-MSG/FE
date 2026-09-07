import { useCallback, useEffect, useState } from "react";

/**
 * 값 변경을 delayMs 뒤에만 반영하는 디바운스 훅 — 웹 `shared/use-debounced-value.ts`의
 * 복제본 (MSG-423, MSG-578에서 웹 시그니처로 정렬). 타이머만 사용하고 window·document를
 * 참조하지 않는다.
 * 마운트 시점 초기값은 지연 없이 그대로 노출된다 — 첫 조회를 디바운스로 늦추지 않는다.
 * `flush(next)`는 지연을 건너뛰고 즉시 반영한다 (Enter·검색 아이콘·인기 검색어 탭 즉시 검색).
 */
export const useDebouncedValue = <T>(
  value: T,
  delayMs: number,
): { debounced: T; flush: (next: T) => void } => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  const flush = useCallback((next: T) => setDebounced(next), []);

  return { debounced, flush };
};
