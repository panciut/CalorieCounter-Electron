// Variant A — "Calmo e svizzero" (Swiss-calm)
// Aesthetic: light warm-paper, generous whitespace, sans tipografica, dati puri.
// Typography: Inter Tight display, Inter body, JetBrains Mono for numbers.
// Macro viz: anello + bars sotto, ma molto pulito e arioso.

function FBVariantSwiss({ density = "normal" }) {
  const T = window.FB_TOTALS;
  const TG = window.FB_TARGETS;
  const E = window.FB_ENERGY;
  const W = window.FB_WATER;
  const entries = window.FB_ENTRIES;

  const calPct = (T.cal / TG.cal.rec) * 100;
  const proPct = (T.protein / TG.protein.rec) * 100;
  const carPct = (T.carbs / TG.carbs.rec) * 100;
  const fatPct = (T.fat / TG.fat.rec) * 100;
  const fibPct = (T.fiber / TG.fiber.rec) * 100;
  const waterPct = (W.total / W.goal) * 100;

  const stepsPct = (E.steps / E.stepsGoal) * 100;
  const energyOut = E.resting + E.active + E.extra;
  const netKcal = T.cal - energyOut;

  const meals = window.FB_MEAL_ORDER.map(m => ({
    meal: m,
    label: window.FB_MEAL_LABEL[m],
    items: entries.filter(e => e.meal === m),
    cal: entries.filter(e => e.meal === m).reduce((s, e) => s + e.calories, 0),
  })).filter(m => m.items.length > 0);

  return (
    <FBScope scheme="warm-paper" density={density} style={{ fontFamily: "var(--font-body)" }}>
      <FBSidebar active="today" />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--fb-bg)" }}>

        {/* Header */}
        <header style={{
          flexShrink: 0, padding: "20px 32px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid var(--fb-divider)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button style={btnIcon}>{FBI.chevL}</button>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--fb-text-3)" }}>
                Oggi
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, letterSpacing: -0.4, color: "var(--fb-text)" }}>
                Martedì 28 aprile
              </div>
            </div>
            <button style={btnIcon}>{FBI.chevR}</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button style={btnGhost}>Pianifica</button>
            <button style={btnGhost}>Copia giorno</button>
            <button style={btnPrimary}>{FBI.plus} Aggiungi</button>
          </div>
        </header>

        {/* Main scroll area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px 60px" }} className="nice-scroll">
          <div style={{ maxWidth: 1080, margin: "0 auto", display: "flex", flexDirection: "column", gap: 32 }}>

            {/* QUICK LOG — primary action at top */}
            <section>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <h2 style={h2Swiss}>Registra</h2>
                <div style={{ flex: 1, height: 1, background: "var(--fb-divider)" }} />
              </div>
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "var(--fb-card)", border: "1px solid var(--fb-border-strong)",
                borderRadius: 12, padding: "4px 4px 4px 16px",
                boxShadow: "0 1px 0 rgba(58,42,20,0.04)",
              }}>
                <span style={{ color: "var(--fb-text-3)" }}>{FBI.search}</span>
                <input placeholder="Cerca alimento, ricetta o codice a barre…"
                  style={{
                    flex: 1, border: 0, background: "transparent", outline: "none",
                    fontFamily: "var(--font-body)", fontSize: 14, color: "var(--fb-text)",
                    padding: "12px 0",
                  }} />
                <button style={{ ...btnPrimary, padding: "10px 16px" }}>{FBI.plus} Quick add</button>
              </div>

              {/* Favorites + frequent — chips */}
              <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                {window.FB_FAVORITES.slice(0, 5).map(f => (
                  <button key={f.id} style={chipFav}>
                    <span style={{ color: "var(--fb-accent)" }}>{React.cloneElement(FBI.starF, { size: 11 })}</span>
                    {f.name}
                  </button>
                ))}
                <div style={{ width: 1, background: "var(--fb-divider)", margin: "4px 4px" }} />
                {window.FB_FREQUENT.slice(0, 4).map(f => (
                  <button key={f.id} style={chipMuted}>{f.name}</button>
                ))}
              </div>
            </section>

            {/* MACROS — anello + bars, calmo */}
            <section style={{
              background: "var(--fb-card)",
              border: "1px solid var(--fb-border)",
              borderRadius: 16,
              padding: 28,
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--fb-text-3)", marginBottom: 6 }}>
                    Apporto giornaliero
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <div className="tnum" style={{ fontFamily: "var(--font-display)", fontSize: 56, fontWeight: 400, letterSpacing: -2.5, color: "var(--fb-text)", lineHeight: 1 }}>
                      {T.cal.toLocaleString("it-IT")}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--fb-text-2)", fontWeight: 500 }}>kcal</div>
                    <div style={{ marginLeft: 16, fontSize: 12, color: "var(--fb-text-3)" }}>
                      / {TG.cal.rec.toLocaleString("it-IT")} kcal target
                    </div>
                  </div>
                  <div className="tnum" style={{ marginTop: 6, fontSize: 12, color: T.cal > TG.cal.max ? "var(--fb-red)" : "var(--fb-green)", fontWeight: 600 }}>
                    {T.cal > TG.cal.max
                      ? `+${T.cal - TG.cal.max} sopra il massimo (${TG.cal.max})`
                      : `${TG.cal.rec - T.cal} kcal residui · range ${TG.cal.min}–${TG.cal.max}`}
                  </div>
                </div>

                {/* Big ring */}
                <FBRing size={140} stroke={9} pct={Math.min(100, calPct)}
                  color={T.cal > TG.cal.max ? "var(--fb-red)" : "var(--fb-green)"}
                  track="var(--fb-border-strong)">
                  <div className="tnum" style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, color: "var(--fb-text)", letterSpacing: -0.5 }}>
                    {Math.round(calPct)}%
                  </div>
                  <div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--fb-text-3)", marginTop: 2 }}>
                    target
                  </div>
                </FBRing>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 18, borderTop: "1px solid var(--fb-divider)" }}>
                <FBMacroBar label="Proteine" value={T.protein} unit="g" min={TG.protein.min} max={TG.protein.max} rec={TG.protein.rec} total={TG.protein.max * 1.15} />
                <FBMacroBar label="Carbo" value={T.carbs} unit="g" min={TG.carbs.min} max={TG.carbs.max} rec={TG.carbs.rec} total={TG.carbs.max * 1.15} />
                <FBMacroBar label="Grassi" value={T.fat} unit="g" min={TG.fat.min} max={TG.fat.max} rec={TG.fat.rec} total={TG.fat.max * 1.15} />
                <FBMacroBar label="Fibre" value={T.fiber} unit="g" min={TG.fiber.min} max={TG.fiber.max} rec={TG.fiber.rec} total={TG.fiber.max * 1.15} />
              </div>
            </section>

            {/* DIARIO — pasti */}
            <section>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                <h2 style={h2Swiss}>Diario di oggi</h2>
                <div style={{ flex: 1, height: 1, background: "var(--fb-divider)" }} />
                <span style={{ fontSize: 11.5, color: "var(--fb-text-3)" }}>{entries.length} alimenti</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {meals.map(m => (
                  <div key={m.meal} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 10, paddingLeft: 4 }}>
                      <span style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 550, color: "var(--fb-text)", letterSpacing: -0.2 }}>
                        {m.label}
                      </span>
                      <span className="tnum" style={{ fontSize: 11, color: "var(--fb-text-3)" }}>
                        {Math.round(m.cal)} kcal
                      </span>
                    </div>
                    <div style={{
                      background: "var(--fb-card)",
                      border: "1px solid var(--fb-border)",
                      borderRadius: 12,
                      overflow: "hidden",
                    }}>
                      {m.items.map((e, i) => (
                        <div key={e.id} style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 60px 60px 60px 60px 24px",
                          alignItems: "center",
                          gap: 8,
                          padding: "10px 16px",
                          borderTop: i > 0 ? "1px solid var(--fb-divider)" : 0,
                          fontSize: 13,
                        }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                            <span style={{ color: "var(--fb-text)", fontWeight: 500 }}>{e.name}</span>
                            <span className="tnum" style={{ fontSize: 10.5, color: "var(--fb-text-3)" }}>
                              {e.grams}g · {e.time}
                            </span>
                          </div>
                          <span className="tnum" style={{ textAlign: "right", color: "var(--fb-text)", fontWeight: 500 }}>{Math.round(e.calories)}</span>
                          <span className="tnum" style={{ textAlign: "right", color: "var(--fb-text-2)", fontSize: 12 }}>{e.protein.toFixed(1)}g</span>
                          <span className="tnum" style={{ textAlign: "right", color: "var(--fb-text-2)", fontSize: 12 }}>{e.carbs.toFixed(1)}g</span>
                          <span className="tnum" style={{ textAlign: "right", color: "var(--fb-text-2)", fontSize: 12 }}>{e.fat.toFixed(1)}g</span>
                          <button style={{ ...btnIcon, padding: 4 }}>{FBI.more}</button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* SECONDARY GRID — water + energy */}
            <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div style={{
                background: "var(--fb-card)", border: "1px solid var(--fb-border)",
                borderRadius: 16, padding: 24,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--fb-text-3)", marginBottom: 6 }}>
                      Acqua
                    </div>
                    <div className="tnum" style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 500, color: "var(--fb-text)", letterSpacing: -1 }}>
                      {(W.total/1000).toFixed(2)} <span style={{ fontSize: 14, color: "var(--fb-text-2)" }}>L</span>
                    </div>
                    <div className="tnum" style={{ fontSize: 11, color: "var(--fb-text-3)" }}>di {(W.goal/1000).toFixed(1)} L</div>
                  </div>
                  <div style={{ width: 96, height: 6, background: "var(--fb-border)", borderRadius: 99, position: "relative", marginTop: 18 }}>
                    <div style={{ position: "absolute", inset: 0, width: Math.min(100, waterPct) + "%", background: "var(--fb-blue)", borderRadius: 99 }} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {[200, 250, 500].map(ml => (
                    <button key={ml} style={chipMuted}>+ {ml} ml</button>
                  ))}
                  <button style={{ ...chipMuted, marginLeft: "auto" }}>Personalizza</button>
                </div>
              </div>

              <div style={{
                background: "var(--fb-card)", border: "1px solid var(--fb-border)",
                borderRadius: 16, padding: 24,
              }}>
                <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--fb-text-3)", marginBottom: 8 }}>
                  Bilancio energetico
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <div className="tnum" style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 500, color: netKcal > 0 ? "var(--fb-orange)" : "var(--fb-green)", letterSpacing: -1 }}>
                    {netKcal > 0 ? "+" : ""}{netKcal}
                  </div>
                  <span style={{ fontSize: 12, color: "var(--fb-text-2)" }}>kcal netti</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--fb-divider)" }}>
                  {[
                    ["In", T.cal, "kcal"],
                    ["Out", energyOut, "kcal"],
                    ["Passi", E.steps, ""],
                  ].map(([l, v, u], i) => (
                    <div key={i}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "var(--fb-text-3)", letterSpacing: 0.5, textTransform: "uppercase" }}>{l}</div>
                      <div className="tnum" style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 550, color: "var(--fb-text)", marginTop: 2 }}>
                        {v.toLocaleString("it-IT")}{u && <span style={{ fontSize: 10.5, color: "var(--fb-text-3)", marginLeft: 3, fontWeight: 400 }}>{u}</span>}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ height: 4, background: "var(--fb-border)", borderRadius: 99, marginTop: 12, position: "relative" }}>
                  <div style={{ position: "absolute", inset: 0, width: Math.min(100, stepsPct) + "%", background: "var(--fb-orange)", borderRadius: 99 }} />
                </div>
              </div>
            </section>

            {/* HEALTH — collapsibles */}
            <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div style={collapseSwiss}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ color: "var(--fb-text-2)" }}>{React.cloneElement(FBI.pill, { size: 16 })}</span>
                    <div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 550, color: "var(--fb-text)" }}>Integratori</div>
                      <div style={{ fontSize: 10.5, color: "var(--fb-text-3)" }}>2 di 4 presi</div>
                    </div>
                  </div>
                  <span style={{ color: "var(--fb-text-3)" }}>{FBI.chevR}</span>
                </div>
              </div>
              <div style={collapseSwiss}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ color: "var(--fb-text-2)" }}>{React.cloneElement(FBI.exercise, { size: 16 })}</span>
                    <div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 550, color: "var(--fb-text)" }}>Allenamento</div>
                      <div style={{ fontSize: 10.5, color: "var(--fb-text-3)" }}>Push · 540 kcal · 58 min</div>
                    </div>
                  </div>
                  <span style={{ color: "var(--fb-text-3)" }}>{FBI.chevR}</span>
                </div>
              </div>
            </section>

          </div>
        </div>
      </div>
    </FBScope>
  );
}

