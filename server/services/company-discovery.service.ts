/**
 * Company Discovery Service
 * 
 * Discovers companies from multiple sources:
 * - Wikipedia lists (Fortune 500, tech companies, etc.)
 * - Common career page patterns
 * - Known ATS boards
 * 
 * This builds the foundation for scalable scraping.
 */

export interface DiscoveredCompany {
  name: string;
  careerUrl: string;
  atsType: 'greenhouse' | 'lever' | 'workday' | 'custom' | 'unknown';
  atsId?: string;
  source: 'wikipedia' | 'crunchbase' | 'pattern' | 'manual';
  confidence: number;
}

// Common company career page patterns for major companies
const KNOWN_COMPANIES: DiscoveredCompany[] = [
  // Tech - Greenhouse
  { name: 'Stripe', careerUrl: 'https://stripe.com/jobs', atsType: 'greenhouse', atsId: 'stripe', source: 'manual', confidence: 1.0 },
  { name: 'Airbnb', careerUrl: 'https://careers.airbnb.com/', atsType: 'greenhouse', atsId: 'airbnb', source: 'manual', confidence: 1.0 },
  { name: 'Discord', careerUrl: 'https://discord.com/careers', atsType: 'greenhouse', atsId: 'discord', source: 'manual', confidence: 1.0 },
  { name: 'Figma', careerUrl: 'https://www.figma.com/careers/', atsType: 'greenhouse', atsId: 'figma', source: 'manual', confidence: 1.0 },
  { name: 'Notion', careerUrl: 'https://www.notion.so/careers', atsType: 'greenhouse', atsId: 'notion', source: 'manual', confidence: 1.0 },
  { name: 'Coinbase', careerUrl: 'https://www.coinbase.com/careers', atsType: 'greenhouse', atsId: 'coinbase', source: 'manual', confidence: 1.0 },
  { name: 'Instacart', careerUrl: 'https://careers.instacart.com/', atsType: 'greenhouse', atsId: 'instacart', source: 'manual', confidence: 1.0 },
  { name: 'Robinhood', careerUrl: 'https://robinhood.com/us/en/careers/', atsType: 'greenhouse', atsId: 'robinhood', source: 'manual', confidence: 1.0 },
  { name: 'Plaid', careerUrl: 'https://plaid.com/careers/', atsType: 'greenhouse', atsId: 'plaid', source: 'manual', confidence: 1.0 },
  { name: 'Ramp', careerUrl: 'https://ramp.com/careers', atsType: 'greenhouse', atsId: 'ramp', source: 'manual', confidence: 1.0 },
  { name: 'Datadog', careerUrl: 'https://careers.datadoghq.com/', atsType: 'greenhouse', atsId: 'datadog', source: 'manual', confidence: 1.0 },
  { name: 'Duolingo', careerUrl: 'https://careers.duolingo.com/', atsType: 'greenhouse', atsId: 'duolingo', source: 'manual', confidence: 1.0 },
  { name: 'HashiCorp', careerUrl: 'https://www.hashicorp.com/careers', atsType: 'greenhouse', atsId: 'hashicorp', source: 'manual', confidence: 1.0 },
  { name: 'Snyk', careerUrl: 'https://snyk.io/careers/', atsType: 'greenhouse', atsId: 'snyk', source: 'manual', confidence: 1.0 },
  { name: 'GitLab', careerUrl: 'https://about.gitlab.com/jobs/', atsType: 'greenhouse', atsId: 'gitlab', source: 'manual', confidence: 1.0 },
  { name: 'Databricks', careerUrl: 'https://databricks.com/careers', atsType: 'greenhouse', atsId: 'databricks', source: 'manual', confidence: 1.0 },
  { name: 'Carta', careerUrl: 'https://carta.com/careers/', atsType: 'greenhouse', atsId: 'carta', source: 'manual', confidence: 1.0 },
  { name: 'Brex', careerUrl: 'https://www.brex.com/careers', atsType: 'greenhouse', atsId: 'brex', source: 'manual', confidence: 1.0 },
  { name: 'Scale AI', careerUrl: 'https://scale.com/careers', atsType: 'greenhouse', atsId: 'scaleai', source: 'manual', confidence: 1.0 },
  { name: 'Deel', careerUrl: 'https://www.deel.com/careers', atsType: 'greenhouse', atsId: 'deel', source: 'manual', confidence: 1.0 },
  { name: 'Retool', careerUrl: 'https://retool.com/careers', atsType: 'greenhouse', atsId: 'retool', source: 'manual', confidence: 1.0 },
  { name: 'Benchling', careerUrl: 'https://www.benchling.com/careers/', atsType: 'greenhouse', atsId: 'benchling', source: 'manual', confidence: 1.0 },
  { name: 'Mercury', careerUrl: 'https://mercury.com/careers', atsType: 'greenhouse', atsId: 'mercury', source: 'manual', confidence: 1.0 },
  { name: 'Rippling', careerUrl: 'https://www.rippling.com/careers', atsType: 'greenhouse', atsId: 'rippling', source: 'manual', confidence: 1.0 },
  { name: 'Anduril', careerUrl: 'https://www.anduril.com/careers/', atsType: 'greenhouse', atsId: 'anduril', source: 'manual', confidence: 1.0 },
  { name: 'Cockroach Labs', careerUrl: 'https://www.cockroachlabs.com/careers/', atsType: 'greenhouse', atsId: 'cockroachlabs', source: 'manual', confidence: 1.0 },
  { name: 'Amplitude', careerUrl: 'https://amplitude.com/careers', atsType: 'greenhouse', atsId: 'amplitude', source: 'manual', confidence: 1.0 },
  { name: 'LaunchDarkly', careerUrl: 'https://launchdarkly.com/careers/', atsType: 'greenhouse', atsId: 'launchdarkly', source: 'manual', confidence: 1.0 },
  { name: 'Segment', careerUrl: 'https://segment.com/careers/', atsType: 'greenhouse', atsId: 'segment', source: 'manual', confidence: 1.0 },
  { name: 'Notion', careerUrl: 'https://notion.so/careers', atsType: 'greenhouse', atsId: 'notion', source: 'manual', confidence: 1.0 },
  { name: 'Confluent', careerUrl: 'https://www.confluent.io/careers/', atsType: 'greenhouse', atsId: 'confluent', source: 'manual', confidence: 1.0 },
  { name: 'Snowflake', careerUrl: 'https://careers.snowflake.com/', atsType: 'greenhouse', atsId: 'snowflake', source: 'manual', confidence: 1.0 },
  { name: 'Cloudflare', careerUrl: 'https://www.cloudflare.com/careers/', atsType: 'lever', atsId: 'cloudflare', source: 'manual', confidence: 1.0 },
  { name: 'Airtable', careerUrl: 'https://airtable.com/careers', atsType: 'lever', atsId: 'airtable', source: 'manual', confidence: 1.0 },
  { name: 'Webflow', careerUrl: 'https://webflow.com/careers', atsType: 'lever', atsId: 'webflow', source: 'manual', confidence: 1.0 },
  { name: 'Canva', careerUrl: 'https://www.canva.com/careers/', atsType: 'lever', atsId: 'canva', source: 'manual', confidence: 1.0 },
  { name: 'Loom', careerUrl: 'https://www.loom.com/careers', atsType: 'lever', atsId: 'loom', source: 'manual', confidence: 1.0 },
  { name: 'Postman', careerUrl: 'https://www.postman.com/company/careers/', atsType: 'lever', atsId: 'postman', source: 'manual', confidence: 1.0 },
  { name: 'Grammarly', careerUrl: 'https://www.grammarly.com/jobs', atsType: 'lever', atsId: 'grammarly', source: 'manual', confidence: 1.0 },
  { name: 'Miro', careerUrl: 'https://miro.com/careers/', atsType: 'lever', atsId: 'miro', source: 'manual', confidence: 1.0 },
  { name: 'Asana', careerUrl: 'https://asana.com/jobs', atsType: 'lever', atsId: 'asana', source: 'manual', confidence: 1.0 },
  { name: 'Intercom', careerUrl: 'https://www.intercom.com/careers', atsType: 'lever', atsId: 'intercom', source: 'manual', confidence: 1.0 },
  { name: 'Calendly', careerUrl: 'https://calendly.com/careers', atsType: 'lever', atsId: 'calendly', source: 'manual', confidence: 1.0 },
  { name: 'Zapier', careerUrl: 'https://zapier.com/jobs', atsType: 'lever', atsId: 'zapier', source: 'manual', confidence: 1.0 },
  { name: 'Gusto', careerUrl: 'https://gusto.com/company/careers', atsType: 'lever', atsId: 'gusto', source: 'manual', confidence: 1.0 },
  { name: 'Netflix', careerUrl: 'https://jobs.netflix.com/', atsType: 'lever', atsId: 'netflix', source: 'manual', confidence: 1.0 },
  { name: 'Twilio', careerUrl: 'https://www.twilio.com/company/jobs', atsType: 'lever', atsId: 'twilio', source: 'manual', confidence: 1.0 },
  { name: 'Flexport', careerUrl: 'https://www.flexport.com/careers/', atsType: 'lever', atsId: 'flexport', source: 'manual', confidence: 1.0 },
  // Workday
  { name: 'Salesforce', careerUrl: 'https://careers.salesforce.com/jobs', atsType: 'workday', atsId: 'salesforce', source: 'manual', confidence: 1.0 },
  { name: 'VMware', careerUrl: 'https://careers.vmware.com/main/jobs', atsType: 'workday', atsId: 'vmware', source: 'manual', confidence: 1.0 },
  { name: 'Adobe', careerUrl: 'https://careers.adobe.com/us/en/search-results', atsType: 'workday', atsId: 'adobe', source: 'manual', confidence: 1.0 },
  { name: 'Workday', careerUrl: 'https://workday.wd5.myworkdayjobs.com/Workday', atsType: 'workday', atsId: 'workday', source: 'manual', confidence: 1.0 },
  { name: 'ServiceNow', careerUrl: 'https://careers.servicenow.com/', atsType: 'workday', atsId: 'servicenow', source: 'manual', confidence: 1.0 },
  { name: 'Nvidia', careerUrl: 'https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite', atsType: 'workday', atsId: 'nvidia', source: 'manual', confidence: 1.0 },
];

