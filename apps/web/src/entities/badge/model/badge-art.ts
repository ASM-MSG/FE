import course1 from "../assets/course-1.svg";
import course3 from "../assets/course-3.svg";
import course10 from "../assets/course-10.svg";
import earlyBird from "../assets/early-bird.svg";
import event1 from "../assets/event-1.svg";
import event3 from "../assets/event-3.svg";
import event10 from "../assets/event-10.svg";
import explorer1 from "../assets/explorer-1.svg";
import explorer10 from "../assets/explorer-10.svg";
import explorer50 from "../assets/explorer-50.svg";
import explorer100 from "../assets/explorer-100.svg";
import explorer500 from "../assets/explorer-500.svg";
import popup1 from "../assets/popup-1.svg";
import popup3 from "../assets/popup-3.svg";
import popup10 from "../assets/popup-10.svg";
import recorder10 from "../assets/recorder-10.svg";
import recorder50 from "../assets/recorder-50.svg";
import recorder100 from "../assets/recorder-100.svg";
import regionMaster10 from "../assets/region-master-10.svg";
import regionMaster25 from "../assets/region-master-25.svg";
import regionMaster50 from "../assets/region-master-50.svg";
import streak3 from "../assets/streak-3.svg";
import streak7 from "../assets/streak-7.svg";
import streak30 from "../assets/streak-30.svg";

/**
 * 뱃지 메달 아트 카탈로그 (MSG-327 기준 18·19) — Figma "FillMap 뱃지 시스템"(node 14599:11390)
 * 메달 프레임 24종을 SVG로 export한 것. 프레임 배경(#F5F5F5 사각형)은 제거해 패널 배경에 얹는다.
 * 순수 매핑 — 지도 SDK·플랫폼(window·router) 무의존(RN 재사용 대상, 에셋 경로만 교체 대상).
 *
 * 백엔드 `badges.icon_url`은 현재 전량 NULL이고 시안 노트가 "SVG export → S3 업로드 →
 * icon_url UPDATE"를 후속 과제로 명시했다 — 그래서 이 로컬 카탈로그가 현 시점 정본이고,
 * iconUrl이 채워지면 resolveBadgeArt가 자동으로 서버 값을 우선한다.
 */
const BADGE_ART: Record<string, string> = {
  EXPLORER_1: explorer1,
  EXPLORER_10: explorer10,
  EXPLORER_50: explorer50,
  EXPLORER_100: explorer100,
  EXPLORER_500: explorer500,
  RECORDER_10: recorder10,
  RECORDER_50: recorder50,
  RECORDER_100: recorder100,
  REGION_MASTER_10: regionMaster10,
  REGION_MASTER_25: regionMaster25,
  REGION_MASTER_50: regionMaster50,
  STREAK_3: streak3,
  STREAK_7: streak7,
  STREAK_30: streak30,
  EVENT_1: event1,
  EVENT_3: event3,
  EVENT_10: event10,
  COURSE_1: course1,
  COURSE_3: course3,
  COURSE_10: course10,
  POPUP_1: popup1,
  POPUP_3: popup3,
  POPUP_10: popup10,
  EARLY_BIRD: earlyBird,
};

/**
 * 뱃지 아트 소스 결정 — 서버 iconUrl > 로컬 code 에셋 > null. [기준 19]
 * null은 "아트 없음"이며, 표시 컴포넌트가 민무늬 원 폴백을 그린다 — 시드에 새 code가
 * 추가돼도 화면이 깨지지 않게 하는 안전망이다(에셋 추가는 후속 작업으로 남는다).
 */
export const resolveBadgeArt = (
  code: string,
  iconUrl: string | null,
): string | null => iconUrl ?? BADGE_ART[code] ?? null;
