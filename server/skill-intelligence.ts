/**
 * SKILL INTELLIGENCE ENGINE
 *
 * Deterministic, zero-cost resume parser. No API calls, no hallucination,
 * no rate limits. Designed to outperform LLMs on clean English resumes.
 *
 * Innovations vs naive keyword matching:
 *  1. Full 400+ alias taxonomy — "ReactJS", "js", "k8s" all resolve correctly
 *  2. N-gram tokenization — catches multi-word skills ("machine learning", "react native")
 *  3. Section-aware weighting — skills declared in a Skills section score 3x
 *  4. Tech stack cluster expansion — "MERN stack" → MongoDB, Express, React, Node.js
 *  5. Skill graph inference — knowing React implies JavaScript (parent skill)
 *  6. Negation detection — "no experience in Python" → skip Python
 *  7. Experience level detection — job titles + date math + keyword signals
 *  8. Proficiency context — "5 years of Python", "proficient in", "familiar with"
 *  9. Short-skill disambiguation — "Go", "R", "C" validated by surrounding context
 * 10. Confidence scoring — ranked output, no hallucinated skills
 */

import { SKILL_ALIASES, normalizeSkill, normalizeSkills } from './skill-normalizer';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SkillIntelligenceResult {
  technical: string[];
  soft: string[];
  tools: string[];
  experienceLevel: 'entry' | 'mid' | 'senior' | 'executive';
  totalYears: number;
  positions: Array<{ title: string; company: string; duration: string; responsibilities: string[] }>;
  education: Array<{ degree: string; institution: string; year?: string }>;
  certifications: string[];
  personalInfo: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };
  confidence: number; // 0-100: how confident we are in the overall extraction
}

interface SkillCandidate {
  canonical: string;
  weight: number;      // cumulative section weight
  count: number;       // times found
  inferred: boolean;   // true if inferred from parent skill, not explicit
}

// ── Section detection ─────────────────────────────────────────────────────────

const SECTION_PATTERNS: Record<string, RegExp> = {
  skills:          /^(technical\s*)?skills?\s*:?\s*$|^(core\s+)?competencies\s*:?\s*$|^technologies(\s+used)?\s*:?\s*$|^tools?(\s+and\s+technologies?)?\s*:?\s*$|^tech(nical)?\s*(stack|expertise)\s*:?\s*$|^what\s+i\s+(know|use)\s*:?\s*$|^TECHNICALSKILLS\s*$/i,
  experience:      /^(work\s+)?(experience|history|background|employment)\s*:?\s*$|^professional\s+(experience|background|history)\s*:?\s*$|^career\s+(history|background)\s*:?\s*$/i,
  projects:        /^(personal\s+|side\s+|open[\s-]?source\s+|key\s+)?projects?\s*:?\s*$|^portfolio\s*:?\s*$|^selected\s+work\s*:?\s*$|^(software\s*)?engineering\s*projects?\s*$/i,
  summary:         /^(professional\s+)?(summary|profile|objective|about(\s+me)?|overview|introduction|bio)\s*:?\s*$/i,
  certifications:  /^certifications?\s*:?\s*$|^licenses?\s*(and\s+certifications?)?\s*:?\s*$|^credentials\s*:?\s*$/i,
  education:       /^education(al\s+(background|history))?\s*:?\s*$|^academic\s+(background|history|qualifications?)\s*:?\s*$/i,
};

// Weight multiplier per section — how strongly we trust skill mentions here
const SECTION_WEIGHTS: Record<string, number> = {
  skills:         3.0,   // Explicitly declared: "I know this"
  certifications: 2.5,   // Proven by exam
  projects:       1.8,   // Used in practice
  experience:     1.6,   // Used professionally
  summary:        1.3,   // Highlighted as key skill
  education:      0.7,   // Studied (may be dated)
  unknown:        1.0,   // Body text
};

// ── Role/stack cluster expansion ─────────────────────────────────────────────
// When a cluster keyword is found anywhere in the resume, its constituent
// skills are inferred. Covers tech stacks AND trade/healthcare/hospitality roles.

