/**
 * Smoke test: load BGE-small-en-v1.5 locally via @xenova/transformers and
 * verify it returns a 384-dim embedding (matching the existing HF inference
 * output so the pgvector column shape stays the same).
 */
import { pipeline, env } from '@xenova/transformers';

// Skip transformers' local-model-only check so it can fetch from HuggingFace
// Hub on first run. Subsequent runs hit the cache (~/.cache/huggingface/).
env.allowLocalModels = false;

async function main() {
  console.log('Loading Xenova/bge-small-en-v1.5...');
  const t0 = Date.now();
  const extractor = await pipeline('feature-extraction', 'Xenova/bge-small-en-v1.5');
  console.log(`Model loaded in ${Date.now() - t0}ms`);

  const samples = [
    'Senior IT Support Engineer with experience in PowerShell, Active Directory, Linux, and Networking',
    'Software Engineer',
    'Looking for a remote frontend developer with React',
  ];

  for (const text of samples) {
    const t1 = Date.now();
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    const arr = Array.from(output.data as Float32Array);
    console.log(`  "${text.slice(0, 40)}..." → dim=${arr.length} in ${Date.now() - t1}ms`);
    console.log(`    first 5: [${arr.slice(0, 5).map(n => n.toFixed(4)).join(', ')}]`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
