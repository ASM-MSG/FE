import { describe, expect, it } from "vitest";
import { ApiError } from "@/shared/api/api-error";
import {
  accountFailureNotice,
  accountRequestPillViews,
  accountRequestQueueText,
  accountRequestStatusView,
  accountStatusView,
  canSubmitIssue,
  canSubmitReason,
  emailChangeApprovedNotice,
  emailChangePillViews,
  emailChangeQueueText,
  emailChangeStatusView,
  issueFormHints,
  issuedNotice,
  normalizeIssueForm,
  orgNameLabel,
  resendNotice,
  truncationNotice,
} from "./account-view";

/** 유효한 폼 값 — 케이스별로 한 필드만 무너뜨려 판정을 가른다 */
const VALID_FORM = {
  orgName: "부산진구청",
  contactName: "김담당",
  email: "tourism@busanjin.go.kr",
};

describe("truncationNotice — 1페이지 초과분 고지 (codex P2)", () => {
  it("전체가 표시 건수보다 많으면 남은 건수를 알린다", () => {
    expect(truncationNotice(137, 100)).toContain("전체 137건");
    expect(truncationNotice(137, 100)).toContain("37건");
  });

  it("전체가 표시 건수와 같으면 문구가 없다", () => {
    expect(truncationNotice(100, 100)).toBeNull();
  });

  it("응답 전 전체 건수를 모르면 문구가 없다", () => {
    expect(truncationNotice(undefined, 0)).toBeNull();
  });
});

describe("normalizeIssueForm — 제출용 정규화 (AC 1·4, codex P2)", () => {
  it("판정이 보는 값과 같게 3필드의 앞뒤 공백을 벗긴다", () => {
    expect(
      normalizeIssueForm({
        orgName: "  부산진구청 ",
        contactName: " 김담당  ",
        email: "  tourism@busanjin.go.kr ",
      }),
    ).toEqual(VALID_FORM);
  });

  it("공백이 없으면 값을 그대로 둔다", () => {
    expect(normalizeIssueForm(VALID_FORM)).toEqual(VALID_FORM);
  });
});

describe("canSubmitIssue — 발급 폼 판정 (AC 1)", () => {
  it("기관명·담당자·이메일이 전부 충족되면 제출 가능하다", () => {
    expect(canSubmitIssue(VALID_FORM)).toBe(true);
  });

  it("기관명이 공백뿐이면 제출할 수 없다", () => {
    expect(canSubmitIssue({ ...VALID_FORM, orgName: "   " })).toBe(false);
  });

  it("담당자 이름이 1자면 제출할 수 없다 (2~20자)", () => {
    expect(canSubmitIssue({ ...VALID_FORM, contactName: "김" })).toBe(false);
  });

  it("담당자 이름이 21자면 제출할 수 없다 (2~20자)", () => {
    expect(
      canSubmitIssue({ ...VALID_FORM, contactName: "김".repeat(21) }),
    ).toBe(false);
  });

  it("담당자 이름은 앞뒤 공백을 뺀 길이로 판정한다", () => {
    expect(canSubmitIssue({ ...VALID_FORM, contactName: "  김  " })).toBe(
      false,
    );
    expect(canSubmitIssue({ ...VALID_FORM, contactName: "  김담당  " })).toBe(
      true,
    );
  });

  it("이메일 형식이 아니면 제출할 수 없다", () => {
    expect(canSubmitIssue({ ...VALID_FORM, email: "tourism.busanjin" })).toBe(
      false,
    );
  });
});

describe("issueFormHints — 미충족 항목별 안내 (AC 1)", () => {
  it("전부 충족이면 안내가 없다", () => {
    expect(issueFormHints(VALID_FORM)).toEqual({
      orgName: null,
      contactName: null,
      email: null,
    });
  });

  it("빈 값은 입력 요청으로, 형식 위반은 규칙 안내로 갈린다", () => {
    const hints = issueFormHints({
      orgName: " ",
      contactName: "김",
      email: "",
    });

    expect(hints.orgName).toBe("기관명을 입력해 주세요");
    expect(hints.contactName).toBe("담당자 이름은 2~20자로 입력해 주세요");
    expect(hints.email).toBe("공식 이메일을 입력해 주세요");
  });

  it("이메일이 형식 위반이면 형식 안내가 나온다", () => {
    expect(issueFormHints({ ...VALID_FORM, email: "tourism@" }).email).toBe(
      "이메일 형식으로 입력해 주세요",
    );
  });
});

