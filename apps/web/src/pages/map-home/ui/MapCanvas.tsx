import {
  Component,
  Fragment,
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
import type { Bounds, CellCorners, LatLng } from "@/entities/cell";
import {
  drillInZoomForUnit,
  type AggregationUnit,
} from "@/features/map-home/model/aggregation-unit";
import { MAX_ZOOM, MIN_ZOOM } from "@/features/map-home/model/map-scale";
import {
  applyButton,
  applyWheel,
  initialZoomStepState,
  type ZoomStep,
  type ZoomStepState,
} from "@/features/map-home/model/zoom-step-policy";
import type { MissionMarkerTheme } from "@/features/map-home/model/region-cluster-overlay";
import { THEME_META } from "@/features/map-home/model/theme";
import { buildHatchLines } from "@/features/map-home/model/theme-overlay";
import type { Viewport } from "@/features/map-home/model/viewport-store";
import { THEME_FILL_CLASS } from "./theme-classes";
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
  /** 지정 줌 단으로 이동 (MSG-395 AC 19) — 유효 범위로 클램프한다 */
  zoomTo: (zoom: number) => void;
  /** 지정 영역이 다 보이게 맞춘다 (MSG-403 후속) — 코스 선택 시 그 코스로 이동 */
  fitBounds: (bounds: Bounds) => void;
}

/**
 * 지도에 그릴 사각 오버레이 한 칸 — 순수 데이터(id + 꼭짓점 4점). 좌표→기하 변환은 호출부 몫.
 * MSG-357: 5179 셀은 위경도 평면에서 기울어져 있어 Bounds가 아니라 꼭짓점 링을 받는다.
 * 스타일 필드(MSG-252·263)는 옵셔널 — 미지정이면 현행 primary 렌더 그대로 (기존 도감 오버레이 불변, AC 13)
 */
export interface MapCellOverlay {
  id: string;
  /** 셀 꼭짓점 — 남서→남동→북동→북서 (Polygon paths 링으로 그대로 쓴다) */
  corners: CellCorners;
  /** 채움·테두리 색 (테마 토큰 hex) — 미지정 시 primary (MSG-252 AC 6) */
  color?: string;
  /** 빗금 표시 (테마 셀 ∩ 내 점령 — MSG-252 AC 7, R1: 사선 Polyline 근사) */
  hatched?: boolean;
  /** 점령 셀 스타일 (MSG-263 AC 10 — Figma: 채움 18% + 실선 테두리 40%) */
  occupied?: boolean;
  /** 재생 중 격자 테두리 강조 (MSG-328 사용자 피드백) — 진한 실선, 색 없는 셀은 채움 0 */
  emphasized?: boolean;
}

/** 지도에 그릴 격자선 한 선분 — 순수 데이터(id + 두 끝점). 파생(경계 절단·컬링)은 호출부 몫 (MSG-263 AC 9) */
export interface MapGridLine {
  id: string;
  path: [LatLng, LatLng];
}

/** 지도에 그릴 경로 오버레이 — 연결선 정점 + 번호 경유지 + 경로 색 (MSG-252 AC 8) */
export interface MapRouteOverlay {
  /** 코스 식별자 — 코스가 목록으로 여럿 그려지므로 렌더 키가 필요하다 (MSG-395) */
  id: string;
  path: LatLng[];
  waypoints: { seq: number; position: LatLng }[];
  color: string;
}

/** 지도에 그릴 이름표 마커 — 미션·코스 이름 (MSG-395 AC 16·18·21) */
export interface MapLabelOverlay {
  id: string;
  position: LatLng;
  text: string;
  color: string;
}

/**
 * 지도에 그릴 지역 집계 마커 한 개 — 순수 데이터 (MSG-264 → MSG-410 서버 집계 전환).
 * 파생(items[] 매핑·겹침 병합)은 호출부 몫(region-cluster-overlay).
 * 클릭 시 마커 좌표 중심 + 단위 안쪽 줌으로 이동한다 (AC 8).
 */
