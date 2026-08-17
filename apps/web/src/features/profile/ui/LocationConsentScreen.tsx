import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button } from "@fillmap/ui-web";
import { useLogout } from "@/features/auth/api/use-auth-mutations";
import { useUpdateLocationConsent } from "../api/use-profile-mutations";

interface LocationConsentScreenProps {
  /** 로그아웃 직후 홈 이동 — 라우터는 조립층(AppLayout)이 보유한다 (RN 경계: 콜백 주입) */
  onLoggedOut: () => void;
}

/**
 * createBrowserRouter(@remix-run/router)가 history.state.idx에 심는 단조 증가 인덱스 —
 * 라우터 밖 엔트리 등으로 없으면 undefined (codex P1 방향 판별 재료)
 */
const readHistoryIdx = (): number | undefined => {
  const state = window.history.state as { idx?: unknown } | null;
  return typeof state?.idx === "number" ? state.idx : undefined;
};

/**
 * 위치정보 동의 온보딩 화면 (MSG-407) — Figma node 14781:3343 (페이지 전환본).
 * 서버 게이트(MSG-402)로 `locationConsent=false`인 로그인 사용자에게 앱 콘텐츠 대신
 * 전면 렌더된다 (라우트 아님 — AppLayout 조건 렌더, 추정 1).
 *
 * - [필수] 행 초기 체크됨 → CTA 즉시 활성 (추정 2). 해제 시 CTA 비활성 (기준 7)
 * - [선택] 마케팅 행은 UI 전용 — 체크 상태를 저장·전송하지 않고 CTA 조건에도 무관
 *   (확정 1 — 서버 API 부재, 후속 티켓에서 배선)
 * - [보기] 링크 2곳은 비활성 placeholder — 약관 문서 연결은 후속 (확정 2)
 * - CTA = PUT /api/users/me/location-consent {consented: true} → getMe invalidate 경유
 *   게이트 해제 (기준 8). 실패 시 오류 안내 + 재시도 (기준 9)
 * - 디자인의 하단 철회 캡션("프로필 편집에서 철회")은 렌더하지 않는다 — v3 결정 1로
 *   인앱 철회 접점이 없어 거짓 문구가 됨 (기준 4 의도된 편차)
 * - 브라우저 위치 권한은 요청하지 않는다 — 동의와 권한은 별개 층, 권한은 지도 홈 첫 사용 시 (기준 10)
 * - 로그아웃 보조 버튼은 디자인에 없는 구현 추가분 — 게이트 이탈 수단 (확정 4, 기준 11).
 *   기존 useLogout 관례(ProfilePanel과 동일): logout API로 서버 세션(HttpOnly 리프레시
 *   쿠키)까지 무효화하고, 성공·실패 무관하게 로컬 우선 종료 후 홈 이동 (codex P1 반영 —
 *   auth-store.logout 단독은 리프레시 재인증 여지를 남긴다)
 * - 브라우저 뒤로가기(popstate) = 로그인 중단 (v4): 같은 로그아웃 플로우를 타되 navigate는
 *   하지 않는다 — 브라우저가 이미 팝한 URL이 로그아웃 후 익명으로 렌더된다(보호 라우트면
 *   RequireAuth 관례가 홈+로그인 모달 처리). 라우트 push·URL 직접 변경은 게이트 유지 —
 *   뒤로가기만 이탈 제스처. popstate는 window 전용 이벤트지만 뷰 컴포넌트 effect라
 *   RN 경계(model 레이어 금지) 밖이고, 리스너 수명이 게이트 표시 수명과 일치한다
 */
