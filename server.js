// Entry point: run migrations, then start the HTTP server.
import { migrate } from './src/db/schema.js';
import { createApp } from './src/app.js';

migrate();

const PORT = process.env.PORT || 3000;
createApp().listen(PORT, () => console.log(`MealMate running at http://localhost:${PORT}`));
