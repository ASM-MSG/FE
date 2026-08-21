import { describe, expect, it } from "vitest";
import { ApiError } from "../../../shared/api/api-error";
import * as mobile from "./report";

/**
 * L12 parity: 모바일 `report` ↔ 웹 `features/video-actions/model/report.ts` 동등성.
 * 사유 카탈로그·서버 enum 매핑이 갈리면 같은 신고가 플랫폼별로 다른 사유로 접수되고,
 * 중복 신고 판정이 갈리면 안내 문구가 갈린다.
 *
 * `reportFailureNotice`는 `instanceof ApiError`로 분기하는데 웹·모바일이 **각자의 클래스**를
 * 갖는다(모바일 api-error는 웹 복제본 — api-error.parity.test.ts가 별도로 고정한다).
 * 그래서 같은 (status, developCode) 조합을 각 모듈의 클래스로 만들어 결과를 대조한다.
 */
interface WebReportModule {
  REPORT_REASONS: typeof mobile.REPORT_REASONS;
  canSubmitReport: typeof mobile.canSubmitReport;
  toServerReportReason: typeof mobile.toServerReportReason;
  DUPLICATE_REPORT_DEVELOP_CODE: number;
  reportFailureNotice: typeof mobile.reportFailureNotice;
}

interface WebApiErrorModule {
  ApiError: new (
    message: string,
    options?: { status?: number; developCode?: number },
  ) => Error;
}

const WEB_REPORT_PATH = new URL(
  "../../../../../web/src/features/video-actions/model/report.ts",
  import.meta.url,
).pathname;

const WEB_API_ERROR_PATH = new URL(
  "../../../../../web/src/shared/api/api-error.ts",
  import.meta.url,
).pathname;

const loadWebReport = (): Promise<WebReportModule> => import(WEB_REPORT_PATH);
const loadWebApiError = (): Promise<WebApiErrorModule> =>
  import(WEB_API_ERROR_PATH);

/** 실패 분기 표본 — 중복(developCode)·중복(HTTP)·일반 실패·네트워크 실패 */
const FAILURE_SAMPLES = [
  { status: 400, developCode: 11409 },
  { status: 409, developCode: undefined },
  { status: 500, developCode: 9999 },
  { status: undefined, developCode: undefined },
] as const;

describe("report 동등성 (L12)", () => {
  it("신고 사유 카탈로그가 웹 원본과 id·문구·순서까지 같다 (L12)", async () => {
    const web = await loadWebReport();

    expect(mobile.REPORT_REASONS).toEqual(web.REPORT_REASONS);
  });

  it("제출 판정이 유효 id 3종 + 무효 입력 2종에서 웹과 같다 (L12)", async () => {
    const web = await loadWebReport();

    for (const id of ["content", "privacy", "spam", "HARMFUL", null]) {
      expect(mobile.canSubmitReport(id)).toBe(web.canSubmitReport(id));
    }
  });

  it("서버 enum 매핑과 중복 신고 코드가 웹과 같다 (L12)", async () => {
    const web = await loadWebReport();

    for (const id of ["content", "privacy", "spam"] as const) {
      expect(mobile.toServerReportReason(id)).toBe(
        web.toServerReportReason(id),
      );
    }
    expect(mobile.DUPLICATE_REPORT_DEVELOP_CODE).toBe(
      web.DUPLICATE_REPORT_DEVELOP_CODE,
    );
  });

  it("실패 분기 4표본의 문구·닫기 여부가 웹과 같다 (L12)", async () => {
    const web = await loadWebReport();
    const { ApiError: WebApiError } = await loadWebApiError();

    for (const { status, developCode } of FAILURE_SAMPLES) {
      expect(
        mobile.reportFailureNotice(
          new ApiError("실패", { status, developCode }),
        ),
      ).toEqual(
        web.reportFailureNotice(
          new WebApiError("실패", { status, developCode }),
        ),
      );
    }
  });
});
