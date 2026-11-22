export type EmbeddingEngineKind = 'lsa-svd' | 'neural-minilm';
export type ProjectionMethod = 'manifold' | 'pca';

export interface CorpusItem {
  id: string;
  title: string;
  summary: string;
  category?: string;
  source?: string;
  url?: string;
  year?: number;
  tags?: string[];
}

export interface LexiconConcept {
  term: string;
  domain: string;
  description: string;
}

export interface GapWeights {
  sparsity: number;      // Empty-ball distance & low vMF density
  bridgeEntropy: number; // Cross-cluster Shannon entropy (structural hole)
  coherence: number;     // Inside domain manifold (convex hull / support)
  topology: number;      // Alignment with Vietoris-Rips H1 persistent cavities
}

export interface AnalysisConfig {
  projection: ProjectionMethod;
  numClusters: number;
  vmfKappa: number;      // Concentration parameter kappa for spherical KDE
  topKGaps: number;
  weights: GapWeights;
}

export interface ClusterInfo {
  id: number;
  label: string;
  color: string;
  centroid: Float64Array;
  memberIndices: number[];
  keywords: string[];
  cohesion: number; // mean cosine similarity to centroid
  burtConstraint: number; // structural hole metric (lower = bridges more)
}

export interface PersistencePair {
  dimension: 0 | 1;
  birth: number;
  death: number;
  persistence: number;
  cycleVertices: number[]; // indices of corpus points forming the H1 loop
  barycenter?: Float64Array;
}

export interface DecodedConceptMatch {
  term: string;
  domain: string;
  description: string;
  similarity: number;       // cosine(gap, term)
  novelty: number;          // 1 - max_i cosine(term, corpus_i)
  residualAlignment: number;// cosine(orthogonal_residual, term)
  combinedScore: number;
}

export interface GapCandidate {
  id: string;
  sourceMethod: 'h1-cavity' | 'geodesic-bridge' | 'voronoi-void' | 'riemannian-min' | 'custom-probe' | 'vector-algebra';
  vector: Float64Array;     // unit vector on S^(d-1)
  pos2d: [number, number];  // normalized [-1, 1] x [-1, 1]
  opportunityScore: number; // 0..1 composite White-Space Index
  metrics: {
    sparsity: number;        // 0..1
    nearestDistance: number; // cosine distance to closest existing offering
    vmfDensity: number;      // raw spherical KDE density
    normalizedDensity: number; // 0..1 relative to corpus density range
    bridgeEntropy: number;   // 0..1 normalized Shannon entropy across clusters
    coherence: number;       // 0..1 domain manifold support
    topoPersistence: number; // 0..1 H1 cavity persistence alignment
  };
  nearestExisting: Array<{
    index: number;
    id: string;
    title: string;
    similarity: number;
    clusterId: number;
  }>;
  bridgedClusters: Array<{
    clusterId: number;
    label: string;
    weight: number;
    color: string;
  }>;
  decodedConcepts: DecodedConceptMatch[];
  synthesizedTitle: string;
  synthesizedHypothesis: string;
  humanSummary?: {
    sideA: string;
    sideB: string;
    untappedThesis: string;
    whyHighSignal: string;
  };
  cycleVertices?: number[];
}

export interface DelaunayTriangle {
  a: number;
  b: number;
  c: number;
  cx: number;
  cy: number;
  radius: number;
  inAlphaShape: boolean;
}

export interface AnalysisResult {
  engine: EmbeddingEngineKind;
  dimensions: number;
  computeMs: number;
  items: CorpusItem[];
  vectors: Float64Array[]; // unit vectors on S^(d-1)
  positions2d: Array<[number, number]>; // normalized [-1, 1]
  projectionQuality: {
    method: ProjectionMethod;
    trustworthiness: number; // Venna & Kaski 2001 trustworthiness T(k) in [0,1]
    kruskalStress: number;   // Normalized Stress-1 (lower is better)
    varianceExplained?: number; // For PCA: % variance in PC1+PC2
  };
  eigenSpectrum: number[];   // Top singular/eigenvalues for scree plot
  clusters: ClusterInfo[];
  delaunay: DelaunayTriangle[];
  knnEdges: Array<[number, number, number]>; // [i, j, similarity]
  persistence: PersistencePair[];
  gaps: GapCandidate[];
  densityGrid: {
    size: number;
    values: Float32Array; // 2D projected vMF density field for contour heatmap
    min: number;
    max: number;
  };
  lexiconVectors: Float64Array[];
  lexiconCorpusMaxSim: Float32Array; // novelty baseline for each lexicon concept
  domainCentroid: Float64Array;
  meanPairwiseDist: number;
}
