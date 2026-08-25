import { Button } from "@fillmap/ui-web";
import { ROUTES } from "@/app/routes";
import { redirectTo } from "@/shared/navigation";

/**
 * 루트 라우트 에러 바운더리 (MSG-325).
 * 렌더·로더에서 던져진 오류를 여기서 받는다 — 없으면 라우터 기본 화면(개발자용 스택)이
 * 그대로 사용자에게 노출된다. 무매칭 경로(404)도 이 화면으로 수렴한다.
 *
 * "홈으로"는 라우터 navigate가 아니라 **하드 이동**(MSG-477 ② B1) — errorElement의
 * 에러 상태는 location이 바뀔 때만 리셋되므로, 홈 URL 자체에서 에러가 난 same-location
 * 케이스는 navigate("/")로 복구되지 않고, location이 바뀌어도 에러를 만든 앱/모듈 상태가
 * 남아 재발할 수 있다. 문서 리로드가 라우터·React·모듈 상태를 전부 초기화한다.
 * window.location.assign 직접 호출 대신 redirectTo 어댑터를 경유한다 — jsdom이
 * location.assign 재정의를 막아 스파이가 어댑터 목으로만 가능하다 (login-modal 관례).
 *
 * 오류 내용은 표시하지 않는다: 사용자가 할 수 있는 일이 없고, 내부 정보 노출만 는다.
 * 진단은 콘솔·리포팅 도구 몫이다.
 */
export const RouteErrorBoundary = () => (
  <div className="flex h-dvh flex-col items-center justify-center gap-md bg-background p-lg">
    <p className="text-fm-title text-foreground">문제가 생겼어요</p>
    <p className="text-fm-body text-foreground-muted">
      잠시 후 다시 시도해 주세요
    </p>
    <Button text="홈으로" onClick={() => redirectTo(ROUTES.home)} />
  </div>
);
