/**
 * 테스트 전용 헬퍼 — `navigator.geolocation`을 갈아 끼운다.
 * 같은 7줄이 세 파일째 복제되어(geolocation 단위 · AI 경로추천 스모크 · 자동 이동 훅)
 * 추출했다 (envelope-response·stub-fetch·robots-meta 선례 — 중복 게이트 검출).
 *
 * 되돌리기는 각 파일이 `afterEach`에서 원본을 다시 넣어 한다.
 */
export const setGeolocation = (value: unknown) => {
  Object.defineProperty(navigator, "geolocation", {
    value,
    configurable: true,
    writable: true,
  });
};

/** 위치 허용 — 지정 좌표를 즉시 돌려준다 */
export const allowPositionAt = (coords: { lat: number; lng: number }) =>
  setGeolocation({
    getCurrentPosition: (success: PositionCallback) =>
      success({
        coords: { latitude: coords.lat, longitude: coords.lng },
      } as GeolocationPosition),
  });

/** 위치 거부 — PERMISSION_DENIED로 실패시킨다 */
export const denyPosition = () =>
  setGeolocation({
    getCurrentPosition: (
      _success: PositionCallback,
      error: PositionErrorCallback,
    ) => error({ code: 1, message: "denied" } as GeolocationPositionError),
  });
