/**
 * 사이드레일 활성 탭 재클릭 동작 판정 (MSG-403 AC 16).
 * 순수 함수 — 라우터·스토어를 import하지 않는다(스냅숏만 받는다, RN 재사용 대상).
 *
 * 기존에는 활성 탭 재클릭이 곧바로 패널 접기였다. 칩·상세를 열어둔 채로 접으면 다시 펼쳤을 때
 * 그 상태가 그대로라 "홈으로 돌아가는" 수단이 없었다 — 초기 상태가 아니면 먼저 초기화하고,
 * 초기 상태에서 다시 누르면 종전대로 접는 2단으로 나눈다.
 */
import type { AiRouteStatus } from "@/features/ai-route/model/ai-route-store";
import type { DexTab } from "@/features/dex/model/dex-tab";

export interface HomeSnapshot {
  activeTheme: string | null;
  selectedGridId: string | null;
  selectedMissionId: number | null;
  miniPanelOpen: boolean;
  regionMode: "grids" | "regions";
}

/** 홈 초기 상태 — 칩 해제 + 상세·미니 패널 닫힘 + 격자 리스트 모드 */
export const isHomeInitial = (s: HomeSnapshot): boolean =>
  s.activeTheme === null &&
  s.selectedGridId === null &&
  s.selectedMissionId === null &&
  !s.miniPanelOpen &&
  s.regionMode === "grids";

export interface DexSnapshot {
  /** 현재 도감 탭 — 정의는 dex-tab(DEX_TABS)이 소유, 여기선 type-only 참조 (MSG-414 기록 탭 추가 대응) */
  tab: DexTab;
  /** 동 갤러리 진입 여부 — 지도 탭 내부 뷰(gallery-region-store) */
  galleryOpen: boolean;
}

/** 도감 초기 상태 — 지도 탭 + 동 갤러리 밖 */
export const isDexInitial = (s: DexSnapshot): boolean =>
  s.tab === "map" && !s.galleryOpen;

export interface ProfileSnapshot {
  /** 프로필 편집·계정 삭제 모달 중 하나라도 열려 있는지 */
  modalOpen: boolean;
}

/** 프로필 초기 상태 — 열린 모달 없음 */
export const isProfileInitial = (s: ProfileSnapshot): boolean => !s.modalOpen;

export interface AiRouteSnapshot {
  /** 요청·결과 상태 — 정의는 ai-route-store가 소유, 여기선 type-only 참조 (MSG-488) */
  status: AiRouteStatus;
  /** 입력창 문장 (trim 전 원문) */
  text: string;
}

/** AI 경로추천 초기 상태 — 입력 대기이고 입력이 비어 있음 (MSG-488 L10) */
export const isAiRouteInitial = (s: AiRouteSnapshot): boolean =>
  s.status === "idle" && s.text.trim().length === 0;

/** 재클릭 동작 — 초기 상태가 아니면 초기화(패널 유지), 초기 상태면 접기/펼치기 토글 */
export const railReclickAction = (isInitial: boolean): "reset" | "toggle" =>
  isInitial ? "toggle" : "reset";
