import {
  Component,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Container,
  Marker,
  NaverMap,
  NavermapsProvider,
  Polygon,
  Polyline,
} from "react-naver-maps";
import { semantic } from "@fillmap/design-tokens";
import { Button } from "@fillmap/ui-web";
import type { Bounds, LatLng } from "@/entities/cell";
import { MAX_ZOOM, MIN_ZOOM } from "@/features/map-home/model/map-scale";
import { buildHatchLines } from "@/features/map-home/model/theme-overlay";
import type { Viewport } from "@/features/map-home/model/viewport-store";
import {
  buildNaverMapsScriptUrl,
  loadNaverMapsScript,
  markNaverMapsPoisoned,
  resetNaverMapsPreflight,
} from "./naver-sdk-loader";

declare global {
  interface Window {
    /** 네이버 지도 SDK 인증 실패 전역 훅 — SDK가 스크립트 로드 후 인증 실패 시 호출한다 (A5) */
    navermap_authFailure?: () => void;
  }
}

/** 지도 명령 핸들 — 네이버 지도 인스턴스 제어를 이 경계 밖으로 노출하지 않고 명령만 공개 */
export interface MapCanvasHandle {
  /** 지정 좌표로 부드럽게 이동 */
  moveTo: (coords: LatLng) => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

/**
 * 지도에 그릴 사각 오버레이 한 칸 — 순수 데이터(id + Bounds). 좌표→기하 변환은 호출부 몫.
 * 스타일 필드(MSG-252)는 옵셔널 — 미지정이면 현행 primary 렌더 그대로 (기존 도감 오버레이 불변, AC 13)
 */
export interface MapCellOverlay {
  id: string;
  bounds: Bounds;
  /** 채움·테두리 색 (테마 토큰 hex) — 미지정 시 primary (MSG-252 AC 6) */
  color?: string;
  /** 빗금 표시 (테마 셀 ∩ 내 점령 — MSG-252 AC 7, R1: 사선 Polyline 근사) */
  hatched?: boolean;
}

/** 지도에 그릴 경로 오버레이 — 연결선 정점 + 번호 경유지 + 경로 색 (MSG-252 AC 8) */
export interface MapRouteOverlay {
  path: LatLng[];
  waypoints: { seq: number; position: LatLng }[];
  color: string;
}

interface MapCanvasProps {
  /** 초기 중심 좌표 (geolocation 결과 반영) */
  center: LatLng;
  /** 이동/줌 등으로 뷰포트가 바뀔 때 호출 (스토어 push) */
  onViewportChange: (viewport: Viewport) => void;
  /** 반투명 사각 오버레이 목록 (MSG-121 수집 격자) — 미제공/빈 배열이면 기존 동작과 동일(R3) */
  overlayCells?: MapCellOverlay[];
  /** 경로 오버레이 (MSG-252 AC 8) — 미제공이면 기존 동작과 동일 */
  route?: MapRouteOverlay;
  /** 오버레이 셀 클릭 (MSG-122 AC 14·18) — 미제공이면 표시 전용 기존 동작과 동일(R3) */
  onOverlayCellClick?: (cellId: string) => void;
}

const NAVER_NCP_KEY_ID = import.meta.env.VITE_NAVER_MAP_NCP_KEY_ID as
  | string
  | undefined;

// geocoder: 도감 역지오코딩(region-lookup)용 — 누락 시 지역명이 항상 디폴트로 폴백된다(R4).
// 실제 fetch되는 프리플라이트 URL에는 이 목록만 쓴다 — Provider 쪽은 재시도 시
// 캐시 키 마커가 덧붙을 수 있다(NaverMapView의 providerSubmodules 주석 참조)
const NAVER_SUBMODULES = ["geocoder"];

// 기존 카카오 level 5의 체감 등가 초기 줌 (A1: zoom ≈ 20 − level) — viewport-store 초기값과 동일
const DEFAULT_ZOOM = 15;
// 네이버 지도 zoom 유효 범위(A2)는 map-scale 단일 정의를 공유한다 — SDK 내부 클램핑에 기대지 않고 명시한다

/** 네이버 지도 Map → 플랫폼 중립 Viewport 추출 */
const toViewport = (map: naver.maps.Map): Viewport => {
  const center = map.getCenter() as naver.maps.LatLng;
  const bounds = map.getBounds() as naver.maps.LatLngBounds;
  const sw = bounds.getSW();
  const ne = bounds.getNE();
  return {
    center: { lat: center.lat(), lng: center.lng() },
    zoom: map.getZoom(),
    bounds: {
      sw: { lat: sw.lat(), lng: sw.lng() },
      ne: { lat: ne.lat(), lng: ne.lng() },
    },
  };
};

/** SDK 로드 실패/키 미설정 공용 폴백 — 에러 상태 + 재시도(S3) */
const MapFallback = ({ onRetry }: { onRetry: () => void }) => (
  <div className="flex h-full w-full flex-col items-center justify-center gap-md bg-surface px-lg text-center">
    <div className="flex flex-col gap-xxs">
      <p className="text-fm-title text-foreground">지도를 불러오지 못했어요</p>
      <p className="text-fm-body text-foreground-muted">
        네트워크 상태를 확인하고 다시 시도해 주세요
      </p>
    </div>
    <Button text="다시 시도" variant="primary" size="sm" onClick={onRetry} />
  </div>
);

interface MapLoadErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

/**
 * SDK 실패 흡수 경계 — 두 예외 경로를 잡아 MapFallback을 보인다.
 * ① `useNavermaps`(Suspense)의 렌더 중 throw (R1 — 프리플라이트 통과 후의 잔여 경로)
 * ② 인증 실패로 SDK가 `naver.maps`를 null화한 뒤 SDK 하위 트리를 언마운트할 때
 *    라이브러리 cleanup(`naver.maps.Event.removeListener`)이 던지는 TypeError
 * ②를 흡수하려면 폴백 전환 시 이 경계가 마운트 상태를 유지해야 한다 — 경계 밖에서
 * 하위 트리를 통째로 갈아끼우면 예외가 라우터 루트까지 전파되어 앱이 죽는다(AC 8 재작업).
 * 재시도는 attempt remount가 이 경계째 새로 마운트해 초기화한다.
 */
class MapLoadErrorBoundary extends Component<
  MapLoadErrorBoundaryProps,
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    // 흡수한 예외를 관측 가능하게 남긴다 (PR #25 리뷰 반영) — 폴백 전환 사유의 조용한 유실 방지
    console.error("[MapCanvas] 지도 SDK 하위 트리 예외를 흡수하고 폴백으로 전환:", error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * 네이버 지도 경계 컴포넌트 — `react-naver-maps` import는 이 파일에만 둔다(RN 경계).
 * SDK 스크립트는 프리플라이트 로더로 직접 로드해 성공 후에만 SDK 컴포넌트를 마운트한다
 * (라이브러리 promise 캐시의 거부 promise 영구 보관 우회 — "다시 시도" = 진짜 재시도).
 * SDK 로드·인증 실패 시 에러 상태 + 재시도(S3), 이동/줌 이벤트를 onViewportChange로 밀어낸다.
 * 키 미설정 시에는 NaverMapView 자체를 마운트하지 않아 빈 키로 SDK 요청이 나가지 않는다.
 */
export const MapCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(
  ({ center, onViewportChange, overlayCells, route, onOverlayCellClick }, ref) => {
    // 재시도 시 로드 경계·인증 상태를 다시 태우기 위해 하위 뷰를 remount
    const [attempt, setAttempt] = useState(0);

    // 프리플라이트 잔재(영구 pending·stale 태그)를 비워야 remount의 재로드가
    // 스크립트 재주입 = 진짜 네트워크 재시도가 된다
    const retry = () => {
      resetNaverMapsPreflight();
      setAttempt((n) => n + 1);
    };

    if (!NAVER_NCP_KEY_ID) {
      return <MapFallback onRetry={retry} />;
    }

    return (
      <NaverMapView
        key={attempt}
        ref={ref}
        ncpKeyId={NAVER_NCP_KEY_ID}
        attempt={attempt}
        center={center}
        onViewportChange={onViewportChange}
        overlayCells={overlayCells}
        route={route}
        onOverlayCellClick={onOverlayCellClick}
        onRetry={retry}
      />
    );
  },
);
MapCanvas.displayName = "MapCanvas";

interface NaverMapViewProps extends MapCanvasProps {
  ncpKeyId: string;
  /** 재시도 회차 — 리마운트 key이자 라이브러리 캐시 키 마커의 근거 (경계 내부 배선 전용) */
  attempt: number;
  onRetry: () => void;
}

// 수집 오버레이 시각 사양 — ui-web GridCell collected(border-primary/60 + bg-primary/40)를
// 지리 폴리곤으로 차용한다 (스펙 AC 9, 추정 A3 — 균일 투명도). 색은 토큰에서만(hex 리터럴 금지).
// 테마 강조 셀(MSG-252 AC 6)도 같은 투명도를 쓴다 — "반투명 채움 + 테두리" 사양 공유.
const OVERLAY_STROKE_OPACITY = 0.6;
const OVERLAY_FILL_OPACITY = 0.4;
// 빗금 선(MSG-252 AC 7, R1) — 채움보다 진하게 그려 교집합이 한눈에 구분되게 한다
const HATCH_STROKE_WEIGHT = 2;
const HATCH_STROKE_OPACITY = 0.85;
// 경로 연결선(MSG-252 AC 8) — 이동 동선이라 셀 테두리(1)보다 두껍게
const ROUTE_STROKE_WEIGHT = 4;
const ROUTE_STROKE_OPACITY = 0.9;

/** 사각 Bounds → 폴리곤 링(꼭짓점 4개, sw 기준 반시계) — 네이버 Polygon paths는 링 배열을 받는다 */
const boundsToPath = ({ sw, ne }: Bounds): LatLng[] => [
  { lat: sw.lat, lng: sw.lng },
  { lat: sw.lat, lng: ne.lng },
  { lat: ne.lat, lng: ne.lng },
  { lat: ne.lat, lng: sw.lng },
];

/**
 * 경로 경유지 번호 마커 HTML (MSG-252 AC 8) — 네이버 Marker HtmlIcon content.
 * 마커 앵커는 좌상단 기준이라 translate로 원 중심을 좌표에 맞춘다 (naver.maps.Point 앵커 불요).
 * 지도 DOM은 같은 document라 tailwind 토큰 클래스가 그대로 적용된다 — 색 임의값 없이 토큰만.
 */
const routeMarkerContent = (seq: number): string =>
  `<div class="flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-theme-route text-fm-body-strong text-primary-foreground shadow-raised">${seq}</div>`;

const NaverMapView = forwardRef<MapCanvasHandle, NaverMapViewProps>(
  (
    {
      ncpKeyId,
      attempt,
      center,
      onViewportChange,
      overlayCells,
      route,
      onOverlayCellClick,
      onRetry,
    },
    ref,
  ) => {
    // 인증 실패는 스크립트 로드와 별개 경로 — SDK가 전역 훅으로만 알린다 (A5·R1)
    const [authFailed, setAuthFailed] = useState(false);
    // 프리플라이트 결과 — ready가 되어야만 SDK 컴포넌트(useNavermaps 소비자)를 마운트한다
    const [sdkStatus, setSdkStatus] = useState<"loading" | "ready" | "failed">(
      "loading",
    );
    const mapRef = useRef<naver.maps.Map | null>(null);

    // 프리플라이트 로드: 라이브러리 promise 캐시는 거부 promise를 퇴거하지 않아 remount
    // 재시도가 즉시 재실패한다. 경계가 직접 스크립트를 로드해 성공 후에만 SDK를 마운트하면
    // 라이브러리 로더는 전역 존재로 즉시 resolve하고, 실패 시 remount가 진짜 재시도가 된다
    useEffect(() => {
      let cancelled = false;
      loadNaverMapsScript(buildNaverMapsScriptUrl(ncpKeyId, NAVER_SUBMODULES))
        .then(() => {
          if (!cancelled) setSdkStatus("ready");
        })
        .catch(() => {
          if (!cancelled) setSdkStatus("failed");
        });
      return () => {
        cancelled = true;
      };
    }, [ncpKeyId]);

    // 전역 1회 등록·해제(R3) — remount 시 이전 cleanup 후 재등록되어 중복·누수가 없다
    useEffect(() => {
      const handleAuthFailure = () => {
        // 인증 실패 시 SDK는 전역 네임스페이스를 깨진 채(jsContentLoaded=true까지 가능)
        // 남긴다 — 로더에 오염을 보고해 이후 로드가 반드시 재주입 경로를 타게 한다
        markNaverMapsPoisoned();
        setAuthFailed(true);
      };
      window.navermap_authFailure = handleAuthFailure;
      return () => {
        if (window.navermap_authFailure === handleAuthFailure) {
          delete window.navermap_authFailure;
        }
      };
    }, []);

    // 초기 중심 갱신(geolocation 해소) 시 부드럽게 이동 — 카카오 isPanto 등가.
    // 지도 로드 전이면 no-op이며, 그 경우 NaverMap 생성 시 defaultCenter가 최신 center로 잡힌다
    useEffect(() => {
      mapRef.current?.panTo({ lat: center.lat, lng: center.lng });
    }, [center.lat, center.lng]);

    useImperativeHandle(
      ref,
      () => ({
        moveTo: (coords) => {
          mapRef.current?.panTo({ lat: coords.lat, lng: coords.lng });
        },
        zoomIn: () => {
          const map = mapRef.current;
          if (!map) return;
          // 네이버 zoom은 클수록 확대 — 카카오 level과 방향 반대 (AC 4)
          map.setZoom(Math.min(MAX_ZOOM, map.getZoom() + 1), true);
        },
        zoomOut: () => {
          const map = mapRef.current;
          if (!map) return;
          map.setZoom(Math.max(MIN_ZOOM, map.getZoom() - 1), true);
        },
      }),
      [],
    );

    const pushViewport = () => {
      const map = mapRef.current;
      if (map) onViewportChange(toViewport(map));
    };

    // 폴백 전환은 경계 내부 children 교체로만 한다 — 경계가 언마운트 순간의 라이브러리
    // cleanup 예외(naver.maps null화)를 흡수해야 하므로 마운트 상태를 유지한다 (AC 8)
    const failed = authFailed || sdkStatus === "failed";

    // 재시도 리마운트(attempt ≥ 1)에서는 Provider submodules에 시도 마커를 붙여 라이브러리
    // 훅 캐시 키(`${ncpKeyId}:${submodules 정렬 join}`)를 바꾼다 — 훅의 모듈 레벨 promise
    // 캐시는 최초 마운트 시점의 naver.maps로 resolve된 promise를 퇴거 없이 보관하므로,
    // 같은 키로는 프리플라이트가 전역을 재구축해도 이전(오염) 객체를 그대로 돌려받는다.
    // 마커가 실제 URL로 나갈 일은 없다: 캐시 미스 시 라이브러리 loadScript가 실행되지만
    // SDK 하위 트리는 프리플라이트 ready(전역 준비 완료) 후에만 마운트되므로, 그 시점
    // loadScript는 전역 존재를 보고 스크립트 주입 없이 현재 네임스페이스로 즉시 resolve한다.
    // (실제 fetch되는 프리플라이트 URL에는 마커를 넣지 않는다 — 게이트웨이에 없는 서브모듈
    // 을 요청하게 되기 때문. NAVER_SUBMODULES 주석 참조)
    const providerSubmodules =
      attempt === 0
        ? NAVER_SUBMODULES
        : [...NAVER_SUBMODULES, `retry-${attempt}`];

    return (
      <MapLoadErrorBoundary fallback={<MapFallback onRetry={onRetry} />}>
        {failed ? (
          <MapFallback onRetry={onRetry} />
        ) : sdkStatus === "loading" ? (
          <div className="h-full w-full" aria-busy="true" />
        ) : (
          <NavermapsProvider
            ncpKeyId={ncpKeyId}
            submodules={providerSubmodules}
          >
            <Container
              className="h-full w-full"
              fallback={<div className="h-full w-full" aria-busy="true" />}
            >
              <NaverMap
                ref={mapRef}
                defaultCenter={center}
                defaultZoom={DEFAULT_ZOOM}
                // SDK 내장 축척 컨트롤 비활성 — 커스텀 축척 바(MSG-123)와 값이 다른 두 축척이
                // 동시 표시되는 중복 제거. 다른 내장 컨트롤 기본값은 유지(수술적 변경)
                scaleControl={false}
                onInit={pushViewport}
                onIdle={pushViewport}
              >
                {overlayCells?.map((cell) => (
                  <Polygon
                    key={cell.id}
                    paths={[boundsToPath(cell.bounds)]}
                    strokeWeight={1}
                    // 스타일 미지정 셀은 현행 primary 그대로 — 도감 오버레이·스모크 불변 (MSG-252 AC 13)
                    strokeColor={cell.color ?? semantic.primary}
                    strokeOpacity={OVERLAY_STROKE_OPACITY}
                    fillColor={cell.color ?? semantic.primary}
                    fillOpacity={OVERLAY_FILL_OPACITY}
                    // 네이버 Polygon은 clickable=false가 기본 — 핸들러가 있을 때만 클릭을 받는다.
                    // 핸들러 미등록이면 onClick도 없음 — 표시 전용 기존 동작 유지 (MSG-122, R3)
                    clickable={onOverlayCellClick != null}
                    onClick={
                      onOverlayCellClick
                        ? () => onOverlayCellClick(cell.id)
                        : undefined
                    }
                  />
                ))}
                {/* 빗금(테마 셀 ∩ 내 점령 — MSG-252 AC 7): 네이버 Polygon은 패턴 채움 미지원이라
                    사선 Polyline 묶음으로 근사한다 (R1). 클릭은 폴리곤이 받는다(Polyline 기본 비클릭) */}
                {overlayCells
                  ?.filter((cell) => cell.hatched)
                  .map((cell) =>
                    buildHatchLines(cell.bounds).map((line, i) => (
                      <Polyline
                        key={`${cell.id}-hatch-${i}`}
                        path={line}
                        strokeWeight={HATCH_STROKE_WEIGHT}
                        strokeColor={cell.color ?? semantic.primary}
                        strokeOpacity={HATCH_STROKE_OPACITY}
                      />
                    )),
                  )}
                {/* 경로추천 오버레이 (MSG-252 AC 8) — 연결선 + 번호 경유지 마커 */}
                {route && (
                  <>
                    <Polyline
                      path={route.path}
                      strokeWeight={ROUTE_STROKE_WEIGHT}
                      strokeColor={route.color}
                      strokeOpacity={ROUTE_STROKE_OPACITY}
                    />
                    {route.waypoints.map((waypoint) => (
                      <Marker
                        key={waypoint.seq}
                        position={waypoint.position}
                        title={`경유지 ${waypoint.seq}`}
                        icon={{ content: routeMarkerContent(waypoint.seq) }}
                      />
                    ))}
                  </>
                )}
              </NaverMap>
            </Container>
          </NavermapsProvider>
        )}
      </MapLoadErrorBoundary>
    );
  },
);
NaverMapView.displayName = "NaverMapView";
