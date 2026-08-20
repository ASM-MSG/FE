import { Pressable, Text, View } from "react-native";
import { Thumbnail, cx } from "@fillmap/ui-native";
import {
  formatMissionPeriod,
  formatOperationTime,
} from "../model/mission-format";
import type { MissionView } from "../model/mission-view";
import type { ThemeId } from "../model/themes";
import { MissionStatusBadge } from "./mission-status-badge";
import { THEME_BADGE_CLASS, THEME_TEXT_CLASS } from "./theme-classes";

/**
 * 지역축제·팝업스토어 목록 카드 (MSG-427 D4·D8·D-14) — Figma 실측:
 * 축제 348×87(가로 74×56 썸네일) / 팝업 348×98(**세로 56×74 포스터**).
 * 보조 문구도 갈린다 — 축제는 기간(`8.11~8.16`), 팝업은 운영시간(`매일 11:00~22:00`).
 * 그 둘 말고는 같은 카드라 한 컴포넌트로 둔다.
 *
 * **영상 수 배지를 넣지 않는다** (D-14, 승인 Q1): `/missions/active` 응답에 `videoCount`가
 * 없고, 미션당 상세 호출은 비현실적이며(팝업 목록 수십 건), 웹의 목 해시 포팅은 이 티켓의
 * mock 금지 조항(F1) 위반이다. 실수치는 상세 시트가 보여준다.
 */
interface MissionCardProps {
  view: MissionView;
  /** 소속 칩 — 축제와 팝업이 같은 카드를 색·썸네일 비율·보조 문구만 달리 쓴다 */
  theme: Extract<ThemeId, "festival" | "popup">;
  onSelect: (missionId: number) => void;
}

export const MissionCard = ({ view, theme, onSelect }: MissionCardProps) => {
  const { dto, progress, status } = view;
  const subtitle =
    theme === "popup"
      ? formatOperationTime(dto.operationTime)
      : formatMissionPeriod(dto.startAt, dto.endAt);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={view.title}
      onPress={() => onSelect(view.missionId)}
      className="flex-row items-start gap-3 rounded-md bg-background p-3 shadow-raised active:opacity-80"
    >
      {/* 대표 이미지가 없으면 테마 색 블록 — 빈 회색 박스보다 카드 정체성을 지킨다 (D4).
          Thumbnail은 src가 없거나 로드 실패면 폴백 상태로 떨어진다 */}
      <Thumbnail
        src={dto.imageUrl ?? undefined}
        className={cx(
          theme === "popup" ? "h-18.5 w-14" : "h-14 w-18.5",
          "rounded-xs",
          THEME_BADGE_CLASS[theme],
        )}
      />

      <View className="flex-1 gap-1.75">
        <View className="flex-row items-start gap-xs">
          <Text
            numberOfLines={1}
            className="flex-1 text-fm-body-strong text-foreground"
          >
            {view.title}
          </Text>
          <MissionStatusBadge status={status} theme={theme} />
        </View>

        <Text numberOfLines={1} className="text-fm-label text-foreground-muted">
          {view.placeName ? `${view.placeName} · ${subtitle}` : subtitle}
        </Text>

        {/* 진행도 실패를 여기서 받지 않는다 (웹과 같은 판단): 실패하면 completed가 false로
            폴백해 "방문 완료"는 잘못 뜨지 않고, 남는 `N칸 채우면 완료`는 진행도와 무관한
            미션 규칙(targetCount) 문장이라 거짓이 아니다. 코스 카드는 다르다 — 거기는
            `0/N곳`이라는 **수치**를 주장한다 */}
        <Text
          numberOfLines={1}
          className={cx(
            "text-fm-label",
            progress.completed
              ? THEME_TEXT_CLASS[theme]
              : "text-foreground-muted",
          )}
        >
          {progress.completed ? "방문 완료" : `${progress.total}칸 채우면 완료`}
        </Text>
      </View>
    </Pressable>
  );
};
