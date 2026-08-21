import { useMemo, useRef } from "react";
import { ScrollView, Text, View } from "react-native";
import { typography } from "@fillmap/design-tokens";
import {
  deriveMonthLabels,
  grassLevel,
  type GrassWeek,
} from "../model/upload-grass";

interface UploadGrassGridProps {
  /** buildGrassWeeks 파생 격자 — 열=주(일요일 시작), 미래 셀은 null(자리 없음) */
  weeks: GrassWeek[];
  /**
   * 격자를 가로 스크롤로 감쌀지 — 24주(285px)는 카드 내폭에 들어가 스크롤이 필요 없고,
   * 53주(633px)는 필수다 (S8·S10). 셀 규격은 두 경우가 같다(승인 — 시안의 축소 셀은 미채택).
   */
  scrollable?: boolean;
  /** 스크린리더 요약 — 메타 줄과 동등 정보(격자 자체는 시각 장식이다) */
  a11ySummary: string;
}

/** 셀 9px(size-2.25) + 간격 3px(gap-0.75) = stride 12px — 라벨 위치 산출(동적 값이라 style 경유) */
const CELL_SIZE = 9;
const CELL_STRIDE = 12;

/** 월 라벨 행 높이(h-3.5) — 격자 첫 행의 상단 오프셋이자 요일 라벨 정렬 기준 */
const MONTH_ROW_HEIGHT = 14;

/**
 * 요일 라벨의 top — 라벨 줄상자(캡션 lineHeight)의 중앙을 해당 격자 행 중앙에 맞춘다.
 * 셀 높이(9px) View로 감싸 "글자는 넘치게 두는" 방식은 Android 기본 클립에서 성립하지
 * 않아 글리프 하단이 잘렸다 (MSG-430 F2) — 높이 제약 없는 절대 배치로 바꿨다.
 */
const weekdayLabelTop = (row: number): number =>
  MONTH_ROW_HEIGHT +
  row * CELL_STRIDE +
  (CELL_SIZE - typography.caption.lineHeight) / 2;

/** 레벨→색 — lv0~3은 design-tokens 잔디 램프, lv4는 primary. 임의 hex 금지 (S14) */
const LEVEL_CLASSES = [
  "bg-grass-0",
  "bg-grass-1",
  "bg-grass-2",
  "bg-grass-3",
  "bg-primary",
] as const;

/** 좌측 요일 라벨 — 행 0=일요일 기준, 월/수/금(행 1·3·5)만 표기한다 */
const WEEKDAY_LABELS = [
  { row: 1, label: "월" },
  { row: 3, label: "수" },
  { row: 5, label: "금" },
] as const;

/**
 * SOURCE: Figma "개인 도감 — 기록 탭"(node 14799:26454) · "기록 전체 보기"(node 14857:404)
 * — MSG-430 S8·S10. 웹 `pages/dex/ui/UploadGrassGrid.tsx` 미러.
 * 월 라벨 + 요일 라벨 + 주×7 격자 + 범례("적음~많음")로 이뤄진 잔디 카드.
 *
 * 웹과의 차이: 웹은 `lg`(1년)에서 셀을 12px로 키웠지만 모바일은 폭이 없어 **셀 규격을
 * 통일하고 1년만 가로 스크롤**로 처리한다(승인 A8 — 초기 위치는 오른쪽 끝/오늘).
 * 세로 스크롤(화면) 안의 가로 스크롤이라 축이 직교해 제스처 충돌이 없다.
 */
export const UploadGrassGrid = ({
  weeks,
  scrollable = false,
  a11ySummary,
}: UploadGrassGridProps) => {
  const monthLabels = useMemo(() => deriveMonthLabels(weeks), [weeks]);
  const scrollRef = useRef<ScrollView>(null);
  // 첫 렌더 1회만 오늘(오른쪽 끝)로 보낸다 — 이후 사용자가 되감아 둔 위치를 뺏지 않는다
  const didInitialScroll = useRef(false);

  const grid = (
    <View>
      {/* 월 라벨 행 — 실제 월 경계 기준 배치(시안의 4주 균등 배치는 플레이스홀더) */}
      <View className="h-3.5">
        {monthLabels.map(({ weekIndex, label }) => (
          <Text
            key={weekIndex}
            className="absolute top-0 text-fm-caption text-foreground-muted"
            style={{ left: weekIndex * CELL_STRIDE }}
          >
            {label}
          </Text>
        ))}
      </View>
      {/* 격자 — 미래 셀(null)은 렌더하지 않는다(자리 없음) */}
      <View className="flex-row gap-0.75">
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} className="gap-0.75">
            {week.map((day, row) =>
              day === null ? null : (
                <View
                  key={row}
                  className={`size-2.25 rounded-[2px] ${LEVEL_CLASSES[grassLevel(day.count)]}`}
                />
              ),
            )}
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View
      accessible
      accessibilityLabel={a11ySummary}
      className="rounded-md bg-surface-soft p-sm"
    >
      <View className="flex-row gap-xs">
        {/* 요일 라벨 열 — 각 라벨을 대응 격자 행 중앙에 절대 배치한다(높이 제약 없음).
            열 자체는 형제(격자)에 맞춰 늘어나므로 라벨이 잘릴 여지가 없다 */}
        <View className="w-3.5">
          {WEEKDAY_LABELS.map(({ row, label }) => (
            <Text
              key={label}
              className="absolute text-fm-caption text-foreground-muted"
              style={{ top: weekdayLabelTop(row) }}
            >
              {label}
            </Text>
          ))}
        </View>
        <View className="min-w-0 flex-1">
          {scrollable ? (
            <ScrollView
              ref={scrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              onContentSizeChange={() => {
                if (didInitialScroll.current) return;
                didInitialScroll.current = true;
                scrollRef.current?.scrollToEnd({ animated: false });
              }}
            >
              {grid}
            </ScrollView>
          ) : (
            grid
          )}
          {/* 범례 — 적음 → 많음 5단 스와치 */}
          <View className="mt-xs flex-row items-center justify-end gap-0.75">
            <Text className="mr-xxs text-fm-caption text-foreground-muted">
              적음
            </Text>
            {LEVEL_CLASSES.map((levelClass) => (
              <View
                key={levelClass}
                className={`size-2.25 rounded-[2px] ${levelClass}`}
              />
            ))}
            <Text className="ml-xxs text-fm-caption text-foreground-muted">
              많음
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};
