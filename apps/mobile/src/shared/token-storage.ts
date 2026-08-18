import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

/**
 * 토큰 보안 저장소 어댑터 (AC 5) — RN 경계 규칙의 지정 경유지.
 * 액세스·리프레시 토큰은 **expo-secure-store**(iOS Keychain / Android Keystore)에,
 * 비밀이 아닌 디바이스 식별자는 AsyncStorage에 저장한다(사용자 승인 — 질문 1).
 * 모델(auth-store)은 이 파일이 아니라 아래 `AuthPersistence` **포트 타입**에 의존하고
 * 구현을 주입받는다 — 네이티브 모듈이 모델에 들어오면 순수 모델 테스트가 불가능해진다.
 *
 * 읽기·삭제·deviceId 저장은 총함수다(절대 reject하지 않음) — 저장소 접근 실패를 화면이
 * 각자 방어하는 대신 어댑터 계약으로 흡수한다 (onboarding-storage 선례). 실패 = 비로그인 폴백.
 * **토큰 저장(saveTokens)만은 예외로 실패를 전파한다**: 회전된 refreshToken이 디스크에
 * 남지 않은 재발급은 성공이 아니고(다음 실행에서 세션이 끊긴다), 파이프라인이 이를
 * 재발급 실패로 처리해야 하기 때문이다.
 */

/** 기기에 보관된 인증 상태 스냅숏 */
export interface StoredAuth {
  accessToken: string | null;
  refreshToken: string | null;
  deviceId: string | null;
}

/** auth-store가 의존하는 저장소 포트 — 테스트는 인메모리 가짜를 주입한다 */
export interface AuthPersistence {
  load: () => Promise<StoredAuth>;
  /** refreshToken이 null이면 기존 값을 건드리지 않는다 (재발급 응답에 회전 토큰이 없을 때) */
  saveTokens: (tokens: {
    accessToken: string;
    refreshToken: string | null;
  }) => Promise<void>;
  saveDeviceId: (deviceId: string) => Promise<void>;
  clearTokens: () => Promise<void>;
}

const ACCESS_TOKEN_KEY = "fillmap.auth.accessToken";
const REFRESH_TOKEN_KEY = "fillmap.auth.refreshToken";
const DEVICE_ID_KEY = "fillmap.device.id";

const readSecure = async (key: string): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
};

/** 실패를 삼키지 않는다 — 호출자(auth-store → 파이프라인)가 재발급 실패로 처리한다 */
const writeSecure = async (key: string, value: string): Promise<void> => {
  await SecureStore.setItemAsync(key, value);
};

const deleteSecure = async (key: string): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // best-effort
  }
};

/** 앱이 사용하는 실제 구현 — 화면·부트스트랩이 auth-store 팩토리에 주입한다 */
export const secureAuthPersistence: AuthPersistence = {
  load: async () => {
    const [accessToken, refreshToken, deviceId] = await Promise.all([
      readSecure(ACCESS_TOKEN_KEY),
      readSecure(REFRESH_TOKEN_KEY),
      AsyncStorage.getItem(DEVICE_ID_KEY).catch(() => null),
    ]);
    return { accessToken, refreshToken, deviceId };
  },
  saveTokens: async ({ accessToken, refreshToken }) => {
    await writeSecure(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken !== null) {
      await writeSecure(REFRESH_TOKEN_KEY, refreshToken);
    }
  },
  saveDeviceId: async (deviceId) => {
    try {
      await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
    } catch {
      // best-effort
    }
  },
  clearTokens: async () => {
    await deleteSecure(ACCESS_TOKEN_KEY);
    await deleteSecure(REFRESH_TOKEN_KEY);
  },
};
