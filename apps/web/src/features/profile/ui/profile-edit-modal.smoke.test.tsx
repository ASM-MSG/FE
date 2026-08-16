import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProfileData } from "@/entities/profile";
import type { GetMeResponse } from "@/shared/api/generated";
import { getMeQueryKey } from "@/shared/api/generated/@tanstack/react-query.gen";
import { stubInstantLoadImage } from "@/test/instant-load-image";
import {
  MAX_PROFILE_IMAGE_BYTES,
  PROFILE_IMAGE_ACCEPT,
} from "../model/profile-image";
import { ProfileEditModal } from "./ProfileEditModal";

/**
 * 프로필 편집 모달 이미지 업로드 스모크 (MSG-378 기준 8·10·12·13·14·15 + 성공 경로).
 * presign→S3 PUT→확정의 실 네트워크 대역은 fetch 목으로 대체한다 —
 * 실동작(기준 9·11 브라우저 확인)은 검증 단계의 dev 서버 몫.
 * 스타일·픽셀 단정은 넣지 않는다.
 */

/** 프로필 픽스처 — 구 MOCK_PROFILE 대체 (MSG-329 병합으로 mock 소스 폐기). 닉네임은
 * 케이스에서 바꾸지 않아 [저장]이 닉네임 PUT을 부르지 않는다(무변경 스킵 — 기준 14 계열) */
const PROFILE: ProfileData = {
  email: "fillmapper@fillmap.app",
  nickname: "필맵퍼",
  profileImageUrl: null,
  joinedAt: "2026-05-02T09:00:00",
  locationEnabled: true,
};

const PRESIGN_PATH = "/api/users/me/profile-image/presigned-url";
const CONFIRM_PATH = "/api/users/me/profile-image";
const S3_UPLOAD_URL = "https://s3.fillmap.test/profile/pending/1.png?sig=abc";
const NEW_IMAGE_URL = "https://cdn.fillmap.test/profile/1.png";

const envelope = (data: unknown) =>
  new Response(JSON.stringify({ developCode: 1000, message: "성공", data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

/** presign·S3 PUT·확정 전 구간 성공 fetch 목 — 케이스별로 vi.stubGlobal("fetch", ...)로 장착 */
const successFetchMock = () =>
  vi.fn(async (input: Request | string | URL, init?: RequestInit) => {
    // S3 raw fetch — 문자열 URL + init로 호출된다 (httpClient 미경유)
    if (typeof input === "string" && input === S3_UPLOAD_URL) {
      expect(init?.method).toBe("PUT");
      return new Response(null, { status: 200 });
    }
    const request = input as Request;
    const pathname = new URL(request.url).pathname;
    if (pathname === PRESIGN_PATH) {
      return envelope({
        uploadUrl: S3_UPLOAD_URL,
        s3Key: "profile/pending/1.png",
        expiresInSec: 600,
      });
    }
    if (pathname === CONFIRM_PATH) {
      return envelope({
        email: "server-account@kakao.com",
        nickname: "서버닉네임",
        profileImageUrl: NEW_IMAGE_URL,
        createdAt: "2026-08-11T09:00:00",
        locationConsent: false,
      });
    }
    throw new Error(`예상 밖 요청: ${pathname}`);
  });

/** 재오픈 시나리오(기준 15)를 위해 open 상태를 보유하는 하네스 — ProfilePanel의 보유 방식 축약 */
const Harness = ({
  queryClient,
  profile,
}: {
  queryClient: QueryClient;
  profile: ProfileData;
}) => {
  const [open, setOpen] = useState(true);
  return (
    <QueryClientProvider client={queryClient}>
      <button type="button" onClick={() => setOpen(true)}>
        모달 열기
      </button>
      <ProfileEditModal open={open} onOpenChange={setOpen} profile={profile} />
    </QueryClientProvider>
  );
};

const renderModal = (profile: ProfileData = PROFILE) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  // 조회 캐시는 getMe 봉투 그대로다 (MSG-329 전환) — 병합 단정도 봉투 data를 읽는다
  queryClient.setQueryData<GetMeResponse>(getMeQueryKey(), {
    developCode: 1000,
    message: "성공",
    data: {
      email: profile.email,
      nickname: profile.nickname,
      profileImageUrl: profile.profileImageUrl,
      createdAt: profile.joinedAt,
      locationConsent: false,
    },
  });
  render(<Harness queryClient={queryClient} profile={profile} />);
  return queryClient;
};

/** getMe 캐시(봉투)의 data — 병합 결과 관찰 지점 */
const cachedMe = (queryClient: QueryClient) =>
  (queryClient.getQueryData(getMeQueryKey()) as GetMeResponse).data;

const fileInput = (): HTMLInputElement => {
  const input = document.querySelector('input[type="file"]');
  if (input === null) throw new Error("숨김 파일 입력이 없다");
  return input as HTMLInputElement;
};

const selectFile = (file: File) => {
  fireEvent.change(fileInput(), { target: { files: [file] } });
};

const pngFile = () => new File(["png-bytes"], "pic.png", { type: "image/png" });

/** 파일 선택 열림 관찰 스파이 — jsdom에서 실제 픽커가 뜨지 않게 no-op (기준 8·재선택 차단 공용) */
const spyOnOpenPicker = () =>
  vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});

