import fs from 'fs';
import path from 'path';

const clientDist = path.resolve('client/dist');
const rootDist = path.resolve('dist');

if (fs.existsSync(clientDist)) {
  fs.cpSync(clientDist, rootDist, { recursive: true });
  console.log('Successfully copied client/dist to root dist for multi-platform hosting');
} else {
  console.log('client/dist not found yet, skipping copy');
}

