import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Map, Polygon, useKakaoLoader } from "react-kakao-maps-sdk";
import { semantic } from "@fillmap/design-tokens";
import { Button } from "@fillmap/ui-web";
import type { Bounds, LatLng } from "@/entities/cell";
import type { Viewport } from "@/features/map-home/model/viewport-store";

/** 지도 명령 핸들 — 카카오맵 인스턴스 제어를 이 경계 밖으로 노출하지 않고 명령만 공개 */
export interface MapCanvasHandle {
  /** 지정 좌표로 부드럽게 이동 */
  moveTo: (coords: LatLng) => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

/** 지도에 그릴 사각 오버레이 한 칸 — 순수 데이터(id + Bounds). 좌표→기하 변환은 호출부 몫 */
export interface MapCellOverlay {
  id: string;
  bounds: Bounds;
}

interface MapCanvasProps {
  /** 초기 중심 좌표 (geolocation 결과 반영) */
  center: LatLng;
  /** 이동/줌 등으로 뷰포트가 바뀔 때 호출 (스토어 push) */
  onViewportChange: (viewport: Viewport) => void;
  /** 반투명 사각 오버레이 목록 (MSG-121 수집 격자) — 미제공/빈 배열이면 기존 동작과 동일(R3) */
  overlayCells?: MapCellOverlay[];
  /** 오버레이 셀 클릭 (MSG-122 AC 14·18) — 미제공이면 표시 전용 기존 동작과 동일(R3) */
  onOverlayCellClick?: (cellId: string) => void;
}

const KAKAO_APP_KEY = import.meta.env.VITE_KAKAO_MAP_APP_KEY as
  | string
  | undefined;

const DEFAULT_LEVEL = 5;
// 카카오맵 level 유효 범위 — SDK 내부 클램핑에 기대지 않고 명시한다
const MIN_LEVEL = 1;
const MAX_LEVEL = 14;

/** 카카오맵 Map → 플랫폼 중립 Viewport 추출 */
const toViewport = (map: kakao.maps.Map): Viewport => {
  const center = map.getCenter();
  const bounds = map.getBounds();
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  return {
    center: { lat: center.getLat(), lng: center.getLng() },
    zoom: map.getLevel(),
    bounds: {
      sw: { lat: sw.getLat(), lng: sw.getLng() },
      ne: { lat: ne.getLat(), lng: ne.getLng() },
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

/**
 * 카카오맵 경계 컴포넌트 — `react-kakao-maps-sdk` import는 이 파일에만 둔다(RN 경계).
 * SDK 로드 실패 시 에러 상태 + 재시도(S3), 이동/줌 이벤트를 onViewportChange로 밀어낸다.
 * 키 미설정 시에는 로더를 마운트하지 않아 빈 키로 SDK 요청이 나가지 않는다.
 */
export const MapCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(
  ({ center, onViewportChange, overlayCells, onOverlayCellClick }, ref) => {
    // 재시도 시 로더 훅을 다시 태우기 위해 하위 뷰를 remount
    const [attempt, setAttempt] = useState(0);

    if (!KAKAO_APP_KEY) {
      return <MapFallback onRetry={() => setAttempt((n) => n + 1)} />;
    }

    return (
      <KakaoMapView
        key={attempt}
        ref={ref}
        appkey={KAKAO_APP_KEY}
        center={center}
        onViewportChange={onViewportChange}
        overlayCells={overlayCells}
        onOverlayCellClick={onOverlayCellClick}
        onRetry={() => setAttempt((n) => n + 1)}
      />
    );
  },
);
MapCanvas.displayName = "MapCanvas";

interface KakaoMapViewProps extends MapCanvasProps {
  appkey: string;
  onRetry: () => void;
}

// 수집 오버레이 시각 사양 — ui-web GridCell collected(border-primary/60 + bg-primary/40)를
// 지리 폴리곤으로 차용한다 (스펙 AC 9, 추정 A3 — 균일 투명도). 색은 토큰에서만(hex 리터럴 금지).
const OVERLAY_STROKE_OPACITY = 0.6;
const OVERLAY_FILL_OPACITY = 0.4;

/** 사각 Bounds → 폴리곤 꼭짓점 4개 (sw 기준 반시계) */
const boundsToPath = ({ sw, ne }: Bounds): LatLng[] => [
  { lat: sw.lat, lng: sw.lng },
  { lat: sw.lat, lng: ne.lng },
  { lat: ne.lat, lng: ne.lng },
  { lat: ne.lat, lng: sw.lng },
];

const KakaoMapView = forwardRef<MapCanvasHandle, KakaoMapViewProps>(
  (
    { appkey, center, onViewportChange, overlayCells, onOverlayCellClick, onRetry },
    ref,
  ) => {
    // services: 도감(MSG-121 개정 D2)의 역지오코딩(coord2RegionCode)용 — SDK 로더 설정은 이 경계 파일에서만.
    // 지도 타일·컨트롤 동작에는 영향이 없어 홈·탐색 회귀 없음(R7), 미로드 시 region-lookup이 null 폴백.
    const [loading, error] = useKakaoLoader({ appkey, libraries: ["services"] });
    const mapRef = useRef<kakao.maps.Map | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        moveTo: (coords) => {
          const map = mapRef.current;
          if (!map) return;
          map.panTo(new kakao.maps.LatLng(coords.lat, coords.lng));
        },
        zoomIn: () => {
          const map = mapRef.current;
          if (!map) return;
          map.setLevel(Math.max(MIN_LEVEL, map.getLevel() - 1), {
            animate: true,
          });
        },
        zoomOut: () => {
          const map = mapRef.current;
          if (!map) return;
          map.setLevel(Math.min(MAX_LEVEL, map.getLevel() + 1), {
            animate: true,
          });
        },
      }),
      [],
    );

    if (error) {
      return <MapFallback onRetry={onRetry} />;
    }

    return (
      <Map
        center={center}
        level={DEFAULT_LEVEL}
        isPanto
        className="h-full w-full"
        aria-busy={loading}
        onCreate={(map) => {
          mapRef.current = map;
          onViewportChange(toViewport(map));
        }}
        onIdle={(map) => onViewportChange(toViewport(map))}
      >
        {overlayCells?.map((cell) => (
          <Polygon
            key={cell.id}
            path={boundsToPath(cell.bounds)}
            strokeWeight={1}
            strokeColor={semantic.primary}
            strokeOpacity={OVERLAY_STROKE_OPACITY}
            fillColor={semantic.primary}
            fillOpacity={OVERLAY_FILL_OPACITY}
            // 핸들러 미등록이면 onClick도 없음 — 표시 전용 기존 동작 유지 (MSG-122, R3)
            onClick={
              onOverlayCellClick
                ? () => onOverlayCellClick(cell.id)
                : undefined
            }
          />
        ))}
      </Map>
    );
  },
);
KakaoMapView.displayName = "KakaoMapView";