export const LocationConsentScreen = ({
  onLoggedOut,
}: LocationConsentScreenProps) => {
  const [requiredChecked, setRequiredChecked] = useState(true);
  const [marketingChecked, setMarketingChecked] = useState(false);
  // 서버 세션 무효화 + 로컬 우선 종료(onSettled) 후 홈 이동 — ProfilePanel 로그아웃 관례
  const { mutate: logout, isPending: isLoggingOut } = useLogout({
    onFinished: onLoggedOut,
  });
  // 뒤로가기 로그인 중단용 별도 인스턴스 (v4) — 홈 이동 콜백 없음(navigate 금지).
  // 훅 레벨 콜백 관례상 같은 인스턴스로 두 완료 동작을 나눌 수 없어 분리했다
  const { mutate: abortLogin, isPending: isAborting } = useLogout();
  // 두 트리거(뒤로가기·버튼)를 아우르는 공용 1회 가드 (codex P2) — 어느 쪽이 시작했든
  // 다른 쪽의 발화를 막아 로그아웃 정산 경로가 하나만 실행된다. 리렌더 전 연타도 차단.
  // 실패해도 onSettled가 로컬 세션을 해제해 게이트가 닫히므로 리셋이 필요 없다
  const logoutRequestedRef = useRef(false);
  const requestLogoutOnce = useCallback((trigger: () => void) => {
    if (logoutRequestedRef.current) return;
    logoutRequestedRef.current = true;
    trigger();
  }, []);
  // 마지막으로 관찰한 히스토리 인덱스 (codex P1) — createBrowserRouter(@remix-run/router)가
  // 엔트리마다 history.state.idx에 심는 단조 증가 값(실측: react-router 7.18.1
  // chunk-KS7C4IRE getHistoryState/getIndex). 마운트 idx가 아니라 마지막 관찰값과
  // 비교해야 forward 무시 이후의 back도 판별된다
  const lastHistoryIdxRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    lastHistoryIdxRef.current = readHistoryIdx();
    const abortOnPopState = () => {
      const idx = readHistoryIdx();
      const last = lastHistoryIdxRef.current;
      lastHistoryIdxRef.current = idx;
      // idx가 커지면 앞으로가기 — 로그인 중단 없이 게이트 재렌더 유지 (기준 1·2:
      // 뒤로가기만 이탈 제스처). idx 미상(라우터 밖 엔트리)은 뒤로가기로 간주 —
      // 이탈 수단을 보존하는 쪽이 안전하고, 라우터 관리 히스토리에선 발생 경로가 없다
      if (typeof idx === "number" && typeof last === "number" && idx > last) {
        return;
      }
      requestLogoutOnce(abortLogin);
    };
    window.addEventListener("popstate", abortOnPopState);
    return () => window.removeEventListener("popstate", abortOnPopState);
  }, [abortLogin, requestLogoutOnce]);
  const {
    mutate: saveConsent,
    isPending,
    isError,
  } = useUpdateLocationConsent();

  return (
    <div className="flex h-dvh items-center justify-center overflow-y-auto bg-background px-lg">
      <main className="flex w-full max-w-120 flex-col gap-lg">
        <div className="flex flex-col gap-sm">
          <h1 className="text-fm-heading text-foreground">
            위치정보 이용 동의
          </h1>
          <p className="whitespace-pre-line text-fm-body text-foreground-body">
            {
              "필맵은 방문한 장소를 짧은 영상으로 기록하고,\n지도 위 격자를 채워 가는 서비스에요.\n서비스를 이용하려면 위치기반서비스 이용약관 동의가 필요해요."
            }
          </p>
        </div>

        <div className="flex flex-col gap-sm">
          <ConsentRow
            label="[필수] 위치기반서비스 이용약관 동의"
            checked={requiredChecked}
            onToggle={setRequiredChecked}
          />
          {/* [선택] 마케팅 — 로컬 state만, 저장·전송 없음 (확정 1) */}
          <ConsentRow
            label="[선택] 마케팅 정보 수신 동의"
            checked={marketingChecked}
            onToggle={setMarketingChecked}
          />
        </div>

        <div className="flex flex-col items-center gap-sm">
          {/* PUT 실패 — 게이트 유지 + 오류 안내 + CTA 재시도 (기준 9) */}
          {isError && (
            <p role="alert" className="text-center text-fm-caption text-error">
              동의 처리에 실패했어요. 다시 시도해주세요
            </p>
          )}
          <Button
            text="동의하고 시작하기"
            variant="primary"
            className="w-full rounded-full"
            disabled={!requiredChecked || isPending}
            aria-busy={isPending}
            onClick={() => saveConsent(true)}
          />
          {/* 뒤로가기 중단과 공용 1회 가드 공유 (codex P2) — 어느 트리거든 시작되면
              다른 쪽은 무시되고, 진행 표시도 두 인스턴스를 함께 본다 */}
          <button
            type="button"
            className="text-fm-label text-foreground-muted underline underline-offset-2 disabled:opacity-50"
            disabled={isLoggingOut || isAborting}
            aria-busy={isLoggingOut || isAborting}
            onClick={() => requestLogoutOnce(logout)}
          >
            로그아웃
          </button>
        </div>
      </main>
    </div>
  );
};

/** 동의 행 — 체크박스 + 라벨 + 비활성 [보기] (확정 2). Figma 14781:3343 행 구성 */
const ConsentRow = ({
  label,
  checked,
  onToggle,
}: {
  label: ReactNode;
  checked: boolean;
  onToggle: (checked: boolean) => void;
}) => (
  <div className="flex items-center gap-sm rounded-md border border-border bg-surface-soft px-md py-sm">
    <label className="flex flex-1 cursor-pointer items-center gap-sm text-fm-body text-foreground">
      <input
        type="checkbox"
        className="size-5 shrink-0 accent-primary"
        checked={checked}
        onChange={(e) => onToggle(e.target.checked)}
      />
      {label}
    </label>
    {/* 비활성 placeholder — 약관 문서 연결 전 (확정 2, 클릭 무동작) */}
    <button
      type="button"
      disabled
      className="shrink-0 text-fm-label font-semibold text-primary disabled:opacity-60"
    >
      보기
    </button>
  </div>
);
