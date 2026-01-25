
import { createClient } from '@supabase/supabase-js';

// Upsert all profile data to Supabase 'profiles' table
export async function upsertSupabaseProfile(profile) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase is not configured. Add REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY to .env.local.');
  }
  // Use 'id' (uid) as primary key, or 'email' if you prefer
  const { data, error } = await supabase
    .from('profiles')
    .upsert([profile], { onConflict: ['id'] });
  if (error) throw error;
  return data;
}

const defaultTokenEndpoint = typeof window !== 'undefined' ? '/supabase-token' : null;

const tokenEndpoint = process.env.REACT_APP_SUPABASE_TOKEN_ENDPOINT || defaultTokenEndpoint;

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail fast so the app doesn't silently hang on uploads.
  // eslint-disable-next-line no-console
  console.warn(
    'Supabase is not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY in .env.local and restart the dev server.'
  );
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

const IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

export function validateImageFile(file) {
  if (!file) return 'Missing image file';
  const type = (file.type || '').toLowerCase();
  if (!IMAGE_TYPES.has(type)) return 'Invalid image format. Please upload a JPG, PNG, or WEBP image.';
  const maxBytes = 2 * 1024 * 1024;
  if (typeof file.size === 'number' && file.size > maxBytes) return 'Image too large. Max size is 2MB.';
  return null;
}

export async function uploadProfileImageToSupabase(firebaseUid, file) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase is not configured. Add REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY to .env.local.');
  }
  if (!firebaseUid) throw new Error('Missing uid');

  const validationError = validateImageFile(file);
  if (validationError) throw new Error(validationError);

  const bucket = 'profile-images';
  const path = `${firebaseUid}/profile.jpg`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: file.type || 'image/jpeg'
  });

  if (error) {
    throw new Error(error.message || 'Profile image upload failed.');
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  const publicUrl = data?.publicUrl || '';

  if (!publicUrl) {
    throw new Error('Upload succeeded, but could not resolve public image URL. Make sure the bucket is public or use signed URLs.');
  }

  return {
    photoURL: publicUrl,
    photoBucket: bucket,
    photoPath: `${bucket}/${path}`
  };
}

function createSupabaseClientWithJwt(supabaseJwt) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase is not configured. Add REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY to .env.local.');
  }
  if (!supabaseJwt) throw new Error('Missing Supabase JWT');
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${supabaseJwt}`
      }
    }
  });
}

// Exchange Firebase ID token -> Supabase JWT using backend
export async function getSupabaseJwtFromFirebaseUser(firebaseUser) {
  if (!tokenEndpoint) {
    throw new Error(
      'Missing Supabase token endpoint. Set REACT_APP_SUPABASE_TOKEN_ENDPOINT to your backend /supabase-token URL and restart the dev server.'
    );
  }
  if (!firebaseUser) throw new Error('Missing Firebase user');
  // Always request a fresh Firebase ID token so the backend verification doesn't fail
  // due to an expired cached token.
  const firebaseIdToken = await firebaseUser.getIdToken(true);

  let res;
  try {
    res = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${firebaseIdToken}`
      }
    });
  } catch (fetchErr) {
    const msg = fetchErr?.message || String(fetchErr);
    if (String(msg).toLowerCase().includes('failed to fetch')) {
      throw new Error('Cannot reach backend for Supabase token exchange. Start backend server: open terminal in `server` folder and run `npm start` (port 5001).');
    }
    throw fetchErr;
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const details = json?.details ? ` (${json.details})` : '';
    throw new Error((json?.error || `Failed to get Supabase JWT (HTTP ${res.status})`) + details);
  }
  if (!json?.supabaseJwt) {
    throw new Error('Backend did not return supabaseJwt');
  }
  return json.supabaseJwt;
}

