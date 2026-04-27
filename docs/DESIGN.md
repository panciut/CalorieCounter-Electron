# FoodBuddy — Design System & Principi

> Documento di riferimento per tutte le decisioni di design. Aggiornare dopo ogni intervento significativo.

---

## Design Context

### Utenti
Uso personale intimo: l'autore e una persona vicina (partner/familiare). Non è un prodotto di massa. È un tool quotidiano per le abitudini alimentari di 1-2 persone. Contesto: desktop Electron, principalmente a casa o scrivania. Gli utenti conoscono l'app bene — non servono tutorial aggressivi.

### Brand Personality
**Caldo · Pratico · Quotidiano**

Non è un tool medico, non è un'app fitness da palestra, non è un prodotto consumer generico. È un compagno silenzioso per le abitudini di ogni giorno — affidabile come un quaderno ben tenuto, bello come un oggetto artigianale.

### Anti-reference
- ❌ AI slop: gradient text, glassmorphism, neon su dark, hero metric con numero gigante
- ❌ Gamification: badge, streak flames, emoji ovunque, design infantile
- ❌ Clinico/medico: bianco sterile, icone sanitarie, freddezza
- ❌ App fitness aggressiva: verde neon, KPI in faccia, urgenza forzata

---

## Principi di Design

1. **Bellezza prima del coraggio** — ogni schermata deve poter essere mostrata come screenshot orgoglioso. Se non ci piace, non è finita.
2. **Dati con eleganza** — la densità informativa è un punto di forza; presentarla bene, non nasconderla.
3. **Calore autenticato** — il tema warm-dark deve sentirsi intenzionale, non "dark mode con accent arancio a caso".
4. **Scala intima** — progettato per 2 persone; può avere opinionated choices e personalità forte.
5. **Quiete operativa** — l'app non richiede attenzione emotiva. L'utente apre, registra, chiude. Flusso fluido, zero friction.

---

## Token di Colore

### Palette attuale (dark mode)
```css
--bg:         #0d0b09;   /* background principale — brown-black caldo */
--nav-bg:     #131109;   /* sidebar */
--card-bg:    #1c1a16;   /* card surfaces */
--card-hover: #242118;   /* hover state cards */
--text:       #e9e6e0;   /* testo primario — bianco caldo */
--text-sec:   #8a8278;   /* testo secondario */
--border:     rgba(255,240,220,0.08);  /* bordi — molto sottili */
--accent:     #c45c00;   /* arancione primario */
--accent2:    #e07020;   /* arancione secondario (hover/variante) */
```

### Colori semantici — DA RIVEDERE ⚠️
```css
/* PROBLEMA: tutti e tre sono varianti di arancione/amber */
--green:  #e8941a;  /* successo — non è verde! */
--yellow: #d46c14;  /* warning */
--red:    #b83a10;  /* errore */
```

**Fix pianificato:** differenziare con colori davvero distinti mantenendo il warm tone:
- Success → verde con tint warm (es. `oklch(0.65 0.14 140)`)
- Warning → amber/giallo (es. `oklch(0.75 0.16 75)`)
- Error → rosso (es. `oklch(0.55 0.18 25)`)

### Regole colore
- Non usare grigio su colorato — usa una shade del colore di sfondo
- Non `#000` puro né `#fff` puro — sempre tinted
- Accent (`#c45c00`) solo per azioni primarie e stati attivi — non decorativo
- `text-sec` non va usato per informazioni importanti

---

## Tipografia

### Stato attuale — DA MIGLIORARE ⚠️
```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```
System font = zero personalità. Non è sbagliato funzionalmente, ma non contribuisce all'identità del prodotto.

### Scala dimensioni (definita in @theme)
```
2xs: 10px  xs: 11px  sm: 12px  base: 13px
md: 14px   lg: 15px  xl: 16px  2xl: 18px
3xl: 22px  4xl: 28px  5xl: 30px
```

### Gerarchia target
| Livello | Uso | Stile |
|---------|-----|-------|
| Page title | Titolo pagina | font-size lg-xl, font-bold, text-text |
| Section header | Titoli sezione | font-size sm, font-semibold, text-text (non muted) |
| Data label | Label dentro sezioni | font-size xs, text-text-sec, uppercase, tracking-wider |
| Body | Contenuto | font-size base/md, font-normal, text-text |
| Caption | Dettagli secondari | font-size xs/2xs, text-text-sec |

**Anti-pattern attuale:** tutti i section header usano la stessa classe `text-xs font-semibold text-text-sec uppercase tracking-wider` — indistinguibili dai data label.

---

## Layout & Spacing

### Container principale
```
max-w-6xl mx-auto px-6 py-6
```

### Ritmo verticale dashboard
Gap uniforme `gap-6` tra sezioni — monotono. **Da variare:**
- Sezioni correlate: `gap-3`
- Sezioni distinte: `gap-6`
- Separazione visiva tra zone funzionali diverse: `gap-8` + divider sottile

