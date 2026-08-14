import { describe, expect, it } from "vitest";
import { resolveBadgeArt } from "./badge-art";

describe("resolveBadgeArt — 뱃지 아트 소스 결정 (기준 19)", () => {
  it("iconUrl이 있으면 로컬 에셋 대신 그 URL을 쓴다 (백엔드 에셋 전환 대비)", () => {
    expect(resolveBadgeArt("EXPLORER_1", "https://cdn.example/badge.svg")).toBe(
      "https://cdn.example/badge.svg",
    );
  });

  it("iconUrl이 null이면 code에 대응하는 로컬 메달 에셋을 쓴다", () => {
    const art = resolveBadgeArt("STREAK_30", null);

    expect(art).not.toBeNull();
    expect(art).toContain("streak-30");
  });

  it("알 수 없는 code는 null이다 — 표시 컴포넌트가 민무늬 원으로 폴백한다 (경계)", () => {
    expect(resolveBadgeArt("MISSION_TOTAL_99", null)).toBeNull();
  });
});
