import { describe, expect, it } from "vitest";
import { MOCK_COLLECTION_SUMMARY } from "../../../features/dex/model/mock-collection";
import { MOCK_PROFILE } from "./mock-profile";

/**
 * AC 19: 모바일 프로필 mock ↔ 웹 MOCK_PROFILE 값 동등성 (parity — regions.parity 선례,
 * 웹 원본은 변수 경로 동적 import). 웹 원본은 내부에서 "@/entities/dex" 별칭을 쓰므로
 * 모바일 vitest.config의 "@" → 웹 src 별칭(parity 전용)이 전제다.
 * AC 4의 로직 반쪽(수집률 지역 라벨 "부산" — 서울 금지)도 여기서 고정한다.
 */
interface WebMockProfileModule {
  MOCK_PROFILE: typeof MOCK_PROFILE;
}
const WEB_MOCK_PROFILE_PATH = new URL(
  "../../../../../web/src/entities/profile/model/mock-profile.ts",
  import.meta.url,
).pathname;
const loadWebMockProfile = (): Promise<WebMockProfileModule> =>
  import(WEB_MOCK_PROFILE_PATH);

describe("MOCK_PROFILE 동등성 (AC 19)", () => {
  it("nickname·email·joinedAt·streakDays·collectionRate·appVersion·locationEnabled가 웹 MOCK_PROFILE과 값 동등하다 (AC 19)", async () => {
    const web = await loadWebMockProfile();
    expect(MOCK_PROFILE).toEqual(web.MOCK_PROFILE);
  });

  it("수집률 지역 라벨이 '부산'이다 — 서울 문자열 금지 (AC 4 로직)", () => {
    expect(MOCK_PROFILE.collectionRate.regionLabel).toBe("부산");
    expect(JSON.stringify(MOCK_PROFILE)).not.toContain("서울");
  });

  it("스트릭이 모바일 도감 mock(MOCK_COLLECTION_SUMMARY.streakDays)과 일치한다 — 두 화면이 같은 사용자를 다르게 말하지 않는다 (스펙 구현 계획)", () => {
    // entities → features 역참조(FSD 위반)를 피해 리터럴로 두고, 정합은 이 테스트가 고정한다
    expect(MOCK_PROFILE.streakDays).toBe(MOCK_COLLECTION_SUMMARY.streakDays);
  });
});
