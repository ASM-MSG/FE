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

describe("문구 미확정 불변식 (기준 2)", () => {
  it("모든 약관 문서의 본문이 null이다 — 빈 문자열·가짜 본문으로 위장하지 않는다 (기준 2)", () => {
    expect(TERMS_DOCUMENTS.map((doc) => doc.body)).toEqual([
      null,
      null,
      null,
      null,
      null,
    ]);
  });

  it("모든 문서가 자리표시로 판정된다 — 문구가 채워지면 이 단정이 깨져 갱신을 강제한다 (기준 2)", () => {
    expect(TERMS_DOCUMENTS.every(isTermsPlaceholder)).toBe(true);
  });

  it("본문이 채워진 문서는 자리표시가 아니다 — 판정이 본문 유무 하나로 갈린다 (기준 2)", () => {
    expect(
      isTermsPlaceholder({
        key: "service",
        title: "서비스 이용약관",
        body: "제1조 …",
      }),
    ).toBe(false);
  });
});
