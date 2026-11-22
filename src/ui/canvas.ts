/**
 * High-DPI Interactive Scientific Manifold Visualizer (<canvas>)
 *
 * Renders:
 * - True lifted vMF Spherical Density Contour Heatmap + isolines
 * - Bowyer-Watson Delaunay / Alpha-Shape triangulation mesh
 * - k-NN semantic similarity graph
 * - Vietoris-Rips H1 Persistent Topological Cycles (exact bounding cavities!)
 * - Cluster halos & semantic labels
 * - Corpus nodes (colored by cluster)
 * - Ranked White-Space Gap Beacons (empty-ball radius, diamond reticle, pulsing highlight)
 * - Custom Probe / Vector Algebra target vector with nearest-anchor tether lines
 *
 * Supports smooth pan, wheel zoom, hover tooltips, click-select, and Shift+Click / Probe Mode
 * to lift ANY empty point on the manifold back onto S^(d-1) and decode it!
 */

import type { AnalysisResult, GapCandidate } from '../types.ts';

export interface LayerVisibility {
  density: boolean;
  delaunay: boolean;
  knn: boolean;
  h1Loops: boolean;
  labels: boolean;
  gaps: boolean;
}

export interface CanvasSelection {
  kind: 'gap' | 'item' | 'custom' | null;
  id?: string;
  index?: number;
}

export interface ManifoldCanvasCallbacks {
  onSelectGap: (gap: GapCandidate) => void;
  onSelectItem: (index: number) => void;
  onProbeVoid: (worldX: number, worldY: number) => void;
}

