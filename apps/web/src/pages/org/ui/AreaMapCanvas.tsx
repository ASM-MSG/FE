import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Container,
  NaverMap,
  NavermapsProvider,
  Polygon,
  Polyline,
} from "react-naver-maps";
import { semantic } from "@fillmap/design-tokens";
import { RetryNotice, ZoomControl } from "@fillmap/ui-web";
import {
  cellIndexAt,
  type Bounds,
  type GridCellIndex,
  type LatLng,
} from "@/entities/cell";
import {
  rectCornersAt,
  rectSpan,
  toDragRect,
  type AreaRect,
} from "@/features/event-submission/model/submission-area";
import {
  buildGridLines,
  GRID_MIN_ZOOM,
} from "@/features/map-home/model/grid-overlay";
import { MAX_ZOOM, MIN_ZOOM } from "@/features/map-home/model/map-scale";
import { SEOMYEON_CENTER } from "@/shared/geolocation";
import {
  buildNaverMapsScriptUrl,
  loadNaverMapsScript,
  markNaverMapsPoisoned,
  resetNaverMapsPreflight,
} from "@/shared/naver-maps/naver-sdk-loader";

/**
 * 위치 영역 지정 전용 지도 경계 (MSG-547 AC 2·3·15) — `react-naver-maps`·`naver` 전역
 * 참조는 이 파일에만 둔다(RN 경계: 지도 격리). 유저 지도(`pages/map-home/ui/MapCanvas`)는
 * 클러스터·경로·미션 라벨·줌 스텝 리미터 등 이 화면과 무관한 책임이 대부분이고
 * pages→pages import도 금지라 재사용하지 않고 최소 마운트를 새로 만든다 — 공유하는 것은
 * SDK 프리플라이트 로더(shared/naver-maps)와 격자선 파생(features/map-home/model)뿐이다.
 *
 * 드래그는 **그리기 전용**이다(`draggable={false}` 상시 — 승인 확정): 지도 이동은 장소
 * 검색과 줌 컨트롤이 담당한다. 좌표→셀 판정은 격자 정본 `cellIndexAt`, 사각형→꼭짓점은
 * `rectCornersAt`이며 이 파일에 좌표 산술은 없다.
 *
 * **간소판의 범위(의도)**: 유저 지도의 SDK 예외 흡수 경계(MapLoadErrorBoundary)·줌 스텝
 * 리미터·진입 명령 큐는 이식하지 않았다 — 앞의 것은 MapCanvas 내부 클래스라 복제가 되고,
 * 뒤 둘은 유저 지도 UX 정책이다. 여기서는 프리플라이트 실패·인증 실패를 폴백 + 재시도로만
 * 수렴시킨다.
 */

/** 지도 명령 핸들 — 지도 인스턴스를 경계 밖으로 노출하지 않는다 */
export interface AreaMapHandle {
  /** 검색 결과 좌표로 이동 (AC 9) — 격자가 안 보이는 축척이면 함께 올린다(추정 9) */
  moveTo: (coords: LatLng) => void;
}

interface AreaMapCanvasProps {
  /** 확정된 영역 — 지도에 상시 렌더 (AC 5·11) */
  confirmedRects: AreaRect[];
  /** 드래그 중이거나 확정 대기 중인 후보 (AC 2) */
  draftRect: AreaRect | null;
  /** 후보 갱신·해제 — 스텝이 단일 슬롯으로 소유한다(추정 7) */
  onDraftChange: (rect: AreaRect | null) => void;
  /** 줌 게이트 안내(AC 15)를 위해 현재 줌을 스텝으로 밀어낸다 */
  onZoomChange: (zoom: number) => void;
}

const NAVER_NCP_KEY_ID = import.meta.env.VITE_NAVER_MAP_NCP_KEY_ID as
  | string
  | undefined;

// 유저 지도와 동일한 프리플라이트 URL을 쓴다 — 검증된 로드 경로를 그대로 답습하고,
// 두 화면이 같은 스크립트·전역을 공유하게 한다 (geocoder는 이 화면에서 쓰지 않는다)
const NAVER_SUBMODULES = ["geocoder"];

/** 진입 줌 = 격자 표시 최소 줌 — 열자마자 격자가 보여야 드로잉이 성립한다 (추정 6) */
const DEFAULT_ZOOM = GRID_MIN_ZOOM;

/** 격자선 — 유저 지도와 같은 점선 사양(MSG-263: 1.5px shortdash primary) */
const GRID_LINE_STROKE_WEIGHT = 1.5;
/** 확정 영역 — 점령 셀 사양 준용(채움 40% + 테두리 60%) */
const CONFIRMED_STROKE_OPACITY = 0.6;
const CONFIRMED_FILL_OPACITY = 0.4;
/** 후보 사각형 — 확정과 구분되는 강조 색(시안의 마젠타에 가장 가까운 accent 토큰) */
const DRAFT_STROKE_WEIGHT = 2;
const DRAFT_FILL_OPACITY = 0.2;

