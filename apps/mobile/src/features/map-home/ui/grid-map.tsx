import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform, Text, View } from "react-native";
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
import type { RouteWaypoint } from "../model/route-overlay";
import { drillInZoomForUnit } from "../model/aggregation-unit";
import { gateOccupiedFill, isBelowGridZoom } from "../model/cluster-overlay";
import type { RegionClusterMarker } from "../model/region-cluster-overlay";
import { clusterBubbleSize } from "../model/cluster-bubble-size";
import { ClusterMarker } from "./cluster-marker";

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

/** 강조 셀 외곽선 (MSG-560 D3) — 웹 emphasized(진한 실선) 대응, 테마 셀보다 굵다 */
const ACCENT_OUTLINE_WIDTH = 2;
/** 교집합 빗금 (MSG-298 AC 9) — 테마 원색 실선 세그먼트 */
const HATCH_LINE_WIDTH = 2;

/** 코스 경로 (MSG-427 E14) — Figma 14094:5417/5419: 폴리라인 4px + 28px 번호 마커 */
const ROUTE_LINE_WIDTH = 4;
const ROUTE_MARKER_SIZE = 28;
/** 선택 경유지 강조 (MSG-556 D8) — 28→36 확대 + 흰 링 2→3 */
const ROUTE_MARKER_ACTIVE_SIZE = 36;
const ROUTE_MARKER_ACTIVE_RING = 3;

/** 선택 미션 이름표 마커 치수 (MSG-427 승인 Q4) — 한 줄 pill */
const MISSION_LABEL_WIDTH = 140;
const MISSION_LABEL_HEIGHT = 24;

export interface GridMapRef {
  /** 카메라를 해당 좌표로 애니메이션 이동 — 내 위치 버튼 (AC 8) */
  moveTo: (center: LatLng) => void;
  /** 줌은 그대로 두고 중심만 이동 — AI 추천 카드 탭 (MSG-556 D8, 웹 `moveTo` 대응) */
  panTo: (center: LatLng) => void;
}

