import type { ReactNode } from "react";
import { MapPin } from "lucide-react";
import { ModalCard } from "@fillmap/ui-web";
import {
  MAX_DURATION_SEC,
  type UploadCandidate,
} from "@/features/upload/model/upload-validation";
import { UploadDropzone } from "./UploadDropzone";

const MODAL_SUBTITLE = "지금 위치의 격자에 순간을 기록하세요";

/** 안내 박스 — 정적 프레젠테이션. 구 dark tone은 블러 안내 박스 삭제(MSG-476 AC 6)로 소멸 */
const InfoBox = ({ title, body }: { title: string; body: ReactNode }) => (
  <div className="flex w-full flex-col gap-xxs rounded-md bg-surface-soft px-md py-sm text-left">
    <span className="text-fm-body-strong text-foreground">{title}</span>
    <span className="text-fm-label text-foreground-muted">{body}</span>
  </div>
);

interface SelectStepProps {
  selectedName: string | null;
  onSelectFile: (candidate: UploadCandidate, source: File) => void;
  /** 180초 초과 — [다음] 비활성 사유 표시 (B1) */
  durationTooLong: boolean;
  /** 선분석 실패로 선택 스텝 복귀한 사유 — null이면 없음 (B5) */
  selectFailure: string | null;
  /** 메타데이터 로드 실패 — 안내 문구 전환 */
  videoLoadError: boolean;
  /**
   * 위치 태그 — 일반: 뷰포트 중심(또는 지목 격자) 행정동 (B2) / 교체: 대상 영상
   * 격자 라벨. null이면 태그를 생략한다 (MSG-415 추정 1)
   */
  locationLabel: string | null;
  canProceed: boolean;
  onNext: () => void;
  onClose: () => void;
}

/**
 * 1/3 "영상 업로드" 선택 스텝 (MSG-329 B1·B2 — UploadModal 분해, 리뷰 반영).
 * 드래그/클릭 선택 + 검증 사유 + 위치 태그 + 안내 박스 2종. "변경" UI는 제외 범위(오탐 방지 5).
 */
export const SelectStep = ({
  selectedName,
  onSelectFile,
  durationTooLong,
  selectFailure,
  videoLoadError,
  locationLabel,
  canProceed,
  onNext,
  onClose,
}: SelectStepProps) => (
  <ModalCard
    title="영상 업로드"
    description={MODAL_SUBTITLE}
    cancelText="취소"
    confirmText="다음"
    confirmDisabled={!canProceed}
    onCancel={onClose}
    onConfirm={onNext}
    onClose={onClose}
  >
    <UploadDropzone selectedName={selectedName} onSelectFile={onSelectFile} />

    {/* 길이 초과 사유 (B1) — [다음] 비활성 이유를 시각으로 알린다 */}
    {durationTooLong && (
      <p role="alert" className="text-fm-label text-error">
        영상이 너무 길어요 — 최대 {MAX_DURATION_SEC}초까지 올릴 수 있어요
      </p>
    )}
    {/* 선분석 실패로 선택 스텝 복귀한 사유 (B5) */}
    {selectFailure !== null && (
      <p role="alert" className="text-fm-label text-error">
        {selectFailure}
      </p>
    )}

    {/* 위치 태그 — 뷰포트 중심 행정동 (B2), 교체 모드 미확보 시 생략 (추정 1).
        "변경" UI는 제외 범위 — 미노출 (오탐 방지 5) */}
    {locationLabel !== null && (
      <div className="flex w-full items-center gap-xs">
        <span className="shrink-0 text-fm-body-strong text-foreground">
          위치 태그
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-sm py-1.75 text-fm-label text-primary">
          <MapPin className="size-3" />
          {locationLabel}
        </span>
      </div>
    )}

    {/* 메타데이터 로드 실패 시 duration이 영구히 null로 남지 않고 원인을 안내한다.
        구 "업로드 후 AI 자동 블러" 다크 박스는 서버 블러 중단으로 제거 (MSG-476 AC 6) */}
    <InfoBox
      title="AI 하이라이트 자동 추천"
      body={
        videoLoadError
          ? "영상을 불러오지 못했어요. 다른 파일로 다시 시도해주세요"
          : "다음 단계에서 AI가 영상을 분석해 최적 하이라이트 구간을 추천해요"
      }
    />
  </ModalCard>
);
