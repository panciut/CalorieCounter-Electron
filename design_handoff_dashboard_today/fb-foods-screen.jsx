// Foods screen — secondary screen example.
// Lista alimenti con cerca, filtri, dettagli per 100g.

function FBFoodsScreen({ density = "normal", scheme = "warm-dark" }) {
  const sample = [
    { name: "Petto di pollo", brand: "Aequilibrium", cat: "Carne", kcal: 165, p: 31, c: 0, f: 3.6, fav: true },
    { name: "Yogurt greco 0%", brand: "Fage", cat: "Latticini", kcal: 59, p: 10, c: 3.7, f: 0.4, fav: true },
    { name: "Avena", brand: "Bauck", cat: "Cereali", kcal: 389, p: 16.9, c: 66.3, f: 6.9, fav: true },
    { name: "Riso basmati", brand: "Riso Gallo", cat: "Cereali", kcal: 356, p: 7.9, c: 78.5, f: 0.9, fav: true },
    { name: "Salmone", brand: "Generico", cat: "Pesce", kcal: 208, p: 20, c: 0, f: 13, fav: true },
    { name: "Uova intere", brand: "Generico", cat: "Latticini", kcal: 155, p: 13, c: 1.1, f: 11, fav: false },
    { name: "Pasta integrale", brand: "Barilla", cat: "Cereali", kcal: 348, p: 13, c: 64, f: 2.5, fav: false },
    { name: "Tonno al naturale", brand: "Rio Mare", cat: "Pesce", kcal: 116, p: 26, c: 0, f: 1, fav: false },
    { name: "Olio EVO", brand: "Carapelli", cat: "Grassi", kcal: 884, p: 0, c: 0, f: 100, fav: false },
    { name: "Mandorle", brand: "Generico", cat: "Frutta secca", kcal: 579, p: 21, c: 22, f: 50, fav: false },
    { name: "Banana", brand: "Generico", cat: "Frutta", kcal: 89, p: 1.1, c: 23, f: 0.3, fav: false },
    { name: "Broccoli", brand: "Generico", cat: "Verdura", kcal: 34, p: 2.8, c: 7, f: 0.4, fav: false },
  ];

  const cats = ["Tutto", "Preferiti", "Carne", "Pesce", "Latticini", "Cereali", "Verdura", "Frutta", "Frutta secca", "Grassi"];

  return (
    <FBScope scheme={scheme} density={density} style={{ fontFamily: "var(--font-body)" }}>
      <FBSidebar active="foods" />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--fb-bg)" }}>
        <header style={{
          flexShrink: 0, padding: "20px 32px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid var(--fb-border)",
        }}>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--fb-text-3)" }}>
              Database
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, letterSpacing: -0.4, color: "var(--fb-text)" }}>
              Alimenti
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ background: "transparent", border: "1px solid var(--fb-border-strong)", color: "var(--fb-text-2)", padding: "8px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 500, cursor: "pointer" }}>
              Importa CSV
            </button>
            <button style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--fb-accent)", color: "white", border: 0, padding: "9px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
              {FBI.plus} Crea alimento
            </button>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px 60px" }} className="nice-scroll">
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            {/* Search */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              background: "var(--fb-card)", border: "1px solid var(--fb-border-strong)",
              borderRadius: 10, padding: "10px 14px", marginBottom: 16,
            }}>
              <span style={{ color: "var(--fb-text-3)" }}>{FBI.search}</span>
              <input placeholder="Cerca tra 1.247 alimenti…"
                style={{ flex: 1, border: 0, background: "transparent", outline: "none", color: "var(--fb-text)", fontSize: 13, fontFamily: "var(--font-body)" }} />
              <kbd style={{ fontSize: 10, color: "var(--fb-text-3)", border: "1px solid var(--fb-border)", padding: "2px 6px", borderRadius: 4, fontFamily: "var(--font-mono)" }}>⌘K</kbd>
            </div>

            {/* Category filter */}
            <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
              {cats.map((c, i) => (
                <button key={c} style={{
                  background: i === 0 ? "var(--fb-accent-soft)" : "transparent",
                  color: i === 0 ? "var(--fb-accent)" : "var(--fb-text-2)",
                  border: i === 0 ? "1px solid var(--fb-accent)" : "1px solid var(--fb-border)",
                  padding: "5px 12px", borderRadius: 99,
                  fontSize: 11.5, fontWeight: 500, cursor: "pointer",
                  fontFamily: "var(--font-body)",
                }}>{c}</button>
              ))}
            </div>

            {/* Table */}
            <div style={{ background: "var(--fb-card)", border: "1px solid var(--fb-border)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "20px 1.5fr 1fr 90px 70px 60px 60px 60px",
                gap: 12, padding: "10px 16px",
                fontSize: 9.5, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: "var(--fb-text-3)",
                borderBottom: "1px solid var(--fb-divider)",
                background: "var(--fb-bg-2)",
              }}>
                <span></span>
                <span>Nome</span>
                <span>Categoria</span>
                <span style={{ textAlign: "right" }}>kcal/100g</span>
                <span style={{ textAlign: "right" }}>P</span>
                <span style={{ textAlign: "right" }}>C</span>
                <span style={{ textAlign: "right" }}>F</span>
                <span></span>
              </div>
              {sample.map((s, i) => (
                <div key={i} style={{
                  display: "grid",
                  gridTemplateColumns: "20px 1.5fr 1fr 90px 70px 60px 60px 60px",
                  gap: 12, padding: "11px 16px", alignItems: "center",
                  fontSize: 12.5,
                  borderTop: i > 0 ? "1px solid var(--fb-divider)" : 0,
                }}>
                  <span style={{ color: s.fav ? "var(--fb-accent)" : "var(--fb-text-3)" }}>
                    {React.cloneElement(s.fav ? FBI.starF : FBI.star, { size: 14 })}
                  </span>
                  <div>
                    <div style={{ color: "var(--fb-text)", fontWeight: 500 }}>{s.name}</div>
                    <div style={{ fontSize: 10.5, color: "var(--fb-text-3)" }}>{s.brand}</div>
                  </div>
                  <span style={{ color: "var(--fb-text-2)", fontSize: 11 }}>{s.cat}</span>
                  <span className="tnum" style={{ textAlign: "right", color: "var(--fb-text)", fontWeight: 600 }}>{s.kcal}</span>
                  <span className="tnum" style={{ textAlign: "right", color: "var(--fb-text-2)" }}>{s.p}g</span>
                  <span className="tnum" style={{ textAlign: "right", color: "var(--fb-text-2)" }}>{s.c}g</span>
                  <span className="tnum" style={{ textAlign: "right", color: "var(--fb-text-2)" }}>{s.f}g</span>
                  <button style={{ background: "transparent", border: "1px solid var(--fb-border-strong)", color: "var(--fb-text-2)", padding: "3px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer", fontFamily: "var(--font-body)" }}>
                    Aggiungi
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </FBScope>
  );
}

window.FBFoodsScreen = FBFoodsScreen;
