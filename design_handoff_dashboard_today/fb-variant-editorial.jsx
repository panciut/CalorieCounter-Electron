// Variant C — "Editoriale" 
// Aesthetic: serif headings (Fraunces) + sans body, warm-dark, layout one-column rhythm.
// Macro viz: tile stack — un quadrato per ogni macro con percentuale grande.

function FBVariantEditorial({ density = "normal" }) {
  const T = window.FB_TOTALS;
  const TG = window.FB_TARGETS;
  const E = window.FB_ENERGY;
  const W = window.FB_WATER;
  const entries = window.FB_ENTRIES;
  const energyOut = E.resting + E.active + E.extra;
  const netKcal = T.cal - energyOut;
  const waterPct = (W.total / W.goal) * 100;

  const meals = window.FB_MEAL_ORDER.map(m => ({
    meal: m,
    label: window.FB_MEAL_LABEL[m],
    items: entries.filter(e => e.meal === m),
    cal: entries.filter(e => e.meal === m).reduce((s, e) => s + e.calories, 0),
  })).filter(m => m.items.length > 0);

  const tiles = [
    { name: "Energia", value: T.cal, unit: "kcal", min: TG.cal.min, max: TG.cal.max, rec: TG.cal.rec },
    { name: "Proteine", value: T.protein, unit: "g", min: TG.protein.min, max: TG.protein.max, rec: TG.protein.rec },
    { name: "Carbo", value: T.carbs, unit: "g", min: TG.carbs.min, max: TG.carbs.max, rec: TG.carbs.rec },
    { name: "Grassi", value: T.fat, unit: "g", min: TG.fat.min, max: TG.fat.max, rec: TG.fat.rec },
    { name: "Fibre", value: T.fiber, unit: "g", min: TG.fiber.min, max: TG.fiber.max, rec: TG.fiber.rec },
  ];

  return (
    <FBScope scheme="warm-dark" density={density} style={{ fontFamily: "var(--font-body)" }}>
      <FBSidebar active="today" />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--fb-bg)" }}>
        <header style={{
          flexShrink: 0,
          padding: "24px 40px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid var(--fb-divider)",
        }}>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 1.6, textTransform: "uppercase", color: "var(--fb-accent)", marginBottom: 4 }}>
              Diario · 28 / 04 / 26
            </div>
            <h1 style={{
              margin: 0,
              fontFamily: "var(--font-serif)",
              fontSize: 30, fontWeight: 400,
              letterSpacing: -0.6,
              color: "var(--fb-text)",
              fontStyle: "italic",
            }}>
              Martedì, ventotto aprile
            </h1>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button style={btnEGhost}>← Ieri</button>
            <button style={btnEGhost}>Domani →</button>
            <div style={{ width: 1, height: 20, background: "var(--fb-border)", margin: "0 6px" }} />
            <button style={btnEPrimary}>{FBI.plus} Aggiungi</button>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: "auto" }} className="nice-scroll">
          <div style={{ maxWidth: 920, margin: "0 auto", padding: "32px 40px 60px", display: "flex", flexDirection: "column", gap: 40 }}>

            {/* QUICK LOG — typographic, no chrome */}
            <section>
              <div style={sectionLabelE}>Registra un alimento</div>
              <div style={{
                display: "flex", alignItems: "center", gap: 12,
                borderBottom: "1.5px solid var(--fb-text)",
                padding: "8px 0",
                marginTop: 8,
              }}>
                <span style={{ color: "var(--fb-text-3)" }}>{FBI.search}</span>
                <input placeholder="Cerca o crea…" style={{
                  flex: 1, border: 0, background: "transparent", outline: "none",
                  fontFamily: "var(--font-serif)", fontSize: 22, fontStyle: "italic",
                  color: "var(--fb-text)", fontWeight: 400, padding: "4px 0",
                }} />
                <kbd style={{
                  fontSize: 10, color: "var(--fb-text-3)",
                  border: "1px solid var(--fb-border)",
                  padding: "2px 6px", borderRadius: 4,
                  fontFamily: "var(--font-mono)",
                }}>⌘K</kbd>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--fb-text-3)", paddingTop: 6 }}>
                  Suggeriti
                </span>
                {window.FB_FAVORITES.slice(0, 4).concat(window.FB_FREQUENT.slice(0, 3)).map((f, i) => (
                  <button key={i} style={{
                    background: "transparent",
                    border: 0,
                    color: "var(--fb-text)",
                    fontFamily: "var(--font-serif)",
                    fontSize: 14, fontStyle: "italic",
                    cursor: "pointer", padding: "4px 0",
                    borderBottom: "1px solid var(--fb-border-strong)",
                  }}>{f.name}</button>
                )).reduce((acc, el, i) => i === 0 ? [el] : [...acc, <span key={"s"+i} style={{ color: "var(--fb-text-3)", paddingTop: 6 }}>·</span>, el], [])}
              </div>
            </section>

            {/* MACROS — tile stack */}
            <section>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 }}>
                <h2 style={h2Editorial}>Apporto</h2>
                <span style={{ fontSize: 11, color: "var(--fb-text-3)" }}>
                  Target {TG.cal.rec} kcal · range {TG.cal.min}–{TG.cal.max}
                </span>
              </div>

              {/* Hero kcal */}
              <div style={{
                display: "flex", alignItems: "baseline", gap: 14,
                paddingBottom: 18, marginBottom: 18,
                borderBottom: "1px solid var(--fb-divider)",
              }}>
                <span className="tnum" style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 96, fontWeight: 300,
                  letterSpacing: -4,
                  color: "var(--fb-text)",
                  lineHeight: 1,
                }}>
                  {T.cal.toLocaleString("it-IT")}
                </span>
                <div style={{ display: "flex", flexDirection: "column", paddingBottom: 8 }}>
                  <span style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 18, color: "var(--fb-text-2)" }}>kcal</span>
                  <span className="tnum" style={{ fontSize: 11.5, color: T.cal > TG.cal.max ? "var(--fb-red)" : "var(--fb-green)", fontWeight: 600, marginTop: 2 }}>
                    {T.cal > TG.cal.max ? `+${T.cal - TG.cal.max} oltre` : `${TG.cal.rec - T.cal} residui`}
                  </span>
                </div>
              </div>

              {/* Tile stack */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
                {tiles.map((tile, i) => {
                  const pct = Math.min(100, Math.round((tile.value / tile.rec) * 100));
                  const color = window.fbBarColor(tile.value, tile.min, tile.max, tile.rec);
                  return (
                    <div key={i} style={{
                      background: "var(--fb-card)",
                      border: "1px solid var(--fb-border)",
                      borderRadius: 10,
                      padding: 14,
                      display: "flex", flexDirection: "column", gap: 8,
                      position: "relative", overflow: "hidden",
                      minHeight: 130,
                    }}>
                      <div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--fb-text-3)" }}>
                        {tile.name}
                      </div>
                      <div className="tnum" style={{ fontFamily: "var(--font-serif)", fontSize: 26, fontWeight: 400, color: "var(--fb-text)", letterSpacing: -0.8, lineHeight: 1 }}>
                        {tile.value.toLocaleString("it-IT", { maximumFractionDigits: 0 })}
                        <span style={{ fontSize: 12, color: "var(--fb-text-3)", marginLeft: 2, fontStyle: "italic" }}>{tile.unit}</span>
                      </div>
                      <div style={{ flex: 1 }} />
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span className="tnum" style={{ fontFamily: "var(--font-serif)", fontSize: 14, fontWeight: 500, color, fontStyle: "italic" }}>
                          {pct}%
                        </span>
                        <span className="tnum" style={{ fontSize: 9.5, color: "var(--fb-text-3)" }}>
                          {tile.min}–{tile.max}
                        </span>
                      </div>
                      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 3, background: "var(--fb-bg-2)" }}>
                        <div style={{ height: "100%", width: pct + "%", background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* DIARY — editorial list */}
            <section>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 }}>
                <h2 style={h2Editorial}>Diario del giorno</h2>
                <span style={{ fontSize: 11, color: "var(--fb-text-3)" }}>{entries.length} alimenti · 5 pasti</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column" }}>
                {meals.map((m, mi) => (
                  <div key={m.meal} style={{
                    display: "grid",
                    gridTemplateColumns: "120px 1fr",
                    gap: 24,
                    padding: "20px 0",
                    borderTop: mi === 0 ? "1px solid var(--fb-divider)" : 0,
                    borderBottom: "1px solid var(--fb-divider)",
                  }}>
                    <div>
                      <div style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 17, color: "var(--fb-text)", letterSpacing: -0.2 }}>
                        {m.label}
                      </div>
                      <div className="tnum" style={{ fontSize: 10.5, color: "var(--fb-text-3)", marginTop: 4, letterSpacing: 0.4 }}>
                        {m.items[0].time}
                      </div>
                      <div className="tnum" style={{ fontSize: 11.5, color: "var(--fb-text-2)", fontWeight: 600, marginTop: 6 }}>
                        {Math.round(m.cal)} kcal
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {m.items.map(e => (
                        <div key={e.id} style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 60px 50px",
                          alignItems: "baseline", gap: 16,
                          fontSize: 13.5,
                        }}>
                          <span style={{ color: "var(--fb-text)" }}>{e.name}</span>
                          <span className="tnum" style={{ textAlign: "right", color: "var(--fb-text-3)", fontSize: 11.5 }}>
                            {e.grams}g
                          </span>
                          <span className="tnum" style={{ textAlign: "right", color: "var(--fb-text)", fontWeight: 500 }}>
                            {Math.round(e.calories)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* HEALTH PAIR */}
            <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div>
                <div style={sectionLabelE}>Acqua</div>
                <div className="tnum" style={{ fontFamily: "var(--font-serif)", fontSize: 56, fontWeight: 300, letterSpacing: -2, color: "var(--fb-text)", lineHeight: 1, marginTop: 6 }}>
                  {(W.total/1000).toFixed(2)}
                  <span style={{ fontSize: 16, fontStyle: "italic", color: "var(--fb-text-2)", marginLeft: 4 }}>L</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                  <div style={{ flex: 1, height: 2, background: "var(--fb-border)", position: "relative" }}>
                    <div style={{ position: "absolute", inset: 0, width: Math.min(100, waterPct) + "%", background: "var(--fb-blue)" }} />
                  </div>
                  <span className="tnum" style={{ fontSize: 11, color: "var(--fb-text-3)" }}>
                    {Math.round(waterPct)}% · {(W.goal/1000).toFixed(1)} L
                  </span>
                </div>
                <div style={{ display: "flex", gap: 14, marginTop: 14 }}>
                  {[200, 250, 500].map(ml => (
                    <button key={ml} style={{
                      background: "transparent", border: 0,
                      color: "var(--fb-text)", padding: "4px 0",
                      fontFamily: "var(--font-serif)", fontStyle: "italic",
                      fontSize: 14, cursor: "pointer",
                      borderBottom: "1px solid var(--fb-border-strong)",
                    }}>+ {ml}ml</button>
                  ))}
                </div>
              </div>

              <div>
                <div style={sectionLabelE}>Bilancio energetico</div>
                <div className="tnum" style={{ fontFamily: "var(--font-serif)", fontSize: 56, fontWeight: 300, letterSpacing: -2, color: netKcal > 0 ? "var(--fb-orange)" : "var(--fb-green)", lineHeight: 1, marginTop: 6 }}>
                  {netKcal > 0 ? "+" : ""}{netKcal}
                  <span style={{ fontSize: 16, fontStyle: "italic", color: "var(--fb-text-2)", marginLeft: 4 }}>kcal</span>
                </div>
                <div style={{ display: "flex", gap: 24, marginTop: 14, fontSize: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "var(--fb-text-3)", letterSpacing: 1, textTransform: "uppercase" }}>In</div>
                    <div className="tnum" style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "var(--fb-text)", marginTop: 2 }}>{T.cal}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "var(--fb-text-3)", letterSpacing: 1, textTransform: "uppercase" }}>Out</div>
                    <div className="tnum" style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "var(--fb-text)", marginTop: 2 }}>{energyOut}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "var(--fb-text-3)", letterSpacing: 1, textTransform: "uppercase" }}>Passi</div>
                    <div className="tnum" style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "var(--fb-text)", marginTop: 2 }}>{E.steps.toLocaleString("it-IT")}</div>
                  </div>
                </div>
              </div>
            </section>

          </div>
        </div>
      </div>
    </FBScope>
  );
}

const h2Editorial = {
  fontFamily: "var(--font-serif)",
  fontSize: 22, fontWeight: 400,
  fontStyle: "italic",
  letterSpacing: -0.4,
  color: "var(--fb-text)",
  margin: 0,
};

const sectionLabelE = {
  fontSize: 10.5, fontWeight: 600,
  letterSpacing: 1.6, textTransform: "uppercase",
  color: "var(--fb-text-3)",
};

const btnEGhost = {
  background: "transparent", border: 0,
  color: "var(--fb-text-2)", padding: "8px 12px",
  fontFamily: "var(--font-serif)", fontStyle: "italic",
  fontSize: 14, fontWeight: 400, cursor: "pointer",
};

const btnEPrimary = {
  display: "inline-flex", alignItems: "center", gap: 6,
  background: "var(--fb-text)", color: "var(--fb-bg)",
  border: 0, padding: "9px 16px",
  borderRadius: 999, fontSize: 12.5, fontWeight: 600, fontFamily: "var(--font-body)",
  cursor: "pointer", letterSpacing: -0.1,
};

window.FBVariantEditorial = FBVariantEditorial;
