import { describe, expect, it } from "vitest";
import { cellCenterAt, cellIndexAt } from "@/entities/cell";
import type { ZoneResponseDto } from "@/shared/api/generated/types.gen";
import {
  deriveGridSearchResults,
  matchZones,
  parseGridQuery,
  zoneBounds,
  zoneCellToGridId,
  zoomForGridFocus,
} from "./zone-search";

// 서면(부산 부산진구) 중심 좌표에서 유도한 실측 격자 인덱스 — 서버 정본 산술(entities/cell) 재사용.
// 구역 사각형: 세로 4칸(A~D행), 가로 6칸(1~6열)
const ORIGIN = cellIndexAt({ lat: 35.1578, lng: 129.0604 });

const zone = (over: Partial<ZoneResponseDto> = {}): ZoneResponseDto => ({
  zoneKey: "seomyeon",
  name: "서면",
  regionCode: null,
  minGridY: ORIGIN.gridY, // 남단 (D행)
  maxGridY: ORIGIN.gridY + 3, // 북단 (A행)
  minGridX: ORIGIN.gridX, // 서단 (1열)
  maxGridX: ORIGIN.gridX + 5, // 동단 (6열)
  priority: 1,
  ...over,
});

describe("parseGridQuery — 검색어 파싱 (AC 1)", () => {
  it('"서면 A-14"는 구역어 "서면" + 칸 코드 {row:"A", col:14}로 분해된다 (AC 1)', () => {
    expect(parseGridQuery("서면 A-14")).toEqual({
      term: "서면",
      cell: { row: "A", col: 14 },
    });
  });

  it('소문자 "서면 a-14"도 행 문자가 대문자로 정규화된다 (AC 1)', () => {
    expect(parseGridQuery("서면 a-14")).toEqual({
      term: "서면",
      cell: { row: "A", col: 14 },
    });
  });

  it('칸 코드가 불완전하면("서면 A"·"서면 A-") 구역명 검색으로 처리된다 (AC 1)', () => {
    expect(parseGridQuery("서면 A")).toEqual({ term: "서면", cell: null });
    expect(parseGridQuery("서면 A-")).toEqual({ term: "서면", cell: null });
  });

  it('칸 코드가 없으면("서면") 구역명 검색으로 처리된다 (AC 1)', () => {
    expect(parseGridQuery("서면")).toEqual({ term: "서면", cell: null });
  });

  it('여러 단어 구역명("전포 카페거리 B-3")은 마지막 토큰만 칸 코드로 분해된다', () => {
    expect(parseGridQuery("전포 카페거리 B-3")).toEqual({
      term: "전포 카페거리",
      cell: { row: "B", col: 3 },
    });
  });

  it("공백뿐인 입력은 빈 구역어다 (경계)", () => {
    expect(parseGridQuery("   ")).toEqual({ term: "", cell: null });
  });
});

describe("zoneCellToGridId — 칸 코드 → 격자 역산 (AC 2, DTO 명세 기반 자체 케이스 — BE 픽스처 대조는 후속)", () => {
  it("행 A는 북단(maxGridY), 열 1은 서단(minGridX)으로 역산된다 (AC 2)", () => {
    const z = zone();

    expect(zoneCellToGridId(z, "A", 1)).toBe(`${z.maxGridY}_${z.minGridX}`);
  });

  it("행이 진행하면 남쪽(-Y), 열이 진행하면 동쪽(+X)으로 이동한다 (AC 2)", () => {
    const z = zone();

    expect(zoneCellToGridId(z, "B", 3)).toBe(
      `${z.maxGridY - 1}_${z.minGridX + 2}`,
    );
  });

  it("남동 끝 칸(D-6)까지 사각형 안이다 (경계)", () => {
    const z = zone();

    expect(zoneCellToGridId(z, "D", 6)).toBe(`${z.minGridY}_${z.maxGridX}`);
  });

  it("사각형 밖 행(E)은 매치 없음이다 (AC 2)", () => {
    expect(zoneCellToGridId(zone(), "E", 1)).toBeNull();
  });

  it("범위 초과 열 번호는 매치 없음이다 (AC 2)", () => {
    expect(zoneCellToGridId(zone(), "A", 7)).toBeNull();
  });

  it("0열은 매치 없음이다 (경계)", () => {
    expect(zoneCellToGridId(zone(), "A", 0)).toBeNull();
  });
});

