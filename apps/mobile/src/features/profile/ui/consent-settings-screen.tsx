import { useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { semantic } from "@fillmap/design-tokens";
import { AppHeader, Button } from "@fillmap/ui-native";
import { goToLogin, goToTermsDocument } from "../../../shared/navigation";
import { useConsentStatusQuery } from "../api/use-consent-status-query";
import { useMarketingConsent } from "../api/use-marketing-consent";
import {
  consentRows,
  locationConsentNotice,
  requiredConsentCompleted,
  resolveMarketingErrorText,
} from "../model/consent-settings";
import { ConsentStatusRow } from "./consent-rows";
import { DeleteAccountModal } from "./delete-account-modal";
import { SettingInfoRow, SettingRow, SettingToggleRow } from "./setting-rows";

/**
 * 위치정보 동의 관리 (MSG-448 기준 8~17) — `GET /api/users/me/consents` 6필드를 그대로
 * 보여주고, 바꿀 수 있는 것은 마케팅 수신 동의 하나뿐이다.
 *
 * Figma 시안이 없다(정본 페이지 전수 검색 — 스펙 실측 E). 앱 시각 관례를 따른다:
 * `AppHeader` + `ScrollView` + `gap-lg px-5`, 섹션 = `text-fm-title` 제목 + 행 리스트.
 *
 * **철회 버튼을 만들지 않는다** (승인 Q1-A): 서버가 `consented=false`를 developCode 1400으로
 * 거절하므로 절대 성공하지 않는 버튼이 된다. 게다가 철회가 성사되면 `app/_layout.tsx`의
 * 게이트가 앱 전체를 회원가입 동의 화면으로 잠근다(이 화면 자신도 사라진다). 대신 철회
 * 불가 사실과 계정 삭제라는 대체 경로를 상시 고지하고, 삭제는 **기존 흐름**
 * (`DeleteAccountModal`)을 재사용한다 — 새 삭제 로직을 만들지 않는다.
 */
export const ConsentSettingsScreen = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const consents = useConsentStatusQuery();
  const marketing = useMarketingConsent();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const status = consents.data;
  const rows = consentRows(status);
  const requiredRows = rows.filter((row) => row.required);
  const marketingRow = rows.find((row) => row.id === "marketing");

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <AppHeader title="위치정보 동의 관리" onBack={() => router.back()} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-lg px-5 pb-lg pt-md"
      >
        {consents.isError ? (
          // 조회 실패 + 재시도 (기준 10)
          <View className="items-center gap-md py-xl">
            <View className="items-center gap-xxs">
              <Text className="text-fm-title text-foreground">
                동의 상태를 불러오지 못했어요
              </Text>
              <Text className="text-center text-fm-body text-foreground-muted">
                네트워크 상태를 확인하고 다시 시도해 주세요
              </Text>
            </View>
            <Button
              text="다시 시도"
              variant="primary"
              size="sm"
              onPress={() => void consents.refetch()}
            />
          </View>
        ) : status === undefined ? (
          // 조회 대기 (기준 10) — 도착 전에 전부 미동의로 보이는 오해를 막는다
          <View className="py-xl">
            <ActivityIndicator color={semantic.primary} />
          </View>
        ) : (
          <>
            {/* 필수 동의 4종 — 읽기 전용 상태 행 (기준 9·17) */}
            <View className="gap-sm">
              <Text className="text-fm-title text-foreground">필수 동의</Text>
              <View className="gap-4.5">
                {requiredRows.map(({ id, label, agreed, docKey }) => (
                  <ConsentStatusRow
                    key={id}
                    label={label}
                    agreed={agreed}
                    onViewTerms={
                      docKey === null
                        ? undefined
                        : () => goToTermsDocument(docKey)
                    }
                  />
                ))}
                <SettingInfoRow
                  label="필수 동의 완료"
                  value={requiredConsentCompleted(status) ? "완료" : "미완료"}
                />
              </View>
              {/* 철회 불가 고지 (기준 15·16) — 경고가 아니라 정보라 muted다 */}
              <Text className="text-fm-caption text-foreground-muted">
                {locationConsentNotice()}
              </Text>
            </View>

            {/* 선택 동의 — 이 화면에서 바꿀 수 있는 유일한 항목 (기준 11·12·13) */}
            {marketingRow !== undefined && (
              <View className="gap-sm">
                <Text className="text-fm-title text-foreground">선택 동의</Text>
                <View className="gap-4.5">
                  <SettingToggleRow
                    label={marketingRow.label}
                    checked={marketingRow.agreed}
                    onCheckedChange={marketing.toggle}
                    busy={marketing.isPending}
                    errorText={resolveMarketingErrorText(marketing.isError)}
                  />
                </View>
              </View>
            )}

            {/* 되돌리는 유일한 경로 (승인 Q1-A) — 기존 계정 삭제 흐름을 그대로 재사용한다 */}
            <View className="gap-sm">
              <Text className="text-fm-title text-foreground">계정</Text>
              <SettingRow
                label="계정 삭제"
                tone="danger"
                onPress={() => setDeleteOpen(true)}
              />
            </View>
          </>
        )}
      </ScrollView>

      <DeleteAccountModal
        visible={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDeleted={goToLogin}
      />
    </View>
  );
};
