import { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { PhIcon } from '../ui/PhIcon';
import { Colors, Spacing } from '../../constants/theme';
import { pageStyles, SettingField } from './shared';
import { RegionSelectorModal } from '../modals/RegionSelectorModal';

interface Props {
  onBack: () => void;
  userId?: string;
}

export function ProfileEditPage({ onBack, userId }: Props) {
  const [name, setName] = useState('');
  const [region, setRegion] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showRegionSelector, setShowRegionSelector] = useState(false);

  useEffect(() => {
    if (!userId) return;
    supabase.from('profiles').select('name, region, email').eq('id', userId).single()
      .then(({ data }) => {
        if (data) { setName(data.name ?? ''); setRegion(data.region ?? ''); setEmail(data.email ?? ''); }
        setLoading(false);
      });
  }, [userId]);

  const save = async () => {
    if (!userId || !name.trim()) { Alert.alert('입력 오류', '이름을 입력해주세요.'); return; }
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ name: name.trim(), region: region.trim() }).eq('id', userId);
    if (error) Alert.alert('저장 실패', error.message);
    else Alert.alert('저장 완료', '프로필이 업데이트되었습니다.');
    setSaving(false);
  };

  return (
    <SafeAreaView style={pageStyles.container}>
      <View style={pageStyles.subHeader}>
        <TouchableOpacity onPress={onBack}><Text style={pageStyles.backBtn}>←</Text></TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <PhIcon name="user" size={20} color={Colors.text} />
          <Text style={pageStyles.subTitle}>프로필 수정</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>
      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={pageStyles.scroll} keyboardShouldPersistTaps="handled">
          <Card style={{ margin: Spacing.lg }}>
            <SettingField label="이메일 (변경 불가)">
              <Text style={[pageStyles.settingInput, { color: Colors.textSub, paddingTop: 14 }]}>{email}</Text>
            </SettingField>
            <SettingField label="이름 *">
              <TextInput style={pageStyles.settingInput} value={name} onChangeText={setName} placeholder="이름 입력" placeholderTextColor={Colors.textLight} />
            </SettingField>
            <SettingField label="지역">
              <TouchableOpacity onPress={() => setShowRegionSelector(true)}>
                <View style={[pageStyles.settingInput, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                  <Text style={{ color: region ? Colors.text : Colors.textLight, fontSize: 15, flex: 1 }}>
                    {region || '지역 선택 (예: 경기도 화성시)'}
                  </Text>
                  <Text style={{ color: Colors.textSub, fontSize: 14 }}>▾</Text>
                </View>
              </TouchableOpacity>
            </SettingField>
            <Button title="저장" onPress={save} loading={saving} style={{ marginTop: Spacing.md }} />
          </Card>
        </ScrollView>
      )}
      <RegionSelectorModal
        visible={showRegionSelector}
        value={region}
        onSelect={setRegion}
        onClose={() => setShowRegionSelector(false)}
      />
    </SafeAreaView>
  );
}
