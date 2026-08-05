/**
 * 업로드 플로우 표시 문구 상수 (MSG-302·305) — 위치 mock은 부산 서면 기준.
 * "서면 A-14"는 셀 체계(cell-{col}-{row})에서 파생되지 않는 표시 전용 mock —
 * 실제 현재 위치 격자 연동은 범위 밖 (302 리스크 2).
 */

/** 파일 제약 안내 (302 AC 2) — 제약 검증 자체는 제외 범위 */
export const FILE_CONSTRAINT_TEXT = "최대 30초 · MP4, MOV · 500MB 이하";

/** 302 위치 태그 칩 문구 (AC 4) */
export const LOCATION_TAG_TEXT = "서면 A-14 (현재 위치)";

/** 305 위치 카드 문구 (AC 5) — 302와 단일 출처 */
export const LOCATION_FULL_TEXT = "부산 부산진구 서면 · 서면 A-14";
