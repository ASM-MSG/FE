import { useNavigate } from "react-router-dom";
import { Button } from "@fillmap/ui-web";
import { ROUTES } from "@/app/routes";

/**
 * 루트 라우트 에러 바운더리 (MSG-325).
 * 렌더·로더에서 던져진 오류를 여기서 받는다 — 없으면 라우터 기본 화면(개발자용 스택)이
 * 그대로 사용자에게 노출된다. 무매칭 경로(404)도 이 화면으로 수렴한다.
 *
 * 오류 내용은 표시하지 않는다: 사용자가 할 수 있는 일이 없고, 내부 정보 노출만 는다.
 * 진단은 콘솔·리포팅 도구 몫이다.
 */
export const RouteErrorBoundary = () => {
  const navigate = useNavigate();

  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-md bg-background p-lg">
      <p className="text-fm-title text-foreground">문제가 생겼어요</p>
      <p className="text-fm-body text-foreground-muted">
        잠시 후 다시 시도해 주세요
      </p>
      <Button text="홈으로" onClick={() => navigate(ROUTES.home)} />
    </div>
  );
};
