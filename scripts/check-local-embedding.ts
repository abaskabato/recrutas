/**
 * Verify the swap from HF Inference API to local ONNX produces a sensible
 * 384-dim embedding via the same generateEmbedding / generateCandidateEmbedding
 * exports that batch-embedding.service.ts and candidate-embedding.service.ts use.
 */
import { generateEmbedding, generateCandidateEmbedding, cosineSimilarity, getModelInfo } from '../server/ml-matching';

async function main() {
  console.log('Model info:', getModelInfo());

  console.log('\nFirst call (cold load)');
  const t0 = Date.now();
  const a = await generateEmbedding('Senior IT Support Engineer with PowerShell, Active Directory, Linux');
  console.log(`  dim=${a.embedding.length} tokens=${a.tokens} elapsed=${Date.now() - t0}ms`);

  console.log('Second call (warm)');
  const t1 = Date.now();
  const b = await generateEmbedding('Technical Support Engineer skilled in Windows and Networking');
  console.log(`  dim=${b.embedding.length} elapsed=${Date.now() - t1}ms`);

  console.log('Third call (unrelated role)');
  const c = await generateEmbedding('Marketing Manager with brand strategy experience');
  console.log(`  dim=${c.embedding.length}`);

  console.log('\nCosine similarity checks');
  console.log(`  IT Support vs Tech Support:  ${cosineSimilarity(a.embedding, b.embedding).toFixed(3)}`);
  console.log(`  IT Support vs Marketing:     ${cosineSimilarity(a.embedding, c.embedding).toFixed(3)}`);

  console.log('\nCandidate embedding helper');
  const cand = await generateCandidateEmbedding(
    ['PowerShell', 'Active Directory', 'Linux'],
    'senior',
    ['Senior Support Engineer', 'IT Support Engineer'],
  );
  console.log(`  dim=${cand.length}`);

  const itSupport = a.embedding;
  console.log(`  candidate vs IT Support job: ${cosineSimilarity(cand, itSupport).toFixed(3)}`);
  console.log(`  candidate vs Marketing job:  ${cosineSimilarity(cand, c.embedding).toFixed(3)}`);

  if (a.embedding.length !== 384) {
    console.error('FAIL: embedding dim is not 384');
    process.exit(1);
  }
  if (cosineSimilarity(a.embedding, b.embedding) <= cosineSimilarity(a.embedding, c.embedding)) {
    console.error('FAIL: related roles should be more similar than unrelated');
    process.exit(1);
  }
  console.log('\nAll checks passed.');
}

main().catch(err => { console.error(err); process.exit(1); });
