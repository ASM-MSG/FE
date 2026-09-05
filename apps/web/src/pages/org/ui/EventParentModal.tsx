import { useState } from "react";
import {
  Chip,
  DialogShell,
  Input,
  ModalCard,
  RetryNotice,
  Skeleton,
} from "@fillmap/ui-web";
import { useApprovedEventsQuery } from "@/features/event-submission/api/use-approved-events-query";
import { continueWithLabel } from "@/features/event-submission/model/submission-form";
import type { SubmissionParentOccurrence } from "@/features/event-submission/model/submission-wizard-store";
import { useDebouncedValue } from "@/shared/use-debounced-value";
import { EventParentList } from "./EventParentList";

const SEARCH_DEBOUNCE_MS = 300;

const NOTICE =
  "이벤트로 등록하면 선택한 이벤트 아래에 행사방이 열리고, 참여자 영상이 그 행사방으로 모입니다. 유형은 기본 정보 단계에서 바꿀 수 있어요.";

interface EventParentModalProps {
  open: boolean;
  /** 취소·✕·Esc — 유형 확정 없이 닫는다 (추정 3) */
  onClose: () => void;
  /** 확정 — 스토어 저장 + 기본 정보 스텝 진입은 호출부(스토어 액션)가 한다 */
  onConfirm: (parent: SubmissionParentOccurrence) => void;
  /** 이미 확정해 둔 소속 이벤트 — 스텝 1로 되돌아온 재선택에서 선택 상태를 복원한다 */
  initialOccurrenceId: number | null;
}

/**
 * 소속 이벤트 선택 모달 (AC 3·4·5 — Figma 15691:3611, 주석 15692:3684에서 페이지 이동
 * 대신 모달로 확정).
 * 시·도 칩과 건수 라벨은 서버 계약상 필터·검색과 무관한 고정값(totalCount·cityCounts)이라
 * 검색 중에도 흔들리지 않는다. 검색은 300ms 디바운스 후 서버 `name` 파라미터로 나간다.
 */
export const EventParentModal = ({
  open,
  onClose,
  onConfirm,
  initialOccurrenceId,
}: EventParentModalProps) => {
  const [city, setCity] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(
    initialOccurrenceId,
  );
  const { debounced } = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
  const {
    totalCount,
    cityCounts,
    events,
    isPending,
    isFetching,
    isError,
    retry,
  } = useApprovedEventsQuery({ city, name: debounced, enabled: open });

  const selected =
    events.find((event) => event.occurrenceId === selectedId) ?? null;
  const cityCount =
    cityCounts.find((entry) => entry.cityName === city)?.count ?? 0;
  const countLabel =
    city === null
      ? `전체 · 승인 이벤트 ${totalCount}건`
      : `${city} · 승인 이벤트 ${cityCount}건`;

  return (
    <DialogShell
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      srTitle="어떤 이벤트에 참여하나요?"
      scrollable
      maxWidthClassName="max-w-140"
    >
      <ModalCard
        title="어떤 이벤트에 참여하나요?"
        description="시·도를 고르면 그 지역에서 승인된 이벤트 목록이 나와요. 선택한 이벤트 아래에 행사방이 열립니다."
        onClose={onClose}
        cancelText="취소"
        confirmText={
          selected === null ? "이벤트 선택" : continueWithLabel(selected.name)
        }
        // 필터 재조회 중에는 확정 잠금 — keepPreviousData의 직전 목록으로
        // 새 필터 라벨 아래에서 확정되는 것을 막는다 (codex 리뷰 P2)
        confirmDisabled={selected === null || isFetching}
        onCancel={onClose}
        onConfirm={() => {
          if (selected === null) return;
          onConfirm({
            occurrenceId: selected.occurrenceId,
            name: selected.name,
          });
        }}
        className="max-w-none"
      >
        <div className="flex flex-col gap-sm">
          <p className="text-fm-label text-foreground-body">1 · 시·도 선택</p>
          <div className="flex flex-wrap gap-xs">
            {cityCounts.map((entry) => (
              <Chip
                key={entry.cityName}
                text={entry.cityName}
                active={city === entry.cityName}
                onClick={() => setCity(entry.cityName)}
              />
            ))}
            <Chip
              text="전체 보기"
              active={city === null}
              onClick={() => setCity(null)}
            />
          </div>

          <div className="flex items-center justify-between gap-sm">
            <p className="text-fm-label text-foreground-body">
              2 · 이벤트 선택
            </p>
            <p className="text-fm-caption text-foreground-muted">
              {countLabel}
            </p>
          </div>

          <Input
            aria-label="이벤트 이름으로 검색"
            placeholder="이벤트 이름으로 검색"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="border-border"
          />

          {isPending ? (
            <div className="flex flex-col gap-xs">
              <Skeleton className="h-14 w-full rounded-md" />
              <Skeleton className="h-14 w-full rounded-md" />
              <Skeleton className="h-14 w-full rounded-md" />
            </div>
          ) : isError ? (
            <RetryNotice
              message="이벤트 목록을 불러오지 못했어요"
              onRetry={retry}
            />
          ) : events.length === 0 ? (
            <p className="py-md text-fm-body text-foreground-muted">
              조건에 맞는 승인 이벤트가 없어요
            </p>
          ) : (
            <EventParentList
              events={events}
              selectedId={selectedId}
              disabled={isFetching}
              onSelect={(event) => setSelectedId(event.occurrenceId)}
            />
          )}

          <p className="rounded-md bg-surface p-sm text-fm-caption text-foreground-body">
            {NOTICE}
          </p>
        </div>
      </ModalCard>
    </DialogShell>
  );
};
