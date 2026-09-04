import { useMemo, useRef, useState } from "react";
import {
  Container,
  Marker,
  NaverMap,
  NavermapsProvider,
  Polygon,
  Polyline,
} from "react-naver-maps";
import { semantic } from "@fillmap/design-tokens";
import { RetryNotice, ZoomControl } from "@fillmap/ui-web";
import { boundsCenter, type Bounds } from "@/entities/cell";
// 순수 파생만 가져온다 — 548 소유 파일이라 import 전용(수정 금지)
import { rectCornersAt } from "@/features/event-submission/model/submission-area";
import {
  exposureBounds,
  locationLabel,
  locationToneAt,
  rectTopCenter,
  type LocationTone,
} from "@/features/admin-review/model/review-decision";
import {
  buildGridLines,
  GRID_MIN_ZOOM,
} from "@/features/map-home/model/grid-overlay";
import { MAX_ZOOM, MIN_ZOOM } from "@/features/map-home/model/map-scale";
import type {
  EventSubmissionAreaRectDto,
  EventSubmissionLocationResponseDto,
} from "@/shared/api/generated/types.gen";
import { MapLoadErrorBoundary } from "@/shared/naver-maps/MapLoadErrorBoundary";
import { resetNaverMapsPreflight } from "@/shared/naver-maps/naver-sdk-loader";
import { useNaverMapsPreflight } from "@/shared/naver-maps/use-naver-maps-preflight";

/**
 * 심사 영역 검토 전용 지도 경계 (MSG-553 AC 6·7) — `react-naver-maps`·`naver` 전역
 * 참조는 이 파일에만 둔다(RN 경계: 지도 격리). props는 순수 데이터뿐이다.
 *
 * 유저 지도(`pages/map-home/ui/MapCanvas`)도 위저드 지도(`pages/org/ui/AreaMapCanvas`)도
 * 재사용하지 않는다: 전자는 클러스터·경로·미션 등 이 화면과 무관한 책임이 대부분이고,
 * 후자는 드로잉 전용(`draggable={false}`·드래그 핸들러)이라 읽기 전용 + 패닝인 이 화면과
 * 계약이 다르다. 게다가 둘 다 `pages/`라 pages→pages import가 금지다. 공유하는 것은
 * 조각들이다: 프리플라이트 훅·로드 실패 경계(shared/naver-maps) · 격자선 파생과 줌 게이트
 * (features/map-home/model) · 사각형 꼭짓점(547) · 표시 파선(features/admin-review/model).
 *
 * 이 화면은 **지도 조작이 요구**라 `draggable`을 켠다(티켓 "지도 이동·줌" 명시) —
 * 위저드 지도와 갈리는 지점이다. 폴백 전환 분기는 `MapLoadErrorBoundary` **안쪽**에
 * 둔다(MSG-547 codex 리뷰 P2 계약: 밖에서 하위 트리를 갈아끼우면 인증 실패 언마운트 때
 * SDK cleanup이 던지는 TypeError가 라우터 루트까지 올라가 앱이 죽는다).
 */

interface ReviewAreaMapProps {
  /** 신청 위치 — 순번 오름차순, 각 위치의 사각형 전부를 오버레이한다 */
  locations: EventSubmissionLocationResponseDto[];
  /** 전 위치 셀 합집합의 경계 사각형 — 서버 파생(FE 계산 아님) */
  exposureRect: EventSubmissionAreaRectDto;
}

const NAVER_NCP_KEY_ID = import.meta.env.VITE_NAVER_MAP_NCP_KEY_ID as
  | string
  | undefined;

// 유저 지도·위저드 지도와 같은 프리플라이트 URL을 쓴다 — 검증된 로드 경로 답습 +
// 세 화면이 같은 스크립트·전역을 공유한다 (geocoder는 이 화면에서 쓰지 않는다)
const NAVER_SUBMODULES = ["geocoder"];

/** 격자선 — 유저 지도와 같은 점선 사양(MSG-263: 1.5px shortdash primary) */
const GRID_LINE_STROKE_WEIGHT = 1.5;
/** 위치 사각형 — 점령 셀 사양 준용(채움 40% + 테두리 60%) */
const AREA_STROKE_OPACITY = 0.6;
const AREA_FILL_OPACITY = 0.35;
/** 노출 범위 — 점선 테두리만(채움 없음, Figma 15525:9683) */
const EXPOSURE_STROKE_WEIGHT = 2;

