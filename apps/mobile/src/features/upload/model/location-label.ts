/**
 * 업로드 위치 라벨 파생 (기준 20) — 웹 `use-upload-location.ts`의 순수 함수 부분을
 * 옮긴 모바일 복제본 (`location-label.parity.test.ts`가 동등성을 고정한다).
 * mock 상수("부산 부산진구 서면 · 서면 A-14")를 폐기하고 `GET /api/regions/reverse-geocode`의
 * `regionName`(행정동)을 쓴다. 무귀속 좌표(바다 등 — data null)는 일반 라벨로 폴백한다.
 *
 * "서면 A-14" 같은 셀 조합 표기는 업로드 **확정 응답**(zoneName·zoneCell)부터 가능하다 —
 * 업로드 전에는 point→zone 라벨 API가 없다(Figma 오탐 방지 4).
 *
 * 훅(좌표 확보 + 조회)은 `api/use-upload-location.ts`가 담당한다 — 여기는 판정만 하므로
 * 플랫폼 API 무의존이다.
 */

/** 역지오코딩 응답의 관측 표면 — 생성 DTO(RegionResponseDto)의 구조적 부분집합 */
export interface RegionLabelSource {
  regionName?: string;
}

/** 행정동 응답이 있으면 regionName, 없으면 "현재 위치" */
export const formatUploadLocationLabel = (
  region: RegionLabelSource | null | undefined,
): string => region?.regionName ?? "현재 위치";
