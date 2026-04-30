// Variant D — mix B (data-dense bento, warm-dark) + C (serif editorial).
// - Heading serif italic (Fraunces) — preso da C
// - Layout bento + densità — preso da B
// - Anelli concentrici Apple Activity — da B
// - Hero kcal grande con cifra serif — da C
// - Tile macro a fianco con percentuale serif — fusione

function FBVariantHybrid({ density = "normal", scheme = "warm-dark" }) {
  const T = window.FB_TOTALS;
  const TG = window.FB_TARGETS;
  const E = window.FB_ENERGY;
  const W = window.FB_WATER;
  const entries = window.FB_ENTRIES;

  const calPct = (T.cal / TG.cal.rec) * 100;
  const proPct = (T.protein / TG.protein.rec) * 100;
  const carPct = (T.carbs / TG.carbs.rec) * 100;
  const fatPct = (T.fat / TG.fat.rec) * 100;
  const waterPct = (W.total / W.goal) * 100;
  const energyOut = E.resting + E.active + E.extra;
  const netKcal = T.cal - energyOut;

  const meals = window.FB_MEAL_ORDER.map(m => ({
    meal: m,
    label: window.FB_MEAL_LABEL[m],
    items: entries.filter(e => e.meal === m),
    cal: entries.filter(e => e.meal === m).reduce((s, e) => s + e.calories, 0),
    pro: entries.filter(e => e.meal === m).reduce((s, e) => s + e.protein, 0),
  })).filter(m => m.items.length > 0);

  return (
    <FBScope scheme={scheme} density={density} style={{ fontFamily: "var(--font-body)" }}>
      <FBSidebar active="today" />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--fb-bg)" }}>
        {/* Header — editoriale ma compatto come B */}
        <header style={{
          flexShrink: 0,
          padding: "16px 28px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid var(--fb-border)",
          background: "var(--fb-bg)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button style={btnHIcon}>{FBI.chevL}</button>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1.6, textTransform: "uppercase", color: "var(--fb-accent)" }}>
                Diario · Oggi
              </div>
              <div style={{
                fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 400,
                fontStyle: "italic", letterSpacing: -0.4, color: "var(--fb-text)", lineHeight: 1.1,
              }}>
                Martedì, 28 aprile
              </div>
            </div>
            <button style={btnHIcon}>{FBI.chevR}</button>
            <div style={{ width: 1, height: 22, background: "var(--fb-border)", margin: "0 4px" }} />
            <button style={btnHGhost}>Pianifica</button>
            <button style={btnHIcon}>{FBI.copy}</button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "var(--fb-card)", border: "1px solid var(--fb-border-strong)",
              borderRadius: 8, padding: "6px 12px", minWidth: 280,
            }}>
              <span style={{ color: "var(--fb-text-3)" }}>{React.cloneElement(FBI.search, { size: 14 })}</span>
              <input placeholder="Cerca alimento, ricetta…  ⌘K"
                style={{ flex: 1, border: 0, background: "transparent", outline: "none", color: "var(--fb-text)", fontSize: 12.5, fontFamily: "var(--font-body)" }} />
            </div>
            <button style={btnHPrimary}>{FBI.plus} Aggiungi</button>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px 50px" }} className="nice-scroll">
          <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

            {/* QUICK LOG STRIP — chips inline come B */}
            <section style={{
              background: "var(--fb-card)", border: "1px solid var(--fb-border)", borderRadius: 12,
              padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, overflowX: "auto",
            }} className="hide-scrollbar">
              <span style={{
                fontFamily: "var(--font-serif)", fontStyle: "italic",
                fontSize: 12.5, fontWeight: 400,
                color: "var(--fb-text-2)", flexShrink: 0, paddingRight: 4,
              }}>
                Suggeriti
              </span>
              {window.FB_FAVORITES.slice(0, 4).map(f => (
                <button key={f.id} style={chipHFav}>
                  <span style={{ color: "var(--fb-accent)" }}>{React.cloneElement(FBI.starF, { size: 10 })}</span>
                  {f.name}
                </button>
              ))}
              <div style={{ width: 1, height: 16, background: "var(--fb-border)", flexShrink: 0 }} />
              {window.FB_FREQUENT.slice(0, 5).map(f => (
                <button key={f.id} style={chipHMuted}>{f.name}</button>
              ))}
            </section>

            {/* HERO BENTO — anelli + hero kcal serif + tiles */}
            <section style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 16 }}>

              {/* LEFT: anelli concentrici + hero serif kcal */}
              <div style={{ ...cardHybrid, display: "flex", gap: 24, alignItems: "center", padding: 24 }}>
                <ConcentricRings
                  rings={[
                    { pct: calPct, color: "var(--fb-orange)", label: "kcal" },
                    { pct: proPct, color: "var(--fb-red)", label: "P" },
                    { pct: carPct, color: "var(--fb-amber)", label: "C" },
                    { pct: fatPct, color: "var(--fb-green)", label: "F" },
                  ]}
                  centerTop={Math.round(calPct) + "%"}
                  centerSub="target"
                  size={170}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--fb-text-3)" }}>
                    Apporto del giorno
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span className="tnum" style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 64, fontWeight: 300,
                      letterSpacing: -2.5, color: "var(--fb-text)", lineHeight: 1,
                    }}>
                      {T.cal.toLocaleString("it-IT")}
                    </span>
                    <span style={{
                      fontFamily: "var(--font-serif)", fontStyle: "italic",
                      fontSize: 16, color: "var(--fb-text-2)",
                    }}>
                      kcal
                    </span>
                  </div>
                  <div className="tnum" style={{
                    fontSize: 12, color: T.cal > TG.cal.max ? "var(--fb-red)" : "var(--fb-green)",
                    fontWeight: 600, marginTop: 2,
                  }}>
                    {T.cal > TG.cal.max
                      ? `+${T.cal - TG.cal.max} oltre il massimo`
                      : `${TG.cal.rec - T.cal} residui`}
                    <span style={{ color: "var(--fb-text-3)", fontWeight: 500, marginLeft: 6 }}>
                      · range {TG.cal.min}–{TG.cal.max}
                    </span>
                  </div>

                  {/* Macro mini-rows */}
                  <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 9, minWidth: 360 }}>
                    {[
                      { name: "Proteine", actual: T.protein, unit: "g", min: TG.protein.min, max: TG.protein.max, rec: TG.protein.rec, color: "var(--fb-red)" },
                      { name: "Carboidrati", actual: T.carbs, unit: "g", min: TG.carbs.min, max: TG.carbs.max, rec: TG.carbs.rec, color: "var(--fb-amber)" },
                      { name: "Grassi", actual: T.fat, unit: "g", min: TG.fat.min, max: TG.fat.max, rec: TG.fat.rec, color: "var(--fb-green)" },
                    ].map((m, i) => {
                      const pct = Math.min(100, (m.actual / m.max) * 100);
                      const minPct = (m.min / m.max) * 100;
                      const recPct = (m.rec / m.max) * 100;
                      const color = window.fbBarColor(m.actual, m.min, m.max, m.rec);
                      const macroPct = Math.round((m.actual / m.rec) * 100);
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: m.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 11.5, color: "var(--fb-text-2)", width: 86, fontWeight: 500 }}>{m.name}</span>
                          <div style={{ flex: 1, height: 5, background: "var(--fb-bg-2)", borderRadius: 99, position: "relative" }}>
                            <div style={{ position: "absolute", top: 0, bottom: 0, left: minPct + "%", width: (100 - minPct) + "%", background: "var(--fb-border-strong)", borderRadius: 99 }} />
                            <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: pct + "%", background: color, borderRadius: 99 }} />
                            <div style={{ position: "absolute", top: -2, bottom: -2, left: recPct + "%", width: 1.5, background: "var(--fb-text-2)", opacity: 0.5 }} />
                          </div>
                          <span className="tnum" style={{ fontSize: 11.5, color: "var(--fb-text)", fontWeight: 600, width: 50, textAlign: "right" }}>
                            {m.actual.toLocaleString("it-IT", { maximumFractionDigits: 1 })}{m.unit}
                          </span>
                          <span className="tnum" style={{
                            fontFamily: "var(--font-serif)", fontStyle: "italic",
                            fontSize: 12, color, width: 36, textAlign: "right", fontWeight: 500,
                          }}>
                            {macroPct}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* RIGHT: energy + water stacked, serif accents */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={cardHybrid}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ color: "var(--fb-orange)" }}>{React.cloneElement(FBI.flame, { size: 14 })}</span>
                    <span style={sectionLabelH}>Bilancio</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span className="tnum" style={{
                      fontFamily: "var(--font-serif)", fontSize: 38, fontWeight: 400,
                      letterSpacing: -1.5, color: netKcal > 0 ? "var(--fb-orange)" : "var(--fb-green)", lineHeight: 1,
                    }}>
                      {netKcal > 0 ? "+" : ""}{netKcal}
                    </span>
                    <span style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 12, color: "var(--fb-text-2)" }}>kcal netti</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--fb-divider)" }}>
                    {[["In", T.cal], ["Out", energyOut], ["Passi", E.steps]].map(([l,v], i) => (
                      <div key={i}>
                        <div style={{ fontSize: 9.5, fontWeight: 600, color: "var(--fb-text-3)", letterSpacing: 0.8, textTransform: "uppercase" }}>{l}</div>
                        <div className="tnum" style={{ fontFamily: "var(--font-serif)", fontSize: 15, fontWeight: 500, color: "var(--fb-text)", marginTop: 2 }}>
                          {v.toLocaleString("it-IT")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={cardHybrid}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ color: "var(--fb-blue)" }}>{React.cloneElement(FBI.drop, { size: 14 })}</span>
                    <span style={sectionLabelH}>Acqua</span>
                    <span className="tnum" style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--fb-text-3)" }}>
                      {Math.round(waterPct)}%
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span className="tnum" style={{
                      fontFamily: "var(--font-serif)", fontSize: 38, fontWeight: 400,
                      letterSpacing: -1.5, color: "var(--fb-text)", lineHeight: 1,
                    }}>
                      {(W.total/1000).toFixed(2)}
                    </span>
                    <span style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 12, color: "var(--fb-text-2)" }}>
                      L · di {(W.goal/1000).toFixed(1)} L
                    </span>
                  </div>
                  <div style={{ height: 4, background: "var(--fb-bg-2)", borderRadius: 99, marginTop: 10, position: "relative" }}>
                    <div style={{ position: "absolute", inset: 0, width: Math.min(100, waterPct) + "%", background: "var(--fb-blue)", borderRadius: 99 }} />
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                    {[250, 500].map(ml => <button key={ml} style={chipHMuted}>+{ml}ml</button>)}
                    <button style={chipHMuted}>Custom</button>
                  </div>
                </div>
              </div>
            </section>

            {/* DIARY — bento dense ma con label pasto serif italic */}
            <section style={cardHybrid}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <h2 style={{
                    fontFamily: "var(--font-serif)", fontStyle: "italic",
                    fontSize: 18, fontWeight: 400, color: "var(--fb-text)",
                    margin: 0, letterSpacing: -0.3,
                  }}>
                    Diario del giorno
                  </h2>
                  <span style={{ fontSize: 10.5, color: "var(--fb-text-3)" }}>{entries.length} alimenti · 5 pasti</span>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button style={btnHIcon}>{React.cloneElement(FBI.filter, { size: 14 })}</button>
                  <button style={btnHIcon}>{React.cloneElement(FBI.copy, { size: 14 })}</button>
                </div>
              </div>

              <div style={{
                display: "grid",
                gridTemplateColumns: "minmax(0,1.3fr) 56px 56px 56px 56px 56px 24px",
                gap: 8,
                padding: "0 8px 8px",
                fontSize: 9.5, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: "var(--fb-text-3)",
                borderBottom: "1px solid var(--fb-divider)",
              }}>
                <span>Alimento</span>
                <span style={{ textAlign: "right" }}>Qtà</span>
                <span style={{ textAlign: "right" }}>kcal</span>
                <span style={{ textAlign: "right" }}>P</span>
                <span style={{ textAlign: "right" }}>C</span>
                <span style={{ textAlign: "right" }}>F</span>
                <span></span>
              </div>

              {meals.map(m => (
                <div key={m.meal}>
                  <div style={{
                    display: "flex", alignItems: "baseline", gap: 10,
                    padding: "12px 8px 6px",
                    margin: "0 -8px",
                    borderTop: "1px solid var(--fb-divider)",
                    background: "var(--fb-bg-2)",
                  }}>
                    <span style={{
                      fontFamily: "var(--font-serif)", fontStyle: "italic",
                      fontSize: 14, fontWeight: 400, color: "var(--fb-text)", letterSpacing: -0.2,
                    }}>
                      {m.label}
                    </span>
                    <span className="tnum" style={{ fontSize: 10, color: "var(--fb-text-3)", letterSpacing: 0.4 }}>
                      {m.items[0].time}
                    </span>
                    <span style={{ flex: 1 }} />
                    <span className="tnum" style={{ fontSize: 11, color: "var(--fb-text-2)", fontWeight: 600 }}>
                      {Math.round(m.cal)} kcal · {m.pro.toFixed(0)}g P
                    </span>
                    <button style={{ ...btnHIcon, padding: 2 }}>{React.cloneElement(FBI.plus, { size: 12 })}</button>
                  </div>
                  {m.items.map(e => (
                    <div key={e.id} style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0,1.3fr) 56px 56px 56px 56px 56px 24px",
                      gap: 8, alignItems: "center",
                      padding: "8px",
                      fontSize: 12,
                      borderBottom: "1px solid var(--fb-divider)",
                    }}>
                      <span style={{ color: "var(--fb-text)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.name}</span>
                      <span className="tnum" style={{ textAlign: "right", color: "var(--fb-text-2)" }}>{e.grams}g</span>
                      <span className="tnum" style={{ textAlign: "right", color: "var(--fb-text)", fontWeight: 600 }}>{Math.round(e.calories)}</span>
                      <span className="tnum" style={{ textAlign: "right", color: "var(--fb-text-2)" }}>{e.protein.toFixed(1)}</span>
                      <span className="tnum" style={{ textAlign: "right", color: "var(--fb-text-2)" }}>{e.carbs.toFixed(1)}</span>
                      <span className="tnum" style={{ textAlign: "right", color: "var(--fb-text-2)" }}>{e.fat.toFixed(1)}</span>
                      <button style={{ ...btnHIcon, padding: 2 }}>{React.cloneElement(FBI.more, { size: 13 })}</button>
                    </div>
                  ))}
                </div>
              ))}
            </section>

            {/* BENTO ROW — supplements + pantry + body */}
            <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              <div style={cardHybrid}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{
                    fontFamily: "var(--font-serif)", fontStyle: "italic",
                    fontSize: 14, fontWeight: 400, color: "var(--fb-text)",
                  }}>Integratori</span>
                  <span className="tnum" style={{ fontSize: 10.5, color: "var(--fb-text-3)" }}>2 / 4</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {window.FB_SUPPLEMENTS.map(s => (
                    <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11.5 }}>
                      <span style={{
                        width: 14, height: 14, borderRadius: 4,
                        border: s.taken >= s.qty ? "1px solid var(--fb-green)" : "1px solid var(--fb-border-strong)",
                        background: s.taken >= s.qty ? "var(--fb-green)" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "var(--fb-bg)",
                      }}>{s.taken >= s.qty && React.cloneElement(FBI.check, { size: 10, stroke: 3 })}</span>
                      <span style={{ flex: 1, color: s.taken >= s.qty ? "var(--fb-text-3)" : "var(--fb-text)", textDecoration: s.taken >= s.qty ? "line-through" : "none" }}>
                        {s.name}
                      </span>
                      <span style={{ fontSize: 9.5, color: "var(--fb-text-3)", letterSpacing: 0.6, textTransform: "uppercase" }}>
                        {s.time === "breakfast" ? "Mattina" : s.time === "evening" ? "Sera" : "Pom."}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={cardHybrid}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{
                    fontFamily: "var(--font-serif)", fontStyle: "italic",
                    fontSize: 14, fontWeight: 400, color: "var(--fb-text)",
                  }}>Dispensa</span>
                  <FBPill color="var(--fb-amber)" bg="rgba(224,169,58,0.1)">Bassa</FBPill>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {window.FB_PANTRY_LOW.map((p, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11.5 }}>
                      <span style={{ color: "var(--fb-text)" }}>{p.name}</span>
                      <span className="tnum" style={{ color: "var(--fb-amber)", fontWeight: 600 }}>{p.qty} {p.unit}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={cardHybrid}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{
                    fontFamily: "var(--font-serif)", fontStyle: "italic",
                    fontSize: 14, fontWeight: 400, color: "var(--fb-text)",
                  }}>Peso</span>
                  <span style={{ fontSize: 10.5, color: "var(--fb-green)", display: "inline-flex", alignItems: "center", gap: 3 }}>
                    {React.cloneElement(FBI.arrowDn, { size: 11 })} {Math.abs(window.FB_BODY.weightDelta)} kg
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span className="tnum" style={{
                    fontFamily: "var(--font-serif)", fontSize: 30, fontWeight: 400,
                    color: "var(--fb-text)", letterSpacing: -1, lineHeight: 1,
                  }}>
                    {window.FB_BODY.weight}
                  </span>
                  <span style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 12, color: "var(--fb-text-2)" }}>kg</span>
                </div>
                <Sparkline points={window.FB_BODY.weightTrend} color="var(--fb-accent)" />
              </div>
            </section>

            {/* COLLAPSIBLES — Allenamento, Note, Storico */}
            <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { icon: FBI.exercise, title: "Allenamento", subtitle: "Push · 540 kcal · 58 min · 8 esercizi", count: "1 sessione" },
                { icon: FBI.edit, title: "Note del giorno", subtitle: "Aggiungi appunti, sensazioni, fame…", count: "vuoto" },
                { icon: FBI.history, title: "Storico recente", subtitle: "Confronta con ieri, settimana, media 7g", count: "—" },
              ].map((row, i) => (
                <button key={i} style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto auto",
                  alignItems: "center", gap: 14,
                  background: "var(--fb-card)", border: "1px solid var(--fb-border)",
                  borderRadius: 10, padding: "14px 18px",
                  cursor: "pointer", textAlign: "left",
                  fontFamily: "var(--font-body)",
                }}>
                  <span style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: "var(--fb-bg-2)", border: "1px solid var(--fb-divider)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "var(--fb-text-2)",
                  }}>{React.cloneElement(row.icon, { size: 15 })}</span>
                  <div>
                    <div style={{
                      fontFamily: "var(--font-serif)", fontStyle: "italic",
                      fontSize: 15, fontWeight: 400, color: "var(--fb-text)", letterSpacing: -0.2,
                    }}>{row.title}</div>
                    <div style={{ fontSize: 11, color: "var(--fb-text-3)", marginTop: 1 }}>{row.subtitle}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--fb-text-3)" }}>
                    {row.count}
                  </span>
                  <span style={{ color: "var(--fb-text-3)" }}>{React.cloneElement(FBI.chevD, { size: 16 })}</span>
                </button>
              ))}
            </section>
          </div>
        </div>
      </div>
    </FBScope>
  );
}

