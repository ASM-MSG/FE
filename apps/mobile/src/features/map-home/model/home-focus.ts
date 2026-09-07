import {
  cellIndexAt,
  type Bounds,
  type GridCellIndex,
  type LatLng,
} from "../../../entities/cell/model/grid";
import {
  cellCenterAt,
  decodeGridIndex,
} from "../../../entities/cell/model/grid-5179";

/**
 * 검색 복귀 카메라 목적지 (MSG-578 D1) — 검색 화면이 `/home?lat&lng&gridId&bounds&ts`로
 * 보내고 홈이 파싱한다. MSG-297의 `lat,lng` 배선을 확장한 것이며 NaN·범위 가드는
 * 기존 홈 effect에서 여기로 이관했다. 순수 함수 — 라우터·SDK를 모른다.
 *
 * 키 우선순위는 gridId > bounds > point. expo-router가 같은 `/home` 인스턴스의 params를
 * 병합해 이전 복귀 키가 남을 수 있어(스펙 리스크), 빌더 `homeFocusParams`는 **매번 5키를
 * 전부** 싣고(미사용은 빈 문자열) 파서는 빈 문자열을 부재로 본다.
 */
export interface HomeFocusParams {
  lat?: string;
  lng?: string;
  /** 서버 격자 id `"{gridY}_{gridX}"` — 격자 검색 결과 */
  gridId?: string;
  /** `"swLat,swLng,neLat,neLng"` — 구역 검색 결과 */
  bounds?: string;
}

export type HomeFocus =
  | { kind: "point"; center: LatLng }
  | { kind: "grid"; gridId: string; center: LatLng; cell: GridCellIndex }
  | { kind: "bounds"; bounds: Bounds };

/** 검색 화면이 넘기는 타깃 — 격자는 id만, 중심·셀은 홈이 파생한다 (실측 ⑤ 관례) */
export type HomeFocusTarget =
  | { kind: "point"; center: LatLng }
  | { kind: "grid"; gridId: string }
  | { kind: "bounds"; bounds: Bounds };

const GRID_ID = /^\d+_\d+$/;

/** 딥링크로 훼손된 값이 올 수 있다 — 유한하고 좌표 범위 안일 때만 통과 */
const latLngOf = (lat: string, lng: string): LatLng | null => {
  const point = { lat: Number(lat), lng: Number(lng) };
  if (!Number.isFinite(point.lat) || Math.abs(point.lat) > 90) return null;
  if (!Number.isFinite(point.lng) || Math.abs(point.lng) > 180) return null;
  return point;
};

export const parseHomeFocus = ({
  lat,
  lng,
  gridId,
  bounds,
}: HomeFocusParams): HomeFocus | null => {
  if (gridId) {
    if (!GRID_ID.test(gridId)) return null;
    const center = cellCenterAt(decodeGridIndex(gridId));
    return { kind: "grid", gridId, center, cell: cellIndexAt(center) };
  }
  if (bounds) {
    const parts = bounds.split(",");
    if (parts.length !== 4) return null;
    const sw = latLngOf(parts[0], parts[1]);
    const ne = latLngOf(parts[2], parts[3]);
    return sw && ne ? { kind: "bounds", bounds: { sw, ne } } : null;
  }
  if (lat && lng) {
    const center = latLngOf(lat, lng);
    return center ? { kind: "point", center } : null;
  }
  return null;
};

/** `router.navigate({ pathname: "/home", params })`용 — ts는 요청 식별자(같은 목적지 연속 선택도 재발화) */
export const homeFocusParams = (
  target: HomeFocusTarget,
  ts: number,
): Record<"lat" | "lng" | "gridId" | "bounds" | "ts", string> => ({
  lat: target.kind === "point" ? String(target.center.lat) : "",
  lng: target.kind === "point" ? String(target.center.lng) : "",
  gridId: target.kind === "grid" ? target.gridId : "",
  bounds:
    target.kind === "bounds"
      ? [
          target.bounds.sw.lat,
          target.bounds.sw.lng,
          target.bounds.ne.lat,
          target.bounds.ne.lng,
        ].join(",")
      : "",
  ts: String(ts),
});
