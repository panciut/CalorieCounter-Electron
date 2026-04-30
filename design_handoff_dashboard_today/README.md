# Handoff: Dashboard "Oggi" — Variante D (Mix Bento + Editoriale)

## Overview
Redesign della dashboard "Oggi" (la home page di FoodBuddy quando l'utente apre l'app). Sostituisce la versione attuale che era criticata per: azione primaria "log food" sepolta in fondo, sidebar troppo sciatta, range macro espressi solo come numeri, copywriting tecnico (`EXERCISE.TITLE`, `dash.plan`), font di sistema, gerarchia debole.

La direzione scelta è la **Variante D**: layout bento data-dense (cards modulari, alta densità informativa) + tipografia editoriale (heading e numeri grandi in Fraunces italic). Schema `warm-dark`, accent arancione caldo `#d97706`.

## About the Design Files
I file in questo bundle sono **design reference creati in HTML/JSX** — prototipi che mostrano l'aspetto e il comportamento desiderati, **non production code da copiare direttamente**. Il task è **ricreare il design nel codebase FoodBuddy esistente** (Electron + React, vedi `package.json` e `DESIGN.md` del progetto reale) usando i pattern, le librerie e le convenzioni già stabilite. Il file principale da studiare è **`fb-variant-hybrid.jsx`** (la Variante D), supportato da `fb-shared.jsx` (sidebar, scope, ring, macro bar), `fb-icons.jsx` (icon set Lucide-style) e `fb-data.jsx` (mock data realistico basato sullo schema vero).

## Fidelity
**High-fidelity (hifi)**. Colori, tipografia, spaziature, scale e proporzioni sono finali. Il developer dovrebbe ricreare l'UI pixel-perfect usando le librerie già presenti nel codebase (Tailwind / styled-components / CSS modules / quel che è) — adattando i token alle CSS variables esistenti.

## Stack target
- Electron + React (codebase esistente FoodBuddy)
- Mantenere la naming convention attuale dei componenti
- I dati arrivano già dallo schema reale (LogEntry, Food, Supplement, ecc.) — il prototipo usa mock plausibili

---

## Design Tokens

### Colori — schema `warm-dark` (default)
```
--fb-bg              #16130f   (background pagina)
--fb-bg-2            #1d1a14   (background sidebar, header pasto, hover)
--fb-card            #221e17   (background card)
--fb-card-2          #2a251c   (card più chiara)
--fb-border          rgba(255,240,220,0.07)
--fb-border-strong   rgba(255,240,220,0.13)
--fb-divider         rgba(255,240,220,0.05)
--fb-text            #ece8df   (testo primario)
--fb-text-2          #a59c8c   (testo secondario)
--fb-text-3          #6e6757   (testo terziario, label uppercase)
--fb-accent          #d97706   (arancione FoodBuddy — bottoni primari, link attivi)
--fb-accent-2        #f59e3b   (gradient secondario logo)
--fb-accent-soft     rgba(217,119,6,0.12)   (sfondo nav attivo)
--fb-green           #7cba6c   (target raggiunto)
--fb-amber           #e0a93a   (vicino al limite)
--fb-orange          #d97706   (sotto target / azione)
--fb-red             #d65a4d   (sopra max)
--fb-blue            #7aa6c8   (acqua)
```

Schemi alternativi in `fb-shared.jsx` (`FB_SCHEMES`): `warm-paper` (light), `pure-dark` (neutro nero). L'utente li può cambiare via Tweaks; in produzione esponi solo `warm-dark` di default ma mantieni il sistema CSS-vars così è banale aggiungere un theme switcher.

### Tipografia
- **`--font-display`** = `"Inter Tight", system-ui, sans-serif` — bottoni, label inline, body UI
- **`--font-body`** = `"Inter", system-ui, sans-serif` — body
- **`--font-serif`** = `"Fraunces", "Iowan Old Style", Georgia, serif` — heading, numeri grandi, label pasto, etichette card
- **`--font-mono`** = `"JetBrains Mono", ui-monospace, monospace` — kbd shortcut

