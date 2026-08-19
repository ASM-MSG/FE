import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Text, View } from "react-native";
import {
  NaverMapMarkerOverlay,
  NaverMapPolygonOverlay,
  NaverMapPolylineOverlay,
  NaverMapView,
  type NaverMapViewRef,
} from "@mj-studio/react-native-naver-map";
import { semantic } from "@fillmap/design-tokens";
import {
  cellBoundsAt,
  cellIndexAt,
  type Bounds,
  type GridCellIndex,
  type LatLng,
} from "../../../entities/cell/model/grid";
import { cellIdFor } from "../../../entities/cell/model/cell-id";
import { buildDashedRectOutline } from "../model/dashed-outline";
import { buildHatchSegments } from "../model/hatch-pattern";
import { buildVisibleCells, type VisibleCell } from "../model/visible-grid";
import type { Viewport } from "../model/viewport";
import type { RouteWaypoint } from "../model/mock-theme-data";

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

/** 내 점령 셀 (MSG-298 AC 6, 확정 8) — Figma 테마 프레임 실측: 채움 18% + 외곽선 40%/1px */
const OCCUPIED_FILL_COLOR = `${semantic.primary}2E`;
const OCCUPIED_OUTLINE_COLOR = `${semantic.primary}66`;

/** 테마 셀 (MSG-298 AC 7) — 테마 원색에 붙일 알파: 채움 18%·외곽선 45%. 폭 1.5px */
const THEME_FILL_ALPHA = "2E";
const THEME_OUTLINE_ALPHA = "73";
const THEME_OUTLINE_WIDTH = 1.5;

/** 교집합 빗금 (MSG-298 AC 9) — 테마 원색 실선 세그먼트 */
const HATCH_LINE_WIDTH = 2;

/** 추천 경로 (MSG-298 AC 10) — Figma 14094:5417/5419: 폴리라인 4px + 28px 번호 마커 */
const ROUTE_LINE_WIDTH = 4;
const ROUTE_MARKER_SIZE = 28;

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
  /** 내 점령 셀 — primary 채움 상시 표시 (MSG-298 AC 6). 교집합 셀도 포함해 넘긴다 */
  occupiedCells?: GridCellIndex[];
  /** 테마 전용 셀 — themeColor 채움 (MSG-298 AC 7). 파생(3분류)은 theme-cells.ts가 담당 */
  themeCells?: GridCellIndex[];
  /** 테마 원색 hex — themeCells·hatchCells·route에 공통 적용 */
  themeColor?: string;
  /** 교집합(테마 ∩ 점령) 셀 — 테마 색 빗금 추가 (MSG-298 AC 9) */
  hatchCells?: GridCellIndex[];
  /** 추천 경로 — 폴리라인 좌표 + 번호 웨이포인트 (MSG-298 AC 10, 경로추천 테마 전용) */
  route?: { path: LatLng[]; waypoints: RouteWaypoint[] };
  /**
   * 카메라 **이동 종료** 시 현재 뷰포트 통지 (MSG-423 요구 5) — 조회 재발사 트리거다.
   * SDK의 `onCameraIdle`에 물린다: 제스처가 완전히 끝나야 발화하므로 드래그·줌 중에는
   * 매 프레임 나가지 않는다(스펙의 500ms 디바운스 대안 — 라이브러리 idle 이벤트 우선).
   * 남은 버스트 억제는 역지오코딩 훅의 디바운스가 백업으로 맡는다.
   */
  onViewportChange?: (viewport: Viewport) => void;
}

/** 셀 bounds → 폴리곤 꼭짓점 4점 (sw → se → ne → nw) */
const rectCoords = (bounds: Bounds) => [
  { latitude: bounds.sw.lat, longitude: bounds.sw.lng },
  { latitude: bounds.sw.lat, longitude: bounds.ne.lng },
  { latitude: bounds.ne.lat, longitude: bounds.ne.lng },
  { latitude: bounds.ne.lat, longitude: bounds.sw.lng },
];

const cellKey = ({ col, row }: GridCellIndex) => `${col}:${row}`;

