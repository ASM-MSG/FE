import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@fillmap/ui-web";
import { ROUTES } from "@/app/routes";
import { parseKakaoCallback } from "@/features/auth/model/kakao-oauth";
import { oauthStateStorage } from "@/shared/storage";

/** 화면에 그릴 콜백 처리 결과 — 표시 문구는 사유별로 구분한다 */
type CallbackView =
  | { kind: "authorized" }
  | { kind: "denied" }
  | { kind: "failed"; reason: string };

/**
 * 카카오 인가 결과를 해석해 표시 모델로 바꾼다.
 * state는 소비형이라 렌더당 1회만 읽어야 한다 — 호출부가 useMemo로 고정한다.
 */
const resolveCallback = (search: string): CallbackView => {
  const result = parseKakaoCallback(search);
  const savedState = oauthStateStorage.consume();

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
  return { kind: "authorized" };
};

const MESSAGE: Record<CallbackView["kind"], string> = {
  authorized: "카카오 인증이 완료됐어요",
  denied: "카카오 로그인을 취소했어요",
  failed: "로그인에 실패했어요",
};

/**
 * 카카오 OAuth 콜백 페이지 (MSG-325) — 인가 코드를 받아 로그인을 완결하는 자리.
 *
 * **현재는 인가까지만 처리한다.** 인가 코드를 ID 토큰으로 바꾸는 교환은 카카오가 REST API
 * 키를 요구해 서버 몫이고, 그 엔드포인트가 아직 없다(지라 MSG-325 코멘트로 요청 완료).
 * 엔드포인트가 생기면 authorized 분기에서 code를 그 API로 넘기고 성공 시 홈으로 보내면 된다 —
 * 그때까지는 인증이 성립했음을 알리고 홈으로 돌려보낸다.
 */
export const KakaoCallbackPage = () => {
  const { search } = useLocation();
  const navigate = useNavigate();
  // state 소비가 1회여야 하므로 검색 문자열이 바뀔 때만 재평가한다
  const view = useMemo(() => resolveCallback(search), [search]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-md p-lg">
      <p className="text-fm-title text-foreground">{MESSAGE[view.kind]}</p>
      {view.kind === "failed" && (
        <p className="text-fm-body text-foreground-muted">{view.reason}</p>
      )}
      {view.kind === "authorized" && (
        <p className="text-fm-body text-foreground-muted">
          서버 로그인 연결은 준비 중이에요. 잠시 후 다시 시도해 주세요.
        </p>
      )}
      <Button text="홈으로" onClick={() => navigate(ROUTES.home)} />
    </div>
  );
};