Fraunces va caricato con opsz variabile: `family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600;9..144,700`.

Tutte le cifre numeriche usano `font-variant-numeric: tabular-nums` (classe `.tnum` nel prototipo).

### Spaziatura, raggi, ombre
- Card radius: **12px**, padding interno **16px** (dense) o **24px** (hero).
- Bottone radius: **6–8px**.
- Chip radius: **6px** (rect) o **99px** (pill).
- Border 1px su card, 0.5px non usato.
- Nessuna shadow nelle card. Solo il logo "fb" ha `box-shadow: 0 2px 8px rgba(217,119,6,0.25)`.

---

## Layout della pagina Today

Struttura:
```
[ Sidebar fissa 220px ] [ Main column flex 1 ]
                        ├── Header sticky (60px alto)
                        └── Scroll area
                            ├── Quick log strip (chips)
                            ├── Hero bento (anelli + macro | energy + acqua)
                            ├── Diary table (per pasto)
                            ├── Bento secondario (integratori | dispensa | peso)
                            └── Collassabili (allenamento | note | storico)
```

`max-width` della scroll area: **1280px**, centrata, padding orizzontale 28px.

### 1. Sidebar (`fb-shared.jsx` → `FBSidebar`)
- Larghezza 220px, background `--fb-bg-2`, border-right `--fb-border`.
- Logo: quadratino 28×28 radius 8 con gradient `linear-gradient(135deg, #d97706 0%, #f59e3b 100%)`, scritta "fb" bianca in Inter Tight 700, accanto wordmark "FoodBuddy" Inter Tight 600 14px.
- Nav items raggruppati con label uppercase 9.5px tracking 1.4 in `--fb-text-3`:
  - **Diario** → Oggi, Alimenti, Dispensa, Ricette
  - **Pianificazione** → Settimana, Storico
  - **Salute** → Integratori, Esercizio, Misurazioni, Corpo, Obiettivi
  - **Sistema** → Dati, Impostazioni
- Item attivo: background `--fb-accent-soft`, color `--fb-accent`, weight 550. Inattivi: color `--fb-text-2`, weight 450.
- Padding item: 7px 10px, gap icon-label 10px, icon 16px.
- In fondo: separatore + avatar "M" 28px round + "Marco" / "Cutting · 2250 kcal" come info riga.

### 2. Header (top bar)
Padding `16px 28px`, border-bottom `--fb-border`. Layout flex space-between.

**Sinistra**: chevron L → blocco data → chevron R → divider verticale → "Pianifica" ghost btn → icon copy.

Blocco data:
- Eyebrow: `Diario · Oggi` (10px 600 tracking 1.6 uppercase, color `--fb-accent`)
- Titolo: `Martedì, 28 aprile` in **Fraunces italic 22px regular** letter-spacing -0.4, line-height 1.1

**Destra**: search box + bottone primario "Aggiungi"
- Search: card `--fb-card` border `--fb-border-strong` radius 8 padding `6px 12px`, placeholder "Cerca alimento, ricetta…  ⌘K", min-width 280px.
- Bottone: background `--fb-accent`, color white, padding `7px 14px`, radius 7, font 12.5px 600, icona "+" prima del testo.

### 3. Quick log strip
Card `--fb-card`, padding `10px 14px`, flex row gap 8 con horizontal scroll (hide-scrollbar).

- Label "Suggeriti" in **Fraunces italic 12.5px** color `--fb-text-2`.
- 4 chip "favoriti" (background `--fb-bg-2`, border `--fb-border-strong`, color `--fb-text`, radius 6, padding `4px 10px`, font 11.5px 500), ognuno preceduto da star riempita 10px in `--fb-accent`.
- Divider verticale 1px alto 16px.
- 5 chip "frequenti" (background trasparente, border `--fb-border`, color `--fb-text-2`).

### 4. Hero bento
Grid 2 colonne `auto 1fr` gap 16.

