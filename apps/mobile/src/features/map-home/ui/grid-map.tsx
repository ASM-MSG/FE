import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  NaverMapPolygonOverlay,
  NaverMapPolylineOverlay,
  NaverMapView,
  type NaverMapViewRef,
} from "@mj-studio/react-native-naver-map";
import { semantic } from "@fillmap/design-tokens";
import {
  cellBoundsAt,
  cellIndexAt,
  type GridCellIndex,
  type LatLng,
} from "../../../entities/cell/model/grid";
import { cellIdFor } from "../../../entities/cell/model/cell-id";
import { buildDashedRectOutline } from "../model/dashed-outline";
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

/** 선택 격자 강조 (MSG-296 AC 2) — Figma 14094:4194: primary 15% 채움 + primary 점선 2px */
const HIGHLIGHT_FILL_COLOR = `${semantic.primary}26`;
const HIGHLIGHT_OUTLINE_WIDTH = 2;

export interface GridMapRef {
  /** 카메라를 해당 좌표로 애니메이션 이동 — 내 위치 버튼 (AC 8) */
  moveTo: (center: LatLng) => void;
}

interface GridMapProps {
  initialCenter: LatLng;
  initialZoom?: number;
  /** 격자 전체 오버레이 표시 여부 (기본 true) — 상세 지도는 선택 격자만 표시 (MSG-296 추정 5) */
  showCellGrid?: boolean;
  /** SDK 기본 줌 컨트롤(+/−) 표시 여부 (기본 true — 홈 불변). 상세 지도는 Figma에 없어 숨긴다 (MSG-296 검증 재작업 2, 핀치 줌은 유지) */
  showZoomControls?: boolean;
  /** 격자 셀 탭 (MSG-296 AC 1) — 탭 좌표 → cellIndexAt → 인코딩 셀 id */
  onCellTap?: (cellId: string, index: GridCellIndex) => void;
  /**
   * 점선 강조할 셀 (MSG-296 AC 2) — 폴리곤 outline이 점선 미지원이고 폴리라인
   * pattern prop은 v2.9.0에서 네이티브로 전달되지 않아 dash 세그먼트 폴리라인으로 그린다.
   */
  highlightCell?: GridCellIndex;
}

/**
 * 네이버 실지도 + 100m 격자 오버레이 (AC 6·8·13).
 * 카메라가 움직일 때마다 SDK region(뷰포트)으로 보이는 셀을 다시 파생해
 * 폴리곤 오버레이로 그린다 — 이동 시 격자가 새 뷰포트를 덮도록 갱신 (AC 6).
 */
export const GridMap = forwardRef<GridMapRef, GridMapProps>(function GridMap(
  {
    initialCenter,
    initialZoom = DEFAULT_ZOOM,
    showCellGrid = true,
    showZoomControls = true,
    onCellTap,
    highlightCell,
  },
  ref,
) {
  const mapRef = useRef<NaverMapViewRef>(null);
  const [cells, setCells] = useState<VisibleCell[]>([]);

  const highlight = useMemo(() => {
    if (!highlightCell) return null;
    const bounds = cellBoundsAt(highlightCell);
    return {
      fillCoords: [
        { latitude: bounds.sw.lat, longitude: bounds.sw.lng },
        { latitude: bounds.sw.lat, longitude: bounds.ne.lng },
        { latitude: bounds.ne.lat, longitude: bounds.ne.lng },
        { latitude: bounds.ne.lat, longitude: bounds.sw.lng },
      ],
      dashes: buildDashedRectOutline(bounds),
    };
  }, [highlightCell]);

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
      isShowZoomControls={showZoomControls}
      onCameraChanged={({ zoom, region }) => {
        if (!showCellGrid) return;
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
      onTapMap={
        onCellTap
          ? ({ latitude, longitude }) => {
              const index = cellIndexAt({ lat: latitude, lng: longitude });
              onCellTap(cellIdFor(index), index);
            }
          : undefined
      }
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
      {highlight && (
        <>
          <NaverMapPolygonOverlay
            coords={highlight.fillCoords}
            color={HIGHLIGHT_FILL_COLOR}
          />
          {highlight.dashes.map(([from, to]) => (
            <NaverMapPolylineOverlay
              key={`${from.lat},${from.lng}:${to.lat},${to.lng}`}
              coords={[
                { latitude: from.lat, longitude: from.lng },
                { latitude: to.lat, longitude: to.lng },
              ]}
              color={semantic.primary}
              width={HIGHLIGHT_OUTLINE_WIDTH}
            />
          ))}
        </>
      )}
    </NaverMapView>
  );
});
