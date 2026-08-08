import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@fillmap/ui-web";
import { KAKAO_CALLBACK_PATH, ROUTES } from "@/app/routes";
import { useKakaoCodeLogin } from "@/features/auth/api/use-auth-mutations";
import {
  developCodeOf,
  parseKakaoCallback,
  toKakaoLoginFailure,
  type KakaoLoginFailure,
} from "@/features/auth/model/kakao-oauth";
import { appOrigin } from "@/shared/navigation";
import { oauthStateStorage } from "@/shared/storage";

/** 인가 결과 판정 — 코드 교환으로 넘어갈지, 바로 안내로 끝낼지 */
type Verdict =
  | { kind: "exchange"; code: string }
  | { kind: "denied" }
  | { kind: "failed"; reason: string };

/**
 * 카카오 인가 결과를 해석한다.
 * 저장된 state는 **읽기만** 한다(peek) — 여러 번 실행돼도 같은 결과여야 하기 때문이다.
 * 폐기(clear)는 판정과 분리해 효과에서 1회 수행한다.
 */
const resolveCallback = (search: string): Verdict => {
  const result = parseKakaoCallback(search);
  const savedState = oauthStateStorage.peek();

  if (result.status === "invalid") {
    return { kind: "failed", reason: "잘못된 접근이에요" };
  }
  if (result.status === "error") {
    // 사용자가 동의 화면에서 취소한 경우가 대부분 — 실패로 다루지 않고 안내만 한다
    return result.error === "access_denied"
      ? { kind: "denied" }
      : { kind: "failed", reason: result.description ?? result.error };
  }
  // CSRF 대조: 내가 시작하지 않은 인가 결과는 받지 않는다
  if (savedState === null || result.state !== savedState) {
    return { kind: "failed", reason: "인증 요청이 확인되지 않았어요" };
  }
  return { kind: "exchange", code: result.code };
};

/** 서버 실패 사유별 안내 — 재시도 방식이 달라 문구를 구분한다 (백엔드 계약 2423 / 2502) */
const FAILURE_MESSAGE: Record<KakaoLoginFailure, string> = {
  expired: "다시 로그인해주세요",
  provider: "잠시 후 다시 시도해주세요",
  unknown: "로그인을 완료하지 못했어요",
};

/**
 * 카카오 OAuth 콜백 페이지 (MSG-325) — 인가 코드를 서버에 넘겨 로그인을 완결한다.
 *
 * 순서: state 대조 → `POST /api/auth/oauth/kakao/code` → accessToken 저장 → 홈.
 * 서버 진입점이 심은 nonce 쿠키는 httpClient의 `credentials: "include"`로 자동 동봉된다.
 */
export const KakaoCallbackPage = () => {
  const { search } = useLocation();
  const navigate = useNavigate();
  const [failure, setFailure] = useState<KakaoLoginFailure | null>(null);
  const { mutate: exchangeCode } = useKakaoCodeLogin({
    onLoggedIn: () => navigate(ROUTES.home, { replace: true }),
    onFailed: (error) => setFailure(toKakaoLoginFailure(developCodeOf(error))),
  });

  // 판정은 진입 시점 1회로 고정한다 — state를 지운 뒤 리렌더되어도 결과가 뒤집히지 않는다.
  // 초기화 함수는 StrictMode에서 2회 실행되지만 peek 기반이라 결과가 같다(멱등)
  const [verdict] = useState(() => resolveCallback(search));

  // 판정이 끝난 state는 폐기한다 — 렌더가 아니라 효과에서, 재실행돼도 무해하다
  useEffect(() => oauthStateStorage.clear(), []);

  // 코드 교환은 진입 시 1회 — 인가 코드는 1회용이라 두 번 보내면 두 번째가 2423(재사용)으로
  // 실패한다. 가드가 **ref**인 이유: StrictMode는 effect를 mount→cleanup→mount로 두 번
  // 실행하는데 그 사이 리렌더가 없어 state 가드는 두 실행이 같은 값(false)을 본다.
  // ref는 동기 반영이라 두 번째 실행이 즉시 차단된다
  const exchangeStarted = useRef(false);
  useEffect(() => {
    if (verdict.kind !== "exchange" || exchangeStarted.current) return;
    exchangeStarted.current = true;
    // 인가 요청에 쓴 값과 정확히 같아야 카카오가 교환을 허용한다
    exchangeCode({
      code: verdict.code,
      redirectUri: `${appOrigin()}${KAKAO_CALLBACK_PATH}`,
    });
  }, [verdict, exchangeCode]);

  if (verdict.kind === "denied") {
    return (
      <CallbackNotice title="카카오 로그인을 취소했어요" onHome={navigate} />
    );
  }
  if (verdict.kind === "failed") {
    return (
      <CallbackNotice
        title="로그인에 실패했어요"
        detail={verdict.reason}
        onHome={navigate}
      />
    );
  }
  if (failure !== null) {
    return (
      <CallbackNotice
        title="로그인에 실패했어요"
        detail={FAILURE_MESSAGE[failure]}
        onHome={navigate}
      />
    );
  }
  return (
    <CallbackNotice
      title="로그인 중이에요"
      detail="잠시만 기다려 주세요"
      onHome={navigate}
      busy
    />
  );
};

interface CallbackNoticeProps {
  title: string;
  detail?: string;
  onHome: (to: string) => void;
  busy?: boolean;
}

/** 콜백 상태 안내 — 제목 + 보조 문구 + 홈 복귀 */
const CallbackNotice = ({
  title,
  detail,
  onHome,
  busy,
}: CallbackNoticeProps) => (
  <div
    className="flex h-full flex-col items-center justify-center gap-md p-lg"
    aria-busy={busy}
  >
    <p className="text-fm-title text-foreground">{title}</p>
    {detail && <p className="text-fm-body text-foreground-muted">{detail}</p>}
    <Button text="홈으로" onClick={() => onHome(ROUTES.home)} />
  </div>
);
