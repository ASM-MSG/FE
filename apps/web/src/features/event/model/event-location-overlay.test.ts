import { palette, semantic } from "@fillmap/design-tokens";
import { describe, expect, it } from "vitest";
import type { EventLocationResponseDto } from "@/shared/api/generated/types.gen";
import {
  buildEventGridMembership,
  buildEventLocationCells,
  buildEventLocationLabels,
  eventGridIdSet,
} from "./event-location-overlay";

const location = (
  overrides: Partial<EventLocationResponseDto>,
): EventLocationResponseDto => ({
  locationId: 11,
  name: "부산역 웰컴 팝업",
  type: "POPUP",
  operatingHours: null,
  gridIds: ["16846_11428", "16846_11429"],
  representativeGridId: "16846_11428",
  zoneName: null,
  zoneCell: null,
  regionName: null,
  videoCount: 0,
  organizerName: null,
  description: null,
  participationStartsOn: null,
  participationEndsOn: null,
  participationMethod: null,
  imageUrl: null,
  ...overrides,
});

const LOCATIONS = [
  location({}),
  location({
    locationId: 12,
    name: "광안리 피카츄 퍼레이드",
    gridIds: ["16850_11440"],
    representativeGridId: "16850_11440",
  }),
];

describe("buildEventLocationCells — 행사 위치 영역 채색 (AC 6·7)", () => {
  it("전 위치의 gridIds 전체가 블루 틴트 셀로 파생된다 (AC 6)", () => {
    const cells = buildEventLocationCells(LOCATIONS, null);

    expect(cells.map((c) => c.id)).toEqual([
      "16846_11428",
      "16846_11429",
      "16850_11440",
    ]);
    expect(cells.every((c) => c.color === semantic.primary)).toBe(true);
    expect(cells.every((c) => c.emphasized === undefined)).toBe(true);
  });

  it("강조 위치의 셀만 보라 아웃라인 강조로 바뀐다 (AC 7)", () => {
    const cells = buildEventLocationCells(LOCATIONS, 12);

    const highlighted = cells.find((c) => c.id === "16850_11440");
    const plain = cells.find((c) => c.id === "16846_11428");
    expect(highlighted?.emphasized).toBe(true);
    expect(highlighted?.color).toBe(palette["theme-festival"]);
    expect(plain?.emphasized).toBeUndefined();
    expect(plain?.color).toBe(semantic.primary);
  });

  it("두 위치가 같은 격자를 공유하면 먼저 온 위치 스타일로 1회만 파생된다 (경계 — membership과 동일 규칙)", () => {
    const overlapping = [
      LOCATIONS[0]!,
      location({ locationId: 13, gridIds: ["16846_11428"] }),
    ];

    const cells = buildEventLocationCells(overlapping, 13);

    expect(cells.filter((c) => c.id === "16846_11428")).toHaveLength(1);
    expect(cells[0]?.emphasized).toBeUndefined();
  });
});

describe("buildEventLocationLabels — 위치 이름 라벨 (AC 6·7)", () => {
  it("위치마다 대표 격자 위치에 이름 라벨이 붙는다 (AC 6)", () => {
    const labels = buildEventLocationLabels(
      LOCATIONS,
      null,
      "포켓몬 메가페스타",
    );

    expect(labels.map((l) => l.text)).toEqual([
      "부산역 웰컴 팝업",
      "광안리 피카츄 퍼레이드",
    ]);
    expect(labels.every((l) => l.color === semantic.primary)).toBe(true);
  });

  it("강조 위치의 라벨은 행사명으로 바뀐다 — '● {행사명}' 표시 재료 (AC 7)", () => {
    const labels = buildEventLocationLabels(LOCATIONS, 12, "포켓몬 메가페스타");

    expect(labels.map((l) => l.text)).toEqual([
      "부산역 웰컴 팝업",
      "포켓몬 메가페스타",
    ]);
    expect(labels[1]?.color).toBe(palette["theme-festival"]);
  });
});

describe("buildEventGridMembership · eventGridIdSet — 격자→위치 판정 (AC 7·8)", () => {
  it("격자 id로 소속 위치 id를 찾는다 — 중복 격자는 먼저 온 위치 우선", () => {
    const overlapping = [
      LOCATIONS[0]!,
      location({ locationId: 13, gridIds: ["16846_11428"] }),
    ];

    const membership = buildEventGridMembership(overlapping);

    expect(membership.get("16846_11428")).toBe(11);
    expect(membership.get("16846_11429")).toBe(11);
    expect(membership.get("99999_99999")).toBeUndefined();
  });

  it("전 위치 격자의 합집합 Set을 준다 — 클릭 라우팅 예외 판정 입력 (AC 8)", () => {
    const ids = eventGridIdSet(LOCATIONS);

    expect(ids.has("16846_11428")).toBe(true);
    expect(ids.has("16850_11440")).toBe(true);
    expect(ids.has("99999_99999")).toBe(false);
  });
});
