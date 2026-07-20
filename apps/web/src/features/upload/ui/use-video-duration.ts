import { useEffect, useState } from "react";

interface VideoMeta {
  /** loadedmetadata로 읽은 실제 영상 길이(초). 로딩 전이면 null */
  duration: number | null;
  /** 미리보기 <video>에 물릴 objectURL. 로딩 전/파일 없으면 null */
  objectUrl: string | null;
}

const EMPTY_META: VideoMeta = { duration: null, objectUrl: null };

/**
 * 선택한 File에서 실제 duration과 미리보기 objectURL을 얻는 UI 훅. (MSG-118 추정 1·2)
 * 플랫폼 API(document·URL.createObjectURL·HTMLVideoElement) 사용부를 여기 격리한다 —
 * duration 판정 자체는 순수 함수(shouldOfferHighlight)에 위임하고, RN에서는 이 훅만 교체한다.
 *
 * 상태는 loadedmetadata 콜백에서만 세팅하고(effect 동기 setState 금지 준수),
 * File이 바뀌면 렌더 중 이전 값 비교로 초기화한다. objectURL은 effect cleanup에서 revoke한다.
 */
export const useVideoDuration = (file: File | null): VideoMeta => {
  const [meta, setMeta] = useState<VideoMeta>(EMPTY_META);
  const [prevFile, setPrevFile] = useState(file);

  // File이 바뀌면 즉시(렌더 중) 이전 메타를 비운다 — 새 메타는 loadedmetadata에서 채워진다.
  if (file !== prevFile) {
    setPrevFile(file);
    setMeta(EMPTY_META);
  }

  useEffect(() => {
    if (!file) return;

    const url = URL.createObjectURL(file);
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.src = url;
    const handleLoaded = () => setMeta({ duration: probe.duration, objectUrl: url });
    probe.addEventListener("loadedmetadata", handleLoaded);

    return () => {
      probe.removeEventListener("loadedmetadata", handleLoaded);
      probe.src = "";
      URL.revokeObjectURL(url);
    };
  }, [file]);

  return meta;
};
