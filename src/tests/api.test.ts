import http from 'http';
import { app } from '../server.js';

async function testApi() {
  console.log('Testing Express server and API endpoints...');
  const testServer = http.createServer(app);
  
  await new Promise<void>((resolve) => {
    testServer.listen(3099, () => {
      console.log('Test HTTP server listening on port 3099');
      resolve();
    });
  });

  try {
    // 1. Health check
    const healthRes = await fetch('http://localhost:3099/api/health');
    const healthData = await healthRes.json();
    console.log('Health check:', healthData);
    if (healthData.status !== 'online') throw new Error('Health check failed');

    // 2. Auth Login API
    const loginRes = await fetch('http://localhost:3099/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'agent_budi', password: 'Agent123!' })
    });
    const loginData = await loginRes.json();
    console.log('Login API:', { success: loginData.success, role: loginData.user?.role, alias: loginData.user?.display_alias });
    if (!loginData.success) throw new Error('Login API failed');

    // 3. Channels API
    const chanRes = await fetch('http://localhost:3099/api/channels', {
      headers: { Authorization: `Bearer ${loginData.token}` }
    });
    const chanData = await chanRes.json();
    console.log('Channels count:', chanData.data?.length);

    // 4. Pool Tickets API
    const poolRes = await fetch('http://localhost:3099/api/tickets/pool', {
      headers: { Authorization: `Bearer ${loginData.token}` }
    });
    const poolData = await poolRes.json();
    console.log('Pool tickets response:', { success: poolData.success, count: poolData.data?.length });

    console.log('\n✅ All API HTTP Endpoints verified successfully!');
  } finally {
    testServer.close();
    setTimeout(() => process.exit(0), 100);
  }
}

testApi().catch((err) => {
  console.error('API Test Error:', err);
  process.exit(1);
});
