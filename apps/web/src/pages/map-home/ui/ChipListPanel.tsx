import type { ReactNode } from "react";
import { DotsLoader, RetryNotice, cn } from "@fillmap/ui-web";
import { THEME_META, type ThemeId } from "@/features/map-home/model/theme";
import { THEME_BADGE_CLASS } from "./theme-classes";
import { useEscapeClose } from "./use-escape-close";

interface ChipListPanelProps {
  theme: ThemeId;
  /** 헤더 개수 — 목록 길이 */
  count: number;
  isPending: boolean;
  isError: boolean;
  errorMessage: string;
  emptyMessage: string;
  onRetry: () => void;
  /**
   * 목록 위에 얹는 부분 실패 안내 (리뷰 반영) — 목록은 멀쩡한데 **부재료**만 실패한
   * 경우를 위한 자리다. `isError`로 뭉치면 목록 전체가 사라지고 메시지도 틀린다
   * (미션 목록은 왔는데 "목록을 불러오지 못했어요"가 뜬다).
   */
  notice?: ReactNode;
  /** 닫기 — Escape 배선. 칩 재클릭 닫힘은 스토어 연동이 담당 (AC 5) */
  onClose: () => void;
  /** 목록 본문 — 비어 있으면(count 0) 대신 emptyMessage가 뜬다 */
  children: ReactNode;
}

/**
 * 칩 목록 패널 공용 껍데기 (MSG-395 AC 13·20·25·26).
 * 헤더(칩 배지 + 개수)와 상태 4분기(실패·로딩·빈 목록·목록)는 지역축제/팝업스토어와
 * 경로추천이 글자만 다르고 완전히 같아 한 곳으로 모았다 (중복 검출 — 두 번째 사용처 규칙).
 * 카드 모양은 각자 다르므로 목록 본문만 children으로 받는다.
 */
export const ChipListPanel = ({
  theme,
  count,
  isPending,
  isError,
  errorMessage,
  emptyMessage,
  onRetry,
  notice,
  onClose,
  children,
}: ChipListPanelProps) => {
  useEscapeClose(onClose);

  // 요소가 전부 준비되기 전에는 도트 로더만 (MSG-403 후속 — 부분 렌더 금지).
  // 헤더의 "· N개"도 도착 전에는 0으로 거짓말하므로 함께 가린다
  if (isPending)
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <DotsLoader label="목록 불러오는 중" />
      </div>
    );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-md">
      <header className="flex items-center gap-xs">
        <span
          className={cn(
            "rounded-full px-xs py-0.5 text-fm-caption",
            THEME_BADGE_CLASS[theme],
          )}
        >
          {THEME_META[theme].label}
        </span>
        <span className="text-fm-caption text-foreground-muted">
          · {count}개
        </span>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* 부분 실패 안내는 목록을 가리지 않고 위에 얹는다 */}
        {!isError && notice}
        {isError ? (
          <RetryNotice message={errorMessage} onRetry={onRetry} />
        ) : count === 0 ? (
          <p className="text-fm-body text-foreground-muted">{emptyMessage}</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
};
