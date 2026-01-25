// Script to update a user's role in Firestore manually
// Usage: import and call updateUserRole(uid, 'professor' or 'student')
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

export async function updateUserRole(uid, newRole) {
  if (!uid || !newRole) throw new Error('UID and newRole are required');
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, { role: newRole });
  console.log(`Updated user ${uid} role to ${newRole}`);
}