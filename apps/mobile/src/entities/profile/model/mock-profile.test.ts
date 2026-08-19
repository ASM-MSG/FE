import { describe, expect, it } from "vitest";
import { MOCK_PROFILE } from "./mock-profile";

/**
 * 모바일 프로필 mock 불변식 (구 AC 19 parity에서 전환 — MSG-329).
 * 웹은 프로필을 실 API(GET /api/users/me)로 전환하며 MOCK_PROFILE 원본을 폐기했다 —
 * parity 앵커가 사라져 모바일 단독 불변식으로 유지한다. 모바일 실 API 전환 티켓에서
 * 이 mock도 같은 방식으로 정리될 예정.
 *
 * MSG-425: "스트릭이 도감 mock과 일치한다" 케이스를 제거했다 — 도감이 실 API
 * (`collections/summary.currentStreak`)로 전환되며 앵커였던 `MOCK_COLLECTION_SUMMARY`가
 * 삭제됐고, 두 화면의 스트릭 정합은 이제 서버가 보장한다(mock 간 정합 불변식이 무의미).
 */
describe("MOCK_PROFILE 불변식 (구 AC 19)", () => {
  it("수집률 지역 라벨이 '부산'이다 — 서울 문자열 금지 (AC 4 로직)", () => {
    expect(MOCK_PROFILE.collectionRate.regionLabel).toBe("부산");
    expect(JSON.stringify(MOCK_PROFILE)).not.toContain("서울");
  });

  it("가입일이 유효한 ISO 날짜다 — 포맷터(formatJoinedDate) 입력 계약", () => {
    expect(Number.isNaN(Date.parse(MOCK_PROFILE.joinedAt))).toBe(false);
  });
});
