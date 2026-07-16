import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Map, useKakaoLoader } from "react-kakao-maps-sdk";
import { Button } from "@fillmap/ui-web";
import type { LatLng } from "@/entities/cell";
import type { Viewport } from "@/features/map-home/model/viewport-store";

/** 지도 명령 핸들 — 카카오맵 인스턴스 제어를 이 경계 밖으로 노출하지 않고 명령만 공개 */
export interface MapCanvasHandle {
  /** 지정 좌표로 부드럽게 이동 */
  moveTo: (coords: LatLng) => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

interface MapCanvasProps {
  /** 초기 중심 좌표 (geolocation 결과 반영) */
  center: LatLng;
  /** 이동/줌 등으로 뷰포트가 바뀔 때 호출 (스토어 push) */
  onViewportChange: (viewport: Viewport) => void;
}

const KAKAO_APP_KEY = import.meta.env.VITE_KAKAO_MAP_APP_KEY as
  | string
  | undefined;

const DEFAULT_LEVEL = 5;

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
  ({ center, onViewportChange }, ref) => {
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

const KakaoMapView = forwardRef<MapCanvasHandle, KakaoMapViewProps>(
  ({ appkey, center, onViewportChange, onRetry }, ref) => {
    const [loading, error] = useKakaoLoader({ appkey });
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
          map.setLevel(map.getLevel() - 1, { animate: true });
        },
        zoomOut: () => {
          const map = mapRef.current;
          if (!map) return;
          map.setLevel(map.getLevel() + 1, { animate: true });
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
      />
    );
  },
);
KakaoMapView.displayName = "KakaoMapView";
