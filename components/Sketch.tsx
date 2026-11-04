import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

// Petit générateur pseudo-aléatoire : même graine = même tremblement à chaque rendu
function rng(seed: number) {
  let a = seed * 2654435761;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Pt = [number, number];

// Rectangle "dessiné au feutre" : des points le long des bords, décalés au hasard,
// reliés par des courbes. Les coins s'arrondissent tout seuls.
function wobblyRect(x: number, y: number, w: number, h: number, seed: number, jitter: number): string {
  const rand = rng(seed);
  const j = () => (rand() - 0.5) * 2 * jitter;
  const pts: Pt[] = [];
  const edge = (x1: number, y1: number, x2: number, y2: number) => {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.max(2, Math.round(len / 38));
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      pts.push([x1 + (x2 - x1) * t + j(), y1 + (y2 - y1) * t + j()]);
    }
  };
  edge(x, y, x + w, y);
  edge(x + w, y, x + w, y + h);
  edge(x + w, y + h, x, y + h);
  edge(x, y + h, x, y);

  const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const f = (n: number) => n.toFixed(1);
  const start = mid(pts[pts.length - 1], pts[0]);
  let d = `M${f(start[0])},${f(start[1])}`;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const m = mid(p, pts[(i + 1) % pts.length]);
    d += ` Q${f(p[0])},${f(p[1])} ${f(m[0])},${f(m[1])}`;
  }
  return d + ' Z';
}

type SketchProps = {
  fill?: string;
  stroke?: string | null;
  strokeWidth?: number;
  /** Ombre "BD" décalée en bas à droite */
  shadow?: boolean;
  seed?: number;
  jitter?: number;
};

/**
 * Fond + contour dessinés à la main. À mettre en premier enfant d'une View :
 * il remplit son parent et passe derrière le contenu.
 */
export function Sketch({ fill = 'transparent', stroke = '#1C1714', strokeWidth = 3, shadow = false, seed = 1, jitter = 1.8 }: SketchProps) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const pad = strokeWidth / 2 + jitter;
  const off = shadow ? 4 : 0;

  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={(e) => {
        const { width: w, height: h } = e.nativeEvent.layout;
        if (Math.abs(w - size.w) > 0.5 || Math.abs(h - size.h) > 0.5) setSize({ w, h });
      }}
    >
      {size.w > 0 && (
        <Svg width={size.w + off} height={size.h + off} style={{ position: 'absolute', left: 0, top: 0 }}>
          {shadow && (
            <Path d={wobblyRect(pad + 4, pad + 4, size.w - 2 * pad - 1, size.h - 2 * pad - 1, seed, jitter)} fill={stroke ?? '#1C1714'} />
          )}
          <Path
            d={wobblyRect(pad, pad, size.w - 2 * pad, size.h - 2 * pad, seed, jitter)}
            fill={fill}
            stroke={stroke ?? 'none'}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          {/* Deuxième passage sur le même tracé, à peine décalé : le trait s'épaissit
              par endroits comme un feutre, sans jamais se dédoubler */}
          {stroke && (
            <Path
              d={wobblyRect(pad + 0.7, pad + 0.5, size.w - 2 * pad, size.h - 2 * pad, seed, jitter)}
              fill="none"
              stroke={stroke}
              strokeWidth={strokeWidth * 0.8}
              strokeLinejoin="round"
            />
          )}
        </Svg>
      )}
    </View>
  );
}

/** Trait vertical tremblé, pour séparer deux colonnes */
export function SketchLineV({ color = '#1C1714', width = 3, seed = 3 }: { color?: string; width?: number; seed?: number }) {
  const [h, setH] = useState(0);
  const rand = rng(seed);
  let d = '';
  if (h > 0) {
    const steps = Math.max(2, Math.round(h / 45));
    d = `M${(3 + (rand() - 0.5) * 2).toFixed(1)},0`;
    for (let i = 1; i <= steps; i++) {
      const y = (h * i) / steps;
      const cx = 3 + (rand() - 0.5) * 4;
      d += ` Q${cx.toFixed(1)},${(y - h / steps / 2).toFixed(1)} ${(3 + (rand() - 0.5) * 2).toFixed(1)},${y.toFixed(1)}`;
    }
  }
  return (
    <View pointerEvents="none" style={{ width: 6, alignSelf: 'stretch' }} onLayout={(e) => setH(e.nativeEvent.layout.height)}>
      {h > 0 && (
        <Svg width={6} height={h}>
          <Path d={d} stroke={color} strokeWidth={width} fill="none" strokeLinecap="round" />
        </Svg>
      )}
    </View>
  );
}
