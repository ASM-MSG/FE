import { useQuery } from "@tanstack/react-query";
import { toProfileData, type ProfileData } from "@/entities/profile";
import { unwrapEnvelope } from "@/shared/api/envelope";
// 생성 옵션은 barrel 미재수출 — 직접 경로 import (MSG-323 관례)
import { getMeOptions } from "@/shared/api/generated/@tanstack/react-query.gen";

/**
 * 프로필 조회 훅 (MSG-329 A1) — `GET /api/users/me` 생성 옵션 + 봉투 언랩 + ProfileData 매핑.
 * 구 mock 소스(MOCK_PROFILE)·수동 queryKey ["profile"]은 폐기 — 캐시 키는 getMeQueryKey다.
 * select는 파생 전용이라 캐시 원본은 봉투 그대로다 — 업로드 확정의 setQueryData 병합
 * (use-profile-image-upload, MSG-378 기준 19)도 같은 키의 봉투에 쓴다.
 * 뷰는 이 훅으로 로딩/에러/데이터 상태를 받는다 (A3 오류 게이트 포함).
 */
export const useProfileQuery = () =>
  useQuery({
    ...getMeOptions(),
    select: (envelope): ProfileData => toProfileData(unwrapEnvelope(envelope)),
  });
