// Variant B — "Data-dense Linear/Things"
// Aesthetic: warm-dark raffinato, grid bento, info density alta ma elegante.
// Macro viz: anelli concentrici Apple Activity (kcal/protein/carbs/fat).
// Tipografia: Inter Tight ovunque, mono per numeri grandi.

function FBVariantDense({ density = "normal" }) {
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
  const stepsPct = (E.steps / E.stepsGoal) * 100;
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
    <FBScope scheme="warm-dark" density={density} style={{ fontFamily: "var(--font-body)" }}>
      <FBSidebar active="today" />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--fb-bg)" }}>

        {/* Top bar */}
        <header style={{
          flexShrink: 0,
          padding: "12px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid var(--fb-border)",
          background: "var(--fb-bg)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button style={btnDIcon}>{FBI.chevL}</button>
            <div style={{ padding: "0 8px", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--fb-text)", fontFamily: "var(--font-display)" }}>
                Mar 28 apr
              </span>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--fb-accent)", letterSpacing: 1, textTransform: "uppercase", padding: "2px 8px", background: "var(--fb-accent-soft)", borderRadius: 6 }}>
                Oggi
              </span>
            </div>
            <button style={btnDIcon}>{FBI.chevR}</button>
            <div style={{ width: 1, height: 18, background: "var(--fb-border)", margin: "0 8px" }} />
            <button style={btnDGhost}>Pianifica</button>
            <button style={btnDIcon}>{FBI.swap}</button>
            <button style={btnDIcon}>{FBI.copy}</button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "var(--fb-card)", border: "1px solid var(--fb-border-strong)",
              borderRadius: 8, padding: "6px 12px", minWidth: 320,
            }}>
              <span style={{ color: "var(--fb-text-3)" }}>{React.cloneElement(FBI.search, { size: 14 })}</span>
              <input placeholder="Cerca alimento o ricetta…  ⌘K"
                style={{ flex: 1, border: 0, background: "transparent", outline: "none", color: "var(--fb-text)", fontSize: 12.5, fontFamily: "var(--font-body)" }} />
            </div>
            <button style={btnDPrimary}>{FBI.plus} Aggiungi</button>
          </div>
        </header>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px 40px" }} className="nice-scroll">
          <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

            {/* QUICK LOG STRIP — favorites and frequent inline as compact chips */}
            <section style={{
              background: "var(--fb-card)", border: "1px solid var(--fb-border)", borderRadius: 12,
              padding: "10px 12px", display: "flex", alignItems: "center", gap: 8, overflowX: "auto",
            }} className="hide-scrollbar">
              <span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--fb-text-3)", flexShrink: 0, paddingRight: 4 }}>
                Quick log
              </span>
              {window.FB_FAVORITES.slice(0, 4).map(f => (
                <button key={f.id} style={chipDFav}>
                  <span style={{ color: "var(--fb-accent)" }}>{React.cloneElement(FBI.starF, { size: 10 })}</span>
                  {f.name}
                </button>
              ))}
              <div style={{ width: 1, height: 16, background: "var(--fb-border)", flexShrink: 0 }} />
              {window.FB_FREQUENT.slice(0, 5).map(f => (
                <button key={f.id} style={chipDMuted}>{f.name}</button>
              ))}
            </section>

            {/* BENTO ROW 1 — Macros (big), Energy + water (right) */}
            <section style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>

              {/* MACROS — concentric Apple Activity rings */}
              <div style={cardDense}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <FBPill bg="var(--fb-accent-soft)" color="var(--fb-accent)">Macro</FBPill>
                    <span style={{ fontSize: 11, color: "var(--fb-text-3)" }}>Apporto · range tolleranza</span>
                  </div>
                  <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: "var(--fb-text-3)" }}>
                    target {TG.cal.rec} kcal
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 24, alignItems: "center" }}>
                  {/* Concentric rings */}
                  <ConcentricRings
                    rings={[
                      { pct: calPct, color: "var(--fb-orange)", label: "kcal" },
                      { pct: proPct, color: "var(--fb-red)", label: "P" },
                      { pct: carPct, color: "var(--fb-amber)", label: "C" },
                      { pct: fatPct, color: "var(--fb-green)", label: "F" },
                    ]}
                    centerTop={T.cal.toLocaleString("it-IT")}
                    centerSub="kcal"
                  />

                  {/* Side legend with actual / range */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[
                      { name: "Energia", actual: T.cal, unit: "kcal", min: TG.cal.min, max: TG.cal.max, rec: TG.cal.rec, color: "var(--fb-orange)" },
                      { name: "Proteine", actual: T.protein, unit: "g", min: TG.protein.min, max: TG.protein.max, rec: TG.protein.rec, color: "var(--fb-red)" },
                      { name: "Carboidrati", actual: T.carbs, unit: "g", min: TG.carbs.min, max: TG.carbs.max, rec: TG.carbs.rec, color: "var(--fb-amber)" },
                      { name: "Grassi", actual: T.fat, unit: "g", min: TG.fat.min, max: TG.fat.max, rec: TG.fat.rec, color: "var(--fb-green)" },
                      { name: "Fibre", actual: T.fiber, unit: "g", min: TG.fiber.min, max: TG.fiber.max, rec: TG.fiber.rec, color: "var(--fb-blue)" },
                    ].map((m, i) => {
                      const pct = Math.min(100, (m.actual / m.max) * 100);
                      const minPct = (m.min / m.max) * 100;
                      const recPct = (m.rec / m.max) * 100;
                      const color = window.fbBarColor(m.actual, m.min, m.max, m.rec);
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: m.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 11.5, color: "var(--fb-text-2)", width: 88, fontWeight: 500 }}>{m.name}</span>
                          <div style={{ flex: 1, height: 6, background: "var(--fb-bg-2)", borderRadius: 99, position: "relative" }}>
                            <div style={{ position: "absolute", top: 0, bottom: 0, left: minPct + "%", width: (100 - minPct) + "%", background: "var(--fb-border-strong)", borderRadius: 99 }} />
                            <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: pct + "%", background: color, borderRadius: 99 }} />
                            <div style={{ position: "absolute", top: -2, bottom: -2, left: recPct + "%", width: 1.5, background: "var(--fb-text-2)", opacity: 0.6 }} />
                          </div>
                          <span className="tnum" style={{ fontSize: 11.5, color: "var(--fb-text)", fontWeight: 600, width: 52, textAlign: "right" }}>
                            {m.actual.toLocaleString("it-IT", { maximumFractionDigits: 1 })}{m.unit}
                          </span>
                          <span className="tnum" style={{ fontSize: 10.5, color: "var(--fb-text-3)", width: 60, textAlign: "right" }}>
                            {m.min}–{m.max}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN — energy + water stacked */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* ENERGY */}
                <div style={cardDense}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "var(--fb-orange)" }}>{React.cloneElement(FBI.flame, { size: 14 })}</span>
                      <FBPill color="var(--fb-text-2)">Bilancio</FBPill>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <div className="tnum" style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 600, letterSpacing: -1.5, color: netKcal > 0 ? "var(--fb-orange)" : "var(--fb-green)", lineHeight: 1 }}>
                      {netKcal > 0 ? "+" : ""}{netKcal}
                    </div>
                    <span style={{ fontSize: 11, color: "var(--fb-text-2)", fontWeight: 500 }}>kcal netti</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--fb-divider)" }}>
                    {[["In", T.cal], ["Out", energyOut], ["Passi", E.steps]].map(([l,v], i) => (
                      <div key={i}>
                        <div style={{ fontSize: 9.5, fontWeight: 600, color: "var(--fb-text-3)", letterSpacing: 0.8, textTransform: "uppercase" }}>{l}</div>
                        <div className="tnum" style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 600, color: "var(--fb-text)", marginTop: 2 }}>
                          {v.toLocaleString("it-IT")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* WATER */}
                <div style={cardDense}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "var(--fb-blue)" }}>{React.cloneElement(FBI.drop, { size: 14 })}</span>
                      <FBPill color="var(--fb-text-2)">Acqua</FBPill>
                    </div>
                    <span className="tnum" style={{ fontSize: 10.5, color: "var(--fb-text-3)" }}>{Math.round(waterPct)}%</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <div className="tnum" style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 600, letterSpacing: -1.5, color: "var(--fb-text)", lineHeight: 1 }}>
                      {(W.total/1000).toFixed(2)}
                    </div>
                    <span style={{ fontSize: 11, color: "var(--fb-text-2)" }}>L / {(W.goal/1000).toFixed(1)} L</span>
                  </div>
                  <div style={{ height: 4, background: "var(--fb-bg-2)", borderRadius: 99, marginTop: 10, position: "relative" }}>
                    <div style={{ position: "absolute", inset: 0, width: Math.min(100, waterPct) + "%", background: "var(--fb-blue)", borderRadius: 99 }} />
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                    {[250, 500].map(ml => <button key={ml} style={chipDMuted}>+{ml}ml</button>)}
                    <button style={chipDMuted}>Custom</button>
                  </div>
                </div>
              </div>
            </section>

            {/* DIARY — dense table by meal */}
            <section style={cardDense}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <FBPill color="var(--fb-text-2)">Diario</FBPill>
                  <span style={{ fontSize: 10.5, color: "var(--fb-text-3)" }}>{entries.length} alimenti · 5 pasti</span>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button style={btnDIcon}>{React.cloneElement(FBI.filter, { size: 14 })}</button>
                  <button style={btnDIcon}>{React.cloneElement(FBI.copy, { size: 14 })}</button>
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
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 8px 6px",
                    background: "var(--fb-bg-2)", margin: "0 -8px",
                    borderTop: "1px solid var(--fb-divider)",
                  }}>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 11.5, fontWeight: 600, color: "var(--fb-text)", letterSpacing: 0.2 }}>
                      {m.label}
                    </span>
                    <span className="tnum" style={{ fontSize: 10.5, color: "var(--fb-text-3)" }}>
                      {Math.round(m.cal)} kcal · {m.pro.toFixed(0)}g P
                    </span>
                    <div style={{ flex: 1 }} />
                    <button style={{ ...btnDIcon, padding: 2 }}>{React.cloneElement(FBI.plus, { size: 12 })}</button>
                  </div>
                  {m.items.map((e, i) => (
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
                      <button style={{ ...btnDIcon, padding: 2 }}>{React.cloneElement(FBI.more, { size: 13 })}</button>
                    </div>
                  ))}
                </div>
              ))}
            </section>

            {/* BENTO ROW 3 — supplements + pantry alerts + body */}
            <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              <div style={cardDense}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <FBPill color="var(--fb-text-2)">Integratori</FBPill>
                  <span className="tnum" style={{ fontSize: 10.5, color: "var(--fb-text-3)" }}>2/4</span>
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

              <div style={cardDense}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <FBPill color="var(--fb-amber)" bg="rgba(224,169,58,0.1)">Dispensa · Bassa</FBPill>
                  <button style={{ ...btnDGhost, padding: "3px 8px", fontSize: 10.5 }}>Apri</button>
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

              <div style={cardDense}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <FBPill color="var(--fb-text-2)">Peso</FBPill>
                  <span style={{ fontSize: 10.5, color: "var(--fb-green)", display: "inline-flex", alignItems: "center", gap: 3 }}>
                    {React.cloneElement(FBI.arrowDn, { size: 11 })} {Math.abs(window.FB_BODY.weightDelta)} kg
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span className="tnum" style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 600, color: "var(--fb-text)", letterSpacing: -1 }}>
                    {window.FB_BODY.weight}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--fb-text-2)" }}>kg</span>
                </div>
                <Sparkline points={window.FB_BODY.weightTrend} color="var(--fb-accent)" />
              </div>
            </section>

          </div>
        </div>
      </div>
    </FBScope>
  );
}

