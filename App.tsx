import { useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Image,
  type ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  AppState,
  useWindowDimensions,
  type ScrollViewInstance,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import { LuckiestGuy_400Regular } from '@expo-google-fonts/luckiest-guy';
import { Kalam_700Bold } from '@expo-google-fonts/kalam';
import { Sketch, SketchLineV } from './components/Sketch';
import { PaperToast, type Toast } from './components/PaperToast';
import { ANNULATIONS, QUESTIONS, SOUS_TITRES, SURNOMS, VANNES, pick, verdictTextes } from './wording';

// ---------- Les vices ----------

type ViceId = 'biere' | 'vin' | 'cocktail' | 'clope' | 'bouffe' | 'paris';

type Vice = {
  id: ViceId;
  emoji: string;
  label: string;
  color: [number, number, number];
};

const ORANGE: [number, number, number] = [235, 120, 20];

const VICES: Vice[] = [
  {
    id: 'biere',
    emoji: '🍺',
    label: 'Bière',
    color: ORANGE,
  },
  {
    id: 'vin',
    emoji: '🍷',
    label: 'Vin',
    color: ORANGE,
  },
  {
    id: 'cocktail',
    emoji: '🍹',
    label: 'Cocktail',
    color: ORANGE,
  },
  {
    id: 'clope',
    emoji: '🚬',
    label: 'Clope',
    color: [110, 62, 25],
  },
  {
    id: 'bouffe',
    emoji: '🍔',
    label: 'Bouffe sale',
    color: [200, 25, 25],
  },
  {
    id: 'paris',
    emoji: '🎰',
    label: 'Paris sportifs',
    // Caca d'oie, la couleur officielle du ticket perdant
    color: [138, 150, 30],
  },
];

const VICE_BY_ID = Object.fromEntries(VICES.map((v) => [v.id, v])) as Record<ViceId, Vice>;

type DayCounts = Partial<Record<ViceId, number>>;
type Journal = Record<string, DayCounts>;

const STORAGE_KEY = 'gros-degueulasse:v1';

// ---------- Dates ----------

const pad = (n: number) => String(n).padStart(2, '0');
const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d: Date, n: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};
// Lundi = 0
const weekdayIndex = (d: Date) => (d.getDay() + 6) % 7;

const MOIS = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];
const MOIS_COURTS = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛT', 'SEP', 'OCT', 'NOV', 'DÉC'];
const JOURS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

// ---------- Couleurs ----------

const PAPER_BG = '#FBEDD6';
const INK = '#1C1714';
const YELLOW = '#F8D33A';
const RED = '#E4483A';
// Rouge plus clair pour l'étiquette : le texte noir se lit mieux dessus
const STICKER_RED = '#F2705C';
const EMPTY: [number, number, number] = [214, 201, 181];
const EMPTY_CELL = `rgb(${EMPTY.join(',')})`;

const total = (c: DayCounts | undefined) =>
  c ? Object.values(c).reduce((a, b) => a + (b ?? 0), 0) : 0;

// Mélange les couleurs des vices au prorata, puis plus il y en a, plus c'est foncé
function dayColor(counts: DayCounts | undefined): string {
  const n = total(counts);
  if (!counts || n === 0) return EMPTY_CELL;

  let r = 0, g = 0, b = 0;
  for (const [id, count] of Object.entries(counts)) {
    if (!count) continue;
    const [cr, cg, cb] = VICE_BY_ID[id as ViceId].color;
    r += cr * count;
    g += cg * count;
    b += cb * count;
  }
  r /= n; g /= n; b /= n;

  // 1 vice : couleur pâle, puis ça s'intensifie jusqu'à 4
  const alpha = Math.min(1, 0.45 + 0.18 * (n - 1));
  r = EMPTY[0] + (r - EMPTY[0]) * alpha;
  g = EMPTY[1] + (g - EMPTY[1]) * alpha;
  b = EMPTY[2] + (b - EMPTY[2]) * alpha;

  // Au-delà de 4, ça tourne au bordeaux de la honte
  const darken = Math.max(0.35, 1 - 0.1 * Math.max(0, n - 4));
  return `rgb(${Math.round(r * darken)}, ${Math.round(g * darken)}, ${Math.round(b * darken)})`;
}

// ---------- Verdict ----------

