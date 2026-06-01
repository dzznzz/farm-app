import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  ActivityIndicator, Alert, Linking,
} from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
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
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';

export function ExportModal({ visible, onClose, userId }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [exporting, setExporting] = useState(false);
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);

  const [request, , promptAsync] = Google.useAuthRequest({
    webClientId: WEB_CLIENT_ID || '__not_configured__',
    iosClientId: IOS_CLIENT_ID || undefined,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  useEffect(() => {
    if (!visible) { setSheetUrl(null); setExporting(false); }
  }, [visible]);

  const handleExport = async () => {
    if (!WEB_CLIENT_ID) {
      Alert.alert('설정 필요', 'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID 환경변수를 설정해주세요.\n자세한 내용은 개발자에게 문의하세요.');
      return;
    }
    setExporting(true);
    try {
      const result = await promptAsync();
      if (result.type !== 'success') { setExporting(false); return; }

      const accessToken = result.authentication?.accessToken;
      if (!accessToken) throw new Error('Google 인증 토큰을 가져오지 못했습니다.');

      const rows = await fetchMonthlyExportData(userId, year, month);
      if (rows.length === 0) {
        Alert.alert('데이터 없음', `${year}년 ${month}월에 기록된 데이터가 없습니다.`);
        setExporting(false);
        return;
      }

      const url = await createMonthlySpreadsheet(accessToken, year, month, rows);
      setSheetUrl(url);
    } catch (e: any) {
      Alert.alert('오류', e.message);
    }
    setExporting(false);
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
            포함 항목: 일자·작물·품종·사이즈·수확량·판매량·매출·수수료·부수비용·순수익·기타수량
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
              style={[styles.exportBtn, (exporting || !request) && styles.exportBtnDisabled]}
              onPress={handleExport}
              disabled={exporting || !request}
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
