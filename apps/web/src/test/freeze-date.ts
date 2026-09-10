import { vi } from "vitest";

/**
 * 테스트의 "오늘"을 고정한다 — Date만 fake, 타이머는 실제(`waitFor`/`findBy` 호환).
 * 오늘 기준 검증 규칙(행사 기간 "endsOn < 오늘(KST)" 등)을 타는 리터럴 날짜 픽스처가
 * 달력이 지나며 깨지는 것을 막는다(MSG-593). `afterEach`에서 `vi.useRealTimers()`로 되돌린다.
 */
export const freezeDate = (iso: string): void => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(iso));
};
