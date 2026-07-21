import { type ReactNode, useState } from "react";
import { MapPin } from "lucide-react";
import { Dialog } from "radix-ui";
import { cn, Input, ModalCard } from "@fillmap/ui-web";
import { MOCK_CELLS } from "@/entities/cell";
import { useUploadModalStore } from "@/features/upload/model/upload-modal-store";
import type { SelectionResult } from "@/features/upload/model/highlight-selection";
import {
  getNextStep,
  type UploadStep,
} from "@/features/upload/model/upload-wizard";
import {
  canSubmitUpload,
  type UploadCandidate,
} from "@/features/upload/model/upload-validation";
import { BlurStep } from "./BlurStep";
import { HighlightStep } from "./HighlightStep";
import { PreviewStep } from "./PreviewStep";
import { UploadDropzone } from "./UploadDropzone";
import { useVideoDuration } from "./use-video-duration";

const MODAL_SUBTITLE = "지금 위치의 격자에 순간을 기록하세요";

// 위치→격자 해석 로직은 이번 범위 아님 — mock 격자(A-14) 기반 정적 라벨 (Q6·AC7)
const CURRENT_CELL = MOCK_CELLS.find((cell) => cell.id === "A-14");
const LOCATION_LABEL = `${CURRENT_CELL?.label ?? "현재 격자"} (현재 위치)`;
// 4/4 미리보기 위치 카드 — 태그된 셀(A-14)의 상세 위치 + 라벨 합성.
// Figma "합정동" 플레이스홀더 대신 태그한 셀 실제 데이터를 사용한다 (MSG-120 Q3·S6).
const PREVIEW_LOCATION_LABEL = CURRENT_CELL
  ? `${CURRENT_CELL.location} · ${CURRENT_CELL.label}`
  : "현재 격자";

/**
 * AI 안내 / 최종 확인 박스 — 정적 프레젠테이션 (AC8·AC9).
 * 하이라이트 진입은 1단계 "다음" 버튼이 담당하므로 카드는 클릭 불가한 정적 안내다 (MSG-119 S5).
 */
const InfoBox = ({
  title,
  body,
  tone,
}: {
  title: string;
  body: ReactNode;
  tone: "soft" | "dark";
}) => (
  <div
    className={cn(
      "flex w-full flex-col gap-xxs rounded-md px-md py-sm text-left",
      tone === "dark" ? "bg-foreground" : "bg-surface-soft",
    )}
  >
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
  </div>
);

/**
 * 영상 업로드 모달 — Radix Dialog(오버레이·포털·포커스 트랩·Esc·scrim)로 ModalCard를 감싼다.
 * 두 진입점 공통 조상(AppLayout)에 1회 마운트되고 열림 상태는 전역 스토어가 관리한다(Q1·Q2).
 * 제목·선택 파일·스텝은 로컬 state이며 닫힐 때 초기화된다(AC10·S14).
 * 정보 입력 → (하이라이트) → 블러 확인 선형 위저드다 — "다음"은 스텝을 전환하고,
 * 취소/✕/scrim/Esc만 모달을 닫는다. 실제 업로드 연동은 범위 밖(목업).
 */
