import { app } from '../src/app';

// Vercel serverless functions require the Express app to be exported
// rather than manually started with app.listen().
export default app;
