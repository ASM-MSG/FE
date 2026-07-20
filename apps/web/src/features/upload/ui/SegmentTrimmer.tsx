import {
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useRef,
} from "react";
import { cn } from "@fillmap/ui-web";
import {
  adjustEndHandle,
  adjustStartHandle,
  formatTimecode,
  moveSegment,
  type Segment,
} from "@/features/upload/model/highlight-selection";

interface SegmentTrimmerProps {
  /** 영상 전체 길이(초) — 트랙 = 0~duration */
  duration: number;
  /** 현재 구간 */
  segment: Segment;
  /** 직접 지정이 선택 상태인지 — 밴드 강조에 사용 */
  selected: boolean;
  /** 재생 위치(초) — 표시하지 않으려면 null */
  playhead: number | null;
  /** 구간 변경 통보 (드래그마다) */
  onChange: (segment: Segment) => void;
}

type DragMode = "start" | "end" | "band";

const pct = (value: number, duration: number) =>
  duration > 0 ? (value / duration) * 100 : 0;

/** 트랙 요소 좌표 → 시각(초). ref가 아닌 이벤트의 currentTarget(=트랙)을 측정한다. */
const secFromTrack = (
  track: HTMLElement,
  clientX: number,
  duration: number,
): number => {
  const rect = track.getBoundingClientRect();
  if (rect.width === 0) return 0;
  return ((clientX - rect.left) / rect.width) * duration;
};

/**
 * 직접 구간 지정 트리머 — 트랙 = 영상 전체, 양끝 핸들 + 밴드 이동 + playhead + 실시간 라벨. [S7]
 * 모든 포인터 상호작용을 트랙에 직접 바인딩해 currentTarget(=트랙)으로 좌표를 측정한다.
 * 이동 범위 clamp(5~30초·경계)는 전부 순수 함수에 위임한다(L2·L3·L4).
 * 프레임 썸네일은 범위 밖 — 트랙 배경은 균일 톤 placeholder(플랜 참조).
 */
export const SegmentTrimmer = ({
  duration,
  segment,
  selected,
  playhead,
  onChange,
}: SegmentTrimmerProps) => {
  // pointerdown 시점의 드래그 모드·기준값 (이벤트 핸들러 안에서만 접근 — 렌더 중 접근 아님)
  const dragRef = useRef<{
    mode: DragMode;
    pointerSec: number;
    origin: Segment;
  } | null>(null);

  // 핸들 근처 grab 허용 오차 — 트랙 폭의 4%를 초로 환산
  const grabTolerance = duration * 0.04;

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const sec = secFromTrack(event.currentTarget, event.clientX, duration);
    const distStart = Math.abs(sec - segment.start);
    const distEnd = Math.abs(sec - segment.end);

    let mode: DragMode;
    if (distStart <= grabTolerance && distStart <= distEnd) {
      mode = "start";
    } else if (distEnd <= grabTolerance) {
      mode = "end";
    } else if (sec > segment.start && sec < segment.end) {
      mode = "band";
    } else {
      mode = distStart < distEnd ? "start" : "end";
    }

    dragRef.current = { mode, pointerSec: sec, origin: segment };
    event.currentTarget.setPointerCapture(event.pointerId);

    // 핸들을 바로 집으면 그 지점으로 즉시 이동(밴드는 이동 없이 잡기만)
    if (mode === "start") onChange(adjustStartHandle(segment, sec));
    else if (mode === "end") onChange(adjustEndHandle(segment, sec, duration));
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const sec = secFromTrack(event.currentTarget, event.clientX, duration);
    if (drag.mode === "start") {
      onChange(adjustStartHandle(segment, sec));
    } else if (drag.mode === "end") {
      onChange(adjustEndHandle(segment, sec, duration));
    } else {
      onChange(moveSegment(drag.origin, sec - drag.pointerSec, duration));
    }
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  // 키보드 1초 이동(접근성) — 경계 clamp 동일 적용. ref 접근 없음.
  const handleStartKey = (event: ReactKeyboardEvent) => {
    const step =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    onChange(adjustStartHandle(segment, segment.start + step));
  };

  const handleEndKey = (event: ReactKeyboardEvent) => {
    const step =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    onChange(adjustEndHandle(segment, segment.end + step, duration));
  };

  const length = segment.end - segment.start;

  return (
    <div className="flex w-full flex-col gap-xs">
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative h-12 w-full cursor-pointer touch-none select-none overflow-hidden rounded-md bg-muted"
      >
        {/* 선택 구간 밴드 */}
        <div
          className={cn(
            "pointer-events-none absolute inset-y-0",
            selected ? "bg-primary/25" : "bg-primary/15",
          )}
          style={{
            left: `${pct(segment.start, duration)}%`,
            width: `${pct(length, duration)}%`,
          }}
        />

        {/* 시작 핸들 (키보드 접근용 slider) */}
        <div
          role="slider"
          tabIndex={0}
          aria-label="구간 시작"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={segment.start}
          onKeyDown={handleStartKey}
          className="absolute inset-y-0 -ml-1.5 w-3 rounded-full bg-primary"
          style={{ left: `${pct(segment.start, duration)}%` }}
        />

        {/* 끝 핸들 (키보드 접근용 slider) */}
        <div
          role="slider"
          tabIndex={0}
          aria-label="구간 끝"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={segment.end}
          onKeyDown={handleEndKey}
          className="absolute inset-y-0 -ml-1.5 w-3 rounded-full bg-primary"
          style={{ left: `${pct(segment.end, duration)}%` }}
        />

        {/* 재생 위치(playhead) */}
        {playhead !== null && (
          <div
            className="pointer-events-none absolute inset-y-0 w-0.5 bg-foreground-inverse"
            style={{ left: `${pct(playhead, duration)}%` }}
          />
        )}
      </div>

      {/* 실시간 라벨 — 요약과 동일 소스(formatTimecode) */}
      <span className="text-fm-label text-foreground-muted">
        {formatTimecode(segment.start)} – {formatTimecode(segment.end)} ·{" "}
        {Math.round(length)}초
      </span>
    </div>
  );
};
