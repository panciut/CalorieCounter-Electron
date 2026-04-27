# FoodBuddy — Critique UX/UI
> Data: 2026-04-27

---

## Anti-Patterns Verdict

**Verdetto parziale: passa il test AI slop grave, ma ha i propri peccati.**

Non c'è gradient text, glassmorphism, o neon su dark. La palette è warm e coerente. Però:

- **Card-itis terminale**: ogni sezione del dashboard è `bg-card border border-border rounded-xl` — stessa forma, stessa dimensione, stesso bordo. L'intera app è una colonna di rettangoli arrotondati con ombre lievi. Non è AI slop estetico, ma è AI slop strutturale.
- **System fonts (-apple-system)**: la scelta più pigra possibile. Zero personalità. Il CSS dice letteralmente "non ho pensato alla tipografia".
- **"CC" come logo**: placeholder che è rimasto. Nessun brand.
- **Emoji nei bottoni** (`📋 Planning`, `📋 Copy Day`, `🔁 Swap Days`): tre emoji in un'unica toolbar. Due usano lo stesso emoji 📋 per funzioni diverse. Design a caso, non intenzionale.
- **Header section uniformity**: `text-xs font-semibold text-text-sec uppercase tracking-wider` è la stessa classe su OGNI titolo di sezione. Zero gerarchia visiva tra sezioni diverse.

---

## Design Health Score

| # | Heuristica | Score | Issue chiave |
|---|-----------|-------|--------------|
| 1 | Visibilità stato sistema | 2/4 | Nessuno skeleton/spinner; il loading è invisibile. Toast per errori ma nessun feedback sullo stato del log |
| 2 | Match mondo reale | 3/4 | Terminologia chiara (kcal, g, macros); il naming "green/yellow" per colori che sono entrambi arancione è disorientante |
| 3 | Controllo e libertà | 3/4 | Undo assente per log rapidi; swap days e confirm all sono irreversibili senza warning adeguato |
| 4 | Consistenza e standard | 2/4 | Emoji miste a bottoni testuali; alcune label hardcoded in inglese ("logged", "Confirm All", "Favorites"); due 📋 per funzioni diverse |
| 5 | Prevenzione errori | 2/4 | Nessuna conferma per delete water entry (solo ✕); "confirm all" senza preview conseguenze |
| 6 | Riconoscimento vs ricordo | 3/4 | Food search ottima; toolbar header richiede che l'utente ricordi cosa fa ogni bottone |
| 7 | Flessibilità ed efficienza | 3/4 | Frecce ‹/› per navigazione giorni buone; nessuna keyboard shortcut; frecce tastiera non supportate |
| 8 | Design estetico e minimalista | 1/4 | Dashboard sovraccarica: 9 sezioni di pari peso visivo in un'unica pagina |
| 9 | Recovery dagli errori | 2/4 | Messaggi errore in inglese hardcoded ("Pantry short by Xg of Y"); formato tecnico, non user-friendly |
| 10 | Help e documentazione | 2/4 | Nessun empty state educativo; features nascoste (edit nav, swap days) non discoverable |
| **Totale** | | **23/40** | **Acceptable — lavoro significativo necessario** |

---

## Overall Impression

L'app funziona. La palette warm-dark è una buona direzione. Ma è visivamente opaca: ogni sezione ha lo stesso peso, ogni titolo ha lo stesso stile, ogni card ha la stessa forma. L'utente arriva sul dashboard e viene investito da 9 sezioni distinte senza sapere dove guardare prima. Il maggior colpevole è la mancanza di gerarchia visiva: l'azione primaria (loggare il cibo) è sepolta in fondo, preceduta da dati e utility secondari.

---

## Cosa funziona

**1. Token di colore ben strutturati.** Il sistema CSS con `--accent`, `--text-sec`, `--border` è solido. Dark + warm-tone è la direzione giusta. Il fatto che funzioni anche in light mode è un vantaggio.

**2. La ricerca cibo.** `FoodSearch` con Fuse.js è funzionalmente eccellente. La preview "per 100g" e il calcolo live "Xg = Y kcal" mentre si digita è un UX genuinamente buono.

