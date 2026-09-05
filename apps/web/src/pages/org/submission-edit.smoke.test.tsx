import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  Link,
  RouterProvider,
  createMemoryRouter,
  useParams,
} from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONSOLE_ROUTES } from "@/app/console-routes";
import { useSubmissionWizardStore } from "@/features/event-submission/model/submission-wizard-store";
import { getSubmissionQueryKey } from "@/shared/api/generated/@tanstack/react-query.gen";
import type { EventSubmissionDetailResponseDto } from "@/shared/api/generated/types.gen";
import { envelopeResponse, errorEnvelope } from "@/test/envelope-response";
import {
  rejectedEditableDetail,
  submissionDetail,
  submissionLocation,
} from "@/test/org-submission-fixture";
import { stubFetch } from "@/test/stub-fetch";
import { areaRect } from "@/test/submission-draft-fixture";
import { OrgSubmissionWizardPage } from "./OrgSubmissionWizardPage";

/**
 * 반려 재신청 수정 모드 흐름 스모크 (MSG-550 AC 1·2·3·5·6·8·9·10) — 위저드 페이지를
 * `/org/submissions/:submissionId/edit`로 실제 조립해 프리필·반려 배너·유형 잠금·진입 가드·
 * 이탈 경고 기준선·PATCH 재제출·신규 등록 회귀를 고정한다.
 *
 * 데이터 라우터로 렌더한다 — 이탈 경고(useBlocker)가 데이터 라우터를 요구한다.
 * 지도(AreaMapCanvas)는 jsdom에 키가 없어 폴백으로 렌더된다(MSG-547 스모크와 같은 전제).
 */

const EDIT_ROUTE = "/org/submissions/12/edit";
/** 다른 신청으로 전이해도 가드가 다시 판정하는지 보는 대상 (심사 중 신청) */
const OTHER_EDIT_ROUTE = "/org/submissions/13/edit";
const RECT_B = areaRect(39070, 112230, 39070, 112230);
const RECEIPT = { id: 12, submissionNo: "ES-2026-0012", status: "IN_REVIEW" };

/** 상세 조회 + 재제출 PATCH를 한 자리에서 응답한다 */
const editFetch = ({
  detail = rejectedEditableDetail(),
  detailStatus = 200,
}: {
  detail?: EventSubmissionDetailResponseDto;
  detailStatus?: number;
} = {}) =>
  stubFetch((request) => {
    const { pathname } = new URL(request.url);
    if (request.method === "PATCH") return envelopeResponse(RECEIPT);
    if (/^\/api\/org\/event-submissions\/\d+$/.test(pathname)) {
      return detailStatus === 200
        ? envelopeResponse(detail)
        : new Response("", { status: detailStatus });
    }
    return new Response("", { status: 404 });
  });

const WizardHarness = () => (
  <>
    <OrgSubmissionWizardPage />
    <Link to={CONSOLE_ROUTES.orgSubmissions}>내 신청 목록으로</Link>
    <Link to={OTHER_EDIT_ROUTE}>다른 신청 수정으로</Link>
    {/* 같은 페이지 인스턴스가 유지되는 이탈·재진입 동선 (`/new`↔`/edit`) */}
    <Link to={CONSOLE_ROUTES.orgSubmissionNew}>새 행사 등록으로</Link>
    <Link to={EDIT_ROUTE}>이 신청 수정으로</Link>
  </>
);

/**
 * 상세 화면 도달 이력 — 회송이 스쳐 지나가도(뒤에 다른 이동이 겹쳐도) 잡히게 기록한다.
 * `findByText`만으로는 한 프레임 머물다 떠난 회송을 놓친다.
 */
const detailVisits: string[] = [];

const DetailRoute = () => {
  const { submissionId } = useParams<{ submissionId: string }>();
  useEffect(() => {
    detailVisits.push(submissionId ?? "");
  }, [submissionId]);
  return <p>신청 상세 화면</p>;
};

/** 상세 응답 캐시에 심을 봉투 — `getSubmission` 훅이 `unwrapEnvelope`로 벗긴다 */
const detailEnvelope = (detail: EventSubmissionDetailResponseDto) => ({
  developCode: 0,
  message: "ok",
  data: detail,
});

/**
 * `seedDetail`을 주면 상세 응답이 캐시에 이미 있는 상태로 진입한다(상세 화면 → CTA 동선).
 * `queryClient`를 주면 그 클라이언트로 렌더한다 — 흐름 중간에 캐시를 갈아 끼워야 하는
 * 케이스(무효화 재조회 순서 강제)가 프로바이더 스택을 복제하지 않도록.
 */