**Sinistra (card hero, padding 24)**: flex row gap 24 align center.
- `ConcentricRings` 170×170 con 4 anelli concentrici stroke 11 gap 4:
  - kcal (orange), proteine (red), carbs (amber), fat (green)
  - centro: percentuale calorie in **Fraunces 22px**, sotto "target" 9.5px uppercase
  - track: `--fb-border-strong` opacity 0.5, stroke-linecap round, animazione su `stroke-dashoffset` 0.8s cubic-bezier(.2,.8,.2,1)
- A destra del ring: blocco testo
  - Eyebrow uppercase "Apporto del giorno"
  - Numero kcal in **Fraunces 64px weight 300** letter-spacing -2.5 + "kcal" Fraunces italic 16px
  - Riga delta: `"+76 oltre il massimo"` in `--fb-red` 600 oppure `"-X residui"` in `--fb-green`, seguito da "· range 1900–2450" in `--fb-text-3`
  - Sotto, lista 3 macro (proteine / carbo / grassi) come righe orizzontali min-width 360px:
    - dot 6px del colore macro
    - nome 11.5px 500 width 86 in `--fb-text-2`
    - barra altezza 5 con: track `--fb-bg-2`, banda min-max in `--fb-border-strong`, fill colorato semantico (vedi `fbBarColor`), marker raccomandato 1.5px verticale opacity 0.5
    - valore tnum width 50 right-align
    - percentuale in **Fraunces italic 12px** weight 500 colorato

**Destra**: stack verticale gap 16, 2 cards.
- Card "Bilancio": icon flame orange + label "BILANCIO". Numero kcal netti in **Fraunces 38px weight 400** colorato (orange se positivo, green se negativo). Sotto, grid 3 colonne: In / Out / Passi con label uppercase 9.5px e valore Fraunces 15px.
- Card "Acqua": icon drop blue + label "ACQUA" + percentuale a destra. Numero `(W.total/1000).toFixed(2)` in Fraunces 38px + "L · di 2.5 L" Fraunces italic 12px. Barra acqua 4px blue. Sotto 3 chip "+250ml" "+500ml" "Custom".

### 5. Diary table
Card unica padding 16. Heading **Fraunces italic 18px** "Diario del giorno" + count "16 alimenti · 5 pasti" 10.5px in `--fb-text-3`. A destra icon button filter + copy.

Sotto, header colonne uppercase 9.5px tracking 1: `Alimento | Qtà | kcal | P | C | F`. Grid `minmax(0,1.3fr) 56px 56px 56px 56px 56px 24px` gap 8.

Per ogni pasto (Breakfast / MorningSnack / Lunch / AfternoonSnack / Dinner — solo quelli con entries):
- **Riga header pasto**: padding `12px 8px 6px`, margin orizzontale -8px, background `--fb-bg-2`, border-top `--fb-divider`. Contiene:
  - Label pasto in **Fraunces italic 14px** (es. "Colazione")
  - Time del primo entry tnum 10px tracking 0.4 in `--fb-text-3`
  - Spacer flex
  - Totali "234 kcal · 30g P" tnum 11px 600 in `--fb-text-2`
  - Bottone "+" 12px
- **Righe entry**: padding 8, font 12, border-bottom `--fb-divider`. Nome alimento 500 in `--fb-text`. Numeri tnum right-align: kcal 600 in `--fb-text`, P/C/F 11.5 in `--fb-text-2`. Action menu (3 dots) in `--fb-text-2`.

### 6. Bento secondario (3 colonne 1fr 1fr 1fr gap 16)
Tutte le card: heading **Fraunces italic 14px** sopra.

- **Integratori**: lista checkbox custom 14×14 radius 4, border `--fb-border-strong`, fill `--fb-green` quando taken; label striked + grigio se taken; tag time uppercase 9.5px (Mattina / Pom. / Sera).
- **Dispensa**: heading + Pill "Bassa" amber. Lista nome / quantità con quantità in `--fb-amber` 600.
- **Peso**: numero **Fraunces 30px** + "kg" italic. Delta `↓ 0.6 kg` in `--fb-green` 10.5px. `Sparkline` 120×32 polyline `--fb-accent` stroke 1.5.

