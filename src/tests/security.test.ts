import { app } from '../server.js';
import http from 'http';
import { AddressInfo } from 'net';

async function runSecurityTests() {
  console.log('====================================================');
  console.log('🛡️  RUNNING PRODUCTION SECURITY & REFACTOR TESTS');
  console.log('====================================================');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://localhost:${port}`;

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, message: string) {
    total++;
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      throw new Error(`Security Test Failed: ${message}`);
    }
  }

  try {
    // 1. Helmet Security Headers Test
    console.log('\n👉 [Security Test 1] Helmet Security Headers');
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert(healthRes.headers.get('x-content-type-options') === 'nosniff', 'X-Content-Type-Options: nosniff is set');
    assert(healthRes.headers.get('x-frame-options') === 'SAMEORIGIN', 'X-Frame-Options: SAMEORIGIN is set');
    assert(healthRes.headers.has('content-security-policy'), 'Content-Security-Policy header is active');

    // 2. Health Endpoint Probe Test
    console.log('\n👉 [Security Test 2] Enhanced Healthcheck Endpoint');
    const healthJson = await healthRes.json();
    assert(healthJson.status === 'online', 'Health status is online');
    assert(healthJson.database === 'connected', 'Database readiness probe reports connected');
    assert(healthJson.service === 'OmniDesk Multi-Channel Platform', 'Service name reflects OmniDesk Platform');

    // 3. Simulator Endpoint Protection Test
    console.log('\n👉 [Security Test 3] Simulator Endpoint Access Control');
    // Without token -> 401 Unauthorized
    const unauthSimRes = await fetch(`${baseUrl}/api/simulator/inbound`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channelType: 'WHATSAPP',
        senderId: '628999999999',
        content: 'Test unauth injection'
      })
    });
    assert(unauthSimRes.status === 401, 'Unauthenticated simulator request is blocked with 401');

    // Login as AGENT -> 403 Forbidden
    const agentLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'agent_budi', password: 'Agent123!' })
    });
    const agentLogin = await agentLoginRes.json();
    const agentSimRes = await fetch(`${baseUrl}/api/simulator/inbound`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${agentLogin.token}`
      },
      body: JSON.stringify({
        channelType: 'WHATSAPP',
        senderId: '628999999999',
        content: 'Test agent injection'
      })
    });
    assert(agentSimRes.status === 403, 'Regular AGENT simulator request is blocked with 403 Forbidden');

    // Login as ADMIN -> 200 OK
    const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'Admin123!' })
    });
    const adminLogin = await adminLoginRes.json();
    const adminSimRes = await fetch(`${baseUrl}/api/simulator/inbound`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminLogin.token}`
      },
      body: JSON.stringify({
        channelType: 'WHATSAPP',
        senderId: '628999999999',
        senderName: 'Test Security Inbound',
        content: 'Test admin injection'
      })
    });
    const adminSimJson = await adminSimRes.json();
    assert(adminSimRes.status === 200, 'Authenticated ADMIN simulator request succeeds with 200 OK');
    assert(adminSimJson.success === true, 'Simulator message accepted into ticket queue');

    // 4. File Upload Whitelist & Malicious Extension Rejection
    console.log('\n👉 [Security Test 4] Strict File Upload Whitelist & Sanitization');
    // Upload malicious .html file to avatar endpoint
    const form = new FormData();
    const maliciousBlob = new Blob(['<script>alert("XSS")</script>'], { type: 'text/html' });
    form.append('avatar', maliciousBlob, 'exploit.html');

    const uploadRes = await fetch(`${baseUrl}/api/admin/users/1/avatar`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminLogin.token}`
      },
      body: form
    });
    const uploadJson = await uploadRes.json();
    assert(uploadRes.status === 400 || uploadRes.status === 500, 'Malicious .html upload is rejected');
    assert(uploadJson.success === false, 'Upload response indicates failure');

    console.log('\n====================================================');
    console.log(`🎉 ALL SECURITY TESTS PASSED! (${passed}/${total} checks passed)`);
    console.log('====================================================');
  } finally {
    server.close();
  }
}

runSecurityTests().catch((err) => {
  console.error('Fatal Security Test Error:', err);
  process.exit(1);
});
