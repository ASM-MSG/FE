import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * FCM 보관 토큰 어댑터 (MSG-429 기준 14·17) — RN 경계 규칙의 지정 경유지.
 * 웹 `shared/storage.ts`의 `fcmTokenStorage`(MSG-408) 대응. **비밀이 아니라** 서버가 이미
 * 보유한 디바이스 토큰이므로 SecureStore가 아닌 AsyncStorage에 둔다(`deviceId`와 같은 판단).
 *
 * 보관하는 이유: 토글 표시 정본(`derivePushEnabled`)과 해제 경로(`DELETE ?fcmToken=`)가
 * 둘 다 "직전에 등록한 토큰"을 필요로 한다. 이 값이 없으면 서버에 등록이 남은 채로
 * 해제할 방법이 사라진다(웹 MSG-408 기준 7이 같은 이유로 실패 시 보관을 유지한다).
 *
 * 세 함수 모두 총함수다 — 저장소 접근 실패는 "보관 없음"으로 폴백한다.
 */
const FCM_TOKEN_KEY = "fillmap.push.fcmToken";

export const fcmTokenStorage = {
  read: async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(FCM_TOKEN_KEY);
    } catch {
      return null;
    }
  },
  save: async (token: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
    } catch {
      // best-effort — 보관 실패로 등록 자체를 되돌리지 않는다
    }
  },
  clear: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(FCM_TOKEN_KEY);
    } catch {
      // best-effort
    }
  },
};
