import { describe, expect, it } from "vitest";
import { isPushSupported } from "./push-support";

describe("isPushSupported — 브라우저 푸시 지원 판별 (AC 8)", () => {
  it("Notification·serviceWorker·PushManager가 모두 있으면 지원이다", () => {
    expect(
      isPushSupported({
        hasNotification: true,
        hasServiceWorker: true,
        hasPushManager: true,
      }),
    ).toBe(true);
  });

  it.each([
    [
      "Notification 부재",
      { hasNotification: false, hasServiceWorker: true, hasPushManager: true },
    ],
    [
      "serviceWorker 부재",
      { hasNotification: true, hasServiceWorker: false, hasPushManager: true },
    ],
    [
      "PushManager 부재",
      { hasNotification: true, hasServiceWorker: true, hasPushManager: false },
    ],
  ])("%s면 미지원이다 (AC 8)", (_name, caps) => {
    expect(isPushSupported(caps)).toBe(false);
  });
});
