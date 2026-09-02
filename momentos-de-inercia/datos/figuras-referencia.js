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
  }};
