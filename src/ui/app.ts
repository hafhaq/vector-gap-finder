/**
 * Main Application Controller for VoidLens
 * Orchestrates corpus state, instant LSA-SVD & Web Worker Neural 384-D embeddings,
 * interactive manifold canvas, gap inspector, vector algebra, live web harvesting, and export.
 */

import { CAPABILITY_LEXICON } from '../data/lexicon.ts';
import { PRESET_DATASETS } from '../data/presets.ts';
import {
  ALL_WEB_SOURCES,
  DEFAULT_SOURCES,
  harvestWebCorpus,
  SOURCE_PACKS,
  type WebSourceId,
} from '../data/webSearch.ts';
import { buildDomainNativeLexicon, fitLsaSpace, type LsaModelResult } from '../science/lsa.ts';
import { cosineSim, normalizeInPlace } from '../science/math.ts';
import {
  evaluateGapCandidate,
  runVectorGapAnalysis,
  type FullEngineOutput,
} from '../science/gapEngine.ts';
import { ManifoldCanvas } from './canvas.ts';
import { renderPersistenceDiagram, renderScreePlot } from './barcode.ts';
import type {
  AnalysisConfig,
  CorpusItem,
  EmbeddingEngineKind,
  GapCandidate,
  LexiconConcept,
} from '../types.ts';

interface NeuralWorkerMessage {
  id?: number;
  type: 'progress' | 'embed-progress' | 'ready' | 'embedded' | 'error';
  device?: string;
  dims?: number;
  vectors?: Float32Array[];
  status?: string;
  file?: string;
  progress?: number;
  done?: number;
  total?: number;
  message?: string;
}

export class VoidLensApp {
  private items: CorpusItem[] = [];
  private engine: EmbeddingEngineKind = 'lsa-svd';
  private config: AnalysisConfig = {
    projection: 'manifold',
    numClusters: 6,
    vmfKappa: 6.0,
    topKGaps: 8,
    weights: {
      sparsity: 0.38,
      bridgeEntropy: 0.30,
      coherence: 0.18,
      topology: 0.14,
    },
  };

  private lsaModel: LsaModelResult | null = null;
  private activeLexicon: LexiconConcept[] = CAPABILITY_LEXICON;
  private neuralCorpusVectors: Float64Array[] | null = null;
  private neuralLexiconVectors: Float64Array[] | null = null;
  private neuralWorker: Worker | null = null;
  private workerReqId = 0;
  private workerPending = new Map<
    number,
    { resolve: (v: NeuralWorkerMessage) => void; reject: (e: Error) => void }
  >();
  private neuralReady = false;
  private neuralDevice = '';

  private engineOutput: FullEngineOutput | null = null;
  private customGap: GapCandidate | null = null;
  private selectedGap: GapCandidate | null = null;
  private selectedItemIndex: number | null = null;

  private canvasView: ManifoldCanvas;
  private toastTimer: number | null = null;

  constructor() {
    const canvasEl = this.el<HTMLCanvasElement>('manifold-canvas');
    const tooltipEl = this.el<HTMLElement>('canvas-tooltip');

    this.canvasView = new ManifoldCanvas(canvasEl, tooltipEl, {
      onSelectGap: (gap) => this.selectGap(gap),
      onSelectItem: (idx) => this.selectItem(idx),
      onProbeVoid: (wx, wy) => this.probeVoidAt(wx, wy),
    });

    this.initDialogClosedByFallback();
    this.populatePresets();
    this.renderSourcePicker();
    this.bindUI();
    this.loadPreset(PRESET_DATASETS[0].id);
  }

