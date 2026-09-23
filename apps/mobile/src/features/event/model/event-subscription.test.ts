import { describe, expect, it } from "vitest";
import {
  eventSubscriptionView,
  withNotificationOn,
} from "./event-subscription";

/** 템플릿 ① 순수 로직 — 행사 알림 토글 노출·값 파생 (MSG-603 L1·L2) */
describe("eventSubscriptionView (L1)", () => {
  it("예정·진행 중 회차는 서버 notificationOn을 그대로 보인다", () => {
    expect(
      eventSubscriptionView({ status: "UPCOMING", notificationOn: true }),
    ).toEqual({
      enabled: true,
    });
    expect(
      eventSubscriptionView({ status: "LIVE", notificationOn: false }),
    ).toEqual({
      enabled: false,
    });
  });
  it("종료 회차(유예·아카이브)와 미도착은 행을 그리지 않는다 — 서버가 ON을 409로 거부한다", () => {
    expect(
      eventSubscriptionView({ status: "UPLOAD_GRACE", notificationOn: true }),
    ).toBeNull();
    expect(
      eventSubscriptionView({ status: "ARCHIVED", notificationOn: false }),
    ).toBeNull();
    expect(eventSubscriptionView(null)).toBeNull();
  });
});

describe("withNotificationOn (L2)", () => {
  it("값이 바뀌면 새 객체, 같으면 원본 그대로(불필요한 재렌더 방지)", () => {
    const detail = { notificationOn: false, title: "행사" };
    const next = withNotificationOn(detail, true);
    expect(next).toEqual({ notificationOn: true, title: "행사" });
    expect(next).not.toBe(detail);
    expect(withNotificationOn(detail, false)).toBe(detail);
  });
});
