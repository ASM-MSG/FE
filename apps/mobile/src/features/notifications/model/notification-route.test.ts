import { describe, expect, it } from "vitest";
import {
  homeDeepLinkParams,
  parseNotificationTarget,
  parsePositiveInt,
  pushRouteFor,
  routeForTarget,
} from "./notification-route";

/** MSG-605 L1 — 서버 계약(5종 + 식별자)을 검증하고 그 밖은 전부 "대상 없음"으로 접는다 */
describe("parseNotificationTarget (L1)", () => {
  it("5종 대상을 식별자 형식과 함께 통과시킨다", () => {
    expect(
      parseNotificationTarget({ targetType: "VIDEO", targetId: "9876" }),
    ).toEqual({ type: "VIDEO", id: "9876" });
    expect(
      parseNotificationTarget({ targetType: "GRID", targetId: "1234_567" }),
    ).toEqual({ type: "GRID", id: "1234_567" });
    expect(
      parseNotificationTarget({ targetType: "BADGE", targetId: "7" }),
    ).toEqual({ type: "BADGE", id: "7" });
    expect(
      parseNotificationTarget({
        targetType: "EVENT_OCCURRENCE",
        targetId: "42",
      }),
    ).toEqual({ type: "EVENT_OCCURRENCE", id: "42" });
    expect(
      parseNotificationTarget({ targetType: "USER", targetId: "3" }),
    ).toEqual({ type: "USER", id: "3" });
  });

  it("미지 종류·누락·null·비문자열·형식 밖 식별자는 null이다 (FR-10 기존 알림 포함)", () => {
    expect(parseNotificationTarget({})).toBeNull();
    expect(
      parseNotificationTarget({ targetType: null, targetId: null }),
    ).toBeNull();
    expect(
      parseNotificationTarget({ targetType: "SCREEN", targetId: "1" }),
    ).toBeNull();
    expect(
      parseNotificationTarget({ targetType: "VIDEO", targetId: 9876 }),
    ).toBeNull();
    expect(
      parseNotificationTarget({ targetType: "VIDEO", targetId: "abc" }),
    ).toBeNull();
    expect(
      parseNotificationTarget({ targetType: "VIDEO", targetId: "0" }),
    ).toBeNull();
    expect(
      parseNotificationTarget({ targetType: "GRID", targetId: "" }),
    ).toBeNull();
    expect(
      parseNotificationTarget({ targetType: "GRID", targetId: "12" }),
    ).toBeNull();
  });
});

/** MSG-605 L2 — 대상 → 화면 표 (2026-09-24 확정) */
describe("routeForTarget (L2)", () => {
  it("VIDEO는 재생 화면, BADGE는 도감 뱃지 탭, USER는 홈", () => {
    expect(routeForTarget({ type: "VIDEO", id: "9876" }, 1)).toBe(
      "/video/9876",
    );
    expect(routeForTarget({ type: "BADGE", id: "7" }, 1)).toEqual({
      pathname: "/dex",
      params: { tab: "badges" },
    });
    expect(routeForTarget({ type: "USER", id: "3" }, 1)).toBe("/home");
  });

  it("GRID·EVENT_OCCURRENCE는 홈 params 6키를 전부 싣는다 — 병합 함정 방어", () => {
    expect(routeForTarget({ type: "GRID", id: "1234_567" }, 99)).toEqual({
      pathname: "/home",
      params: {
        lat: "",
        lng: "",
        gridId: "1234_567",
        bounds: "",
        ts: "99",
        occurrenceId: "",
      },
    });
    expect(routeForTarget({ type: "EVENT_OCCURRENCE", id: "42" }, 99)).toEqual({
      pathname: "/home",
      params: {
        lat: "",
        lng: "",
        gridId: "",
        bounds: "",
        ts: "99",
        occurrenceId: "42",
      },
    });
    expect(
      Object.keys(homeDeepLinkParams({ kind: "grid", gridId: "1_2" }, 1)),
    ).toEqual(
      Object.keys(homeDeepLinkParams({ kind: "occurrence", id: "1" }, 1)),
    );
  });

  it("대상 없음은 null — 알림함은 읽음만 하고, 푸시는 홈으로 접는다", () => {
    expect(routeForTarget(null, 1)).toBeNull();
    expect(pushRouteFor(null, 1)).toBe("/home");
    expect(pushRouteFor({ notificationId: "1", category: "REMIND" }, 1)).toBe(
      "/home",
    );
    expect(pushRouteFor({ targetType: "VIDEO", targetId: "5" }, 1)).toBe(
      "/video/5",
    );
  });
});

describe("parsePositiveInt", () => {
  it("양의 정수 문자열만 숫자로, 그 외는 null", () => {
    expect(parsePositiveInt("42")).toBe(42);
    expect(parsePositiveInt("0")).toBeNull();
    expect(parsePositiveInt("-1")).toBeNull();
    expect(parsePositiveInt("4.2")).toBeNull();
    expect(parsePositiveInt("abc")).toBeNull();
    expect(parsePositiveInt(undefined)).toBeNull();
    expect(parsePositiveInt("")).toBeNull();
  });
});
