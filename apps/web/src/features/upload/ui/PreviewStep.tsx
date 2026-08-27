import { Loader2, MapPin, Sparkles } from "lucide-react";
import { RadioGroup } from "radix-ui";
import { ModalCard } from "@fillmap/ui-web";
import {
  formatSegmentLabel,
  type Segment,
} from "@/features/upload/model/highlight-selection";
import {
  VISIBILITY_OPTIONS,
  type VideoVisibility,
} from "@/features/video-actions/model/video-menu";
import { VideoPreview } from "./VideoPreview";

/** 트리밍 진행 상태 — UploadModal이 소유하고 이 스텝이 표시한다 (B8) */
export type TrimState =
  | { status: "idle" }
  | { status: "trimming" }
  | {
      status: "ready";
      blob: Blob;
      /** 잘린 영상 실측 길이(초) — 보정 재컷으로 ≤30 보장 */
      durationSec: number;
      objectUrl: string | null;
    }
  | { status: "error"; message: string };

interface PreviewStepProps {
  trim: TrimState;
  /** 선택 구간 — 시간·길이 중심 문구용 (B6, 사유 배너는 오탐 방지 2) */
  segment: Segment;
  /**
   * 위치 라벨 — 일반: 뷰포트 중심 행정동 (B2) / 교체: 대상 영상 격자 라벨.
   * null이면 위치 카드를 생략한다 (MSG-415 추정 1)
   */
  locationLabel: string | null;
  /**
   * 공개 범위 선택값 (MSG-476 AC 1) — null이면 선택 카드를 생략한다
   * (교체 모드 — DTO에 visibility가 없어 보낼 수 없다, AC 11)
   */
  visibility: VideoVisibility | null;
  /** 공개 범위 변경 — 라디오 그룹 onValueChange */
  onVisibilityChange: (visibility: VideoVisibility) => void;
  /** 확정 버튼 문구 — "업로드하기"/"교체하기" (MSG-415 추정 3) */
  confirmLabel: string;
  /** 확정 진행 중 버튼 문구 — "업로드 중…"/"교체 중…" */
  submittingLabel: string;
  /** 트리밍 실패 시 재시도 */
  onRetryTrim: () => void;
  /** 확정 — presign → PUT → POST /api/videos 또는 교체 PUT (B9·MSG-415) */
  onPublish: () => void;
  /** 게시 진행 중 — 버튼 비활성(중복 게시 차단, B12) */
  submitting: boolean;
  /** 게시 단계별 실패 안내 — null이면 실패 없음 (B11) */
  submitFailureMessage: string | null;
  /** 이전 단계(하이라이트)로 — 스킵 흐름이면 null */
  onBack: (() => void) | null;
  /** 모달 전체 닫기 (✕) — 진행 중이면 undefined(닫기 차단, B12) */
  onClose: (() => void) | undefined;
}

/**
 * 3/3 "업로드 미리보기" 화면 본체 (MSG-329 B8·B9·B12).
 * 선택 구간으로 ffmpeg.wasm이 잘라낸 결과를 로컬 재생(컨트롤 포함)으로 최종 확인하고
 * [업로드하기]로 확정한다. 스트림 카피라 실제 시작점이 선택보다 1~2초 앞설 수 있고
 * 미리보기가 실물을 그대로 보여준다(티켓 14 수용). 구 "블러 결과" 카드는 폐기됐고,
 * 게시 후 블러 경로도 서버 블러 중단으로 삭제됐다 (MSG-476).
 * 공개 범위(전체 공개/나만 보기) 선택 카드가 위치 카드 아래 붙는다 (MSG-476 AC 1).
 */
