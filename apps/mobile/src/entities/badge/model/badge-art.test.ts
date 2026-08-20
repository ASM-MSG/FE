import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BADGE_ART_CODES, isSvgUri, resolveBadgeArt } from "./badge-art";

/**
 * L6 — 로컬 메달 카탈로그가 웹 `entities/badge/model/badge-art.ts`의 code 집합과 같은지,
 * 아트 소스 우선순위가 웹과 같은지 고정한다. 에셋 **본문**은 비교 대상이 아니다
 * (웹은 번들러가 URL로 바꾸고 모바일은 XML 문자열이라 형이 다르다 — 변환 동등성은
 * 변환기의 구조 대조가 담당한다).
 */
const WEB_BADGE_ART_PATH = new URL(
  "../../../../../web/src/entities/badge/model/badge-art.ts",
  import.meta.url,
).pathname;

/** 웹 원본의 `BADGE_ART` 객체 리터럴 키 — 웹 모듈은 svg를 import해 러너에서 로드할 수 없다 */
const webBadgeCodes = (): string[] => {
  const source = readFileSync(WEB_BADGE_ART_PATH, "utf8");
  const body = source.slice(source.indexOf("const BADGE_ART"));
  return [...body.matchAll(/^ {2}([A-Z][A-Z0-9_]*):/gm)].map(
    (match) => match[1],
  );
};

describe("isSvgUri — 원격 아트 형식 판별 (MSG-430 F1)", () => {
  it(".svg로 끝나는 URL은 SVG로 판별한다", () => {
    expect(isSvgUri("https://cdn.example/badges/explorer_1.svg")).toBe(true);
  });

  it(".png URL은 SVG가 아니다 — 서버가 실제로 내려주는 래스터가 SVG 파서로 가면 안 그려진다", () => {
    expect(
      isSvgUri(
        "https://fillmap-static.s3.ap-northeast-2.amazonaws.com/badges/explorer_1.png",
      ),
    ).toBe(false);
  });

  it("쿼리스트링·해시가 붙어도 경로 확장자로 판별한다", () => {
    expect(isSvgUri("https://cdn.example/badge.svg?v=2")).toBe(true);
    expect(isSvgUri("https://cdn.example/badge.png?format=svg")).toBe(false);
    expect(isSvgUri("https://cdn.example/badge.svg#medal")).toBe(true);
  });

  it("확장자가 없는 URL은 SVG가 아니다 — 래스터로 폴백한다 (경계)", () => {
    expect(isSvgUri("https://cdn.example/badges/explorer_1")).toBe(false);
  });

  it("확장자 대소문자를 가리지 않는다", () => {
    expect(isSvgUri("https://cdn.example/BADGE.SVG")).toBe(true);
  });
});

describe("resolveBadgeArt — 뱃지 아트 소스 결정 (L6)", () => {
  it("iconUrl이 있으면 로컬 카탈로그 대신 그 URL을 쓴다 (백엔드 에셋 전환 대비)", () => {
    expect(
      resolveBadgeArt("EXPLORER_1", "https://cdn.example/badge.svg"),
    ).toEqual({
      kind: "svg-uri",
      uri: "https://cdn.example/badge.svg",
    });
  });

  it("iconUrl이 래스터면 SVG가 아닌 이미지 소스로 돌려준다 (MSG-430 F1 회귀 방지)", () => {
    expect(
      resolveBadgeArt("EXPLORER_1", "https://cdn.example/badge.png"),
    ).toEqual({
      kind: "image-uri",
      uri: "https://cdn.example/badge.png",
    });
  });

  it("iconUrl이 null이면 code에 대응하는 로컬 메달 XML을 쓴다", () => {
    const art = resolveBadgeArt("STREAK_30", null);

    expect(art?.kind).toBe("xml");
    expect(art?.kind === "xml" && art.xml.startsWith("<svg")).toBe(true);
  });

  it("알 수 없는 code는 null이다 — 표시 컴포넌트가 민무늬 원으로 폴백한다 (경계)", () => {
    expect(resolveBadgeArt("MISSION_TOTAL_99", null)).toBeNull();
  });
});

describe("로컬 메달 카탈로그 (L6)", () => {
  it("code 24개가 웹 BADGE_ART 키 집합과 정확히 일치한다", () => {
    expect([...BADGE_ART_CODES].sort()).toEqual([...webBadgeCodes()].sort());
    expect(BADGE_ART_CODES).toHaveLength(24);
  });

  it("모든 code가 아트보드 배경이 제거된 148 viewBox SVG로 해석된다", () => {
    for (const code of BADGE_ART_CODES) {
      const art = resolveBadgeArt(code, null);
      expect(art?.kind).toBe("xml");
      const xml = art?.kind === "xml" ? art.xml : "";
      expect(xml).toContain('viewBox="0 0 148 148"');
      // Figma 아트보드 배경(뷰박스 밖 흰 사각형)이 남아 있으면 테마 배경 위에 흰 판이 보인다
      expect(xml).not.toContain('height="3530"');
      expect(xml).not.toMatch(/<rect[^>]*x="-18\.5"/);
    }
  });
});
