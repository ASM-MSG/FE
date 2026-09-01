/// <reference types="node" />
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * 정적 SEO 자산 단정 (MSG-478 A1~A6·B1·B2) — 검색 봇이 읽는 것은 CSR 셸(`index.html`)과
 * `public/`의 정적 파일뿐이라, 런타임이 아니라 **파일 그 자체**를 fs로 읽어 계약을 고정한다.
 * vitest include가 `src/**`라 `src/app/` 아래에 두고 상대 경로로 올라간다.
 * 경로는 `new URL("…", import.meta.url)` 리터럴 대신 path로 푼다 — Vite가 그 리터럴 형태를
 * 에셋 URL로 변환해 jsdom에서 http 출처가 되어 fs가 읽지 못한다.
 */
const HERE = path.dirname(fileURLToPath(import.meta.url));
const resolve = (relative: string) => path.resolve(HERE, relative);
const read = (relative: string) => readFileSync(resolve(relative), "utf-8");

const html = new DOMParser().parseFromString(
  read("../../index.html"),
  "text/html",
);

const meta = (selector: string) =>
  html.head.querySelector<HTMLMetaElement>(`meta[${selector}]`)?.content;
const metaByName = (name: string) => meta(`name="${name}"`);
const metaByProperty = (property: string) => meta(`property="${property}"`);

const TITLE = "필맵 FillMap — 우리 동네를 영상으로 채워가는 지도";
const DESCRIPTION =
  "방문한 곳을 짧은 영상으로 남기면 지도 위 격자가 색으로 채워져요. AI가 골라준 하이라이트로 기록하고, 핫플·축제 미션을 채워 뱃지를 모아보세요.";
const OG_IMAGE = "https://fillmap.kr/og-image.png";

describe("index.html 정적 메타 — 검색·공유 미리보기 (A1~A5)", () => {
  it("<title>은 브랜드+키워드 문구이며 60자 이내, description은 추천 문구이며 160자 이내다 (A1)", () => {
    expect(html.title).toBe(TITLE);
    expect(html.title.length).toBeLessThanOrEqual(60);
    expect(metaByName("description")).toBe(DESCRIPTION);
    expect(DESCRIPTION.length).toBeLessThanOrEqual(160);
  });

  it("Open Graph 10종이 있다 — 이미지는 절대 URL + 치수·alt 동봉 (A2)", () => {
    expect(metaByProperty("og:type")).toBe("website");
    expect(metaByProperty("og:url")).toBe("https://fillmap.kr/");
    expect(metaByProperty("og:title")).toBe(TITLE);
    expect(metaByProperty("og:description")).toBe(DESCRIPTION);
    expect(metaByProperty("og:image")).toBe(OG_IMAGE);
    expect(metaByProperty("og:image:width")).toBe("1200");
    expect(metaByProperty("og:image:height")).toBe("630");
    expect(metaByProperty("og:image:alt")).toBe(
      "우리 동네를 영상으로 한 칸씩 채워가는 지도 — 필맵",
    );
    expect(metaByProperty("og:site_name")).toBe("필맵");
    expect(metaByProperty("og:locale")).toBe("ko_KR");
  });

  it("Twitter 카드 4종이 property가 아니라 name 속성으로 있다 (A3)", () => {
    expect(metaByName("twitter:card")).toBe("summary_large_image");
    expect(metaByName("twitter:title")).toBe(TITLE);
    expect(metaByName("twitter:description")).toBe(DESCRIPTION);
    expect(metaByName("twitter:image")).toBe(OG_IMAGE);
  });

  it("canonical·theme-color·robots가 있다 (A4)", () => {
    expect(
      html.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href,
    ).toBe("https://fillmap.kr/");
    expect(metaByName("theme-color")).toBe("#0066CC");
    expect(metaByName("robots")).toBe("index, follow");
  });

  it("금지 항목이 없고 기존 파비콘·lang·viewport는 불변이다 (A5)", () => {
    const viewport = metaByName("viewport");

    expect(viewport).toBe("width=device-width, initial-scale=1.0");
    expect(viewport).not.toMatch(/user-scalable|maximum-scale/);
    expect(metaByName("keywords")).toBeUndefined();
    expect(
      html.head.querySelector('link[rel="apple-touch-startup-image"]'),
    ).toBeNull();
    expect(html.querySelectorAll("script:not([type='module'])")).toHaveLength(
      0,
    );
    expect(html.documentElement.lang).toBe("ko");
    expect(
      [...html.head.querySelectorAll<HTMLLinkElement>('link[rel*="icon"]')].map(
        (link) => link.getAttribute("href"),
      ),
    ).toEqual(["/favicon-32.png", "/favicon.png", "/apple-touch-icon.png"]);
  });
});

