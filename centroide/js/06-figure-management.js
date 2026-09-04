// ═══════════════════════════════════════════════════════════
//  FIGURE MANAGEMENT
// ═══════════════════════════════════════════════════════════

const REF_FIGS = {
  // ── Perfiles laminados (del catálogo). Las láminas son las de momentos-de-
  //    inercia, referidas desde la raíz, que es donde vive centroide.html.
  wshape: {
    title: 'Perfil W / S (doble T)',
    svg: `<img src="momentos-de-inercia/datos/img/perfil-w.png" alt="Perfil W / S (doble T)" style="width:100%;max-width:230px;height:auto;display:block;margin:0 auto;">`,
    formulas: `A = valor <b>tabulado</b> (Beer &amp; Johnston, Ap. C)<br><span style="color:#b45309">Centroide en el centro de la sección (doble simetría).</span>`
  },
  channel: {
    title: 'Canal C',
    svg: `<img src="momentos-de-inercia/datos/img/canal-c.png" alt="Canal C" style="width:100%;max-width:230px;height:auto;display:block;margin:0 auto;">`,
    formulas: `A y x̄ <b>tabulados</b> (Beer &amp; Johnston, Ap. C)<br><span style="color:#b45309">x̄ se mide desde el respaldo del alma; ȳ en el eje de simetría.</span>`
  },
  angleL: {
    title: 'Ángulo L',
    svg: `<img src="momentos-de-inercia/datos/img/angulo-l.png" alt="Ángulo L" style="width:100%;max-width:230px;height:auto;display:block;margin:0 auto;">`,
    formulas: `A, x̄ e ȳ <b>tabulados</b> (Beer &amp; Johnston, Ap. C)<br><span style="color:#b45309">x̄ e ȳ se miden desde el vértice del ángulo.</span>`
  },
  rect: {
    title: 'Rectángulo',
    svg: `<svg viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="15" y="10" width="100" height="65" stroke="#0d3a8f" stroke-width="1.5" fill="rgba(228,172,23,.1)"/>
      <line x1="15" y1="42" x2="115" y2="42" stroke="#0d3a8f" stroke-width="0.8" stroke-dasharray="4,3" opacity=".5"/>
      <line x1="65" y1="10" x2="65" y2="75" stroke="#0d3a8f" stroke-width="0.8" stroke-dasharray="4,3" opacity=".5"/>
      <circle cx="65" cy="42" r="3.5" fill="#f0c040"/>
      <text x="65" y="47" text-anchor="middle" font-size="8" fill="#f0c040" font-style="italic">G</text>
      <text x="65" y="88" text-anchor="middle" font-size="9" fill="#0a2e7a" font-style="italic">b</text>
      <text x="126" y="45" font-size="9" fill="#0a2e7a" font-style="italic">h</text>
      <line x1="15" y1="83" x2="115" y2="83" stroke="#123f8f" stroke-width="1"/>
      <text x="8" y="88" font-size="7" fill="#0e357f">y</text>
      <text x="120" y="45" font-size="7" fill="#0e357f">x</text>
    </svg>`,
    formulas: 'Iₓ = bh³/12 &nbsp;&nbsp; Iᵧ = b³h/12 &nbsp;&nbsp; Pₓᵧ = 0'
  },
  triangle: {
    title: 'Triángulo',
    svg: `<svg viewBox="0 0 160 100" fill="none">
      <polygon points="80,8 138,88 22,88" stroke="#0d3a8f" stroke-width="1.5" fill="rgba(228,172,23,.1)"/>
      <circle cx="80" cy="62" r="3.5" fill="#f0c040"/>
      <text x="80" y="58" text-anchor="middle" font-size="8" fill="#f0c040" font-style="italic">G</text>
      <text x="78" y="98" text-anchor="middle" font-size="9" fill="#0a2e7a" font-style="italic">b</text>
      <line x1="80" y1="8" x2="80" y2="88" stroke="#0d3a8f" stroke-width="0.8" stroke-dasharray="4,3" opacity=".5"/>
      <text x="130" y="65" font-size="8" fill="#0a2e7a">h/3</text>
      <line x1="22" y1="62" x2="138" y2="62" stroke="#0d3a8f" stroke-width="0.7" stroke-dasharray="3,2" opacity=".4"/>
    </svg>`,
    formulas: 'Iₓ = bh³/36 &nbsp;&nbsp; Iᵧ = b³h/48 &nbsp;&nbsp; Pₓᵧ = 0'
  },
  rtriangle: {
    title: 'Triángulo Rectángulo',
    svg: `<svg viewBox="0 0 160 100" fill="none">
      <polygon points="15,88 135,88 15,10" stroke="#0d3a8f" stroke-width="1.5" fill="rgba(228,172,23,.1)"/>
      <rect x="15" y="72" width="14" height="14" stroke="#0d3a8f" stroke-width="1" fill="none"/>
      <circle cx="57" cy="62" r="3.5" fill="#f0c040"/>
      <text x="57" y="58" text-anchor="middle" font-size="8" fill="#f0c040">G(b/3,h/3)</text>
      <text x="75" y="98" text-anchor="middle" font-size="9" fill="#0a2e7a" font-style="italic">b</text>
      <text x="7" y="52" font-size="9" fill="#0a2e7a" font-style="italic">h</text>
    </svg>`,
    formulas: 'Iₓ = bh³/36 &nbsp;&nbsp; Iᵧ = b³h/36 &nbsp;&nbsp; Pₓᵧ = −b²h²/72'
  },
  circle: {
    title: 'Círculo',
    svg: `<svg viewBox="0 0 160 100" fill="none">
      <circle cx="75" cy="50" r="42" stroke="#0d3a8f" stroke-width="1.5" fill="rgba(228,172,23,.1)"/>
      <circle cx="75" cy="50" r="3.5" fill="#f0c040"/>
      <line x1="75" y1="50" x2="117" y2="50" stroke="#0a2e7a" stroke-width="1.5"/>
      <text x="96" y="46" text-anchor="middle" font-size="10" fill="#0a2e7a" font-style="italic">R</text>
      <text x="75" y="55" text-anchor="middle" font-size="8" fill="#f0c040" font-style="italic">G</text>
    </svg>`,
    formulas: 'Iₓ = Iᵧ = πR⁴/4 &nbsp;&nbsp; Pₓᵧ = 0'
  },
  semicircle: {
    title: 'Semicírculo',
    svg: `<svg viewBox="0 0 160 100" fill="none">
      <path d="M15,65 A60,60 0 0,1 135,65" stroke="#0d3a8f" stroke-width="1.5" fill="rgba(228,172,23,.1)"/>
      <line x1="15" y1="65" x2="135" y2="65" stroke="#0d3a8f" stroke-width="1.5"/>
      <line x1="75" y1="65" x2="75" y2="5" stroke="#0d3a8f" stroke-width="0.8" stroke-dasharray="4,3" opacity=".5"/>
      <circle cx="75" cy="40" r="3.5" fill="#f0c040"/>
      <text x="75" y="35" text-anchor="middle" font-size="7" fill="#0a2e7a">ȳ=4R/3π</text>
      <text x="75" y="57" text-anchor="middle" font-size="8" fill="#f0c040" font-style="italic">G</text>
      <line x1="75" y1="65" x2="110" y2="30" stroke="#0a2e7a" stroke-width="1.2"/>
      <text x="100" y="28" font-size="9" fill="#0a2e7a" font-style="italic">R</text>
    </svg>`,
    formulas: 'Iₓ = 0.1098R⁴ &nbsp;&nbsp; Iᵧ = πR⁴/8 &nbsp;&nbsp; Pₓᵧ = 0'
  },
  quarter: {
    title: '¼ de Círculo',
    svg: `<svg viewBox="0 0 160 100" fill="none">
      <path d="M15,88 L15,12 A76,76 0 0,1 91,88 Z" stroke="#0d3a8f" stroke-width="1.5" fill="rgba(228,172,23,.1)"/>
      <rect x="15" y="72" width="14" height="14" stroke="#0d3a8f" stroke-width="1" fill="none"/>
      <circle cx="48" cy="55" r="3.5" fill="#f0c040"/>
      <text x="48" y="51" text-anchor="middle" font-size="7" fill="#0a2e7a">4R/3π</text>
      <text x="48" y="64" text-anchor="middle" font-size="8" fill="#f0c040" font-style="italic">G</text>
      <text x="55" y="88" font-size="9" fill="#0a2e7a" font-style="italic">R</text>
    </svg>`,
    formulas: 'Iₓ = Iᵧ = 0.0549R⁴ &nbsp;&nbsp; Pₓᵧ = −0.01647R⁴'
  },
  sector: {
    title: 'Sector Circular',
    svg: `<svg viewBox="0 0 160 100" fill="none">
      <path d="M80,85 L28,18 A60,60 0 0,1 132,18 Z" stroke="#0d3a8f" stroke-width="1.5" fill="rgba(228,172,23,.1)"/>
      <circle cx="80" cy="85" r="2.5" fill="#0e357f"/>
      <circle cx="80" cy="52" r="3.5" fill="#f0c040"/>
      <text x="80" y="48" text-anchor="middle" font-size="7" fill="#0a2e7a">2R sinθ/3θ</text>
      <text x="80" y="62" text-anchor="middle" font-size="8" fill="#f0c040" font-style="italic">G</text>
      <line x1="80" y1="85" x2="28" y2="18" stroke="#0a2e7a" stroke-width="1" opacity=".6"/>
      <line x1="80" y1="85" x2="132" y2="18" stroke="#0a2e7a" stroke-width="1" opacity=".6"/>
      <text x="65" y="72" font-size="8" fill="#0a2e7a" font-style="italic">θ</text>
      <text x="90" y="72" font-size="8" fill="#0a2e7a" font-style="italic">θ</text>
      <text x="108" y="40" font-size="9" fill="#0a2e7a" font-style="italic">R</text>
    </svg>`,
    formulas: 'A = R²θ &nbsp;&nbsp; ȳ = 2R sinθ/3θ &nbsp;&nbsp; (θ = semiángulo, en rad)'
  }
,
  rtriangle2: {
    title: 'Triángulo Rectángulo ②',
    svg: '<svg viewBox="0 0 200 130" fill="none"><polygon points="20,100 160,100 160,15" stroke="#0d3a8f" stroke-width="1.5" fill="rgba(228,172,23,.12)"/><polyline points="148,100 148,88 160,88" stroke="#0d3a8f" stroke-width="1" fill="none"/><circle cx="113" cy="72" r="3.5" fill="#f0c040"/><text x="116" y="69" font-size="9" fill="#f0c040" font-style="italic">G</text><text x="165" y="75" font-size="8" fill="#0a2e7a" text-anchor="middle">h/3</text><text x="113" y="115" font-size="8" fill="#0a2e7a" text-anchor="middle">b/3</text><line x1="20" y1="115" x2="160" y2="115" stroke="#123f8f" stroke-width="1"/><text x="90" y="128" text-anchor="middle" font-size="10" fill="#0a2e7a" font-style="italic">b</text><text x="175" y="60" font-size="10" fill="#0a2e7a" font-style="italic">h</text><text x="163" y="103" font-size="8" fill="#0e357f" font-style="italic">xG</text><text x="113" y="13" font-size="8" fill="#0e357f" font-style="italic">yG</text></svg>',
    formulas: 'I&#x2093;G = bh³/36 &nbsp; I&#x1D67;G = b³h/36 &nbsp; P&#x2093;&#x1D67;G = +b²h²/72'
  }};
