import type { Cell, CellVideo } from "@/entities/cell";
import { formatMonthDay } from "@/shared/format";
import { THEME_META, type ThemeId } from "./theme";

/**
 * 홈 셀 상세 파생 (MSG-252 AC 9·9-1·10, A5·A7).
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다(RN 재사용 대상).
 */

/**
 * 셀 탭 → 상세 오픈 판정. [AC 9·10, MSG-277 AC 13]
 * - 테마 활성: 그 테마의 강조 셀만 (A5 — 경로추천 포함 4테마 공통, MSG-277에서 route 제외 제거)
 * - 비활성: 내 점령 셀만 (AC 10)
 */
export const canOpenDetail = (
  activeTheme: ThemeId | null,
  cellId: string,
  themeCellIds: string[],
  occupiedCellIds: string[],
): boolean => {
  if (activeTheme === null) return occupiedCellIds.includes(cellId);
  return themeCellIds.includes(cellId);
};

/** 셀별 내 수집 영상 id 목록 — CollectedVideo.id는 Cell.videos(CellVideo.id)와 같은 체계 (A2) */
export const myVideoIdsOf = (
  collectedVideos: { id: string; cellId: string }[],
  cellId: string,
): string[] =>
  collectedVideos.filter((v) => v.cellId === cellId).map((v) => v.id);

/** 상세 헤더 속성 배지 — id는 스타일 매핑 키(뷰), label은 표시 텍스트 (AC 9·10, MSG-277 route 포함) */
export interface HomeCellBadge {
  id: "occupied" | ThemeId;
  label: string;
}

/** 상세 패널 표시 모델 — 전부 목 격자·수집 데이터에서 파생 (Figma 오탐 방지 4 — 하드코딩 금지) */
export interface HomeCellDetail {
  cellId: string;
  label: string;
  /**
   * 헤더 서브타이틀 (MSG-253 AC 6·7) —
   * 비테마: "내 영상 N개 · 마지막 업로드 M월 D일" (내 영상 0개면 날짜 부분 생략),
   * 테마: "내 영상 N개 · 최근 24시간 영상 +M개"
   */
  subtitle: string;
  badges: HomeCellBadge[];
  /** 내 영상 — 수집 영상 id와 매칭되는 격자 영상 (AC 9·10) */
  myVideos: CellVideo[];
  /** 다른 사용자 영상 — 테마 상세에서만 노출, 비활성 상세는 빈 목록 (AC 9 vs 10) */
  otherVideos: CellVideo[];
  /** "영상 몰아보기" 노출 — 테마 상세만 (AC 9), 비활성 점령 상세는 숨김 (AC 10) */
  showMashup: boolean;
}

interface DeriveHomeCellDetailInput {
  cell: Cell;
  /** 상세를 연 시점의 활성 테마 — 경로추천 포함 (MSG-277 AC 13) */
  activeTheme: ThemeId | null;
  /** 내 점령 셀 여부 — "내 점령" 배지·내 영상 섹션 기준 */
  occupied: boolean;
  /** 이 셀에서 내가 수집한 영상 id (myVideoIdsOf 결과) */
  myVideoIds: string[];
  /** 서브타이틀 "최근 24시간" 판정 기준 시각 — 테스트 결정성용 주입, 기본은 호출 시점 (AC 7) */
  now?: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** 서브타이틀 파생 (MSG-253 AC 6·7) — 테마면 24시간 변형, 비테마면 내 영상 최신 업로드 날짜 */
const deriveSubtitle = (
  cell: Cell,
  activeTheme: ThemeId | null,
  myVideos: CellVideo[],
  now: Date,
): string => {
  const myPart = `내 영상 ${myVideos.length}개`;
  if (activeTheme) {
    const recent24hCount = cell.videos.filter(
      (v) => now.getTime() - new Date(v.uploadedAt).getTime() < DAY_MS,
    ).length;
    return `${myPart} · 최근 24시간 영상 +${recent24hCount}개`;
  }
  if (myVideos.length === 0) return myPart;
  const latest = myVideos.reduce((a, b) =>
    new Date(a.uploadedAt).getTime() >= new Date(b.uploadedAt).getTime() ? a : b,
  );
  return `${myPart} · 마지막 업로드 ${formatMonthDay(latest.uploadedAt)}`;
};

/**
 * 셀 + 활성 테마 + 점령 여부 → 상세 패널 표시 모델. [AC 9·10, A5·A7]
 * - 배지: 내 점령(점령 시) → 활성 테마(테마 상세 시) 순
 * - 영상: 내 영상 = 수집 id 매칭, 다른 사용자 = 나머지 — 단 비활성 상세는 내 영상만 (AC 10 문언)
 * - 버튼: 몰아보기는 테마 상세 전용, 추가하기는 항상 (렌더는 뷰 소관)
 */
export const deriveHomeCellDetail = ({
  cell,
  activeTheme,
  occupied,
  myVideoIds,
  now = new Date(),
}: DeriveHomeCellDetailInput): HomeCellDetail => {
  const badges: HomeCellBadge[] = [
    ...(occupied ? [{ id: "occupied" as const, label: "내 점령" }] : []),
    ...(activeTheme
      ? [{ id: activeTheme, label: THEME_META[activeTheme].label }]
      : []),
  ];

  const myVideos = cell.videos.filter((v) => myVideoIds.includes(v.id));

  return {
    cellId: cell.id,
    label: cell.label,
    subtitle: deriveSubtitle(cell, activeTheme, myVideos, now),
    badges,
    myVideos,
    otherVideos: activeTheme
      ? cell.videos.filter((v) => !myVideoIds.includes(v.id))
      : [],
    showMashup: activeTheme !== null,
  };
};
