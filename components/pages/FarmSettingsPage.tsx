import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, Alert,
  ActivityIndicator, Modal, FlatList, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { PhIcon } from '../ui/PhIcon';
import { useToast } from '../ui/Toast';
import { Colors, Spacing, Typography, Radius } from '../../constants/theme';
import { pageStyles, SettingField } from './shared';
import {
  searchFarms, requestFarmJoin, myJoinedFarms,
  FarmSearchResult, JoinedFarm,
} from '../../lib/farmAccess';

interface Farm {
  id: string;
  name: string;
  crop_type: string;
  area_sqm?: number;
  is_primary: boolean;
  address: string | null;
}

interface AddrResult {
  place_name: string;
  road_address_name: string;
  address_name: string;
}

interface Props {
  onBack: () => void;
  userId?: string;
}

const MAX_FARMS = 5;
const KAKAO_KEY = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY ?? '';

export function FarmSettingsPage({ onBack, userId }: Props) {
  const toast = useToast();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);

  // 농장 검색 / 권한 신청
  const [joined, setJoined] = useState<JoinedFarm[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FarmSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCrop, setEditCrop] = useState('');
  const [editArea, setEditArea] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [addMode, setAddMode] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCrop, setNewCrop] = useState('블루베리');
  const [newArea, setNewArea] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [saving, setSaving] = useState(false);

  // Kakao address search
  const [showAddrModal, setShowAddrModal] = useState(false);
  const [addrTarget, setAddrTarget] = useState<'new' | 'edit'>('new');
  const [addrQuery, setAddrQuery] = useState('');
  const [addrResults, setAddrResults] = useState<AddrResult[]>([]);
  const [addrSearching, setAddrSearching] = useState(false);

  const loadFarms = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('farms')
      .select('id, name, crop_type, area_sqm, is_primary, address')
      .eq('user_id', userId)
      .order('is_primary', { ascending: false })
      .order('name', { ascending: true });
    setFarms(data ?? []);
    setLoading(false);
  };

  const loadJoined = async () => {
    if (!userId) return;
    try { setJoined(await myJoinedFarms(userId)); } catch { /* noop */ }
  };

  useEffect(() => { loadFarms(); loadJoined(); }, [userId]);

  const runSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearched(true);
    try {
      setSearchResults(await searchFarms(searchQuery));
    } catch (e: any) {
      toast.error(e.message ?? '검색에 실패했습니다.');
    } finally {
      setSearching(false);
    }
  };

  const requestJoin = async (farm: FarmSearchResult) => {
    setRequestingId(farm.id);
    try {
      await requestFarmJoin(farm.id);
      toast.success('권한을 신청했습니다. 농장주 승인을 기다려주세요.');
      setSearchResults((prev) => prev.map((r) => r.id === farm.id ? { ...r, my_status: 'pending' } : r));
    } catch (e: any) {
      toast.error(e.message ?? '신청에 실패했습니다.');
    } finally {
      setRequestingId(null);
    }
  };

  const startEdit = (farm: Farm) => {
    setEditId(farm.id);
    setEditName(farm.name);
    setEditCrop(farm.crop_type);
    setEditArea(farm.area_sqm?.toString() ?? '');
    setEditAddress(farm.address ?? '');
  };

  const saveEdit = async () => {
    if (!editId || !editName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('farms').update({
      name: editName.trim(),
      crop_type: editCrop.trim(),
      area_sqm: editArea ? parseFloat(editArea) : null,
      address: editAddress.trim() || null,
    }).eq('id', editId);
    if (error) Alert.alert('저장 실패', error.message);
    else { setEditId(null); await loadFarms(); }
    setSaving(false);
  };

  const addFarm = async () => {
    if (!userId || !newName.trim()) { Alert.alert('입력 오류', '농장 이름을 입력하세요.'); return; }
    if (farms.length >= MAX_FARMS) {
      Alert.alert('제한', `농장은 최대 ${MAX_FARMS}개까지 등록 가능합니다.`);
      return;
    }
    setSaving(true);
    const isFirstFarm = farms.length === 0;
    const { error } = await supabase.from('farms').insert({
      user_id: userId,
      name: newName.trim(),
      crop_type: newCrop.trim() || '블루베리',
      area_sqm: newArea ? parseFloat(newArea) : null,
      address: newAddress.trim() || null,
      is_primary: isFirstFarm,
    });
    if (error) Alert.alert('저장 실패', error.message);
    else {
      setAddMode(false);
      setNewName(''); setNewCrop('블루베리'); setNewArea(''); setNewAddress('');
      await loadFarms();
    }
    setSaving(false);
  };

  const setPrimaryFarm = async (farmId: string) => {
    await supabase.from('farms').update({ is_primary: false }).eq('user_id', userId);
    await supabase.from('farms').update({ is_primary: true }).eq('id', farmId);
    await loadFarms();
  };

  const deleteFarm = (farmId: string, name: string) => {
    Alert.alert('삭제', `${name} 농장을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive', onPress: async () => {
          await supabase.from('farms').delete().eq('id', farmId);
          await loadFarms();
        },
      },
    ]);
  };

  const openAddrSearch = (target: 'new' | 'edit') => {
    setAddrTarget(target);
    setAddrQuery(target === 'new' ? newAddress : editAddress);
    setAddrResults([]);
    setShowAddrModal(true);
  };

  const searchAddr = async () => {
    if (!addrQuery.trim()) return;
    setAddrSearching(true);
    try {
      const res = await fetch(
        `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(addrQuery)}&size=10`,
        { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } },
      );
      const json = await res.json();
      setAddrResults(json.documents ?? []);
    } catch {
      Alert.alert('오류', '주소 검색에 실패했습니다.');
    } finally {
      setAddrSearching(false);
    }
  };

  const selectAddr = (item: AddrResult) => {
    const addr = item.road_address_name || item.address_name;
    if (addrTarget === 'new') setNewAddress(addr);
    else setEditAddress(addr);
    setShowAddrModal(false);
  };

  return (
    <SafeAreaView style={pageStyles.container}>
      <View style={pageStyles.subHeader}>
        <TouchableOpacity onPress={onBack}><Text style={pageStyles.backBtn}>←</Text></TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <PhIcon name="gear" size={20} color={Colors.text} />
          <Text style={pageStyles.subTitle}>농장 설정</Text>
        </View>
        {farms.length < MAX_FARMS ? (
          <TouchableOpacity onPress={() => setAddMode(true)}>
            <Text style={pageStyles.addBtnText}>+ 추가</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.maxLabel}>{MAX_FARMS}개 최대</Text>
        )}
      </View>

      <ScrollView style={pageStyles.scroll} keyboardShouldPersistTaps="handled">
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {farms.map((farm) => (
              <Card key={farm.id} style={{ margin: Spacing.lg, marginBottom: 0 }}>
                {editId === farm.id ? (
                  <>
                    <SettingField label="농장 이름">
                      <TextInput style={pageStyles.settingInput} value={editName} onChangeText={setEditName} />
                    </SettingField>
                    <SettingField label="작물">
                      <TextInput style={pageStyles.settingInput} value={editCrop} onChangeText={setEditCrop} />
                    </SettingField>
                    <SettingField label="면적 (㎡)">
                      <TextInput style={pageStyles.settingInput} value={editArea} onChangeText={setEditArea}
                        keyboardType="decimal-pad" placeholder="선택사항" placeholderTextColor={Colors.textLight} />
                    </SettingField>
                    <SettingField label="주소">
                      <View style={styles.addrRow}>
                        <TextInput style={[pageStyles.settingInput, { flex: 1 }]}
                          value={editAddress} onChangeText={setEditAddress}
                          placeholder="선택사항" placeholderTextColor={Colors.textLight} />
                        {!!KAKAO_KEY && (
                          <TouchableOpacity style={styles.addrSearchBtn} onPress={() => openAddrSearch('edit')}>
                            <Text style={styles.addrSearchBtnText}>검색</Text>
                          </TouchableOpacity>
                        )}
                      </View>
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={Typography.bodyBold}>{farm.name}</Text>
                      {farm.is_primary && (
                        <View style={styles.primaryBadge}>
                          <Text style={styles.primaryBadgeText}>대표</Text>
                        </View>
                      )}
                    </View>
                    <Text style={Typography.caption}>
                      {farm.crop_type}{farm.area_sqm ? ` · ${farm.area_sqm}㎡` : ''}
                    </Text>
                    {farm.address ? (
                      <Text style={styles.addressText}>{farm.address}</Text>
                    ) : null}
                    <View style={styles.farmActions}>
                      {!farm.is_primary && (
                        <TouchableOpacity style={styles.actionBtn} onPress={() => setPrimaryFarm(farm.id)}>
                          <Text style={styles.actionBtnText}>대표 설정</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity style={styles.actionBtn} onPress={() => startEdit(farm)}>
                        <Text style={styles.actionBtnText}>수정</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => deleteFarm(farm.id, farm.name)}>
                        <Text style={styles.actionBtnDangerText}>삭제</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </Card>
            ))}

            {addMode && farms.length < MAX_FARMS && (
              <Card style={{ margin: Spacing.lg, marginBottom: 0, borderWidth: 1, borderColor: Colors.primary }}>
                <Text style={[Typography.bodyBold, { marginBottom: Spacing.md }]}>새 농장 추가</Text>
                <SettingField label="농장 이름 *">
                  <TextInput style={pageStyles.settingInput} value={newName} onChangeText={setNewName}
                    placeholder="예) 1번 밭" placeholderTextColor={Colors.textLight} />
                </SettingField>
                <SettingField label="작물">
                  <TextInput style={pageStyles.settingInput} value={newCrop} onChangeText={setNewCrop} />
                </SettingField>
                <SettingField label="면적 (㎡)">
                  <TextInput style={pageStyles.settingInput} value={newArea} onChangeText={setNewArea}
                    keyboardType="decimal-pad" placeholder="선택사항" placeholderTextColor={Colors.textLight} />
                </SettingField>
                <SettingField label="주소">
                  <View style={styles.addrRow}>
                    <TextInput style={[pageStyles.settingInput, { flex: 1 }]}
                      value={newAddress} onChangeText={setNewAddress}
                      placeholder="선택사항" placeholderTextColor={Colors.textLight} />
                    {!!KAKAO_KEY && (
                      <TouchableOpacity style={styles.addrSearchBtn} onPress={() => openAddrSearch('new')}>
                        <Text style={styles.addrSearchBtnText}>검색</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </SettingField>
                <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
                  <Button title="추가" onPress={addFarm} loading={saving} style={{ flex: 1 }} />
                  <TouchableOpacity style={pageStyles.cancelBtn} onPress={() => setAddMode(false)}>
                    <Text style={pageStyles.cancelBtnText}>취소</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            )}

            {farms.length === 0 && !addMode && (
              <View style={{ alignItems: 'center', marginTop: 60 }}>
                <PhIcon name="plant" size={48} color={Colors.textLight} />
                <Text style={[Typography.body, { color: Colors.textSub, marginTop: Spacing.md }]}>등록된 농장이 없습니다</Text>
                <TouchableOpacity style={pageStyles.emptyAddBtn} onPress={() => setAddMode(true)}>
                  <Text style={pageStyles.emptyAddBtnText}>+ 농장 추가하기</Text>
                </TouchableOpacity>
              </View>
            )}

            {farms.length >= MAX_FARMS && !loading && (
              <View style={styles.limitBanner}>
                <Text style={styles.limitText}>농장은 최대 {MAX_FARMS}개까지 등록할 수 있습니다.</Text>
              </View>
            )}
          </>
        )}

        {/* 참여 중인 농장 (구성원) */}
        {joined.length > 0 && (
          <View style={{ marginTop: Spacing.lg }}>
            <Text style={styles.sectionHeader}>참여 중인 농장</Text>
            {joined.map((f) => (
              <Card key={f.id} style={{ marginHorizontal: Spacing.lg, marginBottom: Spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={Typography.bodyBold}>{f.name}</Text>
                  <View style={styles.joinedBadge}><Text style={styles.joinedBadgeText}>구성원</Text></View>
                </View>
                <Text style={Typography.caption}>{f.crop_type}</Text>
                {!!f.address && <Text style={styles.addressText}>{f.address}</Text>}
              </Card>
            ))}
          </View>
        )}

        {/* 농장 검색 / 권한 신청 */}
        <View style={{ marginTop: Spacing.lg }}>
          <Text style={styles.sectionHeader}>농장 검색 · 권한 신청</Text>
          <Card style={{ marginHorizontal: Spacing.lg }}>
            <Text style={[Typography.caption, { marginBottom: Spacing.sm }]}>
              농장 이름 또는 주소로 검색해 권한을 신청하면, 농장주 승인 후 해당 농장 데이터를 조회·입력할 수 있어요.
            </Text>
            <View style={styles.addrRow}>
              <TextInput
                style={[pageStyles.settingInput, { flex: 1 }]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="농장 이름 또는 주소"
                placeholderTextColor={Colors.textLight}
                onSubmitEditing={runSearch}
                returnKeyType="search"
              />
              <TouchableOpacity style={styles.addrSearchBtn} onPress={runSearch}>
                <Text style={styles.addrSearchBtnText}>검색</Text>
              </TouchableOpacity>
            </View>

            {searching ? (
              <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.md }} />
            ) : searched && searchResults.length === 0 ? (
              <Text style={[Typography.caption, { marginTop: Spacing.md, textAlign: 'center' }]}>검색 결과가 없습니다</Text>
            ) : (
              searchResults.map((f) => (
                <View key={f.id} style={styles.resultRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={Typography.bodyBold}>{f.name}</Text>
                    <Text style={Typography.caption}>
                      {f.crop_type}{f.owner_name ? ` · 농장주 ${f.owner_name}` : ''} · 구성원 {f.member_count}명
                    </Text>
                    {!!f.address && <Text style={styles.addressText}>{f.address}</Text>}
                  </View>
                  {f.my_status === 'owner' ? (
                    <Text style={styles.statusLabel}>내 농장</Text>
                  ) : f.my_status === 'member' ? (
                    <Text style={styles.statusLabel}>참여 중</Text>
                  ) : f.my_status === 'pending' ? (
                    <Text style={styles.statusPending}>신청됨</Text>
                  ) : (
                    <TouchableOpacity
                      style={styles.requestBtn}
                      disabled={requestingId === f.id}
                      onPress={() => requestJoin(f)}
                    >
                      <Text style={styles.requestBtnText}>{requestingId === f.id ? '신청 중…' : '권한 신청'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </Card>
        </View>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      {/* 카카오 주소 검색 모달 */}
      <Modal
        visible={showAddrModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddrModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
          <View style={styles.addrModalHeader}>
            <TouchableOpacity onPress={() => setShowAddrModal(false)}>
              <Text style={{ color: Colors.textSub, fontSize: 16 }}>닫기</Text>
            </TouchableOpacity>
            <Text style={Typography.h3}>주소 검색</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.addrSearchRow}>
            <TextInput
              style={[pageStyles.settingInput, { flex: 1 }]}
              value={addrQuery}
              onChangeText={setAddrQuery}
              placeholder="농장 주소 또는 지명 검색"
              placeholderTextColor={Colors.textLight}
              onSubmitEditing={searchAddr}
              returnKeyType="search"
              autoFocus
            />
            <TouchableOpacity style={styles.addrSearchBtn} onPress={searchAddr}>
              <Text style={styles.addrSearchBtnText}>검색</Text>
            </TouchableOpacity>
          </View>

          {addrSearching ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={addrResults}
              keyExtractor={(_, i) => String(i)}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.addrResultItem} onPress={() => selectAddr(item)}>
                  {!!item.place_name && (
                    <Text style={styles.addrPlaceName}>{item.place_name}</Text>
                  )}
                  <Text style={styles.addrRoadName}>
                    {item.road_address_name || item.address_name}
                  </Text>
                  {!!item.road_address_name && !!item.address_name && (
                    <Text style={styles.addrJibun}>{item.address_name}</Text>
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', marginTop: 60 }}>
                  <Text style={{ color: Colors.textSub }}>
                    검색어를 입력하고 검색을 누르세요
                  </Text>
                </View>
              }
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  maxLabel: { fontSize: 12, color: Colors.textLight, paddingRight: 4 },
  primaryBadge: {
    backgroundColor: Colors.primaryUltraLight, borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: Colors.primary,
  },
  primaryBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  addressText: { ...Typography.caption, color: Colors.textLight, marginTop: 2 },
  farmActions: {
    flexDirection: 'row', justifyContent: 'flex-end', gap: 6, marginTop: Spacing.sm,
  },
  actionBtn: {
    width: 70, paddingVertical: 6, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.primary, alignItems: 'center',
  },
  actionBtnText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  actionBtnDanger: { borderColor: Colors.danger },
  actionBtnDangerText: { fontSize: 12, color: Colors.danger, fontWeight: '600' },
  addrRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  addrSearchBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  addrSearchBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  limitBanner: {
    margin: Spacing.lg, backgroundColor: Colors.primaryUltraLight,
    borderRadius: Radius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.primaryLight,
  },
  limitText: { ...Typography.caption, color: Colors.primaryDark, textAlign: 'center' },
  addrModalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  addrSearchRow: {
    flexDirection: 'row', padding: Spacing.md, gap: 6, alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  addrResultItem: {
    padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  addrPlaceName: { ...Typography.bodyBold, marginBottom: 2 },
  addrRoadName: { ...Typography.body, color: Colors.text },
  addrJibun: { ...Typography.caption, color: Colors.textSub, marginTop: 2 },
  sectionHeader: {
    ...Typography.label, color: Colors.textSub,
    paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm,
  },
  joinedBadge: {
    backgroundColor: Colors.background, borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: Colors.border,
  },
  joinedBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.textSub },
  resultRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingTop: Spacing.md, marginTop: Spacing.sm,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  requestBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
  requestBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  statusLabel: { fontSize: 12, color: Colors.textSub, fontWeight: '600' },
  statusPending: { fontSize: 12, color: Colors.primary, fontWeight: '700' },
});
