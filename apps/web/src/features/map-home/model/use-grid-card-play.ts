import { useCallback, useEffect, useState } from "react";
import { useGridVideosQuery } from "./use-grid-videos-query";
import { useVideoMiniPanelStore } from "./video-mini-panel-store";

/** 재생 불가 안내 — 뷰가 토스트로 표시한다 (조용한 무시 금지 — RetryNotice·토스트 관례) */
export type GridCardPlayNotice = "empty" | "error";

export interface GridCardPlayResult {
  /** 격자 카드 클릭 — 그 격자의 영상 목록을 조회해 첫 영상을 미니 패널로 연다 */
  play: (gridId: string) => void;
  /**
   * 재생 중 격자 — 지도 테두리 강조 대상 (사용자 피드백). 미니 패널이 닫히거나
   * 다른 영상으로 교체되면(상세 흐름 등) null — 기존 시각 상태와 충돌하지 않는다
   */
  playingGridId: string | null;
  /** 재생 실패 사유 — empty(재생할 영상 없음)·error(목록 조회 실패), 없으면 null */
  notice: GridCardPlayNotice | null;
  dismissNotice: () => void;
}

/** 재생 중 추적 — 강조 격자 + 그 격자에서 연 영상 id(교체 감지 키) */
interface PlayingContext {
  gridId: string;
  videoId: number;
}

/**
 * 격자 카드 클릭 재생 훅 (MSG-328 사용자 피드백 — 상세 미오픈 재생 + 격자 강조).
 * 격자 상세(home-cell-detail-store)를 경유하지 않는다 — 좌측 지역 패널은 그대로 두고,
 * 기존 격자 탭과 같은 영상 목록 조회(use-grid-videos-query, 캐시 공유)로 첫 영상
 * (병합 목록 첫 항목 — 내 영상 우선)을 오른쪽 미니 패널(video-mini-panel-store)에 연다.
 * 카드 DTO에 커버 videoId가 없어 목록 경유가 유일한 재생 경로다(백엔드 계약).
 * 재생이 열리면 그 격자가 지도 테두리 강조 대상(playingGridId)이 되고, 미니 패널
 * 닫힘·영상 교체 시 해제된다 — 강조는 오버레이 게시(emphasizeCell) 쪽에서 반영한다.
 * 빈 목록·조회 실패는 notice로 노출한다 — 뷰가 토스트로 안내(ReportDialog 관례).
 * 지도 SDK를 import하지 않는다(RN 경계).
 */
export const useGridCardPlay = (): GridCardPlayResult => {
  const [gridId, setGridId] = useState<string | null>(null);
  const [playing, setPlaying] = useState<PlayingContext | null>(null);
  const [notice, setNotice] = useState<GridCardPlayNotice | null>(null);
  const openMiniPanel = useVideoMiniPanelStore((s) => s.open);
  const miniSelection = useVideoMiniPanelStore((s) => s.selected);
  const videos = useGridVideosQuery(gridId);

  // 다른 카드 재생 시작 — 이전 강조를 즉시 해제하고 새 목록을 조회한다
  const play = useCallback((next: string) => {
    setNotice(null);
    setPlaying(null);
    setGridId(next);
  }, []);

  useEffect(() => {
    if (gridId === null) return;
    const first = videos.items[0];
    if (first) {
      openMiniPanel(first, first.mine);
      setPlaying({ gridId, videoId: first.videoId });
      setGridId(null);
    } else if (videos.isEmpty) {
      setNotice("empty");
      setGridId(null);
    } else if (videos.isError) {
      setNotice("error");
      setGridId(null);
    }
  }, [gridId, videos.items, videos.isEmpty, videos.isError, openMiniPanel]);

  // 강조 수명 — 미니 패널이 닫히거나(선택 null) 다른 영상으로 교체되면 해제
  useEffect(() => {
    if (playing === null) return;
    if (
      miniSelection === null ||
      miniSelection.video.videoId !== playing.videoId
    ) {
      setPlaying(null);
    }
  }, [miniSelection, playing]);

  return {
    play,
    playingGridId: playing?.gridId ?? null,
    notice,
    dismissNotice: useCallback(() => setNotice(null), []),
  };
};
