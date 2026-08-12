import { MOCK_DEX } from "@/entities/dex";
import type { ProfileData } from "./profile";

/**
 * 프로필 mock (MSG-124, A2·A3) — Figma node 13399:2106의 "닉네임"·feelmap@email.com·
 * "서울 34%"는 전부 플레이스홀더고 여기 값이 화면의 유일한 출처다.
 * 닉네임·스트릭은 도감 mock(MOCK_DEX.summary)을 직접 참조해 두 화면이 같은 사용자를
 * 다르게 말하지 않게 고정한다 (AC 5 — 값 복사가 아니라 참조 정합).
 * 수집률 "부산 34%"는 Figma 값에서 지명만 치환(MVP 부산 서면 규칙, AC 6) — 도감의
 * 전체 지도 탐험률·구 단위 탐험률과는 다른 제3의 축이라 정합 대상이 아니다 (R2).
 * 실 API 전환 시 use-profile-query의 queryFn 내부만 교체한다.
 *
 * [MSG-322] 명세 대응: `UserProfileResponseDto`(email·nickname) 신설로 ProfileData가
 * 생성 타입에 앵커됐다(profile.ts — MSG-289 당시 "스키마 부재"에서 현행화). 나머지 필드
 * (joinedAt·streakDays·collectionRate·appVersion·locationEnabled)는 여전히 명세 부재 —
 * 출처·환류 후보 표기는 profile.ts의 ProfileExtension 필드 주석 참조.
 */
export const MOCK_PROFILE: ProfileData = {
  nickname: MOCK_DEX.summary.nickname,
  email: "fillmapper@fillmap.app",
  // 미설정(null) — 화면은 기본 프로필 이미지 에셋을 표시한다 (MSG-378 기준 16)
  profileImageUrl: null,
  joinedAt: "2026-01-12",
  streakDays: MOCK_DEX.summary.streakDays,
  collectionRate: { regionLabel: "부산", pct: 34 },
  appVersion: "1.0.0",
  // 위치정보 사용 켜짐 — Figma 기본 상태 (MSG-125 A1)
  locationEnabled: true,
};
