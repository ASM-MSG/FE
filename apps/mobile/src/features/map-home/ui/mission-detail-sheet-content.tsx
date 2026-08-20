import { Text, View } from "react-native";
import { Thumbnail, cx } from "@fillmap/ui-native";
import type { HomeMissions } from "../api/use-home-missions";
import { missionDetailPeriod } from "../model/mission-detail-view";
import type { MissionView } from "../model/mission-view";
import type { ThemeId } from "../model/themes";
import { FeedSection } from "./feed-section";
import type { HomeSheetContentContext } from "./home-sheet";
import { MissionStatusBadge } from "./mission-status-badge";
import { SheetHeader } from "./sheet-header";
import { SheetNotice } from "./sheet-notice";
import { SheetScrollView } from "./sheet-scroll-view";
import { StatTrio } from "./stat-trio";
import { THEME_BADGE_CLASS, THEME_TEXT_CLASS } from "./theme-classes";

/**
 * 지역축제·팝업스토어 상세 시트 (MSG-427 D10·D11·D12, Figma 화면 4·6).
 * 히어로 이미지 → `{장소} · {기간}` → 완료 조건 배너 → 스탯 3종 → `이 미션의 영상 N개 ·
 * 최신순` + 1열 목록. **action-row가 없다** (Figma 실측 — 핫구역 요약·격자 상세에만 있다).
 *
 * 부제의 기간은 **테마와 무관하게 날짜 기간**이다 (D11) — 팝업의 운영시간은 스탯 칸이
 * 담당한다. 파생은 `missionDetailPeriod`가 갖는다.
 *
 * `올라온 영상`은 서버 `MissionDetailResponseDto.videoCount`다 (D12) — 영상 첫 페이지
 * 길이(20에서 포화)가 아니다. 웹의 미배선을 모바일이 앞질러 고친 지점이다(스펙 R6).
 */
interface MissionDetailSheetContentProps extends HomeSheetContentContext {
  view: MissionView;
  theme: Extract<ThemeId, "festival" | "popup">;
  missions: HomeMissions;
  onBack: () => void;
  /** 테마 해제 (A4) — `showsCloseButton`이 false면 undefined라 ✕가 그려지지 않는다 */
  onClose?: () => void;
}

export const MissionDetailSheetContent = ({
  view,
  theme,
  missions,
  onBack,
  onClose,
  ...sheet
}: MissionDetailSheetContentProps) => {
  const { dto, progress } = view;
  // 부제(기간)와 스탯(팝업=운영시간 / 축제=기간)은 **다른 값**이다 — 하나로 묶으면
  // 팝업 상세에서 운영시간이 두 번 나오고 날짜 기간이 사라진다 (D11)
  const period = missionDetailPeriod(theme, dto);
  const feed = missions.missionFeed;
  const videoCount = missions.detailVideoCount;

  return (
    <View className="flex-1 gap-sm">
      <SheetHeader
        title={view.title}
        badge={<MissionStatusBadge status={view.status} theme={theme} />}
        onBack={onBack}
        onClose={onClose}
      />

      <SheetScrollView {...sheet} resetKey={view.missionId}>
        {/* 히어로 전용 필드가 없어 목록 썸네일(`imageUrl`)을 겸용한다 (스펙 서버 계약 대조).
            null이면 Thumbnail 폴백 + 테마 색 배경 (Figma 오탐 방지 4) */}
        <Thumbnail
          src={dto.imageUrl ?? undefined}
          className={cx("h-50 w-full rounded-sm", THEME_BADGE_CLASS[theme])}
        />

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
            ? `${view.placeName} · ${period.subtitle}`
            : period.subtitle}
        </Text>

        <View
          className={cx("rounded-sm px-sm py-xs", THEME_BADGE_CLASS[theme])}
        >
          <Text className={cx("text-fm-body", THEME_TEXT_CLASS[theme])}>
            영역 안 아무 칸이나 {progress.total}칸 채우면 완료
          </Text>
        </View>

        <StatTrio
          items={[
            {
              label: "내 진행",
              value: missions.progressFailed
                ? "확인 불가"
                : `${progress.done}/${progress.total}칸`,
            },
            { label: period.statLabel, value: period.statValue },
            {
              label: "올라온 영상",
              value: videoCount === null ? "확인 불가" : `${videoCount}개`,
            },
          ]}
        />

        <View className="gap-xs">
          <View className="flex-row items-baseline gap-xs">
            <Text className="text-fm-title text-foreground">
              이 미션의 영상
            </Text>
            <Text className="text-fm-caption text-foreground-muted">
              {videoCount === null ? feed.items.length : videoCount}개 · 최신순
            </Text>
          </View>

          <FeedSection
            status={feed}
            items={feed.items}
            emptyText="아직 이 미션에 올라온 영상이 없어요"
            errorText="영상 목록을 불러오지 못했어요"
          />
        </View>
      </SheetScrollView>
    </View>
  );
};
