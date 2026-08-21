import { formatProgressRate } from "@/features/dex/model/region-label";
import { formatStreakDays } from "@/features/profile/model/activity-summary";
import type { ActivityResult } from "@/features/profile/model/use-activity-query";

const ActivityStat = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col items-center gap-xxs">
    <span className="text-fm-caption text-foreground-muted">{label}</span>
    <span className="text-fm-title text-foreground">{value}</span>
  </div>
);

/** 값 없음 표시 — 조회 전·실패 공용 (MSG-329가 세운 자리 표시를 그대로 쓴다) */
const EMPTY = "—";

interface ActivityCardProps {
  activity: ActivityResult;
}

/**
 * "내 활동" 요약 카드 1장 — 좌측 스트릭 · 우측 수집률.
 *
 * MSG-329는 프로필 명세(GET /api/users/me)에 두 축이 없어 `—`로 두고 도감 유도 판단을
 * 미뤘다. MSG-395에서 실 연동했다 — 스트릭은 `collections/summary.currentStreak`,
 * 수집률은 `regions/stats`의 격자 합산(features/profile/model/activity-summary).
 *
 * 조회 전·실패는 둘 다 `—`다. 이 카드는 보조 정보라 실패를 별도 오류 UI로 키우면
 * 프로필 본문(닉네임·설정)보다 시끄러워진다 — 프로필 조회 자체의 실패는 패널이 이미
 * 재시도 화면으로 잡는다. 카드 스타일은 DexStatCards의 StatCard 선례.
 */
export const ActivityCard = ({ activity }: ActivityCardProps) => (
  <div className="grid grid-cols-2 gap-sm rounded-md border border-border bg-surface-soft py-md">
    <ActivityStat
      label="스트릭"
      value={
        activity.streakDays === null
          ? EMPTY
          : formatStreakDays(activity.streakDays)
      }
    />
    <ActivityStat
      label="수집률"
      value={
        activity.collectionRate === null
          ? EMPTY
          : formatProgressRate(activity.collectionRate)
      }
    />
  </div>
);
