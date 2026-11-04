import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { Sketch } from './Sketch';

export type Toast = { id: number; text: string };

const NATIVE = Platform.OS !== 'web';

/**
 * Bout de papier scotché qui tombe à l'écran, reste un moment, puis s'envole.
 * Chaque nouveau toast (nouvel id) relance l'animation.
 */
export function PaperToast({ toast, font, maxWidth, top }: { toast: Toast | null; font: string; maxWidth: number; top: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [current, setCurrent] = useState<Toast | null>(null);

  useEffect(() => {
    if (!toast) return;
    setCurrent(toast);
    anim.setValue(0);
    const run = Animated.sequence([
      Animated.spring(anim, { toValue: 1, friction: 5, tension: 60, useNativeDriver: NATIVE }),
      Animated.delay(2300),
      Animated.timing(anim, { toValue: 2, duration: 420, easing: Easing.in(Easing.quad), useNativeDriver: NATIVE }),
    ]);
    run.start(({ finished }) => finished && setCurrent(null));
    return () => run.stop();
  }, [toast, anim]);

  if (!current) return null;

  // Chaque papier a sa propre inclinaison
  const tilt = ((current.id * 37) % 7) - 3;
  const style = {
    opacity: anim.interpolate({ inputRange: [0, 0.25, 1.6, 2], outputRange: [0, 1, 1, 0], extrapolate: 'clamp' }),
    transform: [
      { translateY: anim.interpolate({ inputRange: [0, 1, 2], outputRange: [-160, 0, -40] }) },
      { translateX: anim.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 0, tilt >= 0 ? 160 : -160] }) },
      { rotate: anim.interpolate({ inputRange: [0, 1, 2], outputRange: [`${tilt - 16}deg`, `${tilt}deg`, `${tilt * 4 + 18}deg`] }) },
    ],
  };

  return (
    <View pointerEvents="none" style={[styles.layer, { paddingTop: top }]}>
      <Animated.View style={[styles.paper, { maxWidth }, style]}>
        <Sketch fill="#FFFBF0" shadow seed={current.id * 13 + 5} strokeWidth={2.5} jitter={1.6} />
        {/* Morceau de scotch */}
        <View style={styles.tape} />
        <Text style={[styles.text, { fontFamily: font }]}>« {current.text} »</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFill, alignItems: 'center' },
  paper: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 16 },
  tape: {
    position: 'absolute',
    top: -9,
    alignSelf: 'center',
    width: 74,
    height: 20,
    backgroundColor: 'rgba(240, 214, 120, 0.75)',
    transform: [{ rotate: '-4deg' }],
  },
  text: { fontSize: 23, color: '#1C1714', textAlign: 'center' },
});