// Séries de jours "sales" (au moins un vice). Une journée vide en cours ne casse pas la série.
function streaks(journal: Journal, today: Date) {
  const keys = Object.keys(journal).sort();
  if (keys.length === 0) return { current: 0, best: 0 };

  let best = 0;
  let run = 0;
  for (let d = new Date(keys[0] + 'T12:00:00'); d <= today; d = addDays(d, 1)) {
    run = total(journal[toKey(d)]) > 0 ? run + 1 : 0;
    best = Math.max(best, run);
  }

  let current = 0;
  let d = total(journal[toKey(today)]) > 0 ? today : addDays(today, -1);
  while (total(journal[toKey(d)]) > 0) {
    current++;
    d = addDays(d, -1);
  }
  return { current, best };
}

const jours = (n: number) => `${n} jour${n > 1 ? 's' : ''}`;

// ---------- App ----------

export default function App() {
  const [fontsLoaded, fontError] = useFonts({ LuckiestGuy_400Regular, Kalam_700Bold });
  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, backgroundColor: PAPER_BG }} />;
  return (
    <SafeAreaProvider>
      <Main />
    </SafeAreaProvider>
  );
}

// Icônes dessinées, découpées de la maquette
const ICONS: Record<ViceId, ImageSourcePropType> = {
  biere: require('./assets/vices/biere.png'),
  vin: require('./assets/vices/vin.png'),
  cocktail: require('./assets/vices/cocktail.png'),
  clope: require('./assets/vices/clope.png'),
  bouffe: require('./assets/vices/bouffe.png'),
  paris: require('./assets/vices/paris.png'),
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function Main() {
  const { width, height } = useWindowDimensions();
  // Téléphone : tout est réduit, mais on garde calendrier à gauche et boutons à droite
  const compact = width < 700 || height < 520;
  const [journal, setJournal] = useState<Journal>({});
  const [loaded, setLoaded] = useState(false);
  const today = useMemo(() => new Date(), []);
  const todayKey = toKey(today);
  const [selected, setSelected] = useState(todayKey);
  const [toast, setToast] = useState<Toast | null>(null);
  // Nouvelle graine à chaque ouverture et à chaque retour dans l'app : les textes changent
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e6));
  useEffect(() => {
    let prev = AppState.currentState;
    const sub = AppState.addEventListener('change', (next) => {
      if (prev !== 'active' && next === 'active') setSeed(Math.floor(Math.random() * 1e6));
      prev = next;
    });
    return () => sub.remove();
  }, []);
  const [gridArea, setGridArea] = useState({ w: 0, h: 0 });
  const gridScroll = useRef<ScrollViewInstance>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => raw && setJournal(JSON.parse(raw)))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(journal)).catch(() => {});
  }, [journal, loaded]);

  const bump = (id: ViceId, delta: 1 | -1) => {
    setJournal((j) => {
      const day = { ...(j[selected] ?? {}) };
      const next = Math.max(0, (day[id] ?? 0) + delta);
      if (next === 0) delete day[id];
      else day[id] = next;
      const copy = { ...j };
      if (Object.keys(day).length === 0) delete copy[selected];
      else copy[selected] = day;
      return copy;
    });
    const list = delta > 0 ? VANNES[id] : ANNULATIONS;
    const text = list[Math.floor(Math.random() * list.length)];
    setToast((t) => ({ id: (t?.id ?? 0) + 1, text }));
  };

  // Année en cours, découpée en semaines (lundi → dimanche)
  const year = today.getFullYear();
  const weeks = useMemo(() => {
    const jan1 = new Date(year, 0, 1, 12);
    const start = addDays(jan1, -weekdayIndex(jan1));
    const out: Date[][] = [];
    for (let w = start; w.getFullYear() <= year; w = addDays(w, 7)) {
      out.push(Array.from({ length: 7 }, (_, d) => addDays(w, d)));
    }
    return out;
  }, [year]);
  const todayWeek = weeks.findIndex((w) => w.some((d) => toKey(d) === todayKey));

  const score7 = useMemo(() => {
    let s = 0;
    for (let i = 0; i < 7; i++) s += total(journal[toKey(addDays(today, -i))]);
    return s;
  }, [journal, today]);

  const { current, best } = useMemo(() => streaks(journal, today), [journal, today]);

  // ----- Taille du calendrier, calculée sur la place réellement dispo -----
  const GAP = compact ? 2 : 3;
  const LABEL_W = compact ? 16 : 22;
  const HEAD_H = compact ? 16 : 22;
  const fitW = (gridArea.w - LABEL_W - GAP * (weeks.length - 1)) / weeks.length;
  const fitH = (gridArea.h - HEAD_H - GAP * 6) / 7;
  const yearCell = Math.floor(Math.min(fitW, fitH, 24));
  // Si l'année entière ne rentre pas en largeur, on passe en vertical (une ligne par semaine)
  const horizontal = yearCell >= 8;
  const MONTH_W = compact ? 30 : 40;
  const vCell = Math.floor(clamp((gridArea.w - MONTH_W - GAP * 6) / 7, 8, 34));
  const cell = horizontal ? yearCell : vCell;

  useEffect(() => {
    if (horizontal || gridArea.h === 0) return;
    const t = setTimeout(() => {
      gridScroll.current?.scrollTo({ y: Math.max(0, todayWeek * (cell + GAP) - gridArea.h / 2), animated: false });
    }, 50);
    return () => clearTimeout(t);
  }, [horizontal, gridArea.h, cell, GAP, todayWeek]);

  const selectedDate = new Date(selected + 'T12:00:00');
  const selectedLabel =
    selected === todayKey ? "aujourd'hui" : `le ${selectedDate.getDate()} ${MOIS[selectedDate.getMonth()]}`;
  const selectedCounts = journal[selected];

  const sousTitre = pick(SOUS_TITRES, seed, 2);
  const question = pick(QUESTIONS, seed, 3).replace('{jour}', selectedLabel).replace('{nom}', pick(SURNOMS, seed, 4));
  const longQuestion = question.length > 42;

  const sidebarW = compact ? clamp(width * 0.36, 118, 180) : clamp(width * 0.24, 230, 320);
  const leftW = width - sidebarW - (compact ? 24 : 72);
  const titleSize = compact ? clamp(leftW / 13, 16, 22) : clamp(leftW / 21, 26, 46);
  const mascotH = compact ? clamp(height * 0.1, 56, 84) : clamp(height * 0.2, 110, 190);

  const renderCell = (d: Date) => {
    const key = toKey(d);
    const outside = d.getFullYear() !== year;
    const future = d > today && key !== todayKey;
    return (
      <Pressable
        key={key}
        disabled={outside || future}
        onPress={() => setSelected(key)}
        style={[
          styles.cell,
          {
            width: cell,
            height: cell,
            backgroundColor: outside ? 'transparent' : dayColor(journal[key]),
            opacity: future ? 0.45 : 1,
          },
          key === todayKey && styles.cellToday,
          key === selected && styles.cellSelected,
          cell < 12 && { borderWidth: key === selected || key === todayKey ? 1.5 : 0 },
        ]}
      />
    );
  };

  const monthSize = compact ? 11 : 14;

  const yearGrid = (
    <View>
      <View style={{ height: HEAD_H, marginLeft: LABEL_W }}>
        {weeks.map((w, i) => {
          const first = w.find((d) => d.getDate() === 1 && d.getFullYear() === year);
          if (!first) return null;
          return (
            <Text key={i} style={[styles.month, { left: i * (cell + GAP), fontSize: monthSize }]}>
              {MOIS_COURTS[first.getMonth()]}
            </Text>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: LABEL_W, gap: GAP }}>
          {JOURS.map((j, i) => (
            <Text key={i} style={[styles.dayLabel, { height: cell, lineHeight: cell, fontSize: monthSize - 2 }]}>
              {j}
            </Text>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: GAP }}>
          {weeks.map((week, w) => (
            <View key={w} style={{ gap: GAP }}>
              {week.map(renderCell)}
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  const weekGrid = (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', gap: GAP, marginLeft: MONTH_W, marginBottom: 4 }}>
        {JOURS.map((j, i) => (
          <Text key={i} style={[styles.dayLabel, { width: cell, fontSize: monthSize - 1 }]}>
            {j}
          </Text>
        ))}
      </View>
      <ScrollView
        ref={gridScroll}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() =>
          gridScroll.current?.scrollTo({
            y: Math.max(0, todayWeek * (cell + GAP) - gridArea.h / 2),
            animated: false,
          })
        }
      >
        {weeks.map((week, w) => {
          const first = week.find((d) => d.getDate() === 1 && d.getFullYear() === year);
          return (
            <View key={w} style={{ flexDirection: 'row', gap: GAP, marginBottom: GAP, alignItems: 'center' }}>
              <Text style={[styles.month, styles.monthSide, { width: MONTH_W - GAP, fontSize: monthSize }]}>
                {first ? MOIS_COURTS[first.getMonth()] : ''}
              </Text>
              {week.map(renderCell)}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar style="dark" />
      <View style={[styles.page, compact && styles.pageCompact]}>
        {/* ----- Gauche : titre, calendrier, séries ----- */}
        <View style={{ flex: 1, gap: compact ? 10 : 18 }}>
          <View style={[styles.header, compact && { gap: 8 }]}>
            {!compact && (
              <Image
                source={require('./assets/mascotte.png')}
                style={{ width: mascotH * 1.06, height: mascotH, resizeMode: 'contain' }}
              />
            )}
            <View style={{ flex: 1, gap: compact ? 4 : 8 }}>
              <View style={styles.titleWrap}>
                <Sketch fill={YELLOW} stroke={null} jitter={4} seed={21} />
                <Text style={[styles.title, { fontSize: titleSize, lineHeight: titleSize * 1.05 }]}>
                  Es-tu un gros dégueulasse ?
                </Text>
              </View>
              <Text style={[styles.hand, compact && { fontSize: 14 }]} numberOfLines={2}>
                <Text style={styles.underlineRed}>
                  {score7} vice{score7 > 1 ? 's' : ''}
                </Text>{' '}
                cette semaine. {pick(verdictTextes(score7), seed, 1)}
              </Text>
              {!compact && (
                <Text style={[styles.hand, styles.vanne]} numberOfLines={1}>
                  {sousTitre}
                </Text>
              )}
            </View>
          </View>

          {compact && (
            <Text style={[styles.hand, styles.vanne, { fontSize: 14 }]} numberOfLines={2}>
              {sousTitre}
            </Text>
          )}

          <View style={[styles.gridBox, compact && { padding: 8 }]}>
            <Sketch fill={PAPER_BG} shadow seed={5} jitter={compact ? 1.4 : 2.2} />
            <View
              style={{ flex: 1, minHeight: 0, justifyContent: 'center', overflow: 'hidden' }}
              onLayout={(e) => {
                const { width: w, height: h } = e.nativeEvent.layout;
                if (Math.abs(w - gridArea.w) > 1 || Math.abs(h - gridArea.h) > 1) setGridArea({ w, h });
              }}
            >
              {gridArea.w > 0 && (horizontal ? yearGrid : weekGrid)}
            </View>
          </View>

          {compact ? (
            <Text style={[styles.hand, { fontSize: 14 }]} numberOfLines={1}>
              Série : <Text style={styles.mark}> {jours(current)} </Text>  ·  Record :{' '}
              <Text style={styles.mark}> {jours(best)} </Text>
            </Text>
          ) : (
            <View style={styles.stats}>
              <View style={styles.calendarIcon}>
                <Sketch fill="#FFF7E8" shadow seed={9} />
                <View style={styles.calendarTop}>
                  <Sketch fill={RED} seed={10} strokeWidth={2.5} jitter={1.2} />
                </View>
                <Text style={styles.calendarYear}>{year}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Série actuelle</Text>
                <View style={styles.statValueWrap}>
                  <Sketch fill={YELLOW} stroke={null} jitter={3.5} seed={31} />
                  <Text style={styles.statValue}>{jours(current)}</Text>
                </View>
              </View>
              <View style={styles.stat}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Image source={require('./assets/trophee.png')} style={{ width: 30, height: 26 }} resizeMode="contain" />
                  <Text style={styles.statLabel}>Meilleure série</Text>
                </View>
                <View style={styles.statValueWrap}>
                  <Sketch fill={YELLOW} stroke={null} jitter={3.5} seed={37} />
                  <Text style={styles.statValue}>{jours(best)}</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* ----- Droite : les vices ----- */}
        <SketchLineV width={compact ? 2 : 3} />
        <View style={[styles.sidebar, { width: sidebarW }, compact && styles.sidebarCompact]}>
          <View style={[styles.sticker, compact && { paddingVertical: 8, paddingHorizontal: 8 }]}>
            <Sketch fill={STICKER_RED} stroke={null} jitter={compact ? 3 : 5} seed={41} />
            <Text
              style={[
                styles.stickerText,
                longQuestion && { fontSize: 18, lineHeight: 26 },
                compact && { fontSize: longQuestion ? 11 : 13, lineHeight: longQuestion ? 17 : 19, letterSpacing: 0 },
              ]}
              numberOfLines={5}
              adjustsFontSizeToFit
            >
              {question}
            </Text>
          </View>
          {VICES.map((v, i) => {
            const count = selectedCounts?.[v.id] ?? 0;
            return (
              <Pressable
                key={v.id}
                onPress={() => bump(v.id, 1)}
                onLongPress={() => count > 0 && bump(v.id, -1)}
                style={({ pressed }) => [
                  styles.button,
                  compact && styles.buttonCompact,
                  { transform: [{ rotate: i % 2 ? '0.6deg' : '-0.5deg' }, { scale: pressed ? 0.95 : 1 }] },
                ]}
              >
                <Sketch fill={PAPER_BG} shadow seed={100 + i * 17} strokeWidth={compact ? 2.2 : 3} jitter={compact ? 1.3 : 1.8} />
                <Image
                  source={ICONS[v.id]}
                  style={[styles.icon, compact && styles.iconCompact]}
                  resizeMode="contain"
                />
                <Text
                  style={[styles.buttonLabel, compact ? styles.buttonLabelCompact : { flex: 1 }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {v.label}
                </Text>
                {count > 0 && (
                  <View style={[styles.badge, compact && styles.badgeCompact]}>
                    <Text style={[styles.badgeText, compact && { fontSize: 13 }]}>{count}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
          <Text style={[styles.hand, styles.hint, compact && { fontSize: 11 }]}>
            Appui long = annuler
          </Text>
        </View>
      </View>
      <PaperToast toast={toast} font={HAND} maxWidth={Math.min(460, width - 40)} top={compact ? 8 : 12} />
      {/* Grain de papier imprimé par-dessus tout : ronge un peu l'encre des textes et des traits */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Image source={require('./assets/grain.png')} resizeMode="repeat" style={{ width: '100%', height: '100%' }} />
      </View>
    </SafeAreaView>
  );
}

const TITLE = 'LuckiestGuy_400Regular';
const HAND = 'Kalam_700Bold';

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PAPER_BG },
  page: {
    flex: 1,
    flexDirection: 'row',
    padding: 24,
    gap: 24,
    maxWidth: 1500,
    width: '100%',
    alignSelf: 'center',
  },
  pageCompact: { padding: 8, gap: 8 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  titleWrap: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, transform: [{ rotate: '-1deg' }] },
  title: { fontFamily: TITLE, color: INK, textTransform: 'uppercase', letterSpacing: 1 },
  hand: { fontFamily: HAND, fontSize: 18, color: INK },
  underlineRed: { textDecorationLine: 'underline', textDecorationColor: RED, textDecorationStyle: 'solid' },
  vanne: { fontSize: 17, opacity: 0.85 },

  gridBox: { flex: 1, padding: 16 },
  month: { position: 'absolute', fontFamily: TITLE, color: INK, letterSpacing: 0.5 },
  monthSide: { position: 'relative', textAlign: 'right', paddingRight: 4 },
  dayLabel: { fontFamily: TITLE, color: INK, textAlign: 'center' },
  cell: { borderRadius: 3 },
  cellToday: { borderWidth: 2.5, borderColor: RED },
  cellSelected: { borderWidth: 2.5, borderColor: INK },

  stats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', gap: 24 },
  calendarIcon: { width: 96, height: 78, alignItems: 'center', padding: 4, transform: [{ rotate: '-4deg' }] },
  calendarTop: { alignSelf: 'stretch', height: 18 },
  calendarYear: { fontFamily: TITLE, fontSize: 26, color: INK, marginTop: 4 },
  stat: { alignItems: 'center', gap: 4 },
  statLabel: { fontFamily: TITLE, fontSize: 17, color: INK, letterSpacing: 0.5, textTransform: 'uppercase' },
  statValueWrap: { paddingHorizontal: 20, paddingVertical: 2 },
  statValue: { fontFamily: HAND, fontSize: 26, color: INK },

  sidebar: { gap: 12, paddingLeft: 18 },
  sidebarCompact: { gap: 7, paddingLeft: 4 },
  sticker: { paddingVertical: 14, paddingHorizontal: 16, transform: [{ rotate: '-1.5deg' }] },
  stickerText: { fontFamily: TITLE, fontSize: 22, lineHeight: 31, letterSpacing: 0.5, color: INK, textAlign: 'center', textTransform: 'uppercase' },
  button: {
    flex: 1,
    maxHeight: 90,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 4,
  },
  buttonCompact: {
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 0,
    paddingHorizontal: 6,
  },
  icon: { width: 52, height: 46 },
  iconCompact: { width: 46, height: 40 },
  mark: { backgroundColor: YELLOW },
  buttonLabel: { fontFamily: TITLE, fontSize: 20, lineHeight: 30, paddingTop: 4, color: INK, textTransform: 'uppercase', letterSpacing: 0.5 },
  buttonLabelCompact: { fontSize: 12, lineHeight: 19, paddingTop: 3, letterSpacing: 0, textAlign: 'center' },
  badge: {
    position: 'absolute',
    top: -10,
    right: -10,
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: RED,
    borderWidth: 3,
    borderColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeCompact: { top: -6, right: -4, minWidth: 22, height: 22, borderRadius: 11, borderWidth: 2 },
  badgeText: { fontFamily: TITLE, fontSize: 15, color: INK },
  hint: { fontSize: 15, textAlign: 'center', opacity: 0.7 },
});
