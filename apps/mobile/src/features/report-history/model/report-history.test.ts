import { describe, expect, it } from "vitest";
import {
  REPORT_REASON_FALLBACK_LABEL,
  REPORT_STATUS_FALLBACK_LABEL,
  formatReportedAt,
  reportReasonLabel,
  reportStatusLabel,
  reportTargetLabel,
  resolveReportListState,
  toReportRowView,
  type MyReportItem,
} from "./report-history";

/**
 * 템플릿 ① 순수 로직 — 내 신고 내역의 4상태 판정과 4필드 표시 파생 (기준 19~23).
 * 서버 엔드포인트가 아직 없어(스펙 실측 A) 화면 기본 경로는 빈 목록이지만, 로딩·실패·목록
 * 경로가 죽은 코드가 되지 않도록 판정과 파생을 전부 여기서 fixture로 구동한다.
 */

const item = (overrides: Partial<MyReportItem> = {}): MyReportItem => ({
  reportId: 1,
  videoId: 42,
  videoOwnerNickname: "서면탐험가",
  reason: "SPAM",
  status: "PENDING",
  createdAt: "2026-08-11T02:30:00",
  ...overrides,
});

describe("resolveReportListState — 로딩·실패·빈·목록 4상태 판정 (기준 19)", () => {
  it("조회 중이면 로딩으로 판정한다 (기준 19)", () => {
    expect(
      resolveReportListState({ isPending: true, isError: false, items: [] }),
    ).toBe("loading");
  });

  it("조회에 실패하면 실패로 판정한다 — 재조회 중에도 실패가 로딩보다 우선한다 (기준 19·25)", () => {
    expect(
      resolveReportListState({ isPending: false, isError: true, items: [] }),
    ).toBe("error");
    expect(
      resolveReportListState({ isPending: true, isError: true, items: [] }),
    ).toBe("error");
  });

  it("조회가 끝나고 내역이 없으면 빈 상태로 판정한다 (기준 19·24)", () => {
    expect(
      resolveReportListState({ isPending: false, isError: false, items: [] }),
    ).toBe("empty");
  });

  it("조회가 끝나고 내역이 있으면 목록으로 판정한다 (기준 19)", () => {
    expect(
      resolveReportListState({
        isPending: false,
        isError: false,
        items: [item()],
      }),
    ).toBe("list");
  });

  it("입력 조합 8가지 어디서도 상태가 둘로 갈리지 않는다 — 배타 판정 (기준 19)", () => {
    const states = [true, false].flatMap((isPending) =>
      [true, false].flatMap((isError) =>
        [[], [item()]].map((items) =>
          resolveReportListState({ isPending, isError, items }),
        ),
      ),
    );

    expect(states).toEqual([
      "error",
      "error",
      "loading",
      "loading",
      "error",
      "error",
      "empty",
      "list",
    ]);
  });
});

describe("reportReasonLabel — 서버 사유 enum → 한국어 라벨 (기준 21)", () => {
  it("서버 enum 5종 전부가 한국어 라벨로 파생된다 (기준 21)", () => {
    expect(
      ["INAPPROPRIATE", "PRIVACY", "SPAM", "COPYRIGHT", "OTHER"].map(
        reportReasonLabel,
      ),
    ).toEqual([
      "부적절한 콘텐츠",
      "사생활 침해",
      "스팸·도배",
      "저작권 침해",
      "기타",
    ]);
  });

  it("모르는 사유가 와도 폴백 라벨을 써서 화면이 빈칸이 되지 않는다 (기준 21)", () => {
    expect(reportReasonLabel("HARMFUL")).toBe(REPORT_REASON_FALLBACK_LABEL);
    expect(reportReasonLabel("")).toBe(REPORT_REASON_FALLBACK_LABEL);
  });
});

describe("reportStatusLabel — 처리 상태 enum → 한국어 라벨 (기준 22)", () => {
  it("처리 상태 4종 전부가 한국어 라벨로 파생된다 (기준 22)", () => {
    expect(
      ["PENDING", "REVIEWING", "RESOLVED", "REJECTED"].map(reportStatusLabel),
    ).toEqual(["접수됨", "검토 중", "조치 완료", "반려됨"]);
  });

  it("모르는 상태가 와도 폴백 라벨을 쓴다 (기준 22)", () => {
    expect(reportStatusLabel("ESCALATED")).toBe(REPORT_STATUS_FALLBACK_LABEL);
  });
});

describe("reportTargetLabel — 신고 대상 표기 (기준 20)", () => {
  it("영상 소유자 닉네임이 있으면 '{닉네임}님의 영상'으로 표기한다 (기준 20)", () => {
    expect(reportTargetLabel(item({ videoOwnerNickname: "서면탐험가" }))).toBe(
      "서면탐험가님의 영상",
    );
  });

  it("닉네임이 없으면 영상 번호로 표기한다 — 대상 칸이 비지 않는다 (기준 20)", () => {
    expect(
      reportTargetLabel(item({ videoOwnerNickname: null, videoId: 42 })),
    ).toBe("영상 #42");
    expect(
      reportTargetLabel(item({ videoOwnerNickname: "", videoId: 7 })),
    ).toBe("영상 #7");
  });
});

describe("formatReportedAt — 신고 시점 KST 표기 (기준 23)", () => {
  it("타임존 마커 없는 UTC 저장값을 KST(+9)로 옮긴 날짜로 표기한다 (기준 23)", () => {
    expect(formatReportedAt("2026-08-11T02:30:00")).toBe("2026.08.11");
  });

  it("UTC 15시 이후 신고는 KST로 다음 날이다 — 날짜부를 그대로 자르지 않는다 (기준 23, 경계)", () => {
    expect(formatReportedAt("2026-08-11T15:00:00")).toBe("2026.08.12");
    expect(formatReportedAt("2026-08-11T14:59:59")).toBe("2026.08.11");
  });

  it("마커가 붙은 시각은 그 타임존을 존중해 변환한다 (기준 23)", () => {
    expect(formatReportedAt("2026-08-11T23:59:59Z")).toBe("2026.08.12");
  });
});

describe("toReportRowView — 신고 1건 → 4필드 표시 문자열 (기준 20)", () => {
  it("대상·사유·시점·처리 상태 4필드가 한 번에 파생된다 (기준 20)", () => {
    expect(
      toReportRowView(
        item({
          videoOwnerNickname: "서면탐험가",
          reason: "PRIVACY",
          status: "REVIEWING",
          createdAt: "2026-08-11T02:30:00",
        }),
      ),
    ).toEqual({
      target: "서면탐험가님의 영상",
      reason: "사생활 침해",
      reportedAt: "2026.08.11",
      status: "검토 중",
    });
  });
});
