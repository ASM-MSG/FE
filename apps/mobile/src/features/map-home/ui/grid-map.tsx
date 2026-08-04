import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import {
  NaverMapPolygonOverlay,
  NaverMapView,
  type NaverMapViewRef,
} from "@mj-studio/react-native-naver-map";
import { semantic } from "@fillmap/design-tokens";
import type { LatLng } from "../../../entities/cell/model/grid";
import { buildVisibleCells, type VisibleCell } from "../model/visible-grid";

/**
 * 지도 SDK 격리 경계 — @mj-studio/react-native-naver-map 참조는 이 파일 안에서만 한다
 * (지도 격리 규칙의 모바일 대응 — 웹 MapCanvas·naver-sdk-loader와 동일 역할).
 * 격자 셀 파생은 visible-grid.ts(순수 함수)가 하고, 여기는 렌더와 카메라만 다룬다.
 * 줌 값은 네이버 의미 체계(클수록 확대, 6~21)가 정본.
 */

/** 지도 홈 기본 줌 — 100m 격자가 동네 스케일로 십수 개 보이는 수준 (AC 6) */
export const DEFAULT_ZOOM = 16;

/** 격자 셀 테두리/채움 — 시맨틱 primary + 알파 (SDK color prop은 hex 문자열만 받는다) */
const CELL_OUTLINE_COLOR = `${semantic.primary}80`;
const CELL_FILL_COLOR = `${semantic.primary}0D`;

export interface GridMapRef {
  /** 카메라를 해당 좌표로 애니메이션 이동 — 내 위치 버튼 (AC 8) */
  moveTo: (center: LatLng) => void;
}

interface GridMapProps {
  initialCenter: LatLng;
  initialZoom?: number;
}

/**
 * 네이버 실지도 + 100m 격자 오버레이 (AC 6·8·13).
 * 카메라가 움직일 때마다 SDK region(뷰포트)으로 보이는 셀을 다시 파생해
 * 폴리곤 오버레이로 그린다 — 이동 시 격자가 새 뷰포트를 덮도록 갱신 (AC 6).
 */
export const GridMap = forwardRef<GridMapRef, GridMapProps>(function GridMap(
  { initialCenter, initialZoom = DEFAULT_ZOOM },
  ref,
) {
  const mapRef = useRef<NaverMapViewRef>(null);
  const [cells, setCells] = useState<VisibleCell[]>([]);

  useImperativeHandle(ref, () => ({
    moveTo: (center) => {
      mapRef.current?.animateCameraTo({
        latitude: center.lat,
        longitude: center.lng,
        zoom: initialZoom,
        duration: 500,
      });
    },
  }));

  return (
    <NaverMapView
      ref={mapRef}
      style={{ flex: 1 }}
      initialCamera={{
        latitude: initialCenter.lat,
        longitude: initialCenter.lng,
        zoom: initialZoom,
      }}
      onCameraChanged={({ zoom, region }) => {
        setCells(
          buildVisibleCells(
            {
              sw: { lat: region.latitude, lng: region.longitude },
              ne: {
                lat: region.latitude + region.latitudeDelta,
                lng: region.longitude + region.longitudeDelta,
              },
            },
            zoom ?? initialZoom,
          ),
        );
      }}
    >
      {cells.map((cell) => (
        <NaverMapPolygonOverlay
          key={cell.id}
          coords={[
            { latitude: cell.bounds.sw.lat, longitude: cell.bounds.sw.lng },
            { latitude: cell.bounds.sw.lat, longitude: cell.bounds.ne.lng },
            { latitude: cell.bounds.ne.lat, longitude: cell.bounds.ne.lng },
            { latitude: cell.bounds.ne.lat, longitude: cell.bounds.sw.lng },
          ]}
          color={CELL_FILL_COLOR}
          outlineColor={CELL_OUTLINE_COLOR}
          outlineWidth={1}
        />
      ))}
    </NaverMapView>
  );
});