### Card pattern
Attuale: `bg-card border border-border rounded-xl p-4` su tutto.

**Regola:** non tutto deve essere una card. Il log food area non ha bisogno di bg-card — può essere un'area aperta con più respiro. Le informazioni rapide (favorites, frequent) non hanno bisogno di container.

---

## Componenti — Note di stile

### Bottoni
| Tipo | Uso | Classe base |
|------|-----|------------|
| Primary | Azione principale (Log, Save) | `bg-accent text-white px-4 py-2 rounded-lg` |
| Secondary | Azione secondaria | `border border-border text-text-sec px-4 py-2 rounded-lg` |
| Ghost | Utility, azioni rare | `text-text-sec px-3 py-1.5` (no border) |
| Danger | Elimina, azioni distruttive | `text-red border border-red/30` |

**Anti-pattern attuale:** Quick Add, Swap Days, Copy Day e Plan Mode hanno tutti lo stesso peso visivo — vanno differenziati per frequenza d'uso.

### Emoji nei bottoni — VIETATE ⚠️
Non usare emoji come icone in bottoni toolbar (`📋`, `🔁`). Usare SVG icon coerenti o testo pulito.

### Section headers
Non usare emoji come prefisso dei titoli sezione (`⭐ Favorites`). Usare testo puro o icona SVG inline se necessario.

### Input
Classe condivisa (da `src/lib/foodPresets.ts`):
```
bg-bg border border-border rounded-lg px-2 py-1.5 text-text text-sm outline-none focus:border-accent w-full
```

---

## Dashboard — Struttura raccomandata

### Ordine attuale (problematico)
1. Header con date nav
2. Toolbar azioni (4 bottoni equivalenti)
3. Planned entries banner
4. DayMacrosCard
5. Energy + Supplements
6. Water
7. Exercise
8. Favorites
9. Frequent
10. **Log food** ← azione primaria sepolta in fondo
11. Entry table

### Ordine target
1. Header con date nav (semplificato)
2. **Log food — in evidenza, non in card** ← azione primaria subito visibile
3. Entry table (risultato immediato del log)
4. DayMacrosCard (riepilogo giornaliero)
5. Quick actions: Water + Favorites/Frequent (compact, orizzontale)
6. [Collapsibile] Energy · Supplements · Exercise
7. Note giornaliere

---

## Navigazione

### Struttura attuale
- Sidebar sinistra `w-48`
- Logo "CC" (placeholder)
- Icon + label per ogni voce
- Edit mode per riordino (nascosto)

### Miglioramenti pianificati
- Logo con identità reale (non solo "CC")
- Raggruppamento visivo delle voci nav (tracking / planning / library / settings)
- Edit mode più discoverable (hint al primo uso)

---

## Stati dell'interfaccia

### Loading
Attuale: nessun feedback visivo durante il caricamento dati.
Target: skeleton placeholder per le card principali.

### Empty states
Attuale: le sezioni spariscono se vuote.
Target: empty state minimale con guidance:
- Favorites vuoti → "Aggiungi preferiti dalla pagina Foods ★"
- Supplements vuoti → la card non compare (ok, è opzionale)
- Frequent vuoti → non mostrare la sezione (ok per i primi giorni)

### Errori
Attuale: Toast con messaggi tecnici in inglese ("Pantry short by Xg of Y").
Target: messaggi in italiano, user-friendly, con azione suggerita.

### Successo
Attuale: nessun feedback dopo log alimento (il form si resetta silenziosamente).
Target: microconfirm — Toast breve "Aggiunto: Pollo 250g" oppure animazione sottile sulla entry table.

---

## Piano d'azione UI — Sprint

### Sprint 1 — Struttura (impatto massimo)
- [ ] Riorganizzare ordine sezioni dashboard (log food in cima)
- [ ] Semplificare toolbar header: gerarchia bottoni, rimuovere emoji
- [ ] Separare visivamente zone funzionali diverse nel dashboard

### Sprint 2 — Identità visiva
- [ ] Introdurre font distintivo per headings (sostituire system font)
- [ ] Scala tipografica a 3 livelli reali
- [ ] Fix palette semantica (green/yellow/red distinti)

### Sprint 3 — Dettaglio e pulizia
- [ ] Water section: 3 quick-add + custom (rimuovere le 6 opzioni)
- [ ] Empty states per favorites e frequent
- [ ] Successo feedback dopo log alimento
- [ ] Internazionalizzazione stringhe hardcoded in inglese
- [ ] Rimuovere emoji dai titoli sezione (`⭐ Favorites` → `Preferiti`)

### Sprint 4 — Polish finale
- [ ] Skeleton loading per card principali
- [ ] Fix date picker nativo (sostituire o stilizzare)
- [ ] Logo/brand reale invece di "CC"
- [ ] Conferma per azioni distruttive (delete water, confirm all)
