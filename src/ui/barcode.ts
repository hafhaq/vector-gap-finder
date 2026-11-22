/**
 * Scientific Instrumentation Charts:
 * 1. Vietoris-Rips Persistence Diagram (Birth vs Death for H0 & H1 topological cavities)
 * 2. Singular / Eigenvalue Scree Spectrum (Intrinsic dimensionality of semantic space)
 */

import type { PersistencePair } from '../types.ts';

export function renderPersistenceDiagram(
  container: HTMLElement,
  pairs: PersistencePair[],
  onHoverH1?: (h1Index: number | null) => void
): void {
  const h1 = pairs.filter((p) => p.dimension === 1).slice(0, 14);
  const h0 = pairs.filter((p) => p.dimension === 0).slice(0, 28);

  const maxVal = Math.max(
    0.5,
    ...h1.map((p) => p.death),
    ...h0.map((p) => p.death)
  );
  const pad = 26;
  const w = 260;
  const h = 156;
  const innerW = w - pad - 12;
  const innerH = h - pad - 14;

  const toX = (b: number) => pad + (b / maxVal) * innerW;
  const toY = (d: number) => h - pad - (d / maxVal) * innerH;

  const h0Dots = h0
    .map(
      (p) =>
        `<circle cx="${toX(p.birth).toFixed(1)}" cy="${toY(p.death).toFixed(1)}" r="2.3" fill="#38bdf8" fill-opacity="0.55"><title>H0 merge: death=${p.death.toFixed(3)}</title></circle>`
    )
    .join('');

  const h1Dots = h1
    .map(
      (p, idx) =>
        `<circle class="h1-dot" data-h1="${idx}" cx="${toX(p.birth).toFixed(1)}" cy="${toY(p.death).toFixed(1)}" r="${idx < 4 ? 4.4 : 3.3}" fill="#a78bfa" stroke="#f8fafc" stroke-width="1"><title>H1 Cavity #${idx + 1}: birth=${p.birth.toFixed(3)}, death=${p.death.toFixed(3)}, persistence=${p.persistence.toFixed(3)} (${p.cycleVertices.length} nodes)</title></circle>`
    )
    .join('');

  container.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" class="sci-svg" role="img" aria-label="Vietoris-Rips Persistence Diagram">
      <line x1="${pad}" y1="${h - pad}" x2="${w - 10}" y2="${h - pad}" stroke="#334155" stroke-width="1"/>
      <line x1="${pad}" y1="10" x2="${pad}" y2="${h - pad}" stroke="#334155" stroke-width="1"/>
      <line x1="${toX(0)}" y1="${toY(0)}" x2="${toX(maxVal)}" y2="${toY(maxVal)}" stroke="#475569" stroke-dasharray="3 3" stroke-width="1"/>
      <polygon points="${toX(0)},${toY(0)} ${toX(0)},${toY(maxVal)} ${toX(maxVal)},${toY(maxVal)}" fill="rgba(167,139,250,0.045)"/>
      ${h0Dots}
      ${h1Dots}
      <text x="${pad + innerW / 2}" y="${h - 6}" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="ui-monospace, monospace">Birth ε (cosine dist)</text>
      <text x="10" y="${pad + innerH / 2}" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="ui-monospace, monospace" transform="rotate(-90 10 ${pad + innerH / 2})">Death ε</text>
      <text x="${w - 14}" y="20" text-anchor="end" fill="#a78bfa" font-size="9" font-family="ui-monospace, monospace">● H1 Cavities (${h1.length})</text>
      <text x="${w - 14}" y="32" text-anchor="end" fill="#38bdf8" font-size="9" font-family="ui-monospace, monospace">● H0 Merges (${h0.length})</text>
    </svg>
  `;

  if (onHoverH1) {
    container.querySelectorAll<SVGCircleElement>('.h1-dot').forEach((dot) => {
      const idx = Number(dot.dataset.h1);
      dot.addEventListener('mouseenter', () => onHoverH1(idx));
      dot.addEventListener('mouseleave', () => onHoverH1(null));
    });
  }
}

export function renderScreePlot(container: HTMLElement, spectrum: number[]): void {
  const vals = spectrum.slice(0, 12);
  if (vals.length === 0) {
    container.innerHTML = '';
    return;
  }
  const maxV = Math.max(...vals, 1e-6);
  const w = 260;
  const h = 74;
  const padL = 22;
  const padB = 18;
  const innerW = w - padL - 8;
  const innerH = h - padB - 10;
  const barW = Math.max(6, innerW / vals.length - 4);

  const bars = vals
    .map((v, i) => {
      const bh = (v / maxV) * innerH;
      const x = padL + i * (innerW / vals.length) + 2;
      const y = h - padB - bh;
      const fill = i < 2 ? '#38bdf8' : '#64748b';
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${bh.toFixed(1)}" rx="2" fill="${fill}" fill-opacity="0.82"><title>Component ${i + 1}: λ=${v.toFixed(3)}</title></rect>`;
    })
    .join('');

  container.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" class="sci-svg" role="img" aria-label="Eigenvalue Scree Spectrum">
      <line x1="${padL}" y1="${h - padB}" x2="${w - 6}" y2="${h - padB}" stroke="#334155" stroke-width="1"/>
      ${bars}
      <text x="${padL + innerW / 2}" y="${h - 4}" text-anchor="middle" fill="#94a3b8" font-size="8.5" font-family="ui-monospace, monospace">Top ${vals.length} Spectral Eigenvalues (PC1–PC2 highlighted)</text>
    </svg>
  `;
}