export const UploadModal = () => {
  const open = useUploadModalStore((s) => s.open);
  const closeModal = useUploadModalStore((s) => s.closeModal);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<UploadCandidate | null>(null);
  // 원본 File — duration 캡처·미리보기용(플랫폼 경계). candidate와 별도로 보관 (MSG-118)
  const [rawFile, setRawFile] = useState<File | null>(null);
  // 모달 내부 스텝 전환 — 위젯 경계를 넘지 않으므로 전역 스토어가 아닌 로컬 state (스펙 계획)
  const [step, setStep] = useState<UploadStep>("select");
  // 2단계 하이라이트 선택 결과를 4/4 미리보기로 상위 전달·보관 (MSG-120 S3·S11).
  // 5초 이하 건너뜀 흐름·재오픈 시 null — 하이라이트 카드 미표시를 보장한다 (S4·S8).
  const [highlightSelection, setHighlightSelection] =
    useState<SelectionResult | null>(null);

  const { duration, objectUrl, error: videoLoadError } = useVideoDuration(rawFile);

  // "다음" 활성 조건 = 유효 파일 && 메타데이터 로드 완료(duration 확정) && 로드 실패 아님 (Q1·S2·S7)
  // 현재 훅 구현에선 error면 duration이 항상 null이라 !videoLoadError가 중복이지만,
  // 훅 불변식이 바뀌어도 로드 실패 시 진행을 막도록 방어적으로 유지한다.
  const canProceed =
    canSubmitUpload(file) && duration !== null && !videoLoadError;

  // "다음" — 5초 초과면 하이라이트(2/4), 이하면 블러 확인(3/4)으로 전환 (S3·S4).
  // duration 확정 전에는 canProceed가 false라 이 경로가 열리지 않는다.
  const goNext = () => {
    if (duration === null) return;
    setStep(getNextStep("select", duration));
  };

  const handleSelectFile = (candidate: UploadCandidate, source: File) => {
    setFile(candidate);
    setRawFile(source);
  };

  // 닫힐 때마다 입력을 초기화해 다시 열면 이전 제목·파일·스텝이 남지 않는다 (AC10)
  // 하이라이트 선택도 리셋 — 재오픈 잔존·5초 이하 새 영상의 하이라이트 카드 오표시 방지 (MSG-120 S4·S8)
  const close = () => {
    setTitle("");
    setFile(null);
    setRawFile(null);
    setStep("select");
    setHighlightSelection(null);
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
          className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-120 -translate-x-1/2 -translate-y-1/2 overflow-y-auto outline-none"
        >
          <Dialog.Title className="sr-only">영상 업로드</Dialog.Title>
          {step === "highlight" && duration !== null ? (
            <HighlightStep
              objectUrl={objectUrl}
              duration={duration}
              onClose={close}
              onNext={(result) => {
                // 선택 결과를 상위에 보관 후 블러 확인(3/4)으로 전환 (MSG-120 S3·S11)
                setHighlightSelection(result);
                setStep("blur");
              }}
            />
          ) : step === "blur" && duration !== null ? (
            <BlurStep
              objectUrl={objectUrl}
              duration={duration}
              onClose={close}
              // 확인 시 4/4 미리보기로 전환 (MSG-120 S1, MSG-119 콘솔 로그 대체).
              // BlurStep 시그니처는 유지 — payload는 계속 생성되며 상위에서 미사용(고아 방지).
              onConfirm={() => setStep("preview")}
            />
          ) : step === "preview" && duration !== null ? (
            <PreviewStep
              objectUrl={objectUrl}
              highlightSelection={highlightSelection}
              locationLabel={PREVIEW_LOCATION_LABEL}
              onPublish={close}
              onBack={() => setStep("blur")}
              onClose={close}
            />
          ) : (
            <ModalCard
              title="영상 업로드"
              description={MODAL_SUBTITLE}
              cancelText="취소"
              confirmText="다음"
              confirmDisabled={!canProceed}
              onCancel={close}
              onConfirm={goNext}
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
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-sm py-1.75 text-fm-label text-primary">
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

            {/* 하이라이트 진입은 "다음" 버튼이 담당 — 카드는 정적 안내 (S5) */}
            {/* 메타데이터 로드 실패 시 duration이 영구히 null로 남지 않고 원인을 안내한다 (S7) */}
              <InfoBox
                tone="soft"
                title="AI 하이라이트 자동 추천"
                body={
                  videoLoadError
                    ? "영상을 불러오지 못했어요. 다른 파일로 다시 시도해주세요"
                    : "5초를 초과하는 영상은 AI가 최적 구간을 자동 분석해 3~5개 구간을 추천해요"
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
