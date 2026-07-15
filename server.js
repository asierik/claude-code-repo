// Entry point: load env variables, run migrations, then start the HTTP server.
import 'dotenv/config';
import { migrateToLatest } from './src/db/migrator.js';
import { createApp } from './src/app.js';

await migrateToLatest();

const PORT = process.env.PORT || 3000;
createApp().listen(PORT, () => console.log(`MealMate running at http://localhost:${PORT}`));
