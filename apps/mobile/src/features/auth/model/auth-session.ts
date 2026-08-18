import { registerApiErrorInterceptor } from "../../../shared/api/error-interceptor";
import { goToLogin } from "../../../shared/navigation";
import { secureAuthPersistence } from "../../../shared/token-storage";
import { createAuthStore, useAuthSnapshot } from "./auth-store";
import { setupAuthPipeline } from "./configure-auth";

/**
 * 앱 인증 세션 — 단일 스토어 인스턴스와 부트스트랩 (AC 1·5·7).
 * 네이티브 모듈(expo-secure-store)·라우터 어댑터가 여기서 처음 결합한다. 순수 모델
 * (auth-store·configure-auth)은 이 파일을 import하지 않으므로 vitest 대상 그대로다.
 */

/** 앱 전역 인증 스토어 — 화면은 useAuth()로 구독한다 */
export const authStore = createAuthStore(secureAuthPersistence);

/** 인증 상태 구독 훅 — 로그인 여부·재수화 완료(hydrated)를 읽는다 */
export const useAuth = () => useAuthSnapshot(authStore);

let bootstrapped = false;

/**
 * 부트스트랩 1회 — 에러 정규화 인터셉터 등록 + 파이프라인 배선 + 보안 저장소 재수화.
 * 루트 레이아웃이 마운트될 때 호출한다(웹 main.tsx 대응). 재수화는 비동기라
 * 완료 여부는 스토어의 `hydrated`로 화면이 관찰한다.
 */
export const bootstrapAuth = (): void => {
  if (bootstrapped) return;
  bootstrapped = true;
  registerApiErrorInterceptor();
  setupAuthPipeline({ store: authStore, goToLogin });
  void authStore.hydrate();
};
