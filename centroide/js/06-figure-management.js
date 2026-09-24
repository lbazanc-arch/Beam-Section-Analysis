// ═══════════════════════════════════════════════════════════
//  FIGURE MANAGEMENT
// ═══════════════════════════════════════════════════════════

const REF_FIGS = {
  // ── Perfiles laminados (del catálogo). Las láminas son las de momentos-de-
  //    inercia, referidas desde la raíz, que es donde vive centroide.html.
  wshape: {
    title: 'Perfil W / S (doble T)',
    svg: `<img src="momentos-de-inercia/datos/img/perfil-w.png" alt="Perfil W / S (doble T)" style="width:100%;max-width:230px;height:auto;display:block;margin:0 auto;">`,
    formulas: `A = valor <b>tabulado</b><br><span style="color:#b45309">Centroide en el centro de la sección (doble simetría).</span>`
  },
  channel: {
    title: 'Canal C',
    svg: `<img src="momentos-de-inercia/datos/img/canal-c.png" alt="Canal C" style="width:100%;max-width:230px;height:auto;display:block;margin:0 auto;">`,
    formulas: `A y x̄ <b>tabulados</b><br><span style="color:#b45309">x̄ se mide desde el respaldo del alma; ȳ en el eje de simetría.</span>`
  },
  angleL: {
    title: 'Ángulo L',
    svg: `<img src="momentos-de-inercia/datos/img/angulo-l.png" alt="Ángulo L" style="width:100%;max-width:230px;height:auto;display:block;margin:0 auto;">`,
    formulas: `A, x̄ e ȳ <b>tabulados</b><br><span style="color:#b45309">x̄ e ȳ se miden desde el vértice del ángulo.</span>`
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
  parabola: {
    title: 'Parábola',
    svg: `<svg viewBox="0 0 170 110" fill="none">
      <path d="M20,88 Q80,-40 140,88 Z" stroke="#0d3a8f" stroke-width="1.5" fill="rgba(228,172,23,.1)"/>
      <line x1="80" y1="24" x2="80" y2="88" stroke="#0d3a8f" stroke-width="0.8" stroke-dasharray="4,3" opacity=".5"/>
      <circle cx="80" cy="62" r="3.5" fill="#f0c040"/>
      <text x="80" y="58" text-anchor="middle" font-size="7" fill="#0a2e7a">ȳ=2h/5</text>
      <text x="86" y="72" font-size="8" fill="#f0c040" font-style="italic">G</text>
      <line x1="20" y1="96" x2="140" y2="96" stroke="#123f8f" stroke-width="1"/>
      <text x="80" y="107" text-anchor="middle" font-size="9" fill="#0a2e7a" font-style="italic">b</text>
      <text x="148" y="60" font-size="9" fill="#0a2e7a" font-style="italic">h</text>
    </svg>`,
    formulas: 'A = 2bh/3 &nbsp;&nbsp; ȳ = 2h/5 (desde la base) &nbsp;&nbsp; x̄ en el eje de simetría<br>Iₓ = 8bh³/175 &nbsp;&nbsp; Iᵧ = b³h/30 &nbsp;&nbsp; Pₓᵧ = 0'
  },
  semiparabola: {
    title: 'Media parábola',
    svg: `<svg viewBox="0 0 170 110" fill="none">
      <path d="M25,88 L145,88 Q85,20 25,20 Z" stroke="#0d3a8f" stroke-width="1.5" fill="rgba(228,172,23,.1)"/>
      <rect x="25" y="74" width="14" height="14" stroke="#0d3a8f" stroke-width="1" fill="none"/>
      <circle cx="70" cy="61" r="3.5" fill="#f0c040"/>
      <text x="70" y="57" text-anchor="middle" font-size="7" fill="#0a2e7a">(3a/8, 2h/5)</text>
      <text x="76" y="71" font-size="8" fill="#f0c040" font-style="italic">G</text>
      <text x="18" y="97" font-size="8" fill="#0e357f" font-style="italic">O</text>
      <line x1="25" y1="96" x2="145" y2="96" stroke="#123f8f" stroke-width="1"/>
      <text x="85" y="107" text-anchor="middle" font-size="9" fill="#0a2e7a" font-style="italic">a</text>
      <text x="12" y="56" font-size="9" fill="#0a2e7a" font-style="italic">h</text>
    </svg>`,
    formulas: 'A = 2ah/3 &nbsp;&nbsp; x̄ = 3a/8 &nbsp;&nbsp; ȳ = 2h/5 (desde O)<br>Iₓ = 8ah³/175 &nbsp;&nbsp; Iᵧ = 19a³h/480 &nbsp;&nbsp; Pₓᵧ = −a²h²/60'
  },
  enjuta: {
    title: 'Media parábola complementaria',
    svg: `<svg viewBox="0 0 170 110" fill="none">
      <path d="M25,88 Q85,88 145,20 L145,88 Z" stroke="#0d3a8f" stroke-width="1.5" fill="rgba(228,172,23,.1)"/>
      <circle cx="115" cy="68" r="3.5" fill="#f0c040"/>
      <text x="108" y="62" text-anchor="middle" font-size="7" fill="#0a2e7a">(3a/4, 3h/10)</text>
      <text x="120" y="78" font-size="8" fill="#f0c040" font-style="italic">G</text>
      <text x="18" y="97" font-size="8" fill="#0e357f" font-style="italic">O</text>
      <line x1="25" y1="96" x2="145" y2="96" stroke="#123f8f" stroke-width="1"/>
      <text x="85" y="107" text-anchor="middle" font-size="9" fill="#0a2e7a" font-style="italic">a</text>
      <text x="155" y="56" font-size="9" fill="#0a2e7a" font-style="italic">h</text>
    </svg>`,
    formulas: 'A = ah/3 &nbsp;&nbsp; x̄ = 3a/4 &nbsp;&nbsp; ȳ = 3h/10 (desde O)<br>Iₓ = 37ah³/2100 &nbsp;&nbsp; Iᵧ = a³h/80 &nbsp;&nbsp; Pₓᵧ = +a²h²/120'
  },
  cuartoelipse: {
    title: 'Cuarto de Elipse',
    svg: `<svg viewBox="0 0 170 110" fill="none">
      <path d="M25,88 L145,88 A120,72 0 0,0 25,16 Z" stroke="#0d3a8f" stroke-width="1.5" fill="rgba(228,172,23,.1)"/>
      <rect x="25" y="74" width="14" height="14" stroke="#0d3a8f" stroke-width="1" fill="none"/>
      <circle cx="76" cy="57" r="3.5" fill="#f0c040"/>
      <text x="76" y="53" text-anchor="middle" font-size="7" fill="#0a2e7a">(4a/3π, 4b/3π)</text>
      <text x="82" y="67" font-size="8" fill="#f0c040" font-style="italic">G</text>
      <text x="18" y="97" font-size="8" fill="#0e357f" font-style="italic">O</text>
      <line x1="25" y1="96" x2="145" y2="96" stroke="#123f8f" stroke-width="1"/>
      <text x="85" y="107" text-anchor="middle" font-size="9" fill="#0a2e7a" font-style="italic">a</text>
      <text x="12" y="54" font-size="9" fill="#0a2e7a" font-style="italic">b</text>
    </svg>`,
    formulas: 'A = πab/4 &nbsp;&nbsp; x̄ = 4a/3π &nbsp;&nbsp; ȳ = 4b/3π (desde O)<br>Iₓ = ab³(π/16 − 4/9π) &nbsp;&nbsp; Iᵧ = a³b(π/16 − 4/9π) &nbsp;&nbsp; Pₓᵧ = a²b²(1/8 − 4/9π)'
  },
  semielipse: {
    title: 'Semielipse',
    svg: `<svg viewBox="0 0 170 110" fill="none">
      <path d="M20,80 A65,48 0 0,1 150,80 Z" stroke="#0d3a8f" stroke-width="1.5" fill="rgba(228,172,23,.1)"/>
      <line x1="20" y1="80" x2="150" y2="80" stroke="#0d3a8f" stroke-width="1.5"/>
      <line x1="85" y1="80" x2="85" y2="32" stroke="#0d3a8f" stroke-width="0.8" stroke-dasharray="4,3" opacity=".5"/>
      <line x1="85" y1="80" x2="150" y2="80" stroke="#0a2e7a" stroke-width="1.3"/>
      <text x="120" y="92" font-size="9" fill="#0a2e7a" font-style="italic">a</text>
      <text x="90" y="44" font-size="9" fill="#0a2e7a" font-style="italic">b</text>
      <circle cx="85" cy="60" r="3.5" fill="#f0c040"/>
      <text x="85" y="55" text-anchor="middle" font-size="7" fill="#0a2e7a">ȳ=4b/3π</text>
      <text x="85" y="72" text-anchor="middle" font-size="8" fill="#f0c040" font-style="italic">G</text>
    </svg>`,
    formulas: 'A = πab/2 &nbsp;&nbsp; ȳ = 4b/3π (desde la base) &nbsp;&nbsp; x̄ en el eje de simetría<br>Iₓ = ab³(π/8 − 8/9π) &nbsp;&nbsp; Iᵧ = πa³b/8 &nbsp;&nbsp; Pₓᵧ = 0'
  },
  elipse: {
    title: 'Elipse',
    svg: `<svg viewBox="0 0 170 110" fill="none">
      <ellipse cx="85" cy="55" rx="65" ry="38" stroke="#0d3a8f" stroke-width="1.5" fill="rgba(228,172,23,.1)"/>
      <line x1="20" y1="55" x2="150" y2="55" stroke="#0d3a8f" stroke-width="0.8" stroke-dasharray="4,3" opacity=".5"/>
      <line x1="85" y1="17" x2="85" y2="93" stroke="#0d3a8f" stroke-width="0.8" stroke-dasharray="4,3" opacity=".5"/>
      <line x1="85" y1="55" x2="150" y2="55" stroke="#0a2e7a" stroke-width="1.4"/>
      <line x1="85" y1="55" x2="85" y2="17" stroke="#0a2e7a" stroke-width="1.4"/>
      <text x="122" y="51" font-size="9" fill="#0a2e7a" font-style="italic">a</text>
      <text x="90" y="34" font-size="9" fill="#0a2e7a" font-style="italic">b</text>
      <circle cx="85" cy="55" r="3.5" fill="#f0c040"/>
      <text x="74" y="52" font-size="8" fill="#f0c040" font-style="italic">G</text>
    </svg>`,
    formulas: 'A = πab &nbsp;&nbsp; Centroide en el centro (dos ejes de simetría)<br>Iₓ = πab³/4 &nbsp;&nbsp; Iᵧ = πa³b/4 &nbsp;&nbsp; Pₓᵧ = 0'
  },
  segmento: {
    title: 'Segmento Circular',
    svg: `<svg viewBox="0 0 170 110" fill="none">
      <path d="M31.3,57 A62,62 0 0,1 138.7,57 Z" stroke="#0d3a8f" stroke-width="1.5" fill="rgba(228,172,23,.1)"/>
      <line x1="31.3" y1="57" x2="138.7" y2="57" stroke="#0d3a8f" stroke-width="1.5"/>
      <line x1="85" y1="88" x2="31.3" y2="57" stroke="#0a2e7a" stroke-width="0.9" opacity=".55"/>
      <line x1="85" y1="88" x2="138.7" y2="57" stroke="#0a2e7a" stroke-width="0.9" opacity=".55"/>
      <line x1="85" y1="88" x2="85" y2="26" stroke="#0d3a8f" stroke-width="0.8" stroke-dasharray="4,3" opacity=".5"/>
      <circle cx="85" cy="88" r="2.5" fill="#0e357f"/>
      <text x="88" y="99" font-size="8" fill="#0e357f" font-style="italic">O</text>
      <text x="69" y="78" font-size="8" fill="#0a2e7a" font-style="italic">θ</text>
      <text x="94" y="78" font-size="8" fill="#0a2e7a" font-style="italic">θ</text>
      <text x="116" y="76" font-size="9" fill="#0a2e7a" font-style="italic">R</text>
      <circle cx="85" cy="44" r="3.5" fill="#f0c040"/>
      <text x="85" y="38" text-anchor="middle" font-size="7" fill="#0a2e7a">ȳ desde O</text>
      <text x="93" y="49" font-size="8" fill="#f0c040" font-style="italic">G</text>
    </svg>`,
    formulas: 'A = R²(θ − senθ cosθ) &nbsp;&nbsp; ȳ = 2R sen³θ / 3(θ − senθ cosθ), desde el centro O<br>Iᵧ = R⁴(3θ − 3 senθ cosθ − 2 sen³θ cosθ)/12 &nbsp;&nbsp; Pₓᵧ = 0 &nbsp;&nbsp; (θ = semiángulo, en rad)'
  },
  trapecio: {
    title: 'Trapecio',
    svg: `<svg viewBox="0 0 170 118" fill="none">
      <polygon points="18,88 152,88 120,28 52,28" stroke="#0d3a8f" stroke-width="1.5" fill="rgba(228,172,23,.1)"/>
      <line x1="18" y1="61" x2="152" y2="61" stroke="#0d3a8f" stroke-width="0.7" stroke-dasharray="3,2" opacity=".4"/>
      <circle cx="85" cy="61" r="3.5" fill="#f0c040"/>
      <text x="85" y="57" text-anchor="middle" font-size="7" fill="#0a2e7a">ȳ</text>
      <text x="85" y="73" text-anchor="middle" font-size="8" fill="#f0c040" font-style="italic">G</text>
      <text x="86" y="23" text-anchor="middle" font-size="9" fill="#0a2e7a" font-style="italic">b</text>
      <line x1="18" y1="98" x2="152" y2="98" stroke="#123f8f" stroke-width="1"/>
      <text x="85" y="112" text-anchor="middle" font-size="9" fill="#0a2e7a" font-style="italic">a</text>
      <text x="159" y="62" font-size="9" fill="#0a2e7a" font-style="italic">h</text>
      <line x1="18" y1="88" x2="52" y2="88" stroke="#123f8f" stroke-width="0.9"/>
      <text x="35" y="84" text-anchor="middle" font-size="7.5" fill="#0e357f" font-style="italic">dx</text>
    </svg>`,
    formulas: 'A = (a+b)h/2 &nbsp;&nbsp; ȳ = h(a+2b)/3(a+b), desde la base mayor<br>Iₓ = h³(a²+4ab+b²)/36(a+b) &nbsp;&nbsp; Iᵧ y Pₓᵧ, por la fórmula exacta del polígono<br><span style="color:#b45309">Pₓᵧ = 0 solo si es isósceles (dx = (a−b)/2).</span>'
  },
  triangulo: {
    title: 'Triángulo',
    svg: `<svg viewBox="0 0 170 118" fill="none">
      <polygon points="20,88 150,88 65,20" stroke="#0d3a8f" stroke-width="1.5" fill="rgba(228,172,23,.1)"/>
      <line x1="65" y1="20" x2="65" y2="88" stroke="#0d3a8f" stroke-width="0.8" stroke-dasharray="4,3" opacity=".5"/>
      <line x1="20" y1="65.3" x2="150" y2="65.3" stroke="#0d3a8f" stroke-width="0.7" stroke-dasharray="3,2" opacity=".4"/>
      <circle cx="78.3" cy="65.3" r="3.5" fill="#f0c040"/>
      <text x="108" y="61" text-anchor="middle" font-size="7" fill="#0a2e7a">ȳ=h/3</text>
      <text x="84" y="77" font-size="8" fill="#f0c040" font-style="italic">G</text>
      <line x1="20" y1="96" x2="65" y2="96" stroke="#123f8f" stroke-width="0.9"/>
      <text x="42" y="105" text-anchor="middle" font-size="8" fill="#0e357f" font-style="italic">d</text>
      <line x1="20" y1="108" x2="150" y2="108" stroke="#123f8f" stroke-width="1"/>
      <text x="85" y="117" text-anchor="middle" font-size="9" fill="#0a2e7a" font-style="italic">b</text>
      <text x="71" y="45" font-size="9" fill="#0a2e7a" font-style="italic">h</text>
    </svg>`,
    formulas: 'A = bh/2 &nbsp;&nbsp; x̄ = (b+d)/3 &nbsp;&nbsp; ȳ = h/3, desde el extremo izquierdo de la base<br>Iₓ = bh³/36 &nbsp;&nbsp; Iᵧ = bh(b² − bd + d²)/36 &nbsp;&nbsp; Pₓᵧ = bh²(2d − b)/72'
  },
  hexagono: {
    title: 'Hexágono regular',
    svg: `<svg viewBox="0 0 170 110" fill="none">
      <polygon points="127,52 106,15.6 64,15.6 43,52 64,88.4 106,88.4" stroke="#0d3a8f" stroke-width="1.5" fill="rgba(228,172,23,.1)"/>
      <line x1="85" y1="52" x2="127" y2="52" stroke="#0a2e7a" stroke-width="1.4"/>
      <text x="108" y="48" font-size="9" fill="#0a2e7a" font-style="italic">R</text>
      <line x1="43" y1="52" x2="127" y2="52" stroke="#0d3a8f" stroke-width="0.7" stroke-dasharray="3,2" opacity=".4"/>
      <line x1="85" y1="15.6" x2="85" y2="88.4" stroke="#0d3a8f" stroke-width="0.7" stroke-dasharray="3,2" opacity=".4"/>
      <circle cx="85" cy="52" r="3.5" fill="#f0c040"/>
      <text x="74" y="49" font-size="8" fill="#f0c040" font-style="italic">G</text>
    </svg>`,
    formulas: 'A = 3√3R²/2 &nbsp;&nbsp; Centroide en el centro<br>Iₓ = Iᵧ = 5√3R⁴/16 &nbsp;&nbsp; Pₓᵧ = 0 &nbsp;&nbsp; <span style="color:#b45309">Todo eje por G da la misma I.</span>'
  },
  octogono: {
    title: 'Octógono regular',
    svg: `<svg viewBox="0 0 170 110" fill="none">
      <polygon points="123.8,35.9 101.1,13.2 68.9,13.2 46.2,35.9 46.2,68.1 68.9,90.8 101.1,90.8 123.8,68.1" stroke="#0d3a8f" stroke-width="1.5" fill="rgba(228,172,23,.1)"/>
      <line x1="85" y1="52" x2="123.8" y2="35.9" stroke="#0a2e7a" stroke-width="1.4"/>
      <text x="106" y="32" font-size="9" fill="#0a2e7a" font-style="italic">R</text>
      <line x1="101.1" y1="90.8" x2="68.9" y2="90.8" stroke="#0a2e7a" stroke-width="1.6"/>
      <text x="85" y="103" text-anchor="middle" font-size="9" fill="#0a2e7a" font-style="italic">L</text>
      <circle cx="85" cy="52" r="3.5" fill="#f0c040"/>
      <text x="74" y="49" font-size="8" fill="#f0c040" font-style="italic">G</text>
    </svg>`,
    formulas: 'A = 2√2R² &nbsp;&nbsp; Centroide en el centro<br>Iₓ = Iᵧ = A(6R² − L²)/24, con L = 2R sen(π/8) &nbsp;&nbsp; Pₓᵧ = 0'
  }
,
  rtriangle2: {
    title: 'Triángulo Rectángulo ②',
    svg: '<svg viewBox="0 0 200 130" fill="none"><polygon points="20,100 160,100 160,15" stroke="#0d3a8f" stroke-width="1.5" fill="rgba(228,172,23,.12)"/><polyline points="148,100 148,88 160,88" stroke="#0d3a8f" stroke-width="1" fill="none"/><circle cx="113" cy="72" r="3.5" fill="#f0c040"/><text x="116" y="69" font-size="9" fill="#f0c040" font-style="italic">G</text><text x="165" y="75" font-size="8" fill="#0a2e7a" text-anchor="middle">h/3</text><text x="113" y="115" font-size="8" fill="#0a2e7a" text-anchor="middle">b/3</text><line x1="20" y1="115" x2="160" y2="115" stroke="#123f8f" stroke-width="1"/><text x="90" y="128" text-anchor="middle" font-size="10" fill="#0a2e7a" font-style="italic">b</text><text x="175" y="60" font-size="10" fill="#0a2e7a" font-style="italic">h</text><text x="163" y="103" font-size="8" fill="#0e357f" font-style="italic">xG</text><text x="113" y="13" font-size="8" fill="#0e357f" font-style="italic">yG</text></svg>',
    formulas: 'I&#x2093;G = bh³/36 &nbsp; I&#x1D67;G = b³h/36 &nbsp; P&#x2093;&#x1D67;G = +b²h²/72'
  }};
// Ficha de la figura para el panel. Desde el 2026-09-23 el dibujo se GENERA
// acotado (25-fichas-de-figura.js) y las fórmulas ya no van debajo: se abren
// con el botón ⓘ de la esquina. REF_FIGS se sigue usando para lo que no se
// puede generar: los perfiles laminados, que son láminas en PNG.
function getRefFigHTML(type, anclaActiva) {
  const generada = (typeof fichaFiguraSVG === 'function') ? fichaFiguraSVG(type, {activa:anclaActiva}) : '';
  const ref = REF_FIGS[type];
  if(!generada && !ref) return '';
  const titulo = (generada && FIG_DEFS[type] && FIG_DEFS[type].name) || (ref && ref.title) || '';
  const info = (typeof formulasFiguraHTML === 'function') ? formulasFiguraHTML(type) : '';
  const cuerpo = generada || ref.svg;
  const leyenda = (generada && typeof leyendaAnclasHTML === 'function') ? leyendaAnclasHTML() : '';
  // Sin ficha generada (perfiles) se conservan las fórmulas de REF_FIGS.
  const pie = info ? '' : (ref && ref.formulas ? `<div class="ref-fig-formula">${ref.formulas}</div>` : '');
  return `<div class="ref-fig-box">
    ${info ? `<button type="button" class="ref-fig-info" onclick="alternarInfoFigura(this)"
        title="Fórmulas de la figura" aria-label="Fórmulas de la figura">i</button>` : ''}
    <div class="ref-fig-title">${titulo}</div>
    ${cuerpo}
    ${leyenda}
    ${pie}
    ${info ? `<div class="ref-fig-pop" hidden>${info}</div>` : ''}
  </div>`;
}
// Abre o cierra la ventanita de fórmulas. Solo una abierta a la vez.
function alternarInfoFigura(btn){
  const caja = btn && btn.closest('.ref-fig-box');
  const pop = caja && caja.querySelector('.ref-fig-pop');
  if(!pop) return;
  const abrir = pop.hasAttribute('hidden');
  cerrarInfoFigura();
  if(abrir){ pop.removeAttribute('hidden'); btn.classList.add('active'); }
}
function cerrarInfoFigura(){
  document.querySelectorAll('.ref-fig-pop').forEach(p=>p.setAttribute('hidden',''));
  document.querySelectorAll('.ref-fig-info.active').forEach(b=>b.classList.remove('active'));
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

// ── Dónde cae la figura al colocarla ──────────────────────────────────────
// `cx`/`cy` guardan el CENTROIDE de la pieza, pero lo que el alumno apunta con
// el clic es el ancla POR DEFECTO de la figura (BM en el semicírculo y en la
// parábola, BL en el trapecio, M en el segmento circular…). Se descuenta el
// desplazamiento del ancla, girado como la figura, igual que hace placeSolid
// con los sólidos del modo 3D (centroide/js/21-vistas-3d.js).
function desplazamientoAncla(def, dims, ancla, grados){
  const off = (def.anchorOffset ? def.anchorOffset(dims, ancla) : null) || {dx:0, dy:0};
  const rot = (grados || 0)*Math.PI/180;
  return {dx: off.dx*Math.cos(rot) - off.dy*Math.sin(rot),
          dy: off.dx*Math.sin(rot) + off.dy*Math.cos(rot)};
}
// El lienzo no engancha a la rejilla (es solo visual); el único enganche que
// hay es el de los ejes, con la misma tolerancia de 2 px que usa el arrastre.
// Así un clic junto a un eje deja el ancla EXACTAMENTE sobre él.
function engancharAlOrigen(x, y){
  const t = 2/viewScale;
  return {x: Math.abs(x) < t ? 0 : x, y: Math.abs(y) < t ? 0 : y};
}
// Centroide que corresponde a colocar la figura con su ancla en (wx, wy).
// Lo usan placeFigure y la figura fantasma, para que la vista previa caiga
// justo donde quedará la figura. Devuelve también el punto del ancla (ax, ay).
function centroideDesdeClic(type, wx, wy){
  const def = FIG_DEFS[type];
  const p = engancharAlOrigen(isFinite(wx) ? wx : 0, isFinite(wy) ? wy : 0);
  if(!def) return {x:p.x, y:p.y, ax:p.x, ay:p.y};
  const off = desplazamientoAncla(def, getDefaultDims(type), def.defaultAnchor || 'C', 0);
  return {x: p.x - off.dx, y: p.y - off.dy, ax: p.x, ay: p.y};
}

function placeFigure(type, cx, cy){
  if(modoEspacio === '3d') return placeSolid(type);     // 21-vistas-3d.js
  registrarCambio();
  const def = FIG_DEFS[type];
  const id = ++figIdCounter;
  const dims = getDefaultDims(type);
  const color = COLORS[colorIdx % COLORS.length]; colorIdx++;
  // La figura se coloca DONDE SE HIZO CLIC: en ese punto cae su ancla por
  // defecto, y cx/cy son el centroide que le corresponde.
  const defAnc = def.defaultAnchor || 'C';
  const pos = centroideDesdeClic(type, cx, cy);
  const fig = {id, type, dims, cx:pos.x, cy:pos.y, rotation:0, sign:1, color,
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
  document.getElementById('canvasHint').textContent =
    `Figura colocada en (${r2(pos.ax)}, ${r2(pos.ay)}) ${unit}`;
  selectFigure(id);
  invalidarResultados();
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
  selFiguras = selFiguras.filter(s=>s!==id);   // sin marcas huérfanas
  if(selectedFigId===id) selectFigure(null);
  invalidarResultados(); renderFigList(); actualizarInfoSel(); render();
}