const STACK_CLUSTERS: Record<string, string[]> = {
  // ── Tech stacks ──────────────────────────────────────────────────────────
  'mern':                   ['MongoDB', 'Express.js', 'React', 'Node.js'],
  'mern stack':             ['MongoDB', 'Express.js', 'React', 'Node.js'],
  'mean':                   ['MongoDB', 'Express.js', 'Angular', 'Node.js'],
  'mean stack':             ['MongoDB', 'Express.js', 'Angular', 'Node.js'],
  'lamp':                   ['Linux', 'MySQL', 'PHP'],
  'lamp stack':             ['Linux', 'MySQL', 'PHP'],
  'jamstack':               ['JavaScript', 'REST'],
  'jam stack':              ['JavaScript', 'REST'],
  'devops':                 ['Docker', 'Kubernetes', 'CI/CD', 'Linux'],
  'data science stack':     ['Python', 'Pandas', 'NumPy', 'Scikit-learn'],
  'ml stack':               ['Python', 'Machine Learning', 'TensorFlow'],
  'mlops':                  ['Python', 'Docker', 'Kubernetes', 'Machine Learning'],
  'pern':                   ['PostgreSQL', 'Express.js', 'React', 'Node.js'],
  'pern stack':             ['PostgreSQL', 'Express.js', 'React', 'Node.js'],
  't3 stack':               ['TypeScript', 'Next.js', 'Tailwind CSS'],
  'serverless stack':       ['AWS Lambda', 'Serverless', 'Node.js'],

  // ── Healthcare roles ─────────────────────────────────────────────────────
  'registered nurse':       ['Patient Care', 'Electronic Medical Records', 'BLS Certified', 'HIPAA Compliance'],
  'rn':                     ['Patient Care', 'Electronic Medical Records', 'BLS Certified'],
  'lpn':                    ['Patient Care', 'Electronic Medical Records', 'CPR Certified'],
  'certified nursing assistant': ['Patient Care', 'CPR Certified', 'HIPAA Compliance'],
  'medical assistant':      ['Patient Care', 'Electronic Medical Records', 'Phlebotomy', 'HIPAA Compliance'],
  'emt':                    ['CPR Certified', 'BLS Certified', 'Patient Care'],
  'paramedic':              ['CPR Certified', 'BLS Certified', 'Patient Care'],
  'phlebotomist':           ['Phlebotomy', 'Patient Care', 'HIPAA Compliance'],
  'home health aide':       ['Patient Care', 'CPR Certified', 'HIPAA Compliance'],

  // ── Trades & construction ────────────────────────────────────────────────
  'master electrician':     ['Electrical', 'OSHA Compliance', 'Blueprint Reading'],
  'journeyman electrician': ['Electrical', 'OSHA Compliance'],
  'master plumber':         ['Plumbing', 'OSHA Compliance', 'Blueprint Reading'],
  'hvac technician':        ['HVAC', 'OSHA Compliance'],
  'hvac tech':              ['HVAC', 'OSHA Compliance'],
  'general contractor':     ['Construction', 'Blueprint Reading', 'OSHA Compliance', 'Project Management'],
  'project superintendent': ['Construction', 'Blueprint Reading', 'OSHA Compliance', 'Project Management'],
  'welder':                 ['Welding', 'OSHA Compliance'],
  'pipe welder':            ['Welding', 'Plumbing', 'OSHA Compliance'],
  'carpenter':              ['Carpentry', 'Blueprint Reading', 'OSHA Compliance'],
  'forklift operator':      ['Forklift Operation', 'OSHA Compliance', 'Warehouse'],
  'warehouse associate':    ['Warehouse', 'Inventory Management', 'Forklift Operation'],
  'cdl driver':             ['CDL', 'Truck Driver'],
  'cdl class a':            ['CDL', 'Truck Driver'],
  'cdl class b':            ['CDL', 'Truck Driver'],

  // ── Food service & hospitality ────────────────────────────────────────────
  'executive chef':         ['Culinary Arts', 'Kitchen Staff', 'Food Safety', 'Inventory Management'],
  'head chef':              ['Culinary Arts', 'Kitchen Staff', 'Food Safety'],
  'sous chef':              ['Culinary Arts', 'Kitchen Staff', 'Food Safety'],
  'line cook':              ['Line Cook', 'Food Safety', 'Food Preparation'],
  'prep cook':              ['Prep Cook', 'Food Safety', 'Food Preparation'],
  'restaurant manager':     ['Customer Service', 'POS Systems', 'Inventory Management', 'Food Safety'],
  'food service manager':   ['Food Safety', 'Inventory Management', 'Customer Service'],
  'barista':                ['Barista', 'Customer Service', 'Cash Handling', 'POS Systems'],
  'hotel manager':          ['Housekeeping', 'Customer Service', 'Inventory Management'],
  'front desk agent':       ['Receptionist', 'Customer Service', 'Cash Handling'],

  // ── Retail & customer service ─────────────────────────────────────────────
  'store manager':          ['Retail Sales', 'Inventory Management', 'Customer Service', 'Cash Handling'],
  'assistant manager':      ['Retail Sales', 'Inventory Management', 'Customer Service'],
  'sales associate':        ['Sales', 'Customer Service', 'Cash Handling', 'POS Systems'],
  'cashier':                ['Cashier', 'Cash Handling', 'POS Systems', 'Customer Service'],
  'customer service representative': ['Customer Service', 'Call Center', 'Data Entry'],
  'call center agent':      ['Call Center', 'Customer Service', 'Data Entry'],
  'receptionist':           ['Receptionist', 'Customer Service', 'Data Entry'],

  // ── Security & safety ────────────────────────────────────────────────────
  'security guard':         ['Security', 'Safety Compliance'],
  'security officer':       ['Security', 'Safety Compliance', 'OSHA Compliance'],
  'loss prevention':        ['Security', 'Safety Compliance', 'Retail Sales'],

  // ── Transportation & logistics ────────────────────────────────────────────
  'delivery driver':        ['Delivery Driver', 'Customer Service'],
  'logistics coordinator':  ['Inventory Management', 'Warehouse'],
  'supply chain':           ['Inventory Management', 'Logistics'],
};

// ── Soft skills (not in SKILL_ALIASES — captured separately) ──────────────────

