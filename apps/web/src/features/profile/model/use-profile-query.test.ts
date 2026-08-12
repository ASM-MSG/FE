import { afterEach, describe, expect, it, vi } from "vitest";
import { MOCK_PROFILE } from "@/entities/profile";
import { envelopeResponse } from "@/test/envelope-response";
import { fetchProfile, profileQueryOptions } from "./use-profile-query";

/**
 * 프로필 조회 쿼리 — MSG-378 확장에서 mock 반환 → getMe 실 API로 전환 (기준 18·19).
 * 구 케이스 "현재 소스는 mock이며 queryFn 내부 교체만으로 전환 가능"은 그 교체가
 * 실제로 일어나 폐기·대체됐다 (동작 변경을 스펙 부록이 요구 — 빌드 리포트 기록).
 */

/** getMe 응답 대역 — mock과 겹치지 않는 값으로 서버 출처를 판별한다 */
const SERVER_ME = {
  email: "server-account@kakao.com",
  nickname: "서버닉네임",
  profileImageUrl: "https://cdn.fillmap.test/profile/me.png",
  createdAt: "2026-05-02T09:00:00",
};

const stubGetMe = () => {
  const fetchMock = vi.fn<(input: Request) => Promise<Response>>(async () =>
    envelopeResponse(SERVER_ME),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("profile query — getMe 실 API 전환 (MSG-378 확장 기준 18·19)", () => {
  it("queryKey는 API 전환과 무관한 고정 키 ['profile']이다 — 업로드 캐시 병합(setQueryData)과 정합 (기준 19)", () => {
    expect(profileQueryOptions().queryKey).toEqual(["profile"]);
  });

  it("fetchProfile은 GET /api/users/me를 정확히 1회 호출한다 (기준 18)", async () => {
    const fetchMock = stubGetMe();

    await fetchProfile();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [request] = fetchMock.mock.calls[0];
    expect(request.method).toBe("GET");
    expect(new URL(request.url).pathname).toBe("/api/users/me");
  });

  it("명세 필드(email·nickname·profileImageUrl)와 가입일(createdAt→joinedAt)은 서버 값이다 (기준 18)", async () => {
    stubGetMe();

    const data = await fetchProfile();

    expect(data.email).toBe(SERVER_ME.email);
    expect(data.nickname).toBe(SERVER_ME.nickname);
    expect(data.profileImageUrl).toBe(SERVER_ME.profileImageUrl);
    expect(data.joinedAt).toBe(SERVER_ME.createdAt);
  });

  it("FE 확장 필드(streakDays·collectionRate·appVersion·locationEnabled)는 mock 값으로 병합된다 — ProfileData 계약 유지 (기준 18·19)", async () => {
    stubGetMe();

    const data = await fetchProfile();

    expect(data.streakDays).toBe(MOCK_PROFILE.streakDays);
    expect(data.collectionRate).toEqual(MOCK_PROFILE.collectionRate);
    expect(data.appVersion).toBe(MOCK_PROFILE.appVersion);
    expect(data.locationEnabled).toBe(MOCK_PROFILE.locationEnabled);
  });
});
