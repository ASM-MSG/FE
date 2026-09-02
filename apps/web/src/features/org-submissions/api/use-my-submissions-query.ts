import { useQuery } from "@tanstack/react-query";
import { unwrapEnvelope } from "@/shared/api/envelope";
// 생성 옵션은 barrel 미재수출 — 직접 경로 import (MSG-323 관례)
import { getMySubmissionsOptions } from "@/shared/api/generated/@tanstack/react-query.gen";

/**
 * 내 행사 신청 현황 조회 (MSG-545 AC 1·2) — `GET /api/org/event-submissions/my`.
 *
 * 응답 하나가 대시보드 전체의 재료다: `counts`(카운트 카드)와 `submissions`(최신 제출 순,
 * 페이지네이션 없음 — 상태 필터는 클라이언트 처리)를 함께 준다.
 * 콘솔 가드(`RequireOrgRole`)가 `/org` 세션을 보장하므로 별도 인증 게이트가 없다.
 *
 * MSG-549(내 신청 목록)가 그대로 재사용할 자산이다.
 */
export const useMySubmissionsQuery = () =>
  useQuery({ ...getMySubmissionsOptions(), select: unwrapEnvelope });
