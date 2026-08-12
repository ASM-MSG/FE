import { MOCK_DEX } from "@/entities/dex";
import type { ProfileData } from "./profile";

/**
 * 프로필 mock (MSG-124, A2·A3) — Figma node 13399:2106의 "닉네임"·feelmap@email.com·
 * "서울 34%"는 전부 플레이스홀더다.
 * 닉네임·스트릭은 도감 mock(MOCK_DEX.summary)을 직접 참조해 두 화면이 같은 사용자를
 * 다르게 말하지 않게 고정한다 (AC 5 — 값 복사가 아니라 참조 정합).
 * 수집률 "부산 34%"는 Figma 값에서 지명만 치환(MVP 부산 서면 규칙, AC 6) — 도감의
 * 전체 지도 탐험률·구 단위 탐험률과는 다른 제3의 축이라 정합 대상이 아니다 (R2).
 *
 * [MSG-378 확장] 프로필 조회가 getMe 실 API로 전환됐다 — 화면의 명세 필드(email·nickname·
 * profileImageUrl·joinedAt)는 서버 값이 정본이고, 이 mock은 ①명세 부재 FE 확장 필드
 * (streakDays·collectionRate·appVersion·locationEnabled)의 병합 소스(fetchProfile)
 * ②테스트 픽스처로만 쓰인다. 출처·환류 후보 표기는 profile.ts의 필드 주석 참조.
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
