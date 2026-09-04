import type { ReactNode } from "react";
import { RetryNotice, Skeleton } from "@fillmap/ui-web";
import type { QueuePillView } from "@/features/admin-accounts/model/account-view";
import { AccountPills } from "./AccountPills";

interface QueueSectionLayoutProps<TStatus extends string> {
  /** 구획 헤더 — Figma 화면별 제목이 h2로 들어간다 (페이지 h1은 "계정 운영") */
  title: string;
  description: string;
  pills: {
    label: string;
    views: QueuePillView<TStatus>[];
    active: TStatus;
    onSelect: (status: TStatus) => void;
  };
  list: {
    title: string;
    /** 조회 실패 안내 (AC 14) */
    errorMessage: string;
    /** 빈 목록 안내 (AC 14) */
    emptyMessage: string;
    isError: boolean;
    isLoading: boolean;
    isEmpty: boolean;
    onRetry: () => void;
    /** 1페이지 초과분 고지 — 없으면 null (codex P2) */
    truncationNotice: string | null;
    /** 목록 테이블 — 상태 분기를 통과했을 때만 렌더된다 */
    children: ReactNode;
  };
  /** 우측 선택 상세 카드 */
  detail: ReactNode;
}

/**
 * 요청 큐 구획 레이아웃 (MSG-551 AC 11·13·14) — 발급 요청 큐와 아이디 변경 큐가
 * 같은 골격(헤더 + 상태 pill + 목록 카드 + 우측 상세)을 쓴다.
 *
 * **프레젠테이셔널 전용**이다 — 상태·쿼리·뮤테이션은 각 구획이 소유한다(두 큐는 검토
 * 기준 시각 키·상세 출처·안내 문구가 갈린다). 같은 JSX 골격이 이 티켓 안에서 두 번째로
 * 필요해져 추출했다(check:duplication 신규 카피 차단 — 두 번째 사용처 규칙).
 *
 * 로딩은 테이블 자리 한 덩어리다 — 행 수를 모르는 로딩에서 행 모양을 흉내내지 않는다.
 */
export const QueueSectionLayout = <TStatus extends string>({
  title,
  description,
  pills,
  list,
  detail,
}: QueueSectionLayoutProps<TStatus>) => (
  <div className="flex flex-col gap-lg">
    <header className="flex flex-col gap-xxs">
      <h2 className="text-fm-heading text-foreground">{title}</h2>
      <p className="text-fm-body text-foreground-muted">{description}</p>
    </header>

    <AccountPills
      label={pills.label}
      views={pills.views}
      active={pills.active}
      onSelect={pills.onSelect}
    />

    <div className="flex flex-1 items-start gap-lg">
      <section className="flex min-w-0 flex-1 flex-col gap-md rounded-md bg-background p-lg shadow-raised">
        <h3 className="text-fm-title text-foreground">{list.title}</h3>
        {list.isError ? (
          <RetryNotice message={list.errorMessage} onRetry={list.onRetry} />
        ) : list.isLoading ? (
          <Skeleton className="h-50 w-full rounded-sm" />
        ) : list.isEmpty ? (
          <p className="text-fm-body text-foreground-muted">
            {list.emptyMessage}
          </p>
        ) : (
          <>
            {list.children}
            {list.truncationNotice !== null && (
              <p className="text-fm-caption text-foreground-muted">
                {list.truncationNotice}
              </p>
            )}
          </>
        )}
      </section>

      {detail}
    </div>
  </div>
);
