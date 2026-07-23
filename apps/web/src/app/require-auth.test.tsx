import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createAuthStore,
  useAuthStore,
} from "@/features/auth/model/auth-store";
import { useLoginModalStore } from "@/features/auth/model/login-modal-store";
import { RequireAuth } from "./RequireAuth";

/**
 * /profile 라우트 인증 가드 (MSG-46 PR #23 리뷰 R1).
 * SideRail 클릭 분기(side-rail-nav.test.tsx의 G1)가 못 막는 직접 진입 경로 —
 * 주소창 입력·새로고침·뒤로가기 — 를 라우트 레벨에서 고정한다.
 * 판정은 진입(마운트) 시점 1회 — 렌더 중 로그아웃은 후속 F2(패널 잔류)가 의도라
 * 반응형 가드로 만들지 않는다.
 * 후속 3(P3): 인증 상태가 영속화되어 로그아웃 진입이 실재하는 경로가 됐다 —
 * 차단 케이스는 수동 상태 설정이 아니라 스토리지 재수화(새 로드 의미론)로 재현한다.
 */

/** 현재 경로 노출 대역 — 리다이렉트 여부를 단정하기 위한 관찰 지점 */
const LocationProbe = () => {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
};

const renderGuardedProfile = () =>
  render(
    <MemoryRouter initialEntries={["/profile"]}>
      <Routes>
        <Route path="/" element={<div>홈 화면</div>} />
        <Route
          path="/profile"
          element={
            <RequireAuth>
              <div>프로필 콘텐츠</div>
            </RequireAuth>
          }
        />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );

afterEach(cleanup);

describe("/profile 인증 가드 (R1)", () => {
  beforeEach(() => {
    useAuthStore.setState({ isAuthenticated: true });
    useLoginModalStore.setState({ open: false });
  });

  it("이전 세션의 로그아웃이 영속돼 새 로드의 /profile 직접 진입을 막는다 — 프로필 미렌더·홈 리다이렉트·모달 (P3)", async () => {
    // 이전 세션(별도 스토어 인스턴스, 같은 스토리지 키): 로그아웃 → 스토리지에 영속.
    // 싱글턴 메모리는 아직 true — 수동 false 설정이 아니라 스토리지 재수화가
    // 가드를 실동작시킴을 단정한다 (codex 지적 해소)
    const previousSession = createAuthStore();
    previousSession.getState().logout();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    // 새 로드: 스토리지에서 재수화
    await useAuthStore.persist.rehydrate();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);

    renderGuardedProfile();

    expect(screen.queryByText("프로필 콘텐츠")).toBeNull();
    expect(screen.getByTestId("location").textContent).toBe("/");
    expect(screen.getByText("홈 화면")).toBeTruthy();
    expect(useLoginModalStore.getState().open).toBe(true);
  });

  it("로그인 상태 /profile 진입은 기존대로 프로필을 렌더한다 — 모달 안 뜸 (회귀 없음)", () => {
    renderGuardedProfile();

    expect(screen.getByText("프로필 콘텐츠")).toBeTruthy();
    expect(screen.getByTestId("location").textContent).toBe("/profile");
    expect(useLoginModalStore.getState().open).toBe(false);
  });

  it("로그인 상태로 진입한 뒤 로그아웃해도 패널에 머문다 — 진입 시점 판정, F2(로그아웃 후 잔류) 보존", () => {
    renderGuardedProfile();

    act(() => {
      useAuthStore.getState().logout();
    });

    expect(screen.getByText("프로필 콘텐츠")).toBeTruthy();
    expect(screen.getByTestId("location").textContent).toBe("/profile");
    expect(useLoginModalStore.getState().open).toBe(false);
  });
});
