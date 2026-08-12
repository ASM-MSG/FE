import { queryOptions, useQuery } from "@tanstack/react-query";
import { MOCK_PROFILE, type ProfileData } from "@/entities/profile";
import { unwrapEnvelope } from "@/shared/api/envelope";
import { getMe } from "@/shared/api/generated";

/**
 * 프로필 조회 queryFn — GET /api/users/me (MSG-378 확장 기준 18, mock 반환에서 전환).
 * 생성 SDK 호출 + 봉투 언랩(map-home 쿼리 관례) 뒤 ProfileData로 병합한다:
 * 명세 필드(email·nickname·profileImageUrl)와 가입일(createdAt→joinedAt)은 서버 값,
 * 명세에 없는 FE 확장 필드(streakDays·collectionRate·appVersion·locationEnabled)는
 * mock 값 유지 — 필드별 환류 상태는 entities/profile의 ProfileExtension 주석 참조.
 */
export const fetchProfile = async (): Promise<ProfileData> => {
  const { data } = await getMe({ throwOnError: true });
  const me = unwrapEnvelope(data);
  return {
    ...MOCK_PROFILE,
    email: me.email,
    nickname: me.nickname,
    profileImageUrl: me.profileImageUrl,
    joinedAt: me.createdAt,
  };
};

/** API 전환과 무관한 고정 쿼리 옵션 (queryKey: ["profile"], 반환 타입: ProfileData — 기준 19) */
export const profileQueryOptions = () =>
  queryOptions({
    queryKey: ["profile"] as const,
    queryFn: fetchProfile,
  });

/** 프로필 조회 훅 — 뷰는 이 훅으로 로딩/에러/데이터 상태를 받는다 */
export const useProfileQuery = () => useQuery(profileQueryOptions());
