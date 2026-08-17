import { Button, Toast } from "@fillmap/ui-web";
import { useForegroundMessages } from "../api/use-foreground-messages";
import { usePushTokenSync } from "../api/use-push-token-sync";

/**
 * 푸시 상주 호스트 (MSG-408 AC 1·3·10) — AppLayout **셸 분기 내부** 마운트
 * (UploadProcessingNotices 상주 관례 미러). 위치동의 게이트 표시 중에는 셸 분기가
 * 렌더되지 않아 자동 동기화도 함께 무발동이다 — AC 3의 구조적 근거.
 * 포그라운드 onMessage 수신을 우하단 토스트 스택으로 표시한다(같은 스택 관례).
 * 표시·닫기만 — 클릭 딥링크 없음 (추정 4).
 */
export const PushNoticeHost = () => {
  // 셸 상주 자동 동기화 — 조건부 렌더 셸 분기와 수명을 같이 하도록 이 컴포넌트가 호출
  usePushTokenSync();
  const { notices, dismiss } = useForegroundMessages();

  if (notices.length === 0) return null;
  return (
    <div className="fixed bottom-md right-md z-50 flex w-90 max-w-[calc(100%-2rem)] flex-col gap-sm">
      {notices.map((notice) => (
        <div key={notice.id} className="flex flex-col gap-xs">
          <Toast title={notice.title} description={notice.body} />
          <div className="flex justify-end">
            <Button
              text="닫기"
              variant="secondary"
              size="sm"
              onClick={() => dismiss(notice.id)}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