export interface MapClusterOverlay {
  id: string;
  position: LatLng;
  /** 지역명 — null이면 개수만 표시(미판정 버킷·병합 마커, AC 4·추정 2) */
  name: string | null;
  count: number;
  /** 집계 단위 — 마커 크기 3단(동<구<시, Figma 14599:7042~7048)과 클릭 목표 줌의 근거 */
  unit: AggregationUnit;
  /**
   * 미션 집계 마커의 소속 칩 (MSG-451 AC 6) — 채움색·문구가 갈린다.
   * 없으면 도감 점령 집계 마커(primary 채움) — 기존 렌더 그대로.
   * Figma에 미션용 클러스터 노드가 없어, 도감 마커(14599:7041) 형태에 채움만 테마
   * 토큰으로 바꾼 것이 정본이다 (MSG-437 "색만 미션용으로 구분").
   */
  theme?: MissionMarkerTheme;
}

interface MapCanvasProps {
  /** 초기 중심 좌표 (geolocation 결과 반영) */
  center: LatLng;
  /** 이동/줌 등으로 뷰포트가 바뀔 때 호출 (스토어 push) */
  onViewportChange: (viewport: Viewport) => void;
  /** 반투명 사각 오버레이 목록 (MSG-121 수집 격자) — 미제공/빈 배열이면 기존 동작과 동일(R3) */
  overlayCells?: MapCellOverlay[];
  /** 점선 격자선 목록 (MSG-263 AC 9) — 미제공/빈 배열이면 기존 동작과 동일 */
  gridLines?: MapGridLine[];
  /** 경로 오버레이 목록 (MSG-252 AC 8 → MSG-395 다중화) — 미제공/빈 배열이면 기존 동작과 동일 */
  routes?: MapRouteOverlay[];
  /** 이름표 마커 목록 (MSG-395 AC 16·18·21) — 미제공/빈 배열이면 기존 동작과 동일 */
  labels?: MapLabelOverlay[];
  /** 클러스터 마커 목록 (MSG-264) — 미제공/빈 배열이면 기존 동작과 동일 */
  clusters?: MapClusterOverlay[];
  /** 오버레이 셀 클릭 (MSG-122 AC 14·18) — 미제공이면 표시 전용 기존 동작과 동일(R3) */
  onOverlayCellClick?: (cellId: string) => void;
}

const NAVER_NCP_KEY_ID = import.meta.env.VITE_NAVER_MAP_NCP_KEY_ID as
  | string
  | undefined;

// geocoder: MSG-327에서 유일 소비처(도감 역지오코딩 region-lookup)가 사라졌다 — 수집률을
// 서버 by-point가 계산해 주면서 FE 역지오코딩이 불필요해졌기 때문이다. 서브모듈 목록은
// SDK 프리플라이트 URL에 들어가 지도 인증 경로에 닿으므로, 제거는 지도 티켓에서 따로 다룬다.
// 실제 fetch되는 프리플라이트 URL에는 이 목록만 쓴다 — Provider 쪽은 재시도 시
// 캐시 키 마커가 덧붙을 수 있다(NaverMapView의 providerSubmodules 주석 참조)
const NAVER_SUBMODULES = ["geocoder"];

// 진입 시 격자가 보이는 최소 줌 = GRID_MIN_ZOOM (MSG-357 후속 — 게이트 상향에 맞춰 15→16,
// 첫 화면이 클러스터로 열리지 않게 유지) — viewport-store 초기값과 동일
const DEFAULT_ZOOM = 16;
// 네이버 지도 zoom 유효 범위(A2)는 map-scale 단일 정의를 공유한다 — SDK 내부 클램핑에 기대지 않고 명시한다

/**
 * 스텝 판정 결과를 지도에 적용 (MSG-462 AC 1·2) — 버튼·휠이 같은 경로를 쓴다.
 * 클램프는 map-scale 단일 정의 그대로다 (AC 5). step 0(쿨다운·임계 미달)이면 무동작.
 */
