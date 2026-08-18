import type { CategoryPreferenceDto } from "@/shared/api/generated/types.gen";

/** 서버 알림 카테고리 enum (5종 고정) — 생성 타입에서 파생 */
export type NotificationCategory = CategoryPreferenceDto["category"];

export interface PreferenceCatalogEntry {
  category: NotificationCategory;
  label: string;
  description: string;
}

interface PreferenceGroup {
  title: string;
  entries: readonly PreferenceCatalogEntry[];
}

/**
 * 카테고리 정적 카탈로그 (MSG-409 AC 4) — 순서·그룹·라벨·설명의 단일 정본
 * (스펙 매핑 표 = Figma 14783:3344 시안 순서). RN 재사용 대상 순수 모듈.
 *
 * WEEKLY 문구는 결정 1(2026-08-18)로 시안("마케팅 · 혜택 정보 / 이벤트와 혜택 소식
 * 받기")을 기각하고 서버 카테고리 의미(주간 리포트)에 맞춰 교정했다 — 시안과
 * 의도적으로 다른 지점. 향후 문구 변경도 이 파일 1곳만 고친다.
 */
export const PREFERENCE_GROUPS: readonly PreferenceGroup[] = [
  {
    title: "활동 알림",
    entries: [
      {
        category: "VIDEO",
        label: "내 격자에 새 영상",
        description: "내가 점령한 격자에 새 영상이 올라오면",
      },
      {
        category: "BADGE",
        label: "뱃지 획득",
        description: "새로운 뱃지를 얻으면",
      },
      {
        category: "REMIND",
        label: "스트릭 리마인더",
        description: "오늘 기록이 없으면 저녁에 한 번",
      },
    ],
  },
  {
    title: "소식",
    entries: [
      {
        category: "HOTZONE",
        label: "지역 축제 · 팝업",
        description: "내 활동 지역에 이벤트가 열리면",
      },
      {
        category: "WEEKLY",
        label: "주간 리포트",
        description: "한 주의 수집 활동 요약을 주 1회",
      },
    ],
  },
];

/** 매핑 표 순서로 평탄화한 카테고리 5종 */
export const NOTIFICATION_CATEGORIES: readonly NotificationCategory[] =
  PREFERENCE_GROUPS.flatMap((group) =>
    group.entries.map((entry) => entry.category),
  );

export interface PreferenceItem extends PreferenceCatalogEntry {
  enabled: boolean;
}

export interface PreferenceGroupView {
  title: string;
  items: PreferenceItem[];
}

/**
 * 서버 preferences 배열을 카탈로그에 병합한다 (AC 4·5) — 카탈로그 순서가 정본이고,
 * 서버 응답에 누락된 카테고리는 true다 (opt-out: off 행 부재 = on — 계약 방어).
 */
export const mergePreferences = (
  server: readonly CategoryPreferenceDto[],
): PreferenceGroupView[] =>
  PREFERENCE_GROUPS.map((group) => ({
    title: group.title,
    items: group.entries.map((entry) => ({
      ...entry,
      enabled:
        server.find((row) => row.category === entry.category)?.enabled ?? true,
    })),
  }));
