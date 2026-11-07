import { db, DATABASE_PATH } from './db.ts';

try {
  console.log(`Initialized SQLite database: ${DATABASE_PATH}`);
  console.log(db.health());
} finally {
  db.close();
}
