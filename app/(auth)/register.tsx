import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [region, setRegion] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password || !region) {
      Alert.alert('입력 오류', '모든 항목을 입력하세요.');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) { Alert.alert('회원가입 실패', error.message); setLoading(false); return; }

    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        name,
        region,
        email,
      });
    }
    setLoading(false);
    Alert.alert('가입 완료', '이메일 인증 후 로그인하세요.', [
      { text: '확인', onPress: () => router.back() },
    ]);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.back}>← 뒤로</Text>
          </TouchableOpacity>
          <Text style={styles.title}>회원가입</Text>
          <View style={{ width: 48 }} />
        </View>

        <View style={styles.form}>
          {[
            { label: '이름', value: name, setter: setName, placeholder: '홍길동' },
            { label: '이메일', value: email, setter: setEmail, placeholder: 'farm@example.com', keyboard: 'email-address' as const },
            { label: '비밀번호 (8자 이상)', value: password, setter: setPassword, placeholder: '비밀번호', secure: true },
            { label: '활동 지역', value: region, setter: setRegion, placeholder: '예) 충청남도 예산군' },
          ].map((field) => (
            <View key={field.label}>
              <Text style={styles.label}>{field.label}</Text>
              <TextInput
                style={styles.input}
                value={field.value}
                onChangeText={field.setter}
                placeholder={field.placeholder}
                placeholderTextColor={Colors.textLight}
                keyboardType={field.keyboard ?? 'default'}
                secureTextEntry={field.secure}
                autoCapitalize="none"
              />
            </View>
          ))}

          <Button title="가입하기" onPress={handleRegister} loading={loading} style={{ marginTop: Spacing.lg }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  back: { color: Colors.primary, fontSize: 16, fontWeight: '600' },
  title: { ...Typography.h3 },
  form: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  label: { ...Typography.label, marginBottom: Spacing.xs, marginTop: Spacing.md },
  input: {
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    padding: 14,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