// Extended list - companies we can discover via patterns
const EXTENDED_COMPANIES_PATTERN = [
  // More tech companies - likely Greenhouse based on common patterns
  { name: 'Anthropic', base: 'anthropic', atsType: 'greenhouse' as const },
  { name: 'OpenAI', base: 'openai', atsType: 'greenhouse' as const },
  { name: 'Mistral AI', base: 'mistral-ai', atsType: 'greenhouse' as const },
  { name: 'Adept', base: 'adept', atsType: 'greenhouse' as const },
  { name: 'Character AI', base: 'character-ai', atsType: 'greenhouse' as const },
  { name: 'Inflection', base: 'inflection', atsType: 'greenhouse' as const },
  { name: 'Runway', base: 'runwayml', atsType: 'greenhouse' as const },
  { name: 'Stability AI', base: 'stabilityai', atsType: 'greenhouse' as const },
  { name: 'Hugging Face', base: 'huggingface', atsType: 'greenhouse' as const },
  { name: 'Replit', base: 'replit', atsType: 'greenhouse' as const },
  { name: 'Vercel', base: 'vercel', atsType: 'greenhouse' as const },
  { name: 'Supabase', base: 'supabase', atsType: 'greenhouse' as const },
  { name: 'Railway', base: 'railway', atsType: 'greenhouse' as const },
  { name: 'Render', base: 'render', atsType: 'greenhouse' as const },
  { name: 'Fly.io', base: 'fly', atsType: 'greenhouse' as const },
  { name: 'PlanetScale', base: 'planetscale', atsType: 'greenhouse' as const },
  { name: 'Prisma', base: 'prisma', atsType: 'greenhouse' as const },
  { name: 'Deno', base: 'deno', atsType: 'greenhouse' as const },
  { name: 'Bun', base: 'oven', atsType: 'greenhouse' as const },
  { name: 'Linear', base: 'linear', atsType: 'greenhouse' as const },
  { name: 'Raycast', base: 'raycast', atsType: 'greenhouse' as const },
  { name: 'Arc', base: 'arc', atsType: 'greenhouse' as const },
  { name: 'Slack', base: 'slack', atsType: 'greenhouse' as const },
  { name: 'Zoom', base: 'zoom', atsType: 'greenhouse' as const },
  { name: 'DocuSign', base: 'docusign', atsType: 'greenhouse' as const },
  { name: 'Okta', base: 'okta', atsType: 'greenhouse' as const },
  { name: 'Auth0', base: 'auth0', atsType: 'greenhouse' as const },
  { name: 'MongoDB', base: 'mongodb', atsType: 'greenhouse' as const },
  { name: 'Elastic', base: 'elastic', atsType: 'greenhouse' as const },
  { name: 'Datadog', base: 'datadoghq', atsType: 'greenhouse' as const },
  { name: 'Cloudflare', base: 'cloudflare', atsType: 'greenhouse' as const },
  { name: 'Fastly', base: 'fastly', atsType: 'greenhouse' as const },
  { name: 'SendGrid', base: 'sendgrid', atsType: 'greenhouse' as const },
  { name: 'Twilio', base: 'twilio', atsType: 'greenhouse' as const },
  { name: 'MessageBird', base: 'messagebird', atsType: 'greenhouse' as const },
  { name: 'Snyk', base: 'snyk', atsType: 'greenhouse' as const },
  { name: 'JFrog', base: 'jfrog', atsType: 'greenhouse' as const },
  { name: 'HashiCorp', base: 'hashicorp', atsType: 'greenhouse' as const },
  { name: 'Pulumi', base: 'pulumi', atsType: 'greenhouse' as const },
  { name: 'Terraform', base: 'hashicorp', atsType: 'greenhouse' as const },
  { name: 'Figma', base: 'figma', atsType: 'greenhouse' as const },
  { name: 'InVision', base: 'invision', atsType: 'greenhouse' as const },
  { name: 'Marvel', base: 'marvel', atsType: 'greenhouse' as const },
  { name: 'Framer', base: 'framer', atsType: 'greenhouse' as const },
  { name: 'Webflow', base: 'webflow', atsType: 'greenhouse' as const },
  { name: 'Dribbble', base: 'dribbble', atsType: 'greenhouse' as const },
  { name: 'Behance', base: 'behance', atsType: 'greenhouse' as const },
  { name: 'Airtable', base: 'airtable', atsType: 'greenhouse' as const },
  { name: 'Notion', base: 'notion', atsType: 'greenhouse' as const },
  { name: 'Coda', base: 'coda', atsType: 'greenhouse' as const },
  { name: 'Roam Research', base: 'roam', atsType: 'greenhouse' as const },
  { name: 'Obsidian', base: 'obsidian', atsType: 'greenhouse' as const },
  { name: 'Slack', base: 'slack', atsType: 'greenhouse' as const },
  { name: 'Discord', base: 'discord', atsType: 'greenhouse' as const },
  { name: 'Clubhouse', base: 'clubhouse', atsType: 'greenhouse' as const },
  { name: 'Retool', base: 'retool', atsType: 'greenhouse' as const },
  { name: 'Streamlit', base: 'streamlit', atsType: 'greenhouse' as const },
  { name: 'Gradio', base: 'gradio', atsType: 'greenhouse' as const },
  { name: 'LangChain', base: 'langchain', atsType: 'greenhouse' as const },
  { name: 'LlamaIndex', base: 'llamaindex', atsType: 'greenhouse' as const },
  { name: 'Weights & Biases', base: 'wandb', atsType: 'greenhouse' as const },
  { name: 'MLflow', base: 'mlflow', atsType: 'greenhouse' as const },
  { name: 'Comet', base: 'comet', atsType: 'greenhouse' as const },
  { name: 'Neptune.ai', base: 'neptune-ai', atsType: 'greenhouse' as const },
  { name: 'Paperspace', base: 'paperspace', atsType: 'greenhouse' as const },
  { name: 'CoreWeave', base: 'coreweave', atsType: 'greenhouse' as const },
  { name: 'Lambda Labs', base: 'lambdalabs', atsType: 'greenhouse' as const },
  { name: 'Cerebras', base: 'cerebras', atsType: 'greenhouse' as const },
  { name: 'Graphcore', base: 'graphcore', atsType: 'greenhouse' as const },
  { name: 'Hugging Face', base: 'huggingface', atsType: 'greenhouse' as const },
  { name: 'Replicate', base: 'replicate', atsType: 'greenhouse' as const },
  { name: 'AssemblyAI', base: 'assemblyai', atsType: 'greenhouse' as const },
  { name: 'Deepgram', base: 'deepgram', atsType: 'greenhouse' as const },
  { name: 'Eleven Labs', base: 'elevenlabs', atsType: 'greenhouse' as const },
  { name: 'Murf AI', base: 'murfai', atsType: 'greenhouse' as const },
  { name: 'Descript', base: 'descript', atsType: 'greenhouse' as const },
  { name: 'Runway', base: 'runwayml', atsType: 'greenhouse' as const },
  { name: 'Pika', base: 'pika', atsType: 'greenhouse' as const },
  { name: 'Luma AI', base: 'lumalabs', atsType: 'greenhouse' as const },
  { name: 'Kaiber', base: 'kaiber', atsType: 'greenhouse' as const },
  { name: 'Synthesia', base: 'synthesia', atsType: 'greenhouse' as const },
  { name: 'HeyGen', base: 'heygen', atsType: 'greenhouse' as const },
  { name: 'D-ID', base: 'did', atsType: 'greenhouse' as const },
  { name: 'Unscreen', base: 'unscreen', atsType: 'greenhouse' as const },
  { name: 'Remove.bg', base: 'removebg', atsType: 'greenhouse' as const },
  { name: 'Unsplash', base: 'unsplash', atsType: 'greenhouse' as const },
  { name: 'Pexels', base: 'pexels', atsType: 'greenhouse' as const },
  { name: 'Shutterstock', base: 'shutterstock', atsType: 'greenhouse' as const },
  { name: 'Getty Images', base: 'gettyimages', atsType: 'greenhouse' as const },
  { name: 'Adobe', base: 'adobe', atsType: 'greenhouse' as const },
  { name: 'Canva', base: 'canva', atsType: 'greenhouse' as const },
  { name: 'Figma', base: 'figma', atsType: 'greenhouse' as const },
  { name: 'Sketch', base: 'sketch', atsType: 'greenhouse' as const },
  { name: 'InVision', base: 'invisionapp', atsType: 'greenhouse' as const },
  { name: 'Zeplin', base: 'zeplin', atsType: 'greenhouse' as const },
  { name: 'Overflow', base: 'overflow', atsType: 'greenhouse' as const },
  { name: 'Principle', base: 'principle', atsType: 'greenhouse' as const },
  { name: 'LottieFiles', base: 'lottiefiles', atsType: 'greenhouse' as const },
  { name: 'Rive', base: 'rive', atsType: 'greenhouse' as const },
  { name: 'Radar', base: 'radar', atsType: 'greenhouse' as const },
  { name: 'FullStory', base: 'fullstory', atsType: 'greenhouse' as const },
  { name: 'Hotjar', base: 'hotjar', atsType: 'greenhouse' as const },
  { name: 'Mixpanel', base: 'mixpanel', atsType: 'greenhouse' as const },
  { name: 'Amplitude', base: 'amplitude', atsType: 'greenhouse' as const },
  { name: 'Segment', base: 'segment', atsType: 'greenhouse' as const },
  { name: 'mParticle', base: 'mparticle', atsType: 'greenhouse' as const },
  { name: 'CleverTap', base: 'clevertap', atsType: 'greenhouse' as const },
  { name: 'Braze', base: 'braze', atsType: 'greenhouse' as const },
  { name: 'Leanplum', base: 'leanplum', atsType: 'greenhouse' as const },
  { name: 'OneSignal', base: 'onesignal', atsType: 'greenhouse' as const },
  { name: 'Pushwoosh', base: 'pushwoosh', atsType: 'greenhouse' as const },
  { name: 'Airship', base: 'airship', atsType: 'greenhouse' as const },
  { name: 'Firebase', base: 'firebase', atsType: 'greenhouse' as const },
  { name: 'Appsee', base: 'appsee', atsType: 'greenhouse' as const },
  { name: 'Adjust', base: 'adjust', atsType: 'greenhouse' as const },
  { name: 'AppsFlyer', base: 'appsflyer', atsType: 'greenhouse' as const },
  { name: 'Branch', base: 'branch', atsType: 'greenhouse' as const },
  { name: 'Kochava', base: 'kochava', atsType: 'greenhouse' as const },
  { name: 'Singular', base: 'singular', atsType: 'greenhouse' as const },
  { name: 'Chartboost', base: 'chartboost', atsType: 'greenhouse' as const },
  { name: 'Unity Ads', base: 'unity3d', atsType: 'greenhouse' as const },
  { name: 'AppLovin', base: 'applovin', atsType: 'greenhouse' as const },
  { name: 'Vungle', base: 'vungle', atsType: 'greenhouse' as const },
  { name: 'ironSource', base: 'ironsource', atsType: 'greenhouse' as const },
  { name: 'Liftoff', base: 'liftoff', atsType: 'greenhouse' as const },
  { name: 'Moloco', base: 'moloco', atsType: 'greenhouse' as const },
  { name: 'Reddit', base: 'reddit', atsType: 'greenhouse' as const },
  { name: 'Pinterest', base: 'pinterest', atsType: 'greenhouse' as const },
  { name: 'Snap', base: 'snap', atsType: 'greenhouse' as const },
  { name: 'Twitter', base: 'twitter', atsType: 'greenhouse' as const },
  { name: 'TikTok', base: 'tiktok', atsType: 'greenhouse' as const },
  { name: 'Meta', base: 'meta', atsType: 'greenhouse' as const },
  { name: 'Google', base: 'google', atsType: 'greenhouse' as const },
  { name: 'Apple', base: 'apple', atsType: 'greenhouse' as const },
  { name: 'Microsoft', base: 'microsoft', atsType: 'greenhouse' as const },
  { name: 'Amazon', base: 'amazon', atsType: 'greenhouse' as const },
  { name: 'IBM', base: 'ibm', atsType: 'greenhouse' as const },
  { name: 'Oracle', base: 'oracle', atsType: 'greenhouse' as const },
  { name: 'SAP', base: 'sap', atsType: 'greenhouse' as const },
  { name: 'Intel', base: 'intel', atsType: 'greenhouse' as const },
  { name: 'AMD', base: 'amd', atsType: 'greenhouse' as const },
  { name: 'Qualcomm', base: 'qualcomm', atsType: 'greenhouse' as const },
  { name: 'Texas Instruments', base: 'ti', atsType: 'greenhouse' as const },
  { name: 'NVIDIA', base: 'nvidia', atsType: 'greenhouse' as const },
  { name: 'Baidu', base: 'baidu', atsType: 'greenhouse' as const },
  { name: 'Tencent', base: 'tencent', atsType: 'greenhouse' as const },
  { name: 'Alibaba', base: 'alibaba', atsType: 'greenhouse' as const },
  { name: 'ByteDance', base: 'bytedance', atsType: 'greenhouse' as const },
  { name: 'Uber', base: 'uber', atsType: 'greenhouse' as const },
  { name: 'Lyft', base: 'lyft', atsType: 'greenhouse' as const },
  { name: 'DoorDash', base: 'doordash', atsType: 'greenhouse' as const },
  { name: 'Uber Eats', base: 'ubereats', atsType: 'greenhouse' as const },
  { name: 'Grubhub', base: 'grubhub', atsType: 'greenhouse' as const },
  { name: 'Postmates', base: 'postmates', atsType: 'greenhouse' as const },
  { name: 'Instacart', base: 'instacart', atsType: 'greenhouse' as const },
  { name: 'Shipt', base: 'shipt', atsType: 'greenhouse' as const },
  { name: 'Amazon Fresh', base: 'amazon', atsType: 'greenhouse' as const },
  { name: 'Whole Foods', base: 'wholefoods', atsType: 'greenhouse' as const },
  { name: 'Target', base: 'target', atsType: 'greenhouse' as const },
  { name: 'Walmart', base: 'walmart', atsType: 'greenhouse' as const },
  { name: 'Costco', base: 'costco', atsType: 'greenhouse' as const },
  { name: 'Best Buy', base: 'bestbuy', atsType: 'greenhouse' as const },
  { name: 'Home Depot', base: 'homedepot', atsType: 'greenhouse' as const },
  { name: 'Lowe\'s', base: 'lowes', atsType: 'greenhouse' as const },
  { name: 'Macy\'s', base: 'macys', atsType: 'greenhouse' as const },
  { name: 'Nordstrom', base: 'nordstrom', atsType: 'greenhouse' as const },
  { name: 'Kroger', base: 'kroger', atsType: 'greenhouse' as const },
  { name: 'CVS Health', base: 'cvs', atsType: 'greenhouse' as const },
  { name: 'Walgreens', base: 'walgreens', atsType: 'greenhouse' as const },
  { name: 'Rite Aid', base: 'riteaid', atsType: 'greenhouse' as const },
  { name: 'UnitedHealth', base: 'unitedhealth', atsType: 'greenhouse' as const },
  { name: 'Cigna', base: 'cigna', atsType: 'greenhouse' as const },
  { name: 'Anthem', base: 'anthem', atsType: 'greenhouse' as const },
  { name: 'Humana', base: 'humana', atsType: 'greenhouse' as const },
  { name: 'Kaiser Permanente', base: 'kaiser', atsType: 'greenhouse' as const },
  { name: 'HCA Healthcare', base: 'hcahealthcare', atsType: 'greenhouse' as const },
  { name: 'CommonSpirit Health', base: 'commonspirit', atsType: 'greenhouse' as const },
  { name: 'Mayo Clinic', base: 'mayoclinic', atsType: 'greenhouse' as const },
  { name: 'Cleveland Clinic', base: 'clevelandclinic', atsType: 'greenhouse' as const },
  { name: 'Johns Hopkins', base: 'jhu', atsType: 'greenhouse' as const },
  { name: 'UCLA Health', base: 'ucla', atsType: 'greenhouse' as const },
  { name: 'Cedars-Sinai', base: 'cedars-sinai', atsType: 'greenhouse' as const },
  { name: 'Mount Sinai', base: 'mountsinai', atsType: 'greenhouse' as const },
  { name: 'NYU Langone', base: 'nyulangone', atsType: 'greenhouse' as const },
];

