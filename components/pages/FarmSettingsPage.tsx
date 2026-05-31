import { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Colors, Spacing, Typography } from '../../constants/theme';
import { pageStyles, SettingField } from './shared';

interface Farm { id: string; name: string; crop_type: string; area_sqm?: number }

interface Props {
  onBack: () => void;
  userId?: string;
}

export function FarmSettingsPage({ onBack, userId }: Props) {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCrop, setEditCrop] = useState('');
  const [editArea, setEditArea] = useState('');
  const [addMode, setAddMode] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCrop, setNewCrop] = useState('블루베리');
  const [newArea, setNewArea] = useState('');
  const [saving, setSaving] = useState(false);

  const loadFarms = async () => {
    if (!userId) return;
    const { data } = await supabase.from('farms').select('id, name, crop_type, area_sqm').eq('user_id', userId);
    setFarms(data ?? []);
    setLoading(false);
  };

  useEffect(() => { loadFarms(); }, [userId]);

  const startEdit = (farm: Farm) => {
    setEditId(farm.id); setEditName(farm.name); setEditCrop(farm.crop_type);
    setEditArea(farm.area_sqm?.toString() ?? '');
  };

  const saveEdit = async () => {
    if (!editId || !editName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('farms').update({
      name: editName.trim(), crop_type: editCrop.trim(),
      area_sqm: editArea ? parseFloat(editArea) : null,
    }).eq('id', editId);
    if (error) Alert.alert('저장 실패', error.message);
    else { setEditId(null); await loadFarms(); }
    setSaving(false);
  };

  const addFarm = async () => {
    if (!userId || !newName.trim()) { Alert.alert('입력 오류', '농장 이름을 입력하세요.'); return; }
    setSaving(true);
    const { error } = await supabase.from('farms').insert({
      user_id: userId, name: newName.trim(), crop_type: newCrop.trim() || '블루베리',
      area_sqm: newArea ? parseFloat(newArea) : null,
    });
    if (error) Alert.alert('저장 실패', error.message);
    else { setAddMode(false); setNewName(''); setNewCrop('블루베리'); setNewArea(''); await loadFarms(); }
    setSaving(false);
  };

  return (
    <SafeAreaView style={pageStyles.container}>
      <View style={pageStyles.subHeader}>
        <TouchableOpacity onPress={onBack}><Text style={pageStyles.backBtn}>←</Text></TouchableOpacity>
        <Text style={pageStyles.subTitle}>⚙️ 농장 설정</Text>
        <TouchableOpacity onPress={() => setAddMode(true)}>
          <Text style={pageStyles.addBtnText}>+ 추가</Text>
        </TouchableOpacity>
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
                      <TextInput style={pageStyles.settingInput} value={editArea} onChangeText={setEditArea} keyboardType="decimal-pad" placeholder="선택사항" placeholderTextColor={Colors.textLight} />
                    </SettingField>
                    <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
                      <Button title="저장" onPress={saveEdit} loading={saving} style={{ flex: 1 }} />
                      <TouchableOpacity style={pageStyles.cancelBtn} onPress={() => setEditId(null)}>
                        <Text style={pageStyles.cancelBtnText}>취소</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                      <Text style={Typography.bodyBold}>{farm.name}</Text>
                      <Text style={Typography.caption}>{farm.crop_type}{farm.area_sqm ? ` · ${farm.area_sqm}㎡` : ''}</Text>
                    </View>
                    <TouchableOpacity onPress={() => startEdit(farm)} style={pageStyles.editBtn}>
                      <Text style={pageStyles.editBtnText}>수정</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </Card>
            ))}

            {addMode && (
              <Card style={{ margin: Spacing.lg, marginBottom: 0, borderWidth: 1, borderColor: Colors.primary }}>
                <Text style={[Typography.bodyBold, { marginBottom: Spacing.md }]}>새 농장 추가</Text>
                <SettingField label="농장 이름 *">
                  <TextInput style={pageStyles.settingInput} value={newName} onChangeText={setNewName} placeholder="예) 1번 밭" placeholderTextColor={Colors.textLight} />
                </SettingField>
                <SettingField label="작물">
                  <TextInput style={pageStyles.settingInput} value={newCrop} onChangeText={setNewCrop} />
                </SettingField>
                <SettingField label="면적 (㎡)">
                  <TextInput style={pageStyles.settingInput} value={newArea} onChangeText={setNewArea} keyboardType="decimal-pad" placeholder="선택사항" placeholderTextColor={Colors.textLight} />
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
                <Text style={{ fontSize: 48 }}>🌾</Text>
                <Text style={[Typography.body, { color: Colors.textSub, marginTop: Spacing.md }]}>등록된 농장이 없습니다</Text>
                <TouchableOpacity style={pageStyles.emptyAddBtn} onPress={() => setAddMode(true)}>
                  <Text style={pageStyles.emptyAddBtnText}>+ 농장 추가하기</Text>
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
