import { describe, expect, it, vi } from "vitest";
import { registerPushForegroundHandler } from "./push-foreground-handler";

/**
 * MSG-567 AC 12: 푸시 사슬에서 남는 것은 포그라운드 배너 핸들러 등록뿐이다 — BE 실측으로
 * FCM 푸시에 `data`가 없어 탭 라우팅·콜드 스타트 조회는 원래 성립하지 않았고(Q1 해소),
 * 코드째 삭제했다. 핸들러 등록의 네이티브 부재 내성은 그대로 유지한다.
 */
describe("registerPushForegroundHandler — 포그라운드 배너 핸들러 등록 (AC 12)", () => {
  it("배너 핸들러 등록을 1회 부른다", () => {
    const ensureForegroundHandler = vi.fn(async () => {});

    registerPushForegroundHandler({ ensureForegroundHandler });

    expect(ensureForegroundHandler).toHaveBeenCalledTimes(1);
  });
});

/**
 * 실기 검증이 잡은 결함(2026-08-19): `expo-notifications` 네이티브 모듈이 빠진 빌드에서
 * 어댑터의 모듈 스코프 호출이 던지자 `_layout.tsx`가 통째로 평가 실패했고
 * ("Route ./_layout.tsx is missing the required default export"), **앱 전체가 검은 화면**이 됐다.
 * 푸시를 못 쓰는 것은 허용되는 상태지만 앱이 죽는 것은 아니다.
 */
describe("네이티브 모듈 부재 내성 (실기 환류)", () => {
  it("핸들러 등록이 거부돼도 앱을 죽이지 않는다 — 미처리 거부로 새지 않는다", async () => {
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);

    expect(() =>
      registerPushForegroundHandler({
        ensureForegroundHandler: async () => {
          throw new Error("Cannot find native module 'ExpoPushTokenManager'");
        },
      }),
    ).not.toThrow();

    await Promise.resolve();
    await Promise.resolve();
    process.off("unhandledRejection", unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });
});
