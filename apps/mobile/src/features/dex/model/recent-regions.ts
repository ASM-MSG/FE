import type {
  CollectedGrid,
  RecentRegion,
} from "../../../entities/dex/model/dex";

/**
 * "최근 수집한 격자" 동 단위 파생 (MSG-425 L1~L4) — 웹 `features/dex/model/recent-regions.ts`
 * 포팅 + 모바일 고유 20개 상한. 순수 함수 — RN·플랫폼 API에 의존하지 않는다.
 * 앞 두 함수의 동등성은 `recent-regions.parity.test.ts`가 고정한다.
 *
 * 백엔드는 격자 단위(`GET /api/collections/grids`)만 주고 동 단위 집계 엔드포인트가 없어
 * 프론트가 묶는다. regionCode도 응답에 없어 묶음 키는 regionName이고, 동 클릭 시 필요한
 * regionCode는 대표 격자 id로 `by-grid`를 조회해 얻는다.
 */

/**
 * 수집 격자를 행정동으로 묶어 최근 수집순 목록을 만든다. [L1·L2]
 * - 격자 수·영상 수는 동별 합계
 * - 정렬 키는 그 동의 `max(lastUploadedAt)` 내림차순, 동률이면 동 이름 오름차순
 * - 대표 격자(sampleGridId)는 그 동에서 가장 최근 업로드된 격자 — by-grid 조회 입력
 * - regionName이 null인 격자(무귀속·미판정)는 동을 특정할 수 없어 제외한다
 */
export const deriveRecentRegions = (grids: CollectedGrid[]): RecentRegion[] => {
  const byRegion = new Map<string, RecentRegion>();

  for (const grid of grids) {
    if (grid.regionName === null) continue;

    const prev = byRegion.get(grid.regionName);
    if (!prev) {
      byRegion.set(grid.regionName, {
        regionName: grid.regionName,
        gridCount: 1,
        videoCount: grid.videoCount,
        lastUploadedAt: grid.lastUploadedAt,
        sampleGridId: grid.gridId,
      });
      continue;
    }

    const newer = grid.lastUploadedAt > prev.lastUploadedAt;
    byRegion.set(grid.regionName, {
      regionName: prev.regionName,
      gridCount: prev.gridCount + 1,
      videoCount: prev.videoCount + grid.videoCount,
      lastUploadedAt: newer ? grid.lastUploadedAt : prev.lastUploadedAt,
      sampleGridId: newer ? grid.gridId : prev.sampleGridId,
    });
  }

  return [...byRegion.values()].sort(
    (a, b) =>
      b.lastUploadedAt.localeCompare(a.lastUploadedAt) ||
      a.regionName.localeCompare(b.regionName),
  );
};

/**
 * X로 감춘 동을 표시 목록에서 뺀다. [L4]
 * 파생 "이후"에 적용한다 — 감춤은 표시 전용 상태이고 통계 타일·지도 표시는 이 결과를
 * 입력받지 않는다(수집 취소가 아니다). 서버 삭제 API를 호출하지 않는다.
 */
export const excludeRemovedRegions = (
  regions: RecentRegion[],
  removedRegionNames: string[],
): RecentRegion[] => {
  // filter 안의 includes는 매 행마다 전체 스캔이 된다 — Set 1회 구성으로 상수 조회
  const removed = new Set(removedRegionNames);
  return regions.filter((r) => !removed.has(r.regionName));
};

/** 동 목록 표시 상한 — 티켓 요구 ③ "최근 수집 순으로 최대 20개까지" */
export const RECENT_REGION_LIMIT = 20;

/**
 * 동 목록을 상위 20개로 자른다. [L3]
 * 적용 순서는 `deriveRecentRegions` → `excludeRemovedRegions` → 이 함수다 —
 * 감춘 만큼 아래 동이 올라와야 "최대 20개까지 보인다"는 문면에 맞다 (승인 Q5).
 * 웹에는 대응 함수가 없다(388px 패널이 전량 스크롤) — 모바일 고유.
 */
export const limitRecentRegions = (regions: RecentRegion[]): RecentRegion[] =>
  regions.slice(0, RECENT_REGION_LIMIT);
