import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { GRID_MIN_ZOOM } from "@/features/map-home/model/grid-overlay";
import { MAP_FOCUS_PARAM, parseMapFocusParam } from "@/shared/map-focus-link";

/**
 * focus 딥링크 진입 (MSG-554 AC 6) — `/?focus=lat,lng`로 들어오면 그 좌표로 1회 이동한다.
 * 관리자 콘솔의 "지도에서 보기"가 새 탭으로 여는 경로이며, 파라미터가 없거나 형식이
 * 잘못되면 아무 것도 하지 않아 기존 진입 동작이 그대로 유지된다(회귀 0).
 *
 * 줌은 `GRID_MIN_ZOOM` — 그 미만에서는 격자·행사 셀이 저줌 게이트에 걷혀 "노출된 지도"를
 * 확인할 수 없다. 이동은 진입당 1회로 제한한다(이후 사용자의 지도 조작을 되돌리지 않는다).
 *
 * **뷰-레이어 훅** — 라우터(`useSearchParams`)를 직접 참조한다. RN 재사용 대상이 아니고
 * 좌표 해석은 플랫폼 중립 순수 함수(`shared/map-focus-link`)가 소유한다.
 */
export const useMapFocusEntry = (commands: {
  moveTo: (coords: { lat: number; lng: number }) => void;
  zoomTo: (zoom: number) => void;
}): void => {
  const [searchParams] = useSearchParams();
  const focus = searchParams.get(MAP_FOCUS_PARAM);
  const { moveTo, zoomTo } = commands;
  const appliedRef = useRef(false);

  useEffect(() => {
    if (appliedRef.current) return;
    const target = parseMapFocusParam(focus);
    if (target === null) return;

    appliedRef.current = true;
    moveTo(target);
    zoomTo(GRID_MIN_ZOOM);
  }, [focus, moveTo, zoomTo]);
};
