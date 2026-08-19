import { Text, View } from "react-native";
import { cx } from "@fillmap/ui-native";
import type { MissionStatus } from "../model/mission-status";
import type { ThemeId } from "../model/themes";
import {
  THEME_BADGE_CLASS,
  THEME_FILL_CLASS,
  THEME_TEXT_CLASS,
} from "./theme-classes";

/**
 * 미션·코스 상태 배지 (MSG-427 D5) — `D-3` `진행 중` `오늘까지` `상시` `완료` `종료`.
 * 웹 `MissionStatusBadge` 미러 — 색 규칙은 Figma 정본을 따라 세 단계로 읽힌다:
 * - **완료**: 칩 색 채움 + 흰 글씨 (가장 강한 상태)
 * - **마감 임박(D-N·오늘까지)**: 칩 색 연한 배경 — "곧 못 한다"는 신호
 * - **진행 중·상시·종료**: 무채색 — 지금 특별할 게 없는 상태라 물러난다
 *
 * 공용 `ui-native/Chip`을 쓰지 않는다: Chip은 선택 토글용이라 active 시 Check 아이콘을
 * 강제하고 primary 단색이라 테마 4색·상태별 분기를 표현할 수 없다 (ThemeChip과 같은 판정).
 * `ui-native/index.ts` 잠금으로 승격도 하지 않는다 (F5).
 */
interface MissionStatusBadgeProps {
  status: MissionStatus;
  /** 소속 칩 — 마감 임박·완료 배지가 그 칩의 색을 따른다 */
  theme: ThemeId;
}

export const MissionStatusBadge = ({
  status,
  theme,
}: MissionStatusBadgeProps) => {
  const completed = status.kind === "completed";
  const urgent = status.kind === "upcoming" || status.kind === "today";

  return (
    <View
      className={cx(
        "rounded-full px-1.75 py-0.75",
        completed
          ? THEME_FILL_CLASS[theme]
          : urgent
            ? THEME_BADGE_CLASS[theme]
            : "bg-surface",
      )}
    >
      <Text
        className={cx(
          "text-fm-caption",
          completed
            ? "text-primary-foreground"
            : urgent
              ? THEME_TEXT_CLASS[theme]
              : "text-foreground-muted",
        )}
      >
        {status.label}
      </Text>
    </View>
  );
};
