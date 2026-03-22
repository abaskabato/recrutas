/**
 * Shared skill extraction utility.
 * Scans free-text descriptions for known skills using precompiled regexes.
 * Covers tech, healthcare, finance, sales, trades, logistics, and more.
 */

const KNOWN_SKILLS = [
  // ── Programming languages ──────────────────────────────────────────────
  'javascript', 'typescript', 'python', 'java', 'go', 'golang', 'rust', 'c++', 'c#', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'r',
  // ── Frontend ───────────────────────────────────────────────────────────
  'react', 'vue', 'angular', 'svelte', 'next.js', 'nextjs', 'html', 'css', 'sass', 'less', 'tailwind', 'bootstrap',
  // ── Backend & frameworks ───────────────────────────────────────────────
  'node.js', 'nodejs', 'express', 'django', 'flask', 'fastapi', 'spring', 'rails', '.net', 'asp.net',
  // ── Databases ──────────────────────────────────────────────────────────
  'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'dynamodb', 'cassandra', 'oracle',
  // ── Cloud & DevOps ─────────────────────────────────────────────────────
  'aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'k8s', 'terraform', 'ansible', 'jenkins', 'ci/cd', 'devops',
  // ── Data & ML ──────────────────────────────────────────────────────────
  'tensorflow', 'pytorch', 'keras', 'pandas', 'numpy', 'scikit-learn', 'spark', 'hadoop', 'tableau', 'power bi',
  'machine learning', 'deep learning', 'nlp', 'natural language processing', 'computer vision', 'llm', 'gpt',
  'openai', 'langchain', 'llamaindex', 'chatgpt', 'data analysis', 'data visualization', 'data modeling',
  // ── Dev tools & practices ──────────────────────────────────────────────
  'git', 'github', 'gitlab', 'jira', 'agile', 'scrum', 'rest api', 'graphql', 'microservices', 'linux', 'unix',
  'rest', 'grpc', 'websocket', 'oauth', 'jwt', 'json', 'xml', 'yaml',

  // ── Finance & Accounting ───────────────────────────────────────────────
  'accounting', 'bookkeeping', 'financial analysis', 'financial modeling', 'budgeting', 'forecasting',
  'accounts payable', 'accounts receivable', 'general ledger', 'gaap', 'ifrs',
  'quickbooks', 'sap', 'netsuite', 'tax preparation', 'auditing', 'payroll',
  'financial reporting', 'cost accounting', 'risk management', 'compliance',

  // ── Healthcare ─────────────────────────────────────────────────────────
  'patient care', 'electronic medical records', 'emr', 'ehr', 'epic', 'cerner',
  'hipaa', 'hipaa compliance', 'bls certified', 'cpr certified', 'acls',
  'phlebotomy', 'medical coding', 'medical billing', 'icd-10', 'clinical research',
  'nursing', 'pharmacology', 'vital signs', 'triage', 'wound care',
  'physical therapy', 'occupational therapy', 'radiology', 'sonography',

  // ── Sales & Marketing ──────────────────────────────────────────────────
  'salesforce', 'hubspot', 'crm', 'lead generation', 'cold calling', 'b2b sales', 'b2c sales',
  'account management', 'business development', 'pipeline management', 'negotiation',
  'seo', 'sem', 'google ads', 'facebook ads', 'social media marketing', 'content marketing',
  'email marketing', 'marketing automation', 'google analytics', 'a/b testing',
  'copywriting', 'brand management', 'market research', 'public relations',

  // ── Human Resources ────────────────────────────────────────────────────
  'recruiting', 'talent acquisition', 'onboarding', 'employee relations',
  'performance management', 'benefits administration', 'hris', 'workday',
  'adp', 'compensation analysis', 'labor law', 'diversity and inclusion',

  // ── Project Management & Operations ────────────────────────────────────
  'project management', 'program management', 'pmp', 'prince2', 'six sigma', 'lean',
  'supply chain management', 'logistics', 'inventory management', 'procurement',
  'warehouse management', 'vendor management', 'process improvement', 'kaizen',
  'microsoft project', 'asana', 'monday.com', 'trello', 'confluence',

  // ── Customer Service ───────────────────────────────────────────────────
  'customer service', 'customer support', 'call center', 'zendesk', 'intercom',
  'help desk', 'technical support', 'conflict resolution', 'de-escalation',
  'live chat', 'ticketing systems', 'customer retention', 'nps',

  // ── Trades & Construction ──────────────────────────────────────────────
  'osha', 'osha compliance', 'blueprint reading', 'electrical', 'plumbing', 'hvac',
  'welding', 'carpentry', 'concrete', 'heavy equipment', 'forklift',
  'safety compliance', 'building codes', 'autocad', 'construction management',

  // ── Legal ──────────────────────────────────────────────────────────────
  'contract review', 'legal research', 'litigation', 'paralegal',
  'regulatory compliance', 'corporate law', 'intellectual property', 'due diligence',

  // ── Education & Training ───────────────────────────────────────────────
  'curriculum development', 'instructional design', 'classroom management',
  'lesson planning', 'e-learning', 'lms', 'training development', 'tutoring',

  // ── Office & Admin ─────────────────────────────────────────────────────
  'microsoft office', 'excel', 'word', 'powerpoint', 'outlook', 'google workspace',
  'data entry', 'typing', 'scheduling', 'office management', 'filing',
  'pos systems', 'cash handling', 'erp',

  // ── Food Service ───────────────────────────────────────────────────────
  'food safety', 'servsafe', 'food preparation', 'menu planning', 'catering',
  'kitchen management', 'food handling',

  // ── Transportation ─────────────────────────────────────────────────────
  'cdl', 'dot compliance', 'route planning', 'fleet management', 'dispatching',
];

