#!/usr/bin/env node

/**
 * One-off script to upload the Software Factory logo to the production tenant.
 * 
 * Usage:
 *   node upload-software-factory-logo.js
 *
 * This script:
 * 1. Logs in as eric@aiop.one (current password: abc123)
 * 2. Uploads logos/software-factory/icon-192.png via the official logo upload API
 * 3. Prints the result
 *
 * Run this from the project root.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === CONFIG ===
const API_BASE = 'https://eos-platform-production.up.railway.app/api/v1';
const EMAIL = 'eric@aiop.one';
const PASSWORD = 'abc123';
const LOGO_PATH = path.join(__dirname, 'logos', 'software-factory', 'icon-192.png');
// ==============

async function main() {
  console.log('🚀 Software Factory Logo Uploader\n');
  console.log(`API: ${API_BASE}`);
  console.log(`User: ${EMAIL}`);
  console.log(`Logo: ${LOGO_PATH}\n`);

  if (!fs.existsSync(LOGO_PATH)) {
    console.error(`❌ Logo file not found at: ${LOGO_PATH}`);
    process.exit(1);
  }

  try {
    // Step 1: Login using native fetch
    console.log('🔐 Logging in...');
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });

    if (!loginRes.ok) {
      const errText = await loginRes.text();
      throw new Error(`Login failed (${loginRes.status}): ${errText}`);
    }

    const loginData = await loginRes.json();
    const accessToken = loginData?.data?.accessToken;
    if (!accessToken) {
      throw new Error('Login succeeded but no accessToken returned. Full response: ' + JSON.stringify(loginData));
    }
    console.log('✅ Login successful. Got access token.\n');

    // Step 2: Upload logo using native FormData + fetch
    console.log('📤 Uploading logo...');

    const logoBuffer = fs.readFileSync(LOGO_PATH);
    const form = new FormData();
    form.append('logo', new Blob([logoBuffer], { type: 'image/png' }), 'logo.png');

    const uploadRes = await fetch(`${API_BASE}/organizations/current/logo`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        // Note: Do NOT set Content-Type manually — fetch will set the correct multipart boundary
      },
      body: form,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Logo upload failed (${uploadRes.status}): ${errText}`);
    }

    const uploadData = await uploadRes.json();
    console.log('✅ Logo upload successful!\n');
    console.log('Response:', JSON.stringify(uploadData, null, 2));

    // Step 3: Verify by fetching the organization
    console.log('\n🔍 Fetching organization to confirm logo fields...');
    const orgRes = await fetch(`${API_BASE}/organizations/current`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!orgRes.ok) {
      console.warn('Could not fetch org details for verification.');
    } else {
      const orgData = await orgRes.json();
      const org = orgData?.data || orgData;
      console.log('Organization logo fields:');
      console.log({
        logo_url: org.logo_url,
        logo_mime_type: org.logo_mime_type,
        logo_size: org.logo_size,
        logo_updated_at: org.logo_updated_at,
      });
    }

    console.log('\n🎉 Done! The Software Factory logo should now be live in production.');
    console.log('   Tell Eric to hard refresh the app (Cmd/Ctrl + Shift + R) or log out/in to see the new logo in the top-left.');

  } catch (error) {
    console.error('\n❌ Error during logo upload process:');
    console.error(error.message);
    if (error.cause) console.error('Cause:', error.cause);
    process.exit(1);
  }
}

main();