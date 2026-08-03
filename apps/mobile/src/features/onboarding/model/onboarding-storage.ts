import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * 온보딩 완료 여부 기기 로컬 영속 (MSG-292 기준 5·6).
 * 완료 여부만 저장하고 진행 단계(step)는 저장하지 않는다 — 중간 이탈 후 재실행은 1장부터.
 * 뷰 import 없는 순수 모델 — RN 경계 규칙의 모델 레이어 순수성을 따른다.
 */
const COMPLETED_KEY = "fillmap-onboarding-completed";

export async function getOnboardingCompleted(): Promise<boolean> {
  return (await AsyncStorage.getItem(COMPLETED_KEY)) === "true";
}

export async function setOnboardingCompleted(): Promise<void> {
  await AsyncStorage.setItem(COMPLETED_KEY, "true");
}
