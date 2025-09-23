import 'dotenv/config';

import {neon, neonConfig} from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

if(process.env.NODE_ENV === 'production') {
    neonConfig.fetchEndpoint = 'http://neon-local:3000/sql';
    neonConfig.useServiceUrl = false;
    neonConfig.poolQueryViaFetch = true;
}

const sql = neon(process.env.DATABASE_URL);

const db = drizzle(sql);

export { db, sql };