describe("accountStatusView — 계정 상태 뷰 (AC 2a)", () => {
  it("mustChange=false는 '사용 중'(success 톤)이다", () => {
    expect(accountStatusView(false)).toEqual({
      label: "사용 중",
      tone: "success",
    });
  });

  it("mustChange=true는 '초기 로그인 전'(primary 톤)이다", () => {
    expect(accountStatusView(true)).toEqual({
      label: "초기 로그인 전",
      tone: "primary",
    });
  });
});

describe("accountRequestStatusView — 발급 요청 status 뷰 (AC 2b)", () => {
  it("PENDING·ISSUED·REJECTED가 대기·발급됨·반려로 갈린다", () => {
    expect(accountRequestStatusView("PENDING")).toEqual({
      label: "대기",
      tone: "warning",
    });
    expect(accountRequestStatusView("ISSUED")).toEqual({
      label: "발급됨",
      tone: "success",
    });
    expect(accountRequestStatusView("REJECTED")).toEqual({
      label: "반려",
      tone: "error",
    });
  });

  it("모르는 status는 지어낸 라벨로 덮지 않고 원문을 보여 준다", () => {
    expect(accountRequestStatusView("CANCELED")).toEqual({
      label: "CANCELED",
      tone: "neutral",
    });
  });
});

describe("emailChangeStatusView — 아이디 변경 status 뷰 (AC 2b)", () => {
  it("PENDING·APPROVED·REJECTED가 대기·승인됨·반려로 갈린다", () => {
    expect(emailChangeStatusView("PENDING")).toEqual({
      label: "대기",
      tone: "warning",
    });
    expect(emailChangeStatusView("APPROVED")).toEqual({
      label: "승인됨",
      tone: "success",
    });
    expect(emailChangeStatusView("REJECTED")).toEqual({
      label: "반려",
      tone: "error",
    });
  });
});

describe("canSubmitReason — 반려 사유 검증 (AC 2c)", () => {
  it("공백뿐인 사유는 확정할 수 없다", () => {
    expect(canSubmitReason("")).toBe(false);
    expect(canSubmitReason("   ")).toBe(false);
  });

  it("비공백 사유는 확정할 수 있다", () => {
    expect(canSubmitReason("공문 확인 불가")).toBe(true);
  });

  it("500자를 넘으면 확정할 수 없다 (서버 상한)", () => {
    expect(canSubmitReason("가".repeat(500))).toBe(true);
    expect(canSubmitReason("가".repeat(501))).toBe(false);
  });
});

describe("emailSent 안내 문구 (AC 2d)", () => {
  it("발급·승인 성공은 초기 비밀번호 발송을 알린다", () => {
    expect(issuedNotice(true)).toContain("초기 비밀번호");
    expect(issuedNotice(true)).toContain("발송");
  });

  it("발급·승인 메일 실패는 계정 유지 + 재발송 복구를 안내한다", () => {
    const notice = issuedNotice(false);

    expect(notice).toContain("계정은 발급");
    expect(notice).toContain("재발송");
  });

  it("재발송 성공은 이전 비밀번호 무효를 함께 알린다", () => {
    expect(resendNotice(true)).toContain("무효");
  });

  it("재발송 실패는 재시도를 안내한다", () => {
    expect(resendNotice(false)).toContain("발송에 실패");
  });

  it("아이디 변경 승인 성공은 새 아이디와 통지 발송을 알린다", () => {
    const notice = emailChangeApprovedNotice(true, "culture@busanjin.go.kr");

    expect(notice).toContain("culture@busanjin.go.kr");
    expect(notice).toContain("통지");
  });

  it("아이디 변경 승인의 통지 실패는 교체 유지를 알린다", () => {
    const notice = emailChangeApprovedNotice(false, "culture@busanjin.go.kr");

    expect(notice).toContain("교체는 유지");
    expect(notice).toContain("실패");
  });
});

describe("orgNameLabel — 기관명 폴백 (AC 10)", () => {
  it("기관명이 null이면 폴백 표기로 대체한다", () => {
    expect(orgNameLabel("부산진구청")).toBe("부산진구청");
    expect(orgNameLabel(null)).toBe("기관명 미등록");
  });
});

