import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert,
  ActivityIndicator, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../ui/Card';
import { PhIcon } from '../ui/PhIcon';
import { useToast } from '../ui/Toast';
import { Colors, Spacing, Typography, Radius } from '../../constants/theme';
import { pageStyles } from './shared';
import {
  myOwnedFarms, ownerPendingRequests, farmMembersDetail,
  approveRequest, rejectRequest, removeFarmMember, transferOwnership,
  OwnedFarm, PendingRequest, FarmMemberDetail,
} from '../../lib/farmAccess';

interface Props {
  onBack: () => void;
  userId?: string;
}

export function FarmManagePage({ onBack, userId }: Props) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [farms, setFarms] = useState<OwnedFarm[]>([]);
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [members, setMembers] = useState<Record<string, FarmMemberDetail[]>>({});

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const [ownedFarms, pending] = await Promise.all([
        myOwnedFarms(userId),
        ownerPendingRequests(),
      ]);
      const memberLists = await Promise.all(
        ownedFarms.map((f) => farmMembersDetail(f.id).then((m) => [f.id, m] as const)),
      );
      setFarms(ownedFarms);
      setRequests(pending);
      setMembers(Object.fromEntries(memberLists));
    } catch (e: any) {
      toast.error(e.message ?? '불러오기에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const run = async (fn: () => Promise<void>, okMsg: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      toast.success(okMsg);
      await load();
    } catch (e: any) {
      toast.error(e.message ?? '처리에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = (farmId: string, m: FarmMemberDetail) => {
    Alert.alert('구성원 삭제', `${m.user_name ?? m.user_email ?? '구성원'} 님을 농장에서 제외할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => run(() => removeFarmMember(farmId, m.user_id), '구성원을 삭제했습니다.') },
    ]);
  };

  const confirmTransfer = (farmId: string, m: FarmMemberDetail) => {
    Alert.alert('농장주 승계', `${m.user_name ?? m.user_email ?? '구성원'} 님에게 농장주를 넘길까요?\n넘기면 나는 구성원이 됩니다.`, [
      { text: '취소', style: 'cancel' },
      { text: '승계', style: 'destructive', onPress: () => run(() => transferOwnership(farmId, m.user_id), '농장주를 승계했습니다.') },
    ]);
  };

  const requestsFor = (farmId: string) => requests.filter((r) => r.farm_id === farmId);

  return (
    <SafeAreaView style={pageStyles.container}>
      <View style={pageStyles.subHeader}>
        <TouchableOpacity onPress={onBack}><Text style={pageStyles.backBtn}>←</Text></TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <PhIcon name="users-three" size={20} color={Colors.text} />
          <Text style={pageStyles.subTitle}>농장 관리</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={pageStyles.scroll} contentContainerStyle={{ paddingBottom: Spacing.xl }}>
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : farms.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <PhIcon name="users-three" size={48} color={Colors.textLight} />
            <Text style={[Typography.body, { color: Colors.textSub, marginTop: Spacing.md }]}>농장주인 농장이 없습니다</Text>
            <Text style={[Typography.caption, { marginTop: 4 }]}>농장을 등록하면 농장주가 됩니다</Text>
          </View>
        ) : (
          farms.map((farm) => {
            const farmRequests = requestsFor(farm.id);
            const farmMembers = members[farm.id] ?? [];
            return (
              <Card key={farm.id} style={styles.farmCard}>
                <View style={styles.farmHeader}>
                  <Text style={Typography.bodyBold}>{farm.name}</Text>
                  <Text style={Typography.caption}>{farm.crop_type}</Text>
                </View>

                {/* 권한 신청 */}
                <Text style={styles.sectionLabel}>
                  권한 신청 {farmRequests.length > 0 ? `(${farmRequests.length})` : ''}
                </Text>
                {farmRequests.length === 0 ? (
                  <Text style={styles.emptyLine}>대기 중인 신청이 없습니다</Text>
                ) : (
                  farmRequests.map((req) => (
                    <View key={req.request_id} style={styles.reqRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.personName}>{req.user_name ?? '이름 없음'}</Text>
                        {!!req.user_email && <Text style={styles.personEmail}>{req.user_email}</Text>}
                      </View>
                      <TouchableOpacity
                        style={[styles.smallBtn, styles.approveBtn]} disabled={busy}
                        onPress={() => run(() => approveRequest(req.request_id), '승인했습니다.')}
                      >
                        <Text style={styles.approveBtnText}>승인</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.smallBtn, styles.rejectBtn]} disabled={busy}
                        onPress={() => run(() => rejectRequest(req.request_id), '반려했습니다.')}
                      >
                        <Text style={styles.rejectBtnText}>반려</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}

                {/* 구성원 */}
                <Text style={[styles.sectionLabel, { marginTop: Spacing.md }]}>구성원 ({farmMembers.length})</Text>
                {farmMembers.map((m) => {
                  const isMe = m.user_id === userId;
                  const isOwner = m.role === 'owner';
                  return (
                    <View key={m.user_id} style={styles.memberRow}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.personName}>{m.user_name ?? '이름 없음'}{isMe ? ' (나)' : ''}</Text>
                          <View style={[styles.roleBadge, isOwner ? styles.ownerBadge : styles.memberBadge]}>
                            <Text style={[styles.roleBadgeText, { color: isOwner ? Colors.primaryDark : Colors.textSub }]}>
                              {isOwner ? '농장주' : '구성원'}
                            </Text>
                          </View>
                        </View>
                        {!!m.user_email && <Text style={styles.personEmail}>{m.user_email}</Text>}
                      </View>
                      {!isOwner && (
                        <>
                          <TouchableOpacity style={[styles.smallBtn, styles.transferBtn]} disabled={busy}
                            onPress={() => confirmTransfer(farm.id, m)}>
                            <Text style={styles.transferBtnText}>승계</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.smallBtn, styles.rejectBtn]} disabled={busy}
                            onPress={() => confirmRemove(farm.id, m)}>
                            <Text style={styles.rejectBtnText}>삭제</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  );
                })}
              </Card>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  farmCard: { margin: Spacing.lg, marginBottom: 0 },
  farmHeader: { marginBottom: Spacing.sm },
  sectionLabel: { ...Typography.label, marginBottom: Spacing.xs, marginTop: Spacing.xs },
  emptyLine: { ...Typography.caption, color: Colors.textLight, paddingVertical: 4 },
  reqRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  personName: { ...Typography.body, fontWeight: '600', color: Colors.text },
  personEmail: { ...Typography.caption, color: Colors.textSub, marginTop: 1 },
  smallBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1,
  },
  approveBtn: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  approveBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  rejectBtn: { borderColor: Colors.danger },
  rejectBtnText: { color: Colors.danger, fontSize: 12, fontWeight: '600' },
  transferBtn: { borderColor: Colors.primary },
  transferBtnText: { color: Colors.primary, fontSize: 12, fontWeight: '600' },
  roleBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.full, borderWidth: 1 },
  ownerBadge: { backgroundColor: Colors.primaryUltraLight, borderColor: Colors.primaryLight },
  memberBadge: { backgroundColor: Colors.background, borderColor: Colors.border },
  roleBadgeText: { fontSize: 10, fontWeight: '700' },
});