function getRefFigHTML(type) {
  const ref = REF_FIGS[type];
  if(!ref) return '';
  return `<div class="ref-fig-box">
    <div class="ref-fig-title">${ref.title}</div>
    ${ref.svg}
    <div class="ref-fig-formula">${ref.formulas}</div>
  </div>`;
}

function selectFigType(type){
  cerrarPanelSiMovil();
  selectedFigType = type;
  selectedFigId = null;
  document.querySelectorAll('.fig-btn').forEach(b=>b.classList.remove('selected'));
  const btn = document.getElementById('figbtn-'+type);
  if(btn) btn.classList.add('selected');
  asegurarFiguraVisible(type);   // si estaba tras "Ver más", despliega la paleta
  document.getElementById('canvasHint').textContent = 'Haz clic en el canvas para colocar la figura';
  canvas.style.cursor='crosshair';
  document.getElementById('propPanel').style.display='none';
  document.getElementById('noSelection').style.display='block';
}

function getDefaultDims(type){
  const def = FIG_DEFS[type];
  const d={};
  for(const dim of def.dims) d[dim.id] = dim.def;
  return d;
}

function placeFigure(type, cx, cy){
  registrarCambio();
  const def = FIG_DEFS[type];
  const id = ++figIdCounter;
  const dims = getDefaultDims(type);
  const color = COLORS[colorIdx % COLORS.length]; colorIdx++;
  // Default centroid always at (0,0)
  const defAnc = def.defaultAnchor || 'C';
  const fig = {id, type, dims, cx:0, cy:0, rotation:0, sign:1, color,
               anchor: defAnc, activeAnchor: defAnc, name: def.name,
               // En cuerpo heterogéneo toda figura nace con el primer material
               // definido, para que nunca quede con peso nulo.
               matId: (modoCuerpo==='heterogeneo' && MATS.length) ? MATS[0].id : null,
               thickness: 1,   // espesor perpendicular al plano XY (solo aplica en heterogéneo)
               angleMode:'semi'};  // sector only: 'semi' (θ) | 'total' (2θ). Internal alpha is always the half-angle.
  figures.push(fig);
  selectedFigType = null;
  ghostPos = null;
  document.querySelectorAll('.fig-btn').forEach(b=>b.classList.remove('selected'));
  canvas.style.cursor='grab';
  document.getElementById('canvasHint').textContent = `Figura colocada en (${r2(cx)}, ${r2(cy)})`;
  selectFigure(id);
  results = null;
  renderFigList();
  render();
}

