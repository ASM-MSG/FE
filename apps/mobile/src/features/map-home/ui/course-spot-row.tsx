import { Pressable, Text, View } from "react-native";
import { cx } from "@fillmap/ui-native";
import type { CourseSpot } from "../model/course";
import { courseSpotLabel, spotVisitLabel } from "../model/mission-detail-view";
import {
  THEME_FILL_CLASS,
  THEME_ROW_CLASS,
  THEME_TEXT_CLASS,
} from "./theme-classes";

/**
 * 코스 포토스팟 행 (MSG-427 E8·E9·E11·E12·E13·E-16) — 순번 원(방문 시 테마 색 채움,
 * 미방문은 회색 테두리) + 이름 + `영상 N`/`영상 없음` + `방문함`/`미방문`.
 * 방문 행은 행 배경이 연테마색으로 강조된다. 누르면 그 격자의 상세 시트로 간다 (E13).
 *
 * 영상 수는 **서버 `spotStats[].videoCount`** 다 (E11) — 웹이 쓰는 목 해시를 옮기지 않는다.
 * 이름은 격자 조회 응답에서 오고, 못 구했으면 격자 코드로 폴백한다 (E-16).
 */
interface CourseSpotRowProps {
  spot: CourseSpot;
  /** 격자 표시명 — 미도착·무귀속·조회 실패면 undefined */
  name: string | undefined;
  /** 이 스팟의 서버 영상 수 — 상세 미도착이면 undefined라 수치를 주장하지 않는다 */
  videoCount: number | undefined;
  /** 진행도·상세 조회 실패 — 방문 라벨·순번 채움을 생략한다 (E9) */
  progressFailed: boolean;
  onSelect: (gridId: string) => void;
}

export const CourseSpotRow = ({
  spot,
  name,
  videoCount,
  progressFailed,
  onSelect,
}: CourseSpotRowProps) => {
  const visited = !progressFailed && spot.visited;
  const label = courseSpotLabel(spot.gridId, spot.order, name);
  const visitLabel = spotVisitLabel(spot.visited, progressFailed);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label.name}
      onPress={() => onSelect(spot.gridId)}
      className={cx(
        "flex-row items-center gap-sm rounded-sm px-xs py-xs active:opacity-80",
        visited ? THEME_ROW_CLASS.route : "",
      )}
    >
      <View
        className={cx(
          "size-6 items-center justify-center rounded-full",
          visited ? THEME_FILL_CLASS.route : "border border-border",
        )}
      >
        <Text
          className={cx(
            "text-fm-caption",
            visited ? "text-primary-foreground" : "text-foreground-muted",
          )}
        >
          {spot.order}
        </Text>
      </View>

      <View className="flex-1">
        <Text
          numberOfLines={1}
          className={cx(
            "text-fm-body-strong",
            label.named ? "text-foreground" : "text-foreground-muted",
          )}
        >
          {label.name}
        </Text>
        <Text className="text-fm-caption text-foreground-muted">
          {label.description}
        </Text>
      </View>

      {videoCount !== undefined && (
        <Text className="text-fm-caption text-foreground-muted">
          {videoCount > 0 ? `영상 ${videoCount}` : "영상 없음"}
        </Text>
      )}
      {visitLabel && (
        <Text
          className={cx(
            "text-fm-caption",
            visited ? THEME_TEXT_CLASS.route : "text-foreground-muted",
          )}
        >
          {visitLabel}
        </Text>
      )}
    </Pressable>
  );
};
