import { create } from "zustand";
import type { FeedVideo } from "./grid-videos";

/**
 * 미니 패널 선택 — 영상 데이터 + 내 영상 여부(메타 문구 분기 근거) (3차 AC 1).
 * MSG-326: video 타입을 CellVideo → FeedVideo(상위 타입)로 완화 — 격자 상세 실 API
 * 항목과 테마 피드의 CellVideo(구조적 할당 가능)가 같은 스토어를 쓴다.
 * 재생 소스 판별은 FeedVideo 하나로 수렴한다(MSG-329 serverVideoId 병합 정리):
 * videoSrc 보유(목 — 테마 피드 과도기)면 그대로 재생, 없으면 video.videoId(실 서버 id)로
 * GET /api/videos/{videoId}를 지연 조회한다 — use-video-playback-query 참조.
 */
export interface VideoMiniSelection {
  video: FeedVideo;
  mine: boolean;
}

interface VideoMiniPanelState {
  /** 선택 영상 — null이면 미니 패널 닫힘 (3차 AC 1) */
  selected: VideoMiniSelection | null;
  /** 영상 카드 클릭 — 이미 열린 상태에서 다른 영상이면 교체 (3차 AC 1, 추정 7 — 재클릭도 교체) */
  open: (video: FeedVideo, mine: boolean) => void;
  /** 닫기 — 닫기 버튼·컨텍스트 변경(셀 상세 select/close 체인)·Escape 우선 배선의 대상 (3차 AC 2·3) */
  close: () => void;
}

/**
 * 영상 미니 디테일 패널 선택 스토어 (MSG-277 3차 AC 1) — 비영속 인메모리.
 * 좌측 패널(셀 상세 피드·테마 피드 공통)의 영상 카드 클릭이 open을 호출하고,
 * 컨텍스트 닫힘(칩 해제·전환·홈 이탈·셀 상세 닫힘/교체)은 home-cell-detail-store의
 * select·close가 이 스토어의 close를 체인 호출해 함께 닫는다 (3차 AC 2·3).
 * 플랫폼 API(window/localStorage/router)를 참조하지 않는다 — RN 경계.
 */
export const useVideoMiniPanelStore = create<VideoMiniPanelState>((set) => ({
  selected: null,
  open: (video, mine) => set({ selected: { video, mine } }),
  close: () => set({ selected: null }),
}));