### 7. Collassabili (sezione finale)
Stack verticale gap 8, 3 righe identiche:
- Allenamento — `Push · 540 kcal · 58 min · 8 esercizi` — count "1 sessione"
- Note del giorno — `Aggiungi appunti, sensazioni, fame…` — count "vuoto"
- Storico recente — `Confronta con ieri, settimana, media 7g` — count "—"

Ogni riga: card grid `auto 1fr auto auto` gap 14 padding `14px 18px`. Icon box 32×32 radius 8 background `--fb-bg-2` border `--fb-divider`. Titolo **Fraunces italic 15px**. Subtitle 11px in `--fb-text-3`. Count uppercase 10px tracking 1.2 a destra. Chevron giù 16px.

---

## Interactions & Behavior

### Quick log
- Click su chip favorito/frequente → log diretto come "ultima quantità usata", apre toast minimal in basso destra `Aggiunto: Petto di pollo · 200g`. Anima la riga corrispondente nel diary con keyframes `fb-row-in` (fade da `rgba(196,92,0,0.12)` a transparent, traslate -8px → 0). E anima il numero macro coinvolto con keyframes `fb-pop` (scale 1 → 1.06 → 1, 0.4s).
- ⌘K apre la search globale.
- Search submit → drawer/modal con risultati live (non incluso nel proto, ricalca pattern esistente).

### Date navigation
- Chevron L/R cambia giorno. Pianifica apre overlay della planner view (esistente).

### Cards
- Hover card sottolinea bordo a `--fb-border-strong`.
- Bottone "+" su header pasto pre-fill del meal nel quick add.
- Le tre card collassabili in fondo si espandono inline mostrando contenuto vero (workout details, note textarea, history compare).

### Stati
- **Empty diary**: invece della tabella mostra "Nessun alimento registrato oggi" in Fraunces italic 18px center, color `--fb-text-2`, sotto un bottone primario "Aggiungi il primo".
- **Loading**: skeleton con background `--fb-bg-2` pulsante.
- **Over budget**: barra macro rossa, Pill "+76 oltre" rossa.

### Animazioni globali (già definite nel `<style>` del file principale)
```
@keyframes fb-fade-up { from {opacity:0; transform:translateY(6px)} to {...} }
@keyframes fb-pop { 0% {scale 1} 35% {scale 1.06} 100% {scale 1} }
@keyframes fb-row-in { from {opacity:0; transform:translateX(-8px); background:rgba(196,92,0,0.12)} to {...} }
@keyframes fb-toast-in { from {opacity:0; transform:translateY(8px) scale(0.96)} to {...} }
```

---

## State Management
La pagina dipende già dallo store esistente. I selettori da agganciare:
- `selectTodayTotals()` → { cal, protein, carbs, fat, fiber }
- `selectTodayEntries()` → array LogEntry, raggruppabile per `meal`
- `selectTodayWater()` → { total, goal, entries[] }
- `selectTodayEnergy()` → { resting, active, extra, steps, stepsGoal }
- `selectTargets()` → { cal: {min,max,rec}, protein: {...}, ... }
- `selectFavoriteFoods()` / `selectFrequentFoods()` (top 4-5)
- `selectSupplementsToday()` → array { id, name, time, taken, qty }
- `selectPantryLow()` → array { name, qty, unit }
- `selectBodyTrend()` → { weight, weightDelta, weightTrend: number[7] }

Tutte le mutazioni passano per le action già esistenti (`logFood`, `logWater`, `markSupplementTaken`, ecc.).

---

