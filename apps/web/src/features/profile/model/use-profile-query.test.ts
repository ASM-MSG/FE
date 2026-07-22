import { describe, expect, it } from "vitest";
import { MOCK_PROFILE } from "@/entities/profile";
import { fetchProfile, profileQueryOptions } from "./use-profile-query";

describe("profile query (A7 — use-dex-query 패턴 미러링)", () => {
  it("queryKey는 API 교체와 무관한 고정 키 ['profile']이다", () => {
    expect(profileQueryOptions().queryKey).toEqual(["profile"]);
  });

  it("queryFn을 통해 프로필 데이터를 조회하며 반환 타입은 ProfileData 계약을 지킨다", async () => {
    const queryFn = profileQueryOptions().queryFn;
    expect(typeof queryFn).toBe("function");

    const data = await fetchProfile();

    expect(data).toMatchObject({
      nickname: expect.any(String),
      email: expect.any(String),
      joinedAt: expect.any(String),
      streakDays: expect.any(Number),
      collectionRate: {
        regionLabel: expect.any(String),
        pct: expect.any(Number),
      },
      appVersion: expect.any(String),
    });
  });

  it("현재 소스는 mock이며, queryFn 내부 교체만으로 실 API 전환이 가능하다", async () => {
    await expect(fetchProfile()).resolves.toEqual(MOCK_PROFILE);
  });
});