const renderWizard = (
  route: string,
  {
    seedDetail,
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    }),
  }: {
    seedDetail?: EventSubmissionDetailResponseDto;
    queryClient?: QueryClient;
  } = {},
) => {
  if (seedDetail !== undefined) {
    queryClient.setQueryData(
      getSubmissionQueryKey({ path: { submissionId: seedDetail.id } }),
      detailEnvelope(seedDetail),
    );
  }
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider
        router={createMemoryRouter(
          [
            {
              path: CONSOLE_ROUTES.orgSubmissionNew,
              element: <WizardHarness />,
            },
            {
              path: CONSOLE_ROUTES.orgSubmissionEdit,
              element: <WizardHarness />,
            },
            {
              path: CONSOLE_ROUTES.orgSubmissionDetail,
              element: <DetailRoute />,
            },
            {
              path: CONSOLE_ROUTES.orgSubmissions,
              element: <p>내 신청 목록</p>,
            },
          ],
          { initialEntries: [route] },
        )}
      />
    </QueryClientProvider>,
  );
};

/**
 * 상세 갱신 → 가드 재판정 → 회송이 일어날 수 있는 시간을 준다. React Query의 옵저버 알림은
 * 매크로태스크 뒤에 플러시돼(실측) 재조회 직후의 단정은 갱신 **이전** 화면을 본다 —
 * "회송하지 않는다"는 부정 단정은 이 플러시 없이는 아무것도 증명하지 못한다.
 */
const flushGuard = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

beforeEach(() => {
  detailVisits.length = 0;
  useSubmissionWizardStore.setState(
    useSubmissionWizardStore.getInitialState(),
    true,
  );
  URL.createObjectURL = vi.fn(() => "blob:preview-1");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
});

describe("수정 모드 프리필 (AC 1·2·3)", () => {
  it("반려 신청의 제출값이 기본 정보 스텝에 프리필되고 유형 뱃지가 원 유형을 보여준다 (AC 1)", async () => {
    editFetch();

    renderWizard(EDIT_ROUTE);

    expect(await screen.findByLabelText("축제명")).toHaveProperty(
      "value",
      "서면 야간 드론쇼",
    );
    expect(screen.getByLabelText("주최 기관")).toHaveProperty(
      "value",
      "서면상권활성화협의회",
    );
    expect(screen.getByLabelText("축제 기간 시작일")).toHaveProperty(
      "value",
      "2026-09-05",
    );
    expect(screen.getByLabelText("주요 프로그램")).toHaveProperty(
      "value",
      "드론 라이트쇼 · 거리 버스킹",
    );
    expect(screen.getByText("2 / 4 기본 정보")).toBeDefined();
    expect(screen.getByText("유형 · 지역축제")).toBeDefined();
  });

  it("대표 이미지는 서버 이미지가 미리보기로 뜨고 버튼은 '이미지 변경'이다 (AC 1·4)", async () => {
    editFetch();

    renderWizard(EDIT_ROUTE);

    expect(await screen.findByAltText("대표 이미지 미리보기")).toHaveProperty(
      "src",
      "https://cdn.example.test/seomyeon-drone.jpg",
    );
    expect(screen.getByRole("button", { name: "이미지 변경" })).toBeDefined();
  });

  it("반려 항목 라벨과 사유 본문이 상단에 병기된다 (AC 3)", async () => {
    editFetch();

    renderWizard(EDIT_ROUTE);

    expect(await screen.findByText("반려 사유")).toBeDefined();
    expect(screen.getByText("행사 기간 · 홍보 이미지")).toBeDefined();
    expect(
      screen.getByText("행사 기간과 홍보 이미지를 확인해 주세요."),
    ).toBeDefined();
  });

  it("진행 표시의 '유형 선택'은 완료·비활성이라 유형 선택으로 돌아갈 수 없다 (AC 2)", async () => {
    editFetch();

    renderWizard(EDIT_ROUTE);

    await screen.findByLabelText("축제명");
    expect(screen.getByText("유형 선택")).toBeDefined();
    expect(screen.queryByRole("button", { name: "유형 선택" })).toBeNull();
  });

  it("위치가 2곳 이상이면 첫 위치만 유지된다고 알린다 (승인 확정)", async () => {
    editFetch({
      detail: rejectedEditableDetail({
        locations: [
          submissionLocation({ order: 1 }),
          submissionLocation({ order: 2, areaRects: [RECT_B] }),
        ],
      }),
    });

    renderWizard(EDIT_ROUTE);

    expect(
      await screen.findByText("재제출 시 첫 번째 위치만 유지됩니다."),
    ).toBeDefined();
  });

  it("위치가 1곳이면 소실 안내를 띄우지 않는다 (승인 확정)", async () => {
    editFetch();

    renderWizard(EDIT_ROUTE);

    await screen.findByText("반려 사유");
    expect(
      screen.queryByText("재제출 시 첫 번째 위치만 유지됩니다."),
    ).toBeNull();
  });

  it("상세가 캐시에 이미 있어 첫 렌더에 도착해도 프리필이 유지된다 (AC 1 — 상세 화면 CTA 동선)", async () => {
    editFetch();

    renderWizard(EDIT_ROUTE, { seedDetail: rejectedEditableDetail() });

    expect(await screen.findByLabelText("축제명")).toHaveProperty(
      "value",
      "서면 야간 드론쇼",
    );
    expect(screen.getByText("반려 사유")).toBeDefined();
  });
});

