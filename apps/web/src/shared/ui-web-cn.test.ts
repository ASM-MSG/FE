import { describe, expect, it } from "vitest";
import { cn } from "@fillmap/ui-web";

/**
 * `cn`(@fillmap/ui-web)이 FeelMap 타이포 클래스를 지우지 않는지 고정한다
 * (MSG-395 회귀 방지). tailwind-merge는 커스텀 `text-fm-*`를 이름만 보고 색상으로
 * 분류해, 같은 호출 안의 `text-<색>`과 충돌시켜 **조용히 지웠다** — 배지·라벨 글자가
 * 브라우저 기본 16px로 커져 카드 높이가 Figma 87px 대신 107px이 되던 실제 버그다.
 *
 * 테스트가 앱 쪽에 있는 이유: ui-web 패키지에는 테스트 러너가 없고(스토리북만 있다),
 * 이 계약이 실제로 깨진 곳도 앱 화면이다. 러너가 패키지에 생기면 그쪽으로 옮긴다.
 */
describe("cn — 타이포 클래스와 색상 클래스는 공존한다", () => {
  it("text-fm-*와 text-<색>이 함께 살아남는다", () => {
    const result = cn("rounded-full text-fm-caption", "text-foreground-muted");

    expect(result).toContain("text-fm-caption");
    expect(result).toContain("text-foreground-muted");
  });

  it("순서가 반대여도 둘 다 남는다", () => {
    const result = cn("text-primary", "text-fm-label");

    expect(result).toContain("text-primary");
    expect(result).toContain("text-fm-label");
  });

  it("타이포 클래스끼리는 여전히 뒤엣것이 이긴다 — 크기 그룹 안의 충돌은 유지", () => {
    const result = cn("text-fm-caption", "text-fm-title");

    expect(result).toContain("text-fm-title");
    expect(result).not.toContain("text-fm-caption");
  });

  it("색상 클래스끼리도 뒤엣것이 이긴다 (기존 동작 보존)", () => {
    const result = cn("text-primary", "text-foreground-muted");

    expect(result).toBe("text-foreground-muted");
  });
});
