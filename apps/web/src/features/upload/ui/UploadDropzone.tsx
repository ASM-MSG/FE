import { type DragEvent, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { cn } from "@fillmap/ui-web";
import {
  isValidVideoFile,
  type UploadCandidate,
} from "@/features/upload/model/upload-validation";

interface UploadDropzoneProps {
  /** 현재 선택된 파일명 (없으면 null) — 표시는 부모 state 기준 */
  selectedName: string | null;
  /** 유효한 파일이 선택되면 호출 (무효 파일은 거부되어 호출되지 않음) */
  onSelectFile: (file: UploadCandidate) => void;
}

const CONSTRAINT_TEXT = "최대 60초 · MP4, MOV · 500MB 이하";
const REJECT_TEXT = "MP4·MOV 형식, 500MB 이하 영상만 올릴 수 있어요";

/**
 * 드래그앤드롭 + 클릭 파일 선택 셸 (feature-local). [AC4·AC5]
 * 클릭 시 숨은 file input을 트리거하고 drag/drop을 처리한다.
 * 무효 파일(확장자·용량 위반)은 선택을 거부하고 안내 텍스트를 노출한다(Q4) — 선택 상태는 갱신 안 함.
 * File→중립 형태({name,size}) 변환은 이 UI 경계에서 수행하고, 판정은 model의 순수 함수에 위임한다.
 */
export const UploadDropzone = ({
  selectedName,
  onSelectFile,
}: UploadDropzoneProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [rejected, setRejected] = useState(false);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const candidate: UploadCandidate = { name: file.name, size: file.size };
    if (!isValidVideoFile(candidate)) {
      setRejected(true);
      return;
    }
    setRejected(false);
    onSelectFile(candidate);
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setDragActive(false);
    handleFile(event.dataTransfer.files[0]);
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/quicktime,.mp4,.mov"
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={cn(
          "flex h-[200px] w-full flex-col items-center justify-center gap-[10px] rounded-lg border-[1.5px] border-dashed bg-surface-soft px-md text-center transition-colors",
          dragActive ? "border-primary bg-primary/5" : "border-primary/50",
        )}
      >
        <span className="flex size-[52px] items-center justify-center rounded-full bg-primary/10 text-primary">
          <Upload className="size-6" />
        </span>
        <span className="max-w-full truncate text-fm-title text-foreground">
          {selectedName ?? "영상을 드래그하거나 클릭해서 선택"}
        </span>
        {/* 제약 안내는 선택·거부 여부와 무관하게 항상 노출 (AC5) */}
        <span className="text-fm-label text-foreground-muted">
          {CONSTRAINT_TEXT}
        </span>
        {rejected && (
          <span className="text-fm-label text-error">{REJECT_TEXT}</span>
        )}
      </button>
    </>
  );
};