describe("수정 진입 가드 (AC 8)", () => {
  it("심사 중 신청은 신청 상세로 회송된다 (AC 8)", async () => {
    editFetch({ detail: submissionDetail({ id: 12 }) });

    renderWizard(EDIT_ROUTE);

    expect(await screen.findByText("신청 상세 화면")).toBeDefined();
  });

  it("승인된 신청도 신청 상세로 회송된다 (AC 8)", async () => {
    editFetch({ detail: submissionDetail({ id: 12, status: "APPROVED" }) });

    renderWizard(EDIT_ROUTE);

    expect(await screen.findByText("신청 상세 화면")).toBeDefined();
  });

  it("유형이 3종 밖인 신청은 수정 불가로 상세 회송된다 (AC 8 — 추정 6)", async () => {
    editFetch({ detail: rejectedEditableDetail({ type: "MARKET" }) });

    renderWizard(EDIT_ROUTE);

    expect(await screen.findByText("신청 상세 화면")).toBeDefined();
  });

  it("한 신청에 진입한 뒤 다른 신청의 /edit로 전이하면 가드가 다시 판정한다 (AC 8 — 방문이 갈린다)", async () => {
    stubFetch((request) => {
      const id = Number(new URL(request.url).pathname.split("/").at(-1));
      return envelopeResponse(
        id === 12 ? rejectedEditableDetail() : submissionDetail({ id }),
      );
    });
    renderWizard(EDIT_ROUTE);
    await screen.findByLabelText("축제명");

    fireEvent.click(screen.getByRole("link", { name: "다른 신청 수정으로" }));

    expect(await screen.findByText("신청 상세 화면")).toBeDefined();
    expect(detailVisits).toEqual(["13"]);
  });

  it("`/new`로 나갔다 같은 신청의 /edit로 돌아오면 가드가 다시 판정한다 (AC 8 — 허가는 방문 단위, codex P2)", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    let rejected = true;
    stubFetch((request) => {
      const { pathname } = new URL(request.url);
      if (/^\/api\/org\/event-submissions\/\d+$/.test(pathname)) {
        return envelopeResponse(
          rejected ? rejectedEditableDetail() : submissionDetail({ id: 12 }),
        );
      }
      return new Response("", { status: 404 });
    });
    renderWizard(EDIT_ROUTE, { queryClient });
    await screen.findByLabelText("축제명");

    // ① 편집 중 운영자가 상태를 바꾸고 창 포커스 재조회가 갱신본을 물어 온다 —
    //    **이번 방문에서는 회송하지 않는다**(작성분 보존, 1회차 계약).
    rejected = false;
    await act(async () => {
      await queryClient.refetchQueries({
        queryKey: getSubmissionQueryKey({ path: { submissionId: 12 } }),
      });
    });
    await flushGuard();
    expect(screen.getByLabelText("축제명")).toBeDefined();
    expect(detailVisits).toEqual([]);

    // ② `/new`로 이탈 — 두 라우트가 같은 컴포넌트라 페이지 인스턴스가 살아남고,
    //    경로 파라미터 변화로 스토어만 초기화된다.
    fireEvent.click(screen.getByRole("link", { name: "새 행사 등록으로" }));
    expect(
      screen.getByRole("heading", { name: "어떤 형태를 등록하시나요?" }),
    ).toBeDefined();

    // ③ 같은 신청의 /edit로 재진입 — 방문이 새로 시작됐으니 가드가 다시 판정해야 한다.
    //    억제되면 `/edit` URL에 빈 생성 모드 위저드가 서고 제출이 신규 신청을 만든다.
    fireEvent.click(screen.getByRole("link", { name: "이 신청 수정으로" }));

    expect(await screen.findByText("신청 상세 화면")).toBeDefined();
    expect(detailVisits).toEqual(["12"]);
  });

  it("비숫자 신청 번호는 요청을 발사하지 않고 오류를 안내한다 (AC 8 — 549 선례)", () => {
    const received = editFetch();

    renderWizard("/org/submissions/abc/edit");

    expect(screen.getByText("잘못된 신청 번호로 들어왔어요")).toBeDefined();
    expect(received).toHaveLength(0);
  });

  it("상세 조회가 실패하면 재시도 안내가 뜬다 (AC 8)", async () => {
    editFetch({ detailStatus: 500 });

    renderWizard(EDIT_ROUTE);

    expect(
      await screen.findByText("신청 상세를 불러오지 못했어요"),
    ).toBeDefined();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeDefined();
  });
});

