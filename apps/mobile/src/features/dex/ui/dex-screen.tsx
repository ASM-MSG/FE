import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import { AppHeader, Button, Chip } from "@fillmap/ui-native";
import { AppBottomNav } from "../../../widgets/bottom-nav/app-bottom-nav";
import {
  formatBadgeCount,
  formatCollectionRate,
  formatStreak,
  formatVideoCount,
  formatVisitSummary,
} from "../model/collection-format";
import {
  DEFAULT_DEX_TAB,
  DEX_TAB_ITEMS,
  selectDexTab,
  type DexTab,
} from "../model/dex-tab";
import {
  MOCK_COLLECTION_SUMMARY,
  MOCK_VISIT_RECORDS,
} from "../model/mock-collection";

/** 스탯 카드 1칸 — 라벨(캡션) 위, 값(타이틀) 아래 (AC 6) */
const StatItem = ({ label, value }: { label: string; value: string }) => (
  <View className="flex-1 gap-xxs">
    <Text className="text-fm-caption text-foreground-muted">{label}</Text>
    <Text className="text-fm-title text-foreground">{value}</Text>
  </View>
);

/**
 * SOURCE: Figma "개인 도감 — 지도 탭" (node 14094:4734, 2026-08-05 개정판) — MSG-299.
 * 헤더 + 스탯 카드 + [지도|뱃지] 전환 칩 + 지도 탭 콘텐츠(지도 프리뷰 플레이스홀더·
 * 지역별 방문 기록) 조립. mock 데이터 기반 UI만 — 행 라우팅(MSG-300)·뱃지 진열장
 * (MSG-301)·API 연동 제외 범위. 칩 상태는 화면 로컬·비영속 (추정 5).
 * 시안의 "Image" 라벨은 플레이스홀더라 넣지 않는다 (추정 1, 오탐 방지 1).
 */
export const DexScreen = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [tab, setTab] = useState<DexTab>(DEFAULT_DEX_TAB);
  const summary = MOCK_COLLECTION_SUMMARY;

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <AppHeader title="개인 도감" />
      <ScrollView className="flex-1">
        <View className="px-5 pb-lg pt-md">
          {/* 내 도감 — 스탯 카드 3항목 (AC 6) */}
          <Text className="text-fm-title text-foreground">내 도감</Text>
          <View className="mt-sm rounded-md border border-border bg-surface-soft p-md">
            <View className="flex-row gap-sm">
              <StatItem label="수집률" value={formatCollectionRate(summary)} />
              <StatItem
                label="현재 스트릭"
                value={formatStreak(summary.streakDays)}
              />
              <StatItem
                label="획득 뱃지"
                value={formatBadgeCount(summary.badgeCount)}
              />
            </View>
            {/* 스트릭 전체 기록 화면은 제외 범위 — 탭 무동작이라 button 역할을
                부여하지 않는다 (스펙 리스크 권장 — 방문 기록 행과 동일 원칙) */}
            <Text className="mt-sm text-fm-body text-foreground underline">
              스트릭 전체 기록 보기
            </Text>
          </View>

          {/* [지도|뱃지] 전환 칩 (AC 1·11·12) — 활성 칩 Check 아이콘은 Chip 계약 (오탐 방지 2) */}
          <View className="mt-md flex-row gap-xs">
            {DEX_TAB_ITEMS.map(({ key, label }) => (
              <Chip
                key={key}
                text={label}
                active={tab === key}
                onPress={() => setTab((current) => selectDexTab(current, key))}
                // 비활성 칩은 배경(white) 위라 윤곽이 없어 테두리만 보강
                className={tab === key ? undefined : "border border-border"}
              />
            ))}
          </View>

          {tab === "map" ? (
            <>
              {/* 내 지도 (AC 7·8) — 실지도 렌더링 제외 범위, 라벨 없는 dashed 플레이스홀더 (추정 1) */}
              <Text className="mt-md text-fm-title text-foreground">
                내 지도
              </Text>
              <View className="mt-sm h-40 rounded-md border border-dashed border-border bg-surface" />
              <Button
                text="지도 전체 보기"
                variant="primary"
                size="lg"
                shape="pill"
                className="mt-md w-full"
                onPress={() => router.navigate("/home")}
              />

              {/* 지역별 방문 기록 (AC 9) — 행은 지역 갤러리(MSG-300) 진입점 예정이라
                  셰브런으로 표시만 하고, 탭 무동작이므로 View로 둔다 (스펙 리스크 권장) */}
              <Text className="mt-lg text-fm-title text-foreground">
                지역별 방문 기록
              </Text>
              <View className="mt-sm gap-sm">
                {MOCK_VISIT_RECORDS.map((record) => (
                  <View
                    key={record.regionName}
                    className="flex-row items-center gap-sm rounded-md border border-border bg-surface-soft px-md py-sm"
                  >
                    <View className="flex-1 gap-xxs">
                      <Text className="text-fm-body-strong text-foreground">
                        {record.regionName}
                      </Text>
                      <Text className="text-fm-body text-foreground-muted">
                        {formatVisitSummary(record)}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-xxs">
                      <Text className="text-fm-body text-foreground-muted">
                        {formatVideoCount(record.videoCount)}
                      </Text>
                      <ChevronRight size={14} color={semantic.muted} />
                    </View>
                  </View>
                ))}
              </View>

              {/* 전체 갤러리 화면은 후속 티켓 — 탭 무동작 텍스트 링크 (AC 10),
                  콘텐츠 패딩 내 좌측 정렬 (시안 클리핑은 배치 흠 — 오탐 방지 4) */}
              <Text className="mt-md text-fm-body text-foreground underline">
                갤러리 전체 보기
              </Text>
            </>
          ) : (
            <>
              {/* 뱃지 진열장 콘텐츠는 MSG-301 — 그 전까지 빈 상태 플레이스홀더 (추정 2, AC 11) */}
              <Text className="mt-md text-fm-title text-foreground">
                뱃지 진열장
              </Text>
              <Text className="mt-sm text-fm-body text-foreground-muted">
                뱃지 진열장을 준비 중이에요
              </Text>
            </>
          )}
        </View>
      </ScrollView>
      <AppBottomNav />
    </View>
  );
};
