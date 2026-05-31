/* Dropped — canvas app: lays every phone screen out as a draggable artboard */

const PHONE_W = 372;
const PHONE_H = 806;

// Renders one phone screen from stored HTML and re-runs the chrome
// decoration (maps / status bar / route maps / wordmark) on its own subtree,
// so it works whether it's mounted on the canvas or cloned into focus mode.
function Phone({ html }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (ref.current && window.__decorateDropped) window.__decorateDropped(ref.current);
  }, [html]);
  return (
    <div
      ref={ref}
      className="phone"
      style={{ margin: 0 }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// Strip a leading numeric code off the stored label for a cleaner card title,
// keeping the code as a separate prefix the canvas header shows.
function prettyLabel(raw) {
  return raw.replace(/\s+—\s+fun$/i, '').replace(/\s+·\s+fun$/i, '');
}

function App() {
  const sections = window.DROPPED_SECTIONS || [];
  return (
    <DesignCanvas>
      {sections.map((sec) => (
        <DCSection key={sec.id} id={sec.id} title={sec.title} subtitle={sec.subtitle}>
          {sec.screens.map((scr) => (
            <DCArtboard
              key={scr.id}
              id={scr.id}
              label={prettyLabel(scr.label)}
              width={PHONE_W}
              height={PHONE_H}
              style={{ background: 'transparent', boxShadow: 'none', borderRadius: 0, overflow: 'visible' }}
            >
              <Phone html={scr.html} />
            </DCArtboard>
          ))}
        </DCSection>
      ))}
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
