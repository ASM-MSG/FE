import { describe, expect, it } from "vitest";
import type { CollectedGrid } from "../../../entities/dex/model/dex";
import {
  deriveRecentRegions,
  excludeRemovedRegions,
  limitRecentRegions,
  RECENT_REGION_LIMIT,
} from "./recent-regions";

const grid = (
  gridId: string,
  regionName: string | null,
  lastUploadedAt: string,
  videoCount: number,
): CollectedGrid => ({
  gridId,
  gridY: 39064,
  gridX: 112221,
  lastUploadedAt,
  videoCount,
  regionName,
  zoneName: null,
  zoneCell: null,
});

/**
 * L1: `deriveRecentRegions(grids)`가 수집 격자를 `regionName`으로 묶어
 * `{regionName, gridCount, videoCount, lastUploadedAt, sampleGridId}` 목록을 만든다 —
 * 격자 수·영상 수는 동별 합계, 정렬은 `max(lastUploadedAt)` 내림차순 후 동명 오름차순,
 * `sampleGridId`는 그 동에서 가장 최근 업로드된 격자(by-grid 조인 입력).
 */
describe("deriveRecentRegions — 수집 격자 동 단위 묶음 (L1)", () => {
  it("같은 동의 격자 수·영상 수를 합산한다 (L1)", () => {
    const grids = [
      grid(
        "1_1",
        "부산광역시 부산진구 부전2동",
        "2026-08-18T10:00:00+09:00",
        3,
      ),
      grid(
        "1_2",
        "부산광역시 부산진구 부전2동",
        "2026-08-19T09:00:00+09:00",
        4,
      ),
    ];

    const [region] = deriveRecentRegions(grids);

    expect(region.gridCount).toBe(2);
    expect(region.videoCount).toBe(7);
  });

  it("정렬은 동별 최신 업로드 내림차순, 동률이면 동 이름 오름차순이다 (L1)", () => {
    const grids = [
      grid("1_1", "가동", "2026-08-10T10:00:00+09:00", 1),
      grid("1_2", "나동", "2026-08-19T10:00:00+09:00", 1),
      grid("1_3", "다동", "2026-08-10T10:00:00+09:00", 1),
    ];

    const names = deriveRecentRegions(grids).map((r) => r.regionName);

    expect(names).toEqual(["나동", "가동", "다동"]);
  });

  it("sampleGridId·lastUploadedAt은 그 동에서 가장 최근 업로드된 격자의 것이다 (L1)", () => {
    const grids = [
      grid("older", "부전2동", "2026-08-17T10:00:00+09:00", 1),
      grid("newest", "부전2동", "2026-08-19T10:00:00+09:00", 1),
      grid("middle", "부전2동", "2026-08-18T10:00:00+09:00", 1),
    ];

    const [region] = deriveRecentRegions(grids);

    expect(region.sampleGridId).toBe("newest");
    expect(region.lastUploadedAt).toBe("2026-08-19T10:00:00+09:00");
  });

  it("빈 입력은 빈 목록이다 (L1 경계)", () => {
    expect(deriveRecentRegions([])).toEqual([]);
  });
});

/**
 * L2: `regionName === null`인 격자(무귀속·미판정)는 동 목록에서 제외된다.
 * 제외돼도 통계 타일 입력값(summary)에는 영향이 없다 — summary는 서버 집계라
 * 이 파생을 입력으로 받지 않는다(구조적 보장).
 */
describe("deriveRecentRegions — 행정동 미판정 격자 제외 (L2)", () => {
  it("regionName이 null인 격자는 동 목록에 나타나지 않는다 (L2)", () => {
    const grids = [
      grid("1_1", null, "2026-08-19T10:00:00+09:00", 5),
      grid("1_2", "부전2동", "2026-08-18T10:00:00+09:00", 2),
    ];

    const regions = deriveRecentRegions(grids);

    expect(regions).toHaveLength(1);
    expect(regions[0].regionName).toBe("부전2동");
    expect(regions[0].videoCount).toBe(2);
  });

  it("모든 격자가 미판정이면 빈 목록이다 (L2 경계)", () => {
    const grids = [grid("1_1", null, "2026-08-19T10:00:00+09:00", 5)];

    expect(deriveRecentRegions(grids)).toEqual([]);
  });
});

const region = (name: string) => ({
  regionName: name,
  gridCount: 1,
  videoCount: 1,
  lastUploadedAt: "2026-08-19T10:00:00+09:00",
  sampleGridId: `${name}-grid`,
});

/**
 * L3: `limitRecentRegions(regions)`가 상위 20개만 남긴다 — 21개 입력 시 길이 20,
 * 20개 이하 입력은 원본 그대로(새 배열 반환). 잘라내기는 정렬·감춤 **이후**에
 * 적용된다 (승인 Q5 — 감춤 후 20개).
 */
describe("limitRecentRegions — 동 목록 20개 상한 (L3)", () => {
  it("상한은 20이다 (L3)", () => {
    expect(RECENT_REGION_LIMIT).toBe(20);
  });

  it("21개를 넣으면 앞에서부터 20개만 남는다 (L3)", () => {
    const regions = Array.from({ length: 21 }, (_, i) =>
      region(`동${String(i).padStart(2, "0")}`),
    );

    const limited = limitRecentRegions(regions);

    expect(limited).toHaveLength(20);
    expect(limited[19].regionName).toBe("동19");
  });

  it("20개 이하 입력은 내용이 원본과 같고 새 배열로 반환된다 (L3 경계)", () => {
    const regions = [region("가동"), region("나동")];

    const limited = limitRecentRegions(regions);

    expect(limited).toEqual(regions);
    expect(limited).not.toBe(regions);
  });
});

/**
 * L4: `excludeRemovedRegions(regions, removedNames)`가 X로 감춘 동만 목록에서 뺀다 —
 * 원본 배열 불변, 감춤 목록이 비면 동일 결과. 감춤은 표시 전용 상태이고
 * 통계 카드·지도 표시는 이 결과를 입력받지 않는다(수집 취소가 아니다).
 */
describe("excludeRemovedRegions — X 감춤 적용 (L4)", () => {
  it("감춤 목록에 있는 동만 빠진다 (L4)", () => {
    const regions = [region("가동"), region("나동"), region("다동")];

    const visible = excludeRemovedRegions(regions, ["나동"]);

    expect(visible.map((r) => r.regionName)).toEqual(["가동", "다동"]);
  });

  it("감춤 목록이 비면 전체가 그대로 남는다 (L4 경계)", () => {
    const regions = [region("가동"), region("나동")];

    expect(excludeRemovedRegions(regions, [])).toEqual(regions);
  });

  it("원본 배열은 변형되지 않는다 (L4)", () => {
    const regions = [region("가동"), region("나동")];

    excludeRemovedRegions(regions, ["가동"]);

    expect(regions.map((r) => r.regionName)).toEqual(["가동", "나동"]);
  });
});
