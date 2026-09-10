import { describe, expect, it } from "vitest";
import { ONBOARDING_ILLUST_XML as fill } from "./illust-fill";
import { ONBOARDING_ILLUST_XML as record } from "./illust-record";
import { ONBOARDING_ILLUST_XML as explore } from "./illust-explore";

/**
 * 테스트 템플릿 ① 순수 로직 — 일러 XML 자산 모듈의 루트 계약을 단정한다 (MSG-590 L5).
 * Figma export 루트의 `preserveAspectRatio="none"`이 남으면 `SvgXml` 폭 맞춤 시 왜곡된다.
 */
describe("온보딩 일러 XML 자산 (MSG-590 L5)", () => {
  it.each([
    ["fill", fill],
    ["record", record],
    ["explore", explore],
  ])(
    "%s 일러는 <svg로 시작하고 viewBox 390×485를 가지며 preserveAspectRatio=none을 포함하지 않는다 (L5)",
    (_, xml) => {
      expect(xml.startsWith("<svg")).toBe(true);
      expect(xml).toContain('viewBox="0 0 390 485"');
      expect(xml).not.toContain('preserveAspectRatio="none"');
    },
  );
});