/** SDK Region(남서 꼭짓점 + delta) → 플랫폼 중립 Bounds */
const boundsOf = (region: {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}): Bounds => ({
  sw: { lat: region.latitude, lng: region.longitude },
  ne: {
    lat: region.latitude + region.latitudeDelta,
    lng: region.longitude + region.longitudeDelta,
  },
});

/** SDK 카메라 이벤트 → 화면이 소유하는 뷰포트 (MSG-423 요구 5) */
const toViewport = (
  camera: {
    latitude: number;
    longitude: number;
    zoom?: number;
    region: Parameters<typeof boundsOf>[0];
  },
  fallbackZoom: number,
): Viewport => ({
  center: { lat: camera.latitude, lng: camera.longitude },
  zoom: camera.zoom ?? fallbackZoom,
  bounds: boundsOf(camera.region),
});

/**
 * 네이버 실지도 + 100m 격자 오버레이 (AC 6·8·13).
 * 카메라가 움직일 때마다 SDK region(뷰포트)으로 보이는 셀을 다시 파생해
 * 폴리곤 오버레이로 그린다 — 이동 시 격자가 새 뷰포트를 덮도록 갱신 (AC 6).
 * MSG-298: 내 점령·테마·교집합 셀은 인덱스 고정이라 카메라와 무관하게 그린다 —
 * SDK가 지리 좌표로 그리므로 이동·줌에도 셀 위치에 고정된다 (AC 6).
 */
