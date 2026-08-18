import { describe, expect, it } from "vitest";
import {
  deleteCardMeta,
  deleteCardTitle,
  shouldPatchVisibility,
  videoCardLabel,
  VISIBILITY_OPTIONS,
  visibilityLabel,
} from "./video-menu";

describe("VISIBILITY_OPTIONS — 더보기 메뉴 공개 범위 옵션 (AC 1, 추정 3)", () => {
  it("전체 공개·나만 보기 2종만 노출한다 — FRIENDS는 미노출", () => {
    expect(VISIBILITY_OPTIONS.map((o) => o.value)).toEqual([
      "PUBLIC",
      "PRIVATE",
    ]);
    expect(VISIBILITY_OPTIONS.map((o) => o.label)).toEqual([
      "전체 공개",
      "나만 보기",
    ]);
  });
});

describe("visibilityLabel — 공개 범위 표시 문구 (AC 2·3)", () => {
  it("PUBLIC은 '전체 공개', PRIVATE는 '나만 보기'로 표시한다", () => {
    expect(visibilityLabel("PUBLIC")).toBe("전체 공개");
    expect(visibilityLabel("PRIVATE")).toBe("나만 보기");
  });

  it("FRIENDS·미확보(null)는 라벨이 없다(null) — 표시 생략 (추정 3·7)", () => {
    expect(visibilityLabel("FRIENDS")).toBeNull();
    expect(visibilityLabel(null)).toBeNull();
  });
});

describe("shouldPatchVisibility — 같은 값 재선택 미발사 판정 (AC 2, 추정 5)", () => {
  it("현재값과 같은 항목 선택은 요청을 발사하지 않는다", () => {
    expect(shouldPatchVisibility("PUBLIC", "PUBLIC")).toBe(false);
    expect(shouldPatchVisibility("PRIVATE", "PRIVATE")).toBe(false);
  });

  it("현재값과 다른 항목 선택은 발사한다", () => {
    expect(shouldPatchVisibility("PUBLIC", "PRIVATE")).toBe(true);
  });

  it("현재값 미확보(null·FRIENDS)면 발사한다 — 서버 멱등이라 무해 (경계)", () => {
    expect(shouldPatchVisibility(null, "PUBLIC")).toBe(true);
    expect(shouldPatchVisibility("FRIENDS", "PUBLIC")).toBe(true);
  });
});

describe("videoCardLabel — 삭제 확인 카드 격자 라벨 (AC 3)", () => {
  it("구역 안 격자는 '서면 A-02' 형식이다", () => {
    expect(videoCardLabel("서면", "A-02", "부전제1동")).toBe("서면 A-02");
  });

  it("구역 밖이면 행정동 이름으로 폴백한다", () => {
    expect(videoCardLabel(null, null, "부전제1동")).toBe("부전제1동");
  });

  it("아무 라벨도 없으면 null — 표시 생략 신호", () => {
    expect(videoCardLabel(null, null, null)).toBeNull();
  });
});

describe("deleteCardTitle·deleteCardMeta — 삭제 확인 카드 문구 (AC 3, Figma 14792:3610)", () => {
  it("제목은 '서면 A-02 · 1:24' — 격자 라벨 · 영상 길이", () => {
    expect(deleteCardTitle("서면 A-02", 84)).toBe("서면 A-02 · 1:24");
  });

  it("라벨이 없으면 길이만 표시한다", () => {
    expect(deleteCardTitle(null, 84)).toBe("1:24");
  });

  it("메타는 '3일 전 수집 · 전체 공개' — 상대시간 수집 · 공개 범위", () => {
    expect(
      deleteCardMeta(
        "2026-08-14T00:00:00Z",
        "PUBLIC",
        new Date("2026-08-17T00:00:00Z"),
      ),
    ).toBe("3일 전 수집 · 전체 공개");
  });

  it("공개 범위 미확보 시 뒤 절을 생략한다 (추정 7)", () => {
    expect(
      deleteCardMeta(
        "2026-08-14T00:00:00Z",
        null,
        new Date("2026-08-17T00:00:00Z"),
      ),
    ).toBe("3일 전 수집");
  });
});
