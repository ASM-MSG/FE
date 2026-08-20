import { describe, expect, it } from "vitest";
import {
  deleteCardMeta,
  deleteCardTitle,
  shouldPatchVisibility,
  videoCardLabel,
  visibilityLabel,
  VISIBILITY_OPTIONS,
} from "./video-menu";

/**
 * 템플릿 ① 순수 로직 — 더보기 시트·삭제 확인 카드의 파생 값 (MSG-431 L1~L4).
 * 웹 `features/video-actions/model/video-menu.ts` 포팅분이며, 웹과의 동등성은
 * `video-menu.parity.test.ts`(L5)가 따로 고정한다.
 */

const NOW = new Date("2026-08-19T12:00:00+09:00");

describe("VISIBILITY_OPTIONS — 시트가 노출하는 공개 범위 (L1)", () => {
  it("전체 공개·나만 보기 2종만 노출하고 FRIENDS를 포함하지 않는다 (L1)", () => {
    expect(VISIBILITY_OPTIONS).toEqual([
      { value: "PUBLIC", label: "전체 공개" },
      { value: "PRIVATE", label: "나만 보기" },
    ]);
  });
});

describe("shouldPatchVisibility — 전환 발사 판정 (L2)", () => {
  it("현재값과 같은 항목을 고르면 발사하지 않는다 (L2)", () => {
    expect(shouldPatchVisibility("PUBLIC", "PUBLIC")).toBe(false);
    expect(shouldPatchVisibility("PRIVATE", "PRIVATE")).toBe(false);
  });

  it("다른 값·미확보(null)·FRIENDS에서의 선택은 발사한다 (L2)", () => {
    expect(shouldPatchVisibility("PUBLIC", "PRIVATE")).toBe(true);
    expect(shouldPatchVisibility(null, "PUBLIC")).toBe(true);
    expect(shouldPatchVisibility("FRIENDS", "PUBLIC")).toBe(true);
  });
});

describe("visibilityLabel — 공개 범위 표시 문구 (L3)", () => {
  it("PUBLIC·PRIVATE에 한국어 라벨을 낸다 (L3)", () => {
    expect(visibilityLabel("PUBLIC")).toBe("전체 공개");
    expect(visibilityLabel("PRIVATE")).toBe("나만 보기");
  });

  it("FRIENDS·미확보(null)는 null을 내 표시를 생략한다 (L3)", () => {
    expect(visibilityLabel("FRIENDS")).toBeNull();
    expect(visibilityLabel(null)).toBeNull();
  });
});

describe("videoCardLabel — 삭제 확인 카드 격자 라벨 (L4)", () => {
  it('구역 안 격자는 "{구역} {셀}"이다 (L4)', () => {
    expect(videoCardLabel("서면", "A-02", "부전2동")).toBe("서면 A-02");
  });

  it("구역 밖 격자는 행정동 이름으로 폴백하고, 둘 다 없으면 null이다 (L4)", () => {
    expect(videoCardLabel(null, null, "부전2동")).toBe("부전2동");
    expect(videoCardLabel(null, null, null)).toBeNull();
  });
});

describe("deleteCardTitle·deleteCardMeta — 삭제 확인 카드 2줄 (L4)", () => {
  it('"서면 A-02 · 1:24" / "3일 전 수집 · 전체 공개"를 만든다 (L4)', () => {
    expect(deleteCardTitle("서면 A-02", 84)).toBe("서면 A-02 · 1:24");
    expect(deleteCardMeta("2026-08-16T12:00:00+09:00", "PUBLIC", NOW)).toBe(
      "3일 전 수집 · 전체 공개",
    );
  });

  it("격자 라벨이 없으면 길이만 남는다 (L4)", () => {
    expect(deleteCardTitle(null, 84)).toBe("1:24");
  });

  it('공개 상태가 없으면 "3일 전 수집"까지만 낸다 (L4)', () => {
    expect(deleteCardMeta("2026-08-16T12:00:00+09:00", null, NOW)).toBe(
      "3일 전 수집",
    );
  });
});
