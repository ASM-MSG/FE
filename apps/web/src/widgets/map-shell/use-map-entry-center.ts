import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { LatLng } from "@/entities/cell";
import { SEOMYEON_CENTER, getCurrentPosition } from "@/shared/geolocation";
import { MAP_FOCUS_PARAM, parseMapFocusParam } from "@/shared/map-focus-link";

/**
 * 지도 진입 초기 중심 — 기본은 현재 위치(권한 거부·실패 시 서면 폴백)로, MapShell이
 * MapCanvas에 내리는 값이다.
 *
 * focus 딥링크 진입(MSG-554 AC 6)에서는 목적지가 이미 정해져 있으므로 위치 조회를
 * 아예 하지 않는다. 위치는 지도 준비보다 늦게 도착할 수 있고, 그때 나가는 진입 pan이
 * focus 이동을 덮어써 딥링크를 무력화한다(검증 리포트 AC 6 경합). focus가 없거나 형식이
 * 잘못되면 종전과 완전히 동일하다(회귀 0).
 *
 * **뷰-레이어 훅** — 라우터(`useSearchParams`)를 직접 참조한다. RN 재사용 대상이 아니고,
 * 좌표 해석은 플랫폼 중립 순수 함수(`shared/map-focus-link`)가, 위치 조회는 shared
 * 어댑터(`shared/geolocation`)가 소유한다.
 */
export const useMapEntryCenter = (): LatLng => {
  const [searchParams] = useSearchParams();
  const hasFocusEntry =
    parseMapFocusParam(searchParams.get(MAP_FOCUS_PARAM)) !== null;
  const [center, setCenter] = useState<LatLng>(SEOMYEON_CENTER);

  useEffect(() => {
    if (hasFocusEntry) return;
    let active = true;
    getCurrentPosition().then((coords) => {
      if (active) setCenter(coords);
    });
    return () => {
      active = false;
    };
  }, [hasFocusEntry]);

  return center;
};
