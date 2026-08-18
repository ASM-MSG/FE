import { useMemo, useState } from "react";
import type { UploadHistoryDay } from "@/entities/dex";
import {
  GRASS_TAB_WEEKS,
  buildGrassWeeks,
  deriveGrassSummary,
  todayKstDate,
} from "@/features/dex/model/upload-grass";
import { UploadGrassGrid } from "./UploadGrassGrid";
import { UploadHistoryModal } from "./UploadHistoryModal";

interface RecordTabBodyProps {
  /** 전체 업로드 이력(희소) — `GET /api/collections/upload-history` (AC 3) */
  history: UploadHistoryDay[];
}

/**
 * "기록" 탭 본문 (MSG-414 AC 7, Figma 14783:3425) — 섹션 헤더("업로드 기록" +
 * "전체 보기 ›") + 메타 라인("최근 24주 · N일 업로드 · 최장 연속 M일") + 24주 잔디 카드.
 * 수치는 실데이터 파생(시안 48일·12일은 플레이스홀더)이고, 메타의 "최장 연속"은 창 내
 * 최장 스트릭이라 상단 카드의 currentStreak(현재 진행 중)와 다른 지표다 — 값 상이가 정상.
 * "전체 보기"는 1년 모달을 로컬 상태로 연다 — URL 불변 (AC 9).
 */
export const RecordTabBody = ({ history }: RecordTabBodyProps) => {
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  // KST "오늘" — 렌더마다 재계산. 마운트 고정이면 탭을 켜 둔 채 KST 자정을 넘긴 뒤
  // 도착한 새 날짜 이력이 미래로 걸러져 스테일 (codex P2). 값이 문자열이라 자정을
  // 넘기는 렌더(데이터 도착 포함)에서만 아래 memo가 재파생된다
  const todayKst = todayKstDate();
  const weeks = useMemo(
    () => buildGrassWeeks(history, todayKst, GRASS_TAB_WEEKS),
    [history, todayKst],
  );
  const summary = useMemo(
    () => deriveGrassSummary(history, todayKst, GRASS_TAB_WEEKS),
    [history, todayKst],
  );
  const meta = `최근 ${GRASS_TAB_WEEKS}주 · ${summary.uploadDayCount}일 업로드 · 최장 연속 ${summary.longestStreak}일`;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-sm overflow-y-auto px-md pb-md">
      <div className="flex items-center justify-between">
        <h2 className="text-fm-title text-foreground">업로드 기록</h2>
        <button
          type="button"
          className="text-fm-body text-primary"
          onClick={() => setHistoryModalOpen(true)}
        >
          전체 보기 ›
        </button>
      </div>
      <p className="text-fm-caption text-foreground-muted">{meta}</p>
      <UploadGrassGrid
        weeks={weeks}
        size="sm"
        srSummary={`업로드 잔디: ${meta}`}
      />
      <UploadHistoryModal
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
        history={history}
        todayKst={todayKst}
      />
    </div>
  );
};
