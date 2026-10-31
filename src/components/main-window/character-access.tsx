import { createContext, useContext } from 'react';
import {
  Pressable as NativePressable,
  TextInput as NativeTextInput,
  Switch as NativeSwitch,
  type PressableProps,
  type TextInputProps,
  type SwitchProps,
} from 'react-native';

export const CharacterReadOnlyContext = createContext(false);
export const useCharacterReadOnly = () => useContext(CharacterReadOnlyContext);

export function CharacterPressable({
  allowReadOnly = false,
  disabled,
  ...props
}: PressableProps & { allowReadOnly?: boolean }) {
  const readOnly = useCharacterReadOnly();
  return (
    <NativePressable
      {...props}
      disabled={disabled || (readOnly && !allowReadOnly)}
    />
  );
}
export function CharacterTextInput({ editable, ...props }: TextInputProps) {
  const readOnly = useCharacterReadOnly();
  return (
    <NativeTextInput {...props} editable={!readOnly && editable !== false} />
  );
}
export function CharacterSwitch({ disabled, ...props }: SwitchProps) {
  const readOnly = useCharacterReadOnly();
  return <NativeSwitch {...props} disabled={disabled || readOnly} />;
}
