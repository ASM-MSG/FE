import { describe, expect, it } from "vitest";
import { MOCK_COLLECTION_SUMMARY } from "../../../features/dex/model/mock-collection";
import { MOCK_PROFILE } from "./mock-profile";

/**
 * 모바일 프로필 mock 불변식 (구 AC 19 parity에서 전환 — MSG-329).
 * 웹은 프로필을 실 API(GET /api/users/me)로 전환하며 MOCK_PROFILE 원본을 폐기했다 —
 * parity 앵커가 사라져 모바일 단독 불변식으로 유지한다. 모바일 실 API 전환 티켓에서
 * 이 mock도 같은 방식으로 정리될 예정.
 */
describe("MOCK_PROFILE 불변식 (구 AC 19)", () => {
  it("수집률 지역 라벨이 '부산'이다 — 서울 문자열 금지 (AC 4 로직)", () => {
    expect(MOCK_PROFILE.collectionRate.regionLabel).toBe("부산");
    expect(JSON.stringify(MOCK_PROFILE)).not.toContain("서울");
  });

  it("스트릭이 모바일 도감 mock(MOCK_COLLECTION_SUMMARY.streakDays)과 일치한다 — 두 화면이 같은 사용자를 다르게 말하지 않는다 (스펙 구현 계획)", () => {
    // entities → features 역참조(FSD 위반)를 피해 리터럴로 두고, 정합은 이 테스트가 고정한다
    expect(MOCK_PROFILE.streakDays).toBe(MOCK_COLLECTION_SUMMARY.streakDays);
  });

  it("가입일이 유효한 ISO 날짜다 — 포맷터(formatJoinedDate) 입력 계약", () => {
    expect(Number.isNaN(Date.parse(MOCK_PROFILE.joinedAt))).toBe(false);
  });
});
