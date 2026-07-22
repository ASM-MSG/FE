/**
 * 카카오맵 레벨(1~14) → 축척 바 거리 표기. 카카오맵 사이트의 축척 표기 관례를 따른 표다
 * — 고정 폭 바에 레벨당 대표 거리를 라벨링하며, 실측(위도별 m/px) 보정은 실 API 단계 후속.
 * 지도 SDK를 import하지 않는 순수 함수(RN 경계).
 */
const SCALE_BY_LEVEL = [
  "20m",
  "30m",
  "50m",
  "100m",
  "250m",
  "500m",
  "1km",
  "2km",
  "4km",
  "8km",
  "16km",
  "32km",
  "64km",
  "128km",
] as const;

const MIN_LEVEL = 1;
const MAX_LEVEL = SCALE_BY_LEVEL.length;

/** 레벨을 유효 범위로 클램프(비정수는 내림)해 축척 라벨을 반환한다 */
export const scaleLabelForLevel = (level: number): string => {
  const clamped = Math.min(
    MAX_LEVEL,
    Math.max(MIN_LEVEL, Math.floor(level)),
  );
  return SCALE_BY_LEVEL[clamped - MIN_LEVEL];
};
