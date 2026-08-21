import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * 온보딩 완료 여부 기기 로컬 영속 (MSG-292 기준 5·6).
 * 완료 여부만 저장하고 진행 단계(step)는 저장하지 않는다 — 중간 이탈 후 재실행은 1장부터.
 * 뷰 import 없는 순수 모델 — RN 경계 규칙의 모델 레이어 순수성을 따른다.
 *
 * 두 함수 모두 총함수(절대 reject하지 않음) — 리뷰 반영(MSG-292 재작업 2).
 * 저장소 접근 실패를 뷰가 .catch로 각자 방어하는 대신 모델 계약으로 흡수한다:
 * 호출부(index.tsx 진입 게이트, onboarding-screen CTA)는 실패 분기 없이 then만 쓴다.
 */
const COMPLETED_KEY = "fillmap-onboarding-completed";

export async function getOnboardingCompleted(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(COMPLETED_KEY)) === "true";
  } catch {
    // 판정 불가 시 미완료로 폴백 — 온보딩부터 보여주는 쪽이 스플래시 영구 멈춤보다 안전
    return false;
  }
}

export async function setOnboardingCompleted(): Promise<void> {
  try {
    await AsyncStorage.setItem(COMPLETED_KEY, "true");
  } catch {
    // best-effort — 저장 실패로 온보딩에 가두지 않는다 (다음 실행에 온보딩 재노출될 뿐)
  }
}