## i18n
Tutti i testi in italiano. Stringhe nuove da aggiungere:
- `dashboard.today.eyebrow` = "Diario · Oggi"
- `dashboard.today.intake` = "Apporto del giorno"
- `dashboard.today.balance` = "Bilancio"
- `dashboard.today.netKcal` = "kcal netti"
- `dashboard.today.water` = "Acqua"
- `dashboard.today.diary` = "Diario del giorno"
- `dashboard.today.suggestions` = "Suggeriti"
- `dashboard.today.entriesCount` = "{n} alimenti · {m} pasti"
- `meal.Breakfast` = "Colazione" / `MorningSnack` = "Spuntino" / `Lunch` = "Pranzo" / `AfternoonSnack` = "Merenda" / `Dinner` = "Cena" / `EveningSnack` = "Sera"
- `pantry.low` = "Bassa"
- `supplement.time.breakfast/afternoon/evening` = "Mattina/Pom./Sera"
- `exercise.title` (era `EXERCISE.TITLE` non tradotto) = "Allenamento"
- `notes.title` = "Note del giorno"
- `history.recent` = "Storico recente"
- `quick.add` = "Aggiungi"

---

## Asset / dipendenze nuove
- **Google Font Fraunces** (variabile, opsz + wght). Importazione già nel prototipo.
- **Inter Tight** (300/400/500/600/700/800).
- **JetBrains Mono** (400/500/600).
- Icone: già definite come SVG inline in `fb-icons.jsx` — copia il set in un componente `<Icon name="..." />` o usa `lucide-react` (le path sono compatibili stilisticamente, stroke 1.6).

---

## Files in questo bundle

| File | Scopo |
|---|---|
| `FoodBuddy Dashboard Redesign.html` | Entry point del prototipo. Apri in browser per vedere tutte le 4 varianti su design canvas. |
| `fb-variant-hybrid.jsx` | **Variante D — quella da implementare**. Layout completo della dashboard. |
| `fb-shared.jsx` | Sidebar, FBScope (CSS vars per scheme), FBRing, FBMacroBar, FBPill — riusabili. |
| `fb-icons.jsx` | Set icone Lucide-style 24×24 stroke 1.6. |
| `fb-data.jsx` | Mock data realistico — riferimento per shape e tipografia dei numeri. Include `fbBarColor()` (logica colori semantici sulle barre macro). |
| `fb-variant-swiss.jsx` / `fb-variant-dense.jsx` / `fb-variant-editorial.jsx` | Le altre 3 varianti esplorate, per riferimento sui pattern alternativi. |
| `fb-foods-screen.jsx` | Schermo Alimenti coordinato (per sapere come si estende il sistema oltre la dashboard). |
| `fb-app.jsx` | App shell con design canvas + tweaks. Non da portare. |
| `design-canvas.jsx` / `tweaks-panel.jsx` | Solo per il preview, non da portare. |

---

## Funzioni helper da portare

Da `fb-data.jsx`:
```js
function fbBarColor(actual, min, max, rec) {
  if (actual <= 0) return "var(--fb-text-3)";
  if (max && actual > max) return "var(--fb-red)";
  if (max && actual > max * 0.95) return "var(--fb-amber)";
  if (rec && actual >= rec * 0.92 && (!max || actual <= max)) return "var(--fb-green)";
  if (min && actual >= min) return "var(--fb-amber)";
  return "var(--fb-orange)";
}
```
Questa è la regola visiva del sistema — usala ovunque ci siano barre con range.

---

## Checklist di implementazione (ordine consigliato)
1. Aggiungere CSS variables `--fb-*` al theme globale + Google Fonts (Fraunces, Inter Tight, JetBrains Mono).
2. Sostituire la sidebar (logo "fb" + raggruppamento + nuovi item attivi/inattivi).
3. Creare componenti riusabili: `<ConcentricRings>`, `<MacroBar>`, `<Sparkline>`, `<Pill>`, `<Card>` (radius 12 / padding 16 / border).
4. Refactor della pagina Today secondo il layout descritto, top-down.
5. Estrarre le stringhe in i18n (rimuovere `EXERCISE.TITLE` e simili).
6. Agganciare gli stati (loading / empty / over-budget).
7. Aggiungere animazioni (fb-row-in, fb-pop, fb-toast-in) al log food.
8. QA visivo: confronto pixel con `fb-variant-hybrid.jsx` rendered.
