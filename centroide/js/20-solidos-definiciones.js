// ═══════════════════════════════════════════════════════════
//  SÓLIDOS 3D — fichas de respaldo
// ═══════════════════════════════════════════════════════════
// El catálogo (SOLID_DEFS), el giro en los tres planos y las proyecciones
// se mudaron a **core/datos/solidos-3d.js** el 2026-09-24, para que
// momentos-de-inercia use exactamente los mismos sólidos en su modo 3D de
// masas. Aquí se queda solo lo que es de este tema.

// Fichas de referencia de los sólidos (alzado a la izquierda, planta a la
// derecha), para el panel de propiedades. Mismo formato que REF_FIGS.
const REF_SOLIDS = (function(){
  const est = 'stroke="#0d3a8f" stroke-width="1.5" fill="rgba(228,172,23,.12)"';
  const g   = (x,y) => `<circle cx="${x}" cy="${y}" r="3.2" fill="#f0c040"/><text x="${x+5}" y="${y-4}" font-size="8" fill="#b8860c" font-style="italic">G</text>`;
  const ejes = `<text x="8" y="94" font-size="7" fill="#0e357f">z</text><text x="150" y="94" font-size="7" fill="#0e357f">y</text>`;
  return {
    s_prisma: {title:'Prisma rectangular',
      svg:`<svg viewBox="0 0 160 100" fill="none"><rect x="14" y="20" width="52" height="62" ${est}/>${g(40,51)}<text x="40" y="94" text-anchor="middle" font-size="8" fill="#0a2e7a" font-style="italic">a</text><text x="72" y="54" font-size="8" fill="#0a2e7a" font-style="italic">h</text>
        <rect x="96" y="30" width="52" height="40" ${est}/>${g(122,50)}<text x="122" y="82" text-anchor="middle" font-size="8" fill="#0a2e7a" font-style="italic">a</text><text x="152" y="53" font-size="8" fill="#0a2e7a" font-style="italic">b</text>${ejes}</svg>`,
      formulas:'V = a·b·h &nbsp;·&nbsp; z̄ = h/2'},
    s_cilindro: {title:'Cilindro',
      svg:`<svg viewBox="0 0 160 100" fill="none"><rect x="16" y="18" width="48" height="66" ${est}/>${g(40,51)}<text x="40" y="94" text-anchor="middle" font-size="8" fill="#0a2e7a" font-style="italic">2R</text><text x="70" y="54" font-size="8" fill="#0a2e7a" font-style="italic">h</text>
        <circle cx="122" cy="50" r="24" ${est}/>${g(122,50)}<line x1="122" y1="50" x2="146" y2="50" stroke="#0d3a8f" stroke-width="1"/><text x="134" y="46" font-size="8" fill="#0a2e7a" font-style="italic">R</text>${ejes}</svg>`,
      formulas:'V = πR²h &nbsp;·&nbsp; z̄ = h/2'},
    s_semicilindro: {title:'Medio cilindro',
      svg:`<svg viewBox="0 0 160 100" fill="none"><rect x="20" y="18" width="40" height="66" ${est}/>${g(37,51)}<text x="40" y="94" text-anchor="middle" font-size="8" fill="#0a2e7a" font-style="italic">R</text><text x="66" y="54" font-size="8" fill="#0a2e7a" font-style="italic">h</text>
        <path d="M 110,26 A 24,24 0 0 1 110,74 Z" ${est}/>${g(120,50)}<line x1="110" y1="50" x2="134" y2="50" stroke="#0d3a8f" stroke-width="1"/><text x="120" y="46" font-size="8" fill="#0a2e7a" font-style="italic">R</text>${ejes}</svg>`,
      formulas:'V = &#960;R&#178;h/2 &nbsp;&#183;&nbsp; z&#772; = h/2 &nbsp;&#183;&nbsp; x&#772; = 4R/3&#960; de la cara plana'},
    s_semicilindro_t: {title:'Medio cilindro tumbado',
      svg:`<svg viewBox="0 0 160 100" fill="none"><path d="M 16,74 A 24,24 0 0 1 64,74 Z" ${est}/>${g(40,64)}<text x="40" y="94" text-anchor="middle" font-size="8" fill="#0a2e7a" font-style="italic">2R</text>
        <rect x="98" y="26" width="48" height="48" ${est}/>${g(122,50)}<text x="122" y="94" text-anchor="middle" font-size="8" fill="#0a2e7a" font-style="italic">2R</text><text x="150" y="53" font-size="8" fill="#0a2e7a" font-style="italic">L</text>${ejes}</svg>`,
      formulas:'V = &#960;R&#178;L/2 &nbsp;&#183;&nbsp; z&#772; = 4R/3&#960; de la cara plana'},
    s_cono: {title:'Cono',
      svg:`<svg viewBox="0 0 160 100" fill="none"><polygon points="14,84 66,84 40,16" ${est}/>${g(40,67)}<text x="40" y="94" text-anchor="middle" font-size="8" fill="#0a2e7a" font-style="italic">2R</text><text x="66" y="50" font-size="8" fill="#0a2e7a" font-style="italic">h</text>
        <circle cx="122" cy="50" r="24" ${est}/>${g(122,50)}${ejes}</svg>`,
      formulas:'V = πR²h/3 &nbsp;·&nbsp; z̄ = h/4'},
    s_esfera: {title:'Esfera',
      svg:`<svg viewBox="0 0 160 100" fill="none"><circle cx="40" cy="50" r="30" ${est}/>${g(40,50)}<line x1="40" y1="50" x2="70" y2="50" stroke="#0d3a8f" stroke-width="1"/><text x="52" y="46" font-size="8" fill="#0a2e7a" font-style="italic">R</text>
        <circle cx="122" cy="50" r="30" ${est}/>${g(122,50)}${ejes}</svg>`,
      formulas:'V = 4πR³/3 &nbsp;·&nbsp; z̄ = R (el centro)'},
    s_semiesfera: {title:'Semiesfera',
      svg:`<svg viewBox="0 0 160 100" fill="none"><path d="M10,70 A30,30 0 0,1 70,70 Z" ${est}/>${g(40,59)}<text x="40" y="92" text-anchor="middle" font-size="8" fill="#0a2e7a" font-style="italic">2R</text><text x="66" y="50" font-size="8" fill="#0a2e7a" font-style="italic">3R/8</text>
        <circle cx="122" cy="50" r="30" ${est}/>${g(122,50)}${ejes}</svg>`,
      formulas:'V = 2πR³/3 &nbsp;·&nbsp; z̄ = 3R/8'},
    s_piramide: {title:'Pirámide rectangular',
      svg:`<svg viewBox="0 0 160 100" fill="none"><polygon points="12,84 68,84 40,16" ${est}/>${g(40,67)}<text x="40" y="94" text-anchor="middle" font-size="8" fill="#0a2e7a" font-style="italic">a</text><text x="68" y="50" font-size="8" fill="#0a2e7a" font-style="italic">h</text>
        <rect x="96" y="30" width="52" height="40" ${est}/><line x1="96" y1="30" x2="148" y2="70" stroke="#0d3a8f" stroke-width=".7" stroke-dasharray="3,2"/><line x1="148" y1="30" x2="96" y2="70" stroke="#0d3a8f" stroke-width=".7" stroke-dasharray="3,2"/>${g(122,50)}${ejes}</svg>`,
      formulas:'V = a·b·h/3 &nbsp;·&nbsp; z̄ = h/4'},
    s_conotrunc: {title:'Cono truncado',
      svg:`<svg viewBox="0 0 160 100" fill="none"><polygon points="12,84 68,84 54,18 26,18" ${est}/>${g(40,58)}<text x="40" y="94" text-anchor="middle" font-size="8" fill="#0a2e7a" font-style="italic">2R₁</text><text x="40" y="14" text-anchor="middle" font-size="8" fill="#0a2e7a" font-style="italic">2R₂</text><text x="70" y="52" font-size="8" fill="#0a2e7a" font-style="italic">h</text>
        <circle cx="122" cy="50" r="28" ${est}/><circle cx="122" cy="50" r="14" stroke="#0d3a8f" stroke-width=".8" stroke-dasharray="3,2"/>${g(122,50)}${ejes}</svg>`,
      formulas:'V = πh(R₁²+R₁R₂+R₂²)/3<br>z̄ = h(R₁²+2R₁R₂+3R₂²)/[4(R₁²+R₁R₂+R₂²)]'},
    s_paraboloide: {title:'Paraboloide de revolución',
      svg:`<svg viewBox="0 0 160 100" fill="none"><path d="M12,84 Q40,-40 68,84 Z" ${est}/>${g(40,62)}<text x="40" y="94" text-anchor="middle" font-size="8" fill="#0a2e7a" font-style="italic">2R</text><text x="70" y="52" font-size="8" fill="#0a2e7a" font-style="italic">h</text>
        <circle cx="122" cy="50" r="28" ${est}/>${g(122,50)}${ejes}</svg>`,
      formulas:'V = πR²h/2 &nbsp;·&nbsp; z̄ = h/3'},
    s_cuna: {title:'Cuña (prisma triangular)',
      svg:`<svg viewBox="0 0 160 100" fill="none"><polygon points="12,84 72,84 12,22" ${est}/>${g(32,63)}<text x="42" y="94" text-anchor="middle" font-size="8" fill="#0a2e7a" font-style="italic">b</text><text x="4" y="56" font-size="8" fill="#0a2e7a" font-style="italic">h</text>
        <rect x="96" y="30" width="52" height="40" ${est}/><line x1="96" y1="30" x2="96" y2="70" stroke="#0d3a8f" stroke-width="2.4"/>${g(113,50)}<text x="122" y="82" text-anchor="middle" font-size="8" fill="#0a2e7a" font-style="italic">b</text><text x="152" y="53" font-size="8" fill="#0a2e7a" font-style="italic">L</text>${ejes}</svg>`,
      formulas:'V = b·h·L/2 &nbsp;·&nbsp; z̄ = h/3 &nbsp;·&nbsp; x̄ = b/3'}
  };
})();
