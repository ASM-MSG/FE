import { describe, expect, it } from "vitest";
import type { DexBadge } from "@/entities/dex";
import { BADGE_PREVIEW_LIMIT, deriveBadgePreview } from "./badges";

const badge = (i: number, earned = false): DexBadge => ({
  badgeId: i,
  name: `뱃지 ${i}`,
  earned,
});

/** n개의 카탈로그 생성 — earnedIdx 위치만 획득 상태 */
const catalog = (n: number, earnedIdx: number[] = []): DexBadge[] =>
  Array.from({ length: n }, (_, i) => badge(i, earnedIdx.includes(i)));

describe("deriveBadgePreview — 뱃지 프리뷰 파생 (MSG-123 AC 3·8)", () => {
  it("프리뷰 상수는 8이다 — 4열 × 2행 (티켓 명시값)", () => {
    expect(BADGE_PREVIEW_LIMIT).toBe(8);
  });

  it("카탈로그가 8개 초과면 앞 8개만 정의 순서 그대로 반환하고 hasMore=true다 (AC 3)", () => {
    const preview = deriveBadgePreview(catalog(12));

    expect(preview.badges.length).toBe(BADGE_PREVIEW_LIMIT);
    expect(preview.badges.map((b) => b.badgeId)).toEqual(
      catalog(12)
        .slice(0, 8)
        .map((b) => b.badgeId),
    );
    expect(preview.hasMore).toBe(true);
  });

  it("8개 이하 입력이면 전량을 순서 그대로 반환하고 hasMore=false다", () => {
    const exact = deriveBadgePreview(catalog(8));
    expect(exact.badges.length).toBe(8);
    expect(exact.hasMore).toBe(false);

    const few = deriveBadgePreview(catalog(3));
    expect(few.badges.map((b) => b.badgeId)).toEqual([0, 1, 2]);
    expect(few.hasMore).toBe(false);
  });

  it("획득 0개 입력에서도 빈 상태 없이 전체 카탈로그를 반환한다 — 고정 카탈로그, earned는 파생에 무관 (AC 8)", () => {
    const preview = deriveBadgePreview(catalog(6)); // 전부 미획득

    expect(preview.badges.length).toBe(6);
    expect(preview.badges.every((b) => !b.earned)).toBe(true);
    expect(preview.hasMore).toBe(false);
  });

  it("획득 뱃지를 앞으로 재정렬하지 않는다 — 프리뷰 밖 획득 뱃지도 정의 순서를 유지한 채 잘린다 (A2)", () => {
    // 9번째(인덱스 9) 획득 뱃지는 프리뷰에 없다 — earned가 선별 기준이 아니다
    const preview = deriveBadgePreview(catalog(12, [0, 9]));

    expect(preview.badges.map((b) => b.badgeId)).toEqual(
      catalog(12)
        .slice(0, 8)
        .map((b) => b.badgeId),
    );
    expect(
      preview.badges.filter((b) => b.earned).map((b) => b.badgeId),
    ).toEqual([0]);
  });

  it("원본 배열은 변형하지 않는다", () => {
    const input = catalog(12);
    deriveBadgePreview(input);

    expect(input.length).toBe(12);
    expect(input.map((b) => b.badgeId)).toEqual(
      catalog(12).map((b) => b.badgeId),
    );
  });
});
