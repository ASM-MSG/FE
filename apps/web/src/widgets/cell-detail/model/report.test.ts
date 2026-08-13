import { describe, expect, it, vi } from "vitest";
import { canSubmitReport, REPORT_REASONS, submitReport } from "./report";

describe("REPORT_REASONS", () => {
  // L1: 신고 사유 옵션은 정확히 3개이며 라벨이 확정 문구와 일치한다
  it("정확히 3개의 사유 옵션을 가진다", () => {
    expect(REPORT_REASONS).toHaveLength(3);
  });

  it("각 옵션의 라벨이 기획에 확정된 문구와 일치한다", () => {
    expect(REPORT_REASONS.map((r) => r.label)).toEqual([
      "부적절한 콘텐츠(선정성·폭력성 등)",
      "사생활 침해(얼굴·번호판 등 노출)",
      "스팸 또는 도배성 콘텐츠",
    ]);
  });

  it("각 옵션의 id는 content / privacy / spam 이다", () => {
    expect(REPORT_REASONS.map((r) => r.id)).toEqual([
      "content",
      "privacy",
      "spam",
    ]);
  });
});

describe("canSubmitReport", () => {
  // L2: 사유 미선택(null)이면 false
  it("사유가 선택되지 않았으면(null) false를 반환한다", () => {
    expect(canSubmitReport(null)).toBe(false);
  });

  // L2: 유효한 사유 id면 true
  it("유효한 사유 id가 선택되면 true를 반환한다", () => {
    for (const reason of REPORT_REASONS) {
      expect(canSubmitReport(reason.id)).toBe(true);
    }
  });

  // L3: 목록에 없는 id면 false
  it("유효하지 않은(목록에 없는) 사유 id면 false를 반환한다", () => {
    expect(canSubmitReport("unknown")).toBe(false);
    expect(canSubmitReport("")).toBe(false);
  });
});

describe("submitReport", () => {
  // L4: 목업 제출은 선택된 사유 id로 성공 결과를 반환한다
  it("선택된 사유 id를 받아 성공 결과를 반환한다", async () => {
    await expect(submitReport("content")).resolves.toEqual({ ok: true });
  });

  // L4: 서버/네트워크·플랫폼 API를 호출하지 않는다
  it("fetch 등 네트워크·플랫폼 API를 호출하지 않는다", async () => {
    const fetchSpy = vi.fn();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    try {
      await submitReport("spam");
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
