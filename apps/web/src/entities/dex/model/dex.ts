import type { LatLng } from "@/entities/cell";
import type {
  CollectionGridResponseDto,
  CollectionSummaryResponseDto,
  MyBadgeResponseDto,
  RegionVideoResponseDto,
} from "@/shared/api/generated/types.gen";

/*
 * MSG-289: 명세 대응 필드는 생성 타입(shared/api/generated)에서 type-only 파생한다.
 * 응답 DTO는 전 필드 optional이라(백엔드 required 미명시) 화면 계약이 요구하는 필드를
 * Required로 승격한다 — 명세 필드명 변경·제거 시 Pick이 typecheck로 잡는다.
 * 명세에 없는 화면 전용 필드는 FE 확장으로 분리해 교차(&)한다.
 */

/**
 * 개인 도감 요약 — 백엔드가 제공하는 표시값 (MSG-121, 2026-07-22 개정 반영).
 * 지역명은 이 요약에 없다 — 현재 위치 역지오코딩이 소유한다(개정 D2, A5 개정).
 * totalGridCount만 명세(CollectionSummaryResponseDto) 대응 — 나머지는 FE 확장:
 * nickname·avatarSrc는 프로필 축(명세 부재), streakDays는 명세 전체 부재(백엔드 환류 후보),
 * totalExploredPct는 대응 축 없음, badgeCount는 뱃지 목록 length로 유도 가능한 표시값.
 */
export type DexSummary = Required<
  Pick<CollectionSummaryResponseDto, "totalGridCount">
> & {
  nickname: string;
  /** 아바타 이미지 URL — 없으면 이니셜 fallback 표시 */
  avatarSrc?: string;
  /**
   * 전체 지도 기준 탐험 진행률(%) — Fog of World식 미소값 (개정 D1, mock 0.012).
   * 표시 전 0~100 클램프(AC 7) + formatExploredPct 포맷(AC 20)을 거친다.
   */
  totalExploredPct: number;
  /** 연속 기록 일수 — "연속 스트릭" 통계 카드 표시값 (헤더 요약에서는 제거 — D1 dedup) */
  streakDays: number;
  /** 획득 뱃지 수 — 통계 카드 표시값 */
  badgeCount: number;
};

/**
 * 사용자가 수집한 격자 — 최근 수집 목록·지도 오버레이의 단위 (MSG-121).
 * gridId·firstCollectedAt·videoCount는 명세(CollectionGridResponseDto) 대응 —
 * gridId 값은 mock 체계 "A-14"를 유지한다(명세 "{gridY}_{gridX}" 전환은 후속, MSG-289 질문 5).
 * label·district·center는 FE 확장 (regionName·gridY/gridX에서 파생 가능하나 형태가 달라 유지).
 */
export type CollectedCell = Required<
  Pick<CollectionGridResponseDto, "gridId" | "firstCollectedAt" | "videoCount">
> & {
  /** 격자 라벨 (예: "서면 A-14") — FE 확장 */
  label: string;
  /**
   * 행정구(區) 이름 (예: "부산진구") — 갤러리 지역 매핑 키 (MSG-122 AC 1·4).
   * Cell.district와 같은 체계 — FE 확장 (명세 regionName은 행정동 문자열이라 형태가 다름)
   */
  district: string;
  /** 격자 중심 좌표 — 행 클릭 시 지도 이동 목적지 (AC 16). FE 확장 (명세 gridY/gridX 디코드 파생은 후속) */
  center: LatLng;
};

/**
 * 사용자가 수집(업로드)한 개별 영상 — 갤러리 탭 썸네일 그리드의 단위 (MSG-122).
 * 한 격자에 영상이 여러 개면 각각 별도 항목이다 (티켓 명시).
 * videoId·gridId·thumbnailUrl·createdAt은 명세(RegionVideoResponseDto) 대응 —
 * videoId는 소속 격자 Cell.videos(CellVideo.videoId)와 같은 체계로, 썸네일 클릭 시
 * 상세 시트의 활성 영상 매칭 키다 (AC 23). cellLabel은 FE 확장.
 */
export type CollectedVideo = Required<
  Pick<RegionVideoResponseDto, "videoId" | "gridId" | "createdAt">
> &
  Pick<RegionVideoResponseDto, "thumbnailUrl"> & {
    /** 격자 라벨 denormalize (예: "서면 A-14") — 썸네일 대체 텍스트용 (AC 10). FE 확장 */
    cellLabel: string;
  };

/**
 * 뱃지 카탈로그 항목 — 뱃지 진열장의 단위 (MSG-123).
 * 획득 판정은 백엔드 소관(티켓 제외 범위) — 프론트는 earned를 표시만 한다.
 * badgeId·name·earned 전부 명세(MyBadgeResponseDto) 대응 — 화면이 아직 안 쓰는
 * code·description·iconUrl 등은 필요해지는 티켓에서 추가한다.
 */
export type DexBadge = Required<
  Pick<MyBadgeResponseDto, "badgeId" | "name" | "earned">
>;

/** 도감 조회 응답 — queryKey ["dex"]의 반환 계약 */
export interface DexData {
  summary: DexSummary;
  collectedCells: CollectedCell[];
  /**
   * 뱃지 카탈로그(획득+미획득 전체, 정의 순서 = 표시 순서 A2) — 도감 조회 응답의 일부라
   * 뱃지 탭이 use-dex-query의 로딩·오류 게이트를 공유한다 (MSG-123 AC 11, 티켓 명시).
   * 고정 카탈로그 — 획득 0개여도 비지 않는다 (AC 8).
   */
  badges: DexBadge[];
  /**
   * 지역(구)별 탐험률(%) 맵 (개정 D2) — 값 계산은 백엔드 소관 가정의 mock(A5 개정).
   * 키는 현재 위치 역지오코딩 결과(구 이름)와 매칭하며, 맵에 없는 지역은 0%로 처리한다(AC 21).
   * 명세는 `RegionStatResponseDto[]`(배열, regionCode/행정동 키, progressRate)라 구조·키
   * 체계가 다르다 — 전환은 역지오코딩 매칭 로직과 함께 실연동 후속 티켓 (MSG-289 질문 6 승인).
   */
  regionExploredPctMap: Record<string, number>;
}
