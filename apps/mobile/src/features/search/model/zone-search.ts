import type { Bounds } from "../../../entities/cell/model/grid";
import { cellCornersAt } from "../../../entities/cell/model/grid-5179";
import type { ZoneResponseDto } from "../../../shared/api/sdk";

/**
 * 격자 검색 역파싱 (MSG-578 D5 — 웹 MSG-412 `zone-search.ts` 복사 포팅) — 순수 함수,
 * 지도 SDK/플랫폼에 의존하지 않는다. 동등성은 `zone-search.parity.test.ts`가 고정한다.
 * 서버 검색 API가 없어 `GET /api/zones`(구역 사각형 목록)를 원천으로 입력을 로컬에서
 * 역파싱한다. 명명 의미는 서버 정본(zone-naming): **행 A = 북단(maxGridY), 열 1 =
 * 서단(minGridX)** — 격자 응답의 zoneName·zoneCell 조립과 역대응이어야 검색 라벨과
 * 격자 이름이 같은 격자를 가리킨다.
 */

/** 파싱된 격자 검색어 — 구역어 + 완성된 칸 코드(불완전·부재면 null → 구역명 검색) */
export interface ParsedGridQuery {
  term: string;
  cell: { row: string; col: number } | null;
}

/** 완성된 칸 코드 — "A-14" (행 문자 1자 + 열 번호, 대소문자 무시) */
const FULL_CELL_CODE = /^([A-Za-z])-(\d+)$/;
/** 입력 중 칸 코드 — "A"·"A-"·"A-1" (마지막 토큰이 이 꼴이면 구역어에서 제외) */
const PARTIAL_CELL_CODE = /^[A-Za-z](-\d*)?$/;

/**
 * 검색어 → 구역어 + 칸 코드 분해. 마지막 토큰이 칸 코드 꼴일 때만 분리하고,
 * 불완전한 칸 코드("A"·"A-")는 버려 구역명 검색으로 처리한다 — 칸 코드를 완성하기 전에도
 * 구역 매치가 계속 보이는 UX를 위해서다. 행 문자는 대문자로 정규화한다.
 */
export const parseGridQuery = (input: string): ParsedGridQuery => {
  const tokens = input.trim().split(/\s+/).filter(Boolean);
  if (tokens.length >= 2) {
    const last = tokens[tokens.length - 1];
    const full = FULL_CELL_CODE.exec(last);
    if (full) {
      return {
        term: tokens.slice(0, -1).join(" "),
        cell: { row: full[1].toUpperCase(), col: Number(full[2]) },
      };
    }
    if (PARTIAL_CELL_CODE.test(last)) {
      return { term: tokens.slice(0, -1).join(" "), cell: null };
    }
  }
  return { term: tokens.join(" "), cell: null };
};

/** 매치 상한 — 48건 로컬 필터라 성능 무관, 섹션 노출량만 제한 */
export const MAX_ZONE_MATCHES = 5;

/** 동순위 정렬 — priority 오름차순, 동률은 zoneKey 오름차순 (순서 결정성) */
const byPriorityThenKey = (a: ZoneResponseDto, b: ZoneResponseDto): number =>
  a.priority - b.priority ||
  (a.zoneKey < b.zoneKey ? -1 : a.zoneKey > b.zoneKey ? 1 : 0);

/** 구역명 매칭 — 접두 일치 우선 → 포함 일치, 각 그룹 priority·zoneKey 정렬, 최대 5건 */
export const matchZones = (
  zones: ZoneResponseDto[],
  term: string,
): ZoneResponseDto[] => {
  if (term.length === 0) return [];
  const prefix = zones
    .filter((z) => z.name.startsWith(term))
    .sort(byPriorityThenKey);
  const contains = zones
    .filter((z) => !z.name.startsWith(term) && z.name.includes(term))
    .sort(byPriorityThenKey);
  return [...prefix, ...contains].slice(0, MAX_ZONE_MATCHES);
};

/**
 * 칸 코드 → 격자 역산 — 행 A = 북단(maxGridY)에서 남쪽으로, 열 1 = 서단(minGridX)에서
 * 동쪽으로 진행한다. 사각형 밖 행/열은 매치 없음(null). 행 문자는 A~Z 단일 문자 전제.
 */
export const zoneCellToGridId = (
  zone: ZoneResponseDto,
  row: string,
  col: number,
): string | null => {
  const rowIndex = row.charCodeAt(0) - "A".charCodeAt(0);
  const gridY = zone.maxGridY - rowIndex;
  const gridX = zone.minGridX + (col - 1);
  if (rowIndex < 0 || gridY < zone.minGridY) return null;
  if (col < 1 || gridX > zone.maxGridX) return null;
  return `${gridY}_${gridX}`;
};

/**
 * 구역 사각형 → LatLng Bounds — fitBounds용. 5179 셀은 위경도 평면에서 살짝 기울어
 * 있어(자오선 수렴) 네 모서리 셀의 바깥 꼭짓점을 모두 보고 min/max를 취한다 —
 * 남서·북동 2점만 보면 가장자리가 잘린다 (entities/cell viewportGridRange와 같은 이유).
 */
export const zoneBounds = (zone: ZoneResponseDto): Bounds => {
  const corners = [
    cellCornersAt({ gridX: zone.minGridX, gridY: zone.minGridY })[0], // 남서
    cellCornersAt({ gridX: zone.maxGridX, gridY: zone.minGridY })[1], // 남동
    cellCornersAt({ gridX: zone.maxGridX, gridY: zone.maxGridY })[2], // 북동
    cellCornersAt({ gridX: zone.minGridX, gridY: zone.maxGridY })[3], // 북서
  ];
  const lats = corners.map((c) => c.lat);
  const lngs = corners.map((c) => c.lng);
  return {
    sw: { lat: Math.min(...lats), lng: Math.min(...lngs) },
    ne: { lat: Math.max(...lats), lng: Math.max(...lngs) },
  };
};

/**
 * 격자 검색 결과 — 칸 코드가 완성되면 격자(이동+하이라이트), 구역명만 매치면 구역(fitBounds).
 * 라벨은 격자 응답 zoneName·zoneCell 조립("서면 A-14")과 동일 형식이다.
 */
export type GridSearchResult =
  | { kind: "grid"; zoneKey: string; gridId: string; label: string }
  | { kind: "zone"; zoneKey: string; label: string; bounds: Bounds };

/** 입력 문자열 + zones → 격자/구역 매치 목록 — zones가 비면(시딩 전) 항상 0건 */
export const deriveGridSearchResults = (
  zones: ZoneResponseDto[],
  input: string,
): GridSearchResult[] => {
  const { term, cell } = parseGridQuery(input);
  const matched = matchZones(zones, term);
  if (cell !== null) {
    return matched.flatMap((zone) => {
      const gridId = zoneCellToGridId(zone, cell.row, cell.col);
      return gridId === null
        ? []
        : [
            {
              kind: "grid" as const,
              zoneKey: zone.zoneKey,
              gridId,
              label: `${zone.name} ${cell.row}-${cell.col}`,
            },
          ];
    });
  }
  return matched.map((zone) => ({
    kind: "zone" as const,
    zoneKey: zone.zoneKey,
    label: zone.name,
    bounds: zoneBounds(zone),
  }));
};