**3. La nav è customizable.** Drag-to-reorder e hide/show delle pagine è una feature da power user ben implementata — anche se completamente nascosta (ci vuole il click su ✎ per scoprirla).

---

## Priority Issues

### [P0] Gerarchia visiva assente — il dashboard è una lista piatta di sezioni equivalenti

**Problema:** Il dashboard ha ~9 sezioni con lo stesso peso visivo. `DayMacrosCard`, `Energy`, `Water`, `Supplements`, `Exercise`, `Favorites`, `Frequent`, `Log food`, `Entry table` — tutto con `bg-card border border-border rounded-xl p-4`. L'occhio non sa dove andare. L'azione primaria (loggare un alimento) è **in fondo**, dopo 7 sezioni di dati/utility.

**Perché importa:** L'app viene aperta più volte al giorno con un obiettivo preciso: registrare cosa si mangia. Ogni secondo sprecato a trovare il campo di log è friction accumulata ogni pasto ogni giorno.

**Fix:** Ribalta l'ordine. Food search in cima, ben visibile, non dentro una card. Le sezioni dati (macro, water, energy) vengono dopo. Le sezioni informative secondarie (exercise, supplements) collassabili di default. Progressione: "aggiungi → vedi risultato → altri dati".

**Comando suggerito:** `/arrange`

---

### [P1] Toolbar header caotica — 4 bottoni con emoji che si scontrano

**Problema:** La header del dashboard contiene: frecce ‹/›, titolo data, date picker, bottone "Today", pantry switcher, poi `📋 Planning`, `📋 Copy Day`, `🔁 Swap Days`, `Quick Add` — tutti sulla stessa riga, stesso stile. Due bottoni usano `📋` per funzioni diverse (plan mode e copy to clipboard). Nessun bottone ha gerarchia visiva.

**Perché importa:** "Quick Add" dovrebbe essere dominante — è l'azione più frequente — ma visivamente è identico a "Swap Days" che si usa raramente.

**Fix:** Gerarchia chiara: Quick Add = bottone primario pieno (bg-accent). Plan/Copy = bottoni secondari testo-only. Swap days = nascosto in un menu dropdown (…). Eliminare gli emoji dai bottoni testuali, usare icone SVG coerenti o solo testo.

**Comando suggerito:** `/arrange`

---

### [P1] Tipografia zero gerarchia — tutti i titoli sezione identici

**Problema:** Ogni titolo di sezione usa esattamente: `text-xs font-semibold text-text-sec uppercase tracking-wider`. La data (`text-xl font-bold`) è solo leggermente più grande. Non c'è scala tipografica significativa. Il titolo di pagina e l'etichetta di una sezione secondaria sono visivamente quasi identici.

**Perché importa:** La tipografia è il mezzo principale per comunicare struttura e importanza. Senza scala, l'utente costruisce la gerarchia da solo — cognitive load aumenta.

**Fix:** Font distintivo per i titoli di pagina (non system font). Almeno 3 livelli chiari: page title (grande, bold), section header (medium, medium-weight), data label (small, muted). I titoli sezione `UPPERCASE XS MUTED` vanno bene come livello 3 ma non come unico livello.

**Comando suggerito:** `/typeset`

---

### [P2] Semantica colori rotta — "green" e "yellow" sono entrambi arancione

**Problema:**
```css
--green:  #e8941a;  /* visivamente: arancione caldo */
--yellow: #d46c14;  /* visivamente: arancione scuro */
--red:    #b83a10;  /* visivamente: rosso-arancio */
```
Tutti e tre i colori semantici (successo/warning/errore) sono varianti di arancione/amber. Nella `DayMacrosCard`, la barra cambia da "green" a "yellow" a "orange" a "red" ma cromaticamente la progressione è tutta in gamma arancio — nessuna chiarezza visiva dello stato. Un utente daltonico rosso-verde non distingue nulla.

**Perché importa:** I colori semantici sono l'unico indicatore istantaneo di "stai bene / stai esagerando / problema". Se sono indistinguibili, l'informazione non passa.

**Fix:** Palette semantica con colori davvero distinti pur restando warm-toned: verde autentico (con tint warm), amber per warning, rosso per over. Non devono essere vivaci — possono restare muted — ma devono essere distinti.

