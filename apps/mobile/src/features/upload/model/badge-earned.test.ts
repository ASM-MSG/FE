import { describe, expect, it } from "vitest";
import type { EarnedBadgeResponseDto } from "../../../shared/api/sdk";
import {
  BADGE_EARNED_COPY,
  describeBadgeCard,
  dotsLabel,
} from "./badge-earned";

/**
 * MSG-617 — 업로드 확정 응답 `newBadges`로 뜨는 축하 모달의 **장(card) 파생**을 고정한다.
 * 모달은 응답 배열을 한 장씩 넘기며 보여 주고, 마지막 장에서만 [확인]이다(D10: 닫기 제스처는
 * 남은 장과 무관하게 전체를 닫는다 — 장 상태만 여기서 파생).
 */
const badge = (
  code: string,
  description: string | null = `${code} 설명`,
): EarnedBadgeResponseDto => ({
  badgeId: code.length,
  code,
  name: `${code} 이름`,
  description,
  iconUrl: null,
});

describe("describeBadgeCard — 획득 뱃지 장 파생 (AC 1·3·4·6)", () => {
  it("newBadges가 빈 배열이면 카드가 null이다 — 모달이 렌더되지 않는다 (AC 3)", () => {
    expect(describeBadgeCard([], 0)).toBeNull();
  });

  it("범위 밖 index는 null이다 (경계)", () => {
    const badges = [badge("EXPLORER_1")];

    expect(describeBadgeCard(badges, 1)).toBeNull();
    expect(describeBadgeCard(badges, -1)).toBeNull();
  });

  it("1개면 첫 장이 마지막 장이고 주 버튼은 '확인'이다 (AC 1)", () => {
    const card = describeBadgeCard([badge("EXPLORER_1")], 0);

    expect(card).toMatchObject({
      index: 0,
      total: 1,
      isLast: true,
      primaryLabel: BADGE_EARNED_COPY.confirm,
    });
    expect(card?.badge.code).toBe("EXPLORER_1");
  });

  it("3개 중 첫 장은 마지막이 아니고 주 버튼은 '다음'이다 (AC 6)", () => {
    const badges = [badge("A"), badge("B"), badge("C")];

    const card = describeBadgeCard(badges, 0);

    expect(card).toMatchObject({
      index: 0,
      total: 3,
      isLast: false,
      primaryLabel: BADGE_EARNED_COPY.next,
    });
    expect(BADGE_EARNED_COPY.next).toBe("다음");
  });

  it("3개 중 마지막 장은 isLast이고 주 버튼은 '확인'이다 (AC 6)", () => {
    const badges = [badge("A"), badge("B"), badge("C")];

    const card = describeBadgeCard(badges, 2);

    expect(card).toMatchObject({
      index: 2,
      total: 3,
      isLast: true,
      primaryLabel: BADGE_EARNED_COPY.confirm,
    });
    expect(card?.badge.code).toBe("C");
    expect(BADGE_EARNED_COPY.confirm).toBe("확인");
  });

  it("description이 null인 뱃지는 null 그대로 통과한다 — 뷰가 설명 줄을 생략할 근거 (AC 4)", () => {
    const card = describeBadgeCard([badge("STREAK_30", null)], 0);

    expect(card?.badge.description).toBeNull();
  });
});

describe("BADGE_EARNED_COPY·dotsLabel — 모달 문구 (AC 1·13)", () => {
  it("헤드라인은 '새 뱃지 획득'이다 (AC 1)", () => {
    expect(BADGE_EARNED_COPY.title).toBe("새 뱃지 획득");
  });

  it("점 인디케이터 a11y 라벨은 '{n}개 중 {i+1}번째 뱃지'다 (AC 13)", () => {
    expect(dotsLabel(0, 3)).toBe("3개 중 1번째 뱃지");
    expect(dotsLabel(2, 3)).toBe("3개 중 3번째 뱃지");
  });
});
