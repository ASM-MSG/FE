import type { GridCellResponseDto } from "@/shared/api/generated";
import { gridDisplayName, type GridNaming } from "./grid-label";
import { THEME_META, type ThemeId } from "./theme";

/**
 * 홈 셀 상세 파생 (MSG-252 AC 9·9-1·10 → MSG-325 실 API 전환 → MSG-326 영상 목록 복원).
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다(RN 재사용 대상).
 *
 * MSG-325 결정 B①: 목 격자(`MOCK_CELLS`) 파생을 걷어내고 API가 주는 것만 표시한다.
 * MSG-326(추정 1): 대표 영상 단독 섹션(getGridCover)을 영상 목록 피드
 * (use-grid-videos-query — 전역 인기순이라 1위가 곧 구 대표 영상)로 대체하며 coverVideo
 * 필드를 제거했다 — 대표 영상 히어로를 되살리려면 getGridCover 조회·coverVideo 필드를
 * 복원해 목록 위에 얹으면 된다(1줄 변경 수준). 활발한 시간대·전역 지표·마지막 업로드
 * 줄은 MSG-325 결정 B① 존치로 계속 비표시.
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
  /**
   * 헤더 서브타이틀 "내 영상 N개" — `GridCellResponseDto.videoCount`는 내 영상 수다.
   * 비로그인은 사용자별 값이라 만들지 않는다(null) — 패널이 줄을 그리지 않는다 (MSG-474)
   */
  subtitle: string | null;
  badges: HomeCellBadge[];
  /** 위치 줄 — 행정동명. `by-grid`가 data null(무귀속·미판정)이면 null이라 줄을 그리지 않는다 */
  regionLabel: string | null;
  /** 액션 행 강조 색 키 — 뷰 토큰 클래스 리터럴 표의 키 */
  accent: ThemeId | "primary";
}

/**
 * 비로그인 상세의 이름 재료 (MSG-474 승인 결정 1) — `grids/{gridId}`가 사용자별 API
 * (익명 401)라 미발사하고, 진입점 응답(핫구역 `HotZoneResponseDto`·동 카드
 * `ExploreGridResponseDto`+부모 regionName)이 이미 싣고 있는 부분집합으로 조립한다.
 */
export interface CellNameSource extends GridNaming {
  /** 행정동 이름 — 무귀속(해상 등)이면 null */
  regionName: string | null;
}

type DeriveHomeCellDetailInput = {
  /** `getStatByGrid`(로그인) 또는 진입점 재료(비로그인)의 행정동명 — 무귀속·미판정이면 null */
  regionName: string | null;
  /** 상세를 연 시점의 활성 테마 — 경로추천 포함 (MSG-277 AC 13) */
  activeTheme: ThemeId | null;
} & (
  | {
      /** 로그인 뷰어 — `grids/{gridId}` 응답이 정본, 사용자별 값(서브타이틀·점령 배지) 생성 */
      viewerAuthenticated: true;
      cell: GridCellResponseDto;
    }
  | {
      /** 비로그인 뷰어 — 진입점 이름 재료만으로 조립, 사용자별 값은 만들지 않는다 (MSG-474) */
      viewerAuthenticated: false;
      entryNaming: CellNameSource;
    }
);

/**
 * API 응답 → 상세 패널 표시 모델.
 * 배지는 내 점령(점령 시) → 활성 테마(테마 상세 시) 순이고, 행정동은 독립으로 없을 수 있다.
 * 영상 목록 피드는 별도 훅(use-grid-videos-query)이 담당한다 — 목록 로딩·실패가
 * 상세 성립을 막지 않게 모델을 분리 유지한다 (MSG-326).
 * MSG-474: 뷰어 인증 여부로 입력 경로가 갈린다 — 비로그인은 `grids/{gridId}` 미발사라
 * 진입점 이름 재료(entryNaming)로 조립하고 서브타이틀·"내 점령" 배지를 만들지 않는다.
 */
export const deriveHomeCellDetail = (
  input: DeriveHomeCellDetailInput,
): HomeCellDetail => {
  const { regionName, activeTheme } = input;
  const naming = input.viewerAuthenticated ? input.cell : input.entryNaming;

  return {
    gridId: naming.gridId,
    label: gridDisplayName(naming, regionName),
    subtitle: input.viewerAuthenticated
      ? `내 영상 ${input.cell.videoCount}개`
      : null,
    badges: [
      ...(input.viewerAuthenticated && input.cell.occupied
        ? [{ id: "occupied" as const, label: "내 점령" }]
        : []),
      ...(activeTheme
        ? [{ id: activeTheme, label: THEME_META[activeTheme].label }]
        : []),
    ],
    regionLabel: regionName,
    accent: activeTheme ?? "primary",
  };
};
