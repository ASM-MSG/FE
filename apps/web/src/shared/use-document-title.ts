import { useEffect } from "react";

/**
 * 라우트별 문서 제목 훅 (MSG-478 C2) — 마운트 시 `document.title`을 세우고, 인자가 바뀌면
 * 갱신하며, 언마운트 시 **마운트 직전 값**으로 되돌린다. Helmet류 의존성 없이 effect 하나다.
 *
 * 직전 값은 effect 안에서 읽는다 — 렌더 시점 ref로 잡으면 StrictMode의 mount→cleanup→mount
 * 두 번째 실행이 첫 실행이 세운 제목을 "원래 값"으로 오인해 복원이 어긋난다. effect 안에서
 * 읽으면 cleanup이 먼저 원값을 복원한 뒤 다음 실행이 다시 원값을 읽으므로 최종 복원값이 같다.
 * 인자 변경도 같은 경로다(cleanup 복원 → 새 effect가 원값을 다시 캡처).
 *
 * 웹 문서 API 직접 접근은 shared/ 어댑터 층의 몫이라 여기서만 `document`를 만진다.
 */
export const useDocumentTitle = (title: string): void => {
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
};
