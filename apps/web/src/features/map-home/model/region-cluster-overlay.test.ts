import { describe, expect, it } from "vitest";
import type {
  MissionRegionAggregateResponseDto,
  RegionAggregateResponseDto,
} from "@/shared/api/generated";
import {
  mergeOverlappingMarkers,
  toMissionClusterMarkers,
  toRegionClusterMarkers,
  type RegionClusterMarker,
} from "./region-cluster-overlay";

/** 서면 일대 동 단위 집계 항목 픽스처 — 좌표·지명은 부산 기준 */
const dongItem = (
  over: Partial<RegionAggregateResponseDto> = {},
): RegionAggregateResponseDto => ({
  regionCode: "2623051000",
  name: "부전2동",
  lat: 35.1579,
  lng: 129.0594,
  count: 9,
  ...over,
});

/** 병합 대상 마커 픽스처 — 파생 결과와 같은 모양의 순수 데이터 */
const markerOf = (
  id: string,
  name: string | null,
  lat: number,
  lng: number,
  count: number,
  unit: RegionClusterMarker["unit"] = "SIGUNGU",
): RegionClusterMarker => ({
  id,
  name,
  count,
  position: { lat, lng },
  unit,
});

/**
 * 원하는 화면 픽셀 거리를 만드는 경도 차 — 같은 위도에서 Web Mercator 가로 픽셀 거리는
 * Δlng / 360 × 256 × 2^zoom 이므로 역산한다 (위도 무관, 정확한 경계값 구성용)
 */
const lngGapForPx = (px: number, zoom: number): number =>
  (px * 360) / (256 * 2 ** zoom);

const sumCount = (markers: RegionClusterMarker[]): number =>
  markers.reduce((sum, m) => sum + m.count, 0);

describe("toRegionClusterMarkers — items[] → 지역명+count 마커 파생 (AC 4)", () => {
  it("지역명·count·좌표는 응답 값 그대로 마커가 된다 (AC 4)", () => {
    const items = [
      dongItem(),
      dongItem({
        regionCode: "2623052000",
        name: "부전1동",
        lat: 35.162,
        lng: 129.055,
        count: 4,
      }),
    ];

    const markers = toRegionClusterMarkers(items, "DONG");

    expect(markers).toHaveLength(2);
    expect(markers[0]).toMatchObject({
      name: "부전2동",
      count: 9,
      position: { lat: 35.1579, lng: 129.0594 },
      unit: "DONG",
    });
    expect(markers[1]).toMatchObject({ name: "부전1동", count: 4 });
  });

  it("마커 키는 regionCode 기반으로 안정적이다 — 순서가 바뀌어도 같은 항목은 같은 키 (AC 4)", () => {
    const a = dongItem();
    const b = dongItem({ regionCode: "2623052000", name: "부전1동" });

    const forward = toRegionClusterMarkers([a, b], "DONG");
    const reversed = toRegionClusterMarkers([b, a], "DONG");

    expect(forward.map((m) => m.id).sort()).toEqual(
      reversed.map((m) => m.id).sort(),
    );
    expect(new Set(forward.map((m) => m.id)).size).toBe(2);
  });

  it("행정동 미판정(null) 버킷은 이름 없이 개수만이고 별도 키를 가진다 (AC 4)", () => {
    const markers = toRegionClusterMarkers(
      [dongItem(), dongItem({ regionCode: null, name: null, count: 3 })],
      "DONG",
    );

    const nullBucket = markers.find((m) => m.name === null);
    expect(nullBucket).toBeDefined();
    expect(nullBucket?.count).toBe(3);
    expect(new Set(markers.map((m) => m.id)).size).toBe(2);
  });

  it("시 단위 이름은 표기 축약된다 — 부산광역시→부산, 울산광역시→울산, 경상남도→경남 (AC 4, 추정 5)", () => {
    const items = [
      dongItem({ regionCode: "26", name: "부산광역시", count: 131 }),
      dongItem({ regionCode: "31", name: "울산광역시", count: 12 }),
      dongItem({ regionCode: "48", name: "경상남도", count: 7 }),
    ];

    const markers = toRegionClusterMarkers(items, "SIDO");

    expect(markers.map((m) => m.name)).toEqual(["부산", "울산", "경남"]);
  });

  it("동·구 단위 이름은 축약하지 않는다 (AC 4)", () => {
    expect(toRegionClusterMarkers([dongItem()], "DONG")[0].name).toBe(
      "부전2동",
    );
    expect(
      toRegionClusterMarkers(
        [dongItem({ regionCode: "26230", name: "부산진구" })],
        "SIGUNGU",
      )[0].name,
    ).toBe("부산진구");
  });
});