/** 색조 → SDK 색 값. 판정은 `locationToneAt`(순수)가 하고 여기서는 옮기기만 한다 */
const TONE_COLOR: Record<LocationTone, string> = {
  primary: semantic.primary,
  accent: semantic.accent,
  warning: semantic.warning,
};

/** 색조 → 라벨 캡슐 점 클래스 (지도 DOM도 같은 document라 토큰 클래스가 그대로 먹는다) */
const TONE_DOT_CLASS: Record<LocationTone, string> = {
  primary: "bg-primary",
  accent: "bg-accent",
  warning: "bg-warning",
};

/**
 * HTML 이스케이프 — 라벨은 서버가 준 구역명·행정동이라 그대로 innerHTML에 넣으면
 * 마크업이 주입된다(MSG-395 MapCanvas와 같은 이유). MapCanvas의 동명 헬퍼와 중복이지만
 * 그 파일은 이 티켓의 무접촉 대상(pages/map-home)이라 이관은 후속 몫이다.
 */
const escapeHtml = (text: string): string =>
  text.replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char] ?? char,
  );

/** 라벨 캡슐 HTML — 네이버 Marker HtmlIcon content (MapCanvas 이름표 사양 준용) */
const capsuleContent = (text: string, dotClass: string | null): string =>
  `<div class="flex -translate-x-1/2 -translate-y-full items-center gap-xxs whitespace-nowrap rounded-full bg-background px-xs py-0.5 text-fm-caption text-foreground shadow-raised">${
    dotClass !== null
      ? `<span class="size-1.5 rounded-full ${dotClass}"></span>`
      : ""
  }${escapeHtml(text)}</div>`;

/** 노출 범위 라벨 — 영문 병기 없이 한글만 (승인 질문 9) */
const EXPOSURE_LABEL = "노출 범위";

/** SDK 로드 실패·키 미설정 공용 폴백 (AC 12) */
const ReviewMapFallback = ({ onRetry }: { onRetry: () => void }) => (
  <div className="flex h-full w-full items-center justify-center bg-surface px-lg">
    <RetryNotice message="지도를 불러오지 못했어요" onRetry={onRetry} />
  </div>
);

export const ReviewAreaMap = (props: ReviewAreaMapProps) => {
  // 재시도 시 로드 경계·인증 상태를 다시 태우기 위해 하위 뷰를 remount
  const [attempt, setAttempt] = useState(0);
  const retry = () => {
    resetNaverMapsPreflight();
    setAttempt((n) => n + 1);
  };

  return (
    <section
      aria-label="심사 영역 지도"
      className="relative h-full min-w-0 flex-1"
    >
      {NAVER_NCP_KEY_ID === undefined ? (
        <ReviewMapFallback onRetry={retry} />
      ) : (
        <ReviewNaverMapView
          key={attempt}
          ncpKeyId={NAVER_NCP_KEY_ID}
          onRetry={retry}
          {...props}
        />
      )}
    </section>
  );
};

interface ReviewNaverMapViewProps extends ReviewAreaMapProps {
  ncpKeyId: string;
  onRetry: () => void;
}

/** 지도 뷰포트 — 격자선 파생(buildGridLines)의 입력 */
interface ReviewViewport {
  bounds: Bounds;
  zoom: number;
}

