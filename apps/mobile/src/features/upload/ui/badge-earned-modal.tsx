import { useState } from "react";
import { Text, View } from "react-native";
import { Dots, ModalCard } from "@fillmap/ui-native";
import { BadgeArtView } from "../../../entities/badge/ui/badge-art-view";
import type { EarnedBadgeResponseDto } from "../../../shared/api/sdk";
import {
  BADGE_EARNED_COPY,
  describeBadgeCard,
  dotsLabel,
} from "../model/badge-earned";

/** 시안 메달 지름 112 — 뒤의 글로우 원 128은 클래스(`size-32`)로 */
const MEDAL_SIZE = 112;

interface BadgeEarnedModalProps {
  /** 확정 응답 `newBadges` — 비어 있으면 아무것도 렌더하지 않는다 (AC 3) */
  badges: readonly EarnedBadgeResponseDto[];
  /** [확인]·딤·하드웨어 뒤로가기 — 남은 장과 무관하게 모달 전체를 닫는다 (D10) */
  onClose: () => void;
}

/**
 * SOURCE: Figma "뱃지 획득 모달 — 1개"(1:3) · "여러 개 (1/3)"(1:40) — MSG-617.
 * 업로드 완료 오버레이 위에 뜨는 축하 모달. `ModalCard` 셸을 그대로 쓴다(D9): 확인 슬롯이
 * 곧 전체 폭 주 버튼 1개([다음]→마지막 [확인])이고, `onCancel`은 `cancelText` 없이 넘겨
 * `onRequestClose`(하드웨어 뒤로가기)에만 배선된다. 내비는 없다 — 도감 이동 버튼은
 * 사용자 결정으로 두지 않는다(2026-10-03).
 *
 * 시안의 "새 뱃지 획득"은 셸 헤더가 아니라 children 첫 요소의 **가운데 pill**이다 — `title`을
 * 생략해 ModalCard 헤더 행을 비운다(MSG-617에서 title 선택화). 아트는 도감과 같은
 * `BadgeArtView` 4분기이며 장식이라 낭독하지 않는다(AC 13).
 */
export const BadgeEarnedModal = ({
  badges,
  onClose,
}: BadgeEarnedModalProps) => {
  const [index, setIndex] = useState(0);
  const card = describeBadgeCard(badges, index);
  if (card === null) return null;

  const { badge, total, isLast, primaryLabel } = card;

  return (
    <ModalCard
      confirmText={primaryLabel}
      onConfirm={isLast ? onClose : () => setIndex((i) => i + 1)}
      onCancel={onClose}
      onOverlayPress={onClose}
      className="px-6 pb-6"
    >
      <View className="items-center gap-md">
        {/* 상단 라벨 pill (시안 eyebrow) — 12 Semi Bold, 패딩 4/10 */}
        <View className="rounded-full bg-primary/10 px-2.5 py-1">
          <Text className="text-fm-label font-semibold text-primary">
            {BADGE_EARNED_COPY.title}
          </Text>
        </View>
        {/* 글로우 128 + 메달 112 (시안 medal-wrap) — 장식, 접근성 노드 없음 */}
        <View
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          className="size-32 items-center justify-center rounded-full bg-primary/10"
        >
          <BadgeArtView
            code={badge.code}
            iconUrl={badge.iconUrl}
            size={MEDAL_SIZE}
          />
        </View>
        <Text className="text-center text-fm-display text-foreground">
          {badge.name}
        </Text>
        {/* 설명 null이면 줄 자체를 생략한다 — 빈 Text 없음 (AC 4) */}
        {badge.description !== null && (
          <Text className="text-center text-fm-body text-foreground-body">
            {badge.description}
          </Text>
        )}
        {total > 1 && (
          <View
            accessible
            accessibilityLabel={dotsLabel(index, total)}
            accessibilityLiveRegion="polite"
          >
            <Dots count={total} activeIndex={index} activeShape="pill" />
          </View>
        )}
      </View>
    </ModalCard>
  );
};
