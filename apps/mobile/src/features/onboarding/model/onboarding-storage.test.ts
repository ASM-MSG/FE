import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getOnboardingCompleted,
  setOnboardingCompleted,
} from "./onboarding-storage";

/**
 * AsyncStorage는 네이티브 모듈이라 vitest에서 로드 불가 — 인메모리 Map으로 모킹해
 * 순수 모델 로직만 검증한다 (MSG-292 확정 4 — 러너 범위는 순수 모델 한정).
 */
const memory = vi.hoisted(() => new Map<string, string>());

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: async (key: string) => memory.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      memory.set(key, value);
    },
  },
}));

describe("onboarding-storage", () => {
  beforeEach(() => {
    memory.clear();
  });

  it("기준 6: 완료 기록이 없으면 getOnboardingCompleted()는 false다 — 미완료 사용자는 1장부터 시작한다", async () => {
    await expect(getOnboardingCompleted()).resolves.toBe(false);
  });

  it("기준 5: setOnboardingCompleted() 후 getOnboardingCompleted()는 true다 — 재실행 시 온보딩 미노출 판정 근거", async () => {
    await setOnboardingCompleted();
    await expect(getOnboardingCompleted()).resolves.toBe(true);
  });

  it("기준 5: 완료 기록은 'fillmap-onboarding-completed' 키에 저장된다 — 기기 로컬 영속 키 계약", async () => {
    await setOnboardingCompleted();
    expect(memory.has("fillmap-onboarding-completed")).toBe(true);
  });

  it("기준 6: 진행 단계는 저장하지 않는다 — 완료 저장 후에도 저장소에는 완료 키 하나만 존재한다", async () => {
    await setOnboardingCompleted();
    expect([...memory.keys()]).toEqual(["fillmap-onboarding-completed"]);
  });
});
