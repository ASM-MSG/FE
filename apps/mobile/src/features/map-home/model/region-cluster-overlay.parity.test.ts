import { describe, expect, it } from "vitest";
import type { RegionAggregateResponseDto } from "../../../shared/api/sdk";
import type { AggregationUnit } from "./aggregation-unit";
import * as mobileClusterOverlay from "./region-cluster-overlay";

/**
 * L7·L8·L9: 집계 항목 → 마커 파생과 겹침 병합이 웹 원본과 전건 동일하다 (MSG-428).
 * 표본 지명은 전부 부산이다(MVP 지역 정본) — 병합 임계가 단위별로 다른 것(L9)까지
 * 좌표 표본으로 고정한다.
 *
 * 웹 원본은 변수 경로 동적 import (map-query-policy.parity.test.ts 선례).
 */
const WEB_CLUSTER_OVERLAY_PATH = new URL(
  "../../../../../web/src/features/map-home/model/region-cluster-overlay.ts",
  import.meta.url,
).pathname;

interface WebClusterOverlay {
  MARKER_MERGE_PX: typeof mobileClusterOverlay.MARKER_MERGE_PX;
  toRegionClusterMarkers: typeof mobileClusterOverlay.toRegionClusterMarkers;
  mergeOverlappingMarkers: typeof mobileClusterOverlay.mergeOverlappingMarkers;
}

const loadWebClusterOverlay = (): Promise<WebClusterOverlay> =>
  import(WEB_CLUSTER_OVERLAY_PATH);

const item = (
  regionCode: string | null,
  name: string | null,
  lat: number,
  lng: number,
  count: number,
): RegionAggregateResponseDto => ({ regionCode, name, lat, lng, count });

/** 부산 표본 — 부전2동·부전1동 + 미판정(해상) 버킷 */
const DONG_ITEMS: RegionAggregateResponseDto[] = [
  item("2623051000", "부전2동", 35.1579, 129.0594, 31),
  item("2623052000", "부전1동", 35.1631, 129.0663, 12),
  item(null, null, 35.09, 129.11, 3),
];

const SIGUNGU_ITEMS: RegionAggregateResponseDto[] = [
  item("26230", "부산진구", 35.1626, 129.0531, 118),
  item("26170", "동구", 35.1295, 129.0454, 24),
];

describe("toRegionClusterMarkers 동등성 (L7)", () => {
  it("이름·count·좌표를 응답 값 그대로 옮기고 regionCode 기반 안정 키를 만든다 — 웹과 전건 동일", async () => {
    const web = await loadWebClusterOverlay();

    for (const [items, unit] of [
      [DONG_ITEMS, "DONG"],
      [SIGUNGU_ITEMS, "SIGUNGU"],
    ] as [RegionAggregateResponseDto[], AggregationUnit][]) {
      expect(mobileClusterOverlay.toRegionClusterMarkers(items, unit)).toEqual(
        web.toRegionClusterMarkers(items, unit),
      );
    }

    const markers = mobileClusterOverlay.toRegionClusterMarkers(
      DONG_ITEMS,
      "DONG",
    );
    expect(markers[0]).toEqual({
      id: "agg-DONG-2623051000",
      name: "부전2동",
      count: 31,
      position: { lat: 35.1579, lng: 129.0594 },
      unit: "DONG",
    });
  });

  it("순서를 바꿔도 같은 regionCode는 같은 키다 — 재조회 렌더 안정 (L7)", () => {
    const forward = mobileClusterOverlay.toRegionClusterMarkers(
      DONG_ITEMS,
      "DONG",
    );
    const reversed = mobileClusterOverlay.toRegionClusterMarkers(
      [...DONG_ITEMS].reverse(),
      "DONG",
    );
    const keyOf = (name: string | null, markers: typeof forward) =>
      markers.find((marker) => marker.name === name)?.id;

    expect(keyOf("부전2동", reversed)).toBe(keyOf("부전2동", forward));
    expect(keyOf("부전1동", reversed)).toBe(keyOf("부전1동", forward));
  });

  it("regionCode:null 버킷은 name:null + 별도 키를 갖는다 (L7)", () => {
    const markers = mobileClusterOverlay.toRegionClusterMarkers(
      DONG_ITEMS,
      "DONG",
    );
    const unassigned = markers[2];

    expect(unassigned.name).toBeNull();
    expect(unassigned.id).toBe("agg-DONG-unassigned-0");
    expect(new Set(markers.map((marker) => marker.id)).size).toBe(
      markers.length,
    );
  });
});

