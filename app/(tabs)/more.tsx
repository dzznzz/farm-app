import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
} from 'react-native';
import { PhIcon } from '../../components/ui/PhIcon';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { Colors, Spacing, Typography } from '../../constants/theme';
import { ChatbotPage } from '../../components/pages/ChatbotPage';
import { HarvestPage } from '../../components/pages/HarvestPage';
import { FarmSettingsPage } from '../../components/pages/FarmSettingsPage';
import { ProfileEditPage } from '../../components/pages/ProfileEditPage';
import { ContactsPage } from '../../components/pages/ContactsPage';
import { AdminDataPage } from '../../components/pages/AdminDataPage';

type PageType = 'menu' | 'chatbot' | 'harvest' | 'farmSettings' | 'profileEdit' | 'contacts' | 'adminData';

const isMobile = Platform.OS === 'ios' || Platform.OS === 'android';

export default function MoreScreen() {
  const { user, signOut } = useAuth();
  const { page: paramPage } = useLocalSearchParams<{ page?: string }>();
  const [page, setPage] = useState<PageType>('menu');
  const [userRole, setUserRole] = useState<string>('user');

  useEffect(() => {
    if (paramPage === 'chatbot') setPage('chatbot');
    if (paramPage === 'contacts') setPage('contacts');
  }, [paramPage]);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('role').eq('id', user.id).single()
      .then(({ data }) => { if (data?.role) setUserRole(data.role); });
  }, [user]);

  const isAdmin = userRole === 'admin';

  if (page === 'chatbot') return <ChatbotPage onBack={() => setPage('menu')} userId={user?.id} />;
  if (page === 'harvest') return <HarvestPage onBack={() => setPage('menu')} userId={user?.id} />;
  if (page === 'farmSettings') return <FarmSettingsPage onBack={() => setPage('menu')} userId={user?.id} />;
  if (page === 'profileEdit') return <ProfileEditPage onBack={() => setPage('menu')} userId={user?.id} />;
  if (page === 'contacts') return <ContactsPage onBack={() => setPage('menu')} userId={user?.id} />;
  if (page === 'adminData') return <AdminDataPage onBack={() => setPage('menu')} readOnly={isMobile} />;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={[Colors.primaryUltraLight, Colors.background]} style={styles.headerGradient}>
        <Text style={styles.title}>더보기</Text>
      </LinearGradient>
      <ScrollView style={styles.scroll}>
        <Card style={styles.menuCard}>
          {[
            { icon: 'robot', label: '농업 AI 챗봇', desc: '농작물 관리 전문 상담', page: 'chatbot' as PageType },
            { icon: 'map-trifold', label: '수확 동선 추적', desc: 'GPS로 수확 경로 기록', page: 'harvest' as PageType },
          ].map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuItem, i > 0 && styles.menuBorder]}
              onPress={() => setPage(item.page)}
            >
              <View style={styles.menuIconRow}>
                <PhIcon name={item.icon as any} size={20} color={Colors.primary} style={styles.menuIcon} />
                <View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuDesc}>{item.desc}</Text>
                </View>
              </View>
              <Text style={{ color: Colors.textLight, fontSize: 18 }}>›</Text>
            </TouchableOpacity>
          ))}
        </Card>

        <Card style={styles.menuCardSecond}>
          {[
            { icon: 'farm', label: '농장 설정', desc: '농장 및 작물 관리', page: 'farmSettings' as PageType },
            { icon: 'user-circle-gear', label: '프로필 수정', desc: '계정 정보 변경', page: 'profileEdit' as PageType },
            { icon: 'device-mobile', label: '연락처 관리', desc: '거래처 및 지인 연락처', page: 'contacts' as PageType },
          ].map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuItem, i > 0 && styles.menuBorder]}
              onPress={() => setPage(item.page)}
            >
              <View style={styles.menuIconRow}>
                <PhIcon name={item.icon as any} size={20} color={Colors.primary} style={styles.menuIcon} />
                <View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuDesc}>{item.desc}</Text>
                </View>
              </View>
              <Text style={{ color: Colors.textLight, fontSize: 18 }}>›</Text>
            </TouchableOpacity>
          ))}
        </Card>

        {isAdmin && (
          <Card style={styles.adminMenuCard}>
            <Text style={styles.adminBadge}>관리자 메뉴{isMobile ? ' · PC에서만 수정 가능' : ''}</Text>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setPage('adminData')}
            >
              <View style={styles.menuIconRow}>
                <PhIcon name="database" size={20} color={Colors.primary} style={styles.menuIcon} />
                <View>
                  <Text style={styles.menuLabel}>데이터 관리</Text>
                  <Text style={styles.menuDesc}>작물·품종·사이즈·단위 관리</Text>
                </View>
              </View>
              <Text style={{ color: Colors.textLight, fontSize: 18 }}>›</Text>
            </TouchableOpacity>
          </Card>
        )}

        <TouchableOpacity onPress={signOut} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>로그아웃</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerGradient: { paddingBottom: Spacing.lg },
  title: { ...Typography.h2, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  scroll: { flex: 1 },
  menuCard: { margin: Spacing.lg, marginBottom: Spacing.sm, padding: 0, overflow: 'hidden' },
  menuCardSecond: { marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, padding: 0, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md },
  menuIconRow: { flexDirection: 'row', alignItems: 'center' },
  menuIcon: { marginRight: Spacing.sm },
  menuBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  menuLabel: { ...Typography.bodyBold, marginBottom: 2 },
  menuDesc: { ...Typography.caption },
  adminCard: { borderWidth: 1, borderColor: Colors.primaryLight },
  adminMenuCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, padding: 0, overflow: 'hidden', borderWidth: 1, borderColor: Colors.primaryLight },
  adminBadge: {
    fontSize: 11, fontWeight: '700', color: Colors.primary,
    paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: 2,
  },
  signOutBtn: { margin: Spacing.lg, alignItems: 'center', paddingVertical: Spacing.md },
  signOutText: { color: Colors.danger, fontSize: 16, fontWeight: '600' },
});
