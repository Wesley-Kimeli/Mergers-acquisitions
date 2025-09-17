import 'dotenv/config';

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

const sql = neon(procss.env.DATABASE_SQL);

const db = drizzle(sql);

export { db, sql };