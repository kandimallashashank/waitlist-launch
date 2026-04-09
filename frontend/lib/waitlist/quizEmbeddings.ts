/**
 * Server-only embeddings for waitlist quiz (all-mpnet-base-v2, 768-d) via Xenova.
 * Vectors must match ``public.fragrance_embeddings`` / ``search_fragrances_full``.
 */

/** Xenova pipeline output (typed loosely to avoid coupling to package internals). */
interface EmbedderOutput {
  data: Float32Array;
}

type FeaturePipe = (text: string, opts: object) => Promise<EmbedderOutput>;

let pipePromise: Promise<FeaturePipe> | null = null;

/**
 * Lazy-load the feature-extraction pipeline (cached on the Node process).
 *
 * Returns:
 *   Xenova pipeline instance.
 */
async function getEmbedder(): Promise<FeaturePipe> {
  if (!pipePromise) {
    pipePromise = (async () => {
      const { pipeline, env } = await import("@xenova/transformers");
      env.allowLocalModels = true;
      env.useBrowserCache = false;
      const pipe = await pipeline(
        "feature-extraction",
        "Xenova/all-mpnet-base-v2",
      );
      return pipe as unknown as FeaturePipe;
    })();
  }
  return pipePromise;
}

/**
 * L2-normalized mean-pooled embedding for one text.
 *
 * Args:
 *   text: Query string (non-empty).
 *
 * Returns:
 *   768-dimensional unit vector.
 */
export async function embedTextMeanNormalized(text: string): Promise<number[]> {
  const t = text.trim() || "fragrance";
  const pipe = await getEmbedder();
  const out = await pipe(t, { pooling: "mean", normalize: true });
  const raw = out.data as Float32Array;
  return Array.from(raw);
}

/**
 * Weighted average of normalized embeddings, then L2-normalize.
 *
 * Args:
 *   texts: Parallel query strings.
 *   weights: Non-negative weights (same length as ``texts``).
 *
 * Returns:
 *   Single 768-d query vector for pgvector RPC.
 */
export async function embedWeightedQueries(
  texts: string[],
  weights: number[],
): Promise<number[]> {
  if (texts.length === 0) {
    return embedTextMeanNormalized("fresh fragrance");
  }
  const embeddings = await Promise.all(
    texts.map((tx) => embedTextMeanNormalized(tx)),
  );
  const dim = embeddings[0].length;
  const acc = new Float64Array(dim);
  let tw = 0;
  for (let i = 0; i < embeddings.length; i++) {
    const w = Math.max(0, weights[i] ?? 0);
    if (w <= 0) continue;
    tw += w;
    for (let j = 0; j < dim; j++) {
      acc[j] += embeddings[i][j] * w;
    }
  }
  if (tw <= 0) {
    return embeddings[0];
  }
  for (let j = 0; j < dim; j++) {
    acc[j] /= tw;
  }
  let norm = 0;
  for (let j = 0; j < dim; j++) {
    norm += acc[j] * acc[j];
  }
  norm = Math.sqrt(norm) || 1;
  return Array.from(acc, (x) => x / norm);
}
