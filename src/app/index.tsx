import { router } from 'expo-router';
import { useState } from 'react';
import { Keyboard } from 'react-native';

import { useSession } from '@/auth/session-context';
import {
  AuthButton,
  AuthError,
  AuthField,
  AuthLink,
  AuthScreen,
  RememberMe,
} from '@/components/auth/auth-screen';

export default function LoginScreen() {
  const { signIn } = useSession();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    if (!username.trim() || !password) {
      setError('Enter your username or email and password.');
      return;
    }

    Keyboard.dismiss();
    setBusy(true);
    setError('');

    try {
      await signIn(username.trim(), password, rememberMe);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreen
      title="Welcome back"
      description="Sign in to continue to your characters and games."
    >
      <AuthField
        label="Username or email"
        accessibilityLabel="Username or email"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        returnKeyType="next"
        value={username}
        onChangeText={setUsername}
        placeholder="Enter your username or email"
      />
      <AuthField
        label="Password"
        accessibilityLabel="Password"
        secureTextEntry
        autoComplete="current-password"
        returnKeyType="done"
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={() => void submit()}
        placeholder="Enter your password"
      />
      <RememberMe value={rememberMe} onChange={setRememberMe} />
      <AuthError message={error} />
      <AuthButton title="Sign in" busy={busy} onPress={() => void submit()} />
      <AuthLink
        title="Create an account"
        onPress={() => router.push('/register')}
      />
    </AuthScreen>
  );
}
