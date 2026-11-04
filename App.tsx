import { useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ScrollViewInstance,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import { Bangers_400Regular } from '@expo-google-fonts/bangers';
import { PatrickHand_400Regular } from '@expo-google-fonts/patrick-hand';

// ---------- Les vices ----------

type ViceId = 'biere' | 'vin' | 'cocktail' | 'clope' | 'bouffe' | 'paris';

type Vice = {
  id: ViceId;
  emoji: string;
  label: string;
  color: [number, number, number];
  vannes: string[];
};

const ORANGE: [number, number, number] = [235, 120, 20];

const VICES: Vice[] = [
  {
    id: 'biere',
    emoji: '🍺',
    label: 'Bière',
    color: ORANGE,
    vannes: [
      "Une petite mousse, c'est du pain liquide.",
      "C'est la dernière. Comme les 4 d'avant.",
      'Le houblon, cette salade des braves.',
    ],
  },
  {
    id: 'vin',
    emoji: '🍷',
    label: 'Vin',
    color: ORANGE,
    vannes: [
      'Un verre de rouge par jour, a dit un médecin mort.',
      'Tu fais de la dégustation. Évidemment.',
      'Il a du nez. Toi aussi, il est rouge.',
    ],
  },
  {
    id: 'cocktail',
    emoji: '🍹',
    label: 'Cocktail',
    color: ORANGE,
    vannes: [
      "Y'a des fruits dedans, ça compte comme 5 par jour.",
      'Un mojito, ou un sirop pour adultes tristes.',
      'Le parasol en papier ne te sauvera pas.',
    ],
  },
  {
    id: 'clope',
    emoji: '🚬',
    label: 'Clope',
    color: [110, 62, 25],
    vannes: [
      "Juste une, pour l'ambiance.",
      'Tes poumons ont envoyé une lettre de démission.',
      'Ça sent le vieux bar PMU, bravo.',
    ],
  },
  {
    id: 'bouffe',
    emoji: '🍔',
    label: 'Bouffe sale',
    color: [200, 25, 25],
    vannes: [
      "Le kebab de 2h du mat', un classique.",
      'Ton cholestérol fait des pompes.',
      'Double cheese, double honte.',
    ],
  },
  {
    id: 'paris',
    emoji: '🎰',
    label: 'Paris sportifs',
    // Caca d'oie, la couleur officielle du ticket perdant
    color: [138, 150, 30],
    vannes: [
      "Le combiné à 47 contre 1, c'était sûr pourtant.",
      'Encore un nul en 3e division moldave.',
      "L'appli te dit bravo. Ton banquier, moins.",
    ],
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

function verdict(score: number): string {
  if (score === 0) return 'Propre sur toi. Suspect, même.';
  if (score <= 3) return 'Petit joueur. Tu bois du Vittel ou quoi ?';
  if (score <= 8) return 'Ça commence à sentir le fennec.';
  if (score <= 15) return 'Dégueulasse, oui. Gros, pas encore.';
  if (score <= 25) return 'GROS DÉGUEULASSE. Officiellement.';
  return 'Légende vivante du comptoir. Respect et inquiétude.';
}

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
  const [fontsLoaded, fontError] = useFonts({ Bangers_400Regular, PatrickHand_400Regular });
  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, backgroundColor: PAPER_BG }} />;
  return (
    <SafeAreaProvider>
      <Main />
    </SafeAreaProvider>
  );
}

