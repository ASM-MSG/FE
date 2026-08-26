import { Button, Toast } from "@fillmap/ui-web";
import { useForegroundMessages } from "../api/use-foreground-messages";
import { usePushTokenSync } from "../api/use-push-token-sync";
import {
  usePushNoticeStore,
  type PushToggleNotice,
} from "../model/push-notice-store";

/** 토글 안내 문구 (AC 6 denied · codex 리뷰 1·3 오류) — 구 ProfilePanel 렌더에서 이동 */
const TOGGLE_NOTICE_COPY: Record<
  PushToggleNotice,
  { title: string; description: string }
> = {
  denied: {
    title: "알림 권한이 차단되어 있어요",
    description: "브라우저 설정에서 알림 권한을 허용해주세요",
  },
  error: {
    title: "알림 설정에 실패했어요",
    description: "잠시 후 다시 시도해주세요",
  },
};

/** 스택 항목 공통 셸 — Toast + [닫기] (토글 안내·포그라운드 수신이 같은 형태를 공유) */
const NoticeToastItem = ({
  title,
  description,
  onDismiss,
}: {
  title: string;
  description?: string;
  onDismiss: () => void;
}) => (
  <div className="flex flex-col gap-xs">
    <Toast title={title} description={description} />
    <div className="flex justify-end">
      <Button text="닫기" variant="secondary" size="sm" onClick={onDismiss} />
    </div>
  </div>
);

/**
 * 푸시 상주 호스트 (MSG-408 AC 1·3·10) — AppLayout **셸 분기 내부** 마운트
 * (LoginModal 상주 관례 미러). 위치동의 게이트 표시 중에는 셸 분기가
 * 렌더되지 않아 자동 동기화도 함께 무발동이다 — AC 3의 구조적 근거.
 * 포그라운드 onMessage 수신과 토글 안내(denied/error — push-notice-store)를 우하단
 * **단일 스택**으로 표시한다 (PR #60 리뷰 3 — ProfilePanel 자체 토스트가 같은 fixed
 * 좌표에 겹치던 문제를 표시 표면 단일화로 해소). 표시·닫기만 — 클릭 딥링크 없음 (추정 4).
 */
export const PushNoticeHost = () => {
  // 셸 상주 자동 동기화 — 조건부 렌더 셸 분기와 수명을 같이 하도록 이 컴포넌트가 호출
  usePushTokenSync();
  const { notices, dismiss } = useForegroundMessages();
  const toggleNotice = usePushNoticeStore((s) => s.toggleNotice);
  const dismissToggleNotice = usePushNoticeStore((s) => s.dismissToggleNotice);

  if (notices.length === 0 && toggleNotice === null) return null;
  return (
    <div className="fixed bottom-md right-md z-50 flex w-90 max-w-[calc(100%-2rem)] flex-col gap-sm">
      {toggleNotice !== null && (
        <NoticeToastItem
          title={TOGGLE_NOTICE_COPY[toggleNotice].title}
          description={TOGGLE_NOTICE_COPY[toggleNotice].description}
          onDismiss={dismissToggleNotice}
        />
      )}
      {notices.map((notice) => (
        <NoticeToastItem
          key={notice.id}
          title={notice.title}
          description={notice.body}
          onDismiss={() => dismiss(notice.id)}
        />
      ))}
    </div>
  );
};
