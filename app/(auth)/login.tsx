import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('입력 오류', '이메일과 비밀번호를 입력하세요.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) Alert.alert('로그인 실패', error.message);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <LinearGradient
          colors={[Colors.primaryUltraLight, Colors.background]}
          style={styles.header}
        >
          <Text style={styles.logo}>🫐</Text>
          <Text style={styles.appName}>농장관리</Text>
          <Text style={styles.tagline}>스마트한 농장 관리의 시작</Text>
        </LinearGradient>

        <View style={styles.form}>
          <Text style={styles.label}>이메일</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="farm@example.com"
            placeholderTextColor={Colors.textLight}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>비밀번호</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="비밀번호 입력"
            placeholderTextColor={Colors.textLight}
            secureTextEntry
          />

          <Button
            title="로그인"
            onPress={handleLogin}
            loading={loading}
            style={{ marginTop: Spacing.md }}
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>또는</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button
            title="회원가입"
            onPress={() => router.push('/(auth)/register')}
            variant="outline"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1 },
  header: {
    alignItems: 'center',
    paddingTop: 100,
    paddingBottom: 48,
  },
  logo: { fontSize: 64 },
  appName: { fontSize: 32, fontWeight: '800', color: Colors.primaryDark, marginTop: 12 },
  tagline: { ...Typography.body, color: Colors.textSub, marginTop: 8 },
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { ...Typography.caption, marginHorizontal: Spacing.sm },
});