function Main() {
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const [journal, setJournal] = useState<Journal>({});
  const [loaded, setLoaded] = useState(false);
  const today = useMemo(() => new Date(), []);
  const todayKey = toKey(today);
  const [selected, setSelected] = useState(todayKey);
  const [vanne, setVanne] = useState('Clique sur un vice, on ne juge pas. Si, un peu.');
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
    const v = VICE_BY_ID[id];
    setVanne(delta > 0 ? v.vannes[Math.floor(Math.random() * v.vannes.length)] : 'Rétropédalage. On a tous vu.');
  };

  // Année en cours : une colonne par semaine, une ligne par jour
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

  const score7 = useMemo(() => {
    let s = 0;
    for (let i = 0; i < 7; i++) s += total(journal[toKey(addDays(today, -i))]);
    return s;
  }, [journal, today]);

  const { current, best } = useMemo(() => streaks(journal, today), [journal, today]);

  // Taille des cases : on remplit la largeur dispo, sinon on scrolle
  const GAP = 3;
  const sidebarW = wide ? 300 : 0;
  const gridAvail = width - sidebarW - (wide ? 72 : 32) - 28 - 24;
  const fitted = Math.floor((gridAvail - GAP * (weeks.length - 1)) / weeks.length);
  const cell = Math.max(13, Math.min(20, fitted));
  const scrolls = fitted < 13;
  const todayCol = weeks.findIndex((w) => w.some((d) => toKey(d) === todayKey));

  const selectedDate = new Date(selected + 'T12:00:00');
  const selectedLabel =
    selected === todayKey ? "aujourd'hui" : `le ${selectedDate.getDate()} ${MOIS[selectedDate.getMonth()]}`;
  const selectedCounts = journal[selected];

  const header = (
    <View style={[styles.header, !wide && { flexDirection: 'column', alignItems: 'stretch' }]}>
      <Image source={require('./assets/mascotte.png')} style={wide ? styles.mascotte : styles.mascotteSmall} />
      <View style={{ flex: wide ? 1 : undefined, gap: 10 }}>
        <View style={styles.titleWrap}>
          <View style={styles.highlight} />
          <Text style={[styles.title, !wide && { fontSize: 38, lineHeight: 40 }]}>
            Êtes-vous un gros dégueulasse ?
          </Text>
        </View>
        <Text style={styles.hand}>
          <Text style={styles.underlineRed}>
            {score7} vice{score7 > 1 ? 's' : ''}
          </Text>{' '}
          cette semaine. {verdict(score7)}
        </Text>
        <Text style={[styles.hand, styles.vanne]} numberOfLines={2}>
          « {vanne} »
        </Text>
      </View>
    </View>
  );

  const grid = (
    <View style={[styles.box, styles.gridBox]}>
      <ScrollView
        ref={gridScroll}
        horizontal
        scrollEnabled={scrolls}
        showsHorizontalScrollIndicator={false}
        onContentSizeChange={() => {
          if (scrolls) gridScroll.current?.scrollTo({ x: Math.max(0, (todayCol - 8) * (cell + GAP)), animated: false });
        }}
      >
        <View>
          <View style={{ height: 22, marginLeft: 24 }}>
            {weeks.map((w, i) => {
              const first = w.find((d) => d.getDate() === 1 && d.getFullYear() === year);
              if (!first) return null;
              return (
                <Text key={i} style={[styles.month, { left: i * (cell + GAP) }]}>
                  {MOIS_COURTS[first.getMonth()]}
                </Text>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ width: 24, gap: GAP }}>
              {JOURS.map((j, i) => (
                <Text key={i} style={[styles.dayLabel, { height: cell, lineHeight: cell }]}>
                  {j}
                </Text>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: GAP }}>
              {weeks.map((week, w) => (
                <View key={w} style={{ gap: GAP }}>
                  {week.map((d) => {
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
                        ]}
                      />
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );

  const stats = (
    <View style={[styles.stats, !wide && { gap: 12 }]}>
      <View style={styles.calendarIcon}>
        <View style={styles.calendarTop} />
        <Text style={styles.calendarYear}>{year}</Text>
      </View>
      <View style={styles.stat}>
        <Text style={styles.statLabel}>Série actuelle</Text>
        <Text style={styles.statValue}>{jours(current)}</Text>
      </View>
      <View style={styles.stat}>
        <Text style={styles.statLabel}>🏆 Meilleure série</Text>
        <Text style={styles.statValue}>{jours(best)}</Text>
      </View>
    </View>
  );

  const sidebar = (
    <View style={[styles.sidebar, wide ? styles.sidebarWide : null]}>
      <View style={styles.sticker}>
        <Text style={styles.stickerText}>Qu'as-tu fait {selectedLabel}, misérable ?</Text>
      </View>
      <View style={[styles.buttons, !wide && styles.buttonsGrid]}>
        {VICES.map((v, i) => {
          const count = selectedCounts?.[v.id] ?? 0;
          return (
            <Pressable
              key={v.id}
              onPress={() => bump(v.id, 1)}
              onLongPress={() => count > 0 && bump(v.id, -1)}
              style={({ pressed }) => [
                styles.box,
                styles.button,
                !wide && styles.buttonHalf,
                { transform: [{ rotate: i % 2 ? '0.6deg' : '-0.5deg' }, { scale: pressed ? 0.95 : 1 }] },
              ]}
            >
              <Text style={styles.buttonEmoji}>{v.emoji}</Text>
              <Text style={styles.buttonLabel} numberOfLines={1} adjustsFontSizeToFit>
                {v.label}
              </Text>
              {count > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{count}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.hand, styles.hint]}>Appui long sur un vice pour annuler.</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={[styles.page, wide && styles.pageWide]}>
        <View style={{ flex: wide ? 1 : undefined, gap: 20 }}>
          {header}
          {grid}
          {stats}
        </View>
        {sidebar}
      </ScrollView>
    </SafeAreaView>
  );
}

const TITLE = 'Bangers_400Regular';
const HAND = 'PatrickHand_400Regular';
const POP_SHADOW = `3px 4px 0px ${INK}`;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PAPER_BG },
  page: { padding: 16, gap: 24 },
  pageWide: { flexDirection: 'row', padding: 28, gap: 28, maxWidth: 1400, alignSelf: 'center', width: '100%' },

  header: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  mascotte: { width: 220, height: 208, resizeMode: 'contain' },
  mascotteSmall: { width: 170, height: 161, resizeMode: 'contain', alignSelf: 'center' },
  titleWrap: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 4 },
  highlight: {
    ...StyleSheet.absoluteFill,
    backgroundColor: YELLOW,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 22,
    borderBottomLeftRadius: 8,
    transform: [{ rotate: '-1.2deg' }],
  },
  title: { fontFamily: TITLE, fontSize: 56, lineHeight: 58, color: INK, textTransform: 'uppercase', letterSpacing: 1 },
  hand: { fontFamily: HAND, fontSize: 22, color: INK },
  underlineRed: { textDecorationLine: 'underline', textDecorationColor: RED, textDecorationStyle: 'solid' },
  vanne: { fontSize: 20, opacity: 0.85 },

  box: {
    backgroundColor: PAPER_BG,
    borderWidth: 3,
    borderColor: INK,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 10,
  },
  gridBox: { padding: 14, boxShadow: POP_SHADOW },
  month: { position: 'absolute', fontFamily: TITLE, fontSize: 16, color: INK, letterSpacing: 0.5 },
  dayLabel: { fontFamily: TITLE, fontSize: 14, color: INK, textAlign: 'center' },
  cell: { borderRadius: 3 },
  cellToday: { borderWidth: 2.5, borderColor: '#B8900A', backgroundColor: YELLOW },
  cellSelected: { borderWidth: 2.5, borderColor: INK },

  stats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', gap: 24 },
  calendarIcon: {
    width: 110,
    height: 88,
    borderWidth: 3,
    borderColor: INK,
    borderRadius: 6,
    backgroundColor: '#FFF7E8',
    overflow: 'hidden',
    alignItems: 'center',
    transform: [{ rotate: '-4deg' }],
    boxShadow: POP_SHADOW,
  },
  calendarTop: { alignSelf: 'stretch', height: 22, backgroundColor: RED, borderBottomWidth: 3, borderColor: INK },
  calendarYear: { fontFamily: TITLE, fontSize: 38, color: INK, marginTop: 4 },
  stat: { alignItems: 'center', gap: 6 },
  statLabel: { fontFamily: TITLE, fontSize: 22, color: INK, letterSpacing: 0.5, textTransform: 'uppercase' },
  statValue: {
    fontFamily: HAND,
    fontSize: 36,
    color: INK,
    backgroundColor: YELLOW,
    paddingHorizontal: 22,
    borderTopLeftRadius: 16,
    borderBottomRightRadius: 20,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 8,
    overflow: 'hidden',
  },

  sidebar: { gap: 16 },
  sidebarWide: { width: 300, borderLeftWidth: 3, borderColor: INK, paddingLeft: 28 },
  sticker: {
    backgroundColor: RED,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 22,
    borderBottomRightRadius: 8,
    borderBottomLeftRadius: 18,
    transform: [{ rotate: '-1.5deg' }],
  },
  stickerText: { fontFamily: TITLE, fontSize: 30, lineHeight: 32, color: INK, textAlign: 'center', textTransform: 'uppercase' },
  buttons: { gap: 14 },
  buttonsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    boxShadow: POP_SHADOW,
  },
  buttonHalf: { width: '47.5%', paddingHorizontal: 10, gap: 8 },
  buttonEmoji: { fontSize: 36 },
  buttonLabel: { flex: 1, fontFamily: TITLE, fontSize: 26, color: INK, textTransform: 'uppercase', letterSpacing: 0.5 },
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
  badgeText: { fontFamily: TITLE, fontSize: 18, color: INK },
  hint: { fontSize: 17, textAlign: 'center', opacity: 0.7 },
});
