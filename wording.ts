// Tous les textes de l'app. Une combinaison est tirée au hasard à chaque ouverture.

export type ViceKey = 'biere' | 'vin' | 'cocktail' | 'clope' | 'bouffe' | 'paris';

/** Tirage stable : même graine + même sel = même texte, tant que l'app ne se relance pas */
export function pick<T>(list: T[], seed: number, salt = 0): T {
  const x = Math.sin(seed * 9301 + salt * 49297) * 233280;
  return list[Math.floor((x - Math.floor(x)) * list.length)];
}

// Comment l'app t'appelle
export const SURNOMS = [
  'misérable',
  'pochtron',
  'sac à vin',
  'vieux débris',
  'raclure de comptoir',
  'gros dégueulasse',
  'épave',
  'loque humaine',
  'petit vicieux',
  'grosse feignasse',
  'fripouille',
  'crapule',
  'pilier de bar',
  'éponge',
  'chacal',
  'gros porc',
  'canaille',
  'déchet',
  'moule à gaufres',
  'tête de nœud',
];

// La question au-dessus des boutons. {jour} = "aujourd'hui" ou "le 3 nov", {nom} = le surnom
export const QUESTIONS = [
  "Qu'as-tu fait {jour}, {nom} ?",
  'Alors {nom}, t’as fait quoi {jour} ?',
  'Avoue ce que t’as fait {jour}, {nom}.',
  'Crache le morceau, {nom} : {jour}, c’était quoi ?',
  'Balance tout pour {jour}, {nom}.',
  '{jour}, t’as encore fait quoi, {nom} ?',
  'On t’écoute, {nom}. {jour}, c’était comment ?',
  'Confesse-toi, {nom}. {jour} ?',
];

// Sous le titre
export const SOUS_TITRES = [
  'Clique sur un vice, on ne juge pas. Si, un peu.',
  'Appuie, avoue, assume.',
  'Ici, pas de jugement. Juste des statistiques accablantes.',
  'Ta mère n’en saura rien. Probablement.',
  'Chaque case est un petit aveu.',
  'Le confessionnal du comptoir est ouvert.',
  'Ton foie a demandé un rapport. Le voici.',
  'Pas de honte. Enfin si, mais à ton rythme.',
  'Tout ce que tu cliques pourra être retenu contre toi.',
];

// Verdict sur les 7 derniers jours, par paliers
export const VERDICTS: { max: number; textes: string[] }[] = [
  {
    max: 0,
    textes: [
      'Propre sur toi. Suspect, même.',
      'Zéro vice ? Tu caches quelque chose.',
      'Un saint. Ou un menteur.',
      'Clean. On te surveille quand même.',
    ],
  },
  {
    max: 3,
    textes: [
      'Petit joueur. Tu bois du Vittel ou quoi ?',
      'Amateur. Ça se travaille.',
      'Échauffement. On attend la suite.',
      'Mignon. Presque raisonnable.',
    ],
  },
  {
    max: 8,
    textes: [
      'Ça commence à sentir le fennec.',
      'Tu prends tes marques au comptoir.',
      'Le patron du PMU connaît ton prénom.',
      'Ça glisse doucement, hein.',
    ],
  },
  {
    max: 15,
    textes: [
      'Dégueulasse, oui. Gros, pas encore.',
      'Ton médecin a soupiré en lisant ça.',
      'Tu fais partie des meubles.',
      'Le foie a posé un arrêt maladie.',
    ],
  },
  {
    max: 25,
    textes: [
      'GROS DÉGUEULASSE. Officiellement.',
      'Diplômé avec mention. Bravo, ou pas.',
      'Tu as ton tabouret attitré.',
      'Les voisins parlent de toi.',
    ],
  },
  {
    max: Infinity,
    textes: [
      'Légende vivante du comptoir. Respect et inquiétude.',
      'On va donner ton nom à un bar.',
      'Ton foie demande l’asile politique.',
      'Au-delà du dégueulasse. Il faut un mot nouveau.',
    ],
  },
];

export function verdictTextes(score: number): string[] {
  return (VERDICTS.find((v) => score <= v.max) ?? VERDICTS[VERDICTS.length - 1]).textes;
}

// Quand on annule un vice (appui long)
export const ANNULATIONS = [
  'Rétropédalage. On a tous vu.',
  'Effacé. Mais nous, on s’en souvient.',
  'Tricheur.',
  'Mensonge enregistré.',
  'Ah, on réécrit l’histoire maintenant ?',
  'Ok, on fait comme si.',
];

// Les vannes quand on ajoute un vice
export const VANNES: Record<ViceKey, string[]> = {
  biere: [
    'Une petite mousse, c’est du pain liquide.',
    'C’est la dernière. Comme les 4 d’avant.',
    'Le houblon, cette salade des braves.',
    'Une pinte, c’est pas de l’alcool, c’est de l’hydratation.',
    'Ton ventre te remercie pour la nouvelle extension.',
    'Encore une, et tu deviens bilingue.',
    'La bière tiède, c’est pour les vrais.',
    'T’as dit « juste une » il y a 3 heures.',
  ],
  vin: [
    'Un verre de rouge par jour, a dit un médecin mort.',
    'Tu fais de la dégustation. Évidemment.',
    'Il a du nez. Toi aussi, il est rouge.',
    'Notes de fruits rouges et de mauvaises décisions.',
    'C’est culturel, c’est le patrimoine.',
    'Le cubi, c’est du vin en vrac. Écolo.',
    'Tu dis « tanins » maintenant ?',
    'La bouteille était ouverte, fallait la finir.',
  ],
  cocktail: [
    'Y’a des fruits dedans, ça compte comme 5 par jour.',
    'Un mojito, ou un sirop pour adultes tristes.',
    'Le parasol en papier ne te sauvera pas.',
    'Happy hour, unhappy lendemain.',
    'Sex on the beach. Toi, plutôt seul au comptoir.',
    'C’est sucré, on sent pas l’alcool. Le foie, si.',
    'Avec une paille, ça compte pas.',
    'Le barman t’a appelé « chef ». C’est mauvais signe.',
  ],
  clope: [
    'Juste une, pour l’ambiance.',
    'Tes poumons ont envoyé une lettre de démission.',
    'Ça sent le vieux bar PMU, bravo.',
    'T’arrêtes lundi. Lequel, on sait pas.',
    'Une clope avec le café, une avec la bière, une avec la clope.',
    'Ton paquet te souhaite une belle mort, c’est écrit dessus.',
    'Tu sors fumer, tu reviens fumé.',
    'C’est pas toi qui fumes, c’est le stress.',
  ],
  bouffe: [
    'Le kebab de 2h du mat’, un classique.',
    'Ton cholestérol fait des pompes.',
    'Double cheese, double honte.',
    'Sauce samouraï, sans regrets.',
    'Les frites, c’est des légumes. Techniquement.',
    'Le livreur te tutoie maintenant.',
    'Tacos XXL, régime XS.',
    'Tu manges tes émotions. Avec supplément fromage.',
  ],
  paris: [
    'Le combiné à 47 contre 1, c’était sûr pourtant.',
    'Encore un nul en 3e division moldave.',
    'L’appli te dit bravo. Ton banquier, moins.',
    'T’es à un match de te refaire. Comme hier.',
    'Le but à la 93e, c’est toujours contre toi.',
    'Ton conseiller bancaire a pris un Xanax.',
    'Tu connais le classement du championnat estonien.',
    'Le cash out, c’est pour les lâches. Et les riches.',
  ],
};
