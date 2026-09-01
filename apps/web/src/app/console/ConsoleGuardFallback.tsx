import { DotsLoader } from "@fillmap/ui-web";

/**
 * 콘솔 가드 자리표시 (MSG-541 AC 7·8) — role 확정 전 구간. 이 구간에 보호 본문을 렌더하면
 * 권한 없는 세션에 콘솔이 한 프레임 노출되고, 반대로 회송·404 위장을 렌더하면 정상 세션이
 * 깜빡였다가 되돌아온다. 두 가드가 같은 화면을 쓴다.
 */
export const ConsoleGuardFallback = () => (
  <div className="flex h-dvh items-center justify-center bg-surface-soft">
    <DotsLoader label="콘솔 불러오는 중" />
  </div>
);
