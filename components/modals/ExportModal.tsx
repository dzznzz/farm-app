import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  ActivityIndicator, Alert, Linking, Platform,
} from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import { exchangeCodeAsync } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { fetchMonthlyExportData, createMonthlySpreadsheet } from '../../lib/googleSheets';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';

WebBrowser.maybeCompleteAuthSession();

interface Props {
  visible: boolean;
  onClose: () => void;
  userId: string;
}

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
// app.json의 iosUrlScheme에서 파생 — iOS OAuth 앱 클라이언트 (커스텀 스킴 리다이렉트 지원)
const IOS_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
  '971453817083-gprhfenf0sjciiu2vmafnihpihldpf8k.apps.googleusercontent.com';
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '';

export function ExportModal({ visible, onClose, userId }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [exporting, setExporting] = useState(false);
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);

  // 네이티브(iOS/Android): 플랫폼 전용 클라이언트 사용 (커스텀 스킴 리다이렉트)
  // 웹: clientId 사용 (HTTPS 리다이렉트, 커스텀 스킴 문제 없음)
  const [request, , promptAsync] = Google.useAuthRequest({
    clientId: WEB_CLIENT_ID || undefined,
    iosClientId: IOS_CLIENT_ID,
    androidClientId: ANDROID_CLIENT_ID || undefined,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    extraParams: { prompt: 'select_account' },
  });

  useEffect(() => {
    if (!visible) { setSheetUrl(null); setExporting(false); }
  }, [visible]);

  const handleExport = async () => {
    if (Platform.OS === 'android' && !ANDROID_CLIENT_ID) {
      Alert.alert(
        '설정 필요',
        'Android용 Google 클라이언트 ID가 없습니다.\nGoogle Cloud Console에서 Android 앱 OAuth 클라이언트를 생성 후 EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID에 설정하세요.',
      );
      return;
    }
    setExporting(true);
    try {
      const result = await promptAsync();
      if (result.type === 'error') {
        Alert.alert('인증 오류', result.error?.message ?? '인증에 실패했습니다.');
        return;
      }
      if (result.type !== 'success') return;

      // expo-auth-session v5는 자동 토큰 교환을 하지 않으므로 수동 교환
      let accessToken = result.authentication?.accessToken;
      if (!accessToken && result.params?.code) {
        const clientId = Platform.OS === 'ios' ? IOS_CLIENT_ID : ANDROID_CLIENT_ID;
        // iOS/Android 네이티브 클라이언트의 reversed scheme redirect URI
        const redirectUri = `com.googleusercontent.apps.${clientId.replace('.apps.googleusercontent.com', '')}:/oauthredirect`;
        const tokenResponse = await exchangeCodeAsync(
          {
            clientId,
            redirectUri,
            code: result.params.code,
            extraParams: request?.codeVerifier ? { code_verifier: request.codeVerifier } : undefined,
          },
          { tokenEndpoint: 'https://oauth2.googleapis.com/token' },
        );
        accessToken = tokenResponse.accessToken;
      }
      if (!accessToken) throw new Error('액세스 토큰을 받지 못했습니다.');

      const rows = await fetchMonthlyExportData(userId, year, month);
      if (rows.length === 0) {
        Alert.alert('데이터 없음', `${year}년 ${month}월에 기록된 데이터가 없습니다.`);
        return;
      }

      const url = await createMonthlySpreadsheet(accessToken, year, month, rows);
      setSheetUrl(url);
    } catch (e: any) {
      Alert.alert('오류', e?.message ?? '알 수 없는 오류가 발생했습니다.');
    } finally {
      setExporting(false);
    }
  };

  const changeMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setMonth(m);
    setYear(y);
    setSheetUrl(null);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <Text style={styles.title}>📊 Google Sheets 내보내기</Text>

          <Text style={styles.label}>내보낼 기간</Text>
          <View style={styles.monthRow}>
            <TouchableOpacity style={styles.navBtn} onPress={() => changeMonth(-1)}>
              <Text style={styles.navArrow}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthText}>{year}년 {month}월</Text>
            <TouchableOpacity style={styles.navBtn} onPress={() => changeMonth(1)}>
              <Text style={styles.navArrow}>›</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.infoText}>
            포함 항목: 일자·농장·작물·품종·사이즈·수확량·판매량·매출·수수료·부수비용·순수익·기타수량
          </Text>

          {sheetUrl ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>✅ 스프레드시트 생성 완료!</Text>
              <TouchableOpacity style={styles.openBtn} onPress={() => Linking.openURL(sheetUrl)}>
                <Text style={styles.openBtnText}>Google Sheets에서 열기</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
              onPress={handleExport}
              disabled={exporting}
            >
              {exporting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.exportBtnText}>Google 계정으로 내보내기</Text>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>닫기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: Spacing.lg, paddingBottom: 40,
  },
  handle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.md },
  title: { fontSize: 18, fontWeight: '800', color: Colors.text, marginBottom: Spacing.lg },
  label: { ...Typography.label, marginBottom: Spacing.sm },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, marginBottom: Spacing.md },
  navBtn: { padding: 8 },
  navArrow: { fontSize: 28, color: Colors.primary, fontWeight: '300' },
  monthText: { fontSize: 20, fontWeight: '800', color: Colors.text, minWidth: 120, textAlign: 'center' },
  infoText: { ...Typography.caption, color: Colors.textSub, marginBottom: Spacing.lg, lineHeight: 18 },
  exportBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    padding: Spacing.md, alignItems: 'center', marginBottom: Spacing.sm,
  },
  exportBtnDisabled: { backgroundColor: Colors.border },
  exportBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  successBox: { backgroundColor: Colors.primaryUltraLight, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm },
  successText: { ...Typography.bodyBold, color: Colors.primaryDark, marginBottom: Spacing.sm },
  openBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    padding: Spacing.sm, alignItems: 'center',
  },
  openBtnText: { color: '#fff', fontWeight: '700' },
  cancelBtn: { alignItems: 'center', padding: Spacing.sm },
  cancelBtnText: { color: Colors.textSub, fontSize: 15 },
});
