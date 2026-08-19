import { useEffect, useState } from "react";

/**
 * 값 변경을 delayMs 뒤에만 반영하는 디바운스 훅 — 웹 `shared/use-debounced-value.ts`의
 * 복제본 (MSG-423). 타이머만 사용하고 window·document를 참조하지 않는다.
 * 마운트 시점 초기값은 지연 없이 그대로 노출된다 — 첫 조회를 디바운스로 늦추지 않는다.
 *
 * 웹의 `flush`는 검색어 즉시 반영(Enter·인기 검색어 클릭) 전용이라 모바일에는 사용처가
 * 없어 옮기지 않았다 — 필요해지는 티켓에서 추가한다.
 */
export const useDebouncedValue = <T>(value: T, delayMs: number): T => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
};