/** 지도 뷰포트 — 격자선 파생(buildGridLines)의 입력 */
interface AreaViewport {
  bounds: Bounds;
  zoom: number;
}

/** 지도 포인터 이벤트 → 격자 셀 (좌표 산술은 entities/cell 정본에 위임) */
const cellAt = (event: naver.maps.PointerEvent): GridCellIndex => {
  const coord = event.coord as naver.maps.LatLng;
  return cellIndexAt({ lat: coord.lat(), lng: coord.lng() });
};

/** SDK 로드 실패·키 미설정 공용 폴백 (AC 15) */
const AreaMapFallback = ({ onRetry }: { onRetry: () => void }) => (
  <div className="flex h-full w-full items-center justify-center bg-surface px-lg">
    <RetryNotice message="지도를 불러오지 못했어요" onRetry={onRetry} />
  </div>
);

export const AreaMapCanvas = forwardRef<AreaMapHandle, AreaMapCanvasProps>(
  (props, ref) => {
    // 재시도 시 로드 경계·인증 상태를 다시 태우기 위해 하위 뷰를 remount
    const [attempt, setAttempt] = useState(0);
    const retry = () => {
      resetNaverMapsPreflight();
      setAttempt((n) => n + 1);
    };

    if (!NAVER_NCP_KEY_ID) return <AreaMapFallback onRetry={retry} />;

    return (
      <AreaNaverMapView
        key={attempt}
        ref={ref}
        ncpKeyId={NAVER_NCP_KEY_ID}
        onRetry={retry}
        {...props}
      />
    );
  },
);
AreaMapCanvas.displayName = "AreaMapCanvas";

interface AreaNaverMapViewProps extends AreaMapCanvasProps {
  ncpKeyId: string;
  onRetry: () => void;
}

