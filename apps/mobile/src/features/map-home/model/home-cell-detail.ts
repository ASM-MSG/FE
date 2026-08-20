import type { GridCellResponseDto } from "../../../shared/api/sdk";
import { gridDisplayName } from "./home-grid-label";
import { THEME_META, type ThemeId } from "./themes";

/**
 * 격자 상세 파생 (MSG-427 C2·C5·C8·C11) — 웹
 * `features/map-home/model/home-cell-detail.ts`의 복제본.
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다.
 * 동등성은 home-cell-detail.parity.test.ts가 웹 원본을 동적 import해 단정한다.
 */

/**
 * 격자 탭 → 상세 오픈 판정. [C2]
 * - 테마 활성: 그 테마의 강조 격자만
 * - 비활성: 내 점령 격자만
 * 입력 id는 서버 격자 id 체계("{gridY}_{gridX}")다 — 모바일은 `cell-grid-id-index`가
 * 탭한 셀을 이 체계로 되돌린 뒤 이 판정을 부른다 (C3).
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

/** 상세 헤더 속성 배지 — id는 스타일 매핑 키(뷰), label은 표시 텍스트 */
export interface HomeCellBadge {
  id: "occupied" | ThemeId;
  label: string;
}

/** 상세 시트 표시 모델 — 전부 API 응답 파생 (하드코딩 금지) */
export interface HomeCellDetail {
  gridId: string;
  /** 제목 — 구역 라벨 > 행정동명 > gridId (C4) */
  label: string;
  /** 헤더 서브타이틀 "내 영상 N개" — `GridCellResponseDto.videoCount`는 내 영상 수다 */
  subtitle: string;
  badges: HomeCellBadge[];
  /** 위치 줄 — 행정동명. 무귀속·미판정이면 null이라 줄을 그리지 않는다 (C11) */
  regionLabel: string | null;
  /** 액션 행 강조 색 키 — 뷰 토큰 클래스 리터럴 표의 키 */
  accent: ThemeId | "primary";
}

interface DeriveHomeCellDetailInput {
  cell: GridCellResponseDto;
  /** `getStatByGrid`의 행정동명 — 무귀속·미판정이면 null */
  regionName: string | null;
  /** 상세를 연 시점의 활성 테마 */
  activeTheme: ThemeId | null;
}

/**
 * API 응답 → 상세 표시 모델. [C5]
 * 배지는 내 점령(점령 시) → 활성 테마(테마 상세 시) 순이고, 행정동은 독립으로 없을 수 있다.
 * 영상 목록은 별도 훅이 담당한다 — 목록 로딩·실패가 상세 성립을 막지 않게 분리 유지한다.
 */
export const deriveHomeCellDetail = ({
  cell,
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
  accent: activeTheme ?? "primary",
});