const h2Swiss = {
  fontFamily: "var(--font-display)",
  fontSize: 13, fontWeight: 600,
  letterSpacing: 0.4,
  textTransform: "uppercase",
  color: "var(--fb-text-2)",
  margin: 0,
};

const btnIcon = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  width: 32, height: 32, borderRadius: 8,
  background: "transparent", border: 0,
  color: "var(--fb-text-2)", cursor: "pointer",
};

const btnGhost = {
  display: "inline-flex", alignItems: "center", gap: 6,
  background: "transparent", border: "1px solid var(--fb-border-strong)",
  color: "var(--fb-text-2)", padding: "8px 14px",
  borderRadius: 8, fontSize: 12.5, fontWeight: 500, fontFamily: "var(--font-body)",
  cursor: "pointer",
};

const btnPrimary = {
  display: "inline-flex", alignItems: "center", gap: 6,
  background: "var(--fb-text)", color: "var(--fb-bg)",
  border: 0, padding: "9px 16px",
  borderRadius: 8, fontSize: 12.5, fontWeight: 600, fontFamily: "var(--font-body)",
  cursor: "pointer", letterSpacing: -0.1,
};

const chipFav = {
  display: "inline-flex", alignItems: "center", gap: 6,
  background: "var(--fb-card)", border: "1px solid var(--fb-border-strong)",
  color: "var(--fb-text)", padding: "6px 12px",
  borderRadius: 99, fontSize: 11.5, fontWeight: 500, cursor: "pointer",
  fontFamily: "var(--font-body)",
};

const chipMuted = {
  display: "inline-flex", alignItems: "center", gap: 6,
  background: "transparent", border: "1px solid var(--fb-border)",
  color: "var(--fb-text-2)", padding: "6px 12px",
  borderRadius: 99, fontSize: 11.5, fontWeight: 500, cursor: "pointer",
  fontFamily: "var(--font-body)",
};

const collapseSwiss = {
  background: "var(--fb-card)", border: "1px solid var(--fb-border)",
  borderRadius: 14, padding: "16px 20px", cursor: "pointer",
};

window.FBVariantSwiss = FBVariantSwiss;