// Career URL patterns for different ATS types
const ATS_URL_PATTERNS = {
  greenhouse: (base: string) => `https://boards.greenhouse.io/${base}`,
  lever: (base: string) => `https://jobs.lever.co/${base}`,
  workday: (base: string) => `https://${base}.wd5.myworkdayjobs.com/${base}`,
  custom: (base: string) => `https://${base}.com/careers`,
};

export class CompanyDiscoveryService {
  private discoveredCompanies: Map<string, DiscoveredCompany> = new Map();

  constructor() {
    // Initialize with known companies
    for (const company of KNOWN_COMPANIES) {
      this.discoveredCompanies.set(company.name.toLowerCase(), company);
    }
  }

  /**
   * Discover companies from Wikipedia list
   */
  async discoverFromWikipedia(): Promise<DiscoveredCompany[]> {
    const companies: DiscoveredCompany[] = [];
    
    // Common Wikipedia pages with company lists
    const wikipediaLists = [
      'https://en.wikipedia.org/wiki/List_of_largest_technology_companies_by_revenue',
      'https://en.wikipedia.org/wiki/Fortune_1000',
      'https://en.wikipedia.org/wiki/List_of Unicorn startup companies',
    ];

    for (const url of wikipediaLists) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; RecrutasBot/1.0)',
          },
        });
        const html = await response.text();
        
        // Extract company names (simplified - in production use proper parsing)
        const companyMatches = html.match(/<a[^>]*title="([^"]+)"[^>]*>(?:[A-Z][a-z]+(?: [A-Z][a-z]+)+)<\/a>/g);
        
        if (companyMatches) {
          for (const match of companyMatches.slice(0, 50)) {
            const nameMatch = match.match(/title="([^"]+)"/);
            if (nameMatch) {
              const name = nameMatch[1];
              if (name && name.length > 2 && !name.includes('List of')) {
                const company = this.generateCompanyFromPattern(name);
                if (company && !this.discoveredCompanies.has(company.name.toLowerCase())) {
                  companies.push(company);
                  this.discoveredCompanies.set(company.name.toLowerCase(), company);
                }
              }
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch Wikipedia list: ${url}`, error);
      }
    }

    console.log(`[CompanyDiscovery] Discovered ${companies.length} companies from Wikipedia`);
    return companies;
  }

  /**
   * Generate company from name pattern
   */
  private generateCompanyFromPattern(name: string): DiscoveredCompany {
    const base = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    return {
      name,
      careerUrl: ATS_URL_PATTERNS.custom(base),
      atsType: 'unknown',
      source: 'pattern',
      confidence: 0.5,
    };
  }

  /**
   * Get all discovered companies
   */
  getAllCompanies(): DiscoveredCompany[] {
    return Array.from(this.discoveredCompanies.values());
  }

  /**
   * Get companies by ATS type
   */
  getCompaniesByAtsType(atsType: string): DiscoveredCompany[] {
    return Array.from(this.discoveredCompanies.values())
      .filter(c => c.atsType === atsType);
  }

  /**
   * Add a new company to the discovery list
   */
  addCompany(company: DiscoveredCompany): void {
    this.discoveredCompanies.set(company.name.toLowerCase(), company);
  }

  /**
   * Get company count by source
   */
  getStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const company of this.discoveredCompanies.values()) {
      stats[company.source] = (stats[company.source] || 0) + 1;
    }
    return stats;
  }

  /**
   * Generate full company list with URLs for scraping
   */
  generateScrapableList(): DiscoveredCompany[] {
    const companies: DiscoveredCompany[] = [];
    
    for (const pattern of EXTENDED_COMPANIES_PATTERN) {
      const key = pattern.name.toLowerCase();
      if (!this.discoveredCompanies.has(key)) {
        // Try to generate career URL based on ATS type
        const urlGenerator = ATS_URL_PATTERNS[pattern.atsType] || ATS_URL_PATTERNS.custom;
        
        const company: DiscoveredCompany = {
          name: pattern.name,
          careerUrl: urlGenerator(pattern.base),
          atsType: pattern.atsType,
          atsId: pattern.base,
          source: 'pattern',
          confidence: 0.7,
        };
        
        companies.push(company);
        this.discoveredCompanies.set(key, company);
      }
    }

    // Add all from known companies
    for (const company of KNOWN_COMPANIES) {
      if (!this.discoveredCompanies.has(company.name.toLowerCase())) {
        this.discoveredCompanies.set(company.name.toLowerCase(), company);
        companies.push(company);
      }
    }

    return this.getAllCompanies();
  }
}

export const companyDiscoveryService = new CompanyDiscoveryService();
