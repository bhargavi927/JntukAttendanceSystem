import admin from '../config/firebaseAdmin.js';

export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [, token] = header.split(' ');
    if (!token) {
      console.warn('[Auth] Missing Authorization header');
      return res.status(401).json({ error: 'Missing Authorization header' });
    }

    const decoded = await admin.auth().verifyIdToken(token);
    req.user = { uid: decoded.uid, email: decoded.email || '' };
    next();
  } catch (err) {
    console.error('[Auth] Token verification failed:', err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
