import { Text, View } from 'react-native';
import Svg, { ClipPath, Defs, Path, Rect } from 'react-native-svg';
import { wobblyRect } from './Sketch';

const INK = '#1C1714';
const W = 100;
const H = 86;

/** Petit calendrier à spirale dessiné à la main, avec l'année dessus */
export function CalendarBadge({ year, font, red, cream = '#FFF7E8' }: { year: number; font: string; red: string; cream?: string }) {
  const top = 12; // haut du calendrier (les anneaux dépassent au-dessus)
  const band = 30; // fin de la bande rouge
  const body = wobblyRect(3, top, W - 8, H - top - 6, 9, 1.4);

  return (
    <View style={{ width: W, height: H, transform: [{ rotate: '-4deg' }] }}>
      <Svg width={W} height={H} style={{ position: 'absolute' }}>
        {/* Ombre décalée */}
        <Path d={wobblyRect(7, top + 4, W - 8, H - top - 6, 9, 1.4)} fill={INK} />
        {/* Corps rouge, puis la page crème par-dessus sous la bande */}
        <Path d={body} fill={red} />
        <Defs>
          <ClipPath id="calendar-body">
            <Path d={body} />
          </ClipPath>
        </Defs>
        <Rect x={0} y={band} width={W} height={H - band} fill={cream} clipPath="url(#calendar-body)" />
        {/* Trait sous la bande rouge */}
        <Path d={`M5,${band} Q${W / 3},${band - 1.5} ${W / 2},${band + 0.5} T${W - 6},${band - 0.5}`} stroke={INK} strokeWidth={2.5} fill="none" strokeLinecap="round" />
        {/* Contour au feutre, en deux passages */}
        <Path d={body} fill="none" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        <Path d={wobblyRect(3.6, top + 0.5, W - 8, H - top - 6, 9, 1.4)} fill="none" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
        {/* Anneaux de la spirale */}
        {[24, 48, 72].map((x) => (
          <Rect key={x} x={x - 3.5} y={3} width={7} height={16} rx={3.5} fill={cream} stroke={INK} strokeWidth={2.5} />
        ))}
      </Svg>
      <View style={{ position: 'absolute', top: band + 2, left: 0, right: 4, bottom: 6, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: font, fontSize: 25, color: INK, paddingTop: 4 }}>{year}</Text>
      </View>
    </View>
  );
}
