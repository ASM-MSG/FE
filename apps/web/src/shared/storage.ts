import type { StateStorage } from "zustand/middleware";

/**
 * 웹 스토리지 어댑터 (MSG-46 후속 3 P1) — RN 경계 규칙의 지정 경유지.
 * model 레이어는 localStorage를 직접 참조하지 못하며(eslint no-restricted-globals),
 * 이 어댑터를 통해서만 영속화한다. RN 확장 시 이 파일만 AsyncStorage 구현으로 교체한다.
 * zustand persist의 createJSONStorage(() => webStorage)로 주입해 사용한다.
 */
export const webStorage: StateStorage = {
  getItem: (name) => localStorage.getItem(name),
  setItem: (name, value) => {
    localStorage.setItem(name, value);
  },
  removeItem: (name) => {
    localStorage.removeItem(name);
  },
};

const OAUTH_STATE_KEY = "fillmap.oauth.state";

/**
 * OAuth state(CSRF 대조 토큰) 보관소 (MSG-325) — 탭 수명과 함께 사라져야 하므로
 * sessionStorage를 쓴다(localStorage와 달리 다른 탭·재방문으로 새지 않는다).
 * model 레이어가 브라우저 API를 직접 만지지 않도록 여기를 경유한다 — RN 확장 시 이 파일만 교체.
 */
export const oauthStateStorage = {
  /** 인가 요청 직전 저장 */
  save: (state: string): void => {
    sessionStorage.setItem(OAUTH_STATE_KEY, state);
  },
  /**
   * 읽기 — **부수효과가 없다.** 읽으면서 지우면 렌더가 두 번 실행되는 환경(StrictMode)에서
   * 두 번째 판정이 값을 잃어 정상 콜백을 실패로 오판한다. 삭제는 clear가 따로 맡는다.
   */
  peek: (): string | null => sessionStorage.getItem(OAUTH_STATE_KEY),
  /** 판정 후 폐기 — 같은 인가 결과의 재사용(리플레이)을 막는다. 여러 번 호출해도 무해하다 */
  clear: (): void => {
    sessionStorage.removeItem(OAUTH_STATE_KEY);
  },
};

const UPLOAD_INTENT_KEY = "fillmap.upload.pending-intent";

/**
 * 업로드 의도 보관소 (MSG-352 C11) — 비로그인 업로드 게이트가 세운 "로그인 후 위저드
 * 재개" 의도를 카카오 OAuth 리다이렉트(페이지 이탈·복귀) 너머로 유지한다.
 * oauthStateStorage와 같은 이유로 sessionStorage를 쓴다: 같은 탭의 리다이렉트 왕복만
 * 생존하면 되고, 탭을 닫으면 함께 소멸해 만료 로직 없이 stale 위험이 최소이며
 * 다른 탭·재방문으로 새지 않는다.
 */
export const uploadIntentStorage = {
  /** 비로그인 업로드 게이트 진입 시 저장 */
  save: (): void => {
    sessionStorage.setItem(UPLOAD_INTENT_KEY, "1");
  },
  /** 읽기 — 부수효과 없음(oauthStateStorage.peek과 동일 규약). 해제는 clear가 맡는다 */
  peek: (): boolean => sessionStorage.getItem(UPLOAD_INTENT_KEY) !== null,
  /** 소진·해제 — 재개(소진)·취소·stale 청소 경로에서 호출, 여러 번 호출해도 무해하다 */
  clear: (): void => {
    sessionStorage.removeItem(UPLOAD_INTENT_KEY);
  },
};

const DEVICE_ID_KEY = "fillmap.device.id";

/**
 * 서버가 발급한 디바이스 식별자 보관소 (MSG-325) — 로그인 응답의 `X-Device-Id` 헤더를
 * 저장해 이후 요청에 재사용한다. 세션이 아니라 기기에 묶이는 값이라 localStorage를 쓴다
 * (탭을 닫아도 같은 기기로 인식돼야 재발급이 같은 디바이스 세션을 갱신한다).
 */
export const deviceIdStorage = {
  get: (): string | null => localStorage.getItem(DEVICE_ID_KEY),
  save: (deviceId: string): void => {
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  },
  clear: (): void => {
    localStorage.removeItem(DEVICE_ID_KEY);
  },
};

/** 1회성 state 토큰 생성 — 웹 crypto 의존이라 어댑터 층에 둔다 */
export const createOauthState = (): string => crypto.randomUUID();
