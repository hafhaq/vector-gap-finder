# VoidLens — Scientific Vector-Space Idea Gap Finder

**100% client-side, GitHub Pages ready** vector-space observatory that discovers untapped niches, structural holes, and missing capabilities inside any sea of competing ideas.

## The Science (No Hand-Waving)

VoidLens computes all core geometry and topology directly on the **high-dimensional unit hypersphere** $\mathbb{S}^{d-1}$ — never relying solely on distorted 2D projections:

1. **Dual Client-Side Embedding Engines**
   - **Instant Local Truncated SVD (LSA)**: Sublinear TF-IDF + bigrams + character 4-gram morphological features reduced via exact Jacobi eigendecomposition of the Dual Gram Matrix $G = XX^\top$ with Caron power scaling.
   - **Neural 384-D Transformer (`Xenova/all-MiniLM-L6-v2`)**: Runs locally in a dedicated Web Worker via WebGPU (with automatic WASM fallback) using `@huggingface/transformers` and caches weights in the browser.
2. **Exact Vietoris–Rips Persistent Homology ($H_0$ & $H_1$ TDA)**
   - Computes boundary matrix column reduction ($\partial_2$ over $\mathbb{Z}_2$) directly in full cosine distance space to detect **1-dimensional topological cavities ($H_1$ loops)** — rings of existing offerings enclosing an empty semantic interior.
3. **von Mises–Fisher (vMF) Spherical KDE & Riemannian Gradient Descent**
   - Models semantic probability density $\hat{f}_\kappa(\mathbf{x}) = \frac{1}{N}\sum_i \exp(\kappa(\mathbf{x}^\top \mathbf{v}_i - 1))$ on $\mathbb{S}^{d-1}$ and descends the tangent-space Riemannian gradient to locate exact local density valleys anchored within the domain hull.
4. **Structural Hole Bridge Entropy & Bowyer–Watson $\alpha$-Shapes**
   - Clusters the corpus with Spherical $k$-Means++ and scores candidate voids by **Cross-Cluster Shannon Bridge Entropy**, **Burt Structural-Hole Constraint**, and **Delaunay/Voronoi $\alpha$-shape interior voids**.
5. **Orthogonal Residual Concept Inversion (Reading the Gap Vector)**
   - Uses Modified Gram–Schmidt projection $\mathbf{g}_\perp = \mathbf{g} - \operatorname{proj}_{\operatorname{span}(\mathcal{N}(\mathbf{g}))}(\mathbf{g})$ to isolate missing semantic dimensions and rank cross-domain capability primitives by alignment, residual novelty, and low corpus saturation.
6. **Live Client-Side Web Harvesting (Zero Backend)**
   - Harvests live data directly in the browser from CORS-enabled APIs: **OpenAlex (250M+ papers)**, **Wikipedia**, **Hacker News Algolia**, and **GitHub Search** — or paste/upload any custom corpus.

## Local Development

```bash
npm install
npm test        # Runs mathematical & TDA verification suite
npm run dev     # Starts Vite dev server
npm run build   # Type-checks and builds static bundle in ./dist
```

## Publishing to GitHub Pages

This repository includes `.github/workflows/deploy.yml` and `base: './'` in `vite.config.ts`.

1. Push this folder to a GitHub repository with default branch `main`.
2. In your repository **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions**.
3. Every push to `main` automatically runs `npm test`, builds `./dist`, and publishes to `https://<your-username>.github.io/<repo-name>/`.
