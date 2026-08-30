import {
  cellCornersAt,
  cellIndexAt,
  decodeGridCorners,
  encodeGridId,
  type CellCorners,
  type CellOverlay,
  type LatLng,
} from "@/entities/cell";
import { THEME_META, type ThemeCell, type ThemeId } from "./theme";

/**
 * 테마 오버레이 파생 (MSG-252 AC 2·6·7·8).
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다(RN 재사용 대상).
 * 렌더링(naver Polygon·Polyline·Marker)은 MapCanvas 경계 안에서 하고, 여기는 데이터만 만든다.
 * MSG-263 개정(D5) → MSG-357: 셀 기하는 100m 격자 스냅 꼭짓점 4점
 * (cellCornersAt∘cellIndexAt — EPSG:5179)이다. 부산 행정경계 필터(구 AC 4)는 MSG-477 ③
 * 격자 전국 확장으로 제거됐다 — 전국 셀이 그대로 게시 대상이다.
 * MSG-263 개정 2(D9): 기본 점령 셀은 셸 상시 층(MapShell → toOccupiedOverlays)으로 분리 —
 * 여기서는 테마 셀(빗금 포함)만 게시한다. 교집합 1회 렌더는 셸의 excludeSectionCells가 맡는다(AC 8).
 */

/** 스타일드 셀 오버레이 — color·hatched·occupied 미지정이면 기존 primary 렌더 그대로 (MapCanvas 계약, AC 13) */
export interface StyledCellOverlay extends CellOverlay {
  /** 채움·테두리 색 (테마 토큰 hex) — 미지정 시 primary */
  color?: string;
  /** 빗금 표시 여부 — 테마 셀 ∩ 내 점령 셀 (AC 7) */
  hatched?: boolean;
  /** 점령 셀 스타일 (MSG-263 AC 10 — Figma: primary 채움 18% + 실선 테두리 40%) */
  occupied?: boolean;
  /** 테두리 강조 (MSG-328 사용자 피드백 — 카드 재생 중 격자): 진한 실선 테두리 */
  emphasized?: boolean;
}

// MSG-477 ③: 부산 경계 필터(renderableThemeCells — 구 MSG-263 AC 4)는 격자 전국 확장으로
// 제거됐다. "판정 집합 ≡ 게시 집합"(AC 9)은 게시 목록(`buildHomeOverlayCells`)과 탭 판정
// id(`themeCellGridIds`)가 같은 소스·같은 인코딩(encodeGridId)에서 파생되는 것으로 유지된다.

/**
 * 활성 테마 + 테마 셀 + 내 점령 격자 id → 지도 게시용 테마 오버레이 목록. [AC 2·6·7·8]
 * - 비활성: 빈 목록 — 기본 점령 표시는 셸 상시 층 소유 (MSG-263 개정 2 D9)
 * - 핫구역·지역축제·팝업스토어: 테마 셀을 테마 색으로, 교집합(∩ 내 점령)은 빗금
 * - 경로추천: 경로 주변 셀을 경로 색으로 — 교집합 빗금 규칙 동일 (Figma 정본 13848:8440, 검증 재작업 1)
 * 교집합 셀은 테마 스타일 쪽으로만 1회 그려진다 — 셸이 게시 id와 겹치는 상시 점령 셀을 제외한다(AC 8).
 *
 * MSG-325: 오버레이 id는 목 라벨("A-14")이 아니라 **서버 격자 id 체계**다 — 목 테마 셀도
 * 자기 center를 encodeGridId한 값을 쓴다. 점령 격자가 API에서 오므로 두 층의 id 체계가
 * 같아야 교집합(빗금)·중복 제거가 성립한다. 목 데이터 파일은 그대로 둔다.
 */
export const buildHomeOverlayCells = (
  activeTheme: ThemeId | null,
  themeCells: ThemeCell[],
  occupiedGridIds: string[],
): StyledCellOverlay[] => {
  if (activeTheme === null) return [];

  const occupiedIds = new Set(occupiedGridIds);
  return themeCells.map((c) => {
    const gridId = encodeGridId(c.center);
    return {
      id: gridId,
      corners: cellCornersAt(cellIndexAt(c.center)),
      color: THEME_META[activeTheme].color,
      hatched: occupiedIds.has(gridId),
    };
  });
};

/**
 * 게시된 테마 셀의 격자 id 목록 — 셀 탭 상세 열림 판정(`canOpenDetail`)의 입력.
 * `buildHomeOverlayCells`와 같은 소스·같은 인코딩(`encodeGridId`)을 거치므로
 * **판정 집합 ≡ 게시 집합**이 구성상 보장된다 (MSG-477 ③에서 부산 경계 필터 제거 —
 * 필터가 없어도 목 소스 테마의 `ThemeCell.id`가 목 라벨("A-14")이라 그대로 쓰면 상세가
 * 영영 안 열리는 결함(①)은 여전해, 인코딩 일원화는 유지한다).
 */