const SOFT_SKILL_PATTERNS: Array<[RegExp, string]> = [
  [/\b(team\s*work|team\s*player|collaborative|collaboration)\b/gi, 'Teamwork'],
  [/\b(leadership|led\s+team|team\s+lead|mentoring|mentored)\b/gi, 'Leadership'],
  [/\b(communication|communicat(ed|ion))\b/gi, 'Communication'],
  [/\b(problem[\s-]?solving|troubleshoot|debugging|root\s+cause)\b/gi, 'Problem Solving'],
  [/\b(project\s+management|managed\s+projects?|end[\s-]to[\s-]end)\b/gi, 'Project Management'],
  [/\b(agile|scrum|kanban|sprint|stand[\s-]up)\b/gi, 'Agile'],
  [/\b(critical\s+thinking|analytical|analysis)\b/gi, 'Analytical Thinking'],
  [/\b(time\s+management|deadline|prioriti(ze|sation))\b/gi, 'Time Management'],
];

// ── Skills that need extra context validation (too short / ambiguous) ──────────

const AMBIGUOUS_SKILLS = new Set(['r', 'c', 'go', 'ai', 'ml', 'dl', 'ui', 'ux']);

// Technical context signals — nearby words that confirm a technical context
const TECH_CONTEXT_SIGNALS = /\b(programm|develop|engineer|software|code|coding|stack|framework|library|language|tool|technolog|platform|system|app|api|database|backend|frontend|fullstack|devops|cloud|mobile|web|data|machine|neural|model|deploy|server|client|build|test|ci|cd)\b/i;

// ── Negation detector ─────────────────────────────────────────────────────────

const NEGATION_PATTERNS = [
  /\b(no|not|never|lack\s+of|without|excluding|except|unfamiliar\s+with|limited\s+experience\s+in|no\s+experience\s+in|currently\s+learning)\s+\w+(\s+\w+)?\s*$/i,
];

function isNegated(line: string, skillPos: number): boolean {
  const before = line.slice(Math.max(0, skillPos - 60), skillPos).toLowerCase();
  const negWords = ['not ', 'no ', 'never ', 'lack of ', 'without ', 'excluding ', 'unfamiliar with ', 'no experience in ', 'limited experience'];
  return negWords.some(w => before.endsWith(w) || before.includes(w + ' '));
}

// ── Seniority detection ───────────────────────────────────────────────────────

const LEVEL_PATTERNS = [
  { level: 'executive' as const, re: /\b(director|vp|vice\s+president|head\s+of|cto|cpo|ceo|coo|chief|founder|co[\s-]?founder|president)\b/i },
  { level: 'senior'    as const, re: /\b(senior|sr\.?|lead|principal|staff\s+(engineer|developer)|architect|tech\s+lead)\b/i },
  { level: 'mid'       as const, re: /\b(mid[\s-]level|software\s+(engineer|developer)|full[\s-]?stack\s+(engineer|developer)|backend\s+(engineer|developer)|frontend\s+(engineer|developer))\b/i },
  { level: 'entry'     as const, re: /\b(junior|jr\.?|associate|entry[\s-]?level|intern|graduate|trainee|apprentice|fresh(er|man|graduate)?)\b/i },
];

// ── Core engine ───────────────────────────────────────────────────────────────

/**
 * Normalize raw PDF/text: collapse spaced-out headers, split single-line blobs
 * into logical lines so section segmentation and position parsing work.
 */
