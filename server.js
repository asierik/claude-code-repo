// Entry point: load env variables, run migrations, then start the HTTP server.
import 'dotenv/config';
import { migrate } from './src/db/schema.js';
import { createApp } from './src/app.js';

await migrate();

const PORT = process.env.PORT || 3000;
createApp().listen(PORT, () => console.log(`MealMate running at http://localhost:${PORT}`));
