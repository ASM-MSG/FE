import { useEffect, useState } from "react";

/** 실패 안내 토스트 자동 소멸 시간 — 웹 값(3초)에 맞춘다 (스펙 Q8 승인) */
const DEFAULT_DURATION_MS = 3000;

/**
 * 자동 소멸 토스트 메시지 훅 — 웹 `features/video-actions/model/use-auto-dismiss-toast.ts`와
 * 같은 기법의 모바일판. 시트·삭제 다이얼로그·신고 모달 3곳이 각자 소멸 타이머를 들고
 * 있던 중복을 한 곳으로 모은다(모바일 토스트 호스트 인프라 부재의 기존 관례를 공용화).
 *
 * 같은 문구를 연속 설정해도 타이머가 재시작된다 — 문자열을 그대로 state에 두면 동일 값
 * setState가 스킵돼 이펙트가 다시 돌지 않는 엣지가 있어, 매 설정마다 새 참조({ text })
 * 래핑으로 재시작을 보장한다(격자 상세가 카운터로 우회했던 문제와 같은 것이다).
 *
 * **parity 대상이 아니다** — React 훅이라 순수 모듈이 아니고, 모바일에는 RN 렌더 테스트
 * 인프라가 없어(vitest.config 정책) 훅 단위 단정을 둘 수 없다. 웹과의 동등성은 문구·소멸
 * 시간이라는 값 계약뿐이고 그 값은 이 파일 상단 상수에 있다.
 * 플랫폼 API(window·document)를 참조하지 않는다 — setTimeout은 RN 공통.
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
