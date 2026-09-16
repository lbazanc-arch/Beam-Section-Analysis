// Fichas de referencia de la paleta de figuras (REF_FIGS).
// Extraidas del script principal: eran 131 KB dentro de FIGURE MANAGEMENT.
// Los tres PNG que iban en base64 viven ahora en datos/img/.
const REF_FIGS = {
  wshape: {
    title: 'Perfil W / S (doble T)',
    svg: `<img src="momentos-de-inercia/datos/img/perfil-w.png" alt="Perfil W / S (doble T)" style="width:100%;max-width:230px;height:auto;display:block;margin:0 auto;image-rendering:auto;">`,
    formulas: `A = 2·b<sub>f</sub>·t<sub>f</sub> + (d − 2·t<sub>f</sub>)·t<sub>w</sub><br>I<sub>x</sub> = [b<sub>f</sub>·d³ − (b<sub>f</sub> − t<sub>w</sub>)·(d − 2t<sub>f</sub>)³] / 12<br>I<sub>y</sub> = [2·t<sub>f</sub>·b<sub>f</sub>³ + (d − 2t<sub>f</sub>)·t<sub>w</sub>³] / 12<br><span style="color:#b45309">Centroide en el centro de la sección (doble simetría).</span>`
  },
  channel: {
    title: 'Canal C',
    svg: `<img src="momentos-de-inercia/datos/img/canal-c.png" alt="Canal C" style="width:100%;max-width:230px;height:auto;display:block;margin:0 auto;image-rendering:auto;">`,
    formulas: `A = d·t<sub>w</sub> + 2·(b<sub>f</sub> − t<sub>w</sub>)·t<sub>f</sub><br>x̄ se mide desde el respaldo del alma<br>I<sub>x</sub> por simetría respecto al eje horizontal; I<sub>y</sub> con Steiner desde x̄<br><span style="color:#b45309">Alas cónicas: se emplean los valores del Apéndice C.</span>`
  },
  angleL: {
    title: 'Ángulo L',
    svg: `<img src="momentos-de-inercia/datos/img/angulo-l.png" alt="Ángulo L" style="width:100%;max-width:230px;height:auto;display:block;margin:0 auto;image-rendering:auto;">`,
    formulas: `A = t·b₂ + (b₁ − t)·t<br>x̄, ȳ por momentos estáticos de las dos alas<br>I<sub>xy</sub> ≠ 0: los ejes X-Y no son principales<br><span style="color:#b45309">El eje Z-Z es el principal menor.</span>`
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
  },
  parabola: {
    title: 'Parábola',
    svg: `<svg viewBox="0 0 160 100" fill="none">
      <path d="M20,82 Q80,-54 140,82 Z" stroke="#0d3a8f" stroke-width="1.5" fill="rgba(228,172,23,.1)"/>
      <line x1="80" y1="82" x2="80" y2="14" stroke="#0d3a8f" stroke-width="0.8" stroke-dasharray="4,3" opacity=".5"/>
      <circle cx="80" cy="55" r="3.5" fill="#f0c040"/>
      <text x="80" y="50" text-anchor="middle" font-size="7" fill="#0a2e7a">ȳ=2h/5</text>
      <text x="80" y="66" text-anchor="middle" font-size="8" fill="#f0c040" font-style="italic">G</text>
      <line x1="20" y1="88" x2="140" y2="88" stroke="#123f8f" stroke-width="1"/>
      <text x="80" y="97" text-anchor="middle" font-size="9" fill="#0a2e7a" font-style="italic">b</text>
      <line x1="147" y1="14" x2="147" y2="82" stroke="#123f8f" stroke-width="1"/>
      <text x="153" y="51" font-size="9" fill="#0a2e7a" font-style="italic">h</text>
    </svg>`,
    formulas: 'A = 2bh/3 &nbsp;&nbsp; ȳ = 2h/5 (desde la base)<br>Iₓ = 8bh³/175 &nbsp;&nbsp; Iᵧ = b³h/30 &nbsp;&nbsp; Pₓᵧ = 0'
  },
  semiparabola: {
    title: 'Media parábola',
    svg: `<svg viewBox="0 0 160 100" fill="none">
      <path d="M20,82 L140,82 Q80,14 20,14 Z" stroke="#0d3a8f" stroke-width="1.5" fill="rgba(228,172,23,.1)"/>
      <rect x="20" y="70" width="12" height="12" stroke="#0d3a8f" stroke-width="1" fill="none"/>
      <circle cx="65" cy="55" r="3.5" fill="#f0c040"/>
      <text x="65" y="50" text-anchor="middle" font-size="7" fill="#0a2e7a">x̄=3a/8</text>
      <text x="65" y="66" text-anchor="middle" font-size="8" fill="#f0c040" font-style="italic">G</text>
      <line x1="20" y1="88" x2="140" y2="88" stroke="#123f8f" stroke-width="1"/>
      <text x="80" y="97" text-anchor="middle" font-size="9" fill="#0a2e7a" font-style="italic">a</text>
      <line x1="12" y1="14" x2="12" y2="82" stroke="#123f8f" stroke-width="1"/>
      <text x="4" y="51" font-size="9" fill="#0a2e7a" font-style="italic">h</text>
    </svg>`,
    formulas: 'A = 2ah/3 &nbsp;&nbsp; x̄ = 3a/8, ȳ = 2h/5 (desde el ángulo recto)<br>Iₓ = 8ah³/175 &nbsp;&nbsp; Iᵧ = 19a³h/480 &nbsp;&nbsp; Pₓᵧ = −a²h²/60'
  },
  enjuta: {
    title: 'Media parábola complementaria',
    svg: `<svg viewBox="0 0 160 100" fill="none">
      <path d="M20,82 Q80,82 140,14 L140,82 Z" stroke="#0d3a8f" stroke-width="1.5" fill="rgba(228,172,23,.1)"/>
      <rect x="128" y="70" width="12" height="12" stroke="#0d3a8f" stroke-width="1" fill="none"/>
      <circle cx="110" cy="62" r="3.5" fill="#f0c040"/>
      <text x="104" y="57" text-anchor="middle" font-size="7" fill="#0a2e7a">x̄=3a/4</text>
      <text x="110" y="73" text-anchor="middle" font-size="8" fill="#f0c040" font-style="italic">G</text>
      <line x1="20" y1="88" x2="140" y2="88" stroke="#123f8f" stroke-width="1"/>
      <text x="80" y="97" text-anchor="middle" font-size="9" fill="#0a2e7a" font-style="italic">a</text>
      <line x1="148" y1="14" x2="148" y2="82" stroke="#123f8f" stroke-width="1"/>
      <text x="153" y="51" font-size="9" fill="#0a2e7a" font-style="italic">h</text>
    </svg>`,
    formulas: 'A = ah/3 &nbsp;&nbsp; x̄ = 3a/4, ȳ = 3h/10 (desde el vértice de la curva)<br>Iₓ = 37ah³/2100 &nbsp;&nbsp; Iᵧ = a³h/80 &nbsp;&nbsp; Pₓᵧ = +a²h²/120'
  },
  cuartoelipse: {
    title: 'Cuarto de Elipse',
    svg: `<svg viewBox="0 0 160 100" fill="none">
      <path d="M20,86 L130,86 A110,76 0 0,0 20,10 Z" stroke="#0d3a8f" stroke-width="1.5" fill="rgba(228,172,23,.1)"/>
      <rect x="20" y="74" width="12" height="12" stroke="#0d3a8f" stroke-width="1" fill="none"/>
      <circle cx="67" cy="54" r="3.5" fill="#f0c040"/>
      <text x="67" y="49" text-anchor="middle" font-size="7" fill="#0a2e7a">x̄=4a/3π</text>
      <text x="67" y="65" text-anchor="middle" font-size="8" fill="#f0c040" font-style="italic">G</text>
      <line x1="20" y1="92" x2="130" y2="92" stroke="#123f8f" stroke-width="1"/>
      <text x="75" y="99" text-anchor="middle" font-size="9" fill="#0a2e7a" font-style="italic">a</text>
      <line x1="12" y1="10" x2="12" y2="86" stroke="#123f8f" stroke-width="1"/>
      <text x="4" y="52" font-size="9" fill="#0a2e7a" font-style="italic">b</text>
    </svg>`,
    formulas: 'A = πab/4 &nbsp;&nbsp; x̄ = 4a/3π, ȳ = 4b/3π<br>Iₓ = ab³(π/16 − 4/9π) &nbsp;&nbsp; Iᵧ = a³b(π/16 − 4/9π)<br>Pₓᵧ = a²b²(1/8 − 4/9π)'
  },
  // ── Tanda del 2026-09-15: siete figuras más ───────────
  triangulo: {
    title: 'Triángulo (vértice cualquiera)',
    svg: `<svg viewBox="0 0 160 100" fill="none">
      <polygon points="20,82 140,82 98,18" stroke="#0d3a8f" stroke-width="1.5" fill="rgba(228,172,23,.1)"/>
      <line x1="98" y1="18" x2="98" y2="82" stroke="#0d3a8f" stroke-width="0.8" stroke-dasharray="4,3" opacity=".5"/>
      <circle cx="86" cy="60.7" r="3.5" fill="#f0c040"/>
      <text x="86" y="56" text-anchor="middle" font-size="7" fill="#0a2e7a">x̄=(b+d)/3</text>
      <text x="86" y="71" text-anchor="middle" font-size="8" fill="#f0c040" font-style="italic">G</text>
      <line x1="20" y1="90" x2="140" y2="90" stroke="#123f8f" stroke-width="1"/>
      <text x="80" y="98" text-anchor="middle" font-size="9" fill="#0a2e7a" font-style="italic">b</text>
      <line x1="20" y1="12" x2="98" y2="12" stroke="#123f8f" stroke-width="1"/>
      <text x="55" y="10" text-anchor="middle" font-size="9" fill="#0a2e7a" font-style="italic">d</text>
      <line x1="148" y1="18" x2="148" y2="82" stroke="#123f8f" stroke-width="1"/>
      <text x="153" y="53" font-size="9" fill="#0a2e7a" font-style="italic">h</text>
    </svg>`,
    formulas: 'A = bh/2 &nbsp;&nbsp; x̄ = (b+d)/3 &nbsp;&nbsp; ȳ = h/3<br>Iₓ = bh³/36 &nbsp;&nbsp; Iᵧ = bh(b² − bd + d²)/36 &nbsp;&nbsp; Pₓᵧ = bh²(2d − b)/72<br><span style="color:#b45309">d es la abscisa del vértice desde el extremo izquierdo de la base; Pₓᵧ = 0 solo si d = b/2.</span>'
  },
  trapecio: {
    title: 'Trapecio',
    svg: `<svg viewBox="0 0 160 100" fill="none">
      <polygon points="18,80 138,80 116,28 52,28" stroke="#0d3a8f" stroke-width="1.5" fill="rgba(228,172,23,.1)"/>
      <line x1="18" y1="28" x2="52" y2="28" stroke="#123f8f" stroke-width="1"/>
      <line x1="18" y1="80" x2="18" y2="28" stroke="#0d3a8f" stroke-width="0.8" stroke-dasharray="4,3" opacity=".5"/>
      <text x="33" y="25" text-anchor="middle" font-size="9" fill="#0a2e7a" font-style="italic">Δ</text>
      <circle cx="80.7" cy="56.6" r="3.5" fill="#f0c040"/>
      <text x="80.7" y="67" text-anchor="middle" font-size="8" fill="#f0c040" font-style="italic">G</text>
      <line x1="18" y1="88" x2="138" y2="88" stroke="#123f8f" stroke-width="1"/>
      <text x="78" y="97" text-anchor="middle" font-size="9" fill="#0a2e7a" font-style="italic">a</text>
      <text x="84" y="24" text-anchor="middle" font-size="9" fill="#0a2e7a" font-style="italic">b</text>
      <line x1="146" y1="28" x2="146" y2="80" stroke="#123f8f" stroke-width="1"/>
      <text x="151" y="57" font-size="9" fill="#0a2e7a" font-style="italic">h</text>
    </svg>`,
    formulas: 'A = (a+b)h/2 &nbsp;&nbsp; x̄ = [a²+ab+b² + Δ(a+2b)] / 3(a+b) &nbsp;&nbsp; ȳ = h(a+2b) / 3(a+b)<br>Iₓ = h³K / 36(a+b) &nbsp;&nbsp; Iᵧ = h[a⁴+2a³b+2ab³+b⁴ + Δ²K − ΔJ] / 36(a+b) &nbsp;&nbsp; Pₓᵧ = h²(2ΔK − J) / 72(a+b)<br><span style="color:#b45309">K = a²+4ab+b², J = a³+3a²b−3ab²−b³; Δ es el desplazamiento de la base menor. Pₓᵧ = 0 solo si es isósceles (Δ = (a−b)/2).</span>'
  },
  segmento: {
    title: 'Segmento Circular',
    svg: `<svg viewBox="0 0 160 100" fill="none">
      <path d="M38.3,58.6 A46,46 0 0,1 121.7,58.6 Z" stroke="#0d3a8f" stroke-width="1.5" fill="rgba(228,172,23,.1)"/>
      <line x1="38.3" y1="58.6" x2="121.7" y2="58.6" stroke="#0d3a8f" stroke-width="1.5"/>
      <line x1="80" y1="78" x2="121.7" y2="58.6" stroke="#0a2e7a" stroke-width="1" opacity=".7"/>
      <line x1="80" y1="78" x2="80" y2="32" stroke="#0d3a8f" stroke-width="0.8" stroke-dasharray="4,3" opacity=".5"/>
      <circle cx="80" cy="78" r="2.5" fill="#0e357f"/>
      <text x="72" y="87" font-size="8" fill="#0e357f" font-style="italic">O</text>
      <text x="86" y="71" font-size="8" fill="#0a2e7a" font-style="italic">θ</text>
      <text x="107" y="73" font-size="9" fill="#0a2e7a" font-style="italic">R</text>
      <circle cx="80" cy="47.6" r="3.5" fill="#f0c040"/>
      <text x="80" y="43" text-anchor="middle" font-size="7" fill="#0a2e7a">ȳ desde O</text>
      <text x="80" y="57" text-anchor="middle" font-size="8" fill="#f0c040" font-style="italic">G</text>
    </svg>`,
    formulas: 'A = R²(θ − senθ·cosθ) &nbsp;&nbsp; ȳ = 2R sen³θ / 3(θ − senθ·cosθ) &nbsp; (desde el centro O)<br>Iₓ = R⁴(θ − senθcosθ + 2sen³θ·cosθ)/4 − A·ȳ² &nbsp;&nbsp; Iᵧ = R⁴(3θ − 3senθcosθ − 2sen³θ·cosθ)/12 &nbsp;&nbsp; Pₓᵧ = 0<br><span style="color:#b45309">θ es el SEMIÁNGULO, en radianes, medido desde el eje de simetría. Con θ = 90° reproduce el semicírculo.</span>'
  },
  semielipse: {
    title: 'Semielipse',
    svg: `<svg viewBox="0 0 160 100" fill="none">
      <path d="M20,74 A60,44 0 0,1 140,74 Z" stroke="#0d3a8f" stroke-width="1.5" fill="rgba(228,172,23,.1)"/>
      <line x1="20" y1="74" x2="140" y2="74" stroke="#0d3a8f" stroke-width="1.5"/>
      <line x1="80" y1="74" x2="80" y2="30" stroke="#0d3a8f" stroke-width="0.8" stroke-dasharray="4,3" opacity=".5"/>
      <text x="85" y="46" font-size="9" fill="#0a2e7a" font-style="italic">b</text>
      <line x1="80" y1="82" x2="140" y2="82" stroke="#123f8f" stroke-width="1"/>
      <text x="110" y="92" text-anchor="middle" font-size="9" fill="#0a2e7a" font-style="italic">a</text>
      <circle cx="80" cy="55.3" r="3.5" fill="#f0c040"/>
      <text x="80" y="51" text-anchor="middle" font-size="7" fill="#0a2e7a">ȳ=4b/3π</text>
      <text x="80" y="65" text-anchor="middle" font-size="8" fill="#f0c040" font-style="italic">G</text>
    </svg>`,
    formulas: 'A = πab/2 &nbsp;&nbsp; ȳ = 4b/3π (desde la base plana)<br>Iₓ = ab³(π/8 − 8/9π) &nbsp;&nbsp; Iᵧ = πa³b/8 &nbsp;&nbsp; Pₓᵧ = 0'
  },
  elipse: {
    title: 'Elipse',
    svg: `<svg viewBox="0 0 160 100" fill="none">
      <ellipse cx="80" cy="48" rx="60" ry="34" stroke="#0d3a8f" stroke-width="1.5" fill="rgba(228,172,23,.1)"/>
      <line x1="80" y1="48" x2="140" y2="48" stroke="#0d3a8f" stroke-width="1.3"/>
      <line x1="80" y1="48" x2="80" y2="14" stroke="#0d3a8f" stroke-width="1.3"/>
      <text x="112" y="44" text-anchor="middle" font-size="9" fill="#0a2e7a" font-style="italic">a</text>
      <text x="85" y="30" font-size="9" fill="#0a2e7a" font-style="italic">b</text>
      <line x1="20" y1="48" x2="80" y2="48" stroke="#0d3a8f" stroke-width="0.8" stroke-dasharray="4,3" opacity=".5"/>
      <line x1="80" y1="48" x2="80" y2="82" stroke="#0d3a8f" stroke-width="0.8" stroke-dasharray="4,3" opacity=".5"/>
      <circle cx="80" cy="48" r="3.5" fill="#f0c040"/>
      <text x="80" y="60" text-anchor="middle" font-size="8" fill="#f0c040" font-style="italic">G</text>
    </svg>`,
    formulas: 'A = πab &nbsp;&nbsp; El centroide está en el centro (doble simetría)<br>Iₓ = πab³/4 &nbsp;&nbsp; Iᵧ = πa³b/4 &nbsp;&nbsp; Pₓᵧ = 0'
  },
  hexagono: {
    title: 'Hexágono regular',
    svg: `<svg viewBox="0 0 160 100" fill="none">
      <polygon points="120,50 100,15.4 60,15.4 40,50 60,84.6 100,84.6" stroke="#0d3a8f" stroke-width="1.5" fill="rgba(228,172,23,.1)"/>
      <line x1="80" y1="50" x2="120" y2="50" stroke="#0d3a8f" stroke-width="1.3"/>
      <text x="100" y="46" text-anchor="middle" font-size="9" fill="#0a2e7a" font-style="italic">R</text>
      <line x1="80" y1="50" x2="80" y2="84.6" stroke="#0d3a8f" stroke-width="0.8" stroke-dasharray="4,3" opacity=".5"/>
      <circle cx="80" cy="50" r="3.5" fill="#f0c040"/>
      <text x="80" y="62" text-anchor="middle" font-size="8" fill="#f0c040" font-style="italic">G</text>
    </svg>`,
    formulas: 'A = 3√3R²/2 &nbsp;&nbsp; El centroide está en el centro<br>Iₓ = Iᵧ = 5√3R⁴/16 ≈ 0.5413R⁴ &nbsp;&nbsp; Pₓᵧ = 0<br><span style="color:#b45309">R es el radio CIRCUNSCRITO (del centro a un vértice). En un polígono regular toda recta por el centroide da la misma inercia, así que cualquier par de ejes es principal.</span>'
  },
  octogono: {
    title: 'Octógono regular',
    svg: `<svg viewBox="0 0 160 100" fill="none">
      <polygon points="117,34.7 95.3,13 64.7,13 43,34.7 43,65.3 64.7,87 95.3,87 117,65.3" stroke="#0d3a8f" stroke-width="1.5" fill="rgba(228,172,23,.1)"/>
      <line x1="80" y1="50" x2="117" y2="34.7" stroke="#0d3a8f" stroke-width="1.3"/>
      <text x="103" y="38" text-anchor="middle" font-size="9" fill="#0a2e7a" font-style="italic">R</text>
      <line x1="80" y1="50" x2="80" y2="87" stroke="#0d3a8f" stroke-width="0.8" stroke-dasharray="4,3" opacity=".5"/>
      <circle cx="80" cy="50" r="3.5" fill="#f0c040"/>
      <text x="80" y="62" text-anchor="middle" font-size="8" fill="#f0c040" font-style="italic">G</text>
    </svg>`,
    formulas: 'A = 2√2R² &nbsp;&nbsp; El centroide está en el centro<br>Iₓ = Iᵧ = (1 + 2√2)R⁴/6 ≈ 0.6381R⁴ &nbsp;&nbsp; Pₓᵧ = 0<br><span style="color:#b45309">R es el radio CIRCUNSCRITO (del centro a un vértice). Como en el hexágono, toda recta por el centroide da la misma inercia.</span>'
  }
};
