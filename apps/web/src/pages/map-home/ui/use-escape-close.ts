import { useEffect } from "react";

/**
 * 뷰-레이어 훅 — 홈 좌측 패널(셀 상세·테마 피드)의 Escape 닫기 배선 (MSG-252 AC 9-1 → MSG-277 공용 추출).
 * window 이벤트를 직접 쓰는 웹 전용 훅이라 RN 재사용 대상이 아니다 (RN 경계는 model에만 적용).
 * 입력 요소(input·textarea) 타깃의 Escape는 무시한다 — SearchBox 자체 Escape(드롭다운 닫기)와
 * 동시 닫힘 방지 (MSG-252 리뷰 반영, 스모크 2케이스가 이 계약을 고정한다).
 */
export const useEscapeClose = (onClose: () => void) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
};