function normalizeResumeText(rawText: string): string {
  let text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Collapse spaced-out headers: "E X P E R I E N C E" → "EXPERIENCE"
  // Matches sequences of single uppercase letters separated by spaces (3+ letters)
  text = text.replace(/\b([A-Z])\s+(?:[A-Z]\s+){2,}[A-Z]\b/g, (match) =>
    match.replace(/\s+/g, '')
  );

  // If text has very few newlines relative to its length, it's a single-line PDF blob.
  // Split on known section headers and before company/date patterns.
  const lineCount = text.split('\n').filter(l => l.trim()).length;
  if (lineCount <= 3 && text.length > 500) {
    // Insert newlines before AND after section header words so they become their own lines
    const sectionWords = 'SUMMARY|EXPERIENCE|EDUCATION|SKILLS|PROJECTS|CERTIFICATIONS|OBJECTIVE|PROFILE|EMPLOYMENT|QUALIFICATIONS|TECHNICAL';
    text = text.replace(new RegExp(`\\s+(${sectionWords})\\b\\s*`, 'g'), '\n$1\n');

    // Insert newlines before ALL-CAPS company/org names followed by comma+location
    // e.g., "WALMART, INC., Bentonville" or "AMAZON, Seattle"
    text = text.replace(/\s+(?=[A-Z][A-Z]+[,.]?\s+(?:INC|LLC|CORP|LTD|CO)?[,.]?\s*[A-Z][a-z])/g, '\n');

    // Insert newlines before date ranges (e.g., "2011-2016", "Jan 2020 - Present")
    // Supports comma+space or any whitespace before the date
    text = text.replace(/[,;]\s*(?=(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?\d{4}\s*[–—\u2010-]\s*(?:present|current|now|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?\d{0,4})/gi, '\n');

    // Insert newlines before bullet points (•, ●, ■, ▪, common PDF bullet \uf0b7)
    text = text.replace(/\s(?=[•●■▪\uf0b7])/g, '\n');

    // Split on double-space + capital letter (common PDF run-together pattern)
    // but only after initial section splitting is done
    text = text.replace(/\s{2,}(?=[A-Z][a-z])/g, '\n');
  }

  return text;
}

export function parseResumeWithIntelligence(rawText: string): SkillIntelligenceResult {
  const text = normalizeResumeText(rawText);
  const lines = text.split('\n');

  // Step 1: Segment text into sections
  const segments = segmentIntoSections(lines);

  // Step 2: Extract skill candidates with section-aware weights
  const candidates = extractSkillCandidates(segments);

  // Step 3: Expand tech stack clusters
  expandStackClusters(text.toLowerCase(), candidates);

  // Step 4: Infer parent skills from known child skills
  inferParentSkills(candidates);

  // Step 5: Classify into technical / tools / soft
  const { technical, tools } = classifySkills(candidates);
  const soft = extractSoftSkills(text);

  // Step 6: Experience detection
  const { level, totalYears, positions } = extractExperience(text, segments);

  // Step 7: Education
  const education = extractEducation(segments);

  // Step 8: Certifications
  const certifications = extractCertifications(text);

  // Step 9: Personal info
  const personalInfo = extractPersonalInfo(text);

  // Step 10: Confidence score
  const confidence = computeConfidence(technical, totalYears, personalInfo);

  return {
    technical: technical.slice(0, 25),
    tools: tools.slice(0, 15),
    soft: soft.slice(0, 8),
    experienceLevel: level,
    totalYears,
    positions,
    education,
    certifications,
    personalInfo,
    confidence,
  };
}

// ── Section segmentation ──────────────────────────────────────────────────────

interface TextSegment {
  section: string;
  lines: string[];
  weight: number;
}

function segmentIntoSections(lines: string[]): TextSegment[] {
  const segments: TextSegment[] = [];
  let current: TextSegment = { section: 'unknown', lines: [], weight: SECTION_WEIGHTS.unknown };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {continue;}

    let matched = false;
    for (const [section, pattern] of Object.entries(SECTION_PATTERNS)) {
      if (pattern.test(line)) {
        if (current.lines.length > 0) {segments.push(current);}
        current = {
          section,
          lines: [],
          weight: SECTION_WEIGHTS[section] ?? SECTION_WEIGHTS.unknown,
        };
        matched = true;
        break;
      }
    }

    // ALL-CAPS short lines are often section headers we don't recognise —
    // treat them as section boundaries with default weight
    if (!matched && /^[A-Z][A-Z\s&/]{2,30}$/.test(line) && line.length < 35) {
      if (current.lines.length > 0) {segments.push(current);}
      current = { section: 'unknown', lines: [], weight: SECTION_WEIGHTS.unknown };
    } else if (!matched) {
      current.lines.push(rawLine);
    }
  }

  if (current.lines.length > 0) {segments.push(current);}
  return segments;
}

// ── N-gram skill extraction ───────────────────────────────────────────────────

// Build a lookup map: every alias (lowercase) → canonical form
// We add both the SKILL_ALIASES keys AND multi-word stack cluster keys
const ALIAS_LOOKUP: Map<string, string> = new Map(
  Object.entries(SKILL_ALIASES).map(([alias, canonical]) => [alias.toLowerCase(), canonical])
);

function extractSkillCandidates(segments: TextSegment[]): Map<string, SkillCandidate> {
  const candidates: Map<string, SkillCandidate> = new Map();

  for (const segment of segments) {
    const segText = segment.lines.join('\n');
    const segTextLower = segText.toLowerCase();
    // Tokenise: split on whitespace and most punctuation, preserve hyphens
    // We'll do n-gram matching (1 to 4 words)
    const words = segText.split(/[\s,;|•·▪▫‣()[\]{}<>]+/).filter(w => w.length > 0);

    for (let i = 0; i < words.length; i++) {
      for (let n = 1; n <= 4 && i + n <= words.length; n++) {
        const phrase = words.slice(i, i + n).join(' ');
        const phraseLower = phrase.toLowerCase().trim();

        // Skip phrases that are clearly not skills (too short, pure numbers, etc.)
        if (phraseLower.length < 1) {continue;}
        if (/^\d+$/.test(phraseLower)) {continue;}

        const canonical = ALIAS_LOOKUP.get(phraseLower);
        if (!canonical) {continue;}

        // Ambiguous short skills need tech context validation
        if (AMBIGUOUS_SKILLS.has(phraseLower)) {
          const context = segText.slice(
            Math.max(0, segText.toLowerCase().indexOf(phraseLower) - 100),
            Math.min(segText.length, segText.toLowerCase().indexOf(phraseLower) + 100)
          );
          if (!TECH_CONTEXT_SIGNALS.test(context)) {continue;}
        }

        // Negation check — look at the line the phrase appears in
        const lineIdx = segTextLower.indexOf(phraseLower);
        if (lineIdx >= 0) {
          const lineStart = segTextLower.lastIndexOf('\n', lineIdx) + 1;
          const lineEnd = segTextLower.indexOf('\n', lineIdx);
          const surroundingLine = segTextLower.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
          if (isNegated(surroundingLine, phraseLower.length)) {continue;}
        }

        const existing = candidates.get(canonical);
        if (existing) {
          existing.weight += segment.weight;
          existing.count += 1;
        } else {
          candidates.set(canonical, {
            canonical,
            weight: segment.weight,
            count: 1,
            inferred: false,
          });
        }
      }
    }
  }

  return candidates;
}

// ── Stack cluster expansion ───────────────────────────────────────────────────

// Pre-compile word-boundary regexes for stack clusters (avoids substring false positives:
// e.g. "rn" inside "learning", "emt" inside "development")
const _clusterRegexCache = new Map<string, RegExp>();
function getClusterRegex(cluster: string): RegExp {
  let re = _clusterRegexCache.get(cluster);
  if (!re) {
    const escaped = cluster.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    re = new RegExp(`\\b${escaped}\\b`, 'i');
    _clusterRegexCache.set(cluster, re);
  }
  return re;
}

function expandStackClusters(textLower: string, candidates: Map<string, SkillCandidate>): void {
  for (const [cluster, skills] of Object.entries(STACK_CLUSTERS)) {
    if (getClusterRegex(cluster).test(textLower)) {
      for (const skill of skills) {
        const canonical = normalizeSkill(skill);
        if (!candidates.has(canonical)) {
          candidates.set(canonical, { canonical, weight: 1.5, count: 1, inferred: true });
        } else {
          candidates.get(canonical)!.weight += 0.5;
        }
      }
    }
  }
}

// ── Skill graph inference ─────────────────────────────────────────────────────

// Child skill → parent skills inferred when child is found
const CHILD_TO_PARENTS: Record<string, string[]> = {
  'React':          ['JavaScript'],
  'Next.js':        ['React', 'JavaScript'],
  'Vue.js':         ['JavaScript'],
  'Angular':        ['TypeScript', 'JavaScript'],
  'Svelte':         ['JavaScript'],
  'Node.js':        ['JavaScript'],
  'Express.js':     ['Node.js', 'JavaScript'],
  'NestJS':         ['Node.js', 'TypeScript'],
  'TypeScript':     ['JavaScript'],
  'React Native':   ['React', 'JavaScript'],
  'Django':         ['Python'],
  'Flask':          ['Python'],
  'FastAPI':        ['Python'],
  'PyTorch':        ['Python', 'Machine Learning'],
  'TensorFlow':     ['Python', 'Machine Learning'],
  'Scikit-learn':   ['Python', 'Machine Learning'],
  'Pandas':         ['Python'],
  'NumPy':          ['Python'],
  'Spring Boot':    ['Java', 'Spring'],
  'Spring':         ['Java'],
  'Ruby on Rails':  ['Ruby'],
  'Laravel':        ['PHP'],
  'Symfony':        ['PHP'],
  'SwiftUI':        ['Swift', 'iOS'],
  'Kubernetes':     ['Docker'],
  'Terraform':      ['DevOps'],
  'Redux':          ['React', 'JavaScript'],
  'GraphQL':        ['REST'],
  'PostgreSQL':     ['SQL'],
  'MySQL':          ['SQL'],
  'SQLite':         ['SQL'],
  'MongoDB':        ['NoSQL'],

  // ── Non-tech role inferences ──────────────────────────────────────────────
  // Knowing a specialized skill implies foundational ones in the same domain
  'Electronic Medical Records': ['HIPAA Compliance'],
  'Phlebotomy':                 ['Patient Care'],
  'BLS Certified':              ['CPR Certified'],
  'HVAC':                       ['OSHA Compliance'],
  'Electrical':                 ['OSHA Compliance'],
  'Plumbing':                   ['OSHA Compliance'],
  'Welding':                    ['OSHA Compliance'],
  'Carpentry':                  ['OSHA Compliance'],
  'Construction':               ['OSHA Compliance'],
  'Forklift Operation':         ['Warehouse', 'OSHA Compliance'],
  'CDL':                        ['Truck Driver'],
  'Culinary Arts':              ['Food Safety'],
  'Line Cook':                  ['Food Safety', 'Food Preparation'],
  'Prep Cook':                  ['Food Safety', 'Food Preparation'],
  'Retail Sales':               ['Customer Service'],
  'Sales':                      ['Customer Service'],
  'Call Center':                ['Customer Service'],
  'Logistics':                  ['Inventory Management'],
};

function inferParentSkills(candidates: Map<string, SkillCandidate>): void {
  const toAdd: Array<SkillCandidate> = [];

  for (const [canonical] of candidates) {
    const parents = CHILD_TO_PARENTS[canonical];
    if (!parents) {continue;}
    for (const parent of parents) {
      if (!candidates.has(parent)) {
        toAdd.push({ canonical: parent, weight: 0.8, count: 1, inferred: true });
      }
    }
  }

  for (const candidate of toAdd) {
    candidates.set(candidate.canonical, candidate);
  }
}

// ── Skill classification ──────────────────────────────────────────────────────

// Tools vs core technical skills
const TOOL_SKILLS = new Set([
  // ── Tech tools ────────────────────────────────────────────────────────────
  'Git', 'GitHub', 'GitLab', 'Bitbucket', 'Jira', 'Confluence', 'Trello',
  'Notion', 'Slack', 'Figma', 'Sketch', 'Adobe XD', 'Postman', 'Insomnia',
  'VS Code', 'IntelliJ', 'Vim', 'Webpack', 'Vite', 'npm', 'Yarn', 'pnpm',
  'Storybook', 'ESLint', 'Prettier', 'Datadog', 'Grafana', 'Prometheus',
  'Linear', 'Asana', 'Monday.com', 'Tableau', 'Power BI', 'Looker',
  // ── Non-tech tools ────────────────────────────────────────────────────────
  'POS Systems',              // retail & food service
  'Electronic Medical Records', // healthcare EMR (Epic, Cerner, etc.)
  'Microsoft Office',         // universal office suite
  'QuickBooks',               // accounting
  'Salesforce',               // CRM (used in sales/support)
  'Zoom',                     // remote communication
  'Google Workspace',         // office/collaboration
]);

function classifySkills(candidates: Map<string, SkillCandidate>): {
  technical: string[];
  tools: string[];
} {
  // Sort by: explicit > inferred, then by weight × count
  const sorted = Array.from(candidates.values()).sort((a, b) => {
    if (a.inferred !== b.inferred) {return a.inferred ? 1 : -1;}
    return (b.weight * b.count) - (a.weight * a.count);
  });

  const technical: string[] = [];
  const tools: string[] = [];

  for (const c of sorted) {
    if (TOOL_SKILLS.has(c.canonical)) {
      tools.push(c.canonical);
    } else {
      technical.push(c.canonical);
    }
  }

  return { technical, tools };
}

// ── Soft skill extraction ─────────────────────────────────────────────────────

function extractSoftSkills(text: string): string[] {
  const found = new Set<string>();
  for (const [pattern, label] of SOFT_SKILL_PATTERNS) {
    if (pattern.test(text)) {found.add(label);}
    pattern.lastIndex = 0; // reset stateful regex
  }
  return Array.from(found);
}

// ── Experience extraction ─────────────────────────────────────────────────────

interface ExperienceResult {
  level: 'entry' | 'mid' | 'senior' | 'executive';
  totalYears: number;
  positions: Array<{ title: string; company: string; duration: string; responsibilities: string[] }>;
}

function extractExperience(text: string, segments: TextSegment[]): ExperienceResult {
  // 1. Try "X years of experience" explicit statement
  const yearsMatch = text.match(/(\d+)\+?\s*years?\s*(of\s+)?(experience|exp|work)/i);
  let totalYears = yearsMatch ? parseInt(yearsMatch[1]) : 0;

  // 2. Determine seniority level from text signals
  let level: 'entry' | 'mid' | 'senior' | 'executive' = 'mid';
  for (const { level: l, re } of LEVEL_PATTERNS) {
    if (re.test(text)) { level = l; break; }
  }

  // 3. Refine level from years if not explicitly stated
  if (!yearsMatch) {
    if (level === 'mid') {
      // Try to estimate from job history date ranges
      totalYears = estimateYearsFromDates(text);
    }
  }
  if (yearsMatch && level === 'mid') {
    const y = parseInt(yearsMatch[1]);
    if (y >= 10)      {level = 'senior';}
    else if (y >= 5)  {level = 'senior';}
    else if (y >= 2)  {level = 'mid';}
    else              {level = 'entry';}
    totalYears = y;
  }

  // 4. Parse job positions from experience section, or full text as fallback
  const expSegment = segments.find(s => s.section === 'experience');
  let positions = expSegment ? parsePositions(expSegment.lines.join('\n')) : [];
  // If no positions found from segmented experience, try the full text
  if (positions.length === 0) {
    positions = parsePositions(text);
  }

  return { level, totalYears, positions };
}

function estimateYearsFromDates(text: string): number {
  const yearMatches = text.match(/\b(20\d{2}|19\d{2})\b/g);
  if (!yearMatches || yearMatches.length < 2) {return 0;}
  const years = yearMatches.map(Number);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years, new Date().getFullYear());
  return Math.min(maxYear - minYear, 40); // cap at 40 years
}

