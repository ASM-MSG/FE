import { Text, View } from "react-native";
import { cx } from "@fillmap/ui-native";
import type { HomeMissions } from "../api/use-home-missions";
import {
  formatCourseDuration,
  formatDistanceKm,
} from "../model/mission-format";
import type { CourseView } from "../model/mission-view";
import { CourseSpotRow } from "./course-spot-row";
import type { HomeSheetContentContext } from "./home-sheet";
import { MissionStatusBadge } from "./mission-status-badge";
import { SheetHeader } from "./sheet-header";
import { SheetNotice } from "./sheet-notice";
import { SheetScrollView } from "./sheet-scroll-view";
import { StatTrio } from "./stat-trio";
import { THEME_BADGE_CLASS, THEME_TEXT_CLASS } from "./theme-classes";

/**
 * 코스 상세 시트 (MSG-427 E4·E5·E6·E8·E11·E12·E13, Figma 화면 8).
 * `{지역} · 순환형/비순환형` → 완료 조건 배너 → 스탯(`내 진행`·`거리`·`소요 시간`) →
 * `포토스팟 N곳 · 올라온 영상 N개` + 스팟 목록. **히어로 이미지도 action-row도 없다**
 * (Figma 실측).
 *
 * 거리·소요 시간은 서버 null이면 **스탯 칸 자체를 그리지 않는다** (E6) — `-`나 `0분`으로
 * 채우면 "0분 걸린다"처럼 읽힌다.
 * 헤더의 `올라온 영상 N개`는 서버 `spotStats[].videoCount`의 합이다 (E11).
 */
interface CourseDetailSheetContentProps extends HomeSheetContentContext {
  view: CourseView;
  missions: HomeMissions;
  onSpotSelect: (gridId: string) => void;
  onBack: () => void;
  /** 테마 해제 (A4) — `showsCloseButton`이 false면 undefined라 ✕가 그려지지 않는다 */
  onClose?: () => void;
}

export const CourseDetailSheetContent = ({
  view,
  missions,
  onSpotSelect,
  onBack,
  onClose,
  ...sheet
}: CourseDetailSheetContentProps) => {
  const { dto, progress, spots } = view;
  const distance = formatDistanceKm(dto.distanceMeters);
  const duration = formatCourseDuration(dto.durationMinutes);

  return (
    <View className="flex-1 gap-sm">
      <SheetHeader
        title={view.title}
        badge={<MissionStatusBadge status={view.status} theme="route" />}
        onBack={onBack}
        onClose={onClose}
      />

      <SheetScrollView {...sheet} resetKey={view.missionId}>
        {/* 진행도·상세 조회 실패의 **재시도 경로** (A7) — 스탯의 `확인 불가`만으로는
            사용자가 다시 시도할 방법이 없다. `missions.retry()`가 목록·진행도·상세를
            함께 다시 부른다. 목록 시트의 같은 안내와 동일한 조각을 쓴다 (D13) */}
        {missions.progressFailed && (
          <SheetNotice
            message="진행도를 불러오지 못했어요"
            onRetry={missions.retry}
          />
        )}

        <Text className="text-fm-caption text-foreground-muted">
          {view.placeName
            ? `${view.placeName} · ${view.loop ? "순환형" : "비순환형"}`
            : view.loop
              ? "순환형"
              : "비순환형"}
        </Text>

        <View className={cx("rounded-sm px-sm py-xs", THEME_BADGE_CLASS.route)}>
          <Text className={cx("text-fm-body", THEME_TEXT_CLASS.route)}>
            포토스팟 {spots.length}곳 중 {progress.total}곳을 채우면 완료
          </Text>
        </View>

        <StatTrio
          items={[
            {
              label: "내 진행",
              value: missions.progressFailed
                ? "확인 불가"
                : `${progress.done}/${progress.total}곳`,
            },
            ...(distance ? [{ label: "거리", value: distance }] : []),
            ...(duration ? [{ label: "소요 시간", value: duration }] : []),
          ]}
        />

        <View className="gap-xs">
          <View className="flex-row items-baseline gap-xs">
            <Text className="text-fm-title text-foreground">
              포토스팟 {spots.length}곳
            </Text>
            <Text className="text-fm-caption text-foreground-muted">
              올라온 영상 {missions.spotVideoTotal}개
            </Text>
          </View>

          {spots.length === 0 ? (
            <Text className="text-fm-body text-foreground-muted">
              이 코스에는 등록된 포토스팟이 없어요
            </Text>
          ) : (
            spots.map((spot) => (
              <CourseSpotRow
                key={spot.gridId}
                spot={spot}
                name={missions.spotNames.names.get(spot.gridId)}
                videoCount={missions.spotStats.get(spot.gridId)?.videoCount}
                progressFailed={missions.progressFailed}
                onSelect={onSpotSelect}
              />
            ))
          )}
        </View>
      </SheetScrollView>
    </View>
  );
};