describe("public/og-image.png — 공유 미리보기 이미지 (A6)", () => {
  it("파일이 존재하고 PNG 헤더의 폭·높이가 1200×630이다", () => {
    const file = resolve("../../public/og-image.png");

    expect(existsSync(file)).toBe(true);
    const bytes = readFileSync(file);
    // PNG 시그니처(8B) + IHDR 청크 길이(4B) + 타입(4B) 뒤에 폭·높이가 각각 4B 빅엔디언
    expect(bytes.subarray(1, 4).toString("ascii")).toBe("PNG");
    expect(bytes.readUInt32BE(16)).toBe(1200);
    expect(bytes.readUInt32BE(20)).toBe(630);
  });
});

describe("public/robots.txt · sitemap.xml (B1·B2)", () => {
  const robots = () => read("../../public/robots.txt");
  const disallows = () =>
    [...robots().matchAll(/^Disallow:\s*(\S+)/gm)].map((m) => m[1]);

  it("robots.txt는 전체 허용 + 로그인 뒤 화면·콜백·스텁 Disallow + 절대 URL Sitemap을 담는다 (B1)", () => {
    const text = robots();

    expect(text).toMatch(/^User-agent: \*$/m);
    expect(text).toMatch(/^Allow: \/$/m);
    // MSG-488: /ai-route는 로그인 전용 화면이라 색인 대상이 아니다 (L13)
    // MSG-541: /org·/admin은 운영자·관리자 콘솔 — 색인 대상이 아니다 (AC 10)
    expect(disallows()).toEqual([
      "/dex",
      "/profile",
      "/oauth/",
      "/upload",
      "/ai-route",
      "/org",
      "/admin",
    ]);
    expect(text).toMatch(/^Sitemap: https:\/\/fillmap\.kr\/sitemap\.xml$/m);
  });

  it("sitemap.xml은 유효한 urlset이고 <loc>는 홈 하나뿐이며 lastmod가 없다 (B2)", () => {
    const xml = new DOMParser().parseFromString(
      read("../../public/sitemap.xml"),
      "application/xml",
    );

    expect(xml.querySelector("parsererror")).toBeNull();
    expect(xml.documentElement.tagName).toBe("urlset");
    expect(xml.documentElement.getAttribute("xmlns")).toBe(
      "http://www.sitemaps.org/schemas/sitemap/0.9",
    );
    expect(
      [...xml.querySelectorAll("url > loc")].map((loc) => loc.textContent),
    ).toEqual(["https://fillmap.kr/"]);
    expect(xml.querySelector("lastmod")).toBeNull();
  });

  it("robots Disallow 경로는 sitemap에 등재되지 않는다 (B2 교차)", () => {
    const locs = [
      ...new DOMParser()
        .parseFromString(read("../../public/sitemap.xml"), "application/xml")
        .querySelectorAll("url > loc"),
    ].map((loc) => new URL(loc.textContent ?? "").pathname);

    for (const disallowed of disallows()) {
      expect(locs.some((loc) => loc.startsWith(disallowed))).toBe(false);
    }
  });
});