  private renderSourcePicker(): void {
    const packBar = this.el('source-pack-bar');
    packBar.innerHTML = Object.entries(SOURCE_PACKS)
      .map(
        ([key, pack]) =>
          `<button type="button" class="pack-btn ${key === 'broad' ? 'active' : ''}" data-pack="${key}">${pack.label}</button>`
      )
      .join('');

    const groups = ['Science & Policy', 'Knowledge & Archives', 'Communities & Media', 'Software & AI'] as const;
    const container = this.el('source-groups-container');
    container.innerHTML = groups
      .map((grp) => {
        const srcs = ALL_WEB_SOURCES.filter((s) => s.group === grp);
        return `
          <fieldset class="source-grid">
            <legend>${grp}</legend>
            ${srcs
              .map(
                (s) => `
              <label class="source-card">
                <input type="checkbox" name="harvest-source" value="${s.id}" ${s.defaultEnabled ? 'checked' : ''} />
                <div>
                  <strong>${s.name}</strong>
                  <span>${s.desc}</span>
                </div>
              </label>`
              )
              .join('')}
          </fieldset>`;
      })
      .join('');

    const syncCount = () => {
      const checked = document.querySelectorAll('input[name="harvest-source"]:checked').length;
      this.el('source-count').textContent = String(checked);
    };

    container.addEventListener('change', () => {
      packBar.querySelectorAll('.pack-btn').forEach((b) => b.classList.remove('active'));
      syncCount();
    });

    packBar.querySelectorAll<HTMLButtonElement>('.pack-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pack = SOURCE_PACKS[btn.dataset.pack ?? 'broad'];
        if (!pack) return;
        const set = new Set(pack.sources);
        document.querySelectorAll<HTMLInputElement>('input[name="harvest-source"]').forEach((cb) => {
          cb.checked = set.has(cb.value as WebSourceId);
        });
        packBar.querySelectorAll('.pack-btn').forEach((b) => b.classList.toggle('active', b === btn));
        syncCount();
      });
    });

    syncCount();
  }

  private getSelectedSources(): WebSourceId[] {
    const selected = Array.from(
      document.querySelectorAll<HTMLInputElement>('input[name="harvest-source"]:checked')
    ).map((i) => i.value as WebSourceId);
    return selected.length > 0 ? selected : DEFAULT_SOURCES;
  }

  private el<T extends HTMLElement>(id: string): T {
    const node = document.getElementById(id);
    if (!node) throw new Error(`Missing DOM element #${id}`);
    return node as T;
  }

  /** Modern Web Guidance fallback for browsers without native dialog closedby="any" */
  private initDialogClosedByFallback(): void {
    document.querySelectorAll<HTMLDialogElement>('dialog').forEach((dlg) => {
      dlg.addEventListener('close', () => {
        dlg.returnValue = '';
      });
    });

    if (!('closedBy' in HTMLDialogElement.prototype)) {
      const isOutside = (e: PointerEvent, dialog: HTMLDialogElement) => {
        const r = dialog.getBoundingClientRect();
        return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      };
      document.querySelectorAll<HTMLDialogElement>('dialog[closedby="any"]').forEach((dialog) => {
        let pressedOutside = false;
        dialog.addEventListener('pointerdown', (e) => {
          pressedOutside = isOutside(e, dialog);
        });
        dialog.addEventListener('pointerup', (e) => {
          if (pressedOutside && isOutside(e, dialog)) dialog.close();
        });
      });
    }
  }

  private populatePresets(activeCustomTopic?: string): void {
    const select = this.el<HTMLSelectElement>('preset-select');
    const customOpt = activeCustomTopic
      ? `<option value="__live__" selected>★ Live: ${escapeHtml(activeCustomTopic)}</option>`
      : '';
    select.innerHTML =
      customOpt +
      PRESET_DATASETS.map((p) => `<option value="${p.id}">${p.name}</option>`).join('') +
      `<option value="__new__">+ New Research Topic…</option>`;
  }

  private bindUI(): void {
    const harvestDlg = this.el<HTMLDialogElement>('harvest-dialog');
    const corpusDlg = this.el<HTMLDialogElement>('corpus-dialog');
    const scienceDlg = this.el<HTMLDialogElement>('science-dialog');

    // Direct inline Quick Research bar in header (Enter or click Research)
    this.el<HTMLFormElement>('quick-research-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = this.el<HTMLInputElement>('quick-topic-input');
      const query = input.value.trim();
      if (!query) {
        this.openHarvestDialog('');
        return;
      }
      input.blur(); // dismiss mobile keyboard so map is immediately visible
      await this.runLiveResearch(query, this.getSelectedSources(), 'replace');
    });

    // Preset switcher (includes "+ New Research Topic…")
    this.el<HTMLSelectElement>('preset-select').addEventListener('change', (e) => {
      const sel = e.target as HTMLSelectElement;
      if (sel.value === '__new__') {
        this.openHarvestDialog('');
        return;
      }
      if (sel.value === '__live__') return;
      this.loadPreset(sel.value);
    });

    // Modals
    this.el('btn-harvest').addEventListener('click', () => {
      const currentQuick = this.el<HTMLInputElement>('quick-topic-input').value.trim();
      this.openHarvestDialog(currentQuick);
    });

    this.el('btn-corpus').addEventListener('click', () => {
      const ta = this.el<HTMLTextAreaElement>('corpus-textarea');
      ta.value = this.items.map((it) => `${it.title}: ${it.summary}`).join('\n');
      corpusDlg.showModal();
    });

    this.el('btn-science').addEventListener('click', () => scienceDlg.showModal());

    // Live Web Harvest modal form submit (works on Enter / mobile Search key / button tap!)
    this.el<HTMLFormElement>('harvest-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.executeWebHarvest(harvestDlg);
    });

    // One-tap example topic pills inside harvest modal
    document.querySelectorAll<HTMLButtonElement>('.topic-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        const topic = pill.dataset.topic ?? '';
        this.el<HTMLInputElement>('harvest-query').value = topic;
        this.executeWebHarvest(harvestDlg);
      });
    });

    // Corpus Apply / Export / Import
    this.el('btn-apply-corpus').addEventListener('click', () => {
      const text = this.el<HTMLTextAreaElement>('corpus-textarea').value;
      const parsed = parseCorpusLines(text);
      if (parsed.length < 5) {
        this.showToast('Please provide at least 5 distinct concepts for topological gap analysis.');
        return;
      }
      corpusDlg.close();
      this.populatePresets('Custom Corpus');
      this.setCorpus(parsed);
      this.showToast(`Embedded ${parsed.length} custom concepts & recalculated voids.`);
    });

    this.el('btn-export-json').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(this.items, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'voidlens-corpus.json';
      a.click();
      URL.revokeObjectURL(url);
    });

    this.el<HTMLInputElement>('input-import-json').addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const raw = JSON.parse(await file.text());
        if (Array.isArray(raw) && raw.length >= 5) {
          const imported: CorpusItem[] = raw
            .filter((r) => r && (r.title || r.summary))
            .map((r, i) => ({
              id: r.id || `imp-${i + 1}`,
              title: String(r.title || `Concept ${i + 1}`).trim(),
              summary: String(r.summary || r.description || r.title).trim(),
              category: r.category,
              source: r.source || 'Imported JSON',
              year: r.year,
            }));
          if (imported.length >= 5) {
            corpusDlg.close();
            this.populatePresets(file.name.replace(/\.json$/i, ''));
            this.setCorpus(imported);
            this.showToast(`Imported ${imported.length} items from JSON.`);
          }
        }
      } catch {
        this.showToast('Invalid JSON file. Expected array of { title, summary } objects.');
      }
    });

    // Neural 384-D toggle
    this.el('btn-neural').addEventListener('click', () => this.toggleNeuralEngine());

    // Vector Algebra
    this.el('btn-run-algebra').addEventListener('click', () => this.runVectorAlgebra());

    // Layer toggles
    const bindLayer = (id: string, key: 'density' | 'delaunay' | 'h1Loops' | 'knn' | 'labels' | 'gaps') => {
      this.el<HTMLInputElement>(id).addEventListener('change', (e) => {
        this.canvasView.setLayers({ [key]: (e.target as HTMLInputElement).checked });
      });
    };
    bindLayer('layer-density', 'density');
    bindLayer('layer-delaunay', 'delaunay');
    bindLayer('layer-h1', 'h1Loops');
    bindLayer('layer-knn', 'knn');
    bindLayer('layer-labels', 'labels');
    bindLayer('layer-gaps', 'gaps');

    // Mobile Pan Map mode, Zoom buttons, Probe mode & Reset View
    const panBtn = this.el<HTMLButtonElement>('btn-pan-mode');
    const probeBtn = this.el<HTMLButtonElement>('btn-probe-mode');

    panBtn.addEventListener('click', () => {
      const next = panBtn.getAttribute('aria-pressed') !== 'true';
      panBtn.setAttribute('aria-pressed', String(next));
      this.canvasView.setTouchPanMode(next);
      if (next && probeBtn.getAttribute('aria-pressed') === 'true') {
        probeBtn.setAttribute('aria-pressed', 'false');
        this.canvasView.setProbeMode(false);
      }
      this.showToast(
        next
          ? 'Map pan & pinch-zoom locked on — tap again to resume page scrolling.'
          : 'Page scrolling restored.'
      );
    });

    this.el('btn-zoom-in').addEventListener('click', () => this.canvasView.zoomBy(1.25));
    this.el('btn-zoom-out').addEventListener('click', () => this.canvasView.zoomBy(0.8));

    probeBtn.addEventListener('click', () => {
      const next = probeBtn.getAttribute('aria-pressed') !== 'true';
      probeBtn.setAttribute('aria-pressed', String(next));
      this.canvasView.setProbeMode(next);
      if (next && panBtn.getAttribute('aria-pressed') === 'true') {
        panBtn.setAttribute('aria-pressed', 'false');
        this.canvasView.setTouchPanMode(false);
      }
      this.showToast(
        next
          ? 'Void Probe active — tap anywhere on the map to decode that coordinate.'
          : 'Void Probe off (Shift+Click still works on desktop).'
      );
    });

    this.el('btn-reset-view').addEventListener('click', () => this.canvasView.resetView());

    // Projection switch
    document.querySelectorAll<HTMLButtonElement>('[data-proj]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const proj = btn.dataset.proj as 'manifold' | 'pca';
        if (this.config.projection === proj) return;
        this.config.projection = proj;
        document.querySelectorAll('[data-proj]').forEach((b) => b.classList.toggle('active', b === btn));
        this.recomputeAnalysis();
      });
    });

    // Sliders (debounced gently for snappy interaction)
    let sliderTimer: number | null = null;
    const bindSlider = (inputId: string, outId: string, setter: (v: number) => void, digits = 2) => {
      const inp = this.el<HTMLInputElement>(inputId);
      const out = this.el<HTMLOutputElement>(outId);
      inp.addEventListener('input', () => {
        const v = Number(inp.value);
        out.textContent = digits === 0 ? String(v) : v.toFixed(digits);
        setter(v);
        if (sliderTimer) window.clearTimeout(sliderTimer);
        sliderTimer = window.setTimeout(() => this.recomputeAnalysis(), 90);
      });
    };

    bindSlider('param-k', 'val-k', (v) => (this.config.numClusters = v), 0);
    bindSlider('param-kappa', 'val-kappa', (v) => (this.config.vmfKappa = v), 1);
    bindSlider('w-sparsity', 'val-w-sparsity', (v) => (this.config.weights.sparsity = v));
    bindSlider('w-bridge', 'val-w-bridge', (v) => (this.config.weights.bridgeEntropy = v));
    bindSlider('w-coherence', 'val-w-coherence', (v) => (this.config.weights.coherence = v));
    bindSlider('w-topo', 'val-w-topo', (v) => (this.config.weights.topology = v));

    // Copy Rigorous Brief
    this.el('btn-copy-brief').addEventListener('click', () => this.copyActiveBrief());
  }

  private openHarvestDialog(initialQuery: string): void {
    const dlg = this.el<HTMLDialogElement>('harvest-dialog');
    const qInput = this.el<HTMLInputElement>('harvest-query');
    const statusBox = this.el('harvest-status');
    qInput.value = initialQuery;
    statusBox.hidden = true;
    statusBox.textContent = '';
    dlg.showModal();
    qInput.focus();
  }

  private loadPreset(presetId: string): void {
    const preset = PRESET_DATASETS.find((p) => p.id === presetId) ?? PRESET_DATASETS[0];
    this.populatePresets();
    this.el<HTMLSelectElement>('preset-select').value = preset.id;
    this.el<HTMLInputElement>('quick-topic-input').value = '';
    // Populate illustrative Vector Algebra defaults for PLC preset
    if (preset.id === 'industrial-plc-2026') {
      this.el<HTMLInputElement>('alg-a').value = 'deterministic real-time PLC safety control';
      this.el<HTMLInputElement>('alg-b').value = 'zero-knowledge cryptographic proof formal verification';
      this.el<HTMLInputElement>('alg-c').value = 'cloud latency proprietary hardware lock-in';
    } else {
      this.el<HTMLInputElement>('alg-a').value = '';
      this.el<HTMLInputElement>('alg-b').value = '';
      this.el<HTMLInputElement>('alg-c').value = '';
    }
    this.setCorpus(preset.items.map((x) => ({ ...x })));
  }

  private async setCorpus(items: CorpusItem[]): Promise<void> {
    this.items = items;
    this.el('corpus-count').textContent = String(items.length);
    this.customGap = null;
    this.neuralCorpusVectors = null;
    this.neuralLexiconVectors = null;

    // Build domain-native lexicon directly from the corpus + gated cross-domain primitives
    const nativeLex = buildDomainNativeLexicon(items, 65);
    this.activeLexicon = [...nativeLex, ...CAPABILITY_LEXICON];

    // Fit instant local scientific LSA-SVD model (also gives unstemmed cluster keyword extractor!)
    const corpusTexts = items.map((it) => `${it.title}. ${it.summary} ${(it.tags ?? []).join(' ')}`);
    const lexiconTexts = this.activeLexicon.map((l) => `${l.term}. ${l.domain}. ${l.description}`);
    this.lsaModel = fitLsaSpace(corpusTexts, lexiconTexts, Math.min(36, Math.max(10, items.length - 2)));

    if (this.engine === 'neural-minilm' && this.neuralReady) {
      await this.embedCorpusWithNeural();
    } else {
      this.recomputeAnalysis();
    }
  }

  private async toggleNeuralEngine(): Promise<void> {
    if (this.engine === 'neural-minilm') {
      this.engine = 'lsa-svd';
      this.updateEngineButtons();
      this.recomputeAnalysis();
      this.showToast('Switched to instant local Truncated-SVD (LSA) engine.');
      return;
    }

    try {
      this.showNeuralProgress('Initializing MiniLM-L6-v2 (384-D) in Web Worker…', 12);
      this.ensureWorker();
      if (!this.neuralReady) {
        const res = await this.callWorker({ type: 'init' });
        this.neuralReady = true;
        this.neuralDevice = res.device ?? 'wasm';
      }
      this.engine = 'neural-minilm';
      await this.embedCorpusWithNeural();
      this.updateEngineButtons();
      this.hideNeuralProgress();
      this.showToast(`Neural 384-D embeddings active (${this.neuralDevice.toUpperCase()}).`);
    } catch (err) {
      this.hideNeuralProgress();
      this.engine = 'lsa-svd';
      this.updateEngineButtons();
      this.showToast(
        `Neural model unavailable offline (${err instanceof Error ? err.message : 'network'}). Using LSA-SVD.`
      );
    }
  }

  private ensureWorker(): void {
    if (this.neuralWorker) return;
    this.neuralWorker = new Worker(new URL('../workers/embedWorker.ts', import.meta.url), {
      type: 'module',
    });
    this.neuralWorker.onmessage = (e: MessageEvent<NeuralWorkerMessage>) => {
      const msg = e.data;
      if (msg.type === 'progress') {
        const pct = msg.progress ?? 25;
        const label = msg.file ? `Downloading ${msg.file} (${pct}%)` : `Loading model (${pct}%)`;
        this.showNeuralProgress(label, Math.max(8, pct));
        return;
      }
      if (msg.type === 'embed-progress' && msg.total) {
        const pct = Math.round(((msg.done ?? 0) / msg.total) * 100);
        this.showNeuralProgress(`Embedding vectors (${msg.done}/${msg.total})…`, pct);
        return;
      }
      if (msg.id !== undefined) {
        const pending = this.workerPending.get(msg.id);
        if (pending) {
          this.workerPending.delete(msg.id);
          if (msg.type === 'error') pending.reject(new Error(msg.message ?? 'Worker error'));
          else pending.resolve(msg);
        }
      }
    };
  }

  private callWorker(payload: { type: 'init' | 'embed'; texts?: string[] }): Promise<NeuralWorkerMessage> {
    this.ensureWorker();
    const id = ++this.workerReqId;
    return new Promise((resolve, reject) => {
      this.workerPending.set(id, { resolve, reject });
      this.neuralWorker!.postMessage({ id, ...payload });
    });
  }

  private async embedCorpusWithNeural(): Promise<void> {
    this.showNeuralProgress('Embedding corpus with MiniLM-L6-v2 (384-D)…', 18);
    const corpusTexts = this.items.map((it) => `${it.title}. ${it.summary}`);
    const corpusRes = await this.callWorker({ type: 'embed', texts: corpusTexts });
    this.neuralCorpusVectors = (corpusRes.vectors ?? []).map((v) =>
      normalizeInPlace(new Float64Array(v))
    );

    if (!this.neuralLexiconVectors) {
      this.showNeuralProgress('Embedding domain + cross-domain lexicon (384-D)…', 55);
      const lexTexts = this.activeLexicon.map((l) => `${l.term}: ${l.description}`);
      const lexRes = await this.callWorker({ type: 'embed', texts: lexTexts });
      this.neuralLexiconVectors = (lexRes.vectors ?? []).map((v) =>
        normalizeInPlace(new Float64Array(v))
      );
    }
    this.hideNeuralProgress();
    this.recomputeAnalysis();
  }

  private updateEngineButtons(): void {
    const btn = this.el('btn-neural');
    const lbl = this.el('neural-label');
    const badge = this.el('engine-badge');
    if (this.engine === 'neural-minilm') {
      btn.classList.add('is-ready');
      lbl.textContent = `Neural 384-D (${this.neuralDevice.toUpperCase()})`;
      badge.textContent = `MINILM-384D`;
      badge.className = 'pill pill-emerald';
    } else {
      btn.classList.remove('is-ready');
      lbl.textContent = this.neuralReady ? 'Switch to Neural 384-D' : 'Enable Neural 384-D';
      badge.textContent = `LSA-SVD ${this.lsaModel?.dimensions ?? 32}D`;
      badge.className = 'pill pill-cyan';
    }
  }

  private recomputeAnalysis(): void {
    if (!this.lsaModel || this.items.length < 4) return;
    const useNeural =
      this.engine === 'neural-minilm' &&
      this.neuralCorpusVectors !== null &&
      this.neuralLexiconVectors !== null;

    const vectors = useNeural ? this.neuralCorpusVectors! : this.lsaModel.corpusVectors;
    const lexiconVectors = useNeural ? this.neuralLexiconVectors! : this.lsaModel.lexiconVectors;

    this.engineOutput = runVectorGapAnalysis({
      engine: useNeural ? 'neural-minilm' : 'lsa-svd',
      items: this.items,
      vectors,
      lexicon: this.activeLexicon,
      lexiconVectors,
      extractKeywords: this.lsaModel.extractTopKeywords,
      config: this.config,
    });

    this.updateEngineButtons();
    this.customGap = null;
    this.selectedItemIndex = null;
    this.selectedGap = this.engineOutput.result.gaps[0] ?? null;

    this.canvasView.setResult(this.engineOutput.result, null);
    if (this.selectedGap) {
      this.canvasView.setSelection({ kind: 'gap', id: this.selectedGap.id });
    }

    this.renderStageMetrics();
    this.renderGapList();
    this.renderInspector();
    this.renderDiagnostics();
  }

  private selectGap(gap: GapCandidate): void {
    this.selectedGap = gap;
    this.selectedItemIndex = null;
    const isCustom = this.customGap?.id === gap.id;
    this.canvasView.setSelection(
      isCustom ? { kind: 'custom', id: gap.id } : { kind: 'gap', id: gap.id }
    );
    this.renderGapList();
    this.renderInspector();
  }

  private selectItem(index: number): void {
    this.selectedItemIndex = index;
    this.selectedGap = null;
    this.canvasView.setSelection({ kind: 'item', index });
    this.renderGapList();
    this.renderInspector();
  }

  /** Shift+Click or Probe Mode: Lift 2D point -> S^(d-1) -> full White-Space Scorecard + Concept Decoder! */
  private probeVoidAt(worldX: number, worldY: number): void {
    if (!this.engineOutput) return;
    const lifted = this.engineOutput.lift2DToSphere(worldX, worldY);
    const probed = evaluateGapCandidate(
      'custom-probe',
      'custom-probe',
      lifted,
      this.engineOutput.evalContext,
      [worldX, worldY]
    );
    this.customGap = probed;
    this.canvasView.setCustomGap(probed);
    this.selectGap(probed);
    this.showToast(`Probed void at (${worldX.toFixed(2)}, ${worldY.toFixed(2)}) — Opportunity ${(probed.opportunityScore * 100).toFixed(0)}%.`);
  }

  /** Explicit Concept Arithmetic: v = normalize(embed(A) + embed(B) - 0.65 * embed(C)) */
  private async runVectorAlgebra(): Promise<void> {
    if (!this.engineOutput || !this.lsaModel) return;
    const textA = this.el<HTMLInputElement>('alg-a').value.trim();
    const textB = this.el<HTMLInputElement>('alg-b').value.trim();
    const textC = this.el<HTMLInputElement>('alg-c').value.trim();

    if (!textA && !textB) {
      this.showToast('Enter at least Concept A or B for vector arithmetic.');
      return;
    }

    let vA: Float64Array | null = null;
    let vB: Float64Array | null = null;
    let vC: Float64Array | null = null;

    if (this.engine === 'neural-minilm' && this.neuralReady) {
      const queries = [textA, textB, textC].filter(Boolean);
      const res = await this.callWorker({ type: 'embed', texts: queries });
      let ptr = 0;
      if (textA) vA = normalizeInPlace(new Float64Array(res.vectors![ptr++]));
      if (textB) vB = normalizeInPlace(new Float64Array(res.vectors![ptr++]));
      if (textC) vC = normalizeInPlace(new Float64Array(res.vectors![ptr++]));
    } else {
      if (textA) vA = this.lsaModel.embedText(textA);
      if (textB) vB = this.lsaModel.embedText(textB);
      if (textC) vC = this.lsaModel.embedText(textC);
    }

    const dim = this.engineOutput.result.dimensions;
    const sum = new Float64Array(dim);
    for (let d = 0; d < dim; d++) {
      if (vA) sum[d] += vA[d];
      if (vB) sum[d] += vB[d];
      if (vC) sum[d] -= 0.65 * vC[d];
    }
    normalizeInPlace(sum);

    const evaluated = evaluateGapCandidate(
      'vector-algebra',
      'vector-algebra',
      sum,
      this.engineOutput.evalContext
    );
    evaluated.synthesizedTitle = `∑ (${textA || '∅'}${textB ? ` + ${textB}` : ''}${textC ? ` − ${textC}` : ''})`.slice(0, 72);
    this.customGap = evaluated;
    this.canvasView.setCustomGap(evaluated);
    this.selectGap(evaluated);
    this.showToast(`Vector algebra projected — White-Space Index ${(evaluated.opportunityScore * 100).toFixed(0)}%.`);
  }

  private async runLiveResearch(
    query: string,
    sources: WebSourceId[],
    mode: 'replace' | 'merge',
    dialog?: HTMLDialogElement
  ): Promise<void> {
    const quickBtn = this.el<HTMLButtonElement>('btn-quick-research');
    const modalBtn = this.el<HTMLButtonElement>('btn-execute-harvest');
    const statusBox = this.el('harvest-status');

    quickBtn.disabled = true;
    modalBtn.disabled = true;
    this.showNeuralProgress(`Harvesting "${query}" across ${sources.length} open sources…`, 20);
    if (dialog?.open) {
      statusBox.hidden = false;
      statusBox.textContent = `Querying ${sources.join(', ')} for "${query}"…\n`;
    }

    let completed = 0;
    const maxNodes = Number(this.el<HTMLSelectElement>('harvest-density').value) || 160;
    const perSourceLimit = Math.max(12, Math.min(22, Math.ceil((maxNodes / Math.max(1, sources.length)) * 1.4)));
    try {
      const { items: harvested, resolvedQuery, wasCorrected, sourceCounts } = await harvestWebCorpus(
        query,
        sources,
        perSourceLimit,
        (p) => {
          if (p.status === 'done' || p.status === 'error') {
            completed++;
            const pct = 20 + Math.round((completed / sources.length) * 70);
            this.showNeuralProgress(
              p.status === 'done'
                ? `Fetched ${p.fetched} from ${p.source} (${completed}/${sources.length})…`
                : `${p.source} skipped (${p.message}), continuing…`,
              pct
            );
          }
          if (dialog?.open) {
            if (p.status === 'done') {
              statusBox.textContent += `✓ ${p.source}: fetched ${p.fetched} items\n`;
            } else if (p.status === 'error') {
              statusBox.textContent += `✗ ${p.source}: ${p.message}\n`;
            }
          }
        }
      );

      if (harvested.length < 5 && mode === 'replace') {
        this.hideNeuralProgress();
        const msg = `Only ${harvested.length} relevant items found for "${resolvedQuery}" — try broader keywords or enable All 18 Sources.`;
        if (dialog?.open) statusBox.textContent += `\n${msg}`;
        this.showToast(msg);
        return;
      }

      const finalItems =
        mode === 'merge' ? [...this.items, ...harvested].slice(0, maxNodes + 40) : harvested.slice(0, maxNodes);
      dialog?.close();
      this.el<HTMLInputElement>('quick-topic-input').value = resolvedQuery;
      this.populatePresets(resolvedQuery);
      await this.setCorpus(finalItems);
      this.hideNeuralProgress();
      const activeSourceCount = Object.keys(sourceCounts).length;
      const correctionNote = wasCorrected ? ` (auto-corrected from "${query}")` : '';
      this.showToast(
        `Mapped ${finalItems.length} concepts from ${activeSourceCount} sources for "${resolvedQuery}"${correctionNote} — ${this.engineOutput?.result.gaps.length ?? 0} gaps found!`
      );
    } catch (err) {
      this.hideNeuralProgress();
      this.showToast(`Research harvest failed: ${err instanceof Error ? err.message : 'network error'}`);
    } finally {
      quickBtn.disabled = false;
      modalBtn.disabled = false;
    }
  }

  private async executeWebHarvest(dialog: HTMLDialogElement): Promise<void> {
    const query = this.el<HTMLInputElement>('harvest-query').value.trim();
    if (!query) {
      this.showToast('Please enter a research topic.');
      return;
    }
    const sources = Array.from(
      document.querySelectorAll<HTMLInputElement>('input[name="harvest-source"]:checked')
    ).map((i) => i.value as WebSourceId);

    if (sources.length === 0) {
      this.showToast('Select at least one open web source.');
      return;
    }

    const mode =
      (document.querySelector<HTMLInputElement>('input[name="harvest-mode"]:checked')?.value as
        | 'replace'
        | 'merge') ?? 'replace';
    await this.runLiveResearch(query, sources, mode, dialog);
  }

  private renderStageMetrics(): void {
    const res = this.engineOutput?.result;
    if (!res) return;
    const h1Count = res.persistence.filter((p) => p.dimension === 1).length;
    const varStr =
      res.projectionQuality.varianceExplained !== undefined
        ? `<span class="metric-tag">PC1+PC2 <strong>${res.projectionQuality.varianceExplained.toFixed(1)}%</strong></span>`
        : '';

    this.el('stage-metrics').innerHTML = `
      <span class="metric-tag">N <strong>${res.items.length}</strong> · d <strong>${res.dimensions}</strong></span>
      <span class="metric-tag">Trust T(k) <strong>${(res.projectionQuality.trustworthiness * 100).toFixed(1)}%</strong></span>
      <span class="metric-tag">Stress-1 <strong>${res.projectionQuality.kruskalStress.toFixed(2)}</strong></span>
      ${varStr}
      <span class="metric-tag">H₁ Cavities <strong>${h1Count}</strong></span>
      <span class="metric-tag">Compute <strong>${res.computeMs}ms</strong></span>
    `;
  }

  private renderGapList(): void {
    const res = this.engineOutput?.result;
    const listEl = this.el('gap-list');
    if (!res) {
      listEl.innerHTML = '';
      return;
    }

    const cards: string[] = [];
    if (this.customGap) {
      cards.push(this.buildGapCardHtml(this.customGap, 'CUSTOM', true));
    }
    res.gaps.forEach((g, idx) => {
      cards.push(this.buildGapCardHtml(g, `#${idx + 1}`, false));
    });

    listEl.innerHTML = cards.join('');
    listEl.querySelectorAll<HTMLButtonElement>('.gap-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        const gid = btn.dataset.gapId;
        if (this.customGap && gid === this.customGap.id) {
          this.selectGap(this.customGap);
          return;
        }
        const found = res.gaps.find((g) => g.id === gid);
        if (found) this.selectGap(found);
      });
    });
  }

  private buildGapCardHtml(gap: GapCandidate, rankLabel: string, isCustom: boolean): string {
    const isActive = this.selectedGap?.id === gap.id;
    const methodNames: Record<GapCandidate['sourceMethod'], string> = {
      'h1-cavity': 'H₁ Cavity',
      'geodesic-bridge': 'SLERP Bridge',
      'voronoi-void': 'Voronoi Void',
      'riemannian-min': 'vMF Valley',
      'custom-probe': 'Void Probe',
      'vector-algebra': 'Vector Algebra',
    };

    const clustersHtml = gap.bridgedClusters
      .slice(0, 2)
      .map(
        (bc) =>
          `<span class="cluster-chip" style="border-color:${bc.color}55;color:${bc.color}">${escapeHtml(bc.label)}</span>`
      )
      .join('');

    return `
      <button type="button" class="gap-card ${isActive ? 'active' : ''}" data-gap-id="${gap.id}" role="listitem">
        <div class="gap-card-top">
          <span class="gap-rank" style="${isCustom ? 'color:#10b981' : ''}">${rankLabel}</span>
          <span class="gap-method">${methodNames[gap.sourceMethod]}</span>
          <span class="gap-score-num">${(gap.opportunityScore * 100).toFixed(0)}%</span>
        </div>
        <div class="gap-card-title">${escapeHtml(gap.synthesizedTitle)}</div>
        <div class="gap-clusters-row">${clustersHtml}</div>
        <div class="gap-mini-bars">
          <span>Void ${gap.metrics.nearestDistance.toFixed(2)}</span>
          <span>Bridge ${(gap.metrics.bridgeEntropy * 100).toFixed(0)}%</span>
          <span>TDA ${(gap.metrics.topoPersistence * 100).toFixed(0)}%</span>
        </div>
      </button>
    `;
  }

  private renderInspector(): void {
    const res = this.engineOutput?.result;
    const container = this.el('inspector-content');
    const heading = this.el('inspector-heading');
    if (!res) return;

    if (this.selectedItemIndex !== null) {
      const idx = this.selectedItemIndex;
      const item = res.items[idx];
      const cluster = res.clusters.find((c) => c.memberIndices.includes(idx));
      heading.textContent = 'Existing Offering';

      // Nearest neighbors in corpus
      const nbrs = res.vectors
        .map((v, j) => ({ j, sim: j === idx ? -1 : cosineSim(res.vectors[idx], v) }))
        .filter((x) => x.j !== idx)
        .sort((a, b) => b.sim - a.sim)
        .slice(0, 4);

      container.innerHTML = `
        <div class="insp-hero item-mode">
          <div style="display:flex;gap:0.4rem;flex-wrap:wrap;">
            <span class="pill pill-cyan">${escapeHtml(cluster?.label ?? 'Cluster')}</span>
            ${item.source ? `<span class="pill">${escapeHtml(item.source)}</span>` : ''}
            ${item.year ? `<span class="pill">${item.year}</span>` : ''}
          </div>
          <h3 class="insp-title">${escapeHtml(item.title)}</h3>
          <p class="insp-hypothesis">${escapeHtml(item.summary)}</p>
          ${item.url ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" style="color:var(--cyan);font-size:0.75rem;">Open Source Reference ↗</a>` : ''}
        </div>

        <div class="insp-section">
          <h3>Closest Competing Vectors (Full R<sup>${res.dimensions}</sup>)</h3>
          <div class="anchor-list">
            ${nbrs
              .map(
                (n) => `
              <button type="button" class="anchor-row" data-jump-item="${n.j}">
                <span>${escapeHtml(res.items[n.j].title)}</span>
                <span class="anchor-sim">cos ${n.sim.toFixed(2)}</span>
              </button>`
              )
              .join('')}
          </div>
        </div>
      `;

      container.querySelectorAll<HTMLButtonElement>('[data-jump-item]').forEach((b) => {
        b.addEventListener('click', () => this.selectItem(Number(b.dataset.jumpItem)));
      });
      return;
    }

    const gap = this.selectedGap;
    if (!gap) {
      container.innerHTML = `<p class="hint">Select a gap beacon or Shift+Click an empty region on the manifold.</p>`;
      return;
    }

    const isCustom = this.customGap?.id === gap.id;
    heading.textContent = isCustom ? 'Probed / Algebra Vector' : 'Untapped Void Scorecard';

    container.innerHTML = `
      <div class="insp-hero ${isCustom ? 'custom-mode' : ''}">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:0.4rem;">
          <span class="pill ${isCustom ? 'pill-emerald' : 'pill-amber'}">${gap.sourceMethod.toUpperCase()}</span>
          <span class="pill pill-violet">White-Space Index: ${(gap.opportunityScore * 100).toFixed(1)}%</span>
        </div>
        <h3 class="insp-title">${escapeHtml(gap.synthesizedTitle)}</h3>
        <p class="insp-hypothesis">${escapeHtml(gap.synthesizedHypothesis)}</p>
      </div>

      <div class="score-grid">
        ${scoreBox('Void Sparsity', `${(gap.metrics.sparsity * 100).toFixed(0)}%`, gap.metrics.sparsity, '#f59e0b', `d_min = ${gap.metrics.nearestDistance.toFixed(2)}`)}
        ${scoreBox('Bridge Entropy', `${(gap.metrics.bridgeEntropy * 100).toFixed(0)}%`, gap.metrics.bridgeEntropy, '#38bdf8', `${gap.bridgedClusters.length} clusters`)}
        ${scoreBox('Domain Hull Support', `${(gap.metrics.coherence * 100).toFixed(0)}%`, gap.metrics.coherence, '#10b981', `vMF ρ = ${gap.metrics.vmfDensity.toFixed(3)}`)}
        ${scoreBox('H₁ Cavity Alignment', `${(gap.metrics.topoPersistence * 100).toFixed(0)}%`, gap.metrics.topoPersistence, '#a78bfa', gap.cycleVertices ? `${gap.cycleVertices.length}-node loop` : 'continuous')}
      </div>

      <div class="insp-section">
        <h3>Orthogonal Concept Inversion (Missing Capabilities)</h3>
        <div class="decoded-list">
          ${gap.decodedConcepts
            .map(
              (dc) => `
            <div class="decoded-row">
              <div class="decoded-head">
                <span class="decoded-term">${escapeHtml(dc.term)}</span>
                <span class="decoded-metrics">cos ${dc.similarity.toFixed(2)} · nov ${(dc.novelty * 100).toFixed(0)}%</span>
              </div>
              <div class="decoded-desc">${escapeHtml(dc.description)}</div>
            </div>`
            )
            .join('')}
        </div>
      </div>

      <div class="insp-section">
        <h3>Surrounding Frontier Offerings (Bounding the Void)</h3>
        <div class="anchor-list">
          ${gap.nearestExisting
            .map(
              (nb) => `
            <button type="button" class="anchor-row" data-jump-item="${nb.index}">
              <span>${escapeHtml(nb.title)}</span>
              <span class="anchor-sim">cos ${nb.similarity.toFixed(2)}</span>
            </button>`
            )
            .join('')}
        </div>
      </div>
    `;

    container.querySelectorAll<HTMLButtonElement>('[data-jump-item]').forEach((b) => {
      b.addEventListener('click', () => this.selectItem(Number(b.dataset.jumpItem)));
    });
  }

  private renderDiagnostics(): void {
    const res = this.engineOutput?.result;
    if (!res) return;

    renderPersistenceDiagram(this.el('persistence-chart'), res.persistence, (h1Idx) => {
      this.canvasView.setHighlightedH1(h1Idx);
    });
    renderScreePlot(this.el('scree-chart'), res.eigenSpectrum);

    const clusterList = this.el('cluster-list');
    clusterList.innerHTML = res.clusters
      .map(
        (c) => `
        <div class="cluster-row">
          <div style="display:flex;align-items:center;gap:0.45rem;min-inline-size:0;">
            <span class="cluster-dot" style="background:${c.color}"></span>
            <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(c.label)}</span>
          </div>
          <span style="font-family:var(--font-mono);font-size:0.68rem;color:var(--text-2);white-space:nowrap;">
            n=${c.memberIndices.length} · Burt ${c.burtConstraint.toFixed(2)}
          </span>
        </div>`
      )
      .join('');
  }

  private async copyActiveBrief(): Promise<void> {
    const gap = this.selectedGap;
    const res = this.engineOutput?.result;
    if (!gap || !res) {
      this.showToast('Select a gap first to copy its scientific brief.');
      return;
    }

    const brief = [
      `# VoidLens Scientific White-Space Brief`,
      `- **Candidate Niche:** ${gap.synthesizedTitle}`,
      `- **Discovery Method:** ${gap.sourceMethod} (${res.engine}, d=${res.dimensions}, N=${res.items.length})`,
      `- **White-Space Opportunity Index:** ${(gap.opportunityScore * 100).toFixed(1)}%`,
      `- **Metrics:** Void Radius (cos dist) = ${gap.metrics.nearestDistance.toFixed(3)} | Sparsity = ${(gap.metrics.sparsity * 100).toFixed(0)}% | Bridge Entropy = ${(gap.metrics.bridgeEntropy * 100).toFixed(0)}% | Domain Coherence = ${(gap.metrics.coherence * 100).toFixed(0)}% | H1 Topological Persistence = ${(gap.metrics.topoPersistence * 100).toFixed(0)}%`,
      ``,
      `## Bridged Capability Clusters`,
      ...gap.bridgedClusters.map((c) => `- ${c.label} (${(c.weight * 100).toFixed(0)}% neighborhood share)`),
      ``,
      `## Surrounding Existing Offerings (Boundary of the Void)`,
      ...gap.nearestExisting.map((n) => `- ${n.title} (cosine similarity: ${n.similarity.toFixed(3)})`),
      ``,
      `## Orthogonal Residual Decoded Capabilities (Missing Dimensions)`,
      ...gap.decodedConcepts.map(
        (d) => `- **${d.term}** [${d.domain}] (cos=${d.similarity.toFixed(2)}, novelty=${(d.novelty * 100).toFixed(0)}%): ${d.description}`
      ),
      ``,
      `## Synthesis Prompt`,
      `Design a concrete 2026–2027 product architecture, technical moat, and go-to-market wedge that occupies this exact structural hole between the surrounding offerings above by introducing ${gap.decodedConcepts.slice(0, 2).map((d) => d.term).join(' and ')}.`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(brief);
      this.showToast('Copied rigorous mathematical gap brief to clipboard!');
    } catch {
      this.showToast('Clipboard blocked — open console to copy brief.');
      console.info(brief);
    }
  }

  private showNeuralProgress(text: string, pct: number): void {
    const bar = this.el('neural-progress-bar');
    bar.hidden = false;
    this.el('neural-progress-text').textContent = text;
    this.el('neural-progress-fill').style.inlineSize = `${Math.max(5, Math.min(100, pct))}%`;
  }

  private hideNeuralProgress(): void {
    this.el('neural-progress-bar').hidden = true;
  }

  private showToast(msg: string): void {
    const toast = this.el('toast');
    toast.textContent = msg;
    toast.classList.add('visible');
    if (this.toastTimer) window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => toast.classList.remove('visible'), 3600);
  }
}

function scoreBox(label: string, val: string, ratio: number, color: string, sub: string): string {
  const pct = Math.max(2, Math.min(100, Math.round(ratio * 100)));
  return `
    <div class="score-box">
      <div class="score-label">${label}</div>
      <div style="display:flex;align-items:baseline;justify-content:space-between;gap:0.3rem;">
        <span class="score-val">${val}</span>
        <span style="font-family:var(--font-mono);font-size:0.65rem;color:var(--text-2);">${sub}</span>
      </div>
      <div class="meter"><span style="inline-size:${pct}%;background:${color};"></span></div>
    </div>
  `;
}

function parseCorpusLines(raw: string): CorpusItem[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 6)
    .map((line, i) => {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 2 && colonIdx < 80) {
        return {
          id: `custom-${i + 1}`,
          title: line.slice(0, colonIdx).trim(),
          summary: line.slice(colonIdx + 1).trim() || line.slice(0, colonIdx).trim(),
          source: 'Custom Corpus',
        };
      }
      return {
        id: `custom-${i + 1}`,
        title: line.slice(0, 56),
        summary: line,
        source: 'Custom Corpus',
      };
    });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