**Comando suggerito:** `/colorize`

---

### [P2] Water section — 6 bottoni rapidi è overload di scelte

**Problema:** `+100ml +200ml +250ml +500ml +1000ml [Custom] [▼]` — 7 controlli visibili per aggiungere acqua. Tre opzioni (+100, +200, +250) sono così vicine da generare errori di click. Il bottone `▼` per espandere la history non ha label.

**Perché importa:** La semplicità delle quick-action è la loro forza. 6 opzioni identiche non è "flessibile", è "non ho deciso cosa tenere".

**Fix:** 3 opzioni hardcoded (i valori più usati, configurabili nelle Settings) + "Custom". Bottone espandi-history con label "Storico" o icona semantica.

**Comando suggerito:** `/distill`

---

### [P3] Empty states silenziosi — sezioni che spariscono senza spiegare perché

**Problema:** Se non ci sono favorites, la sezione "⭐ Favorites" non esiste. Se non ci sono supplementi, la card sparisce. L'utente nuovo non sa che queste feature esistono. Chi cancella tutti i preferiti perde traccia di come aggiungerli.

**Fix:** Empty state minimi con una riga di guidance e un link/action. Es: "Nessun preferito — aggiungine uno dalla pagina Foods ★".

**Comando suggerito:** `/onboard`

---

## Persona Red Flags

### Marco (utente quotidiano abituale)
Usa l'app 3-4 volte al giorno per loggare i pasti, in fretta, spesso mentre cucina.

- Apre l'app → vede macro card, poi energy card, poi supplements, poi water. La search è in fondo. Scorre ogni volta. ⚠️ **Friction quotidiana.**
- Dopo aver loggato un alimento il form si resetta ma non c'è feedback positivo — nessun "+250g Pollo loggato ✓". Si chiede se ha funzionato. ⚠️
- L'emoji `📋` compare due volte in toolbar per funzioni diverse. Dopo 2 settimane ancora confonde i due. ⚠️

### Sara (secondo utente — partner)
Accede meno frequentemente, meno esperta dell'app.

- Vede `text-xs UPPERCASE` ovunque. Tutto sembra della stessa importanza. Orientamento difficile. ⚠️
- Trova il bottone "✎" nella nav e clicca per sbaglio — entra in edit mode senza capire come uscire (il bottone diventa "Done" senza spiegazione). ⚠️
- I messaggi di errore pantry ("Pantry short by 47g of Pollo") sono in inglese anche con la UI in italiano. ⚠️

---

## Osservazioni minori

- Il bottone `▲/▼` per espandere water history è troppo piccolo e senza label
- `h1 className="text-xl font-bold"` vale poco: `text-xl` è 16px — non è un H1, è testo enfatizzato
- Plan mode usa `📋 Planning` quando attivo, `📋 Plan` quando inattivo — wording incoerente
- Hardcoded strings in inglese sparse ("logged", "Confirm All", "Favorites", "Pantry short by...") in un'app altrimenti i18n
- Il date picker nativo `<input type="date">` ha styling diverso da sistema a sistema — rompe la coerenza visiva su Windows
- `⭐ Favorites` usa emoji nel label mentre le altre sezioni non lo fanno — incoerenza stilistica

---

## Piano d'azione consigliato

| Priorità | Comando | Obiettivo |
|----------|---------|-----------|
| 1 | `/arrange` | Riorganizza dashboard: log in cima, dati sotto, utility secondarie collassabili. Fix toolbar con gerarchia chiara |
| 2 | `/typeset` | Elimina system fonts, introduce font distinctivo, scala tipografica a 3 livelli |
| 3 | `/colorize` | Ridisegna palette semantica: verde autentico, amber, rosso — distinti anche per daltonici |
| 4 | `/distill` | Semplifica water section (3 quick-add + custom), rimuovi rumore da sezioni overloaded |
| 5 | `/onboard` | Empty state per favorites, supplements, frequent foods con guidance inline |
| 6 | `/polish` | Rimozione emoji dai bottoni toolbar, fix wording inconsistente, label ▼ water history, hardcoded strings |