const AreaNaverMapView = forwardRef<AreaMapHandle, AreaNaverMapViewProps>(
  (
    {
      ncpKeyId,
      confirmedRects,
      draftRect,
      onDraftChange,
      onZoomChange,
      onRetry,
    },
    ref,
  ) => {
    const [authFailed, setAuthFailed] = useState(false);
    const [sdkStatus, setSdkStatus] = useState<"loading" | "ready" | "failed">(
      "loading",
    );
    const mapRef = useRef<naver.maps.Map | null>(null);
    const [viewport, setViewport] = useState<AreaViewport | null>(null);
    /** 드래그 시작 셀 — 네이티브 리스너에서도 최신값이어야 해 ref로 둔다 */
    const anchorRef = useRef<GridCellIndex | null>(null);
    /** 커서 배지 위치 (지도 컨테이너 기준 px) */
    const [badgeOffset, setBadgeOffset] = useState<{
      x: number;
      y: number;
    } | null>(null);

    // 프리플라이트: SDK 준비 후에만 SDK 컴포넌트를 마운트한다 (MapCanvas와 같은 이유 —
    // 라이브러리 promise 캐시가 실패 promise를 퇴거하지 않아 remount 재시도가 무력해진다)
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

    // 인증 실패는 스크립트 로드와 별개 경로 — SDK가 전역 훅으로만 알린다
    useEffect(() => {
      const handleAuthFailure = () => {
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

    // 포인터가 패널 위로 이탈한 채 놓아도 드래그가 끝나야 한다 (지도 mouseup 유실 보강)
    useEffect(() => {
      const endDrag = () => {
        anchorRef.current = null;
        setBadgeOffset(null);
      };
      window.addEventListener("mouseup", endDrag);
      return () => window.removeEventListener("mouseup", endDrag);
    }, []);

    // 후보가 해제되면(Esc·취소·확정) 진행 중 드래그 래치도 끊는다 (AC 4) — 이걸 빼면
    // Esc 직후의 mousemove가 anchor를 살려 후보를 되살린다. 상태가 아니라 ref만 되돌린다:
    // 배지 표시는 draftSpan(=draftRect 파생)이 가려 stale 프레임이 없고, 배지 좌표는
    // mousedown이 항상 새로 넣으므로 여기서 초기화할 상태가 없다.
    useEffect(() => {
      if (draftRect === null) {
        anchorRef.current = null;
      }
    }, [draftRect]);

    useImperativeHandle(
      ref,
      () => ({
        moveTo: (coords) => {
          const map = mapRef.current;
          if (map === null) return;
          map.panTo({ lat: coords.lat, lng: coords.lng });
          // 격자가 안 보이는 축척으로 이동하면 확정 흐름이 끊긴다 — 함께 올린다 (추정 9)
          if (map.getZoom() < GRID_MIN_ZOOM) map.setZoom(GRID_MIN_ZOOM, true);
        },
      }),
      [],
    );

    /** 지도 준비·이동 신호에서 뷰포트를 끌어온다 (격자선 파생·줌 게이트의 입력) */
    const syncViewport = () => {
      const map = mapRef.current;
      if (map === null) return;
      const bounds = map.getBounds() as naver.maps.LatLngBounds;
      const sw = bounds.getSW();
      const ne = bounds.getNE();
      const zoom = map.getZoom();
      setViewport({
        bounds: {
          sw: { lat: sw.lat(), lng: sw.lng() },
          ne: { lat: ne.lat(), lng: ne.lng() },
        },
        zoom,
      });
      onZoomChange(zoom);
    };

    const zoomBy = (step: number) => {
      const map = mapRef.current;
      if (map === null) return;
      map.setZoom(
        Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, map.getZoom() + step)),
        true,
      );
    };

    const zoom = viewport?.zoom ?? DEFAULT_ZOOM;
    // 격자가 안 보이는 축척에서는 스냅 기준이 사라져 드로잉을 막는다 (AC 15, 추정 6)
    const drawingEnabled = zoom >= GRID_MIN_ZOOM;

    const handleMousedown = (event: naver.maps.PointerEvent) => {
      if (!drawingEnabled) return;
      const cell = cellAt(event);
      anchorRef.current = cell;
      setBadgeOffset({ x: event.offset.x, y: event.offset.y });
      // 누른 즉시 1×1 후보가 선다 — 드래그 없는 클릭도 지정으로 인정된다 (AC 3)
      onDraftChange(toDragRect(cell, cell));
    };

    const handleMousemove = (event: naver.maps.PointerEvent) => {
      const anchor = anchorRef.current;
      if (anchor === null) return;
      setBadgeOffset({ x: event.offset.x, y: event.offset.y });
      onDraftChange(toDragRect(anchor, cellAt(event)));
    };

    const handleMouseup = () => {
      anchorRef.current = null;
      setBadgeOffset(null);
    };

    const gridLines = useMemo(
      () =>
        viewport === null ? [] : buildGridLines(viewport.bounds, viewport.zoom),
      [viewport],
    );

    if (authFailed || sdkStatus === "failed") {
      return <AreaMapFallback onRetry={onRetry} />;
    }
    if (sdkStatus === "loading") {
      return <div className="h-full w-full bg-surface" aria-busy="true" />;
    }

    const draftSpan = draftRect === null ? null : rectSpan(draftRect);

    return (
      <div className="relative h-full w-full">
        <NavermapsProvider ncpKeyId={ncpKeyId} submodules={NAVER_SUBMODULES}>
          <Container
            className="h-full w-full"
            fallback={<div className="h-full w-full" aria-busy="true" />}
          >
            <NaverMap
              ref={mapRef}
              defaultCenter={SEOMYEON_CENTER}
              defaultZoom={DEFAULT_ZOOM}
              // 그리기 전용 — 패닝은 장소 검색·줌 컨트롤이 대신한다 (승인 확정 질문 2)
              draggable={false}
              scaleControl={false}
              onInit={syncViewport}
              onIdle={syncViewport}
              onMousedown={handleMousedown}
              onMousemove={handleMousemove}
              onMouseup={handleMouseup}
            >
              {gridLines.map((line) => (
                <Polyline
                  key={line.id}
                  path={line.path}
                  strokeWeight={GRID_LINE_STROKE_WEIGHT}
                  strokeColor={semantic.primary}
                  strokeStyle="shortdash"
                />
              ))}
              {confirmedRects.map((rect, index) => (
                <Polygon
                  // 인덱스가 목록 식별자다 — 같은 사각형이 두 번 확정될 수 있다(AreaRectList 주석)
                  key={index}
                  paths={[rectCornersAt(rect)]}
                  strokeWeight={1}
                  strokeColor={semantic.primary}
                  strokeOpacity={CONFIRMED_STROKE_OPACITY}
                  fillColor={semantic.primary}
                  fillOpacity={CONFIRMED_FILL_OPACITY}
                />
              ))}
              {draftRect !== null && (
                <Polygon
                  paths={[rectCornersAt(draftRect)]}
                  strokeWeight={DRAFT_STROKE_WEIGHT}
                  strokeColor={semantic.accent}
                  fillColor={semantic.accent}
                  fillOpacity={DRAFT_FILL_OPACITY}
                />
              )}
            </NaverMap>
          </Container>
        </NavermapsProvider>

        {/* 커서 옆 크기 배지 (AC 2) — 지도 위 DOM 오버레이라 SDK 마커가 필요 없다 */}
        {badgeOffset !== null && draftSpan !== null && (
          <span
            className="pointer-events-none absolute z-10 translate-x-3 -translate-y-1/2 rounded-sm bg-primary px-xs py-0.5 text-fm-caption text-primary-foreground"
            style={{ left: badgeOffset.x, top: badgeOffset.y }}
          >
            가로 {draftSpan.cols}칸 × 세로 {draftSpan.rows}칸
          </span>
        )}

        <ZoomControl
          className="absolute right-md bottom-md z-10"
          onZoomIn={() => zoomBy(1)}
          onZoomOut={() => zoomBy(-1)}
        />
      </div>
    );
  },
);
AreaNaverMapView.displayName = "AreaNaverMapView";
