/* DROPPED — tweak controls (React island; syncs to CSS vars on :root) */
const DROPPED_TWEAKS = /*EDITMODE-BEGIN*/{
  "accent": ["#76957C", "#566E5B"],
  "motion": true,
  "grain": true,
  "heroSize": 62
}/*EDITMODE-END*/;

const ACCENT_OPTIONS = [
  ["#76957C", "#566E5B"], // sage
  ["#9DA9B8", "#6E7C8E"], // slate mist
  ["#C2A36B", "#977B45"], // soft brass
  ["#B98A82", "#946259"]  // dusty clay
];

function DroppedTweaks() {
  const [t, setTweak] = useTweaks(DROPPED_TWEAKS);

  React.useEffect(() => {
    const root = document.documentElement;
    const [a, deep] = Array.isArray(t.accent) ? t.accent : [t.accent, t.accent];
    root.style.setProperty('--accent', a);
    root.style.setProperty('--accent-deep', deep);
    root.style.setProperty('--wax', a);
    document.body.classList.toggle('no-motion', !t.motion);
    document.body.classList.toggle('no-grain', !t.grain);
    const wm = document.querySelector('.s1 .wordmark');
    if (wm) wm.style.fontSize = t.heroSize + 'px';
    if (window.__droppedFit) window.__droppedFit();
  }, [t.accent, t.motion, t.grain, t.heroSize]);

  return (
    <TweaksPanel>
      <TweakSection label="Palette" />
      <TweakColor label="Accent" value={t.accent} options={ACCENT_OPTIONS}
                  onChange={(v) => setTweak('accent', v)} />
      <TweakSection label="Atmosphere" />
      <TweakToggle label="Ambient motion" value={t.motion}
                   onChange={(v) => setTweak('motion', v)} />
      <TweakToggle label="Paper grain" value={t.grain}
                   onChange={(v) => setTweak('grain', v)} />
      <TweakSection label="Type" />
      <TweakSlider label="Wordmark size" value={t.heroSize} min={44} max={76} unit="px"
                   onChange={(v) => setTweak('heroSize', v)} />
    </TweaksPanel>
  );
}

ReactDOM.createRoot(document.getElementById('tweaks-root')).render(<DroppedTweaks />);