// Canonical display name for each skill (lowercase key → display value)
const CASING: Record<string, string> = {
  // Tech
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
  // Finance
  'gaap': 'GAAP', 'ifrs': 'IFRS', 'sap': 'SAP', 'erp': 'ERP', 'netsuite': 'NetSuite',
  // Healthcare
  'emr': 'EMR', 'ehr': 'EHR', 'epic': 'Epic', 'cerner': 'Cerner',
  'hipaa': 'HIPAA', 'hipaa compliance': 'HIPAA Compliance',
  'bls certified': 'BLS Certified', 'cpr certified': 'CPR Certified', 'acls': 'ACLS',
  'icd-10': 'ICD-10',
  // Sales & Marketing
  'salesforce': 'Salesforce', 'hubspot': 'HubSpot', 'crm': 'CRM',
  'seo': 'SEO', 'sem': 'SEM', 'b2b sales': 'B2B Sales', 'b2c sales': 'B2C Sales',
  'google ads': 'Google Ads', 'google analytics': 'Google Analytics',
  'a/b testing': 'A/B Testing', 'nps': 'NPS',
  // HR
  'hris': 'HRIS', 'adp': 'ADP',
  // PM
  'pmp': 'PMP', 'prince2': 'PRINCE2',
  // Trades
  'osha': 'OSHA', 'osha compliance': 'OSHA Compliance', 'hvac': 'HVAC',
  'autocad': 'AutoCAD', 'cdl': 'CDL', 'dot compliance': 'DOT Compliance',
  // Support
  'zendesk': 'Zendesk', 'intercom': 'Intercom',
  // Office
  'pos systems': 'POS Systems', 'lms': 'LMS',
  // Food
  'servsafe': 'ServSafe',
};

function canonicalize(skill: string): string {
  return CASING[skill.toLowerCase()] ??
    skill.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// Precompile all patterns once at module load
const SKILL_PATTERNS: Map<string, RegExp> = new Map(
  KNOWN_SKILLS.map(skill => [
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
