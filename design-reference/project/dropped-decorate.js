/* DROPPED — populates phone chrome (maps, status bars, route maps, wordmark)
   inside any root. Idempotent + scoped so it works for both the canvas
   artboards and the fullscreen focus clones. */
(function () {
  const MAP_SVG = `
  <svg viewBox="0 0 400 860" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <g class="map-blocks">
      <rect class="map-block" x="34" y="92" width="120" height="96" rx="3"/>
      <rect class="map-block" x="172" y="120" width="96" height="120" rx="3"/>
      <rect class="map-block" x="60" y="320" width="110" height="130" rx="3"/>
      <rect class="map-block" x="232" y="300" width="120" height="92" rx="3"/>
      <rect class="map-block" x="48" y="520" width="130" height="120" rx="3"/>
      <rect class="map-block" x="220" y="560" width="120" height="150" rx="3"/>
      <rect class="map-block" x="120" y="700" width="150" height="120" rx="3"/>
    </g>
    <g class="map-streets">
      <path class="map-street" d="M-20 188 H420"/>
      <path class="map-street" d="M-20 300 H420"/>
      <path class="map-street thin" d="M-20 452 H420"/>
      <path class="map-street" d="M-20 520 H420"/>
      <path class="map-street thin" d="M-20 700 H420"/>
      <path class="map-street" d="M160 -20 V880"/>
      <path class="map-street" d="M210 -20 V880"/>
      <path class="map-street thin" d="M40 -20 V880"/>
      <path class="map-street thin" d="M356 -20 V880"/>
      <path class="map-street thin" d="M-30 60 L460 540"/>
    </g>
    <path class="map-river" d="M-20 760 C 80 700, 120 640, 230 600 S 420 520 460 470" stroke-width="14"/>
    <path class="map-river" d="M-20 760 C 80 700, 120 640, 230 600 S 420 520 460 470" stroke-width="1" style="stroke:rgba(118,149,124,.5)"/>
  </svg>`;

  const STATUS = `
    <span class="time">9:41</span>
    <span class="sigs">
      <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5" width="3" height="7" rx="1"/><rect x="10" y="2.5" width="3" height="9.5" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
      <svg width="17" height="12" viewBox="0 0 17 12" fill="none"><path d="M1 4.2C3.2 2.1 5.7 1 8.5 1S13.8 2.1 16 4.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M4 7C5.3 5.9 6.8 5.3 8.5 5.3S11.7 5.9 13 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="8.5" cy="10" r="1.4" fill="currentColor"/></svg>
      <svg width="26" height="13" viewBox="0 0 26 13" fill="none"><rect x="1" y="1" width="21" height="11" rx="3" stroke="currentColor" stroke-width="1.3" opacity=".5"/><rect x="2.6" y="2.6" width="16" height="7.8" rx="1.6" fill="currentColor"/><rect x="23.4" y="4.2" width="1.8" height="4.6" rx="1" fill="currentColor" opacity=".5"/></svg>
    </span>`;

  const ROUTEMAP = `
  <svg viewBox="0 0 346 780" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <g class="rm-blocks">
      <rect class="rm-block" x="10" y="14" width="76" height="120" rx="4"/>
      <rect class="rm-block" x="106" y="14" width="134" height="120" rx="4"/>
      <rect class="rm-block" x="260" y="14" width="76" height="120" rx="4"/>
      <rect class="rm-block" x="10" y="166" width="76" height="228" rx="4"/>
      <rect class="rm-block" x="260" y="166" width="76" height="228" rx="4"/>
      <rect class="rm-block" x="106" y="426" width="134" height="170" rx="4"/>
      <rect class="rm-block" x="260" y="426" width="76" height="170" rx="4"/>
      <rect class="rm-block" x="106" y="628" width="134" height="138" rx="4"/>
      <rect class="rm-block" x="260" y="628" width="76" height="138" rx="4"/>
    </g>
    <path class="rm-park" d="M-30 420 C 30 404 96 412 110 470 C 124 528 96 612 30 632 C -30 650 -60 520 -30 420 Z"/>
    <g class="rm-roads">
      <path class="rm-road" d="M-20 150 H366"/>
      <path class="rm-road" d="M-20 410 H366"/>
      <path class="rm-road" d="M-20 610 H366"/>
      <path class="rm-road" d="M96 -20 V800"/>
      <path class="rm-road" d="M250 -20 V800"/>
      <path class="rm-road sm" d="M-30 560 L366 200"/>
    </g>
    <g class="rm-lines">
      <path class="rm-road-line" d="M-20 410 H366"/>
      <path class="rm-road-line" d="M96 -20 V800"/>
      <path class="rm-road-line" d="M-30 560 L366 200"/>
    </g>
    <path class="rm-river" d="M366 486 C 318 520 304 588 332 660 C 346 694 352 720 346 760" stroke-width="11"/>
    <text class="rm-lbl" x="84" y="528" transform="rotate(-90 84 528)">BEDFORD AVE</text>
    <text class="rm-lbl" x="120" y="402">N 7TH ST</text>
    <text class="rm-lbl ink" x="262" y="150" transform="rotate(-35 262 150)">DRIGGS AVE</text>
    <text class="rm-lbl park" x="6" y="524">MCCARREN PARK</text>
  </svg>`;

  const ROUTELINE = `
  <svg viewBox="0 0 346 780" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <path class="rl-base" d="M252 664 Q 236 604 222 548 T 196 430 Q 184 360 173 292"/>
    <path class="rl-flow" d="M252 664 Q 236 604 222 548 T 196 430 Q 184 360 173 292"/>
  </svg>`;

  function fill(root, sel, html) {
    root.querySelectorAll(sel).forEach(el => {
      if (el.dataset.decorated) return;
      el.dataset.decorated = '1';
      el.innerHTML = html;
    });
  }

  function splitWords(root) {
    root.querySelectorAll('[data-word]').forEach(el => {
      if (el.dataset.decorated) return;
      el.dataset.decorated = '1';
      const word = el.getAttribute('data-word');
      el.innerHTML = '';
      [...word].forEach((c, i) => {
        const s = document.createElement('span');
        s.className = 'ch';
        s.textContent = c;
        s.style.animationDelay = (0.12 + i * 0.07) + 's';
        el.appendChild(s);
      });
    });
  }

  window.__decorateDropped = function (root) {
    root = root || document;
    fill(root, '[data-map]', MAP_SVG);
    fill(root, '[data-status]', STATUS);
    fill(root, '[data-routemap]', ROUTEMAP);
    fill(root, '[data-routeline]', ROUTELINE);
    splitWords(root);
  };
})();