/** 병합 판정을 픽셀 단위로 구성하기 위한 기준 줌 — 임계는 zoom과 무관한 화면 픽셀이다 */
const MERGE_ZOOM = 14;

/**
 * 같은 위도의 부산 두 동을 정확히 `distancePx` 만큼 떼어 놓은 마커 쌍.
 * 세계 픽셀 한 변은 256×2^zoom이므로 경도 1px = 360/(256×2^zoom)도다 (y는 동일 위도라 0).
 */
const apartByPx = (distancePx: number, unit: AggregationUnit) => {
  const degPerPx = 360 / (256 * 2 ** MERGE_ZOOM);
  return mobileClusterOverlay.toRegionClusterMarkers(
    [
      item("2623051000", "부전2동", 35.1579, 129.0594, 31),
      item(
        "2623052000",
        "부전1동",
        35.1579,
        129.0594 + degPerPx * distancePx,
        12,
      ),
    ],
    unit,
  );
};

describe("mergeOverlappingMarkers 동등성 (L8·L9)", () => {
  it("MARKER_MERGE_PX가 웹 정본(동 68·구 80·시 92)과 같다 (L8)", async () => {
    const web = await loadWebClusterOverlay();

    expect(mobileClusterOverlay.MARKER_MERGE_PX).toEqual(web.MARKER_MERGE_PX);
    expect(mobileClusterOverlay.MARKER_MERGE_PX).toEqual({
      DONG: 68,
      SIGUNGU: 80,
      SIDO: 92,
    });
  });

  it("병합 결과가 zoom 10~15 전건에서 웹과 동일하다 (L8)", async () => {
    const web = await loadWebClusterOverlay();

    const dongMarkers = mobileClusterOverlay.toRegionClusterMarkers(
      DONG_ITEMS,
      "DONG",
    );
    const sigunguMarkers = mobileClusterOverlay.toRegionClusterMarkers(
      SIGUNGU_ITEMS,
      "SIGUNGU",
    );
    for (let zoom = 10; zoom <= 15; zoom++) {
      expect(
        mobileClusterOverlay.mergeOverlappingMarkers(dongMarkers, zoom),
      ).toEqual(web.mergeOverlappingMarkers(dongMarkers, zoom));
      expect(
        mobileClusterOverlay.mergeOverlappingMarkers(sigunguMarkers, zoom),
      ).toEqual(web.mergeOverlappingMarkers(sigunguMarkers, zoom));
    }
  });

  it("병합 마커는 앵커(최대 count) 이름 + count 합산 + 앵커 좌표다 (L8 → MSG-451 개정)", () => {
    // 임계(68px) 안쪽으로 10px 떨어뜨린 두 동 — count 큰 쪽(31)이 앵커가 된다.
    // 이름을 버리던 종전 규칙은 MSG-451에서 뒤집혔다(웹 원본과 동시) — 개수만 남으면
    // 마커가 어디를 가리키는지 읽을 수 없어 개수가 쓸모를 잃는다
    const merged = mobileClusterOverlay.mergeOverlappingMarkers(
      apartByPx(10, "DONG"),
      MERGE_ZOOM,
    );

    expect(merged).toHaveLength(1);
    expect(merged[0].name).toBe("부전2동");
    expect(merged[0].count).toBe(31 + 12);
    expect(merged[0].position).toEqual({ lat: 35.1579, lng: 129.0594 });
  });

  it("어떤 zoom·구성에서도 병합 후 count 총합이 입력 총합과 같다 (L8)", () => {
    const markers = mobileClusterOverlay.toRegionClusterMarkers(
      DONG_ITEMS,
      "DONG",
    );
    const total = markers.reduce((sum, marker) => sum + marker.count, 0);

    for (let zoom = 6; zoom <= 21; zoom++) {
      const merged = mobileClusterOverlay.mergeOverlappingMarkers(
        markers,
        zoom,
      );
      expect(merged.reduce((sum, marker) => sum + marker.count, 0)).toBe(total);
    }
  });

  it("동(68px)은 80px 거리에서 분리되고 시(92px)는 90px 거리에서 병합된다 — 최대 지름 일괄 임계가 아니다 (L9)", () => {
    expect(
      mobileClusterOverlay.mergeOverlappingMarkers(
        apartByPx(80, "DONG"),
        MERGE_ZOOM,
      ),
    ).toHaveLength(2);
    expect(
      mobileClusterOverlay.mergeOverlappingMarkers(
        apartByPx(90, "SIDO"),
        MERGE_ZOOM,
      ),
    ).toHaveLength(1);
  });
});