// US state names for location detection
const US_STATES_RE = /^(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new\s+\w+|north\s+\w+|ohio|oklahoma|oregon|pennsylvania|rhode\s+island|south\s+\w+|tennessee|texas|utah|vermont|virginia|washington|west\s+virginia|wisconsin|wyoming)\b/i;

/**
 * Extract company and title from text preceding a date range.
 * Handles formats like:
 *   "WALMART, INC., Bentonville, Arkansas Programmer Analyst, Team"
 *   "Senior Engineer | Google | Mountain View"
 *   "Software Engineer\nAmazon, Seattle, WA"
 */
function extractCompanyTitle(beforeText: string): { company: string; title: string } {
  let company = '';
  let title = 'Unknown Role';

  // Split on double-space, pipe, tab, or newline
  const parts = beforeText.split(/\s{2,}|[|\t\n]/).map(p => p.replace(/[•·\uf0b7]/g, '').trim()).filter(p => p.length > 1);

  if (parts.length >= 2) {
    const first = parts[0];
    if (/^[A-Z][A-Z\s,.&'()-]+$/.test(first) || /(?:inc|llc|corp|ltd|co)\b/i.test(first)) {
      company = first.replace(/,\s*$/, '');
      title = parts.slice(1).join(', ').replace(/,\s*$/, '');
    } else {
      title = first.replace(/,\s*$/, '');
      company = parts[1].replace(/,\s*$/, '');
    }
  } else if (parts.length === 1) {
    const commaChunks = parts[0].split(/,\s*/).filter(Boolean);
    if (commaChunks.length >= 2 && /^[A-Z][A-Z\s&'()-]+$/.test(commaChunks[0])) {
      // ALL-CAPS first chunk = company. Find where location ends and title begins.
      let titleIdx = commaChunks.length;
      for (let ci = 1; ci < commaChunks.length; ci++) {
        const chunk = commaChunks[ci].trim();
        if (/^(INC|LLC|CORP|LTD|CO)\.?$/i.test(chunk)) continue;
        if (US_STATES_RE.test(chunk) && chunk.split(/\s+/).length === 1) continue;
        if (/^[A-Z][a-z]+$/.test(chunk) && chunk.split(/\s+/).length === 1) continue;
        // Strip leading state name if chunk starts with one
        const stateMatch = chunk.match(US_STATES_RE);
        if (stateMatch && chunk.length > stateMatch[0].length + 1) {
          commaChunks[ci] = chunk.substring(stateMatch[0].length).trim();
        }
        titleIdx = ci;
        break;
      }
      company = commaChunks.slice(0, titleIdx).join(', ');
      title = commaChunks.slice(titleIdx).join(', ') || 'Unknown Role';
    } else if (commaChunks.length >= 2) {
      title = commaChunks[0];
      company = commaChunks.slice(1).join(', ');
    } else {
      title = parts[0];
    }
  }

  title = title.replace(/[,;:\s]+$/, '').trim();
  company = company.replace(/[,;:\s]+$/, '').trim();
  if (title.length > 80) title = title.substring(0, 80).replace(/\s\S*$/, '');

  return { company, title };
}

function parsePositions(text: string): ExperienceResult['positions'] {
  const positions: ExperienceResult['positions'] = [];
  const dateRe = /(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+|\d{1,2}\/)?\d{4}\s*[–—\u2010-]\s*(?:present|currently?|now|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+|\d{1,2}\/)?\d{0,4}/gi;

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Strategy 1: Line-by-line (works for well-formatted multi-line resumes)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const dateMatch = dateRe.exec(line);
    dateRe.lastIndex = 0;
    if (!dateMatch) continue;

    // Text on the same line before the date
    const beforeOnLine = line.substring(0, dateMatch.index).replace(/[|•·,]/g, ' ').trim();

    // Look back up to 2 lines for title/company context
    // Common format: Title (line i-2) → Company, City (line i-1) → Date (line i)
    // Or: Company, City, Title, Date (all on one line)
    let contextLines: string[] = [];
    if (beforeOnLine) contextLines.push(beforeOnLine);
    for (let back = 1; back <= 2 && i - back >= 0; back++) {
      const prev = lines[i - back].trim();
      if (!prev) continue;
      if (dateRe.test(prev)) { dateRe.lastIndex = 0; break; }
      dateRe.lastIndex = 0;
      // Stop if we hit a bullet point or responsibility text
      if (/^[•\-*\uf0b7]/.test(prev)) break;
      contextLines.unshift(prev);
    }

    let company = '';
    let title = 'Unknown Role';

    if (contextLines.length >= 2 && !beforeOnLine) {
      // Date on its own line, 2+ context lines above:
      // Usually: line[-2]=Title, line[-1]=Company, Location
      title = contextLines[0];
      company = contextLines.slice(1).join(', ');
    } else {
      const combined = contextLines.join('\n');
      ({ company, title } = extractCompanyTitle(combined));
    }

    // Collect responsibilities
    const responsibilities: string[] = [];
    for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
      const next = lines[j].trim();
      if (dateRe.test(next)) { dateRe.lastIndex = 0; break; }
      dateRe.lastIndex = 0;
      if (/^[A-Z][A-Z\s,.&'()-]+$/.test(next) && next.length > 5 && next.length < 80) break;
      if (next.startsWith('•') || next.startsWith('-') || next.startsWith('*') || next.charCodeAt(0) === 0xf0b7 || next.length > 30) {
        responsibilities.push(next);
      }
    }

    if (title !== 'Unknown Role' || company) {
      positions.push({ title, company, duration: dateMatch[0], responsibilities });
    }
  }

  // Strategy 2: Dateless resumes with "Company — Title" or "Company – Title" (em/en-dash)
  if (positions.length === 0) {
    const dashSepRe = /^(.+?)\s*[–—]\s*(.+)$/;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = dashSepRe.exec(line);
      if (!match) continue;
      const left = match[1].trim();
      const right = match[2].trim();
      if (left.length < 3 || right.length < 3) continue;
      if (/^[•●■▪\uf0b7]/.test(left)) continue;

      // Confirm: next line should be a bullet (responsibility) to avoid false positives
      const nextLine = lines[i + 1]?.trim() || '';
      const hasBullets = /^[•●■▪\uf0b7\-*]/.test(nextLine);
      if (!hasBullets && i + 1 < lines.length) continue;

      const responsibilities: string[] = [];
      for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
        const next = lines[j].trim();
        if (dashSepRe.test(next)) break;
        if (/^[•●■▪\uf0b7\-*]/.test(next) || next.length > 30) {
          responsibilities.push(next);
        }
      }
      positions.push({ title: right, company: left, duration: '', responsibilities });
    }
  }

  return positions.slice(0, 8);
}