export const themeCellGridIds = (themeCells: ThemeCell[]): string[] =>
  themeCells.map((c) => encodeGridId(c.center));

/**
 * 재생 중 격자 테두리 강조 (MSG-328 사용자 피드백) — 게시 목록에 강조 표시를 얹는다.
 * 강조는 테두리만 바꾸고 **채움은 그 격자의 기존 렌더를 보존**한다(사용자 버그 환류):
 * - 이미 게시된 셀(활성 테마 셀)이면 emphasized만 켠다 — 중복 폴리곤 없음, 테마 채움 유지
 * - 점령 격자면 강조 셀에 occupied를 실어 점령 채움(18%)을 이어받는다 — 셸 상시 층이
 *   게시 id와 겹치는 점령 셀을 제외하므로(excludeSectionCells), 안 실으면 채움이 텅 빈다
 * - 원래 채움이 없던 격자(비점령·비테마)만 테두리 전용 셀이다 (MapCanvas 채움 0 처리)
 * 대상이 없으면(null) 입력을 그대로 반환한다 — 참조 안정(메모 무효화 방지).
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다(RN 재사용 대상).
 */
export const emphasizeCell = (
  cells: StyledCellOverlay[],
  gridId: string | null,
  occupiedGridIds: string[],
): StyledCellOverlay[] => {
  if (gridId === null) return cells;
  if (cells.some((cell) => cell.id === gridId)) {
    return cells.map((cell) =>
      cell.id === gridId ? { ...cell, emphasized: true } : cell,
    );
  }
  return [
    ...cells,
    {
      id: gridId,
      corners: decodeGridCorners(gridId),
      emphasized: true,
      ...(occupiedGridIds.includes(gridId) ? { occupied: true } : {}),
    },
  ];
};

/** 경로 경유지 — 번호 마커(1·2·3…)의 데이터 (MSG-252 AC 8) */
export interface RouteWaypoint {
  seq: number;
  position: LatLng;
  /** 선택 강조 (MSG-488 S8) — 미지정이면 기존 코스 마커 렌더 그대로(가산 확장) */
  active?: boolean;
}

/**
 * 지도 게시용 경로 오버레이 — 연결선 정점 + 번호 경유지 + 경로 색 (MSG-252 AC 8).
 * MSG-395: 코스가 목록으로 여럿 뜨므로 배열 게시가 되고, 그래서 `id`가 붙었다.
 */
export interface RouteOverlay {
  id: string;
  path: LatLng[];
  waypoints: RouteWaypoint[];
  color: string;
}

/**
 * 지도 게시용 이름표 마커 (MSG-395 AC 16·18·21) — 미션·코스 이름을 지도 위에 띄운다.
 * 셀·경로와 달리 텍스트가 서버 데이터라 렌더 경계(MapCanvas)에서 이스케이프한다.
 */
export interface LabelOverlay {
  id: string;
  position: LatLng;
  text: string;
  color: string;
}

/** 빗금 선분 개수 기본값 — 셀 폭 안에서 선 간격이 시각적으로 구분되는 밀도 (MSG-263: 100m 셀에도 유지) */
export const HATCH_LINE_COUNT = 5;

/**
 * 셀 꼭짓점 4점 안 사선 빗금 선분 목록. [AC 7, R1]
 * 네이버 Polygon은 패턴 채움을 지원하지 않아 사선 Polyline 묶음으로 빗금을 근사한다 —
 * 정규화 좌표(0~1)에서 x+y=s (s∈(0,2)) 반대각 평행선을 사각형 경계로 절단한 것.
 * MSG-357: 셀이 기울어진 사각형이라 정규화 좌표를 꼭짓점 4점의 쌍선형 보간으로 되돌린다 —
 * 축평행 Bounds 시절과 등가 기하(사양 변경 아님).
 */
export const buildHatchLines = (
  corners: CellCorners,
  lineCount: number = HATCH_LINE_COUNT,
): [LatLng, LatLng][] => {
  const [sw, se, ne, nw] = corners;
  /** 정규화 좌표 (u: 서→동, v: 남→북) → 꼭짓점 4점 쌍선형 보간 좌표 */
  const at = (u: number, v: number): LatLng => {
    const bilerp = (axis: (p: LatLng) => number): number =>
      axis(sw) * (1 - u) * (1 - v) +
      axis(se) * u * (1 - v) +
      axis(ne) * u * v +
      axis(nw) * (1 - u) * v;
    return { lat: bilerp((p) => p.lat), lng: bilerp((p) => p.lng) };
  };

  return Array.from({ length: lineCount }, (_, i) => {
    const s = (2 * (i + 1)) / (lineCount + 1);
    const x1 = Math.max(0, s - 1);
    const x2 = Math.min(1, s);
    return [at(x1, s - x1), at(x2, s - x2)];
  });
};