const applyZoomStepToMap = (map: naver.maps.Map, step: ZoomStep): void => {
  if (step === 0) return;
  map.setZoom(
    Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, map.getZoom() + step)),
    true,
  );
};

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
    console.error(
      "[MapCanvas] 지도 SDK 하위 트리 예외를 흡수하고 폴백으로 전환:",
      error,
    );
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
  (
    {
      center,
      onViewportChange,
      overlayCells,
      gridLines,
      routes,
      labels,
      clusters,
      onOverlayCellClick,
    },
    ref,
  ) => {
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
        gridLines={gridLines}
        routes={routes}
        labels={labels}
        clusters={clusters}
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
// 점령 셀(MSG-263 AC 10) — Figma 13847:876 정본: 채움 rgba(0,102,204,0.18) + 실선 테두리
// rgba(0,102,204,0.4). 색은 semantic.primary(#0066CC)와 동일 — 투명도만 상수로 분리
const OCCUPIED_STROKE_OPACITY = 0.4;
const OCCUPIED_FILL_OPACITY = 0.18;
// 격자선(MSG-263 AC 9) — Figma 미점령 셀 점선 테두리 1.5px. 네이버 SDK는 dash 간격 직접 지정이
// 없어 shortdash 프리셋으로 근사한다 (스펙 R2 — 점선 계열이면 통과)
const GRID_LINE_STROKE_WEIGHT = 1.5;
// 빗금 선(MSG-252 AC 7, R1) — 채움보다 진하게 그려 교집합이 한눈에 구분되게 한다
const HATCH_STROKE_WEIGHT = 2;
const HATCH_STROKE_OPACITY = 0.85;
// 재생 중 격자 테두리 강조(MSG-328 사용자 피드백) — 기본 셀 테두리(1)보다 두껍고 불투명한
// 실선으로 "border가 진해지는" 효과. 색은 셀 색 규칙 그대로(색 미지정이면 primary 토큰)
const EMPHASIS_STROKE_WEIGHT = 3;
const EMPHASIS_STROKE_OPACITY = 1;
// 경로 연결선(MSG-252 AC 8) — 이동 동선이라 셀 테두리(1)보다 두껍게
const ROUTE_STROKE_WEIGHT = 4;
const ROUTE_STROKE_OPACITY = 0.9;

/**
 * 경로 경유지 번호 마커 HTML (MSG-252 AC 8) — 네이버 Marker HtmlIcon content.
 * 마커 앵커는 좌상단 기준이라 translate로 원 중심을 좌표에 맞춘다 (naver.maps.Point 앵커 불요).
 * 지도 DOM은 같은 document라 tailwind 토큰 클래스가 그대로 적용된다 — 색 임의값 없이 토큰만.
 * seq는 정적 목 경로(theme.ts) 숫자 전제 — 경로 데이터가 서버/사용자 입력을 포함하게 되면 이스케이프 필요.
 */
const routeMarkerContent = (seq: number): string =>
  `<div class="flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-theme-route text-fm-body-strong text-primary-foreground shadow-raised">${seq}</div>`;

// 지역 집계 마커 크기 3단 — 단위 기준 동<구<시 (MSG-410 AC 4, Figma 14599:7042~7048
// variant `단위=동/구/시`, 1x 실측 68/80/92px — 흰 링 3px 포함 border-box 전체 지름).
// count 기준 tier 3단은 폐기됐다 (추정 4). 값 변경 시 병합 임계
// MARKER_MERGE_PX(region-cluster-overlay)도 함께 갱신할 것
const CLUSTER_UNIT_SIZE_CLASS: Record<AggregationUnit, string> = {
  DONG: "size-17",
  SIGUNGU: "size-20",
  SIDO: "size-23",
};

/** count 서식 — 천 단위 구분 (구 "99+" 캡 폐기: 디자인이 세 자리 수치를 그대로 보여준다) */
const formatClusterCount = (count: number): string =>
  count.toLocaleString("ko-KR");

/**
 * 지역 집계 원형 마커 HTML (MSG-410 AC 4) — 이름 위·개수 아래, 파랑은 primary 토큰 클래스
 * (hex 하드코딩 금지). 흰 링은 Figma 정본(14599:7041)의 3px 백색 스트로크 — 지도 타일과
 * 마커를 분리하는 테두리라 지면색 토큰 border-background로 표현한다.
 * name은 서버가 준 지역명이라 이스케이프한다. null이면 개수만 표시.
 */
const clusterMarkerContent = ({
  name,
  count,
  unit,
  theme,
}: MapClusterOverlay): string =>
  `<div class="flex ${CLUSTER_UNIT_SIZE_CLASS[unit]} -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-3 border-background ${theme ? THEME_FILL_CLASS[theme] : "bg-primary"} text-primary-foreground shadow-raised">${name !== null ? `<span class="max-w-full truncate px-xxs text-fm-caption">${escapeHtml(name)}</span>` : ""}<span class="text-fm-body-strong">${formatClusterCount(count)}</span></div>`;

/**
 * 집계 마커 접근성 이름 — 스크린리더 대체 텍스트이자 e2e 셀렉터 계약.
 * 미션 집계 마커는 세는 대상이 격자가 아니라 그 칩의 행사다 (MSG-451 AC 6, 추정 2).
 */
const clusterMarkerTitle = ({
  name,
  count,
  theme,
}: MapClusterOverlay): string => {
  const subject = theme ? THEME_META[theme].label : "점령 격자";
  return name !== null
    ? `${name} ${subject} ${count}개`
    : `${subject} ${count}개`;
};

/**
 * HTML 이스케이프 — 이름표 텍스트는 **서버가 준 미션 제목**이라 그대로 innerHTML에 넣으면
 * 마크업이 주입된다. 클러스터·경유지 마커는 숫자 전제라 필요 없었던 처리다 (MSG-395).
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

/**
 * 미션·코스 이름표 HTML (MSG-395 AC 16·18·21) — 흰 알약에 테마 색 점 + 이름.
 * 앵커가 격자 남서 꼭짓점이라 타일 왼쪽 아래에 걸리게 아래로 살짝 내린다.
 */
const labelMarkerContent = ({ text, color }: MapLabelOverlay): string =>
  `<div class="flex translate-y-1 items-center gap-xxs whitespace-nowrap rounded-full bg-background px-xs py-0.5 text-fm-caption text-foreground shadow-raised"><span class="size-1.5 rounded-full" style="background-color:${color}"></span>${escapeHtml(text)}</div>`;

const NaverMapView = forwardRef<MapCanvasHandle, NaverMapViewProps>(
  (
    {
      ncpKeyId,
      attempt,
      center,
      onViewportChange,
      overlayCells,
      gridLines,
      routes,
      labels,
      clusters,
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
    // 줌 스텝 리미터 상태 (MSG-462 AC 1·2) — 휠·트랙패드·줌 버튼이 이 하나를 공유한다
    const zoomStepRef = useRef<ZoomStepState>(initialZoomStepState);
    // 자체 휠 리스너를 붙일 호스트 — SDK 휠 줌(scrollWheel)은 꺼져 있다 (AC 3)
    const wheelHostRef = useRef<HTMLDivElement | null>(null);

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
        // 네이버 zoom은 클수록 확대 — 카카오 level과 방향 반대 (AC 4).
        // 버튼도 휠과 같은 리미터를 거친다 — 연타가 쿨다운 간격으로만 진행 (MSG-462 AC 2)
        zoomIn: () => {
          const map = mapRef.current;
          if (!map) return;
          const { state, step } = applyButton(
            zoomStepRef.current,
            1,
            performance.now(),
          );
          zoomStepRef.current = state;
          applyZoomStepToMap(map, step);
        },
        zoomOut: () => {
          const map = mapRef.current;
          if (!map) return;
          const { state, step } = applyButton(
            zoomStepRef.current,
            -1,
            performance.now(),
          );
          zoomStepRef.current = state;
          applyZoomStepToMap(map, step);
        },
        zoomTo: (zoom) => {
          mapRef.current?.setZoom(
            Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom)),
            true,
          );
        },
        fitBounds: ({ sw, ne }) => {
          // 클러스터 클릭 줌 인(zoomToCluster)과 같은 SDK 경로 — 경계는 이 안에서만 다룬다
          mapRef.current?.fitBounds(
            new naver.maps.LatLngBounds(
              new naver.maps.LatLng(sw.lat, sw.lng),
              new naver.maps.LatLng(ne.lat, ne.lng),
            ),
          );
        },
      }),
      [],
    );

    // 자체 휠 줌 (MSG-462 AC 1·3) — SDK 휠 줌을 끄고(scrollWheel=false) 스텝 정책을
    // 거쳐 ±1단씩만 줌한다. 트랙패드 핀치는 브라우저가 ctrl+wheel로 주므로 같은 경로에
    // 잡히고, 터치스크린 핀치(pinchZoom)는 SDK 기본 유지(스펙 추정 6). preventDefault로
    // 페이지 스크롤·브라우저 페이지 줌(ctrl+wheel)을 막아야 해서 passive: false가 필수다.
    // 호스트 div는 SDK ready + 비실패 분기에서만 렌더된다 — 그 상태 전환에 맞춰 재부착
    useEffect(() => {
      const host = wheelHostRef.current;
      if (host === null) return;
      const handleWheel = (event: WheelEvent) => {
        event.preventDefault();
        const map = mapRef.current;
        if (!map) return;
        const { state, step } = applyWheel(
          zoomStepRef.current,
          event.deltaY,
          performance.now(),
        );
        zoomStepRef.current = state;
        applyZoomStepToMap(map, step);
      };
      host.addEventListener("wheel", handleWheel, { passive: false });
      return () => host.removeEventListener("wheel", handleWheel);
      // 핸들러는 ref만 참조한다 — 호스트 존재가 갈리는 분기 상태만 의존한다
      // (failed 파생은 아래 선언이라 원시 상태 둘을 직접 본다)
    }, [authFailed, sdkStatus]);

    const pushViewport = () => {
      const map = mapRef.current;
      if (map) onViewportChange(toViewport(map));
    };

    // 집계 마커 클릭 (MSG-410 AC 8) — SDK 접근은 이 경계 안에서만.
    // 마커 좌표를 중심으로 해당 단위 안쪽 줌(시→구 구간, 구→동 구간, 동→개별 격자 줌 —
    // drillInZoomForUnit, 추정 3)으로 이동한다. 구 멤버 bounds fitBounds는 서버 집계
    // 전환으로 멤버 목록이 사라져 폐기됐다.
    const zoomToCluster = (cluster: MapClusterOverlay) => {
      mapRef.current?.morph(
        new naver.maps.LatLng(cluster.position.lat, cluster.position.lng),
        drillInZoomForUnit(cluster.unit),
      );
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
          <div ref={wheelHostRef} className="h-full w-full">
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
                  // SDK 휠 줌 비활성 (MSG-462 AC 3) — 속도 옵션이 없는 SDK 기본 줌 대신
                  // 위 자체 휠 리스너 + 스텝 정책이 줌을 담당한다. 터치 핀치는 기본 유지
                  scrollWheel={false}
                  onInit={pushViewport}
                  onIdle={pushViewport}
                >
                  {/* 미점령 격자선(MSG-263 AC 9·12) — 경계 절단·컬링·줌 게이트는 파생(grid-overlay) 몫,
                    여기는 점선 Polyline 렌더만. 클릭 불요(Polyline 기본 비클릭) */}
                  {gridLines?.map((line) => (
                    <Polyline
                      key={line.id}
                      path={line.path}
                      strokeWeight={GRID_LINE_STROKE_WEIGHT}
                      strokeColor={semantic.primary}
                      strokeStyle="shortdash"
                    />
                  ))}
                  {overlayCells?.map((cell) => (
                    <Polygon
                      key={cell.id}
                      // MSG-357: 꼭짓점 4점(남서→남동→북동→북서 반시계 링)을 그대로 쓴다
                      paths={[cell.corners]}
                      // 재생 중 격자(emphasized — MSG-328)는 진한 실선 테두리로 강조한다
                      strokeWeight={
                        cell.emphasized ? EMPHASIS_STROKE_WEIGHT : 1
                      }
                      // 스타일 미지정 셀은 현행 primary 그대로 — 도감 오버레이·스모크 불변 (MSG-252 AC 13).
                      // occupied 셀은 Figma 점령 스타일(채움 18% + 실선 테두리 40% — MSG-263 AC 10)
                      strokeColor={cell.color ?? semantic.primary}
                      strokeOpacity={
                        cell.emphasized
                          ? EMPHASIS_STROKE_OPACITY
                          : cell.occupied
                            ? OCCUPIED_STROKE_OPACITY
                            : OVERLAY_STROKE_OPACITY
                      }
                      fillColor={cell.color ?? semantic.primary}
                      fillOpacity={
                        cell.occupied
                          ? OCCUPIED_FILL_OPACITY
                          : // 강조 전용 셀(테마 색 없음)은 테두리만 — 채움을 더하지 않는다
                            cell.emphasized && cell.color === undefined
                            ? 0
                            : OVERLAY_FILL_OPACITY
                      }
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
                      buildHatchLines(cell.corners).map((line, i) => (
                        <Polyline
                          key={`${cell.id}-hatch-${i}`}
                          path={line}
                          strokeWeight={HATCH_STROKE_WEIGHT}
                          strokeColor={cell.color ?? semantic.primary}
                          strokeOpacity={HATCH_STROKE_OPACITY}
                        />
                      )),
                    )}
                  {/* 지역 집계 마커 (MSG-410 AC 4·8) — zoom < GRID_MIN_ZOOM에서 셸이
                    서버 집계를 채움 대신 게시한다. title은 스크린리더 대체 텍스트(a11y) */}
                  {clusters?.map((cluster) => (
                    <Marker
                      key={cluster.id}
                      position={cluster.position}
                      title={clusterMarkerTitle(cluster)}
                      icon={{ content: clusterMarkerContent(cluster) }}
                      onClick={() => zoomToCluster(cluster)}
                    />
                  ))}
                  {/* 경로추천 오버레이 (MSG-252 AC 8 → MSG-395: 코스 목록만큼 다중) —
                    연결선 + 번호 경유지 마커. 라인이 빈 코스는 마커만 남는다 (AC 21) */}
                  {routes?.map((route) => (
                    <Fragment key={route.id}>
                      {route.path.length > 1 && (
                        <Polyline
                          path={route.path}
                          strokeWeight={ROUTE_STROKE_WEIGHT}
                          strokeColor={route.color}
                          strokeOpacity={ROUTE_STROKE_OPACITY}
                        />
                      )}
                      {route.waypoints.map((waypoint) => (
                        <Marker
                          key={waypoint.seq}
                          position={waypoint.position}
                          title={`경유지 ${waypoint.seq}`}
                          icon={{ content: routeMarkerContent(waypoint.seq) }}
                        />
                      ))}
                    </Fragment>
                  ))}
                  {/* 미션·코스 이름표 마커 (MSG-395 AC 16·18·21) */}
                  {labels?.map((label) => (
                    <Marker
                      key={label.id}
                      position={label.position}
                      title={label.text}
                      icon={{ content: labelMarkerContent(label) }}
                    />
                  ))}
                </NaverMap>
              </Container>
            </NavermapsProvider>
          </div>
        )}
      </MapLoadErrorBoundary>
    );
  },
);
NaverMapView.displayName = "NaverMapView";
