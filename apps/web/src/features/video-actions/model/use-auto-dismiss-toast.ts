import { useEffect, useState } from "react";

const DEFAULT_DURATION_MS = 3000;

/**
 * 자동 소멸 토스트 메시지 훅 (PR #62 리뷰 1) — VideoMoreMenu·VideoDeleteConfirmDialog·
 * ReportDialog 3곳에 반복되던 useState+setTimeout 소멸 로직을 추출했다(두 번째 사용처
 * 규칙 충족). 토스트 호스트 인프라 부재로 로컬 소멸 처리하는 기존 관례(R2)의 공용화.
 *
 * 같은 문구를 연속 설정해도 타이머가 재시작된다 — 문자열을 그대로 state에 두면 동일 값
 * setState가 스킵돼 이펙트가 다시 돌지 않는 엣지(리뷰 언급)가 있어, 내부적으로 매 설정마다
 * 새 참조({ text }) 래핑으로 재시작을 보장한다.
 *
 * 플랫폼 API(window·document)를 참조하지 않는다(setTimeout은 RN 공통) — RN 재사용 대상.
 */
export const useAutoDismissToast = (durationMs = DEFAULT_DURATION_MS) => {
  const [entry, setEntry] = useState<{ text: string } | null>(null);

  useEffect(() => {
    if (entry === null) return;
    const timer = setTimeout(() => setEntry(null), durationMs);
    return () => clearTimeout(timer);
  }, [entry, durationMs]);

  const message = entry === null ? null : entry.text;
  const setMessage = (text: string | null): void => {
    setEntry(text === null ? null : { text });
  };

  return [message, setMessage] as const;
};
