import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Bell } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import { Button, Toast } from "@fillmap/ui-native";
import { goToRoute } from "../../../shared/navigation";
import { useProcessingWatcher } from "../api/use-processing-watcher";
import {
  PROCESSING_NOTICE_COPY,
  resolveNoticeAction,
  type ProcessingNotice,
} from "../model/processing-notice";

/**
 * 블러 처리 통지 호스트 (MSG-429 기준 11·12) — **루트 상주**.
 * 폴링 워처의 통지를 하단 토스트 스택으로 띄우고, 완료의 [확인하기]는 블러 확인 화면으로,
 * 실패의 [다시 업로드]는 새 업로드 흐름으로 보낸다. 웹 `UploadProcessingNotices`(MSG-329)
 * 대응이며, 웹과 같은 판단으로 **전역 토스트 인프라를 만들지 않는다**(사용처 1곳).
 *
 * 문구·목적지는 전부 `processing-notice`(순수 모델)가 소유한다 — 모바일에는 렌더 테스트가
 * 없어 컴포넌트 안에 두면 회귀를 잡을 자산이 실기밖에 남지 않는다.
 */
export const ProcessingNoticeHost = () => {
  const insets = useSafeAreaInsets();
  const { notices, dismissNotice } = useProcessingWatcher();

  if (notices.length === 0) return null;

  const act = (notice: ProcessingNotice) => {
    const action = resolveNoticeAction(notice);
    if (action !== null) goToRoute(action.route);
    dismissNotice(notice.videoId);
  };

  return (
    <View
      // 화면 조작을 막지 않는다 — 토스트 자체만 터치를 받는다
      pointerEvents="box-none"
      className="absolute inset-x-0 bottom-0 gap-sm px-5"
      style={{ paddingBottom: insets.bottom + 16 }}
    >
      {notices.map((notice) => {
        const copy = PROCESSING_NOTICE_COPY[notice.kind];
        return (
          <View key={notice.videoId} className="gap-xs">
            <Toast
              title={copy.title}
              description={copy.description}
              icon={<Bell size={16} color={semantic.onPrimary} />}
            />
            <View className="flex-row justify-end gap-xs">
              {copy.actionText !== null && (
                <Button
                  text={copy.actionText}
                  size="sm"
                  shape="pill"
                  onPress={() => act(notice)}
                />
              )}
              <Button
                text="닫기"
                variant="secondary"
                size="sm"
                shape="pill"
                className="border border-border"
                onPress={() => dismissNotice(notice.videoId)}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
};
