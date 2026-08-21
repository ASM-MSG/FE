import { MAX_DURATION_SEC } from "./upload-validation";

/**
 * 업로드 선택 화면 표시 문구 (MSG-302 → MSG-424 정정).
 * 위치 mock 상수 2종(`LOCATION_TAG_TEXT`·`LOCATION_FULL_TEXT`)은 삭제됐다 —
 * 위치는 이제 역지오코딩 실데이터다(api/use-upload-location, 기준 20).
 */

/**
 * 파일 제약 안내 — 실 계약에 맞춘 값이다(D1 파생).
 * 구 문구 "최대 30초"는 원본 상한을 잘못 안내했다: 30초는 `POST /api/videos`의
 * `durationSec`(=선택 구간 길이) 상한이고, 원본 파일 상한은 180초다.
 */
export const FILE_CONSTRAINT_TEXT = `최대 ${MAX_DURATION_SEC}초 · MP4, MOV · 500MB 이하`;
