import { useEffect } from "react";
import { Toast } from "@fillmap/ui-web";
import type { GridCardPlayNotice } from "@/features/map-home/model/use-grid-card-play";

/** 카드 재생 안내 토스트 자동 소멸(ms) — ReportDialog TOAST_DURATION_MS 관례와 동일 값 */
const CARD_PLAY_TOAST_MS = 3000;

/** 카드 재생 안내 문구 — useGridCardPlay notice 사유별 */
const MESSAGE: Record<GridCardPlayNotice, string> = {
  empty: "이 격자에 재생할 영상이 없어요.",
  error: "영상 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
};

/**
 * 격자 카드 재생 안내 토스트 (MSG-328 → MSG-403 리뷰 반영으로 페이지에서 분리).
 * 노출 중 자동 소멸 타이머를 소유한다 — 페이지는 notice 상태만 넘긴다.
 */
export const CardPlayNotice = ({
  notice,
  onDismiss,
}: {
  notice: GridCardPlayNotice | null;
  onDismiss: () => void;
}) => {
  useEffect(() => {
    if (notice === null) return;
    const timer = setTimeout(onDismiss, CARD_PLAY_TOAST_MS);
    return () => clearTimeout(timer);
  }, [notice, onDismiss]);

  if (notice === null) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-md z-50 mx-auto w-[calc(100%-2rem)] max-w-120 px-md">
      <Toast title={MESSAGE[notice]} />
    </div>
  );
};
