import { useAuth } from "./auth-session";
import { userIdFromAccessToken } from "./session-user";

/** 현재 로그인 사용자 id — 토큰의 sub. 비로그인·형식 밖이면 null (MSG-606) */
export const useCurrentUserId = (): number | null =>
  userIdFromAccessToken(useAuth().accessToken);
