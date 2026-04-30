// Shared chrome (sidebar, header) used across all 3 variants.
// Each variant accepts a "scheme" prop driving palette tokens.

const FB_SCHEMES = {
  "warm-dark": {
    "--fb-bg": "#16130f",
    "--fb-bg-2": "#1d1a14",
    "--fb-card": "#221e17",
    "--fb-card-2": "#2a251c",
    "--fb-border": "rgba(255,240,220,0.07)",
    "--fb-border-strong": "rgba(255,240,220,0.13)",
    "--fb-text": "#ece8df",
    "--fb-text-2": "#a59c8c",
    "--fb-text-3": "#6e6757",
    "--fb-accent": "#d97706",
    "--fb-accent-2": "#f59e3b",
    "--fb-accent-soft": "rgba(217,119,6,0.12)",
    "--fb-green": "#7cba6c",
    "--fb-amber": "#e0a93a",
    "--fb-orange": "#d97706",
    "--fb-red": "#d65a4d",
    "--fb-blue": "#7aa6c8",
    "--fb-divider": "rgba(255,240,220,0.05)",
    isLight: false,
  },
  "warm-paper": {
    "--fb-bg": "#f4ece0",
    "--fb-bg-2": "#ebe1d2",
    "--fb-card": "#fbf6ec",
    "--fb-card-2": "#f0e7d8",
    "--fb-border": "rgba(58,42,20,0.10)",
    "--fb-border-strong": "rgba(58,42,20,0.18)",
    "--fb-text": "#2a241b",
    "--fb-text-2": "#736853",
    "--fb-text-3": "#a39880",
    "--fb-accent": "#a64a04",
    "--fb-accent-2": "#c45c00",
    "--fb-accent-soft": "rgba(166,74,4,0.10)",
    "--fb-green": "#4f7a3a",
    "--fb-amber": "#a3700f",
    "--fb-orange": "#a64a04",
    "--fb-red": "#a3402d",
    "--fb-blue": "#3f6f95",
    "--fb-divider": "rgba(58,42,20,0.07)",
    isLight: true,
  },
  "pure-dark": {
    "--fb-bg": "#0a0a0c",
    "--fb-bg-2": "#101013",
    "--fb-card": "#15151a",
    "--fb-card-2": "#1c1c22",
    "--fb-border": "rgba(255,255,255,0.06)",
    "--fb-border-strong": "rgba(255,255,255,0.12)",
    "--fb-text": "#ededee",
    "--fb-text-2": "#9b9ba1",
    "--fb-text-3": "#5e5e66",
    "--fb-accent": "#e07020",
    "--fb-accent-2": "#f08840",
    "--fb-accent-soft": "rgba(224,112,32,0.12)",
    "--fb-green": "#7cba6c",
    "--fb-amber": "#e0a93a",
    "--fb-orange": "#e07020",
    "--fb-red": "#d65a4d",
    "--fb-blue": "#7aa6c8",
    "--fb-divider": "rgba(255,255,255,0.05)",
    isLight: false,
  },
};

function FBSidebar({ active = "today", compact = false, accent = "amber" }) {
  const items = [
    { id: "today", label: "Oggi", icon: FBI.today, group: "track" },
    { id: "foods", label: "Alimenti", icon: FBI.foods, group: "track" },
    { id: "pantry", label: "Dispensa", icon: FBI.pantry, group: "track" },
    { id: "recipes", label: "Ricette", icon: FBI.recipes, group: "track" },
    { id: "week", label: "Settimana", icon: FBI.week, group: "plan" },
    { id: "history", label: "Storico", icon: FBI.history, group: "plan" },
    { id: "supplements", label: "Integratori", icon: FBI.supplements, group: "health" },
    { id: "exercise", label: "Esercizio", icon: FBI.exercise, group: "health" },
    { id: "measurements", label: "Misurazioni", icon: FBI.measurements, group: "health" },
    { id: "body", label: "Corpo", icon: FBI.body, group: "health" },
    { id: "goals", label: "Obiettivi", icon: FBI.goals, group: "health" },
    { id: "data", label: "Dati", icon: FBI.data, group: "system" },
    { id: "settings", label: "Impostazioni", icon: FBI.settings, group: "system" },
  ];

  const groups = [
    { id: "track", label: "Diario" },
    { id: "plan", label: "Pianificazione" },
    { id: "health", label: "Salute" },
    { id: "system", label: "Sistema" },
  ];

  return (
    <aside style={{
      width: compact ? 60 : 220,
      flexShrink: 0,
      background: "var(--fb-bg-2)",
      borderRight: "1px solid var(--fb-border)",
      display: "flex",
      flexDirection: "column",
      padding: compact ? "16px 8px" : "18px 12px 24px",
      gap: 18,
      overflow: "hidden",
    }}>
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: compact ? "0 4px" : "0 8px", marginBottom: 6 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: "linear-gradient(135deg, var(--fb-accent) 0%, var(--fb-accent-2) 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "white", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, letterSpacing: -0.3,
          boxShadow: "0 2px 8px rgba(217,119,6,0.25)",
        }}>fb</div>
        {!compact && (
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14, color: "var(--fb-text)", letterSpacing: -0.2 }}>
            FoodBuddy
          </div>
        )}
      </div>

      {/* Groups */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }} className="hide-scrollbar">
        {groups.map(g => {
          const groupItems = items.filter(i => i.group === g.id);
          return (
            <div key={g.id} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {!compact && (
                <div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: 1.4, textTransform: "uppercase",
                  color: "var(--fb-text-3)", padding: "4px 10px 6px" }}>
                  {g.label}
                </div>
              )}
              {groupItems.map(it => {
                const isActive = it.id === active;
                return (
                  <button key={it.id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    background: isActive ? "var(--fb-accent-soft)" : "transparent",
                    color: isActive ? "var(--fb-accent)" : "var(--fb-text-2)",
                    border: 0, borderRadius: 7,
                    padding: compact ? "8px" : "7px 10px",
                    fontSize: 13, fontWeight: isActive ? 550 : 450,
                    fontFamily: "var(--font-body)",
                    cursor: "pointer",
                    textAlign: "left", width: "100%",
                    transition: "all .15s ease",
                    justifyContent: compact ? "center" : "flex-start",
                  }}>
                    <span style={{ display: "flex" }}>{React.cloneElement(it.icon, { size: 16 })}</span>
                    {!compact && <span>{it.label}</span>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Bottom */}
      {!compact && (
        <div style={{ padding: "12px 10px 0", borderTop: "1px solid var(--fb-divider)", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%", background: "var(--fb-card-2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--fb-text-2)", fontSize: 11, fontWeight: 600,
          }}>M</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 550, color: "var(--fb-text)" }}>Marco</div>
            <div style={{ fontSize: 10, color: "var(--fb-text-3)" }}>Cutting · 2250 kcal</div>
          </div>
        </div>
      )}
    </aside>
  );
}

// Date header — used by all variants, slight variation per variant via props.
function FBHeader({ children, style }) {
  return (
    <header style={{
      flexShrink: 0,
      borderBottom: "1px solid var(--fb-border)",
      background: "var(--fb-bg)",
      ...style,
    }}>
      {children}
    </header>
  );
}

// Common little components
function FBPill({ children, color = "var(--fb-text-2)", bg = "transparent", style }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 10.5, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase",
      color, background: bg, padding: "3px 8px", borderRadius: 99,
      ...style,
    }}>{children}</span>
  );
}