export async function uploadProfileImageToSupabasePrivate({ firebaseUid, file, supabaseJwt }) {
  const validationError = validateImageFile(file);
  if (validationError) throw new Error(validationError);
  if (!firebaseUid) throw new Error('Missing uid');

  const client = createSupabaseClientWithJwt(supabaseJwt);

  const bucket = 'profile-images';
  const objectPath = `${firebaseUid}/profile.jpg`;

  const { error } = await client.storage.from(bucket).upload(objectPath, file, {
    upsert: true,
    contentType: file.type || 'image/jpeg'
  });
  if (error) throw new Error(error.message || 'Profile image upload failed.');

  // Private bucket: use signed URL for display.
  const { data, error: signErr } = await client.storage
    .from(bucket)
    .createSignedUrl(objectPath, 60 * 60 * 24); // 24 hours
  if (signErr) throw new Error(signErr.message || 'Upload succeeded, but could not create a signed URL.');

  return {
    photoURL: data?.signedUrl || '',
    photoBucket: bucket,
    photoObjectPath: objectPath
  };
}

export async function createSignedUrlForObject({ bucket, objectPath, supabaseJwt, expiresInSeconds = 3600 }) {
  const client = createSupabaseClientWithJwt(supabaseJwt);
  const { data, error } = await client.storage.from(bucket).createSignedUrl(objectPath, expiresInSeconds);
  if (error) throw new Error(error.message || 'Failed to create signed URL');
  return data?.signedUrl || '';
}

export async function uploadPdfToSupabasePrivate({ firebaseUid, branch, subject, filename, file, supabaseJwt }) {
  if (!firebaseUid) throw new Error('Missing uid');
  if (!branch || !subject || !filename) throw new Error('Missing PDF path fields');
  if (!file) throw new Error('Missing PDF file');
  if ((file.type || '').toLowerCase() !== 'application/pdf') throw new Error('Only PDF files are allowed.');

  const client = createSupabaseClientWithJwt(supabaseJwt);
  const bucket = 'pdfs';

  const safeBranch = String(branch).trim();
  const safeSubject = String(subject).trim();
  const safeFilename = String(filename).trim().replace(/\s+/g, '-');

  // Keep RLS simple: always prefix by uid
  const objectPath = `${firebaseUid}/${safeBranch}/${safeSubject}/${safeFilename}.pdf`;

  const { error } = await client.storage.from(bucket).upload(objectPath, file, {
    upsert: true,
    contentType: 'application/pdf'
  });
  if (error) throw new Error(error.message || 'PDF upload failed.');

  // Private bucket: return a signed URL for immediate usage.
  const { data, error: signErr } = await client.storage.from(bucket).createSignedUrl(objectPath, 60 * 60 * 24);
  if (signErr) throw new Error(signErr.message || 'Upload succeeded, but could not create a signed URL.');

  return {
    pdfURL: data?.signedUrl || '',
    pdfBucket: bucket,
    pdfObjectPath: objectPath
  };
}

export async function uploadPdfToSupabase({ branch, subject, filename, file }) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase is not configured. Add REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY to .env.local.');
  }
  if (!branch || !subject || !filename) throw new Error('Missing PDF path fields');
  if (!file) throw new Error('Missing PDF file');
  if ((file.type || '').toLowerCase() !== 'application/pdf') throw new Error('Only PDF files are allowed.');

  const bucket = 'pdfs';
  const safeBranch = String(branch).trim();
  const safeSubject = String(subject).trim();
  const safeFilename = String(filename).trim().replace(/\s+/g, '-');
  const path = `${safeBranch}/${safeSubject}/${safeFilename}.pdf`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: 'application/pdf'
  });

  if (error) throw new Error(error.message || 'PDF upload failed.');

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  const publicUrl = data?.publicUrl || '';
  if (!publicUrl) {
    throw new Error('Upload succeeded, but could not resolve public PDF URL. Make sure the bucket is public or use signed URLs.');
  }

  return {
    pdfURL: publicUrl,
    pdfBucket: bucket,
    pdfPath: `${bucket}/${path}`
  };
}
