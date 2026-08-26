/// <reference types="node" />
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SITE_TITLE, formatDocumentTitle } from "./document-title";

/**
 * 문서 제목 순수 함수 + 홈 제목 드리프트 가드 (MSG-478 C1).
 * `SITE_TITLE`은 `index.html`의 `<title>`과 **같은 문자열이 두 곳**에 존재한다(정적 셸 vs 런타임
 * 복원값). 한쪽만 고치면 홈 복귀 시 탭 제목이 검색 결과 제목과 어긋나므로 fs로 대조한다.
 * 경로는 `new URL("…", import.meta.url)` 리터럴 대신 path로 푼다 — Vite가 그 리터럴 형태를
 * 에셋 URL로 변환해 jsdom에서 http 출처가 되어 fs가 읽지 못한다.
 */
const INDEX_HTML = readFileSync(
  path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../index.html",
  ),
  "utf-8",
);

describe("formatDocumentTitle — 라우트별 문서 제목 (C1)", () => {
  it("화면명을 받으면 '{화면명} | 필맵'을 돌려준다", () => {
    expect(formatDocumentTitle("업로드")).toBe("업로드 | 필맵");
  });
});

describe("SITE_TITLE — index.html <title>과의 드리프트 가드 (C1)", () => {
  it("홈용 SITE_TITLE 상수는 index.html의 <title> 문자열과 같다", () => {
    const match = /<title>([^<]*)<\/title>/.exec(INDEX_HTML);

    expect(match?.[1]).toBe(SITE_TITLE);
  });
});