/** fetch 목 장착 → 렌더 → png 선택 → [저장] 클릭 — 실패(기준 12)·성공(기준 11 대역) 케이스 공용 진행부 */
const saveSelectedPngWith = (fetchMock: typeof fetch) => {
  vi.stubGlobal("fetch", fetchMock);
  const queryClient = renderModal();
  selectFile(pngFile());
  fireEvent.click(screen.getByRole("button", { name: "저장" }));
  return queryClient;
};

const createObjectURL = vi.fn(() => "blob:preview-1");
const revokeObjectURL = vi.fn();
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

beforeEach(() => {
  // jsdom에 objectURL 구현이 없어 대체한다 — 미리보기 생성·폐기(기준 9·15) 관찰 지점
  URL.createObjectURL = createObjectURL;
  URL.revokeObjectURL = revokeObjectURL;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
});

describe("프로필 편집 모달 — 이미지 업로드", () => {
  it("[변경] 클릭 시 파일 선택이 열리고, 숨김 입력의 accept가 허용 형식 상수와 일치한다 (기준 8)", () => {
    renderModal();

    expect(fileInput().getAttribute("accept")).toBe(PROFILE_IMAGE_ACCEPT);

    const openPicker = spyOnOpenPicker();
    fireEvent.click(screen.getByRole("button", { name: "변경" }));
    expect(openPicker).toHaveBeenCalledTimes(1);
  });

  it("5MB 초과 파일은 업로드 요청 없이 즉시 안내 문구를 표시하고 미리보기를 만들지 않는다 (기준 10)", () => {
    const fetchMock = successFetchMock();
    vi.stubGlobal("fetch", fetchMock);
    renderModal();

    const oversized = pngFile();
    Object.defineProperty(oversized, "size", {
      value: MAX_PROFILE_IMAGE_BYTES + 1,
    });
    selectFile(oversized);

    expect(screen.getByRole("alert").textContent).toContain("5MB");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it("서버 거부(1415) 시 안내 문구가 표시되고 모달은 유지되며 캐시의 기존 이미지는 변하지 않는다 (기준 12)", async () => {
    const rejectingFetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({ developCode: 1415, message: "형식 불일치" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    });
    const queryClient = saveSelectedPngWith(rejectingFetch as typeof fetch);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("형식");
    // 모달 유지 + 캐시(프로필 화면의 원천)는 그대로
    expect(
      screen.getAllByRole("dialog", { name: "프로필 편집" }).length,
    ).toBeGreaterThan(0);
    expect(cachedMe(queryClient).profileImageUrl).toBe(PROFILE.profileImageUrl);
  });

  it("업로드 진행 중에는 저장 버튼이 비활성화된다 (기준 13)", async () => {
    // presign이 영원히 응답하지 않는 fetch — pending 상태 고정
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => {})),
    );
    renderModal();

    selectFile(pngFile());
    const saveButton = screen.getByRole("button", { name: "저장" });
    expect((saveButton as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(saveButton);

    await waitFor(() =>
      expect((saveButton as HTMLButtonElement).disabled).toBe(true),
    );
  });

  it("저장 진행 중에는 [변경]·파일 재선택이 막힌다 (PR #51 리뷰 반영 — 이전 업로드가 새 선택을 덮어쓰는 레이스 방지)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => {})),
    );
    renderModal();

    selectFile(pngFile());
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    // 진행 중에는 확인 버튼 텍스트가 "저장 중…"으로 바뀌며 비활성화된다 (기준 13)
    await waitFor(() =>
      expect(
        (screen.getByRole("button", { name: /^저장/ }) as HTMLButtonElement)
          .disabled,
      ).toBe(true),
    );

    // [변경] 칩이 파일 선택을 열지 않는다
    const openPicker = spyOnOpenPicker();
    fireEvent.click(screen.getByRole("button", { name: "변경" }));
    expect(openPicker).not.toHaveBeenCalled();

    // 프로그램틱 change 경로도 무시된다 — 미리보기·선택이 갱신되지 않는다
    selectFile(pngFile());
    expect(createObjectURL).toHaveBeenCalledTimes(1);
  });

  it("이미지를 고르지 않고 저장하면 기존 동작(닫힘만) — 업로드 요청이 없다 (기준 14)", () => {
    const fetchMock = successFetchMock();
    vi.stubGlobal("fetch", fetchMock);
    renderModal();

    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(screen.queryAllByRole("dialog", { name: "프로필 편집" })).toEqual(
      [],
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("취소 시 미리보기 objectURL이 폐기되고 재오픈하면 원래 이미지로 복원된다 (기준 15)", async () => {
    stubInstantLoadImage();
    renderModal();

    selectFile(pngFile());
    // 선택 즉시 모달 아바타가 로컬 미리보기로 바뀐다 (기준 9의 jsdom 대역)
    const preview = (await screen.findByAltText(
      PROFILE.nickname,
    )) as HTMLImageElement;
    expect(preview.src).toBe("blob:preview-1");

    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:preview-1");

    // 재오픈 — profileImageUrl null이라 기본 이미지 에셋으로 복원 (기준 16)
    fireEvent.click(screen.getByRole("button", { name: "모달 열기" }));
    const restored = (await screen.findByAltText(
      PROFILE.nickname,
    )) as HTMLImageElement;
    expect(restored.src).toContain("default-profile-image");
  });

  it("미리보기가 있는 채로 언마운트되면 objectURL이 폐기된다 (react-doctor 환류)", () => {
    renderModal();
    selectFile(pngFile());
    expect(createObjectURL).toHaveBeenCalledTimes(1);

    cleanup(); // 닫기 경로를 거치지 않는 언마운트 — 라우트 이탈 등

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:preview-1");
  });

  it("저장 성공 시 모달이 닫히고 확정 응답의 profileImageUrl만 캐시에 병합된다 (기준 11의 vitest 대역·기준 7 배선)", async () => {
    const fetchMock = successFetchMock();
    const queryClient = saveSelectedPngWith(
      fetchMock as unknown as typeof fetch,
    );

    await waitFor(() =>
      expect(screen.queryAllByRole("dialog", { name: "프로필 편집" })).toEqual(
        [],
      ),
    );

    // S3 PUT은 presign 응답 uploadUrl로 raw fetch — Content-Type이 presign 요청과 동일
    const s3Call = fetchMock.mock.calls.find(
      ([input]) => input === S3_UPLOAD_URL,
    );
    expect(s3Call).toBeDefined();
    expect(new Headers(s3Call?.[1]?.headers).get("Content-Type")).toBe(
      "image/png",
    );

    const cached = cachedMe(queryClient);
    expect(cached.profileImageUrl).toBe(NEW_IMAGE_URL);
    // 기존 캐시의 email·nickname은 확정 응답 값으로 덮이지 않는다 (추정 4 — 최소 병합)
    expect(cached.nickname).toBe(PROFILE.nickname);
    expect(cached.email).toBe(PROFILE.email);
  });
});

// MSG-329 병합 — [저장]의 닉네임 배선(A8)과 이미지→닉네임 순차 실행(병합 신설 로직)
describe("프로필 편집 모달 — 닉네임 저장 배선 (MSG-329 A8)", () => {
  const NICKNAME_PATH = "/api/users/me/nickname";

  /** successFetchMock + 닉네임 PUT 라우트 — 순서 검증용으로 pathname을 기록한다 */
  const fetchMockWithNickname = () => {
    const base = successFetchMock();
    const paths: string[] = [];
    const mock = vi.fn(
      async (input: Request | string | URL, init?: RequestInit) => {
        if (input instanceof Request) {
          const pathname = new URL(input.url).pathname;
          paths.push(pathname);
          if (pathname === NICKNAME_PATH) {
            expect(input.method).toBe("PUT");
            expect(await input.clone().json()).toEqual({
              nickname: "새닉네임",
            });
            return envelope({
              email: PROFILE.email,
              nickname: "새닉네임",
              profileImageUrl: null,
              createdAt: PROFILE.joinedAt,
              locationConsent: false,
            });
          }
        } else {
          paths.push(String(input));
        }
        return base(input, init);
      },
    );
    return { mock, paths };
  };

  /** 닉네임 변경 → [저장] → 닫힘 대기 — 두 케이스 공용 진행부 */
  const saveNewNicknameAndAwaitClose = async () => {
    fireEvent.change(screen.getByLabelText("닉네임"), {
      target: { value: "새닉네임" },
    });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() =>
      expect(screen.queryAllByRole("dialog", { name: "프로필 편집" })).toEqual(
        [],
      ),
    );
  };

  it("닉네임을 바꿔 저장하면 PUT /api/users/me/nickname이 호출되고 성공 시 모달이 닫힌다 (A8)", async () => {
    const { mock, paths } = fetchMockWithNickname();
    vi.stubGlobal("fetch", mock);
    renderModal();

    await saveNewNicknameAndAwaitClose();

    // 이미지 미선택 — 닉네임 PUT만 나간다
    expect(paths).toEqual([NICKNAME_PATH]);
  });

  it("이미지+닉네임을 함께 저장하면 업로드(확정)가 먼저, 닉네임 PUT이 뒤따르고 모두 성공해야 닫힌다", async () => {
    const { mock, paths } = fetchMockWithNickname();
    vi.stubGlobal("fetch", mock);
    const queryClient = renderModal();
    selectFile(pngFile());

    await saveNewNicknameAndAwaitClose();

    // presign → S3 PUT → 확정 → 닉네임 순차 (병합 결정 — 실패 지점 단일 표시·성공분 재요청 없음)
    expect(paths).toEqual([
      PRESIGN_PATH,
      S3_UPLOAD_URL,
      CONFIRM_PATH,
      NICKNAME_PATH,
    ]);
    expect(cachedMe(queryClient).profileImageUrl).toBe(NEW_IMAGE_URL);
  });
});
