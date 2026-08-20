import { useEffect, useReducer } from "react";
import { Pressable, Text, View } from "react-native";
import { ChevronDown } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import { ModalCard, Toast, cx } from "@fillmap/ui-native";
import {
  canSubmitReport,
  REPORT_REASONS,
  type ReportReasonId,
} from "../../video-actions/model/report";
import {
  EMPTY_REPORT_FORM,
  reportFormReducer,
} from "../../video-actions/model/report-form";

interface ReportModalProps {
  visible: boolean;
  /** 취소·딤 탭·Android back — 제출 없이 닫기 (AC 13) */
  onClose: () => void;
  /** 제출 — 실 API(`POST /api/videos/{videoId}/reports`) 발사는 화면이 소유한다 */
  onSubmit: (reasonId: ReportReasonId) => void;
  /** 제출 진행 중 — [신고 제출]을 비활성화해 연타를 눈에도 막는다 (codex 리뷰 2) */
  submitting: boolean;
  /** 제출 실패 안내 — 모달을 유지한 채 뜬다 (중복 신고는 화면이 닫는다) */
  failureMessage: string | null;
}

/**
 * 영상 신고 모달 (MSG-317 AC 9~13, Figma 14094:4253) — ModalCard children에
 * "신고 유형" 펼침형 셀렉트(RN에 네이티브 select 없음). 유형 미선택 시 [신고 제출]
 * 비활성(confirmDisabled).
 *
 * **로컬 상태는 `visible`이 내려갈 때마다 초기화된다** — 취소·딤 탭만이 아니라 제출
 * 성공·중복 신고까지 포함한 **모든 닫힘**이다(웹 정본 `ReportDialog.handleOpenChange`와
 * 같은 계약). 이 창은 닫혀도 언마운트되지 않으므로(화면이 `visible`만 내린다) 닫힘
 * 전이를 여기서 관찰해 리셋하지 않으면 다음 영상의 모달이 이전 사유가 선택된 채 열려
 * **오신고**가 난다 — MSG-431 초회 구현에서 실제로 발생한 회귀이고, 전이는 순수
 * 리듀서(`report-form.ts`)로 뽑아 테스트가 고정한다.
 * 제출 자체는 리셋하지 않는다 — 실패 시 모달이 유지된 채 같은 사유로 재시도할 수 있어야
 * 한다(웹 동일).
 *
 * **MSG-431: 사유 카탈로그가 mock(`report-types.ts` 5종)에서 웹 정본 3종으로 바뀌었다.**
 * 서버 enum은 INAPPROPRIATE·PRIVACY·SPAM·COPYRIGHT·OTHER라 mock 코드(HARMFUL·SEXUAL·ETC)는
 * 그대로 보낼 수 없었고, 플랫폼 간 사유가 갈리면 같은 신고가 다르게 접수된다.
 * 제출은 화면이 실 API로 발사하며(대상 videoId는 영상 행이 준다), 실패 안내는
 * 모달을 유지해야 재시도할 수 있으므로 카드 안에 그린다(RN Modal 경계 — 호스트 트리
 * 토스트는 이 창 뒤에 가린다).
 *
 * 진행 중 제출 비활성화(`submitting`)는 화면의 발사 가드(`guardMutate`)와 짝이다 — 중복
 * POST가 나가면 둘째 요청이 409를 받아 "신고가 접수되었어요" 뒤에 "이미 신고한 영상이에요"가
 * 뒤따르는 모순된 화면이 난다 (MSG-431 codex 리뷰 2).
 */
export const ReportModal = ({
  visible,
  onClose,
  onSubmit,
  submitting,
  failureMessage,
}: ReportModalProps) => {
  const [{ selected, expanded }, dispatch] = useReducer(
    reportFormReducer,
    EMPTY_REPORT_FORM,
  );

  // 닫힘 전이 관찰 — 화면이 성공·중복 신고에서 `visible`만 내리므로 여기가 유일한 지점이다
  useEffect(() => {
    if (!visible) dispatch({ type: "closed" });
  }, [visible]);

  const submit = () => {
    if (submitting || !canSubmitReport(selected)) return;
    onSubmit(selected);
  };

  const selectedLabel = REPORT_REASONS.find(
    (option) => option.id === selected,
  )?.label;

  return (
    <ModalCard
      visible={visible}
      title="영상 신고"
      description="신고 사유를 선택해주세요."
      cancelText="취소"
      confirmText="신고 제출"
      confirmDisabled={submitting || !canSubmitReport(selected)}
      onCancel={onClose}
      onOverlayPress={onClose}
      onConfirm={submit}
    >
      <View className="gap-xs">
        <Text className="text-fm-label text-foreground-body">신고 유형</Text>
        {/* 셀렉트 필드 — 탭으로 목록 펼침/접힘 (AC 10) */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="신고 유형 선택"
          accessibilityState={{ expanded }}
          onPress={() => dispatch({ type: "toggleReasonList" })}
          className="h-12 flex-row items-center gap-xs rounded-md border border-border px-md active:opacity-80"
        >
          <Text
            className={cx(
              "flex-1 text-fm-body",
              selectedLabel ? "text-foreground" : "text-foreground-muted",
            )}
          >
            {selectedLabel ?? "신고 유형을 선택해주세요"}
          </Text>
          {/* 펼침 상태 회전 어포던스 (리뷰 반영) — 펼침 UI는 Figma 부재 자체 구성 */}
          <ChevronDown
            size={16}
            color={semantic.muted}
            style={{ transform: [{ rotate: expanded ? "180deg" : "0deg" }] }}
          />
        </Pressable>
        {expanded && (
          <View className="rounded-md border border-border">
            {REPORT_REASONS.map((option, i) => (
              <Pressable
                key={option.id}
                accessibilityRole="button"
                accessibilityState={{ selected: option.id === selected }}
                onPress={() =>
                  dispatch({ type: "selectReason", reasonId: option.id })
                }
                className={cx(
                  "px-md py-sm active:bg-surface-soft",
                  i > 0 && "border-t border-border",
                )}
              >
                <Text className="text-fm-body text-foreground">
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
      {failureMessage !== null && <Toast title={failureMessage} />}
    </ModalCard>
  );
};
