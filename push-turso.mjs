import { createClient } from '@libsql/client';
import fs from 'fs';
import { execSync } from 'child_process';

async function pushToTurso() {
  console.log('Generating schema SQL from Prisma...');
  
  // 1. Ask Prisma to dump the SQL schema for our datamodel
  // This uses the local 'file:./dev.db' configured in .env so it bypasses validation
  execSync('npx prisma migrate diff --from-empty --to-schema-datamodel ./prisma/schema.prisma --script > init.sql', { stdio: 'inherit' });
  
  const sql = fs.readFileSync('init.sql', 'utf8');
  console.log('Generated SQL schema.');

  // 2. Connect directly to Turso using libSQL
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log('Pushing schema directly to Turso database...');
  try {
    // 3. Execute the SQL against the remote Turso DB
    await client.executeMultiple(sql);
    console.log('✅ Successfully populated Turso database!');
  } catch (e) {
    console.error('Failed to execute SQL:', e);
  }
}

pushToTurso();