const cardHybrid = {
  background: "var(--fb-card)",
  border: "1px solid var(--fb-border)",
  borderRadius: 12,
  padding: 16,
};

const sectionLabelH = {
  fontSize: 10, fontWeight: 600, letterSpacing: 1.4, textTransform: "uppercase",
  color: "var(--fb-text-2)",
};

const btnHIcon = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  width: 28, height: 28, borderRadius: 6,
  background: "transparent", border: 0,
  color: "var(--fb-text-2)", cursor: "pointer",
};

const btnHGhost = {
  display: "inline-flex", alignItems: "center", gap: 5,
  background: "transparent", border: "1px solid var(--fb-border-strong)",
  color: "var(--fb-text-2)", padding: "6px 12px",
  borderRadius: 6, fontSize: 12, fontWeight: 500, fontFamily: "var(--font-body)",
  cursor: "pointer",
};

const btnHPrimary = {
  display: "inline-flex", alignItems: "center", gap: 6,
  background: "var(--fb-accent)", color: "white",
  border: 0, padding: "7px 14px",
  borderRadius: 7, fontSize: 12.5, fontWeight: 600, fontFamily: "var(--font-body)",
  cursor: "pointer",
};

const chipHFav = {
  display: "inline-flex", alignItems: "center", gap: 5,
  background: "var(--fb-bg-2)", border: "1px solid var(--fb-border-strong)",
  color: "var(--fb-text)", padding: "4px 10px",
  borderRadius: 6, fontSize: 11.5, fontWeight: 500, cursor: "pointer",
  fontFamily: "var(--font-body)", flexShrink: 0,
};

const chipHMuted = {
  display: "inline-flex", alignItems: "center",
  background: "transparent", border: "1px solid var(--fb-border)",
  color: "var(--fb-text-2)", padding: "4px 10px",
  borderRadius: 6, fontSize: 11.5, fontWeight: 500, cursor: "pointer",
  fontFamily: "var(--font-body)", flexShrink: 0,
};

window.FBVariantHybrid = FBVariantHybrid;
