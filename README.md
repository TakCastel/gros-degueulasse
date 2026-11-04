# Gros Dégueulasse 🍺🚬🍔

Une petite app Expo / React Native pour tenir le journal de tes vices : bière, vin, cocktail, clope, bouffe sale, paris sportifs.

Chaque jour s'affiche dans une grille façon calendrier de contributions. La couleur de la case mélange tes vices du jour, et plus tu en as, plus elle est foncée. L'app te balance une vanne à chaque ajout. Les données restent sur ton téléphone (AsyncStorage).

**Essayer en ligne : https://takcastel.github.io/gros-degueulasse/**

## Lancer le projet

```bash
npm install
npx expo start
```

Ensuite, scanne le QR code avec Expo Go, ou appuie sur `i` (iOS), `a` (Android) ou `w` (web).

## Publier sur GitHub Pages

```bash
npm run deploy
```

Ça exporte la version web dans `dist/` et la pousse sur la branche `gh-pages`.

## Licence

MIT. Voir [LICENSE](LICENSE). Les polices Luckiest Guy et Kalam sont sous licence SIL OFL (voir `assets/fonts/`).