interface GridMapProps {
  initialCenter: LatLng;
  initialZoom?: number;
  /** 격자 전체 오버레이 표시 여부 (기본 true) — 상세 지도는 선택 격자만 표시 (MSG-296 추정 5) */
  showCellGrid?: boolean;
  /** SDK 기본 줌 컨트롤(+/−) 표시 여부 (기본 true — 홈 불변). 상세 지도는 Figma에 없어 숨긴다 (MSG-296 검증 재작업 2, 핀치 줌은 유지) */
  showZoomControls?: boolean;
  /**
   * 카메라 줌 하한 (MSG-428 S6) — 핀치 아웃·SDK 줌 컨트롤 어느 쪽으로도 이보다 넓게
   * 나가지 못한다. **기본은 하한 없음**(SDK 기본): 하한은 집계 마커 사다리를 가진 지도
   * 홈만의 정책이라 여기 하드코딩하면 이 컴포넌트를 쓰는 다른 화면(격자 상세)까지
   * 따라간다. 주의: 같은 이름의 오버레이 prop(BaseOverlayProps.minZoom)은 오버레이 표시
   * 줌 범위지 카메라 제약이 아니다 — 하한은 반드시 NaverMapView에 건다.
   */
  minZoom?: number;
  /**
   * 지도 **타일 첫 표시** 완료 — 진입 스플래시 해제 신호 (MSG-445).
   *
   * SDK의 `onLoaded`(네이티브 `NaverMap.OnLoadListener`)에 물린다. `onInitialized`가
   * 아닌 이유는 실측이다: 초기화는 `getMapAsync` 콜백(지도 **객체** 생성)이라 타일보다
   * 1.5~2초 먼저 오고, 그 시점에 스플래시를 내리면 지도 자리가 빈 격자 플레이스홀더로
   * 남는다(2026-08-25 화면 녹화 프레임 분석). `onLoaded`는 래퍼 2.9.0이 노출하지 않아
   * `patches/@mj-studio__react-native-naver-map@2.9.0.patch`로 추가했다 — **패치는 현재
   * Android만 덮는다.** iOS에는 대응 네이티브 리스너가 없어 `onInitialized`로 폴백한다
   * (아래 렌더 참조). iOS도 타일 기준으로 맞추려면 래퍼 iOS 패치가 선행돼야 한다.
   */
  onReady?: () => void;
  /** 격자 셀 탭 (MSG-296 AC 1) — 탭 좌표 → cellIndexAt → 인코딩 셀 id */
  onCellTap?: (cellId: string, index: GridCellIndex) => void;
  /**
   * 점선 강조할 셀 (MSG-296 AC 2) — 폴리곤 outline이 점선 미지원이고 폴리라인
   * pattern prop은 v2.9.0에서 네이티브로 전달되지 않아 dash 세그먼트 폴리라인으로 그린다.
   */
  highlightCell?: GridCellIndex;
  /** 내 점령 셀 — primary 채움 상시 표시 (MSG-298 AC 6). 교집합 셀도 포함해 넘긴다 */
  occupiedCells?: GridCellIndex[];
  /**
   * 미션·핫구역 강조 셀 — themeColor 채움 (MSG-427 D9). 파생(뷰포트 클리핑 + 3분류)은
   * `mission.missionGridIdsInBounds` → `mission-cells`가 담당한다 — 이 컴포넌트는
   * 뷰포트 밖 셀을 받지 않는다 (F-12: 렌더 비용을 화면 크기에 묶는다).
   */
  themeCells?: GridCellIndex[];
  /** 테마 원색 hex — themeCells·hatchCells·route·missionLabel에 공통 적용 */
  themeColor?: string;
  /** 교집합(테마 ∩ 점령) 셀 — 테마 색 빗금 추가 (MSG-427 D9) */
  hatchCells?: GridCellIndex[];
  /**
   * 강조 셀 — `accentColor` 채움 + 굵은 외곽선 (MSG-560 D3). 테마 층 위에 얹는 두 번째 색
   * 층이다(행사 위치 상세가 열린 동안 그 위치 셀). 선택 1곳의 격자(실데이터 9칸)뿐이라
   * 테마 층과 달리 파생을 memo하지 않는다. 미지정 시 렌더 불변.
   */
  accentCells?: GridCellIndex[];
  /** 강조 원색 hex — `accentCells`와 같은 수명 (미지정이면 강조 층 미렌더) */
  accentColor?: string;
  /** 코스 경로 — 폴리라인 좌표 + 번호 경유지 마커 (MSG-427 E14, 경로추천 전용).
      `onWaypointTap`은 AI 추천의 마커→카드 선택 (MSG-556 D8) — 없으면 마커는 탭 불가 */
  route?: {
    path: LatLng[];
    waypoints: RouteWaypoint[];
    onWaypointTap?: (seq: number) => void;
  };
  /**
   * 선택된 미션의 이름표 마커 (MSG-427 승인 Q4) — **선택된 미션에만** 붙인다.
   * Figma 9개 프레임 어디에도 이름표가 없고 RN에는 hover가 없어(스펙 R4), 티켓
   * [동작 요구]의 "이름표가 붙는다"를 지도가 글자로 덮이지 않는 최소 범위로 충족한다.
   */
  missionLabel?: { text: string; coord: LatLng; color?: string };
  /**
   * 카메라 **이동 종료** 시 현재 뷰포트 통지 (MSG-423 요구 5) — 조회 재발사 트리거다.
   * SDK의 `onCameraIdle`에 물린다: 제스처가 완전히 끝나야 발화하므로 드래그·줌 중에는
   * 매 프레임 나가지 않는다(스펙의 500ms 디바운스 대안 — 라이브러리 idle 이벤트 우선).
   * 남은 버스트 억제는 역지오코딩 훅의 디바운스가 백업으로 맡는다.
   */
  onViewportChange?: (viewport: Viewport) => void;
  /**
   * 저줌 지역 집계 마커 (MSG-428) — 격자 층과 상호 배타다(zoom < GRID_MIN_ZOOM에서만
   * 비지 않는다). 파생·병합은 순수 모델(region-cluster-overlay)이 하고 여기는 렌더와
   * 탭 시 카메라 이동만 맡는다.
   */
  clusters?: RegionClusterMarker[];
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
    minZoom,
    onCellTap,
    highlightCell,
    occupiedCells,
    themeCells,
    themeColor,
    hatchCells,
    accentCells,
    accentColor,
    route,
    missionLabel,
    onViewportChange,
    clusters,
    onReady,
  },
  ref,
) {
  const mapRef = useRef<NaverMapViewRef>(null);
  const [cells, setCells] = useState<VisibleCell[]>([]);
  /**
   * 채움 게이트 **판정 결과**만 상태로 든다 — 연속값 zoom을 들면 `onCameraChanged`가
   * 프레임마다 발화하는 제스처 내내 상태가 매번 달라져 리렌더가 60fps로 돈다
   * (MSG-423이 같은 이유로 부모 setState 디바운스를 기각한 함정). 불리언이면 임계를
   * 실제로 넘는 프레임에서만 값이 바뀌고 나머지는 `Object.is` 동일성으로 걸러진다.
   * 판정은 격자선 파생과 **같은 카메라 이벤트의 zoom**으로 하므로 두 층이 어긋나지 않는다.
   */
  const [belowGridZoom, setBelowGridZoom] = useState(() =>
    isBelowGridZoom(initialZoom),
  );
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

  /**
   * 점령 채움 — 저줌(zoom < GRID_MIN_ZOOM)에서는 게이트가 걷어 집계 마커에 화면을 넘긴다
   * (S1 — 웹 `gateFillCells` 대응). 배경 격자선과 **같은 카메라 이벤트의 zoom**으로 판정해
   * 두 채움 층이 한 프레임도 어긋나지 않게 한다. 테마 층은 게이트 대상이 아니다.
   */
  const occupiedPolygons = useMemo(
    () =>
      gateOccupiedFill(occupiedCells, belowGridZoom).map((cell) => ({
        key: cellKey(cell),
        coords: rectCoords(cellBoundsAt(cell)),
      })),
    [occupiedCells, belowGridZoom],
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

  /**
   * 마커 탭 → 다음 세부 단위가 보이는 줌으로 카메라 이동 (MSG-428 S4).
   * 화면이 아니라 여기서 처리한다 — 지도 명령(animateCameraTo)은 SDK 경계 안에 두고
   * 화면은 카메라를 몰라도 되게 한다 (웹 MapCanvas `zoomToCluster` 미러).
   */
  const zoomToCluster = (cluster: RegionClusterMarker) => {
    mapRef.current?.animateCameraTo({
      latitude: cluster.position.lat,
      longitude: cluster.position.lng,
      zoom: drillInZoomForUnit(cluster.unit),
      duration: 500,
    });
  };

  useImperativeHandle(ref, () => ({
    moveTo: (center) => {
      mapRef.current?.animateCameraTo({
        latitude: center.lat,
        longitude: center.lng,
        zoom: initialZoom,
        duration: 500,
      });
    },
    panTo: (center) => {
      mapRef.current?.animateCameraTo({
        latitude: center.lat,
        longitude: center.lng,
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
      // 타일 첫 표시(`onLoaded`)는 **패치가 Android에만 있다** — iOS 네이티브에는 대응
      // 리스너가 없어 이벤트가 영영 오지 않는다. iOS를 `onLoaded`에만 걸어두면 스플래시가
      // 매번 게이트 상한(`SPLASH_MAP_TIMEOUT_MS`)을 통째로 기다리므로, iOS는 종전
      // 신호(`onInitialized`)로 폴백해 최소한 지금 동작을 유지한다.
      // iOS 대응은 후속(래퍼 iOS 패치 또는 업스트림).
      onLoaded={Platform.OS === "android" ? onReady : undefined}
      onInitialized={Platform.OS === "android" ? undefined : onReady}
      isShowZoomControls={showZoomControls}
      minZoom={minZoom}
      onCameraChanged={(camera) => {
        setBelowGridZoom(isBelowGridZoom(camera.zoom ?? initialZoom));
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
      {/* 강조 셀 — 테마 층 위에 얹는 두 번째 색 (MSG-560 D3) */}
      {accentColor &&
        (accentCells ?? []).map((cell) => (
          <NaverMapPolygonOverlay
            key={`accent:${cellKey(cell)}`}
            coords={rectCoords(cellBoundsAt(cell))}
            color={`${accentColor}${THEME_FILL_ALPHA}`}
            outlineColor={accentColor}
            outlineWidth={ACCENT_OUTLINE_WIDTH}
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
        route?.waypoints.map(({ seq, coord, active }) => (
          <NaverMapMarkerOverlay
            key={seq}
            latitude={coord.lat}
            longitude={coord.lng}
            width={active ? ROUTE_MARKER_ACTIVE_SIZE : ROUTE_MARKER_SIZE}
            height={active ? ROUTE_MARKER_ACTIVE_SIZE : ROUTE_MARKER_SIZE}
            anchor={{ x: 0.5, y: 0.5 }}
            onTap={route?.onWaypointTap && (() => route?.onWaypointTap?.(seq))}
          >
            {/* 커스텀 뷰 마커 — Figma 14094:5419: 테마 색 원 + 흰 테두리 2px + 흰 번호.
                네이티브 마커 서브뷰라 nativewind 클래스 대신 토큰 값을 style로 직접 주입,
                Android 서브뷰 평탄화 방지로 collapsable={false} (스펙 리스크 1 — 실패 시
                caption 텍스트 폴백 예정) */}
            <View
              collapsable={false}
              style={{
                width: active ? ROUTE_MARKER_ACTIVE_SIZE : ROUTE_MARKER_SIZE,
                height: active ? ROUTE_MARKER_ACTIVE_SIZE : ROUTE_MARKER_SIZE,
                borderRadius: ROUTE_MARKER_SIZE,
                backgroundColor: themeColor,
                borderWidth: active ? ROUTE_MARKER_ACTIVE_RING : 2,
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
      {/* 지역 집계 마커 (MSG-428 S2·S3·S4) — 저줌에서만 채워져 들어온다.
          key는 regionCode 기반 안정 키라 재조회에도 같은 지역이면 마커가 유지된다 */}
      {clusters?.map((cluster) => {
        // 카메라 프레임마다 리렌더되는 컴포넌트다(onCameraChanged → setCells가 새 배열).
        // 마커당 한 번만 계산해 쓴다 — 파일의 useMemo 관례와 같은 이유다.
        const { width, height } = clusterBubbleSize(cluster).box;
        return (
          <NaverMapMarkerOverlay
            key={`cluster:${cluster.id}`}
            latitude={cluster.position.lat}
            longitude={cluster.position.lng}
            width={width}
            height={height}
            anchor={{ x: 0.5, y: 0.5 }}
            onTap={() => zoomToCluster(cluster)}
          >
            <ClusterMarker marker={cluster} />
          </NaverMapMarkerOverlay>
        );
      })}
      {/* 선택 미션 이름표 (승인 Q4) — 마커 서브뷰라 nativewind 대신 토큰 값을 style로
          직접 주입한다 (번호 마커와 같은 관례). Android 서브뷰 평탄화 방지 collapsable={false} */}
      {themeColor && missionLabel && (
        <NaverMapMarkerOverlay
          latitude={missionLabel.coord.lat}
          longitude={missionLabel.coord.lng}
          width={MISSION_LABEL_WIDTH}
          height={MISSION_LABEL_HEIGHT}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View
            collapsable={false}
            style={{
              width: MISSION_LABEL_WIDTH,
              height: MISSION_LABEL_HEIGHT,
              borderRadius: MISSION_LABEL_HEIGHT / 2,
              backgroundColor: missionLabel.color ?? themeColor,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 8,
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                color: semantic.onPrimary,
                fontSize: 12,
                fontWeight: "600",
              }}
            >
              {missionLabel.text}
            </Text>
          </View>
        </NaverMapMarkerOverlay>
      )}
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
