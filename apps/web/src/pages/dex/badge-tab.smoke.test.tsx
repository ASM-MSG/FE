import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stubDexFetch } from "./dex-fetch-stub";
import { renderDexPanel, resetDexStores } from "./dex-test-harness";

/**
 * 뱃지 진열장 스모크 (MSG-327 기준 17~20) — 실 API 스텁 위에서 진열장의 안정 계약을 고정한다:
 * 대표 우선 정렬, 미획득 라벨 가림, 프리뷰 8칸 + 전체 보기 확장.
 * 순서 규칙의 값 판정은 badge-showcase 단위 테스트, 아트 소스 결정은 badge-art가 덮는다.
 */

const badge = (over: Record<string, unknown>) => ({
  badgeId: 1,
  code: "EXPLORER_1",
  name: "첫 발자국",
  description: null,
  iconUrl: null,
  earned: false,
  earnedAt: null,
  isNew: false,
  featuredRank: null,
  ...over,
});

/** 9개 — 프리뷰 8칸을 한 칸 넘겨 "전체 보기" 확장 경로가 살아 있게 한다 */
const BADGES = [
  badge({
    badgeId: 1,
    code: "EXPLORER_1",
    name: "첫 발자국",
    earned: true,
    earnedAt: "2026-08-01T00:00:00Z",
  }),
  badge({
    badgeId: 2,
    code: "STREAK_30",
    name: "한 달 개근",
    earned: true,
    earnedAt: "2026-07-01T00:00:00Z",
    featuredRank: 1,
  }),
  ...Array.from({ length: 7 }, (_, i) =>
    badge({ badgeId: 10 + i, code: `POPUP_${i}`, name: `미획득 뱃지 ${i}` }),
  ),
];

const renderBadgeTab = () => renderDexPanel("/dex/badges");

describe("뱃지 진열장 스모크", () => {
  beforeEach(() => {
    resetDexStores();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("획득 뱃지는 이름이, 미획득 뱃지는 '미획득'이 표시된다 (기준 20)", async () => {
    stubDexFetch({ badges: BADGES });
    renderBadgeTab();

    expect(await screen.findByText("한 달 개근")).toBeTruthy();
    expect(screen.getByText("첫 발자국")).toBeTruthy();
    expect(screen.queryByText("미획득 뱃지 0")).toBeNull();
    expect(screen.getAllByText("미획득").length).toBeGreaterThan(0);
  });

  it("프리뷰는 8칸이고 '전체 보기'로 카탈로그 전체가 펼쳐진다 (기준 17)", async () => {
    stubDexFetch({ badges: BADGES });
    renderBadgeTab();

    // 프리뷰 8칸 = 획득 2 + 미획득 6
    expect(await screen.findByText("한 달 개근")).toBeTruthy();
    expect(screen.getAllByText("미획득").length).toBe(6);

    fireEvent.click(screen.getByRole("button", { name: "전체 보기" }));

    expect(screen.getAllByText("미획득").length).toBe(7);
  });

  it("뱃지만 아직 도착하지 않았으면 빈 진열장이 아니라 로딩 안내가 보인다 (기준 22 — codex 리뷰 반영)", async () => {
    stubDexFetch({ holdBadges: true });
    renderBadgeTab();

    expect(
      await screen.findByRole("status", { name: "뱃지 불러오는 중" }),
    ).toBeTruthy();
    // 진열장 제목이 안 뜬다 = 획득 0개로 오독될 빈 그리드가 없다
    expect(screen.queryByText("뱃지 진열장")).toBeNull();
  });

  it("뱃지 조회 실패는 뱃지 탭만 막고 재시도를 제공한다 (기준 22)", async () => {
    stubDexFetch({ failPath: "/api/badges" });
    renderBadgeTab();

    expect(await screen.findByText("뱃지를 불러오지 못했어요")).toBeTruthy();
    // 요약·프로필은 살아 있다 — 부분 실패가 패널 전체를 막지 않는다
    expect(screen.getByText("필맵퍼")).toBeTruthy();
  });
});
