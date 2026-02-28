/**
 * Shared skill extraction utility.
 * Scans free-text descriptions for known tech skills using precompiled regexes.
 */

const TECH_SKILLS = [
  'javascript', 'typescript', 'python', 'java', 'go', 'golang', 'rust', 'c++', 'c#', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'r',
  'react', 'vue', 'angular', 'svelte', 'next.js', 'nextjs', 'html', 'css', 'sass', 'less', 'tailwind', 'bootstrap',
  'node.js', 'nodejs', 'express', 'django', 'flask', 'fastapi', 'spring', 'rails', '.net', 'asp.net',
  'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'dynamodb', 'cassandra', 'oracle',
  'aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'k8s', 'terraform', 'ansible', 'jenkins', 'ci/cd', 'devops',
  'tensorflow', 'pytorch', 'keras', 'pandas', 'numpy', 'scikit-learn', 'spark', 'hadoop', 'tableau', 'power bi',
  'machine learning', 'deep learning', 'nlp', 'natural language processing', 'computer vision', 'llm', 'gpt',
  'openai', 'langchain', 'llamaindex', 'chatgpt',
  'git', 'github', 'gitlab', 'jira', 'agile', 'scrum', 'rest api', 'graphql', 'microservices', 'linux', 'unix',
  'rest', 'grpc', 'websocket', 'oauth', 'jwt', 'json', 'xml', 'yaml',
];

// Canonical display name for each skill (lowercase key → display value)
const CASING: Record<string, string> = {
  'aws': 'AWS', 'gcp': 'GCP', 'k8s': 'Kubernetes', 'ai': 'AI', 'ml': 'ML', 'nlp': 'NLP',
  'llm': 'LLM', 'gpt': 'GPT', 'jwt': 'JWT', 'json': 'JSON', 'xml': 'XML', 'yaml': 'YAML',
  'html': 'HTML', 'css': 'CSS', 'sql': 'SQL', 'grpc': 'gRPC', 'oauth': 'OAuth',
  'c++': 'C++', 'c#': 'C#', '.net': '.NET', 'asp.net': 'ASP.NET',
  'rest api': 'REST API', 'rest': 'REST', 'ci/cd': 'CI/CD', 'devops': 'DevOps',
  'nextjs': 'Next.js', 'next.js': 'Next.js', 'node.js': 'Node.js', 'nodejs': 'Node.js',
  'scikit-learn': 'scikit-learn', 'tensorflow': 'TensorFlow', 'pytorch': 'PyTorch',
  'llamaindex': 'LlamaIndex', 'langchain': 'LangChain', 'openai': 'OpenAI', 'chatgpt': 'ChatGPT',
  'github': 'GitHub', 'gitlab': 'GitLab', 'graphql': 'GraphQL', 'postgresql': 'PostgreSQL',
  'mongodb': 'MongoDB', 'elasticsearch': 'Elasticsearch', 'dynamodb': 'DynamoDB',
  'websocket': 'WebSocket', 'google cloud': 'Google Cloud', 'power bi': 'Power BI',
  'machine learning': 'Machine Learning', 'deep learning': 'Deep Learning',
  'natural language processing': 'Natural Language Processing', 'computer vision': 'Computer Vision',
  'microservices': 'Microservices',
};

function canonicalize(skill: string): string {
  return CASING[skill.toLowerCase()] ??
    skill.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// Precompile all patterns once at module load
const SKILL_PATTERNS: Map<string, RegExp> = new Map(
  TECH_SKILLS.map(skill => [
    skill,
    new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'),
  ])
);

export function extractSkillsFromText(text: string | undefined): string[] {
  if (!text) {return [];}
  const found = new Set<string>();
  for (const [skill, pattern] of SKILL_PATTERNS) {
    if (pattern.test(text)) {
      found.add(canonicalize(skill));
    }
  }
  return Array.from(found);
}
