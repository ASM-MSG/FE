import { type ReactNode, useState } from "react";
import { MapPin } from "lucide-react";
import { Dialog } from "radix-ui";
import { cn, Input, ModalCard } from "@fillmap/ui-web";
import { MOCK_CELLS } from "@/entities/cell";
import { shouldOfferHighlight } from "@/features/upload/model/highlight-selection";
import { useUploadModalStore } from "@/features/upload/model/upload-modal-store";
import {
  canSubmitUpload,
  type UploadCandidate,
} from "@/features/upload/model/upload-validation";
import { HighlightStep } from "./HighlightStep";
import { UploadDropzone } from "./UploadDropzone";
import { useVideoDuration } from "./use-video-duration";

const MODAL_SUBTITLE = "지금 위치의 격자에 순간을 기록하세요";

// 위치→격자 해석 로직은 이번 범위 아님 — mock 격자(A-14) 기반 정적 라벨 (Q6·AC7)
const CURRENT_CELL = MOCK_CELLS.find((cell) => cell.id === "A-14");
const LOCATION_LABEL = `${CURRENT_CELL?.label ?? "현재 격자"} (현재 위치)`;

/**
 * AI 안내 / 최종 확인 박스 — 정적 프레젠테이션 (AC8·AC9).
 * onClick이 주어지면 클릭 가능한 카드(커서 pointer / hover 반응)로 렌더한다 — MSG-118 S1.
 */
const InfoBox = ({
  title,
  body,
  tone,
  onClick,
}: {
  title: string;
  body: ReactNode;
  tone: "soft" | "dark";
  onClick?: () => void;
}) => {
  const content = (
    <>
      <span
        className={cn(
          "text-fm-body-strong",
          tone === "dark" ? "text-foreground-inverse" : "text-foreground",
        )}
      >
        {title}
      </span>
      <span
        className={cn(
          "text-fm-label",
          tone === "dark"
            ? "text-foreground-inverse/70"
            : "text-foreground-muted",
        )}
      >
        {body}
      </span>
    </>
  );

  const base = cn(
    "flex w-full flex-col gap-xxs rounded-md px-md py-sm text-left",
    tone === "dark" ? "bg-foreground" : "bg-surface-soft",
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          base,
          "cursor-pointer border border-transparent transition-colors hover:border-primary hover:bg-primary/5",
        )}
      >
        {content}
      </button>
    );
  }

  return <div className={base}>{content}</div>;
};

/**
 * 영상 업로드 모달 — Radix Dialog(오버레이·포털·포커스 트랩·Esc·scrim)로 ModalCard를 감싼다.
 * 두 진입점 공통 조상(AppLayout)에 1회 마운트되고 열림 상태는 전역 스토어가 관리한다(Q1·Q2).
 * 제목·선택 파일은 로컬 state이며 닫힐 때 초기화된다(AC10).
 * 취소/✕/scrim/Esc/업로드 모두 닫기만 한다 — 실제 업로드 연동은 범위 밖(Q5, 목업).
 */
export const UploadModal = () => {
  const open = useUploadModalStore((s) => s.open);
  const closeModal = useUploadModalStore((s) => s.closeModal);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<UploadCandidate | null>(null);
  // 원본 File — duration 캡처·미리보기용(플랫폼 경계). candidate와 별도로 보관 (MSG-118)
  const [rawFile, setRawFile] = useState<File | null>(null);
  // 모달 내부 스텝 전환 — 위젯 경계를 넘지 않으므로 전역 스토어가 아닌 로컬 state (스펙 계획)
  const [step, setStep] = useState<"select" | "highlight">("select");

  const { duration, objectUrl } = useVideoDuration(rawFile);
  // 5초 초과 영상에서만 AI 추천 카드/스텝을 제공한다 (L1·S1·S12)
  const offerHighlight = duration !== null && shouldOfferHighlight(duration);

  const handleSelectFile = (candidate: UploadCandidate, source: File) => {
    setFile(candidate);
    setRawFile(source);
  };

  // 닫힐 때마다 입력을 초기화해 다시 열면 이전 제목·파일·스텝이 남지 않는다 (AC10)
  const close = () => {
    setTitle("");
    setFile(null);
    setRawFile(null);
    setStep("select");
    closeModal();
  };

  // Esc·scrim 클릭은 Radix가 onOpenChange(false)로 전달 — 이 모달만 닫는다 (AC11·AC13)
  const handleOpenChange = (next: boolean) => {
    if (!next) close();
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-navy-900/40" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[480px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto outline-none"
        >
          <Dialog.Title className="sr-only">영상 업로드</Dialog.Title>
          {step === "highlight" && duration !== null ? (
            <HighlightStep
              objectUrl={objectUrl}
              duration={duration}
              onClose={close}
            />
          ) : (
            <ModalCard
              title="영상 업로드"
              description={MODAL_SUBTITLE}
              cancelText="취소"
              confirmText="업로드"
              confirmDisabled={!canSubmitUpload(file)}
              onCancel={close}
              onConfirm={close}
              onClose={close}
            >
              <UploadDropzone
                selectedName={file?.name ?? null}
                onSelectFile={handleSelectFile}
              />

            <div className="flex w-full flex-col gap-xs">
              <label
                htmlFor="upload-title"
                className="text-fm-body-strong text-foreground"
              >
                제목
              </label>
              <Input
                id="upload-title"
                placeholder="영상 제목을 입력해주세요"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="border-border bg-surface-soft"
              />
            </div>

            <div className="flex w-full items-center gap-xs">
              <span className="shrink-0 text-fm-body-strong text-foreground">
                위치 태그
              </span>
              <span className="inline-flex items-center gap-[6px] rounded-full bg-primary/10 px-sm py-[7px] text-fm-label text-primary">
                <MapPin className="size-3" />
                {LOCATION_LABEL}
              </span>
              {/* 격자 재선택은 범위 밖 — disabled로 비활성 표시해 클릭 오인 방지 (AC7) */}
              <button
                type="button"
                disabled
                className="shrink-0 text-fm-label text-foreground-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                변경
              </button>
            </div>

            {/* 5초 초과 영상이면 클릭 가능한 카드(→ 2단계), 아니면 정적 안내 유지 (S1·S12) */}
              <InfoBox
                tone="soft"
                title="AI 하이라이트 자동 추천"
                body="5초를 초과하는 영상은 AI가 최적 구간을 자동 분석해 3~5개 구간을 추천해요"
                onClick={
                  offerHighlight ? () => setStep("highlight") : undefined
                }
              />
              <InfoBox
                tone="soft"
                title="AI 자동 블러 처리"
                body="업로드 전 얼굴과 번호판을 자동 감지해 블러 처리합니다"
              />
              <InfoBox
                tone="dark"
                title="업로드 전 최종 확인"
                body="AI 처리가 끝나면 미리보기에서 확인한 뒤 지도에 게시돼요"
              />
            </ModalCard>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
