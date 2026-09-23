import { describe, expect, it } from "vitest";
import {
  TERMS_DOCUMENTS,
  isTermsPlaceholder,
  resolveTermsDocument,
} from "./terms-documents";

/**
 * 템플릿 ① 순수 로직 — 약관 문서 카탈로그 조회와 "문구 미확정" 불변식 (기준 1·2·7).
 * 뷰어 1개를 문서 5종이 공유하므로, 화면이 읽는 유일한 입구가 이 두 함수다.
 */

describe("resolveTermsDocument — 문서 키 조회 (기준 1·7)", () => {
  it("유효한 문서 키 5종 전부에 대해 카탈로그의 제목을 돌려준다 (기준 1)", () => {
    expect(
      TERMS_DOCUMENTS.map((doc) => [
        doc.key,
        resolveTermsDocument(doc.key)?.title,
      ]),
    ).toEqual([
      ["service", "서비스 이용약관"],
      ["privacy-collection", "개인정보 수집 및 이용"],
      ["location", "위치기반서비스 이용약관"],
      ["marketing", "마케팅 정보 수신"],
      ["privacy-policy", "개인정보 처리방침"],
    ]);
  });

  it("알 수 없는 문서 키에는 null을 돌려준다 — 라우트 직접 진입 방어 (기준 7)", () => {
    expect(resolveTermsDocument("unknown")).toBeNull();
    expect(resolveTermsDocument("")).toBeNull();
    expect(resolveTermsDocument("SERVICE")).toBeNull();
  });
});

describe("본문 (MSG-604 브랜치에서 채움 — 종전 기준 2 '문구 미확정' 불변식을 대체)", () => {
  it("모든 문서에 본문이 있고, 제목이 첫 줄이며, 시행일이 적혀 있다", () => {
    for (const doc of TERMS_DOCUMENTS) {
      expect(doc.body, doc.key).not.toBeNull();
      expect(doc.body!.split("\n")[0], doc.key).toContain(
        doc.title.replace("마케팅 정보 수신", "마케팅 정보 수신 동의"),
      );
      expect(doc.body, doc.key).toMatch(/시행/);
      expect(doc.body, doc.key).toContain("support@fillmap.kr");
    }
  });

  it("본문이 채워진 문서는 자리표시가 아니고, 본문이 null이면 자리표시다 — 판정은 본문 유무 하나로 갈린다", () => {
    expect(TERMS_DOCUMENTS.some(isTermsPlaceholder)).toBe(false);
    expect(
      isTermsPlaceholder({
        key: "service",
        title: "서비스 이용약관",
        body: null,
      }),
    ).toBe(true);
  });
});
