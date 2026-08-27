import { useEffect } from "react";

/**
 * 에러 화면 `noindex` 토글 훅 (MSG-478 E1) — CSR 404는 HTTP 200으로 응답하므로 화면 스스로
 * `<meta name="robots">`를 `noindex`로 바꿔 색인을 막고, 언마운트 시 원값으로 되돌린다.
 *
 * 정적 셸(index.html)이 심은 robots 메타를 **갱신**한다 — 메타를 하나 더 만들면 robots 메타가
 * 둘이 되어 크롤러가 어느 쪽을 따를지 보장되지 않는다. 메타가 없을 때만(정적 셸 밖 렌더) 만들고
 * cleanup에서 제거한다. 원값은 effect 안에서 읽는다(use-document-title과 같은 StrictMode 근거).
 */
export const useRobotsNoindex = (): void => {
  useEffect(() => {
    const existing = document.head.querySelector<HTMLMetaElement>(
      'meta[name="robots"]',
    );
    const meta = existing ?? document.createElement("meta");
    if (!existing) {
      meta.name = "robots";
      document.head.appendChild(meta);
    }
    const previous = meta.content;
    meta.content = "noindex";
    return () => {
      if (existing) meta.content = previous;
      else meta.remove();
    };
  }, []);
};
