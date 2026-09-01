import { Outlet } from "react-router-dom";
import { useRobotsNoindex } from "@/shared/document-meta";

/**
 * 콘솔 서브트리 루트 (MSG-541 AC 10) — `/org/*`·`/admin/*` 공통.
 * 마운트 중 robots 메타를 noindex로 바꾸고 언마운트 시 원값으로 복원한다
 * (`useRobotsNoindex` 재사용 — 메타를 추가로 만들지 않는다).
 * 공개 콘솔 라우트(로그인·재설정·계정 발급 요청)도 색인 대상이 아니므로 가드보다 위에 둔다.
 */
export const ConsoleRoot = () => {
  useRobotsNoindex();

  return <Outlet />;
};
