import { useContext } from 'react';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';

/**
 * Like useBottomTabBarHeight but returns 0 when not inside a bottom tab navigator
 * (e.g. CheckoutStack opened as a root stack screen for owner).
 */
export function useOptionalBottomTabBarHeight(): number {
  const height = useContext(BottomTabBarHeightContext);
  return height ?? 0;
}