export const PreviewStep = ({
  trim,
  segment,
  locationLabel,
  visibility,
  onVisibilityChange,
  confirmLabel,
  submittingLabel,
  onRetryTrim,
  onPublish,
  submitting,
  submitFailureMessage,
  onBack,
  onClose,
}: PreviewStepProps) => (
  <ModalCard
    title="업로드 미리보기"
    description="3/3 단계 · 최종 확인"
    confirmText={submitting ? submittingLabel : confirmLabel}
    confirmVariant="primary"
    confirmDisabled={trim.status !== "ready" || submitting}
    onConfirm={onPublish}
    onClose={onClose}
  >
    {trim.status === "ready" ? (
      <VideoPreview objectUrl={trim.objectUrl} controls />
    ) : trim.status === "error" ? (
      <div className="flex w-full flex-col items-center gap-sm rounded-md bg-surface-soft px-md py-lg">
        <p role="alert" className="text-fm-body text-foreground">
          {trim.message}
        </p>
        <button
          type="button"
          onClick={onRetryTrim}
          className="text-fm-label font-semibold text-primary"
        >
          다시 시도
        </button>
      </div>
    ) : (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-sm rounded-md bg-foreground">
        <Loader2
          aria-hidden="true"
          className="size-6 animate-spin text-foreground-inverse/70"
        />
        <p className="text-fm-label text-foreground-inverse/70">
          선택한 구간으로 영상을 자르고 있어요
        </p>
      </div>
    )}

    {/* 선택 구간 카드 — 시간·길이 중심 (사유 데이터 부재 — Figma 배너는 플레이스홀더, 오탐 방지 2) */}
    <div className="flex w-full items-center justify-between gap-xs rounded-md bg-foreground px-md py-sm">
      <span className="flex items-center gap-xs text-fm-body-strong text-foreground-inverse">
        <Sparkles aria-hidden="true" className="size-4" />
        선택 구간
      </span>
      <span className="text-fm-body-strong text-foreground-inverse">
        {formatSegmentLabel(segment)}
        {trim.status === "ready" && ` · 실측 ${Math.round(trim.durationSec)}초`}
      </span>
    </div>

    {/* 위치 카드 — 일반: 뷰포트 중심 행정동 (B2) / 교체: 대상 격자 라벨, 미확보 시 생략 (추정 1) */}
    {locationLabel !== null && (
      <div className="flex w-full items-center gap-xs rounded-md bg-surface-soft px-md py-sm">
        <MapPin aria-hidden="true" className="size-4 shrink-0 text-primary" />
        <div className="flex min-w-0 flex-col gap-xxs">
          <span className="text-fm-label text-foreground-muted">위치</span>
          <span className="text-fm-body-strong text-foreground">
            {locationLabel}
          </span>
        </div>
      </div>
    )}

    {/* 공개 범위 카드 (MSG-476 AC 1·9) — 교체 모드(null)는 생략 (AC 11).
        라디오 시각은 ui-web Selector radio 스타일 준용 — 그룹 배타 선택이 필요해
        Radix RadioGroup 프리미티브(role=radiogroup/radio + 화살표 이동)를 쓴다 */}
    {visibility !== null && (
      <div className="flex w-full flex-col gap-xs rounded-md bg-surface-soft px-md py-sm">
        <span className="text-fm-label text-foreground-muted">공개 범위</span>
        {/* Root가 role=radiogroup — 시각 라벨과 별개로 그룹 접근 이름을 붙인다 (AC 9) */}
        <RadioGroup.Root
          aria-label="공개 범위"
          value={visibility}
          onValueChange={(value) =>
            onVisibilityChange(value as VideoVisibility)
          }
          className="flex items-center gap-lg"
        >
          {VISIBILITY_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-xs"
            >
              <RadioGroup.Item
                value={option.value}
                className="size-5 shrink-0 rounded-full border-[1.5px] border-border bg-surface transition-colors data-[state=checked]:border-[6px] data-[state=checked]:border-primary data-[state=checked]:bg-background"
              />
              <span className="text-fm-body text-foreground">
                {option.label}
              </span>
            </label>
          ))}
        </RadioGroup.Root>
      </div>
    )}

    {/* 게시 단계별 실패 — 재시도 시 성공 단계는 건너뛴다 (B11) */}
    {submitFailureMessage !== null && (
      <p role="alert" className="text-fm-label text-error">
        {submitFailureMessage} — [{confirmLabel}]로 다시 시도할 수 있어요
      </p>
    )}

    {onBack !== null && (
      <button
        type="button"
        onClick={onBack}
        // 트리밍 중에도 막는다 — 되돌아가 다른 구간을 고르면 싱글턴 ffmpeg·고정 파일명을
        // 두 트리밍이 공유해 last-write-wins 경쟁이 생긴다 (✕ busy 게이팅과 동일 패턴, 리뷰 반영)
        disabled={submitting || trim.status === "trimming"}
        className="self-center text-fm-label text-foreground-muted underline underline-offset-2 transition-colors hover:text-foreground disabled:opacity-50"
      >
        이전 단계로
      </button>
    )}
  </ModalCard>
);