export const GridMap = forwardRef<GridMapRef, GridMapProps>(function GridMap(
  {
    initialCenter,
    initialZoom = DEFAULT_ZOOM,
    showCellGrid = true,
    showZoomControls = true,
    onCellTap,
    highlightCell,
    occupiedCells,
    themeCells,
    themeColor,
    hatchCells,
    route,
    onViewportChange,
  },
  ref,
) {
  const mapRef = useRef<NaverMapViewRef>(null);
  const [cells, setCells] = useState<VisibleCell[]>([]);
  /**
   * 최초 뷰포트 씨딩 여부 — `onCameraIdle`은 "카메라가 **움직인 뒤** 멈출 때" 발화라
   * 사용자가 지도를 건드리지 않으면 영영 오지 않는다. 진입 직후에도 조회가 나가야 하므로
   * 첫 `onCameraChanged` 한 번만 뷰포트를 올리고, 이후 갱신은 전부 idle이 맡는다
   * (드래그 중 매 프레임 발사 방지 — 요구 5).
   */
  const viewportSeededRef = useRef(false);

  const highlight = useMemo(() => {
    if (!highlightCell) return null;
    const bounds = cellBoundsAt(highlightCell);
    return {
      fillCoords: rectCoords(bounds),
      dashes: buildDashedRectOutline(bounds),
    };
  }, [highlightCell]);

  const occupiedPolygons = useMemo(
    () =>
      (occupiedCells ?? []).map((cell) => ({
        key: cellKey(cell),
        coords: rectCoords(cellBoundsAt(cell)),
      })),
    [occupiedCells],
  );

  const themePolygons = useMemo(
    () =>
      (themeCells ?? []).map((cell) => ({
        key: cellKey(cell),
        coords: rectCoords(cellBoundsAt(cell)),
      })),
    [themeCells],
  );

  /** 교집합 셀 빗금 — 셀마다 대각선 세그먼트를 폴리라인으로 (hatch-pattern.ts 파생) */
  const hatchLines = useMemo(
    () =>
      (hatchCells ?? []).flatMap((cell) =>
        buildHatchSegments(cellBoundsAt(cell)).map((segment, i) => ({
          key: `${cellKey(cell)}:${i}`,
          segment,
        })),
      ),
    [hatchCells],
  );

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
      onCameraChanged={(camera) => {
        if (showCellGrid) {
          setCells(
            buildVisibleCells(
              boundsOf(camera.region),
              camera.zoom ?? initialZoom,
            ),
          );
        }
        if (onViewportChange && !viewportSeededRef.current) {
          viewportSeededRef.current = true;
          onViewportChange(toViewport(camera, initialZoom));
        }
      }}
      onCameraIdle={
        onViewportChange
          ? (camera) => onViewportChange(toViewport(camera, initialZoom))
          : undefined
      }
      onTapMap={
        onCellTap
          ? ({ latitude, longitude }) => {
              const index = cellIndexAt({ lat: latitude, lng: longitude });
              onCellTap(cellIdFor(index), index);
            }
          : undefined
      }
    >
      {/* key 네임스페이스: cells·occupied·theme가 같은 "col:row" 셀 키를 쓰는 형제 목록이라
          접두사 없이는 동일 key 충돌 (점령 셀은 기본 뷰포트 안이라 상시 겹침) */}
      {cells.map((cell) => (
        <NaverMapPolygonOverlay
          key={`grid:${cell.id}`}
          coords={rectCoords(cell.bounds)}
          color={CELL_FILL_COLOR}
          outlineColor={CELL_OUTLINE_COLOR}
          outlineWidth={1}
        />
      ))}
      {/* 내 점령 셀 — 기본 상태에도 상시 primary 채움 (AC 6, 확정 8) */}
      {occupiedPolygons.map(({ key, coords }) => (
        <NaverMapPolygonOverlay
          key={`occupied:${key}`}
          coords={coords}
          color={OCCUPIED_FILL_COLOR}
          outlineColor={OCCUPIED_OUTLINE_COLOR}
          outlineWidth={1}
        />
      ))}
      {/* 테마 전용 셀 — 테마 색 강조 (AC 7) */}
      {themeColor &&
        themePolygons.map(({ key, coords }) => (
          <NaverMapPolygonOverlay
            key={`theme:${key}`}
            coords={coords}
            color={`${themeColor}${THEME_FILL_ALPHA}`}
            outlineColor={`${themeColor}${THEME_OUTLINE_ALPHA}`}
            outlineWidth={THEME_OUTLINE_WIDTH}
          />
        ))}
      {/* 교집합 셀 빗금 — primary 채움(occupiedCells에 포함) 위에 테마 색 대각선 (AC 9) */}
      {themeColor &&
        hatchLines.map(({ key, segment: [from, to] }) => (
          <NaverMapPolylineOverlay
            key={`hatch:${key}`}
            coords={[
              { latitude: from.lat, longitude: from.lng },
              { latitude: to.lat, longitude: to.lng },
            ]}
            color={themeColor}
            width={HATCH_LINE_WIDTH}
          />
        ))}
      {/* 추천 경로 폴리라인 + 번호 웨이포인트 마커 (AC 10 — 경로추천 선택 시에만 전달됨) */}
      {themeColor && route && route.path.length >= 2 && (
        <NaverMapPolylineOverlay
          coords={route.path.map(({ lat, lng }) => ({
            latitude: lat,
            longitude: lng,
          }))}
          color={themeColor}
          width={ROUTE_LINE_WIDTH}
        />
      )}
      {themeColor &&
        route?.waypoints.map(({ seq, coord }) => (
          <NaverMapMarkerOverlay
            key={seq}
            latitude={coord.lat}
            longitude={coord.lng}
            width={ROUTE_MARKER_SIZE}
            height={ROUTE_MARKER_SIZE}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            {/* 커스텀 뷰 마커 — Figma 14094:5419: 테마 색 원 + 흰 테두리 2px + 흰 번호.
                네이티브 마커 서브뷰라 nativewind 클래스 대신 토큰 값을 style로 직접 주입,
                Android 서브뷰 평탄화 방지로 collapsable={false} (스펙 리스크 1 — 실패 시
                caption 텍스트 폴백 예정) */}
            <View
              collapsable={false}
              style={{
                width: ROUTE_MARKER_SIZE,
                height: ROUTE_MARKER_SIZE,
                borderRadius: ROUTE_MARKER_SIZE / 2,
                backgroundColor: themeColor,
                borderWidth: 2,
                borderColor: semantic.onPrimary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: semantic.onPrimary,
                  fontSize: 14,
                  fontWeight: "600",
                }}
              >
                {seq}
              </Text>
            </View>
          </NaverMapMarkerOverlay>
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
