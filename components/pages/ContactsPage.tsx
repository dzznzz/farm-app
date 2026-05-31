import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Contacts from 'expo-contacts';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Colors, Spacing, Typography } from '../../constants/theme';
import { pageStyles, SettingField } from './shared';

type ContactRecord = { id: string; name: string; phone: string | null; sort_order: number };
type SortMode = 'name' | 'custom';

interface Props {
  onBack: () => void;
  userId?: string;
}

export function ContactsPage({ onBack, userId }: Props) {
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>('name');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [addMode, setAddMode] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const isMobile = Platform.OS === 'ios' || Platform.OS === 'android';

  const loadContacts = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('contacts').select('id, name, phone, sort_order').eq('user_id', userId)
      .order(sortMode === 'name' ? 'name' : 'sort_order', { ascending: true });
    setContacts(data ?? []);
    setLoading(false);
  };

  useEffect(() => { loadContacts(); }, [userId, sortMode]);

  const importFromDevice = async () => {
    if (!isMobile) { Alert.alert('안내', '휴대폰에서만 사용 가능한 기능입니다.'); return; }
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') { Alert.alert('권한 필요', '연락처 권한을 허용해주세요.'); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
    } as any);
    const validContacts: any[] = (result.data ?? []).filter((c: any) => c.name);
    Alert.alert('연락처 가져오기', `기기에서 ${validContacts.length}개의 연락처를 찾았습니다.\n모두 가져올까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '가져오기',
        onPress: async () => {
          const rows = validContacts.map((c, i) => ({
            user_id: userId, name: c.name!, phone: c.phoneNumbers?.[0]?.number ?? null, sort_order: i,
          }));
          const { error } = await supabase.from('contacts').insert(rows);
          if (error) Alert.alert('오류', error.message);
          else { Alert.alert('완료', `${rows.length}개 연락처를 가져왔습니다.`); loadContacts(); }
        },
      },
    ]);
  };

  const deleteContact = (id: string, name: string) => {
    Alert.alert('삭제', `${name} 연락처를 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => { await supabase.from('contacts').delete().eq('id', id); loadContacts(); } },
    ]);
  };

  const saveEdit = async () => {
    if (!editId || !editName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('contacts').update({ name: editName.trim(), phone: editPhone.trim() || null }).eq('id', editId);
    if (error) Alert.alert('저장 실패', error.message);
    else { setEditId(null); await loadContacts(); }
    setSaving(false);
  };

  const addContact = async () => {
    if (!userId || !newName.trim()) { Alert.alert('입력 오류', '이름을 입력하세요.'); return; }
    setSaving(true);
    const { error } = await supabase.from('contacts').insert({
      user_id: userId, name: newName.trim(), phone: newPhone.trim() || null, sort_order: contacts.length,
    });
    if (error) Alert.alert('저장 실패', error.message);
    else { setAddMode(false); setNewName(''); setNewPhone(''); await loadContacts(); }
    setSaving(false);
  };

  const moveContact = async (index: number, direction: 'up' | 'down') => {
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= contacts.length) return;
    const newList = [...contacts];
    [newList[index], newList[swapIndex]] = [newList[swapIndex], newList[index]];
    await Promise.all(newList.map((c, i) => supabase.from('contacts').update({ sort_order: i }).eq('id', c.id)));
    setContacts(newList.map((c, i) => ({ ...c, sort_order: i })));
  };

  const callContact = (phone: string) => {
    if (!isMobile) { Alert.alert('안내', '휴대폰에서만 사용 가능한 기능입니다.'); return; }
    Linking.openURL(`tel:${phone}`).catch(() => Alert.alert('오류', '전화를 걸 수 없습니다.'));
  };

  const smsContact = (phone: string) => {
    if (!isMobile) { Alert.alert('안내', '휴대폰에서만 사용 가능한 기능입니다.'); return; }
    Linking.openURL(`sms:${phone}`).catch(() => Alert.alert('오류', '문자를 보낼 수 없습니다.'));
  };

  const kakaoContact = () => {
    if (!isMobile) { Alert.alert('안내', '휴대폰에서만 사용 가능한 기능입니다.'); return; }
    Linking.canOpenURL('kakaotalk://').then((can) => {
      if (can) Linking.openURL('kakaotalk://');
      else Alert.alert('안내', '카카오톡 앱이 설치되어 있지 않습니다.');
    });
  };

  return (
    <SafeAreaView style={pageStyles.container}>
      <View style={pageStyles.subHeader}>
        <TouchableOpacity onPress={onBack}><Text style={pageStyles.backBtn}>←</Text></TouchableOpacity>
        <Text style={pageStyles.subTitle}>📱 연락처</Text>
        {isMobile ? (
          <TouchableOpacity onPress={() => setAddMode(true)}>
            <Text style={pageStyles.addBtnText}>+ 추가</Text>
          </TouchableOpacity>
        ) : <View style={{ width: 40 }} />}
      </View>

      {isMobile && (
        <View style={styles.contactToolbar}>
          <View style={styles.sortTabs}>
            {([['name', '이름순'], ['custom', '직접순서']] as [SortMode, string][]).map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={[styles.sortBtn, sortMode === key && styles.sortBtnActive]}
                onPress={() => setSortMode(key)}
              >
                <Text style={[styles.sortBtnText, sortMode === key && styles.sortBtnTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.importBtn} onPress={importFromDevice}>
            <Text style={styles.importBtnText}>📲 기기에서 가져오기</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={pageStyles.scroll} keyboardShouldPersistTaps="handled">
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {!isMobile && (
              <View style={styles.nonMobileBanner}>
                <Text style={styles.nonMobileBannerText}>📱 휴대폰에서만 사용 가능한 기능입니다. 연락처 조회만 가능합니다.</Text>
              </View>
            )}

            {addMode && isMobile && (
              <Card style={{ margin: Spacing.lg, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.primary }}>
                <Text style={[Typography.bodyBold, { marginBottom: Spacing.md }]}>연락처 추가</Text>
                <SettingField label="이름 *">
                  <TextInput style={pageStyles.settingInput} value={newName} onChangeText={setNewName} placeholder="이름" placeholderTextColor={Colors.textLight} />
                </SettingField>
                <SettingField label="전화번호">
                  <TextInput style={pageStyles.settingInput} value={newPhone} onChangeText={setNewPhone} placeholder="010-0000-0000" keyboardType="phone-pad" placeholderTextColor={Colors.textLight} />
                </SettingField>
                <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
                  <Button title="추가" onPress={addContact} loading={saving} style={{ flex: 1 }} />
                  <TouchableOpacity style={pageStyles.cancelBtn} onPress={() => setAddMode(false)}>
                    <Text style={pageStyles.cancelBtnText}>취소</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            )}

            {contacts.map((contact, index) => (
              <Card key={contact.id} style={{ marginHorizontal: Spacing.lg, marginBottom: Spacing.sm }}>
                {editId === contact.id ? (
                  <>
                    <SettingField label="이름 *">
                      <TextInput style={pageStyles.settingInput} value={editName} onChangeText={setEditName} />
                    </SettingField>
                    <SettingField label="전화번호">
                      <TextInput style={pageStyles.settingInput} value={editPhone} onChangeText={setEditPhone} keyboardType="phone-pad" />
                    </SettingField>
                    <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
                      <Button title="저장" onPress={saveEdit} loading={saving} style={{ flex: 1 }} />
                      <TouchableOpacity style={pageStyles.cancelBtn} onPress={() => setEditId(null)}>
                        <Text style={pageStyles.cancelBtnText}>취소</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <View>
                    <View style={styles.contactRow}>
                      {isMobile && sortMode === 'custom' && (
                        <View style={styles.moveButtons}>
                          <TouchableOpacity onPress={() => moveContact(index, 'up')} disabled={index === 0}>
                            <Text style={[styles.moveBtn, index === 0 && { opacity: 0.3 }]}>▲</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => moveContact(index, 'down')} disabled={index === contacts.length - 1}>
                            <Text style={[styles.moveBtn, index === contacts.length - 1 && { opacity: 0.3 }]}>▼</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={Typography.bodyBold}>{contact.name}</Text>
                        {contact.phone && <Text style={Typography.caption}>{contact.phone}</Text>}
                      </View>
                      {isMobile && (
                        <View style={styles.contactActions}>
                          {contact.phone && (
                            <>
                              <TouchableOpacity style={styles.actionBtn} onPress={() => callContact(contact.phone!)}>
                                <Text style={styles.actionBtnText}>📞</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.actionBtn} onPress={() => smsContact(contact.phone!)}>
                                <Text style={styles.actionBtnText}>💬</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.actionBtn} onPress={() => kakaoContact()}>
                                <Text style={styles.actionBtnText}>🟡</Text>
                              </TouchableOpacity>
                            </>
                          )}
                          <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => { setEditId(contact.id); setEditName(contact.name); setEditPhone(contact.phone ?? ''); }}
                          >
                            <Text style={styles.actionBtnText}>✏️</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.actionBtn} onPress={() => deleteContact(contact.id, contact.name)}>
                            <Text style={styles.actionBtnText}>🗑️</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </Card>
            ))}

            {contacts.length === 0 && !addMode && (
              <View style={{ alignItems: 'center', marginTop: 60 }}>
                <Text style={{ fontSize: 48 }}>📱</Text>
                <Text style={[Typography.body, { color: Colors.textSub, marginTop: Spacing.md }]}>등록된 연락처가 없습니다</Text>
                {isMobile && (
                  <TouchableOpacity style={pageStyles.emptyAddBtn} onPress={() => setAddMode(true)}>
                    <Text style={pageStyles.emptyAddBtnText}>+ 연락처 추가하기</Text>
                  </TouchableOpacity>
                )}
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
  contactToolbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  sortTabs: { flexDirection: 'row', gap: 4 },
  sortBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  sortBtnActive: { backgroundColor: Colors.primaryUltraLight, borderColor: Colors.primary },
  sortBtnText: { fontSize: 12, color: Colors.textSub, fontWeight: '600' },
  sortBtnTextActive: { color: Colors.primary },
  importBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  importBtnText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  contactRow: { flexDirection: 'row', alignItems: 'center' },
  moveButtons: { flexDirection: 'column', marginRight: Spacing.sm, gap: 2 },
  moveBtn: { fontSize: 14, color: Colors.textSub, paddingHorizontal: 4 },
  contactActions: { flexDirection: 'row', gap: 4 },
  actionBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { fontSize: 18 },
  nonMobileBanner: {
    margin: Spacing.lg, marginBottom: 0, backgroundColor: Colors.primaryUltraLight,
    borderRadius: 10, padding: Spacing.md, borderWidth: 1, borderColor: Colors.primaryLight,
  },
  nonMobileBannerText: { ...Typography.body, color: Colors.primaryDark, textAlign: 'center', lineHeight: 22 },
});
