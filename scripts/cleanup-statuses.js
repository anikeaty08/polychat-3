// Script to cleanup expired statuses
// Can be run via cron job: node scripts/cleanup-statuses.js

const https = require('https');
const http = require('http');

const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET || '';

async function cleanupStatuses() {
  const url = new URL(`${API_URL}/api/status/cleanup`);
  const protocol = url.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(CRON_SECRET && { Authorization: `Bearer ${CRON_SECRET}` }),
      },
    };

    const req = protocol.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Status cleanup successful:', JSON.parse(data));
          resolve(JSON.parse(data));
        } else {
          console.error('❌ Status cleanup failed:', res.statusCode, data);
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request error:', error);
      reject(error);
    });

    req.end();
  });
}

// Run cleanup
cleanupStatuses()
  .then(() => {
    console.log('Cleanup completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Cleanup failed:', error);
    process.exit(1);
  });