const ReviewNaverMapView = ({
  ncpKeyId,
  locations,
  exposureRect,
  onRetry,
}: ReviewNaverMapViewProps) => {
  const sdkStatus = useNaverMapsPreflight(ncpKeyId, NAVER_SUBMODULES);
  const mapRef = useRef<naver.maps.Map | null>(null);
  const [viewport, setViewport] = useState<ReviewViewport | null>(null);
  /** 진입 카메라 맞춤은 1회다 — 이후 idle에서 다시 맞추면 관리자의 조작을 되돌린다 */
  const fittedRef = useRef(false);

  const camera = useMemo(() => exposureBounds(exposureRect), [exposureRect]);

  /** 지도 준비·이동 신호에서 뷰포트를 끌어온다 (격자선 파생의 입력) */
  const syncViewport = () => {
    const map = mapRef.current;
    if (map === null) return;
    const bounds = map.getBounds() as naver.maps.LatLngBounds;
    const sw = bounds.getSW();
    const ne = bounds.getNE();
    setViewport({
      bounds: {
        sw: { lat: sw.lat(), lng: sw.lng() },
        ne: { lat: ne.lat(), lng: ne.lng() },
      },
      zoom: map.getZoom(),
    });
  };

  /** 진입 시 노출 범위 전체가 보이게 맞춘다 (AC 6, 승인 질문 3) */
  const handleInit = () => {
    const map = mapRef.current;
    if (map !== null && !fittedRef.current) {
      fittedRef.current = true;
      map.fitBounds(
        new naver.maps.LatLngBounds(
          new naver.maps.LatLng(camera.sw.lat, camera.sw.lng),
          new naver.maps.LatLng(camera.ne.lat, camera.ne.lng),
        ),
      );
    }
    syncViewport();
  };

  const zoomBy = (step: number) => {
    const map = mapRef.current;
    if (map === null) return;
    map.setZoom(
      Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, map.getZoom() + step)),
      true,
    );
  };

  const gridLines = useMemo(
    () =>
      viewport === null ? [] : buildGridLines(viewport.bounds, viewport.zoom),
    [viewport],
  );

  const sdkFailed = sdkStatus === "failed";

  return (
    <>
      <MapLoadErrorBoundary fallback={<ReviewMapFallback onRetry={onRetry} />}>
        {sdkFailed ? (
          <ReviewMapFallback onRetry={onRetry} />
        ) : sdkStatus === "loading" ? (
          <div className="h-full w-full bg-surface" aria-busy="true" />
        ) : (
          <NavermapsProvider ncpKeyId={ncpKeyId} submodules={NAVER_SUBMODULES}>
            <Container
              className="h-full w-full"
              fallback={<div className="h-full w-full" aria-busy="true" />}
            >
              <NaverMap
                ref={mapRef}
                defaultCenter={boundsCenter(camera)}
                defaultZoom={GRID_MIN_ZOOM}
                // 심사는 지도 조작이 요구다 (티켓 "이동·줌") — 위저드 지도와 갈리는 지점
                draggable
                scaleControl={false}
                onInit={handleInit}
                onIdle={syncViewport}
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

                {/* 노출 범위 — 점선 테두리만, 위치 사각형 아래에 깔린다 */}
                <Polygon
                  paths={[rectCornersAt(exposureRect)]}
                  strokeWeight={EXPOSURE_STROKE_WEIGHT}
                  strokeColor={semantic.textPrimary}
                  strokeStyle="dash"
                  fillOpacity={0}
                />

                {locations.map((location, index) => {
                  const color = TONE_COLOR[locationToneAt(index)];
                  return location.areaRects.map((rect, rectIndex) => (
                    <Polygon
                      // 위치 순번 + 사각형 인덱스가 식별자다 — 같은 사각형이 두 번 실릴 수 있다
                      key={`${location.order}-${rectIndex}`}
                      paths={[rectCornersAt(rect)]}
                      strokeWeight={1}
                      strokeColor={color}
                      strokeOpacity={AREA_STROKE_OPACITY}
                      fillColor={color}
                      fillOpacity={AREA_FILL_OPACITY}
                    />
                  ));
                })}

                <Marker
                  position={rectTopCenter(exposureRect)}
                  title={EXPOSURE_LABEL}
                  icon={{ content: capsuleContent(EXPOSURE_LABEL, null) }}
                />

                {locations.map((location, index) => {
                  const anchorRect = location.areaRects[0];
                  if (anchorRect === undefined) return null;
                  const label = locationLabel(location);
                  return (
                    <Marker
                      key={location.order}
                      position={rectTopCenter(anchorRect)}
                      title={label}
                      icon={{
                        content: capsuleContent(
                          label,
                          TONE_DOT_CLASS[locationToneAt(index)],
                        ),
                      }}
                    />
                  );
                })}
              </NaverMap>
            </Container>
          </NavermapsProvider>
        )}
      </MapLoadErrorBoundary>

      {/* 줌 컨트롤은 지도가 실제로 떠 있을 때만 — 폴백·로딩 화면에는 얹지 않는다 */}
      {sdkStatus === "ready" && (
        <ZoomControl
          className="absolute right-md bottom-md z-10"
          onZoomIn={() => zoomBy(1)}
          onZoomOut={() => zoomBy(-1)}
        />
      )}
    </>
  );
};