describe("이탈 경고 기준선 (AC 9)", () => {
  it("프리필만 보고 나가면 경고 없이 이동한다 (AC 9)", async () => {
    editFetch();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderWizard(EDIT_ROUTE);
    await screen.findByLabelText("축제명");

    fireEvent.click(screen.getByRole("link", { name: "내 신청 목록으로" }));

    expect(await screen.findByText("내 신청 목록")).toBeDefined();
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it("프리필 값을 고친 뒤 나가면 확인을 받는다 (AC 9)", async () => {
    editFetch();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderWizard(EDIT_ROUTE);
    fireEvent.change(await screen.findByLabelText("축제명"), {
      target: { value: "서면 야간 드론쇼 2회차" },
    });

    fireEvent.click(screen.getByRole("link", { name: "내 신청 목록으로" }));

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("축제명")).toHaveProperty(
      "value",
      "서면 야간 드론쇼 2회차",
    );
  });

  it("서버 이미지 URL(https:)은 이탈 시 revoke되지 않는다 (AC 9 — blob 가드 회귀)", async () => {
    editFetch();
    const view = renderWizard(EDIT_ROUTE);
    await screen.findByLabelText("축제명");

    view.unmount();

    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });
});

describe("재제출 (AC 5·6)", () => {
  /** 프리필 뒤 기존 전진 경로(기본 정보 → 위치 저장)로 확인·제출 스텝까지 간다 */
  const goToReview = async () => {
    const cta = await screen.findByRole("button", {
      name: "다음: 축제 위치 등록",
    });
    await waitFor(() => expect(cta.hasAttribute("disabled")).toBe(false));
    fireEvent.click(cta);
    fireEvent.click(screen.getByRole("button", { name: "위치 저장" }));
  };

  /** 수정 모드 진입 → 확인·제출 스텝 → 사실 확인 → 확인 모달 열기까지 */
  const openResubmitDialog = async (queryClient?: QueryClient) => {
    renderWizard(EDIT_ROUTE, { queryClient });
    await goToReview();
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "입력한 내용이 사실과 다르지 않음을 확인합니다.",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "수정본으로 재제출" }));
  };

  /** 확인 모달의 재제출 발사까지 (성공·실패 공용) */
  const resubmitFromPrefill = async (queryClient?: QueryClient) => {
    await openResubmitDialog(queryClient);
    fireEvent.click(screen.getByRole("button", { name: "제출하기" }));
  };

  it("확인·제출 스텝의 CTA와 각주가 재제출 문구로 갈린다 (AC 5 — Figma 15525:8787)", async () => {
    editFetch();
    renderWizard(EDIT_ROUTE);

    await goToReview();

    expect(
      screen.getByRole("button", { name: "수정본으로 재제출" }),
    ).toBeDefined();
    expect(
      screen.getByText("재제출하면 상태가 '심사 중'으로 바뀝니다."),
    ).toBeDefined();
  });

  it("확인 모달 제목도 재제출 문구라 누른 CTA와 같은 동작임을 알린다 (AC 5 — 재작업)", async () => {
    editFetch();

    await openResubmitDialog();

    expect(
      screen.getAllByRole("dialog", { name: "수정본으로 재제출" }).length,
    ).toBeGreaterThan(0);
    // 심사 중 수정 불가 고지·확인 버튼은 신규 제출과 같은 문구를 쓴다 — 재제출도 같은 사실이다
    expect(
      screen.getByText(
        "최종적으로 제출하시겠습니까? 제출 후에는 심사 중에 내용을 수정할 수 없어요.",
      ),
    ).toBeDefined();
    expect(screen.getByRole("button", { name: "제출하기" })).toBeDefined();
  });

  it("수정 없이 그대로 재제출해도 PATCH 1회로 성공하고 내 신청 목록으로 이동한다 (AC 5·6)", async () => {
    const received = editFetch();

    await resubmitFromPrefill();

    expect(await screen.findByText("내 신청 목록")).toBeDefined();
    const patched = received.filter(
      ({ request }) => request.method === "PATCH",
    );
    expect(patched).toHaveLength(1);
    expect(patched[0].body).toMatchObject({
      title: "서면 야간 드론쇼",
      programDescription: "드론 라이트쇼 · 거리 버스킹",
      locations: [{ areaRects: [areaRect(39064, 112221, 39065, 112222)] }],
    });
    expect(patched[0].body).not.toHaveProperty("imageS3Key");
    expect(patched[0].body).not.toHaveProperty("type");
  });

  it("갱신된 상세(심사 중)가 목록 이동보다 먼저 도착해도 상세로 회송되지 않는다 (AC 6·8 — 이동 레이스 회귀)", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    stubFetch((request) => {
      const { pathname } = new URL(request.url);
      if (request.method === "PATCH") {
        // 재제출을 받은 서버는 상태를 심사 중으로 바꾼다. `onSuccess`의 상세 무효화
        // 재조회가 **목록 이동 커밋을 앞지르는** 순서를 여기서 못 박는다 — 브라우저에서는
        // 서버가 빠를 때(≈20ms) 실제로 이 순서가 났고, 그때 진입 가드가 "REJECTED 아님"으로
        // 판정해 상세로 회송했다. jsdom은 fetch 왕복이 항상 리렌더 플러시보다 느려
        // 그 순서를 재현하지 못하므로, 갱신 응답을 캐시에 동기로 심어 순서를 강제한다.
        queryClient.setQueryData(
          getSubmissionQueryKey({ path: { submissionId: 12 } }),
          detailEnvelope(submissionDetail({ id: 12 })),
        );
        return envelopeResponse(RECEIPT);
      }
      if (/^\/api\/org\/event-submissions\/\d+$/.test(pathname)) {
        return envelopeResponse(rejectedEditableDetail());
      }
      return new Response("", { status: 404 });
    });

    await resubmitFromPrefill(queryClient);

    expect(await screen.findByText("내 신청 목록")).toBeDefined();
    // 상세 화면을 한 프레임도 거치지 않는다 — replace 회송은 뒤로 가기 이력까지 갈아낀다
    expect(detailVisits).toEqual([]);
  });

  it("재제출이 실패하면 신규 제출과 같은 안내가 모달에 뜨고 입력이 보존된다 (AC 7)", async () => {
    stubFetch((request) => {
      const { pathname } = new URL(request.url);
      if (request.method === "PATCH") {
        return errorEnvelope(13433, "종료일이 오늘 이전입니다", 400);
      }
      if (/^\/api\/org\/event-submissions\/\d+$/.test(pathname)) {
        return envelopeResponse(rejectedEditableDetail());
      }
      return new Response("", { status: 404 });
    });

    await resubmitFromPrefill();

    expect(await screen.findByRole("alert")).toBeDefined();
    expect(screen.getByRole("alert").textContent).toContain("기간");
    // 모달이 유지돼 재시도 동선이 남고, 프리필 입력도 그대로다
    expect(screen.getByRole("button", { name: "제출하기" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    fireEvent.click(screen.getByRole("button", { name: "기본 정보 수정" }));
    expect(screen.getByLabelText("축제명")).toHaveProperty(
      "value",
      "서면 야간 드론쇼",
    );
  });
});

describe("신규 등록 회귀 (AC 10)", () => {
  it("/new는 빈 위저드로 유형 선택부터 시작하고 반려 배너가 없다 (AC 10)", () => {
    const received = editFetch();

    renderWizard(CONSOLE_ROUTES.orgSubmissionNew);

    expect(
      screen.getByRole("heading", { name: "어떤 형태를 등록하시나요?" }),
    ).toBeDefined();
    expect(screen.queryByText("반려 사유")).toBeNull();
    expect(received).toHaveLength(0);
  });
});
