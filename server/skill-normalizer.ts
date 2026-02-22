/**
 * Skill Normalizer
 *
 * Maps skill name variations to canonical forms for consistent matching.
 * "ReactJS", "react.js", "React" all resolve to "React".
 *
 * Applied at:
 * - Resume skill storage (ingestion)
 * - Job ingestion (storage)
 * - Match time (comparison)
 */

// Lowercase alias → canonical name
export const SKILL_ALIASES: Record<string, string> = {
  // JavaScript ecosystem
  'js': 'JavaScript',
  'javascript': 'JavaScript',
  'ecmascript': 'JavaScript',
  'es6': 'JavaScript',
  'es2015': 'JavaScript',
  'typescript': 'TypeScript',
  'ts': 'TypeScript',
  'node': 'Node.js',
  'nodejs': 'Node.js',
  'node.js': 'Node.js',
  'node js': 'Node.js',
  'react': 'React',
  'reactjs': 'React',
  'react.js': 'React',
  'react js': 'React',
  'vue': 'Vue.js',
  'vuejs': 'Vue.js',
  'vue.js': 'Vue.js',
  'vue js': 'Vue.js',
  'vue 3': 'Vue.js',
  'angular': 'Angular',
  'angularjs': 'Angular',
  'angular.js': 'Angular',
  'angular js': 'Angular',
  'nextjs': 'Next.js',
  'next.js': 'Next.js',
  'next js': 'Next.js',
  'next': 'Next.js',
  'nuxt': 'Nuxt.js',
  'nuxtjs': 'Nuxt.js',
  'nuxt.js': 'Nuxt.js',
  'express': 'Express.js',
  'expressjs': 'Express.js',
  'express.js': 'Express.js',
  'nestjs': 'NestJS',
  'nest.js': 'NestJS',
  'nest js': 'NestJS',
  'svelte': 'Svelte',
  'sveltejs': 'Svelte',
  'sveltekit': 'SvelteKit',
  'jquery': 'jQuery',
  'redux': 'Redux',
  'webpack': 'Webpack',
  'vite': 'Vite',
  'deno': 'Deno',
  'bun': 'Bun',

  // Python ecosystem
  'python': 'Python',
  'python3': 'Python',
  'python 3': 'Python',
  'py': 'Python',
  'django': 'Django',
  'flask': 'Flask',
  'fastapi': 'FastAPI',
  'fast api': 'FastAPI',
  'pandas': 'Pandas',
  'numpy': 'NumPy',
  'scipy': 'SciPy',
  'pytorch': 'PyTorch',
  'torch': 'PyTorch',
  'tensorflow': 'TensorFlow',
  'tf': 'TensorFlow',
  'scikit-learn': 'Scikit-learn',
  'sklearn': 'Scikit-learn',
  'scikit learn': 'Scikit-learn',
  'keras': 'Keras',
  'matplotlib': 'Matplotlib',

  // Java / JVM
  'java': 'Java',
  'spring': 'Spring',
  'spring boot': 'Spring Boot',
  'springboot': 'Spring Boot',
  'kotlin': 'Kotlin',
  'scala': 'Scala',
  'gradle': 'Gradle',
  'maven': 'Maven',

  // Systems languages
  'rust': 'Rust',
  'rustlang': 'Rust',
  'go': 'Go',
  'golang': 'Go',
  'c++': 'C++',
  'cpp': 'C++',
  'c/c++': 'C/C++',
  'c': 'C',
  'c#': 'C#',
  'csharp': 'C#',
  'c sharp': 'C#',

  // .NET
  '.net': '.NET',
  'dotnet': '.NET',
  'dot net': '.NET',
  '.net core': '.NET',
  'asp.net': 'ASP.NET',
  'aspnet': 'ASP.NET',

  // Ruby
  'ruby': 'Ruby',
  'rails': 'Ruby on Rails',
  'ruby on rails': 'Ruby on Rails',
  'ror': 'Ruby on Rails',

  // PHP
  'php': 'PHP',
  'laravel': 'Laravel',
  'symfony': 'Symfony',
  'wordpress': 'WordPress',
  'wp': 'WordPress',

  // Mobile
  'react native': 'React Native',
  'react-native': 'React Native',
  'reactnative': 'React Native',
  'rn': 'React Native',
  'swift': 'Swift',
  'swiftui': 'SwiftUI',
  'objective-c': 'Objective-C',
  'objc': 'Objective-C',
  'ios': 'iOS',
  'android': 'Android',
  'flutter': 'Flutter',
  'dart': 'Dart',
  'kotlin multiplatform': 'Kotlin Multiplatform',

  // Databases
  'sql': 'SQL',
  'mysql': 'MySQL',
  'postgres': 'PostgreSQL',
  'postgresql': 'PostgreSQL',
  'pg': 'PostgreSQL',
  'mongo': 'MongoDB',
  'mongodb': 'MongoDB',
  'redis': 'Redis',
  'elasticsearch': 'Elasticsearch',
  'elastic': 'Elasticsearch',
  'dynamodb': 'DynamoDB',
  'dynamo': 'DynamoDB',
  'cassandra': 'Cassandra',
  'sqlite': 'SQLite',
  'mariadb': 'MariaDB',
  'mssql': 'SQL Server',
  'sql server': 'SQL Server',
  'microsoft sql server': 'SQL Server',
  'oracle db': 'Oracle DB',
  'oracle database': 'Oracle DB',

  // Cloud & DevOps
  'aws': 'AWS',
  'amazon web services': 'AWS',
  'gcp': 'GCP',
  'google cloud': 'GCP',
  'google cloud platform': 'GCP',
  'azure': 'Azure',
  'microsoft azure': 'Azure',
  'docker': 'Docker',
  'kubernetes': 'Kubernetes',
  'k8s': 'Kubernetes',
  'terraform': 'Terraform',
  'ansible': 'Ansible',
  'jenkins': 'Jenkins',
  'github actions': 'GitHub Actions',
  'gh actions': 'GitHub Actions',
  'gitlab ci': 'GitLab CI',
  'gitlab ci/cd': 'GitLab CI',
  'circleci': 'CircleCI',
  'circle ci': 'CircleCI',
  'ci/cd': 'CI/CD',
  'cicd': 'CI/CD',
  'nginx': 'Nginx',
  'linux': 'Linux',
  'bash': 'Bash',
  'shell': 'Shell',
  'shell scripting': 'Shell',
  'prometheus': 'Prometheus',
  'grafana': 'Grafana',
  'datadog': 'Datadog',
  'cloudformation': 'CloudFormation',
  'aws cloudformation': 'CloudFormation',
  'serverless': 'Serverless',
  'lambda': 'AWS Lambda',
  'aws lambda': 'AWS Lambda',

  // Data & ML
  'machine learning': 'Machine Learning',
  'ml': 'Machine Learning',
  'deep learning': 'Deep Learning',
  'dl': 'Deep Learning',
  'artificial intelligence': 'AI',
  'ai': 'AI',
  'nlp': 'NLP',
  'natural language processing': 'NLP',
  'computer vision': 'Computer Vision',
  'cv': 'Computer Vision',
  'data science': 'Data Science',
  'data engineering': 'Data Engineering',
  'data analysis': 'Data Analysis',
  'spark': 'Apache Spark',
  'apache spark': 'Apache Spark',
  'hadoop': 'Hadoop',
  'apache hadoop': 'Hadoop',
  'kafka': 'Apache Kafka',
  'apache kafka': 'Apache Kafka',
  'airflow': 'Apache Airflow',
  'apache airflow': 'Apache Airflow',
  'tableau': 'Tableau',
  'power bi': 'Power BI',
  'powerbi': 'Power BI',
  'looker': 'Looker',
  'dbt': 'dbt',
  'snowflake': 'Snowflake',
  'bigquery': 'BigQuery',
  'big query': 'BigQuery',
  'redshift': 'Redshift',

  // Frontend / CSS
  'html': 'HTML',
  'html5': 'HTML',
  'css': 'CSS',
  'css3': 'CSS',
  'sass': 'Sass',
  'scss': 'Sass',
  'less': 'Less',
  'tailwind': 'Tailwind CSS',
  'tailwindcss': 'Tailwind CSS',
  'tailwind css': 'Tailwind CSS',
  'bootstrap': 'Bootstrap',
  'material ui': 'Material UI',
  'mui': 'Material UI',
  'styled-components': 'Styled Components',
  'styled components': 'Styled Components',
  'storybook': 'Storybook',

  // Testing
  'jest': 'Jest',
  'mocha': 'Mocha',
  'cypress': 'Cypress',
  'playwright': 'Playwright',
  'selenium': 'Selenium',
  'pytest': 'pytest',
  'junit': 'JUnit',
  'rspec': 'RSpec',
  'vitest': 'Vitest',
  'testing library': 'Testing Library',
  'react testing library': 'Testing Library',

  // APIs & Protocols
  'rest': 'REST',
  'restful': 'REST',
  'rest api': 'REST',
  'restful api': 'REST',
  'graphql': 'GraphQL',
  'gql': 'GraphQL',
  'grpc': 'gRPC',
  'websocket': 'WebSocket',
  'websockets': 'WebSocket',
  'ws': 'WebSocket',

  // Version control
  'git': 'Git',
  'github': 'GitHub',
  'gitlab': 'GitLab',
  'bitbucket': 'Bitbucket',

  // Design & UX
  'figma': 'Figma',
  'sketch': 'Sketch',
  'adobe xd': 'Adobe XD',
  'ux': 'UX Design',
  'ux design': 'UX Design',
  'ui': 'UI Design',
  'ui design': 'UI Design',
  'ui/ux': 'UI/UX Design',
  'ux/ui': 'UI/UX Design',

  // Security
  'cybersecurity': 'Cybersecurity',
  'cyber security': 'Cybersecurity',
  'infosec': 'Cybersecurity',
  'owasp': 'OWASP',
  'penetration testing': 'Penetration Testing',
  'pentest': 'Penetration Testing',

  // Project management / methodologies
  'agile': 'Agile',
  'scrum': 'Scrum',
  'kanban': 'Kanban',
  'jira': 'Jira',

  // Other
  'graphdb': 'Graph Database',
  'neo4j': 'Neo4j',
  'rabbitmq': 'RabbitMQ',
  'rabbit mq': 'RabbitMQ',
  'r': 'R',
  'rlang': 'R',
  'matlab': 'MATLAB',
  'sas': 'SAS',
  'solidity': 'Solidity',
  'web3': 'Web3',
  'blockchain': 'Blockchain',
  'elixir': 'Elixir',
  'erlang': 'Erlang',
  'haskell': 'Haskell',
  'clojure': 'Clojure',
  'perl': 'Perl',
  'lua': 'Lua',
  'unity': 'Unity',
  'unreal': 'Unreal Engine',
  'unreal engine': 'Unreal Engine',

  // Hospitality & Food Service
  'dishwasher': 'Dishwashing',
  'dishwashing': 'Dishwashing',
  'dish washer': 'Dishwashing',
  'kitchen staff': 'Kitchen Staff',
  'kitchen help': 'Kitchen Staff',
  'line cook': 'Line Cook',
  'line cooking': 'Line Cook',
  'prep cook': 'Prep Cook',
  'preparation cook': 'Prep Cook',
  'server': 'Server',
  'waiter': 'Server',
  'waitress': 'Server',
  'wait staff': 'Server',
  'bartender': 'Bartender',
  'bar tender': 'Bartender',
  'host': 'Host',
  'hostess': 'Host',
  'busser': 'Busser',
  'bussing': 'Busser',
  'food prep': 'Food Preparation',
  'food preparation': 'Food Preparation',
  'culinary': 'Culinary Arts',
  'culinary arts': 'Culinary Arts',
  'barista': 'Barista',
  'housekeeping': 'Housekeeping',
  'house keeper': 'Housekeeping',
  'room attendant': 'Housekeeping',
  'sanitation': 'Sanitation',
  'food safety': 'Food Safety',
  'servsafe': 'Food Safety',
  'haccp': 'Food Safety',
  'pos': 'POS Systems',
  'pos systems': 'POS Systems',
  'cash handling': 'Cash Handling',
  'cashier': 'Cashier',

  // Trades & Construction
  'electrician': 'Electrical',
  'electrical': 'Electrical',
  'electrical work': 'Electrical',
  'plumbing': 'Plumbing',
  'plumber': 'Plumbing',
  'carpentry': 'Carpentry',
  'carpenter': 'Carpentry',
  'welding': 'Welding',
  'welder': 'Welding',
  'mig welding': 'Welding',
  'tig welding': 'Welding',
  'hvac': 'HVAC',
  'air conditioning': 'HVAC',
  'heating': 'HVAC',
  'roofing': 'Roofing',
  'roofer': 'Roofing',
  'masonry': 'Masonry',
  'bricklaying': 'Masonry',
  'painting': 'Painting',
  'painter': 'Painting',
  'landscaping': 'Landscaping',
  'landscaper': 'Landscaping',
  'general labor': 'General Labor',
  'laborer': 'General Labor',
  'construction': 'Construction',
  'warehouse': 'Warehouse',
  'forklift': 'Forklift Operation',
  'fork lift': 'Forklift Operation',
  'forklift certified': 'Forklift Operation',

  // Healthcare
  'cna': 'Certified Nursing Assistant',
  'nursing assistant': 'Certified Nursing Assistant',
  'certified nursing assistant': 'Certified Nursing Assistant',
  'home health aide': 'Home Health Aide',
  'hha': 'Home Health Aide',
  'medical assistant': 'Medical Assistant',
  'phlebotomy': 'Phlebotomy',
  'phlebotomist': 'Phlebotomy',
  'cpr': 'CPR Certified',
  'cpr certified': 'CPR Certified',
  'bls': 'BLS Certified',
  'patient care': 'Patient Care',
  'emr': 'Electronic Medical Records',
  'electronic medical records': 'Electronic Medical Records',
  'medical records': 'Electronic Medical Records',
  'hipaa': 'HIPAA Compliance',

  // Retail & Customer Service
  'retail': 'Retail Sales',
  'retail sales': 'Retail Sales',
  'sales associate': 'Sales',
  'sales': 'Sales',
  'customer service': 'Customer Service',
  'customer support': 'Customer Service',
  'call center': 'Call Center',
  'receptionist': 'Receptionist',
  'front desk': 'Receptionist',
  'clerical': 'Clerical',
  'data entry': 'Data Entry',
  'inventory': 'Inventory Management',
  'stocking': 'Stocking',
  'merchandising': 'Merchandising',

  // Transportation
  'delivery driver': 'Delivery Driver',
  'delivery driving': 'Delivery Driver',
  'truck driver': 'Truck Driver',
  'trucking': 'Truck Driver',
  'cdl': 'CDL',
  'commercial drivers license': 'CDL',
  'rideshare': 'Rideshare Driver',
  'uber driver': 'Rideshare Driver',
  'lyft driver': 'Rideshare Driver',
  'courier': 'Courier',

  // Cleaning & Maintenance
  'janitor': 'Janitorial',
  'janitorial': 'Janitorial',
  'cleaning': 'Cleaning',
  'cleaner': 'Cleaning',
  'maid': 'Housekeeping',
  'maintenance': 'Maintenance',
  'handyman': 'Handyman',

  // Security
  'security guard': 'Security',
  'security officer': 'Security',
  'safety': 'Safety Compliance',
  'osha': 'OSHA Compliance',
};

