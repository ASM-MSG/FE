import { describe, expect, it } from "vitest";
import { MOCK_DEX } from "@/entities/dex";
import { MOCK_PROFILE } from "./mock-profile";

/**
 * 프로필 mock 불변식 (AC 5·6) — 값 자체가 아니라 도감 mock과의 정합·금지 규칙을 단정한다
 * (mock-dex.test 패턴). mock 수치 조정 시 이 규칙만 지키면 된다.
 */
describe("프로필 mock 정합성 (AC 5)", () => {
  it("프로필 닉네임이 도감 닉네임과 일치한다 — 두 화면이 같은 사용자를 다르게 말하지 않는다", () => {
    expect(MOCK_PROFILE.nickname).toBe(MOCK_DEX.summary.nickname);
  });

  it("프로필 스트릭이 도감 streakDays와 일치한다", () => {
    expect(MOCK_PROFILE.streakDays).toBe(MOCK_DEX.summary.streakDays);
  });

  it("가입일이 유효한 ISO 날짜다 — 포맷터(formatJoinedDate) 입력 계약", () => {
    expect(Number.isNaN(Date.parse(MOCK_PROFILE.joinedAt))).toBe(false);
  });
});

describe("프로필 mock 서울 지명 부재 (AC 6)", () => {
  it("프로필 mock 어디에도 서울 지명이 없다 — MVP 부산 서면 규칙", () => {
    const seoulNames = /서울|마포|강남|홍대|성수|이태원|종로|여의도/;
    expect(JSON.stringify(MOCK_PROFILE)).not.toMatch(seoulNames);
  });

  it("수집률 지역 라벨은 '부산'이다 — Figma '서울 34%'는 지명 치환된 플레이스홀더 (티켓 명시)", () => {
    expect(MOCK_PROFILE.collectionRate.regionLabel).toBe("부산");
  });
});
