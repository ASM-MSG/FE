import { Pressable, Text, View } from "react-native";
import { ProgressBar, cx } from "@fillmap/ui-native";
import { progressRatio } from "../model/mission-progress";
import type { CourseView } from "../model/mission-view";
import { MissionStatusBadge } from "./mission-status-badge";
import { THEME_TEXT_CLASS } from "./theme-classes";

/**
 * 경로추천 목록 카드 (MSG-427 E2·E3) — Figma 실측: 348×107, **썸네일 없음**, 4px 진행 바.
 * 코스는 여러 지점을 순서대로 채우는 미션이라 "얼마나 왔는지"가 카드의 핵심 정보다.
 *
 * 진행도 조회가 실패하면 **바를 그리지 않고** `방문 확인 불가`로 적는다 (E3):
 * 실패 시 분자가 0으로 폴백해 `0/N곳 방문` + 빈 바가 확정된 사실처럼 보이고, 목록 위
 * 안내 배너를 놓친 사용자는 "아직 하나도 안 갔다"로 읽는다.
 */
interface CourseCardProps {
  view: CourseView;
  /** 진행도·상세 조회 실패 (E3) */
  progressFailed: boolean;
  onSelect: (missionId: number) => void;
}

export const CourseCard = ({
  view,
  progressFailed,
  onSelect,
}: CourseCardProps) => {
  const { progress, spots } = view;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={view.title}
      onPress={() => onSelect(view.missionId)}
      className="gap-1.75 rounded-md bg-background p-3 shadow-raised active:opacity-80"
    >
      <View className="flex-row items-start gap-xs">
        <Text
          numberOfLines={1}
          className="flex-1 text-fm-body-strong text-foreground"
        >
          {view.title}
        </Text>
        <MissionStatusBadge status={view.status} theme="route" />
      </View>

      <Text numberOfLines={1} className="text-fm-label text-foreground-muted">
        {view.placeName
          ? `${view.placeName} · 포토스팟 ${spots.length}곳`
          : `포토스팟 ${spots.length}곳`}
      </Text>

      {/* 진행도를 모르면 바 자체를 그리지 않는다 — 빈 바는 "0% 진행"이라는 주장이다.
          Figma 실측은 theme-route 초록 4px이라 기본값(primary 6px)을 덮는다 —
          NativeWind는 캐스케이드로 승자를 정하므로 important 수식자가 필요하다
          (도감 헤더의 `!h-2` 선례). 클래스는 정적 스캔 대상이라 리터럴로 적는다 */}
      {!progressFailed && (
        <ProgressBar
          value={progressRatio(progress)}
          className="!h-1"
          fillClassName="!bg-theme-route"
        />
      )}

      <Text
        className={cx(
          "text-fm-label",
          progress.completed && !progressFailed
            ? THEME_TEXT_CLASS.route
            : "text-foreground-muted",
        )}
      >
        {progressFailed
          ? "방문 확인 불가"
          : `${progress.done}/${progress.total}곳 방문`}
      </Text>
    </Pressable>
  );
};
