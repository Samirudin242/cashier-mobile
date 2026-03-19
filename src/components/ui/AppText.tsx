import React from 'react';
import { Text, TextStyle, TextProps, StyleProp } from 'react-native';
import { typography } from '../../config/theme';

type Variant = keyof typeof typography;

interface Props extends TextProps {
  variant?: Variant;
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
}

export function AppText({ variant = 'body', style, children, ...props }: Props) {
  return (
    <Text style={[typography[variant], style as TextStyle]} {...props}>
      {children}
    </Text>
  );
}
