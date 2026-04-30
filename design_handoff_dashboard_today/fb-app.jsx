// Main app: design canvas with all dashboard variants + foods screen + tweaks.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "swissDensity": "normal",
  "denseDensity": "normal",
  "editorialDensity": "normal",
  "hybridDensity": "normal",
  "denseScheme": "warm-dark",
  "hybridScheme": "warm-dark",
  "showFoods": true,
  "showSecondary": true
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  return (
    <>
      <DesignCanvas>
        <DCSection id="dashboards" title="Dashboard — 3 direzioni"
          subtitle="Tre interpretazioni della home 'Oggi'. Quick log in alto, macro chiare, diario leggibile.">

          <DCArtboard id="swiss" label="A · Calmo & svizzero" width={1320} height={900}>
            <FBVariantSwiss density={t.swissDensity} />
          </DCArtboard>

          <DCArtboard id="dense" label="B · Data-dense bento" width={1320} height={900}>
            <FBVariantDense density={t.denseDensity} />
          </DCArtboard>

          <DCArtboard id="editorial" label="C · Editoriale serif" width={1320} height={900}>
            <FBVariantEditorial density={t.editorialDensity} />
          </DCArtboard>

          <DCArtboard id="hybrid" label="D · Mix B + C — bento serif" width={1320} height={900}>
            <FBVariantHybrid density={t.hybridDensity} scheme={t.hybridScheme} />
          </DCArtboard>
        </DCSection>

        {t.showFoods && (
          <DCSection id="secondary" title="Schermo secondario"
            subtitle="Database alimenti — coerente con la sidebar e i pattern dashboard.">
            <DCArtboard id="foods-dark" label="Alimenti · warm-dark" width={1320} height={900}>
              <FBFoodsScreen scheme="warm-dark" />
            </DCArtboard>
            <DCArtboard id="foods-paper" label="Alimenti · warm-paper" width={1320} height={900}>
              <FBFoodsScreen scheme="warm-paper" />
            </DCArtboard>
          </DCSection>
        )}

        <DCPostIt x={40} y={40} width={280}>
          <b>Cosa cambia rispetto all'attuale</b><br/>
          • Quick log in alto, primario · niente più sepolto in fondo.<br/>
          • Sidebar raggruppata (Diario / Pianificazione / Salute / Sistema) con logo "fb".<br/>
          • Range macro disegnato come banda + marker, non solo numeri.<br/>
          • Densità tipografica 3× con feel diverso per ogni direzione.<br/>
          • Tutti senza emoji, icone Lucide-style 1.6px stroke.
        </DCPostIt>
      </DesignCanvas>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Densità per variante" />
        <TweakRadio label="A · Svizzera" value={t.swissDensity}
          options={["compact", "normal", "spacious"]}
          onChange={(v) => setTweak("swissDensity", v)} />
        <TweakRadio label="B · Dense" value={t.denseDensity}
          options={["compact", "normal", "spacious"]}
          onChange={(v) => setTweak("denseDensity", v)} />
        <TweakRadio label="C · Editoriale" value={t.editorialDensity}
          options={["compact", "normal", "spacious"]}
          onChange={(v) => setTweak("editorialDensity", v)} />
        <TweakRadio label="D · Mix B+C" value={t.hybridDensity}
          options={["compact", "normal", "spacious"]}
          onChange={(v) => setTweak("hybridDensity", v)} />

        <TweakSection label="Schemi" />
        <TweakSelect label="B · Schema colori" value={t.denseScheme}
          options={["warm-dark", "warm-paper", "pure-dark"]}
          onChange={(v) => setTweak("denseScheme", v)} />
        <TweakSelect label="D · Schema colori" value={t.hybridScheme}
          options={["warm-dark", "warm-paper", "pure-dark"]}
          onChange={(v) => setTweak("hybridScheme", v)} />

        <TweakSection label="Vista" />
        <TweakToggle label="Mostra schermo Alimenti" value={t.showFoods}
          onChange={(v) => setTweak("showFoods", v)} />
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