describe("matchZones — 구역 매칭 (AC 3)", () => {
  const DONG = zone({ zoneKey: "dong-seomyeon", name: "동서면", priority: 0 });
  const SEOMYEON = zone({ zoneKey: "seomyeon", name: "서면", priority: 2 });
  const MARKET = zone({
    zoneKey: "seomyeon-market",
    name: "서면시장",
    priority: 1,
  });

  it("구역명 접두 일치가 포함 일치보다 앞선다 (AC 3)", () => {
    const result = matchZones([DONG, SEOMYEON, MARKET], "서면");

    expect(result.map((z) => z.zoneKey)).toEqual([
      "seomyeon-market", // 접두 일치, priority 1
      "seomyeon", // 접두 일치, priority 2
      "dong-seomyeon", // 포함 일치
    ]);
  });

  it("동순위는 priority 오름차순이다 (AC 3)", () => {
    const result = matchZones([SEOMYEON, MARKET], "서면");

    expect(result.map((z) => z.zoneKey)).toEqual([
      "seomyeon-market",
      "seomyeon",
    ]);
  });

  it("priority 동률은 zoneKey 오름차순 타이브레이크다 (AC 3)", () => {
    const b = zone({ zoneKey: "b-zone", name: "서면", priority: 1 });
    const a = zone({ zoneKey: "a-zone", name: "서면", priority: 1 });

    const result = matchZones([b, a], "서면");

    expect(result.map((z) => z.zoneKey)).toEqual(["a-zone", "b-zone"]);
  });

  it("최대 5건으로 자른다 (AC 3)", () => {
    const many = Array.from({ length: 6 }, (_, i) =>
      zone({ zoneKey: `zone-${i}`, name: `서면${i}`, priority: i }),
    );

    expect(matchZones(many, "서면")).toHaveLength(5);
  });

  it("빈 구역어는 매치 없음이다 (경계)", () => {
    expect(matchZones([SEOMYEON], "")).toEqual([]);
  });
});

describe("deriveGridSearchResults — 입력 → 격자/구역 매치 목록 (AC 1·2·3·7)", () => {
  it("zones가 빈 배열(시딩 전)이면 매치 0건이다 (AC 3)", () => {
    expect(deriveGridSearchResults([], "서면 A-1")).toEqual([]);
  });

  it("칸 코드가 완성되면 격자 결과(gridId·라벨)가 나온다 (AC 1·2)", () => {
    const z = zone();

    const result = deriveGridSearchResults([z], "서면 A-1");

    expect(result).toEqual([
      {
        kind: "grid",
        zoneKey: "seomyeon",
        gridId: `${z.maxGridY}_${z.minGridX}`,
        label: "서면 A-1",
      },
    ]);
  });

  it("칸 코드가 사각형 밖이면 그 구역은 결과에서 빠진다 (AC 2)", () => {
    expect(deriveGridSearchResults([zone()], "서면 Z-99")).toEqual([]);
  });

  it("구역명만 매치되면 구역 결과(fitBounds용 bounds)가 나온다 (AC 7)", () => {
    const result = deriveGridSearchResults([zone()], "서면");

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      kind: "zone",
      zoneKey: "seomyeon",
      label: "서면",
    });
  });
});

describe("zoneBounds — 구역 사각형 → LatLng Bounds (AC 7)", () => {
  it("구역 사각형 전체를 담는다 — 모서리 셀 중심이 bounds 안에 든다 (AC 7)", () => {
    const z = zone();

    const b = zoneBounds(z);

    const swCenter = cellCenterAt({ gridX: z.minGridX, gridY: z.minGridY });
    const neCenter = cellCenterAt({ gridX: z.maxGridX, gridY: z.maxGridY });
    expect(b.sw.lat).toBeLessThan(swCenter.lat);
    expect(b.sw.lng).toBeLessThan(swCenter.lng);
    expect(b.ne.lat).toBeGreaterThan(neCenter.lat);
    expect(b.ne.lng).toBeGreaterThan(neCenter.lng);
  });
});

describe("zoomForGridFocus — 선택 시 격자 최소 줌 보장 (AC 5)", () => {
  it("현재 줌이 격자 최소 줌(16) 미만이면 16으로 끌어올린다 (AC 5)", () => {
    expect(zoomForGridFocus(14)).toBe(16);
  });

  it("이미 그 이상이면 줌을 유지한다 — null (AC 5)", () => {
    expect(zoomForGridFocus(16)).toBeNull();
    expect(zoomForGridFocus(18)).toBeNull();
  });
});
