import { useEffect, useState } from "react";
import { getCurrentPosition } from "@/shared/geolocation";
import { lookupRegionName } from "@/shared/region-lookup";

/**
 * 도감 진입 시 1회 측위(A10) + 역지오코딩으로 현재 지역명을 얻는 조합 훅 (AC 6·22, 개정 D2).
 * 반환값은 조회 완료 전·실패 시 null — 해석(디폴트 "중구")은 resolveCurrentRegion이 담당한다.
 * 권한 거부 시 getCurrentPosition이 서울시청 좌표로 폴백하므로 역지오코딩해도 자연히 "중구"다(A13).
 * `watchPosition` 연속 추적은 mock 단계 과잉으로 미도입(A10).
 * 플랫폼 접근은 shared 어댑터(geolocation·region-lookup) 경유 — 라우터·전역 미참조(RN 경계).
 */
export const useCurrentRegionName = (): string | null => {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getCurrentPosition()
      .then((coords) => lookupRegionName(coords))
      .then((result) => {
        if (active && result) setName(result);
      });
    return () => {
      active = false;
    };
  }, []);

  return name;
};