function FBRing({ size = 120, stroke = 10, pct = 0, color = "var(--fb-accent)", track = "var(--fb-border-strong)", children, segments }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: size, height: size, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        {segments ? segments.map((s, i) => (
          <circle key={i} cx={size/2} cy={size/2} r={r}
            stroke={s.color} strokeWidth={stroke} fill="none"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - Math.min(1, s.pct/100))}
            style={{ opacity: 0.95 }} />
        )) : (
          <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={stroke} fill="none"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - Math.min(1, pct/100))}
            style={{ transition: "stroke-dashoffset .8s cubic-bezier(.2,.8,.2,1)" }} />
        )}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        {children}
      </div>
    </div>
  );
}

// Macro bar with target band and current marker (much cleaner than current).
function FBMacroBar({ label, value, unit, min, max, rec, total }) {
  const fillPct = total ? Math.min(100, (value / total) * 100) : 0;
  const minPct = total ? (min / total) * 100 : 0;
  const maxPct = total ? (max / total) * 100 : 0;
  const recPct = total ? (rec / total) * 100 : 0;
  const color = window.fbBarColor(value, min, max, rec);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "4px 0" }}>
      <div style={{ width: 64, fontSize: 10, fontWeight: 600, color: "var(--fb-text-2)", letterSpacing: 0.4, textTransform: "uppercase", flexShrink: 0 }}>
        {label}
      </div>
      <div style={{ flex: 1, position: "relative", height: 8 }}>
        {/* Track */}
        <div style={{
          position: "absolute", inset: 0,
          background: "var(--fb-border)", borderRadius: 99,
        }} />
        {/* Target band — softly shaded */}
        <div style={{
          position: "absolute", top: 0, bottom: 0,
          left: minPct + "%", width: (maxPct - minPct) + "%",
          background: "var(--fb-border-strong)",
          borderRadius: 99,
        }} />
        {/* Filled value */}
        <div style={{
          position: "absolute", top: 0, bottom: 0, left: 0,
          width: fillPct + "%",
          background: color,
          borderRadius: 99,
          transition: "width .8s cubic-bezier(.2,.8,.2,1)",
        }} />
        {/* Recommended marker */}
        {rec > 0 && recPct < 100 && (
          <div style={{
            position: "absolute", top: -3, bottom: -3,
            left: recPct + "%", width: 1.5,
            background: "var(--fb-text-2)", opacity: 0.5,
          }} />
        )}
      </div>
      <div className="tnum" style={{ width: 130, textAlign: "right", fontSize: 11.5, color: "var(--fb-text-2)" }}>
        <span style={{ color: "var(--fb-text)", fontWeight: 600 }}>{value.toLocaleString("it-IT", { maximumFractionDigits: 1 })}</span>
        <span style={{ marginLeft: 2 }}>{unit}</span>
        <span style={{ marginLeft: 6, color: "var(--fb-text-3)", fontSize: 10.5 }}>· {min}–{max}</span>
      </div>
    </div>
  );
}

// Apply scheme variables to a wrapper div.
function FBScope({ scheme = "warm-dark", density = "normal", style, children }) {
  const vars = FB_SCHEMES[scheme] || FB_SCHEMES["warm-dark"];
  const densityScale = density === "compact" ? 0.86 : density === "spacious" ? 1.12 : 1;
  return (
    <div style={{
      ...vars,
      "--fb-density": densityScale,
      background: "var(--fb-bg)",
      color: "var(--fb-text)",
      width: "100%", height: "100%",
      overflow: "hidden",
      display: "flex",
      ...style,
    }}>
      {children}
    </div>
  );
}

window.FB_SCHEMES = FB_SCHEMES;
window.FBSidebar = FBSidebar;
window.FBHeader = FBHeader;
window.FBPill = FBPill;
window.FBRing = FBRing;
window.FBMacroBar = FBMacroBar;
window.FBScope = FBScope;
