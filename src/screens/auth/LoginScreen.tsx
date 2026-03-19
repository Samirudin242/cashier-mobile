import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Store, KeyRound, LogIn } from 'lucide-react-native';
import { AppScreen, AppCard, AppButton, AppInput, AppText } from '../../components/ui';
import { useAuthStore } from '../../stores/authStore';
import { colors, spacing, radius } from '../../config/theme';

export function LoginScreen() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const loginWithCode = useAuthStore((s) => s.loginWithCode);

  const handleLogin = async () => {
    if (!code.trim()) return;
    setError('');
    setLoading(true);
    try {
      const result = await loginWithCode(code);
      if (!result.success) {
        setError(result.error ?? 'Login failed');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen scroll padded>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Store size={36} color={colors.primary} />
          </View>
          <AppText variant="titleLarge" style={styles.title}>Cashier POS</AppText>
          <AppText variant="caption" style={styles.subtitle}>
            Enter your access code to sign in
          </AppText>
        </View>

        <AppCard style={styles.form}>
          <AppInput
            label="Access Code"
            placeholder="Enter your code"
            value={code}
            onChangeText={(v) => { setCode(v); setError(''); }}
            autoCapitalize="characters"
            autoCorrect={false}
            icon={<KeyRound size={18} color={colors.textMuted} />}
            error={error || undefined}
          />

          <AppButton
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            disabled={!code.trim()}
            fullWidth
            size="lg"
            icon={<LogIn size={18} color={colors.textInverse} />}
            style={styles.loginButton}
          />
        </AppCard>

        <AppText variant="captionMuted" style={styles.footer}>
          Your access code determines your role in the app.{'\n'}
          Session persists until you manually logout.
        </AppText>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: spacing.xxxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.base,
  },
  title: {
    marginTop: spacing.sm,
  },
  subtitle: {
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  form: {
    padding: spacing.lg,
  },
  loginButton: {
    marginTop: spacing.sm,
  },
  footer: {
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 20,
  },
});
