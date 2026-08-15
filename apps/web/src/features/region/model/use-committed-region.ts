import { useEffect } from "react";
import { useAuthStore } from "@/features/auth/model/auth-store";
import { useViewportStore } from "@/features/map-home/model/viewport-store";
import { useRegionPanelStore } from "./region-panel-store";
import { useReverseGeocodeQuery } from "./use-reverse-geocode-query";

/**
 * 확정 지역·확정 영역 최초 채택 (MSG-403 AC 9).
 * 뷰-레이어 훅이 아니라 model 훅이다 — 라우터·지도 SDK를 참조하지 않는다(RN 경계).
 *
 * 셸이 마운트한다: 확정 영역이 지도 데이터 조회 전체(핫구역·점령 격자·미션)의 bbox라
 * 홈 좌측 패널에서만 채택하면 패널이 접혔거나 도감·프로필에 있을 때 지도가 텅 빈다.
 * 최초 1회만 — 이후 갱신은 "장소 불러오기"·전체 보기·칩 활성화가 명시적으로 한다.
 */
export const useCommittedRegionBootstrap = (): void => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const center = useViewportStore((s) => s.center);
  const bounds = useViewportStore((s) => s.bounds);
  const displayedRegion = useRegionPanelStore((s) => s.displayedRegion);
  const commit = useRegionPanelStore((s) => s.commit);

  const reverse = useReverseGeocodeQuery(isAuthenticated ? center : null);
  const region = reverse.region;

  useEffect(() => {
    // 행정동 밖(바다 등)이면 채택하지 않는다 — 격자 조회도 하지 않는다 (MSG-328 AC 12)
    if (displayedRegion !== null || region === null || bounds === null) return;
    commit(
      { regionCode: region.regionCode, regionName: region.regionName },
      bounds,
    );
  }, [displayedRegion, region, bounds, commit]);
};
