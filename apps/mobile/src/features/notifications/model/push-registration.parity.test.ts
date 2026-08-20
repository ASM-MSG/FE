import { describe, expect, it } from "vitest";
import {
  decideSyncAction,
  derivePushEnabled,
  shouldAutoSync,
  type PushPermissionStatus,
} from "./push-registration";

/**
 * 기준 14: FCM 토큰 등록 판정을 웹 MSG-408 원본
 * (`features/notifications/model/{push-sync,push-toggle}.ts`)과 동등하게 유지한다.
 * 웹 원본은 변수 경로 동적 import (upload-wizard.parity.test.ts 주석 참조).
 *
 * **의도적 편차 1건 — `supported` 축이 없다.** 웹의 `supported`는 브라우저 API 존재
 * 판별(Notification·serviceWorker·PushManager)인데, 모바일에서 대응하는 것은 정적 플래그가
 * 아니라 `getDevicePushTokenAsync`의 실패(Play 서비스 부재 등)라 try/catch로 흡수한다.
 * 아래 대조는 웹을 `supported: true`로 고정해 나머지 축의 동등성만 본다.
 */
interface WebPushSyncModule {
  shouldAutoSync: (input: {
    isAuthenticated: boolean;
    supported: boolean;
    permission: "granted" | "denied" | "default" | null;
    storedToken: string | null;
  }) => boolean;
  decideSyncAction: (
    storedToken: string | null,
    freshToken: string,
  ) => { type: string; token?: string; staleToken?: string };
}
interface WebPushToggleModule {
  derivePushToggleState: (input: {
    supported: boolean;
    permission: "granted" | "denied" | "default" | null;
    hasStoredToken: boolean;
  }) => { supported: boolean; checked: boolean };
}

const WEB_ROOT = "../../../../../web/src/features/notifications/model";
const loadWebPushSync = (): Promise<WebPushSyncModule> =>
  import(new URL(`${WEB_ROOT}/push-sync.ts`, import.meta.url).pathname);
const loadWebPushToggle = (): Promise<WebPushToggleModule> =>
  import(new URL(`${WEB_ROOT}/push-toggle.ts`, import.meta.url).pathname);

/** 모바일 3상태 ↔ 웹 브라우저 권한 3상태 대응 (undetermined = 아직 안 물어봄 = default) */
const PERMISSIONS: {
  mobile: PushPermissionStatus;
  web: "granted" | "denied" | "default";
}[] = [
  { mobile: "granted", web: "granted" },
  { mobile: "denied", web: "denied" },
  { mobile: "undetermined", web: "default" },
];

describe("푸시 등록 판정 — 웹 MSG-408 동등성", () => {
  it("토글 표시값이 권한×보관토큰 전 조합에서 웹과 같다", async () => {
    const { derivePushToggleState } = await loadWebPushToggle();
    for (const permission of PERMISSIONS) {
      for (const hasStoredToken of [true, false]) {
        expect(
          derivePushEnabled({ permission: permission.mobile, hasStoredToken }),
        ).toBe(
          derivePushToggleState({
            supported: true,
            permission: permission.web,
            hasStoredToken,
          }).checked,
        );
      }
    }
  });

  it("자동 동기화 발동 조건이 전 조합에서 웹과 같다", async () => {
    const web = await loadWebPushSync();
    for (const permission of PERMISSIONS) {
      for (const isAuthenticated of [true, false]) {
        for (const storedToken of ["t", null]) {
          expect(
            shouldAutoSync({
              isAuthenticated,
              permission: permission.mobile,
              storedToken,
            }),
          ).toBe(
            web.shouldAutoSync({
              isAuthenticated,
              supported: true,
              permission: permission.web,
              storedToken,
            }),
          );
        }
      }
    }
  });

  it("토큰 로테이션 판정이 웹과 같다", async () => {
    const web = await loadWebPushSync();
    const cases: [string | null, string][] = [
      [null, "fresh"],
      ["same", "same"],
      ["old", "new"],
      ["", "new"],
    ];
    for (const [stored, fresh] of cases) {
      expect(decideSyncAction(stored, fresh)).toEqual(
        web.decideSyncAction(stored, fresh),
      );
    }
  });
});
