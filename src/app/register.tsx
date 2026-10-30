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

export default function RegisterScreen() {
  const { signUp } = useSession();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    const cleanUsername = username.trim();
    const cleanEmail = email.trim();

    if (!cleanUsername || !cleanEmail || !password) {
      setError('Complete each field to create your account.');
      return;
    }
    if (!/^[A-Za-z0-9_]{3,50}$/.test(cleanUsername)) {
      setError('Usernames must be 3 to 50 letters, numbers, or underscores.');
      return;
    }
    if (
      cleanEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
    ) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 12 || password.length > 128) {
      setError('Your password must contain 12 to 128 characters.');
      return;
    }

    Keyboard.dismiss();
    setBusy(true);
    setError('');

    try {
      await signUp(
        {
          username: cleanUsername,
          email: cleanEmail,
          password,
        },
        rememberMe,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create your account.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreen
      title="Create your account"
      description="Create an account to manage your characters and join games."
    >
      <AuthField
        label="Username"
        accessibilityLabel="Username"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        value={username}
        onChangeText={setUsername}
        placeholder="Choose a username"
      />
      <AuthField
        label="Email"
        accessibilityLabel="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
      />
      <AuthField
        label="Password"
        accessibilityLabel="Password"
        secureTextEntry
        autoComplete="new-password"
        returnKeyType="done"
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={() => void submit()}
        placeholder="At least 12 characters"
      />
      <RememberMe value={rememberMe} onChange={setRememberMe} />
      <AuthError message={error} />
      <AuthButton title="Create account" busy={busy} onPress={() => void submit()} />
      <AuthLink
        title="I already have an account"
        onPress={() => router.replace('/')}
      />
    </AuthScreen>
  );
}