// ── Education extraction ──────────────────────────────────────────────────────

function extractEducation(segments: TextSegment[]): SkillIntelligenceResult['education'] {
  const eduSegment = segments.find(s => s.section === 'education');
  if (!eduSegment) {return [];}

  const DEGREE_RE = /\b(ph\.?d\.?|doctor(ate)?|master'?s?|m\.?s\.?|m\.?a\.?|mba|msc|bachelor'?s?|b\.?s\.?|b\.?a\.?|bsc|associate|diploma|certificate)\b/i;
  const YEAR_RE = /\b(19|20)\d{2}\b/;

  const results: SkillIntelligenceResult['education'] = [];
  const lines = eduSegment.lines.map(l => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const degreeMatch = line.match(DEGREE_RE);
    if (degreeMatch) {
      const yearMatch = (lines[i + 1] || line).match(YEAR_RE);
      results.push({
        degree: degreeMatch[0],
        institution: line.replace(degreeMatch[0], '').replace(/[,-]/, '').trim() || (lines[i + 1] || '').trim(),
        year: yearMatch?.[0],
      });
    }
  }

  return results.slice(0, 4);
}

// ── Certification extraction ──────────────────────────────────────────────────

const CERT_PATTERNS = [
  /\b(aws\s+certified[\w\s]+?(solutions\s+architect|developer|devops|sysops|cloud|database|security|specialty)?)/gi,
  /\b(google\s+(cloud|professional)\s+[\w\s]+?certified?)\b/gi,
  /\b(microsoft\s+certified[\w\s]+)\b/gi,
  /\b(certified\s+(kubernetes|scrum|safe|pmp|cissp|ceh|aws|gcp|azure|data|cloud)[\w\s]*)\b/gi,
  /\b(pmp|cissp|ceh|cism|cisa|comptia[\s+][\w]+|ccna|ccnp|rhce|lpic|ckad|cka)\b/gi,
  /\b(tensorflow\s+developer\s+certificate)\b/gi,
  /\b(oracle\s+certified[\w\s]+)\b/gi,
];