function selectFigure(id){
  selectedFigId = id;
  renderFigList();
  if(id){
    const fig = figures.find(f=>f.id===id);
    document.getElementById('propPanel').style.display='block';
    document.getElementById('noSelection').style.display='none';
    buildPropPanel(fig);
  } else {
    document.getElementById('propPanel').style.display='none';
    document.getElementById('noSelection').style.display='block';
  }
  render();
}

function renderFigList(){
  const ul = document.getElementById('figList');
  if(!figures.length){
    ul.innerHTML='<li style="color:var(--muted);font-size:10px;text-align:center;padding:8px">Sin figuras.</li>';
    return;
  }
  ul.innerHTML = figures.map(fig=>`
    <li class="fig-item ${(fig.id===selectedFigId||figuraMarcada(fig.id))?'selected':''}" onclick="selectFigure(${fig.id})">
      <div class="fig-color" style="background:${fig.color}"></div>
      <span class="fig-name">${fig.name}</span>
      <span class="fig-sign ${fig.sign===1?'pos':'neg'}">${fig.sign===1?'＋':'－'}</span>
      <button class="fig-del" onclick="event.stopPropagation();deleteFigure(${fig.id})">×</button>
    </li>`).join('');
}

function deleteFigure(id){
  registrarCambio();
  figures = figures.filter(f=>f.id!==id);
  if(selectedFigId===id) selectFigure(null);
  results=null; renderFigList(); render();
}
