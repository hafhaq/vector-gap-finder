/**
 * Dedicated Web Worker for Real Client-Side Neural Transformer Embeddings
 * Model: Xenova/all-MiniLM-L6-v2 (384-dimensional dense sentence embeddings, quantized ONNX)
 * Runs 100% locally in the browser via WebGPU (with automatic WASM fallback) and caches in IndexedDB/Cache API!
 */

import { env, pipeline } from '@huggingface/transformers';

// Ensure browser-only remote HF Hub fetch (no local /models/ probe failures on GitHub Pages)
env.allowLocalModels = false;
env.useBrowserCache = true;

type EmbedderFn = (
  texts: string | string[],
  options?: { pooling?: 'mean'; normalize?: boolean }
) => Promise<{ data: Float32Array; dims: number[] }>;

let embedder: EmbedderFn | null = null;
let activeDevice: string = 'wasm';

interface WorkerRequest {
  id: number;
  type: 'init' | 'embed';
  texts?: string[];
}

async function ensureModel(): Promise<EmbedderFn> {
  if (embedder) return embedder;

  const progressCb = (progress: { status?: string; file?: string; progress?: number }) => {
    self.postMessage({
      type: 'progress',
      status: progress.status ?? 'loading',
      file: progress.file ?? '',
      progress: typeof progress.progress === 'number' ? Math.round(progress.progress) : undefined,
    });
  };

  // Detect WebGPU availability; gracefully fall back to WASM
  const hasWebGpu = typeof navigator !== 'undefined' && 'gpu' in navigator;
  if (hasWebGpu) {
    try {
      const adapter = await (navigator as unknown as { gpu: { requestAdapter: () => Promise<unknown> } }).gpu.requestAdapter();
      if (adapter) {
        activeDevice = 'webgpu';
        embedder = (await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
          device: 'webgpu',
          dtype: 'q8',
          progress_callback: progressCb,
        })) as unknown as EmbedderFn;
        return embedder;
      }
    } catch {
      // Fallback to WASM below
    }
  }

  activeDevice = 'wasm';
  embedder = (await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
    dtype: 'q8',
    progress_callback: progressCb,
  })) as unknown as EmbedderFn;
  return embedder;
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, type, texts } = event.data;
  try {
    const model = await ensureModel();
    if (type === 'init') {
      self.postMessage({ id, type: 'ready', device: activeDevice });
      return;
    }
    if (type === 'embed' && texts && texts.length > 0) {
      const batchSize = 16;
      const allVectors: Float32Array[] = [];
      let dims = 384;

      for (let i = 0; i < texts.length; i += batchSize) {
        const chunk = texts.slice(i, i + batchSize);
        const output = await model(chunk, { pooling: 'mean', normalize: true });
        dims = output.dims[output.dims.length - 1];
        for (let row = 0; row < chunk.length; row++) {
          const slice = output.data.slice(row * dims, (row + 1) * dims);
          allVectors.push(new Float32Array(slice));
        }
        self.postMessage({
          type: 'embed-progress',
          done: Math.min(texts.length, i + chunk.length),
          total: texts.length,
        });
      }

      self.postMessage({
        id,
        type: 'embedded',
        device: activeDevice,
        dims,
        vectors: allVectors,
      });
    }
  } catch (err) {
    self.postMessage({
      id,
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
    });
  }
};