describe("mergeOverlappingMarkers — 화면 픽셀 임계 병합 (AC 5)", () => {
  // 경도 0.05도 간격: Web Mercator 도당 px = 256 × 2^zoom / 360.
  // zoom 8에서 약 9px(임계 미만 → 병합), zoom 13에서 약 291px(임계 이상 → 분리)
  const near = [
    markerOf("agg-SIGUNGU-26230", "부산진구", 35.1579, 129.0594, 9),
    markerOf("agg-SIGUNGU-26260", "동래구", 35.1579, 129.1094, 4),
  ];

  it("픽셀 거리 임계 미만인 마커들은 하나로 병합되고 count는 합산된다 (AC 5)", () => {
    const merged = mergeOverlappingMarkers(near, 8);

    expect(merged).toHaveLength(1);
    expect(merged[0].count).toBe(13);
  });

  it("병합 마커는 개수가 가장 많았던 지역의 이름을 쓴다 (MSG-451 AC 18)", () => {
    const merged = mergeOverlappingMarkers(near, 8);

    expect(merged[0].name).toBe("부산진구");
  });

  it("개수가 같으면 가나다순으로 앞선 이름을 쓴다 (MSG-451 AC 19)", () => {
    const tied = [
      markerOf("agg-SIGUNGU-26260", "동래구", 35.1579, 129.0594, 7),
      markerOf("agg-SIGUNGU-26230", "부산진구", 35.1579, 129.1094, 7),
    ];

    expect(mergeOverlappingMarkers(tied, 8)[0].name).toBe("동래구");
  });

  it("이름 없는 멤버가 섞이면 이름 있는 쪽이 이긴다 — 개수가 같아도 (MSG-451 AC 20)", () => {
    const withUnassigned = [
      markerOf("agg-SIGUNGU-unassigned-0", null, 35.1579, 129.0594, 7),
      markerOf("agg-SIGUNGU-26230", "부산진구", 35.1579, 129.1094, 7),
    ];

    expect(mergeOverlappingMarkers(withUnassigned, 8)[0].name).toBe("부산진구");
  });

  it("이름 없는 멤버끼리 병합되면 이름은 null이다 (MSG-451 AC 20, 경계)", () => {
    const allNull = [
      markerOf("agg-SIGUNGU-unassigned-0", null, 35.1579, 129.0594, 7),
      markerOf("agg-SIGUNGU-unassigned-1", null, 35.1579, 129.1094, 4),
    ];

    expect(mergeOverlappingMarkers(allNull, 8)[0].name).toBeNull();
  });

  it("이름 있는 멤버가 개수에서 지면 개수 최다 쪽 이름을 쓴다 (MSG-451 AC 18)", () => {
    const bigger = [
      markerOf("agg-SIGUNGU-26260", "동래구", 35.1579, 129.0594, 4),
      markerOf("agg-SIGUNGU-26230", "부산진구", 35.1579, 129.1094, 9),
    ];

    expect(mergeOverlappingMarkers(bigger, 8)[0].name).toBe("부산진구");
  });

  it("임계 이상 떨어진 마커들은 병합되지 않고 그대로다 (AC 5)", () => {
    const separate = mergeOverlappingMarkers(near, 13);

    expect(separate).toHaveLength(2);
    expect(separate.map((m) => m.name).sort()).toEqual(["동래구", "부산진구"]);
  });

  it("병합 임계는 단위별 마커 지름을 따른다 — 시(92px) 마커는 90px 거리에서 병합된다 (재작업 1)", () => {
    const zoom = 10;
    const sido = [
      markerOf("agg-SIDO-26", "부산", 35.1579, 129.0594, 131, "SIDO"),
      markerOf(
        "agg-SIDO-31",
        "울산",
        35.1579,
        129.0594 + lngGapForPx(90, zoom),
        57,
        "SIDO",
      ),
    ];

    const merged = mergeOverlappingMarkers(sido, zoom);

    expect(merged).toHaveLength(1);
    expect(merged[0].count).toBe(188);
  });

  it("동(68px) 마커는 지름 이상인 80px 거리에서 분리된다 — 최대 지름 일괄 임계가 아니다 (재작업 1)", () => {
    const zoom = 13;
    const dong = [
      markerOf("agg-DONG-2623051000", "부전1동", 35.1579, 129.0594, 3, "DONG"),
      markerOf(
        "agg-DONG-2623052000",
        "부전2동",
        35.1579,
        129.0594 + lngGapForPx(80, zoom),
        9,
        "DONG",
      ),
    ];

    expect(mergeOverlappingMarkers(dong, zoom)).toHaveLength(2);
  });

  it("미션 마커가 병합돼도 칩 테마가 유지된다 — 합친 마커도 색을 잃지 않는다 (MSG-451 AC 6)", () => {
    const missionMarkers = toMissionClusterMarkers(
      [
        {
          regionCode: "26230",
          name: "부산진구",
          lat: 35.1579,
          lng: 129.0594,
          count: 9,
          missionIds: [],
        },
        {
          regionCode: "26260",
          name: "동래구",
          lat: 35.1579,
          lng: 129.1094,
          count: 4,
          missionIds: [],
        },
      ],
      "SIGUNGU",
      "festival",
    );

    const merged = mergeOverlappingMarkers(missionMarkers, 8);

    expect(merged).toHaveLength(1);
    expect(merged[0].theme).toBe("festival");
  });

  it("병합 후 count 총합 = 입력 총합 — 어떤 병합 구성에서도 유지된다 (AC 5)", () => {
    const spread = ["가야1동", "가야2동", "개금1동", "개금2동", "당감1동"].map(
      (name, i) =>
        markerOf(
          `agg-DONG-262305${i}000`,
          name,
          35.15 + i * 0.004,
          129.05 + i * 0.004,
          i + 1,
        ),
    );

    for (const zoom of [8, 11, 14]) {
      expect(sumCount(mergeOverlappingMarkers(spread, zoom))).toBe(
        sumCount(spread),
      );
    }
  });
});