function extractCertifications(text: string): string[] {
  const found = new Set<string>();
  for (const pattern of CERT_PATTERNS) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      found.add(match[0].trim().replace(/\s+/g, ' '));
    }
  }
  return Array.from(found).slice(0, 10);
}

// ── Personal info extraction ──────────────────────────────────────────────────

function extractPersonalInfo(text: string): SkillIntelligenceResult['personalInfo'] {
  const info: SkillIntelligenceResult['personalInfo'] = {};

  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {info.email = emailMatch[0];}

  const phoneMatch = text.match(/(\+?1[-.\s]?)?\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/);
  if (phoneMatch) {info.phone = phoneMatch[0].trim();}

  const linkedinMatch = text.match(/linkedin\.com\/in\/([\w-]+)/i);
  if (linkedinMatch) {info.linkedin = `https://linkedin.com/in/${linkedinMatch[1]}`;}

  const githubMatch = text.match(/github\.com\/([\w-]+)/i);
  if (githubMatch) {info.github = `https://github.com/${githubMatch[1]}`;}

  const portfolioMatch = text.match(/https?:\/\/(?!linkedin|github)[\w.-]+\.(io|com|dev|me|co|net)(\/[\w.-]*)*/i);
  if (portfolioMatch) {info.website = portfolioMatch[0];}

  // Location: "City, ST" or "City, State" pattern in the first 20 lines
  const headerText = text.split('\n').slice(0, 20).join('\n');
  const locationMatch = headerText.match(/\b([A-Z][a-zA-Z\s]+),\s*([A-Z]{2})\b/);
  if (locationMatch) {info.location = locationMatch[0];}

  // Name: first 10 non-empty lines, find a "Firstname Lastname" pattern
  const JOB_TITLE_WORDS = /\b(engineer|developer|manager|analyst|designer|consultant|director|architect|intern|associate|lead|senior|junior|staff|resume|cv)\b/i;
  for (const line of text.split('\n').slice(0, 10).map(l => l.trim()).filter(Boolean)) {
    if (/[@\d|()•\\]|linkedin|github|http|\.com|\.edu|\.org/i.test(line)) {continue;}
    if (JOB_TITLE_WORDS.test(line)) {continue;}
    if (/^([A-Z][a-zA-Z'-]{1,20}\s){1,3}[A-Z][a-zA-Z'-]{1,20}$/.test(line)) {
      info.name = line;
      break;
    }
  }

  return info;
}

// ── Confidence scoring ────────────────────────────────────────────────────────

function computeConfidence(technical: string[], totalYears: number, personalInfo: SkillIntelligenceResult['personalInfo']): number {
  let score = 0;
  if (technical.length >= 5)           {score += 40;}
  else if (technical.length >= 2)      {score += 20;}
  else if (technical.length >= 1)      {score += 10;}
  if (totalYears > 0)                  {score += 15;}
  if (personalInfo.email)              {score += 15;}
  if (personalInfo.name)               {score += 15;}
  if (personalInfo.linkedin || personalInfo.github) {score += 15;}
  return Math.min(score, 95); // never claim 100% — we're not AI
}
