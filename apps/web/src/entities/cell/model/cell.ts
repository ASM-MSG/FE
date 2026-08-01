import type { GridGlobalVideoResponseDto } from "@/shared/api/generated/types.gen";

/**
 * 위경도 좌표 (플랫폼 중립).
 * 명세(shared/api/generated)의 동명 `LatLng`(미션 도형용, `lon` 사용)과 다른 타입이다 —
 * 프론트 도메인은 `lng`를 쓴다. import 시 혼동 주의 (MSG-289 리스크 3).
 */
export interface LatLng {
  lat: number;
  lng: number;
}

/** 지도 뷰포트 경계 — 남서(sw)/북동(ne) 꼭짓점 좌표 */
export interface Bounds {
  sw: LatLng;
  ne: LatLng;
}

/**
 * 명세 대응 필드 (MSG-289) — `GridGlobalVideoResponseDto`에서 type-only 파생.
 * 응답 DTO는 전 필드 optional이라(백엔드 required 미명시) 화면 계약이 요구하는
 * 필드를 Required로 승격한다. 명세 필드명 변경·제거 시 이 Pick이 typecheck로 잡는다.
 * - videoId: 영상 ID (number) — 단건 재생(GET /api/videos/{videoId}) 진입 키
 * - viewCount: 조회수(원시 값) — 표시 시 formatViewCount로 축약
 * - recordedAt: 촬영 시각 (date-time) — 표시 시 formatRelativeTime으로 상대 시간화.
 *   명세는 타임존 없는 로컬 표기("2026-07-20T18:03:11"), 목은 UTC ISO — 실연동 시 오차 여지 (리스크 4)
 * - durationSec: 영상 길이(초, 명세상 최대 30)
 * - thumbnailUrl: 썸네일 URL — 없으면 placeholder 표시
 */
type CellVideoSpecFields = Required<
  Pick<
    GridGlobalVideoResponseDto,
    "videoId" | "viewCount" | "recordedAt" | "durationSec"
  >
> &
  Pick<GridGlobalVideoResponseDto, "thumbnailUrl">;

/**
 * FE 확장 필드 — 명세(GridGlobalVideoResponseDto)에 대응이 없는 화면 전용 필드 (MSG-289).
 * title은 명세 전체에 영상 제목 필드가 없어 유지한다 — 백엔드 환류 후보 (리스크 2).
 */
export interface CellVideoExtension {
  /** 영상 제목 — 명세 부재, FE 확장 (백엔드 환류 후보) */
  title: string;
  /**
   * 업로더 핸들 (표시 문자열, 예: "@minji_b") — 홈 셀 상세의 다른 사용자 카드 메타 (MSG-253).
   * 선택 필드로 추가만 — 기존 feature(explore·dex) 표시에는 영향 없음
   */
  uploaderHandle?: string;
  /**
   * 재생 소스 URL — 홈 미니 디테일 패널의 HTML5 video src (MSG-277 3차 AC 5·7).
   * 명세에선 목록 응답에 없고 단건 `VideoPlaybackResponseDto.playbackUrl`에만 존재 — FE 확장.
   * 실 스트리밍 전까지 목은 외부 CC0 샘플을 순환 배정한다. 선택 필드로 추가만 —
   * 기존 feature(explore·dex) 표시에는 영향 없음. 없으면 플레이스홀더 표시
   */
  videoSrc?: string;
}

/** 격자에 속한 개별 영상 (상세 시트 "이 격자의 영상" 리스트 항목, MSG-115) = 명세 대응 + FE 확장 */
export type CellVideo = CellVideoSpecFields & CellVideoExtension;

/**
 * 격자 도메인 모델 — FE 화면 집계 확장 타입 (MSG-289).
 * 명세에 단일 대응 스키마가 없다 — `ExploreGridResponseDto`(격자 카드) + `RegionResponseDto`(행정동)
 * + `RegionStatResponseDto`(수집률) + `GridVideoPageResponseDto`(영상 목록)의 화면 집계라
 * satisfies 연결 없이 유지한다. 필드별 명세 출처는 각 필드 주석 참조.
 */
export interface Cell {
  /**
   * 격자 id — mock 체계 "A-14". 명세는 "{gridY}_{gridX}"(예: "41642_110458") —
   * 화면 라벨·grid 로직(MSG-263/264)과 얽혀 있어 체계 전환은 실연동 후속 티켓 (MSG-289 질문 5 승인)
   */
  id: string;
  /** 지역명 + 코드 (예: "서면 A-14") — 명세 출처: RegionResponseDto.regionName + gridId 파생 */
  label: string;
  /** 행정구(區) 이름 (예: "부산진구") — 지역 필터 매칭 키 (MSG-114 D1). 명세 출처: RegionResponseDto */
  district: string;
  /** 격자 중심 좌표 — 명세 출처: ExploreGridResponseDto.gridY/gridX 디코드 */
  center: LatLng;
  /** 격자에 속한 영상 수 — 명세 출처: ExploreGridResponseDto.videoCount */
  videoCount: number;
  /** 격자 생성 시각 (ISO 8601) — "최신순" 정렬 기준 (D3). 명세 대응 없음 (FE 확장) */
  createdAt: string;
  /** 대표 영상 길이(초) — 카드 길이 배지용. 없으면 배지 미표시 (S6). 명세 출처: ExploreGridResponseDto.coverDurationSec */
  durationSec?: number;
  /** 상세 위치 문자열 (예: "부산 부산진구 서면") — 상세 시트 표시 (MSG-115). 명세 출처: RegionResponseDto.regionName 파생 */
  location: string;
  /** 최근 업로드 시각 (ISO 8601) — 상세 시트 상대 시간 표시 (MSG-115). 명세 대응 없음 (FE 확장) */
  recentUploadedAt: string;
  /** 담수율(%) — 상세 시트 통계 (MSG-115). 명세 출처: RegionStatResponseDto.progressRate */
  fillRate: number;
  /** 격자 누적 조회수(원시 값) — 상세 시트 통계, 표시 시 축약 (MSG-115). 명세 대응 없음 (FE 확장) */
  viewCount: number;
  /** 개별 영상 목록 — 상세 시트 리스트. 대표 영상은 videos[0] (MSG-115). 명세 출처: GridVideoPageResponseDto.videos */
  videos: CellVideo[];
}
