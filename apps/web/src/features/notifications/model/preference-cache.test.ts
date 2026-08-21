import { describe, expect, it } from "vitest";
import type { ApiResponseDtoNotificationPreferenceResponseDto } from "@/shared/api/generated/types.gen";
import {
  applyPreference,
  readPreference,
  recordServerPreferences,
} from "./preference-cache";

/**
 * preferences 캐시 쓰기 순수 헬퍼 (MSG-409 AC 6·7·8 경계, test-first).
 * 캐시 원본은 봉투 그대로다(use-profile-query 선례) — 헬퍼도 봉투 수준에서 다룬다.
 */
const envelope = (
  preferences: ApiResponseDtoNotificationPreferenceResponseDto["data"]["preferences"],
): ApiResponseDtoNotificationPreferenceResponseDto => ({
  developCode: 0,
  message: "ok",
  data: { preferences },
});

describe("readPreference — 봉투에서 카테고리 값 판독", () => {
  it("저장된 행의 enabled를 반환한다", () => {
    const current = envelope([{ category: "WEEKLY", enabled: false }]);

    expect(readPreference(current, "WEEKLY")).toBe(false);
  });

  it("행이 없으면 true다 — off 행 부재 = on (AC 5)", () => {
    const current = envelope([{ category: "WEEKLY", enabled: false }]);

    expect(readPreference(current, "BADGE")).toBe(true);
  });
});

describe("applyPreference — 낙관 반영 (AC 6)", () => {
  it("기존 행의 enabled를 바꾼 새 봉투를 반환하고 원본은 불변이다", () => {
    const current = envelope([{ category: "HOTZONE", enabled: true }]);

    const next = applyPreference(current, "HOTZONE", false);

    expect(readPreference(next, "HOTZONE")).toBe(false);
    expect(readPreference(current, "HOTZONE")).toBe(true);
  });

  it("행이 없던 카테고리는 행을 추가해 기록한다", () => {
    const current = envelope([]);

    const next = applyPreference(current, "VIDEO", false);

    expect(readPreference(next, "VIDEO")).toBe(false);
  });
});

describe("recordServerPreferences — 성공 응답 전체 상태 기록 (AC 6·8 경계)", () => {
  it("in-flight가 없으면 응답을 그대로 기록한다 (AC 6)", () => {
    const current = envelope([{ category: "HOTZONE", enabled: false }]);
    const response = envelope([{ category: "HOTZONE", enabled: true }]);

    const next = recordServerPreferences(current, response, []);

    expect(next).toBe(response);
  });

  it("in-flight 카테고리는 현재 캐시의 낙관 값을 보존하고 나머지는 응답 값을 쓴다 (AC 6·8 경계)", () => {
    // HOTZONE 응답이 먼저 도착 — WEEKLY는 아직 PATCH 왕복 중(낙관 false)
    const current = envelope([
      { category: "HOTZONE", enabled: false },
      { category: "WEEKLY", enabled: false },
    ]);
    const response = envelope([{ category: "HOTZONE", enabled: false }]); // WEEKLY 행 부재 = true

    const next = recordServerPreferences(current, response, ["WEEKLY"]);

    expect(readPreference(next, "WEEKLY")).toBe(false); // 낙관 값 보존
    expect(readPreference(next, "HOTZONE")).toBe(false); // 응답 값
    expect(readPreference(next, "BADGE")).toBe(true); // 응답 기준 기본 on
  });

  it("현재 캐시가 없으면 응답을 그대로 기록한다", () => {
    const response = envelope([{ category: "VIDEO", enabled: false }]);

    expect(recordServerPreferences(undefined, response, ["WEEKLY"])).toBe(
      response,
    );
  });
});