/** 미션 집계 응답 픽스처 — 도감 항목에 missionIds가 붙는다 (MSG-437 서버) */
const missionItem = (
  over: Partial<MissionRegionAggregateResponseDto> = {},
): MissionRegionAggregateResponseDto => ({
  regionCode: "26230",
  name: "부산진구",
  lat: 35.1568,
  lng: 129.0592,
  count: 12,
  missionIds: [1, 2, 3],
  ...over,
});

describe("toMissionClusterMarkers — 미션 집계 items[] → 마커 파생 (MSG-451 AC 6)", () => {
  it("지역명·count·좌표는 응답 값 그대로 마커가 되고 활성 칩 테마가 실린다", () => {
    const [marker] = toMissionClusterMarkers(
      [missionItem()],
      "SIGUNGU",
      "festival",
    );

    expect(marker.name).toBe("부산진구");
    expect(marker.count).toBe(12);
    expect(marker.position).toEqual({ lat: 35.1568, lng: 129.0592 });
    expect(marker.theme).toBe("festival");
  });

  it("시 단위 이름은 도감 마커와 같은 규칙으로 축약된다", () => {
    const [marker] = toMissionClusterMarkers(
      [missionItem({ regionCode: "26", name: "부산광역시" })],
      "SIDO",
      "popup",
    );

    expect(marker.name).toBe("부산");
  });

  it("칩이 다르면 같은 지역이라도 마커 키가 다르다 — 칩 전환 시 렌더가 섞이지 않는다", () => {
    const [festival] = toMissionClusterMarkers(
      [missionItem()],
      "SIGUNGU",
      "festival",
    );
    const [popup] = toMissionClusterMarkers(
      [missionItem()],
      "SIGUNGU",
      "popup",
    );

    expect(festival.id).not.toBe(popup.id);
  });

  it("점령 집계 마커와도 키가 겹치지 않는다 — 두 층이 같은 지도에 설 수 있다", () => {
    const [mission] = toMissionClusterMarkers(
      [missionItem()],
      "SIGUNGU",
      "festival",
    );
    const [occupied] = toRegionClusterMarkers(
      [
        {
          regionCode: "26230",
          name: "부산진구",
          lat: 35.1568,
          lng: 129.0592,
          count: 12,
        },
      ],
      "SIGUNGU",
    );

    expect(mission.id).not.toBe(occupied.id);
  });

  it("행정동 미판정 묶음(regionCode·name null)은 이름 없이 개수만 남는다 (경계)", () => {
    const [marker] = toMissionClusterMarkers(
      [missionItem({ regionCode: null, name: null })],
      "SIGUNGU",
      "festival",
    );

    expect(marker.name).toBeNull();
    expect(marker.count).toBe(12);
  });
});
