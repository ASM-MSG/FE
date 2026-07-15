import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("조건부 클래스를 병합한다", () => {
    const hidden = false as boolean;
    expect(cn("flex", hidden && "hidden", "gap-md")).toBe("flex gap-md");
  });

  it("충돌하는 tailwind 클래스는 뒤의 값이 이긴다", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  // 알려진 한계: twMerge 기본 설정은 커스텀 토큰 클래스(p-xs 등)의 충돌을
  // 인식하지 못해 둘 다 유지된다. extendTailwindMerge 설정 전까지의 현재 동작.
  // docs/decisions/DECISIONS.md 2026-07-15 항목 참조.
  it("커스텀 토큰 클래스 충돌은 병합되지 않는다 (미설정 상태)", () => {
    expect(cn("p-xs", "p-xl")).toBe("p-xs p-xl");
  });
});
