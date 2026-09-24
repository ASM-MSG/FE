import { describe, expect, it, vi } from "vitest";
import { createPushResponseRouter } from "./push-response-routing";

const video = (id: string) => ({
  id,
  data: {
    notificationId: "1",
    category: "VIDEO",
    targetType: "VIDEO",
    targetId: "77",
  },
});

/** MSG-605 L3 — 푸시 탭 응답 오케스트레이션 (FR-7) */
describe("createPushResponseRouter (L3)", () => {
  it("ready면 즉시 대상 화면으로 이동한다", () => {
    const navigate = vi.fn();
    const router = createPushResponseRouter({ navigate, now: () => 5 });
    router.setReady(true);

    router.handle(video("a"));

    expect(navigate).toHaveBeenCalledWith("/video/77");
  });

  it("ready 전 탭은 보류하고 ready가 되면 1회 이동한다 — 콜드 스타트", () => {
    const navigate = vi.fn();
    const router = createPushResponseRouter({ navigate, now: () => 5 });

    router.handle(video("a"));
    expect(navigate).not.toHaveBeenCalled();
    router.setReady(true);
    router.setReady(true);

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/video/77");
  });

  it("같은 요청 id는 한 번만 처리한다 — listener와 last response 중복 (R2)", () => {
    const navigate = vi.fn();
    const router = createPushResponseRouter({ navigate, now: () => 5 });
    router.setReady(true);

    router.handle(video("a"));
    router.handle(video("a"));

    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it("보류 중 같은 id가 다시 와도 한 번만, 다른 id가 오면 마지막 것만 남긴다", () => {
    const navigate = vi.fn();
    const router = createPushResponseRouter({ navigate, now: () => 5 });

    router.handle(video("a"));
    router.handle(video("a"));
    router.handle({
      ...video("b"),
      data: { targetType: "BADGE", targetId: "7" },
    });
    router.setReady(true);

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith({
      pathname: "/dex",
      params: { tab: "badges", ts: "5" },
    });
  });

  it("대상 없음·훼손 data는 홈으로 간다 — 앱은 죽지 않는다 (FR-10)", () => {
    const navigate = vi.fn();
    const router = createPushResponseRouter({ navigate, now: () => 5 });
    router.setReady(true);

    router.handle({
      id: "r",
      data: { notificationId: "9", category: "REMIND" },
    });
    router.handle({ id: "n", data: null });
    router.handle({ id: "x", data: { targetType: "VIDEO", targetId: "abc" } });

    expect(navigate).toHaveBeenCalledTimes(3);
    expect(navigate.mock.calls.every(([href]) => href === "/home")).toBe(true);
  });

  it("ready가 다시 false로 내려가면(로그아웃 등) 새 탭은 보류된다", () => {
    const navigate = vi.fn();
    const router = createPushResponseRouter({ navigate, now: () => 5 });
    router.setReady(true);
    router.setReady(false);

    router.handle(video("a"));

    expect(navigate).not.toHaveBeenCalled();
  });

  it("ready가 false로 내려가면 그 전에 보류된 탭은 버린다 — 다음 사용자 세션에서 열리지 않는다 (PR #161 리뷰)", () => {
    const navigate = vi.fn();
    const router = createPushResponseRouter({ navigate, now: () => 5 });

    router.handle(video("a")); // A 로그아웃 직후 도착
    router.setReady(false); // 로그인 화면 등 세션 경계
    router.setReady(true); // B 로그인

    expect(navigate).not.toHaveBeenCalled();
    router.handle(video("b"));
    expect(navigate).toHaveBeenCalledTimes(1);
  });
});