describe("큐 pill 뷰 — counts 라벨·목록 제목·빈 안내 (AC 11·13·14)", () => {
  it("발급 요청 pill 3종에 counts 실값이 붙는다", () => {
    const views = accountRequestPillViews({
      pendingCount: 3,
      issuedCount: 12,
      rejectedCount: 1,
    });

    expect(views.map((view) => view.label)).toEqual([
      "대기 3",
      "발급됨 12",
      "반려 1",
    ]);
    expect(views.map((view) => view.value)).toEqual([
      "PENDING",
      "ISSUED",
      "REJECTED",
    ]);
  });

  it("counts가 아직 없으면 숫자를 지어내지 않고 이름만 남긴다", () => {
    expect(accountRequestPillViews(null).map((view) => view.label)).toEqual([
      "대기",
      "발급됨",
      "반려",
    ]);
  });

  it("아이디 변경 pill은 승인됨 라벨로 갈린다", () => {
    const views = emailChangePillViews({
      pendingCount: 2,
      approvedCount: 8,
      rejectedCount: 1,
    });

    expect(views.map((view) => view.label)).toEqual([
      "대기 2",
      "승인됨 8",
      "반려 1",
    ]);
  });

  it("상태별 목록 제목·빈 안내가 갈린다 (AC 14)", () => {
    expect(accountRequestQueueText("PENDING").emptyMessage).toContain(
      "대기 중인 요청이 없습니다",
    );
    expect(accountRequestQueueText("ISSUED").listTitle).toBe("발급된 요청");
    expect(emailChangeQueueText("APPROVED").listTitle).toBe("승인된 요청");
  });
});

describe("accountFailureNotice — 실패 분기 (AC 2e)", () => {
  const noticeFor = (developCode: number) =>
    accountFailureNotice(
      new ApiError("서버 메시지", { status: 409, developCode }),
    );

  it("1409(이메일 충돌)는 계정 목록 확인을 유도한다", () => {
    const notice = noticeFor(1409);

    expect(notice.message).toContain("이미 계정이 있는 이메일");
    expect(notice.nextStep).toBe("CHECK_ACCOUNTS");
    expect(notice.staleServerState).toBe(true);
  });

  it("1421·1427(없는 요청)은 목록 재조회를 유도한다", () => {
    for (const code of [1421, 1427]) {
      const notice = noticeFor(code);
      expect(notice.message).toContain("요청을 찾을 수 없어요");
      expect(notice.nextStep).toBe("REVIEW_LIST");
      expect(notice.staleServerState).toBe(true);
    }
  });

  it("1422·1428(이미 처리)은 이미 처리 안내 + 목록 재조회를 유도한다", () => {
    for (const code of [1422, 1428]) {
      const notice = noticeFor(code);
      expect(notice.message).toContain("이미 처리된 요청");
      expect(notice.nextStep).toBe("REVIEW_LIST");
      expect(notice.staleServerState).toBe(true);
    }
  });

  it("1426·1429(검토 이후 변경)는 이미 처리와 다른 안내로 재검토를 유도한다", () => {
    for (const code of [1426, 1429]) {
      const notice = noticeFor(code);
      expect(notice.message).toContain("검토 이후");
      expect(notice.message).not.toContain("이미 처리된 요청");
      expect(notice.nextStep).toBe("REREAD_REQUEST");
      expect(notice.staleServerState).toBe(true);
    }
  });

  it("1423(이미 비밀번호 변경)은 비밀번호 재설정 흐름을 안내한다", () => {
    const notice = noticeFor(1423);

    expect(notice.message).toContain("이미 비밀번호를 변경한 계정");
    expect(notice.message).toContain("재설정");
    expect(notice.nextStep).toBe("PASSWORD_RESET");
    expect(notice.staleServerState).toBe(true);
  });

  it("1404(없는 사용자)는 목록 재조회를 유도한다", () => {
    const notice = accountFailureNotice(
      new ApiError("없는 사용자", { status: 404, developCode: 1404 }),
    );

    expect(notice.message).toContain("계정을 찾을 수 없어요");
    expect(notice.nextStep).toBe("REVIEW_LIST");
    expect(notice.staleServerState).toBe(true);
  });

  it("그 외 실패는 재시도 안내이고 캐시를 스테일로 보지 않는다", () => {
    const notice = accountFailureNotice(new Error("network down"));

    expect(notice.nextStep).toBe("RETRY");
    expect(notice.staleServerState).toBe(false);
  });
});
