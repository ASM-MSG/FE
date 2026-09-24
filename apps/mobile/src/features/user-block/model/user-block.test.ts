import { describe, expect, it } from "vitest";
import type { BlockedUserResponseDto } from "../../../shared/api/sdk";
import {
  BLOCK_CONFIRM_DESCRIPTION,
  blockConfirmTitle,
  removeBlockedUser,
  resolveBlockListState,
  toBlockedUserRowView,
} from "./user-block";

/**
 * 템플릿 ① 순수 로직 — 사용자 차단 확인 문구·차단 목록 4상태 판정·행 표시 파생·해제 seed
 * (MSG-570 기준 3·13·14·16). 화면은 이 파생만 읽는 얇은 스위치다.
 */

const blocked = (
  overrides: Partial<BlockedUserResponseDto> = {},
): BlockedUserResponseDto => ({
  userId: 42,
  nickname: "서면탐험가",
  profileImageUrl: null,
  blockedAt: "2026-09-11T02:30:00",
  ...overrides,
});

describe("blockConfirmTitle — 차단 확인 다이얼로그 제목 (기준 3)", () => {
  it("'@닉네임 님을 차단할까요?' 형식이다 — @는 FE가 붙인다 (기준 3)", () => {
    expect(blockConfirmTitle("서면탐험가")).toBe(
      "@서면탐험가 님을 차단할까요?",
    );
  });

  it("본문은 영상·댓글이 사라진다는 안내와 해제 위치를 함께 알린다 (기준 3)", () => {
    expect(BLOCK_CONFIRM_DESCRIPTION).toBe(
      "이 사용자의 영상과 댓글이 더 이상 보이지 않아요. 프로필 > 차단한 사용자에서 해제할 수 있어요",
    );
  });
});

describe("resolveBlockListState — 로딩·실패·빈·목록 4상태 판정 (기준 16)", () => {
  it("실패 > 로딩 > 빈 > 목록 순으로 판정한다 — 재조회 중 실패도 실패다 (기준 16)", () => {
    const item = blocked();

    expect(
      resolveBlockListState({ isPending: true, isError: true, items: [item] }),
    ).toBe("error");
    expect(
      resolveBlockListState({ isPending: true, isError: false, items: [] }),
    ).toBe("loading");
    expect(
      resolveBlockListState({ isPending: false, isError: false, items: [] }),
    ).toBe("empty");
    expect(
      resolveBlockListState({
        isPending: false,
        isError: false,
        items: [item],
      }),
    ).toBe("list");
  });
});

describe("toBlockedUserRowView — 차단 1건 → 행 표시 재료 (기준 13)", () => {
  it("닉네임·이니셜(첫 글자)·아바타 URL·차단일 YYYY.MM.DD(KST)가 파생된다 (기준 13)", () => {
    expect(
      toBlockedUserRowView(
        blocked({
          profileImageUrl: "https://cdn.test/42.jpg",
          blockedAt: "2026-09-11T15:30:00",
        }),
      ),
    ).toEqual({
      nickname: "서면탐험가",
      initial: "서",
      avatarUrl: "https://cdn.test/42.jpg",
      blockedAt: "2026.09.12",
    });
  });

  it("프로필 이미지가 없으면 avatarUrl이 undefined라 Avatar가 이니셜 폴백을 그린다 (기준 13)", () => {
    expect(toBlockedUserRowView(blocked()).avatarUrl).toBeUndefined();
  });
});

describe("removeBlockedUser — 해제 성공 seed용 필터 (기준 14)", () => {
  it("해제한 userId의 행만 빠지고 서버 순서는 유지된다 (기준 14)", () => {
    const list = [
      blocked({ userId: 3 }),
      blocked({ userId: 42 }),
      blocked({ userId: 7 }),
    ];

    expect(removeBlockedUser(list, 42).map((u) => u.userId)).toEqual([3, 7]);
  });

  it("목록에 없는 userId면 그대로다 (경계)", () => {
    const list = [blocked({ userId: 3 })];

    expect(removeBlockedUser(list, 99)).toEqual(list);
  });
});
