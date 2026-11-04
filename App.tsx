import { useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
const JOURS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const WEEKS_SHOWN = 30;

// ---------- Couleurs ----------

const EMPTY_CELL = '#E8DFC9';
const PAPER: [number, number, number] = [232, 223, 201];

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
  const alpha = Math.min(1, 0.35 + 0.2 * (n - 1));
  r = PAPER[0] + (r - PAPER[0]) * alpha;
  g = PAPER[1] + (g - PAPER[1]) * alpha;
  b = PAPER[2] + (b - PAPER[2]) * alpha;

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

// ---------- App ----------

export default function App() {
  return (
    <SafeAreaProvider>
      <Main />
    </SafeAreaProvider>
  );
}

function Main() {
  const { width } = useWindowDimensions();
  const [journal, setJournal] = useState<Journal>({});
  const [loaded, setLoaded] = useState(false);
  const today = useMemo(() => new Date(), []);
  const todayKey = toKey(today);
  const [selected, setSelected] = useState(todayKey);
  const [vanne, setVanne] = useState('Clique sur un vice, on ne juge pas. Si, un peu.');

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

  // Semaines du plus récent (en haut) au plus ancien
  const weeks = useMemo(() => {
    const monday = addDays(today, -weekdayIndex(today));
    return Array.from({ length: WEEKS_SHOWN }, (_, w) =>
      Array.from({ length: 7 }, (_, d) => addDays(monday, -7 * w + d)),
    );
  }, [today]);

  const score7 = useMemo(() => {
    let s = 0;
    for (let i = 0; i < 7; i++) s += total(journal[toKey(addDays(today, -i))]);
    return s;
  }, [journal, today]);

  const gridWidth = Math.min(width - 32 - 44, 360);
  const cell = Math.floor((gridWidth - 6 * 5) / 7);
  const selectedCounts = journal[selected];
  const selectedDate = new Date(selected + 'T12:00:00');
  const selectedLabel =
    selected === todayKey
      ? "aujourd'hui"
      : `le ${selectedDate.getDate()} ${MOIS[selectedDate.getMonth()]}`;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        {/* Remplacer par le dessin du vieux monsieur : <Image source={require('./assets/mascotte.png')} /> */}
        <View style={styles.mascotte}>
          <Text style={styles.mascotteEmoji}>🧓</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Êtes-vous un gros dégueulasse ?</Text>
          <Text style={styles.verdict}>
            {score7} vice{score7 > 1 ? 's' : ''} cette semaine. {verdict(score7)}
          </Text>
        </View>
      </View>

      <Text style={styles.vanne} numberOfLines={2}>
        « {vanne} »
      </Text>

      <ScrollView style={styles.calendar} contentContainerStyle={styles.calendarContent}>
        <View style={styles.row}>
          <View style={styles.monthCol} />
          {JOURS.map((j, i) => (
            <Text key={i} style={[styles.dayLabel, { width: cell }]}>
              {j}
            </Text>
          ))}
        </View>
        {weeks.map((week, w) => {
          const firstOfMonth = week.find((d) => d.getDate() === 1);
          return (
            <View key={w} style={styles.row}>
              <Text style={styles.monthCol}>{firstOfMonth ? MOIS[firstOfMonth.getMonth()] : ''}</Text>
              {week.map((d) => {
                const key = toKey(d);
                const future = d > today && key !== todayKey;
                return (
                  <Pressable
                    key={key}
                    disabled={future}
                    onPress={() => setSelected(key)}
                    style={[
                      styles.cell,
                      {
                        width: cell,
                        height: cell,
                        backgroundColor: future ? 'transparent' : dayColor(journal[key]),
                      },
                      key === selected && styles.cellSelected,
                      key === todayKey && key !== selected && styles.cellToday,
                    ]}
                  />
                );
              })}
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>
          Qu'as-tu fait {selectedLabel}, misérable ?
          <Text style={styles.hint}>  (appui long = annuler)</Text>
        </Text>
        <View style={styles.buttons}>
          {VICES.map((v) => {
            const count = selectedCounts?.[v.id] ?? 0;
            return (
              <Pressable
                key={v.id}
                onPress={() => bump(v.id, 1)}
                onLongPress={() => count > 0 && bump(v.id, -1)}
                style={({ pressed }) => [
                  styles.button,
                  { borderColor: `rgb(${v.color.join(',')})` },
                  pressed && { transform: [{ scale: 0.94 }] },
                ]}
              >
                <Text style={styles.buttonEmoji}>{v.emoji}</Text>
                <Text style={styles.buttonLabel}>{v.label}</Text>
                {count > 0 && (
                  <View style={[styles.badge, { backgroundColor: `rgb(${v.color.join(',')})` }]}>
                    <Text style={styles.badgeText}>{count}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const INK = '#3B2A1A';

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4ECD8' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8 },
  mascotte: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E2C99A',
    borderWidth: 3,
    borderColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotteEmoji: { fontSize: 36 },
  title: { fontSize: 22, fontWeight: '900', color: INK, lineHeight: 25 },
  verdict: { fontSize: 13, color: '#7A4B22', marginTop: 4, fontWeight: '600' },
  vanne: {
    marginHorizontal: 16,
    marginTop: 10,
    fontStyle: 'italic',
    color: INK,
    fontSize: 14,
    minHeight: 36,
  },
  calendar: { flex: 1 },
  calendarContent: { alignItems: 'center', paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 },
  monthCol: { width: 38, fontSize: 11, color: '#7A4B22', fontWeight: '700', textAlign: 'right', marginRight: 4 },
  dayLabel: { textAlign: 'center', fontSize: 11, color: '#7A4B22', fontWeight: '700' },
  cell: { borderRadius: 4 },
  cellSelected: { borderWidth: 2.5, borderColor: INK },
  cellToday: { borderWidth: 1.5, borderColor: '#7A4B22', borderStyle: 'dashed' },
  panel: {
    backgroundColor: '#EADBB8',
    borderTopWidth: 3,
    borderColor: INK,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
  },
  panelTitle: { fontSize: 14, fontWeight: '800', color: INK, marginBottom: 8, marginLeft: 4 },
  hint: { fontSize: 11, fontWeight: '400', color: '#7A4B22' },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  button: {
    width: '31.5%',
    backgroundColor: '#FFF8E8',
    borderWidth: 3,
    borderRadius: 14,
    paddingVertical: 8,
    alignItems: 'center',
  },
  buttonEmoji: { fontSize: 28 },
  buttonLabel: { fontSize: 12, fontWeight: '700', color: INK, marginTop: 2 },
  badge: {
    position: 'absolute',
    top: -8,
    right: -6,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#FFF8E8',
  },
  badgeText: { color: '#fff', fontWeight: '900', fontSize: 12 },
});