/**
 * Normalize a single skill string to its canonical form.
 * Returns the canonical alias if found, otherwise title-cases the input.
 */
export function normalizeSkill(skill: string): string {
  const trimmed = skill.trim();
  if (!trimmed) return trimmed;

  const lower = trimmed.toLowerCase();
  if (SKILL_ALIASES[lower]) {
    return SKILL_ALIASES[lower];
  }

  // Not in alias map — return as-is (preserve original casing)
  return trimmed;
}

/**
 * Normalize an array of skills: apply alias mapping + deduplicate.
 */
export function normalizeSkills(skills: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const skill of skills) {
    const normalized = normalizeSkill(skill);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(normalized);
    }
  }

  return result;
}

/**
 * Skill parent → child skills.
 * Knowing a parent skill grants partial credit (0.5x) toward child skills.
 * E.g., a React developer can partially match Next.js, Remix, Gatsby jobs.
 */
const SKILL_PARENTS: Record<string, string[]> = {
  'React': ['Next.js', 'Remix', 'Gatsby', 'React Native'],
  'JavaScript': ['TypeScript', 'Node.js', 'React', 'Vue.js', 'Angular', 'Next.js'],
  'TypeScript': ['JavaScript'],
  'Python': ['Django', 'Flask', 'FastAPI', 'NumPy', 'Pandas', 'PyTorch', 'TensorFlow', 'Scikit-learn'],
  'Node.js': ['Express.js', 'NestJS'],
  'SQL': ['PostgreSQL', 'MySQL', 'SQLite', 'SQL Server', 'MariaDB'],
  'AWS': ['CloudFormation', 'AWS Lambda'],
  'Docker': ['Kubernetes'],
  'Java': ['Spring', 'Spring Boot'],
  'Ruby': ['Ruby on Rails'],
  'PHP': ['Laravel', 'Symfony'],
};

/**
 * Returns the child skills that a candidate's skill grants partial (0.5x) credit toward.
 * Input is any skill string; it is normalized before lookup.
 */
export function getRelatedSkills(skill: string): string[] {
  const canonical = normalizeSkill(skill);
  return SKILL_PARENTS[canonical] || [];
}
