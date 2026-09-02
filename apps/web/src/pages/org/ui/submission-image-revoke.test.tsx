import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSubmissionWizardStore } from "@/features/event-submission/model/submission-wizard-store";
import { envelopeResponse, errorEnvelope } from "@/test/envelope-response";
import { stubFetch } from "@/test/stub-fetch";
import { revokeBlobPreviewUrl } from "./preview-url";
import { SubmissionImageField } from "./SubmissionImageField";

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={
      new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    }
  >
    {children}
  </QueryClientProvider>
);

const pickFile = (name: string) => {
  const input = screen.getByLabelText("대표 이미지 파일 선택");
  fireEvent.change(input, {
    target: { files: [new File(["x"], name, { type: "image/png" })] },
  });
};

describe("미리보기 blob URL 해제 (codex 리뷰 P2)", () => {
  let created: string[];
  let revoked: string[];

  beforeEach(() => {
    created = [];
    revoked = [];
    URL.createObjectURL = vi.fn(() => {
      const url = `blob:preview-${created.length}`;
      created.push(url);
      return url;
    });
    URL.revokeObjectURL = vi.fn((url: string) => {
      revoked.push(url);
    });
    useSubmissionWizardStore.getState().reset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("이미지를 교체하면 이전 blob URL이 해제된다", async () => {
    // 공용 stub-fetch는 Request 인자만 가정해 uploadToS3의 fetch(url, init) 꼴을 못
    // 받는다(빌드 리포트 알려진 한계) — 로컬 stubGlobal로 두 호출 꼴을 모두 받는다
    vi.stubGlobal(
      "fetch",
      async (input: Request | string, init?: RequestInit) => {
        void init;
        const url = typeof input === "string" ? input : input.url;
        if (new URL(url).pathname.endsWith("/image/presigned-url")) {
          return envelopeResponse({
            uploadUrl: "https://s3.example.com/put",
            s3Key: "k",
            expiresInSec: 300,
          });
        }
        return new Response(null, { status: 200 });
      },
    );
    render(<SubmissionImageField label="대표 이미지" />, { wrapper });

    pickFile("a.png");
    await waitFor(() =>
      expect(useSubmissionWizardStore.getState().image.status).toBe("uploaded"),
    );
    pickFile("b.png");

    await waitFor(() => expect(revoked).toContain("blob:preview-0"));
    expect(revoked).not.toContain("blob:preview-1");
  });

  it("업로드 실패로 미리보기가 비워지면 방금 만든 blob URL도 해제된다", async () => {
    stubFetch(() => errorEnvelope(500, "서버 오류", 500));
    render(<SubmissionImageField label="대표 이미지" />, { wrapper });

    pickFile("a.png");

    await waitFor(() =>
      expect(useSubmissionWizardStore.getState().image.status).toBe("failed"),
    );
    await waitFor(() => expect(revoked).toContain("blob:preview-0"));
  });

  it("revokeBlobPreviewUrl은 blob: 스킴만 해제한다 — MSG-550 서버 URL 보호", () => {
    revokeBlobPreviewUrl("https://cdn.fillmap.kr/image.png");
    revokeBlobPreviewUrl(null);
    expect(revoked).toHaveLength(0);
    revokeBlobPreviewUrl("blob:x");
    expect(revoked).toEqual(["blob:x"]);
  });
});

describe("위저드 이탈 시 정리 (codex 리뷰 P2 — 재진입 첫 프레임 잔상 차단)", () => {
  it("페이지를 떠나면 blob 해제 후 스토어가 초기화된다", async () => {
    const revoked: string[] = [];
    URL.createObjectURL = vi.fn(() => "blob:leaving");
    URL.revokeObjectURL = vi.fn((url: string) => {
      revoked.push(url);
    });

    const store = useSubmissionWizardStore.getState();
    store.reset();
    const { OrgSubmissionWizardPage } =
      await import("../OrgSubmissionWizardPage");
    const { RouterProvider, createMemoryRouter } =
      await import("react-router-dom");
    const router = createMemoryRouter(
      [
        { path: "/org/submissions/new", element: <OrgSubmissionWizardPage /> },
        { path: "/org", element: <p>운영자 홈</p> },
      ],
      { initialEntries: ["/org/submissions/new"] },
    );
    render(<RouterProvider router={router} />, { wrapper });

    // 스토어를 더럽힌다 — 유형 확정 + 미리보기 blob 보관
    useSubmissionWizardStore.getState().startImageUpload("blob:leaving");

    await router.navigate("/org");
    await screen.findByText("운영자 홈");

    expect(revoked).toContain("blob:leaving");
    const after = useSubmissionWizardStore.getState();
    expect(after.step).toBe("type");
    expect(after.image.previewUrl).toBeNull();
  });
});
