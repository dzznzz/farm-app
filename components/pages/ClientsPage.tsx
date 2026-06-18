import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { PhIcon } from '../ui/PhIcon';
import { useToast } from '../ui/Toast';
import { Colors, Spacing, Typography, Radius } from '../../constants/theme';
import { pageStyles, SettingField } from './shared';
import {
  Client, ClientChannel, CommissionType,
  listClients, addClient, updateClient, deleteClient,
} from '../../lib/clients';

interface Props { onBack: () => void; userId?: string }

const CHANNELS: { key: ClientChannel; label: string }[] = [
  { key: 'offline', label: '오프라인' },
  { key: 'online', label: '온라인' },
];

export function ClientsPage({ onBack, userId }: Props) {
  const toast = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'none' | 'add' | string>('none'); // 'add' | editId | 'none'

  const [name, setName] = useState('');
  const [channel, setChannel] = useState<ClientChannel>('offline');
  const [commType, setCommType] = useState<CommissionType>('%');
  const [commValue, setCommValue] = useState('');

  const load = useCallback(async () => {
    if (!userId) return;
    setClients(await listClients(userId));
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => { setName(''); setChannel('offline'); setCommType('%'); setCommValue(''); };

  const openAdd = () => { resetForm(); setMode('add'); };
  const openEdit = (c: Client) => {
    setName(c.name); setChannel(c.channel); setCommType(c.commission_type);
    setCommValue(c.commission_value ? String(c.commission_value) : '');
    setMode(c.id);
  };
  const cancel = () => { setMode('none'); resetForm(); };

  const save = async () => {
    if (!userId || !name.trim()) { toast.error('거래처 이름을 입력하세요.'); return; }
    setSaving(true);
    const input = {
      name: name.trim(), channel, commissionType: commType,
      commissionValue: parseFloat(commValue) || 0,
    };
    const { error } = mode === 'add' ? await addClient(userId, input) : await updateClient(mode, input);
    if (error) toast.error('저장 실패: ' + error.message);
    else { toast.success('저장되었습니다.'); cancel(); await load(); }
    setSaving(false);
  };

  const remove = async (id: string) => {
    await deleteClient(id);
    setClients((prev) => prev.filter((c) => c.id !== id));
    toast.success('삭제되었습니다.');
  };

  const renderForm = (isAdd: boolean) => (
    <>
      <SettingField label="거래처 이름 *">
        <TextInput style={pageStyles.settingInput} value={name} onChangeText={setName}
          placeholder="예) 가락시장 ○○상회, 쿠팡" placeholderTextColor={Colors.textLight} />
      </SettingField>
      <SettingField label="구분">
        <View style={styles.chipRow}>
          {CHANNELS.map((ch) => (
            <TouchableOpacity key={ch.key}
              style={[styles.chip, channel === ch.key && styles.chipActive]}
              onPress={() => setChannel(ch.key)}>
              <Text style={[styles.chipText, channel === ch.key && styles.chipTextActive]}>{ch.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </SettingField>
      <SettingField label="수수료">
        <View style={styles.commRow}>
          <View style={styles.chipRow}>
            {(['%', '원'] as CommissionType[]).map((t) => (
              <TouchableOpacity key={t}
                style={[styles.chip, commType === t && styles.chipActive]}
                onPress={() => setCommType(t)}>
                <Text style={[styles.chipText, commType === t && styles.chipTextActive]}>
                  {t === '%' ? '비율 (%)' : '금액 (원)'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput style={[pageStyles.settingInput, { flex: 1 }]} value={commValue} onChangeText={setCommValue}
            placeholder="없으면 0" placeholderTextColor={Colors.textLight} keyboardType="decimal-pad" />
        </View>
      </SettingField>
      <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
        <Button title={isAdd ? '추가' : '저장'} onPress={save} loading={saving} style={{ flex: 1 }} />
        <TouchableOpacity style={pageStyles.cancelBtn} onPress={cancel}>
          <Text style={pageStyles.cancelBtnText}>취소</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <SafeAreaView style={pageStyles.container}>
      <View style={pageStyles.subHeader}>
        <TouchableOpacity onPress={onBack}><Text style={pageStyles.backBtn}>←</Text></TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <PhIcon name="handshake" size={20} color={Colors.text} />
          <Text style={pageStyles.subTitle}>거래처 관리</Text>
        </View>
        {mode === 'none' ? (
          <TouchableOpacity onPress={openAdd}><Text style={pageStyles.addBtnText}>+ 추가</Text></TouchableOpacity>
        ) : <View style={{ width: 40 }} />}
      </View>

      <ScrollView style={pageStyles.scroll} keyboardShouldPersistTaps="handled">
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {mode === 'add' && (
              <Card style={{ margin: Spacing.lg, marginBottom: 0, borderWidth: 1, borderColor: Colors.primary }}>
                <Text style={[Typography.bodyBold, { marginBottom: Spacing.md }]}>새 거래처 추가</Text>
                {renderForm(true)}
              </Card>
            )}

            {clients.map((c) => (
              <Card key={c.id} style={{ margin: Spacing.lg, marginBottom: 0 }}>
                {mode === c.id ? renderForm(false) : (
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={Typography.bodyBold}>{c.name}</Text>
                      <View style={[styles.channelBadge, c.channel === 'online' && styles.channelBadgeOnline]}>
                        <Text style={[styles.channelBadgeText, c.channel === 'online' && styles.channelBadgeTextOnline]}>
                          {c.channel === 'online' ? '온라인' : '오프라인'}
                        </Text>
                      </View>
                    </View>
                    <Text style={[Typography.caption, { marginTop: 2 }]}>
                      수수료 {c.commission_value > 0
                        ? (c.commission_type === '%' ? `${c.commission_value}%` : `${c.commission_value.toLocaleString()}원`)
                        : '없음'}
                    </Text>
                    <View style={styles.actions}>
                      <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(c)}>
                        <Text style={styles.actionBtnText}>수정</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => remove(c.id)}>
                        <Text style={styles.actionBtnDangerText}>삭제</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </Card>
            ))}

            {clients.length === 0 && mode === 'none' && (
              <View style={{ alignItems: 'center', marginTop: 60 }}>
                <PhIcon name="handshake" size={48} color={Colors.textLight} />
                <Text style={[Typography.body, { color: Colors.textSub, marginTop: Spacing.md }]}>등록된 거래처가 없습니다</Text>
                <TouchableOpacity style={pageStyles.emptyAddBtn} onPress={openAdd}>
                  <Text style={pageStyles.emptyAddBtnText}>+ 거래처 추가하기</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  chipActive: { backgroundColor: Colors.primaryUltraLight, borderColor: Colors.primary },
  chipText: { fontSize: 14, color: Colors.textSub, fontWeight: '600' },
  chipTextActive: { color: Colors.primaryDark, fontWeight: '700' },
  commRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  channelBadge: {
    backgroundColor: Colors.border, borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  channelBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.textSub },
  channelBadgeOnline: { backgroundColor: Colors.primaryUltraLight },
  channelBadgeTextOnline: { color: Colors.primaryDark },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 6, marginTop: Spacing.sm },
  actionBtn: {
    width: 70, paddingVertical: 6, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.primary, alignItems: 'center',
  },
  actionBtnText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  actionBtnDanger: { borderColor: Colors.danger },
  actionBtnDangerText: { fontSize: 12, color: Colors.danger, fontWeight: '600' },
});
