import { describe, expect, it, vi } from "vitest";
import { gatedQueryStatus } from "./gated-query-status";

/**
 * L13 parity: 모바일 `gated-query-status` ↔ 웹 `features/region/model/gated-query-status.ts`
 * 동등성 (스펙 "추가 parity" — 게이트 규칙이 갈리면 갤러리 로딩 상태가 어긋난다).
 * 배치가 다른 이유: 모바일에는 features/region이 없고 도메인 무관 쿼리 유틸이라
 * `shared/api`가 맞다(DESIGN_SYSTEM — 한 앱에서만 쓰는 유틸은 그 앱의 shared/).
 * 웹 파일이 이동·삭제되면 이 테스트가 깨진다(의도된 드리프트 감지).
 */
interface WebGatedQueryStatusModule {
  gatedQueryStatus: typeof gatedQueryStatus;
}

const WEB_GATED_QUERY_STATUS_PATH = new URL(
  "../../../../web/src/features/region/model/gated-query-status.ts",
  import.meta.url,
).pathname;

const loadWebGatedQueryStatus = (): Promise<WebGatedQueryStatusModule> =>
  import(WEB_GATED_QUERY_STATUS_PATH);

describe("gatedQueryStatus 동등성 (L13)", () => {
  it("입력 전 조합(isPending × isError × active)에서 웹 원본과 상태가 동일하다 (L13)", async () => {
    const web = await loadWebGatedQueryStatus();

    for (const isPending of [true, false]) {
      for (const isError of [true, false]) {
        for (const active of [true, false]) {
          const input = {
            isPending,
            isError,
            refetch: () => Promise.resolve(undefined),
          };
          const mobile = gatedQueryStatus(input, active);
          const original = web.gatedQueryStatus(input, active);

          expect(mobile.isPending).toBe(original.isPending);
          expect(mobile.isError).toBe(original.isError);
        }
      }
    }
  });

  it("retry가 refetch를 호출하는 계약이 웹 원본과 같다 (L13)", async () => {
    const web = await loadWebGatedQueryStatus();
    const mobileTarget = {
      isPending: false,
      isError: false,
      refetch: vi.fn(() => Promise.resolve(undefined)),
    };
    const webTarget = {
      isPending: false,
      isError: false,
      refetch: vi.fn(() => Promise.resolve(undefined)),
    };

    gatedQueryStatus(mobileTarget, true).retry();
    web.gatedQueryStatus(webTarget, true).retry();

    expect(mobileTarget.refetch.mock.calls.length).toBe(
      webTarget.refetch.mock.calls.length,
    );
    expect(mobileTarget.refetch).toHaveBeenCalledTimes(1);
  });
});
