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
  /**
   * 비로그인 업로드 게이트 진입 시 저장. target은 격자 고정 진입의 지목 좌표 —
   * 함께 영속화해야 카카오 리다이렉트 복귀 재개가 지목 격자를 잇는다(없으면 "1" 플래그만).
   * shared는 최하층이라 entities의 LatLng를 참조하지 않고 구조 동형 타입으로 받는다
   */
  save: (target?: { lat: number; lng: number }): void => {
    sessionStorage.setItem(
      UPLOAD_INTENT_KEY,
      target ? JSON.stringify(target) : "1",
    );
  },
  /** 읽기 — 부수효과 없음(oauthStateStorage.peek과 동일 규약). 해제는 clear가 맡는다 */
  peek: (): boolean => sessionStorage.getItem(UPLOAD_INTENT_KEY) !== null,
  /** 지목 좌표 읽기 — 좌표 없는 의도("1"·구형식)면 null. 부수효과 없음 */
  peekTarget: (): { lat: number; lng: number } | null => {
    const raw = sessionStorage.getItem(UPLOAD_INTENT_KEY);
    if (raw === null || raw === "1") return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        typeof (parsed as { lat?: unknown }).lat === "number" &&
        typeof (parsed as { lng?: unknown }).lng === "number"
      ) {
        return {
          lat: (parsed as { lat: number }).lat,
          lng: (parsed as { lng: number }).lng,
        };
      }
      return null;
    } catch {
      return null;
    }
  },
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

const FCM_TOKEN_KEY = "fillmap.push.fcm-token";

/**
 * FCM 푸시 토큰 보관소 (MSG-408) — 등록에 성공한 디바이스 토큰의 로컬 정본.
 * "권한 granted && 보관 토큰 존재"가 알림 토글 표시·자동 동기화 발동의 정본 조건이다.
 * 기기에 묶이는 값이라 localStorage를 쓴다(deviceIdStorage 전례). features/auth(useLogout)와
 * features/notifications가 직접 import 없이 이 어댑터로만 매개된다 — 반응형 구독이 필요한
 * 쪽은 features/notifications의 push-token-store가 이 보관소를 저장 계층으로 감싼다.
 */
export const fcmTokenStorage = {
  get: (): string | null => localStorage.getItem(FCM_TOKEN_KEY),
  save: (fcmToken: string): void => {
    localStorage.setItem(FCM_TOKEN_KEY, fcmToken);
  },
  clear: (): void => {
    localStorage.removeItem(FCM_TOKEN_KEY);
  },
};

/** 1회성 state 토큰 생성 — 웹 crypto 의존이라 어댑터 층에 둔다 */
export const createOauthState = (): string => crypto.randomUUID();

// 키에 스키마 버전을 박는다 — 항목 형태가 바뀌면 새 버전 키로 갈아타 구 데이터를
// 파싱 시도 없이 자연 폐기한다 (리뷰 반영. 구 무버전 키는 미출시 상태라 마이그레이션 불요)
const PENDING_VIDEO_KEY = "fillmap.upload.pending:v1";

/** 블러 처리 대기 영상 — 확정된 videoId와 폴링 기산점(확정 시각) */
export interface PendingVideo {
  videoId: number;
  startedAtMs: number;
}

const isPendingVideo = (value: unknown): value is PendingVideo =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as PendingVideo).videoId === "number" &&
  typeof (value as PendingVideo).startedAtMs === "number";

/**
 * 처리 대기 영상 보관소 (MSG-329 B15) — 확정 후 서버 블러 처리를 기다리는 videoId를
 * 기록해 앱 재진입·탭 포커스 복귀 시 상태를 이어 조회한다(탭 닫은 사용자 커버).
 * 기기 재방문에 걸쳐 남아야 하므로 localStorage를 쓴다. 손상 값은 빈 목록으로 폴백.
 */
export const pendingVideoStorage = {
  list: (): PendingVideo[] => {
    const raw = localStorage.getItem(PENDING_VIDEO_KEY);
    if (raw === null) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed) || !parsed.every(isPendingVideo)) return [];
      return parsed;
    } catch {
      return [];
    }
  },
  /** 추가 — 같은 videoId가 있으면 갱신(중복 없음) */
  add: (entry: PendingVideo): void => {
    const rest = pendingVideoStorage
      .list()
      .filter((item) => item.videoId !== entry.videoId);
    localStorage.setItem(PENDING_VIDEO_KEY, JSON.stringify([...rest, entry]));
  },
  /** READY/FAILED/만료 처리 후 목록에서 제거 */
  remove: (videoId: number): void => {
    const rest = pendingVideoStorage
      .list()
      .filter((item) => item.videoId !== videoId);
    localStorage.setItem(PENDING_VIDEO_KEY, JSON.stringify(rest));
  },
};