// Concentric rings (Apple Activity-style)
function ConcentricRings({ rings, centerTop, centerSub, size = 180 }) {
  const stroke = 11;
  const gap = 4;
  return (
    <div style={{ position: "relative", width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        {rings.map((r, i) => {
          const radius = (size - stroke)/2 - i * (stroke + gap);
          if (radius < 8) return null;
          const c = 2 * Math.PI * radius;
          return (
            <g key={i}>
              <circle cx={size/2} cy={size/2} r={radius} stroke="var(--fb-border-strong)" strokeWidth={stroke} fill="none" opacity={0.5} />
              <circle cx={size/2} cy={size/2} r={radius}
                stroke={r.color} strokeWidth={stroke} fill="none"
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={c * (1 - Math.min(1, r.pct/100))} />
            </g>
          );
        })}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", textAlign: "center" }}>
        <div className="tnum" style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, color: "var(--fb-text)", letterSpacing: -0.8, lineHeight: 1 }}>
          {centerTop}
        </div>
        <div style={{ fontSize: 9.5, fontWeight: 600, color: "var(--fb-text-3)", letterSpacing: 1, textTransform: "uppercase", marginTop: 4 }}>
          {centerSub}
        </div>
      </div>
    </div>
  );
}

function Sparkline({ points, color = "var(--fb-accent)", height = 32 }) {
  const w = 120;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const pts = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = height - ((p - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={height} style={{ marginTop: 8, display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const cardDense = {
  background: "var(--fb-card)",
  border: "1px solid var(--fb-border)",
  borderRadius: 12,
  padding: 16,
};

const btnDIcon = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  width: 28, height: 28, borderRadius: 6,
  background: "transparent", border: 0,
  color: "var(--fb-text-2)", cursor: "pointer",
};

const btnDGhost = {
  display: "inline-flex", alignItems: "center", gap: 5,
  background: "var(--fb-card)", border: "1px solid var(--fb-border-strong)",
  color: "var(--fb-text-2)", padding: "5px 10px",
  borderRadius: 6, fontSize: 11.5, fontWeight: 500, fontFamily: "var(--font-body)",
  cursor: "pointer",
};

const btnDPrimary = {
  display: "inline-flex", alignItems: "center", gap: 5,
  background: "var(--fb-accent)", color: "white",
  border: 0, padding: "6px 12px",
  borderRadius: 6, fontSize: 12, fontWeight: 600, fontFamily: "var(--font-body)",
  cursor: "pointer",
};

const chipDFav = {
  display: "inline-flex", alignItems: "center", gap: 5,
  background: "var(--fb-bg-2)", border: "1px solid var(--fb-border-strong)",
  color: "var(--fb-text)", padding: "4px 10px",
  borderRadius: 6, fontSize: 11.5, fontWeight: 500, cursor: "pointer",
  fontFamily: "var(--font-body)", flexShrink: 0,
};

const chipDMuted = {
  display: "inline-flex", alignItems: "center",
  background: "transparent", border: "1px solid var(--fb-border)",
  color: "var(--fb-text-2)", padding: "4px 10px",
  borderRadius: 6, fontSize: 11.5, fontWeight: 500, cursor: "pointer",
  fontFamily: "var(--font-body)", flexShrink: 0,
};

window.FBVariantDense = FBVariantDense;
