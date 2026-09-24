import type { Href } from "expo-router";
import { homeFocusParams } from "../../map-home/model/home-focus";

/**
 * 알림 딥링크 라우팅 표 (MSG-605 ← BE MSG-432 계약). 서버는 화면을 모르고 **대상 종류 + 식별자**만
 * 준다(FCM `data`·알림함 항목 공통 형태). 화면 매핑은 앱이 소유하며 이 파일이 정본이다.
 *
 * 대상 → 화면 (2026-09-24 성민 확정, BE PRD §3·§8):
 * - VIDEO → 영상 재생. MODERATION(가려짐)도 같은 곳 — 재생 API가 소유자에게는 BLINDED를 통과시킨다
 * - GRID → 지도 홈 격자 이동·하이라이트(검색 진입 파라미터 재사용). 셀 상세 시트는 열지 않는다
 * - BADGE → 도감 뱃지 탭
 * - EVENT_OCCURRENCE → 지도 홈 + 행사방 개요 시트
 * - USER → 지도 홈(친구 화면이 생길 때까지). 없음·미지 → 홈(푸시) / 이동 없음(알림함)
 *
 * 순수 함수 — 라우터·SDK를 모른다. 입력은 `unknown`으로 받는다: 푸시 data는 문자열 맵이고
 * 알림함 항목은 생성 타입이 nullable을 잃어(hey-api가 enum+null을 non-null로 뽑는다) 어느 쪽도
 * 믿지 않는다. 이 계약 이전 알림(둘 다 null)과 훼손된 값은 전부 "대상 없음"으로 접힌다 (FR-10).
 */
export const NOTIFICATION_TARGET_TYPES = [
  "VIDEO",
  "GRID",
  "BADGE",
  "EVENT_OCCURRENCE",
  "USER",
] as const;

export type NotificationTargetType = (typeof NOTIFICATION_TARGET_TYPES)[number];

export interface NotificationTarget {
  type: NotificationTargetType;
  id: string;
}

const POSITIVE_INT = /^[1-9]\d*$/;
const GRID_ID = /^\d+_\d+$/;

const isTargetType = (value: unknown): value is NotificationTargetType =>
  typeof value === "string" &&
  (NOTIFICATION_TARGET_TYPES as readonly string[]).includes(value);

/** 종류·식별자 짝을 검증한다 — 서버 CHECK와 같은 규칙에 식별자 형식(정수 id·격자 id)을 더한다 */
export const parseNotificationTarget = (raw: {
  targetType?: unknown;
  targetId?: unknown;
}): NotificationTarget | null => {
  const { targetType, targetId } = raw;
  if (!isTargetType(targetType) || typeof targetId !== "string") return null;
  const valid = targetType === "GRID" ? GRID_ID : POSITIVE_INT;
  return valid.test(targetId) ? { type: targetType, id: targetId } : null;
};

/**
 * 홈 딥링크 params — `homeFocusParams`의 5키에 `occurrenceId`를 더한 6키를 **항상 전부** 싣는다.
 * expo-router가 같은 `/home` 인스턴스의 params를 병합해 이전 키가 남는 함정(home-focus 주석)이
 * 행사방 키에도 그대로 적용된다. 빈 문자열 = 부재.
 */
export const homeDeepLinkParams = (
  target: { kind: "grid"; gridId: string } | { kind: "occurrence"; id: string },
  ts: number,
): Record<
  "lat" | "lng" | "gridId" | "bounds" | "ts" | "occurrenceId",
  string
> =>
  target.kind === "grid"
    ? { ...homeFocusParams(target, ts), occurrenceId: "" }
    : {
        lat: "",
        lng: "",
        gridId: "",
        bounds: "",
        ts: String(ts),
        occurrenceId: target.id,
      };

/**
 * 대상 → Href. null이면 "이동할 곳 없음" — 푸시 경로는 홈으로 접고(`pushRouteFor`), 알림함 경로는
 * 읽음 처리만 한다(이미 알림함에 와 있어 홈으로 튕기지 않는다, FR-8).
 */
export const routeForTarget = (
  target: NotificationTarget | null,
  ts: number,
): Href | null => {
  if (target === null) return null;
  switch (target.type) {
    case "VIDEO":
      return `/video/${target.id}`;
    case "GRID":
      return {
        pathname: "/home",
        params: homeDeepLinkParams({ kind: "grid", gridId: target.id }, ts),
      };
    case "BADGE":
      return { pathname: "/dex", params: { tab: "badges" } };
    case "EVENT_OCCURRENCE":
      return {
        pathname: "/home",
        params: homeDeepLinkParams({ kind: "occurrence", id: target.id }, ts),
      };
    case "USER":
      return "/home";
  }
};

/** 푸시 탭 목적지 — 대상 없음·미지·훼손은 지도 홈 (FR-6·FR-10) */
export const pushRouteFor = (
  data: Record<string, unknown> | null | undefined,
  ts: number,
): Href => routeForTarget(parseNotificationTarget(data ?? {}), ts) ?? "/home";

/** 양의 정수 파라미터 파서 — 홈 `occurrenceId` 등 딥링크로 훼손된 값이 올 수 있다 */
export const parsePositiveInt = (raw: string | undefined): number | null => {
  if (raw === undefined || !POSITIVE_INT.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : null;
};