export class ManifoldCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private tooltipEl: HTMLElement;
  private callbacks: ManifoldCanvasCallbacks;

  private result: AnalysisResult | null = null;
  private customGap: GapCandidate | null = null;
  private selection: CanvasSelection = { kind: null };
  private highlightedH1Index: number | null = null;
  private layers: LayerVisibility = {
    density: true,
    delaunay: true,
    knn: false,
    h1Loops: true,
    labels: true,
    gaps: true,
  };
  private probeMode = false;

  // Camera transform (world coords [-1.15, 1.15] -> screen pixels)
  private zoom = 1;
  private panX = 0;
  private panY = 0;
  private isDragging = false;
  private dragMoved = false;
  private lastPointerX = 0;
  private lastPointerY = 0;

  // Cached offscreen density heatmap bitmap for 60fps pan/zoom
  private densityBitmap: HTMLCanvasElement | null = null;
  private hoverTarget: { kind: 'gap' | 'item' | 'custom'; idx: number } | null = null;
  private resizeObserver: ResizeObserver;

  constructor(
    canvas: HTMLCanvasElement,
    tooltipEl: HTMLElement,
    callbacks: ManifoldCanvasCallbacks
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not acquire 2D canvas context');
    this.ctx = ctx;
    this.tooltipEl = tooltipEl;
    this.callbacks = callbacks;

    this.resizeObserver = new ResizeObserver(() => {
      this.syncCanvasSize();
      this.render();
    });
    this.resizeObserver.observe(canvas);
    this.syncCanvasSize();
    this.bindEvents();
  }

  public setResult(result: AnalysisResult, customGap: GapCandidate | null = null): void {
    this.result = result;
    this.customGap = customGap;
    this.buildDensityBitmap();
    this.render();
  }

  public setCustomGap(gap: GapCandidate | null): void {
    this.customGap = gap;
    this.render();
  }

  public setSelection(sel: CanvasSelection): void {
    this.selection = sel;
    this.render();
  }

  public setHighlightedH1(h1Idx: number | null): void {
    this.highlightedH1Index = h1Idx;
    this.render();
  }

  public setLayers(partial: Partial<LayerVisibility>): void {
    this.layers = { ...this.layers, ...partial };
    this.render();
  }

  public setProbeMode(enabled: boolean): void {
    this.probeMode = enabled;
    this.canvas.style.cursor = enabled ? 'crosshair' : 'grab';
  }

  public resetView(): void {
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.render();
  }

  public destroy(): void {
    this.resizeObserver.disconnect();
  }

  private syncCanvasSize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  private worldToScreen(wx: number, wy: number): [number, number] {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const baseScale = Math.min(w, h) * 0.43 * this.zoom;
    const cx = w * 0.5 + this.panX;
    const cy = h * 0.5 + this.panY;
    return [cx + wx * baseScale, cy - wy * baseScale];
  }

  private screenToWorld(sx: number, sy: number): [number, number] {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const baseScale = Math.min(w, h) * 0.43 * this.zoom;
    const cx = w * 0.5 + this.panX;
    const cy = h * 0.5 + this.panY;
    return [(sx - cx) / baseScale, -(sy - cy) / baseScale];
  }

  /** Pre-render the lifted vMF spherical density grid to an offscreen canvas with smooth scientific ramp */
  private buildDensityBitmap(): void {
    if (!this.result) {
      this.densityBitmap = null;
      return;
    }
    const { size, values, min, max } = this.result.densityGrid;
    const off = document.createElement('canvas');
    off.width = size;
    off.height = size;
    const octx = off.getContext('2d');
    if (!octx) return;

    const img = octx.createImageData(size, size);
    const range = Math.max(1e-6, max - min);

    for (let gy = 0; gy < size; gy++) {
      // Flip Y so canvas top corresponds to +1.05 world Y
      const dstY = size - 1 - gy;
      for (let gx = 0; gx < size; gx++) {
        const raw = values[gy * size + gx];
        const t = Math.max(0, Math.min(1, (raw - min) / range));
        const idx = (dstY * size + gx) * 4;

        // Scientific dark-observatory indigo -> teal -> luminous cyan density ramp
        // + subtle contour bands every 0.14 density step!
        const band = Math.abs(((t * 7) % 1) - 0.5) < 0.045 && t > 0.08 ? 22 : 0;
        const r = Math.min(255, Math.round(14 + t * 28 + Math.pow(t, 2.2) * 58 + band));
        const g = Math.min(255, Math.round(28 + t * 92 + Math.pow(t, 1.8) * 90 + band));
        const b = Math.min(255, Math.round(62 + t * 140 + Math.pow(t, 1.4) * 52 + band));
        const a = Math.round(Math.pow(t, 0.72) * 165);

        img.data[idx] = r;
        img.data[idx + 1] = g;
        img.data[idx + 2] = b;
        img.data[idx + 3] = a;
      }
    }
    octx.putImageData(img, 0, 0);
    this.densityBitmap = off;
  }

  private hitTest(sx: number, sy: number): { kind: 'gap' | 'item' | 'custom'; idx: number } | null {
    if (!this.result) return null;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // 1. Custom probe / algebra vector highest priority
    if (this.customGap) {
      const [px, py] = this.worldToScreen(this.customGap.pos2d[0], this.customGap.pos2d[1]);
      if (Math.hypot(px - sx, py - sy) <= 18 * dpr) {
        return { kind: 'custom', idx: 0 };
      }
    }

    // 2. Discovered Gap beacons
    if (this.layers.gaps) {
      let bestGap = -1;
      let bestD = 18 * dpr;
      for (let i = 0; i < this.result.gaps.length; i++) {
        const g = this.result.gaps[i];
        const [gx, gy] = this.worldToScreen(g.pos2d[0], g.pos2d[1]);
        const d = Math.hypot(gx - sx, gy - sy);
        if (d < bestD) {
          bestD = d;
          bestGap = i;
        }
      }
      if (bestGap !== -1) return { kind: 'gap', idx: bestGap };
    }

    // 3. Corpus items
    let bestItem = -1;
    let bestD = 13 * dpr;
    for (let i = 0; i < this.result.positions2d.length; i++) {
      const [px, py] = this.worldToScreen(this.result.positions2d[i][0], this.result.positions2d[i][1]);
      const d = Math.hypot(px - sx, py - sy);
      if (d < bestD) {
        bestD = d;
        bestItem = i;
      }
    }
    if (bestItem !== -1) return { kind: 'item', idx: bestItem };
    return null;
  }

  private bindEvents(): void {
    const getCanvasCoords = (e: PointerEvent | WheelEvent): [number, number] => {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      return [(e.clientX - rect.left) * dpr, (e.clientY - rect.top) * dpr];
    };

    this.canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const [sx, sy] = getCanvasCoords(e);
      if (this.probeMode || e.shiftKey) {
        const [wx, wy] = this.screenToWorld(sx, sy);
        this.callbacks.onProbeVoid(wx, wy);
        return;
      }
      this.isDragging = true;
      this.dragMoved = false;
      this.lastPointerX = sx;
      this.lastPointerY = sy;
      this.canvas.setPointerCapture(e.pointerId);
      this.canvas.style.cursor = 'grabbing';
    });

    this.canvas.addEventListener('pointermove', (e) => {
      const [sx, sy] = getCanvasCoords(e);
      if (this.isDragging) {
        const dx = sx - this.lastPointerX;
        const dy = sy - this.lastPointerY;
        if (Math.hypot(dx, dy) > 3) this.dragMoved = true;
        this.panX += dx;
        this.panY += dy;
        this.lastPointerX = sx;
        this.lastPointerY = sy;
        this.hideTooltip();
        this.render();
        return;
      }

      const hit = this.hitTest(sx, sy);
      const changed =
        hit?.kind !== this.hoverTarget?.kind || hit?.idx !== this.hoverTarget?.idx;
      this.hoverTarget = hit;
      if (!this.probeMode) {
        this.canvas.style.cursor = hit ? 'pointer' : 'grab';
      }
      if (hit) {
        this.showTooltip(e.clientX, e.clientY, hit);
      } else {
        this.hideTooltip();
      }
      if (changed) this.render();
    });

    this.canvas.addEventListener('pointerup', (e) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.canvas.releasePointerCapture(e.pointerId);
      this.canvas.style.cursor = this.probeMode ? 'crosshair' : 'grab';

      if (!this.dragMoved && this.result) {
        const [sx, sy] = getCanvasCoords(e);
        const hit = this.hitTest(sx, sy);
        if (hit?.kind === 'gap') {
          this.callbacks.onSelectGap(this.result.gaps[hit.idx]);
        } else if (hit?.kind === 'custom' && this.customGap) {
          this.callbacks.onSelectGap(this.customGap);
        } else if (hit?.kind === 'item') {
          this.callbacks.onSelectItem(hit.idx);
        }
      }
    });

    this.canvas.addEventListener('pointerleave', () => {
      this.hoverTarget = null;
      this.hideTooltip();
      this.render();
    });

    this.canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const [sx, sy] = getCanvasCoords(e);
        const [wxBefore, wyBefore] = this.screenToWorld(sx, sy);
        const factor = e.deltaY < 0 ? 1.14 : 0.88;
        this.zoom = Math.max(0.55, Math.min(5.5, this.zoom * factor));
        const [sxAfter, syAfter] = this.worldToScreen(wxBefore, wyBefore);
        this.panX += sx - sxAfter;
        this.panY += sy - syAfter;
        this.render();
      },
      { passive: false }
    );
  }

  private showTooltip(
    clientX: number,
    clientY: number,
    hit: { kind: 'gap' | 'item' | 'custom'; idx: number }
  ): void {
    if (!this.result) return;
    const parentRect = this.canvas.parentElement?.getBoundingClientRect();
    if (!parentRect) return;

    if (hit.kind === 'gap' || hit.kind === 'custom') {
      const g = hit.kind === 'custom' ? this.customGap! : this.result.gaps[hit.idx];
      const badge =
        hit.kind === 'custom'
          ? g.sourceMethod === 'vector-algebra'
            ? 'VECTOR ALGEBRA'
            : 'CUSTOM PROBE'
          : `GAP #${hit.idx + 1} · ${g.sourceMethod.toUpperCase()}`;
      this.tooltipEl.innerHTML = `
        <div class="tt-badge tt-gap">${badge}</div>
        <div class="tt-title">${escapeHtml(g.synthesizedTitle)}</div>
        <div class="tt-meta">Opportunity ${(g.opportunityScore * 100).toFixed(0)}% · Void Radius ${g.metrics.nearestDistance.toFixed(2)} · Bridge H=${(g.metrics.bridgeEntropy * 100).toFixed(0)}%</div>
      `;
    } else {
      const item = this.result.items[hit.idx];
      const cluster = this.result.clusters.find((c) => c.memberIndices.includes(hit.idx));
      this.tooltipEl.innerHTML = `
        <div class="tt-badge" style="color:${cluster?.color ?? '#38bdf8'}">${escapeHtml(cluster?.label ?? item.category ?? 'Concept')}</div>
        <div class="tt-title">${escapeHtml(item.title)}</div>
        <div class="tt-meta">${escapeHtml(item.summary.slice(0, 125))}${item.summary.length > 125 ? '…' : ''}</div>
      `;
    }

    const x = Math.min(parentRect.width - 280, Math.max(12, clientX - parentRect.left + 14));
    const y = Math.min(parentRect.height - 110, Math.max(12, clientY - parentRect.top + 14));
    this.tooltipEl.style.transform = `translate(${x}px, ${y}px)`;
    this.tooltipEl.classList.add('visible');
  }

  private hideTooltip(): void {
    this.tooltipEl.classList.remove('visible');
  }

  public render(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    ctx.clearRect(0, 0, w, h);

    // Subtle scientific coordinate grid
    this.drawCoordinateGrid(ctx, w, h, dpr);

    if (!this.result) return;
    const res = this.result;

    // 1. Lifted vMF Density Field Heatmap
    if (this.layers.density && this.densityBitmap) {
      const [x0, y0] = this.worldToScreen(-1.05, 1.05);
      const [x1, y1] = this.worldToScreen(1.05, -1.05);
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(this.densityBitmap, x0, y0, x1 - x0, y1 - y0);
      ctx.restore();
    }

    // 2. Bowyer-Watson Delaunay / Alpha-Shape Mesh
    if (this.layers.delaunay) {
      ctx.save();
      for (const tri of res.delaunay) {
        const [ax, ay] = this.worldToScreen(res.positions2d[tri.a][0], res.positions2d[tri.a][1]);
        const [bx, by] = this.worldToScreen(res.positions2d[tri.b][0], res.positions2d[tri.b][1]);
        const [cx, cy] = this.worldToScreen(res.positions2d[tri.c][0], res.positions2d[tri.c][1]);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.lineTo(cx, cy);
        ctx.closePath();
        ctx.strokeStyle = tri.inAlphaShape
          ? 'rgba(148, 163, 184, 0.14)'
          : 'rgba(148, 163, 184, 0.045)';
        ctx.lineWidth = dpr;
        ctx.stroke();
      }
      ctx.restore();
    }

    // 3. k-NN Semantic Similarity Graph
    if (this.layers.knn) {
      ctx.save();
      for (const [u, v, sim] of res.knnEdges) {
        const [ux, uy] = this.worldToScreen(res.positions2d[u][0], res.positions2d[u][1]);
        const [vx, vy] = this.worldToScreen(res.positions2d[v][0], res.positions2d[v][1]);
        ctx.beginPath();
        ctx.moveTo(ux, uy);
        ctx.lineTo(vx, vy);
        const alpha = Math.max(0.08, Math.min(0.45, (sim - 0.1) * 0.7));
        ctx.strokeStyle = `rgba(56, 189, 248, ${alpha.toFixed(2)})`;
        ctx.lineWidth = dpr * 1.1;
        ctx.stroke();
      }
      ctx.restore();
    }

    // 4. Vietoris-Rips H1 Persistent Topological Cycles
    if (this.layers.h1Loops) {
      const h1s = res.persistence.filter((p) => p.dimension === 1).slice(0, 6);
      ctx.save();
      h1s.forEach((cyc, idx) => {
        if (cyc.cycleVertices.length < 3) return;
        const isHighlighted = this.highlightedH1Index === idx;
        ctx.beginPath();
        cyc.cycleVertices.forEach((vIdx, k) => {
          const [vx, vy] = this.worldToScreen(res.positions2d[vIdx][0], res.positions2d[vIdx][1]);
          if (k === 0) ctx.moveTo(vx, vy);
          else ctx.lineTo(vx, vy);
        });
        ctx.closePath();
        ctx.fillStyle = isHighlighted
          ? 'rgba(167, 139, 250, 0.22)'
          : 'rgba(167, 139, 250, 0.07)';
        ctx.fill();
        ctx.setLineDash([5 * dpr, 4 * dpr]);
        ctx.strokeStyle = isHighlighted
          ? 'rgba(196, 181, 253, 0.95)'
          : 'rgba(167, 139, 250, 0.48)';
        ctx.lineWidth = (isHighlighted ? 2.2 : 1.3) * dpr;
        ctx.stroke();
      });
      ctx.restore();
    }

    // 5. Cluster Labels (positioned at 2D cluster means)
    if (this.layers.labels) {
      ctx.save();
      ctx.font = `600 ${Math.round(10.5 * dpr)}px "Inter", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const c of res.clusters) {
        if (c.memberIndices.length === 0) continue;
        let mx = 0, my = 0;
        for (const idx of c.memberIndices) {
          mx += res.positions2d[idx][0];
          my += res.positions2d[idx][1];
        }
        mx /= c.memberIndices.length;
        my /= c.memberIndices.length;
        const [sx, sy] = this.worldToScreen(mx, my);

        const text = c.label.toUpperCase();
        const tw = ctx.measureText(text).width + 14 * dpr;
        const th = 19 * dpr;
        ctx.fillStyle = 'rgba(9, 14, 26, 0.72)';
        roundRect(ctx, sx - tw / 2, sy - th / 2 - 22 * dpr, tw, th, 9 * dpr);
        ctx.fill();
        ctx.strokeStyle = `${c.color}66`;
        ctx.lineWidth = dpr;
        ctx.stroke();

        ctx.fillStyle = c.color;
        ctx.fillText(text, sx, sy - 22 * dpr);
      }
      ctx.restore();
    }

    // 6. Selected Gap Tether Lines to Nearest Existing Offerings & Bounding Cycle
    const activeGap =
      this.selection.kind === 'custom' && this.customGap
        ? this.customGap
        : this.selection.kind === 'gap'
          ? res.gaps.find((g) => g.id === this.selection.id) ?? null
          : null;

    if (activeGap) {
      const [gx, gy] = this.worldToScreen(activeGap.pos2d[0], activeGap.pos2d[1]);
      ctx.save();
      // Bounding cycle highlight if present
      if (activeGap.cycleVertices && activeGap.cycleVertices.length >= 3) {
        ctx.beginPath();
        activeGap.cycleVertices.forEach((vIdx, k) => {
          const [vx, vy] = this.worldToScreen(res.positions2d[vIdx][0], res.positions2d[vIdx][1]);
          if (k === 0) ctx.moveTo(vx, vy);
          else ctx.lineTo(vx, vy);
        });
        ctx.closePath();
        ctx.fillStyle = 'rgba(245, 158, 11, 0.08)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.55)';
        ctx.lineWidth = 1.4 * dpr;
        ctx.setLineDash([4 * dpr, 4 * dpr]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Tether rays to nearest existing offerings
      for (const nb of activeGap.nearestExisting) {
        const [nx, ny] = this.worldToScreen(
          res.positions2d[nb.index][0],
          res.positions2d[nb.index][1]
        );
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.lineTo(nx, ny);
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.52)';
        ctx.lineWidth = 1.5 * dpr;
        ctx.setLineDash([3 * dpr, 3 * dpr]);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 7. Existing Corpus Points
    const itemToColor = new Map<number, string>();
    for (const c of res.clusters) {
      for (const idx of c.memberIndices) itemToColor.set(idx, c.color);
    }

    for (let i = 0; i < res.items.length; i++) {
      const [px, py] = this.worldToScreen(res.positions2d[i][0], res.positions2d[i][1]);
      const color = itemToColor.get(i) ?? '#38bdf8';
      const isSelected = this.selection.kind === 'item' && this.selection.index === i;
      const isHovered = this.hoverTarget?.kind === 'item' && this.hoverTarget.idx === i;
      const isAnchor = activeGap?.nearestExisting.some((n) => n.index === i) ?? false;

      const r = (isSelected || isHovered ? 6.8 : isAnchor ? 5.8 : 4.5) * dpr;

      if (isSelected || isAnchor) {
        ctx.beginPath();
        ctx.arc(px, py, r + 5 * dpr, 0, Math.PI * 2);
        ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(251, 191, 36, 0.75)';
        ctx.lineWidth = 1.6 * dpr;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#070b14';
      ctx.lineWidth = 1.4 * dpr;
      ctx.stroke();

      // Show crisp label for selected, hovered, or anchor nodes
      if (isSelected || isHovered || (isAnchor && this.zoom >= 0.9)) {
        const label = res.items[i].title.slice(0, 32);
        ctx.font = `500 ${Math.round(10 * dpr)}px "Inter", system-ui, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(7, 11, 20, 0.82)';
        const tw = ctx.measureText(label).width + 8 * dpr;
        roundRect(ctx, px + 9 * dpr, py - 8 * dpr, tw, 16 * dpr, 4 * dpr);
        ctx.fill();
        ctx.fillStyle = '#e2e8f0';
        ctx.fillText(label, px + 13 * dpr, py);
      }
    }

    // 8. Discovered White-Space Gap Beacons
    if (this.layers.gaps) {
      res.gaps.forEach((gap, idx) => {
        const isSelected = this.selection.kind === 'gap' && this.selection.id === gap.id;
        const isHovered = this.hoverTarget?.kind === 'gap' && this.hoverTarget.idx === idx;
        this.drawGapBeacon(ctx, gap, `#${idx + 1}`, '#f59e0b', isSelected, isHovered, dpr);
      });
    }

    // 9. Custom Probe or Vector Algebra Target Vector
    if (this.customGap) {
      const isSelected = this.selection.kind === 'custom';
      const isHovered = this.hoverTarget?.kind === 'custom';
      const tag = this.customGap.sourceMethod === 'vector-algebra' ? '∑' : '⊕';
      this.drawGapBeacon(ctx, this.customGap, tag, '#10b981', isSelected, isHovered, dpr);
    }
  }

  private drawGapBeacon(
    ctx: CanvasRenderingContext2D,
    gap: GapCandidate,
    label: string,
    accent: string,
    isSelected: boolean,
    isHovered: boolean,
    dpr: number
  ): void {
    const [gx, gy] = this.worldToScreen(gap.pos2d[0], gap.pos2d[1]);
    const scale = isSelected ? 1.25 : isHovered ? 1.12 : 1.0;

    ctx.save();

    // Empty-void halo scaled gently by sparsity
    const voidR = (18 + gap.metrics.sparsity * 18) * dpr * Math.min(1.5, Math.sqrt(this.zoom));
    const grad = ctx.createRadialGradient(gx, gy, 2 * dpr, gx, gy, voidR);
    grad.addColorStop(0, `${accent}55`);
    grad.addColorStop(0.6, `${accent}18`);
    grad.addColorStop(1, `${accent}00`);
    ctx.beginPath();
    ctx.arc(gx, gy, voidR, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Outer dashed void ring
    ctx.beginPath();
    ctx.arc(gx, gy, voidR * 0.72, 0, Math.PI * 2);
    ctx.strokeStyle = isSelected ? accent : `${accent}88`;
    ctx.lineWidth = (isSelected ? 1.8 : 1.1) * dpr;
    ctx.setLineDash([3 * dpr, 3 * dpr]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Precision Diamond Reticle
    const s = 9.5 * dpr * scale;
    ctx.beginPath();
    ctx.moveTo(gx, gy - s);
    ctx.lineTo(gx + s, gy);
    ctx.lineTo(gx, gy + s);
    ctx.lineTo(gx - s, gy);
    ctx.closePath();
    ctx.fillStyle = isSelected ? accent : '#0b1120';
    ctx.fill();
    ctx.strokeStyle = isSelected ? '#ffffff' : accent;
    ctx.lineWidth = 2 * dpr;
    ctx.stroke();

    // Rank Badge text
    ctx.font = `700 ${Math.round(9.5 * dpr)}px "JetBrains Mono", ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isSelected ? '#070b14' : accent;
    ctx.fillText(label, gx, gy + 0.5 * dpr);

    ctx.restore();
  }

  private drawCoordinateGrid(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    dpr: number
  ): void {
    ctx.save();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.065)';
    ctx.lineWidth = dpr;

    for (let v = -1.0; v <= 1.01; v += 0.25) {
      const [sx] = this.worldToScreen(v, 0);
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, h);
      ctx.stroke();

      const [, sy] = this.worldToScreen(0, v);
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(w, sy);
      ctx.stroke();
    }

    // Subtle origin axes
    const [ox, oy] = this.worldToScreen(0, 0);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
    ctx.beginPath();
    ctx.moveTo(ox, 0);
    ctx.lineTo(ox, h);
    ctx.moveTo(0, oy);
    ctx.lineTo(w, oy);
    ctx.stroke();
    ctx.restore();
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
