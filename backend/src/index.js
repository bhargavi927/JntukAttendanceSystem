import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables FIRST, before any other imports
dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log('[index.js] Environment loaded');

async function start() {
  // Now import modules that depend on environment variables
  const { initializeSupabase } = await import('./config/supabaseClient.js');
  console.log('[index.js] Initializing Supabase...');
  initializeSupabase();
  console.log('[index.js] Supabase initialized');

  // Import Firebase admin to trigger initialization
  console.log('[index.js] Initializing Firebase Admin...');
  const admin = await import('./config/firebaseAdmin.js');
  console.log('[index.js] Firebase Admin initialized');

  // Create app and set up middleware
  const app = express();

  // CORS configuration to allow frontend and authorize Bearer tokens
  app.use(cors({
    origin: [
      'http://localhost:3000',      // React dev server
      'http://localhost:5173',       // Vite dev server (if applicable)
      'http://127.0.0.1:3000',       // Alternative localhost
      process.env.FRONTEND_URL       // Production frontend URL from env
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan('dev'));

  app.get('/health', (req, res) => res.json({ ok: true }));

  // Import routes (which depend on Firebase auth)
  console.log('[index.js] Importing routes...');
  const { default: professorProfileRoutes } = await import('./routes/professorProfile.js');
  const { default: studentProfileRoutes } = await import('./routes/studentProfile.js');
  const { default: attendancePermissionsRoutes } = await import('./routes/attendancePermissionsFixed.js');
  const { default: attendanceSubmissionsRoutes } = await import('./routes/attendanceSubmissions.js');
  const { default: timetableRoutes } = await import('./routes/timetable.js');
  const { default: lmsDriveFolderRoutes } = await import('./routes/lmsDriveFolder.js');
  const { default: lmsSubjectRoutes } = await import('./routes/lmsSubjectRoutes.js');
  console.log('[index.js] Routes imported');

  app.use('/api/professor-profile', professorProfileRoutes);
  app.use('/api/student-profile', studentProfileRoutes);
  app.use('/api/attendance-permissions', attendancePermissionsRoutes);
  app.use('/api/attendance-submissions', attendanceSubmissionsRoutes);
  app.use('/api/timetable', timetableRoutes);
  app.use('/api/lms', lmsSubjectRoutes);
  app.use('/api/lms', lmsDriveFolderRoutes);
  // app.use('/api/debug', debugAuthRoutes); // Temporary removed
  console.log('[index.js] Routes mounted');

  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  });

  const port = process.env.PORT || 5001;
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`✅ Backend listening on http://localhost:${port}`);
    console.log(`   Server address: ${JSON.stringify(server.address())}`);
  });

  server.on('error', (err) => {
    console.error('❌ Server error:', err);
    process.exit(1);
  });
}

start().catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
