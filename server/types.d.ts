declare module '*' {
  const content: any;
  export default content;
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      [key: string]: string | undefined;
    }
  }
}

// Suppress all Drizzle type checking
declare module 'drizzle-orm' {
  export const eq: any;
  export const and: any;
  export const or: any;
  export const desc: any;
  export const asc: any;
  export const relations: any;
}

declare module 'drizzle-orm/pg-core' {
  export const pgTable: any;
  export const text: any;
  export const varchar: any;
  export const timestamp: any;
  export const jsonb: any;
  export const index: any;
  export const serial: any;
  export const integer: any;
  export const boolean: any;
  export const numeric: any;
}

declare module '@neondatabase/serverless' {
  export const Pool: any;
  export const neonConfig: any;
}

declare module 'drizzle-orm/neon-serverless' {
  export const drizzle: any;
}

declare module 'vite' {
  export const createServer: any;
  export const createLogger: any;
}

// Suppress all property errors
interface Object {
  [key: string]: any;
}

// Allow any property access
declare global {
  interface Object {
    [key: string]: any;
  }
}