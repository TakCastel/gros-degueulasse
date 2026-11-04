import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Sketch } from './Sketch';

export type Toast = { id: number; text: string };

const NATIVE = Platform.OS !== 'web';

/**
 * Bout de papier qu'on fait glisser sur la table : arrive du bord droit, reste un moment, puis repart.
 * Chaque nouveau toast (nouvel id) relance l'animation.
 */
export function PaperToast({ toast, font, maxWidth, top }: { toast: Toast | null; font: string; maxWidth: number; top: number }) {
  const { width } = useWindowDimensions();
  const anim = useRef(new Animated.Value(0)).current;
  const [current, setCurrent] = useState<Toast | null>(null);

  useEffect(() => {
    if (!toast) return;
    setCurrent(toast);
    anim.setValue(0);
    const run = Animated.sequence([
      // Poussé sur la table : arrive vite du bord droit et ralentit par frottement
      Animated.timing(anim, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: NATIVE }),
      Animated.delay(2200),
      // Repart par le même côté en accélérant
      Animated.timing(anim, { toValue: 2, duration: 380, easing: Easing.in(Easing.cubic), useNativeDriver: NATIVE }),
    ]);
    run.start(({ finished }) => finished && setCurrent(null));
    return () => run.stop();
  }, [toast, anim]);

  if (!current) return null;

  // Chaque papier a sa propre inclinaison
  const tilt = ((current.id * 37) % 7) - 3;
  const away = width / 2 + maxWidth;
  const style = {
    transform: [
      { translateX: anim.interpolate({ inputRange: [0, 1, 2], outputRange: [away, 0, away] }) },
      // Le papier pivote un peu en glissant, puis se stabilise
      { rotate: anim.interpolate({ inputRange: [0, 1, 2], outputRange: [`${tilt + 10}deg`, `${tilt}deg`, `${tilt + 8}deg`] }) },
    ],
  };

  return (
    <View pointerEvents="none" style={[styles.layer, { paddingTop: top }]}>
      <Animated.View style={[styles.paper, { maxWidth }, style]}>
        <Sketch fill="#FFFBF0" shadow seed={current.id * 13 + 5} strokeWidth={2.5} jitter={1.6} />
        <Text style={[styles.text, { fontFamily: font }]}>« {current.text} »</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFill, alignItems: 'center', overflow: 'hidden' },
  paper: { paddingHorizontal: 22, paddingVertical: 16 },
  text: { fontSize: 23, color: '#1C1714', textAlign: 'center' },
});
