import type {
  GridCellResponseDto,
  GridCoverVideoResponseDto,
} from "@/shared/api/generated";
import { gridDisplayName } from "./grid-label";
import { THEME_META, type ThemeId } from "./theme";

/**
 * 홈 셀 상세 파생 (MSG-252 AC 9·9-1·10 → MSG-325 실 API 전환).
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다(RN 재사용 대상).
 *
 * MSG-325 결정 B①: 목 격자(`MOCK_CELLS`) 파생을 걷어내고 API 3종
 * (`getCell`·`getGridCover`·`getStatByGrid`)이 주는 것만 표시한다. 명세에 대응이 없거나
 * 제외 범위인 항목(마지막 업로드 시각, 전역 영상수·조회수·담수율, 영상 목록,
 * 활발한 시간대)은 모델에서 제거했고 격자 상세 연동 티켓에서 복구된다.
 */

/**
 * 격자 탭 → 상세 오픈 판정. [AC 9·10, MSG-277 AC 13]
 * - 테마 활성: 그 테마의 강조 격자만 (A5 — 경로추천 포함 4테마 공통)
 * - 비활성: 내 점령 격자만 (AC 10)
 * MSG-325: 입력 id는 서버 격자 id 체계("{gridY}_{gridX}")다.
 */
export const canOpenDetail = (
  activeTheme: ThemeId | null,
  gridId: string,
  themeGridIds: string[],
  occupiedGridIds: string[],
): boolean => {
  if (activeTheme === null) return occupiedGridIds.includes(gridId);
  return themeGridIds.includes(gridId);
};

/** 상세 헤더 속성 배지 — id는 스타일 매핑 키(뷰), label은 표시 텍스트 (AC 9·10) */
export interface HomeCellBadge {
  id: "occupied" | ThemeId;
  label: string;
}

/** 상세 패널 표시 모델 — 전부 API 응답 파생 (Figma 오탐 방지 4 — 하드코딩 금지) */
export interface HomeCellDetail {
  gridId: string;
  /** 제목 — 구역 라벨 > 행정동명 > gridId (기준 6) */
  label: string;
  /** 헤더 서브타이틀 "내 영상 N개" — `GridCellResponseDto.videoCount`는 내 영상 수다 */
  subtitle: string;
  badges: HomeCellBadge[];
  /** 위치 줄 — 행정동명. `by-grid`가 data null(무귀속·미판정)이면 null이라 줄을 그리지 않는다 */
  regionLabel: string | null;
  /** 전역 대표 영상 1건 — 후보가 없으면(`/cover`가 data null) null이라 영역을 그리지 않는다 */
  coverVideo: GridCoverVideoResponseDto | null;
  /** 액션 행 강조 색 키 — 뷰 토큰 클래스 리터럴 표의 키 */
  accent: ThemeId | "primary";
}

interface DeriveHomeCellDetailInput {
  cell: GridCellResponseDto;
  cover: GridCoverVideoResponseDto | null;
  /** `getStatByGrid`의 행정동명 — 무귀속·미판정이면 null */
  regionName: string | null;
  /** 상세를 연 시점의 활성 테마 — 경로추천 포함 (MSG-277 AC 13) */
  activeTheme: ThemeId | null;
}

/**
 * API 3종 → 상세 패널 표시 모델.
 * 배지는 내 점령(점령 시) → 활성 테마(테마 상세 시) 순이고,
 * 대표 영상·행정동은 각각 독립으로 없을 수 있어 분기도 독립이다.
 */
export const deriveHomeCellDetail = ({
  cell,
  cover,
  regionName,
  activeTheme,
}: DeriveHomeCellDetailInput): HomeCellDetail => ({
  gridId: cell.gridId,
  label: gridDisplayName(cell, regionName),
  subtitle: `내 영상 ${cell.videoCount}개`,
  badges: [
    ...(cell.occupied ? [{ id: "occupied" as const, label: "내 점령" }] : []),
    ...(activeTheme
      ? [{ id: activeTheme, label: THEME_META[activeTheme].label }]
      : []),
  ],
  regionLabel: regionName,
  coverVideo: cover,
  accent: activeTheme ?? "primary",
});
