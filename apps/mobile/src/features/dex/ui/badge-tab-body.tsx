import { useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { Button } from "@fillmap/ui-native";
import type { DexBadge } from "../../../entities/dex/model/dex";
import { MOCK_PROFILE } from "../../../entities/profile/model/mock-profile";
import { useProfileQuery } from "../../profile/api/use-profile-query";
import { useReplaceFeaturedBadges } from "../api/use-badge-mutations";
import { BADGE_PREVIEW_LIMIT, orderBadges } from "../model/badge-showcase";
import {
  featuredRankOf,
  initialFeaturedSelection,
  toggleFeatured,
} from "../model/featured-selection";
import { useBadgesQuery } from "../model/use-collection-query";
import { BadgeMedal } from "./badge-medal";
import { DexErrorState } from "./dex-error-state";
import { DexTabLoading } from "./dex-tab-loading";
import { FeaturedProfilePreview } from "./featured-profile-preview";

/** 4열 그리드 한 칸 — RN에는 grid가 없어 flex-wrap + 1/4 폭으로 열을 고정한다 */
const BadgeCell = ({ children }: { children: ReactNode }) => (
  <View className="w-1/4 items-center">{children}</View>
);

/**
 * SOURCE: Figma "개인 도감 — 뱃지 탭"(node 14799:26410) · "대표 뱃지 지정"(node 14799:25586)
 * — MSG-430 S1~S7·S12. 웹 `pages/dex/ui/BadgeTabBody.tsx` 미러.
 *
 * 진열장(제목 + 텍스트 버튼 2개 + 4열 메달 그리드 + "뱃지 전체 보기")과 편집 모드
 * (제목/"완료" + 안내 문구 + 전체 카탈로그 그리드 + 프로필 미리보기 + "대표 뱃지 저장")
 * 두 분기를 갖는다. 표시 순서는 `orderBadges` — 대표(순번 1·2) → 최근 획득순 → 미획득.
 *
 * 셸(`dex-screen`)이 ScrollView 하나를 소유하므로 **내부 스크롤 컨테이너를 두지 않는다** —
 * 확장분·편집 모드 전체 카탈로그는 페이지 스크롤이 흡수한다(웹은 그리드만 패널 안에서
 * 스크롤했다 — 의도된 차이).
 *
 * 편집 모드는 컴포넌트 로컬 상태다(URL 무변경). 선택은 badgeId 배열이고 배열 순서가 곧
 * 순번이자 PUT 순서라 낙관적 캐시 갱신·롤백 개념이 없다 — 미리보기는 로컬 selection이
 * 그리고, 재정렬은 저장 성공의 invalidate가 만든다 (S6).
 */
export const BadgeTabBody = () => {
  const badgesQuery = useBadgesQuery();
  const profile = useProfileQuery();
  // 조회 전·실패 시 mock 폴백 — 미리보기 카드가 프로필 조회에 잠기지 않는다 (프로필 화면 선례)
  const identity = profile.data ?? MOCK_PROFILE;

  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  /** 편집 모드 선택 — badgeId 배열, 순서 = 순번(1·2) = PUT badgeIds 순서 */
  const [selection, setSelection] = useState<number[]>([]);
  const save = useReplaceFeaturedBadges({ onSaved: () => setEditing(false) });

  if (badgesQuery.isError) {
    return (
      <DexErrorState
        title="뱃지를 불러오지 못했어요"
        onRetry={() => void badgesQuery.refetch()}
      />
    );
  }
  if (!badgesQuery.data) {
    return <DexTabLoading />;
  }

  const badges: DexBadge[] = badgesQuery.data;
  const ordered = orderBadges(badges);
  const shown = expanded ? ordered : ordered.slice(0, BADGE_PREVIEW_LIMIT);
  // 카탈로그가 프리뷰 이하면 확장할 것이 없어 두 진입점을 애초에 렌더하지 않는다 (S2)
  const showExpand = ordered.length > BADGE_PREVIEW_LIMIT && !expanded;

  const enterEdit = () => {
    setSelection(initialFeaturedSelection(badges));
    save.reset(); // 이전 편집의 실패 안내 잔상 제거
    setEditing(true);
  };

  if (editing) {
    const selectedBadges = selection.flatMap((id) => {
      const name = badges.find((badge) => badge.badgeId === id)?.name;
      return name === undefined ? [] : [{ id, name }];
    });

    return (
      <View className="gap-sm">
        <View className="flex-row items-center justify-between">
          <Text className="text-fm-title text-foreground">대표 뱃지 지정</Text>
          {/* 저장 pending 중 비활성 — 이탈 후 재진입한 새 편집 세션을 늦은 onSaved가
              닫는 레이스 차단 (승인 A6) */}
          <Pressable
            accessibilityRole="button"
            disabled={save.isPending}
            onPress={() => setEditing(false)}
            style={save.isPending ? { opacity: 0.6 } : undefined}
          >
            <Text className="text-fm-body text-primary">완료</Text>
          </Pressable>
        </View>
        <Text className="text-fm-body text-foreground-muted">
          최대 2개까지 골라 프로필에 노출해요. 다시 누르면 해제됩니다.
        </Text>
        {/* pt-1 — 첫 행 선택 링·마크(-top-1)가 잘리지 않게 (웹 미러) */}
        <View className="flex-row flex-wrap gap-y-md pt-1">
          {ordered.map((badge) => (
            <BadgeCell key={badge.badgeId}>
              <BadgeMedal
                badge={badge}
                editing={{
                  rank: featuredRankOf(selection, badge.badgeId),
                  onToggle: () =>
                    setSelection((current) => toggleFeatured(current, badge)),
                }}
              />
            </BadgeCell>
          ))}
        </View>
        <FeaturedProfilePreview
          nickname={identity.nickname}
          profileImageUrl={identity.profileImageUrl}
          badges={selectedBadges}
        />
        {save.isError && (
          <Text accessibilityRole="alert" className="text-fm-label text-error">
            저장에 실패했어요. 잠시 후 다시 시도해 주세요.
          </Text>
        )}
        <Button
          text="대표 뱃지 저장"
          variant="primary"
          size="lg"
          shape="pill"
          className="w-full"
          disabled={save.isPending}
          onPress={() => save.mutate(selection)}
        />
      </View>
    );
  }

  return (
    <View className="gap-sm">
      <View className="flex-row items-center justify-between">
        <Text className="text-fm-title text-foreground">뱃지 진열장</Text>
        <View className="flex-row items-center gap-sm">
          <Pressable accessibilityRole="button" onPress={enterEdit}>
            <Text className="text-fm-body text-primary">대표 뱃지 지정</Text>
          </Pressable>
          {showExpand && (
            <Pressable
              accessibilityRole="button"
              onPress={() => setExpanded(true)}
            >
              <Text className="text-fm-body text-primary">전체 보기</Text>
            </Pressable>
          )}
        </View>
      </View>
      <View className="flex-row flex-wrap gap-y-md">
        {shown.map((badge) => (
          <BadgeCell key={badge.badgeId}>
            <BadgeMedal badge={badge} />
          </BadgeCell>
        ))}
      </View>
      {showExpand && (
        <Button
          text="뱃지 전체 보기"
          variant="primary"
          size="lg"
          shape="pill"
          className="w-full"
          onPress={() => setExpanded(true)}
        />
      )}
    </View>
  );
};
