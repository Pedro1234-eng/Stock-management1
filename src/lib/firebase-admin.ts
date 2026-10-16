import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let firebaseConfig: { projectId?: string } = {};
try {
  const configPath = fs.existsSync(path.resolve(process.cwd(), 'firebase-applet-config.json'))
    ? path.resolve(process.cwd(), 'firebase-applet-config.json')
    : path.resolve(__dirname, '../../firebase-applet-config.json');

  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (e) {
  console.warn('Could not read firebase-applet-config.json:', e);
}

if (!getApps().length) {
  initializeApp({
    projectId: firebaseConfig.projectId || process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'pure-xyston-zpthm',
  });
}

export const adminAuth = getAuth();

