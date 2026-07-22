import { queryOptions, useQuery } from "@tanstack/react-query";
import { MOCK_PROFILE, type ProfileData } from "@/entities/profile";

/**
 * 프로필 조회 queryFn (A7 — use-dex-query 패턴 미러링).
 * 현재는 mock 소스를 반환한다 — 실 API 전환 시 이 함수 내부(fetch/axios 호출)만 교체하면 되고,
 * queryKey와 반환 타입(ProfileData)은 그대로 유지된다.
 */
export const fetchProfile = async (): Promise<ProfileData> => MOCK_PROFILE;

/** API 교체와 무관한 고정 쿼리 옵션 (queryKey: ["profile"], 반환 타입: ProfileData) */
export const profileQueryOptions = () =>
  queryOptions({
    queryKey: ["profile"] as const,
    queryFn: fetchProfile,
  });

/** 프로필 조회 훅 — 뷰는 이 훅으로 로딩/에러/데이터 상태를 받는다 */
export const useProfileQuery = () => useQuery(profileQueryOptions());
