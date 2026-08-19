import { describe, expect, it } from "vitest";
import {
  SELECT_FAILURE_MESSAGES,
  STAGE_FAILURE_MESSAGES,
  UPLOAD_COMPLETE_COPY,
} from "./analysis-copy";
import type { UploadStage } from "./upload-orchestration";

/**
 * 기준 27·31·34 재작업: 실패 단계 → 문구 매핑과 완료 안내 카피에 테스트가 없었다.
 * 실기로도 확인하지 못한 구간(확정 단계 실패)이라 현재 무방비라는 검증 지적(권장 4)의 보수.
 */
describe("STAGE_FAILURE_MESSAGES — 단계 구분 실패 문구 (기준 31·34)", () => {
  it("presign·s3put·finalize 세 단계가 서로 다른 문구를 갖는다 — 어디서 실패했는지 구분된다 (기준 34)", () => {
    const stages: UploadStage[] = ["presign", "s3put", "finalize"];

    const messages = stages.map((stage) => STAGE_FAILURE_MESSAGES[stage]);

    expect(messages).toEqual([
      "업로드 준비에 실패했어요",
      "영상 업로드에 실패했어요",
      "게시에 실패했어요",
    ]);
    expect(new Set(messages).size).toBe(stages.length);
  });
});

describe("SELECT_FAILURE_MESSAGES — 파일 문제 복귀 사유 (기준 33)", () => {
  it("길이 초과 문구가 실제 상한(180초)을 말한다 — 안내와 검증 기준이 갈라지지 않게 (기준 33)", () => {
    expect(SELECT_FAILURE_MESSAGES["too-long"]).toContain("180초");
    expect(SELECT_FAILURE_MESSAGES["too-large"]).toContain("500MB");
    expect(SELECT_FAILURE_MESSAGES["corrupt-file"]).toContain(
      "다른 파일을 선택",
    );
  });
});

describe("UPLOAD_COMPLETE_COPY — 완료 안내 (기준 27)", () => {
  it("블러 후처리 안내가 원문 그대로다 — 축약·변형 금지 카피다 (기준 27)", () => {
    expect(UPLOAD_COMPLETE_COPY.blurNotice).toBe(
      "잠시 후 AI가 영상 블러 처리를 마치면 알림으로 알려드릴게요",
    );
  });
});
