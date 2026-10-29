import { getDbPool } from '../database/connection.js';
import { AuthService } from '../modules/auth/auth.service.js';
import { TicketService } from '../modules/tickets/ticket.service.js';
import { PrefixInjectorService } from '../modules/messages/prefix-injector.service.js';
import { SupervisorService } from '../modules/supervisor/supervisor.service.js';
import { BillingService } from '../modules/billing/billing.service.js';
import { CustomerService } from '../modules/customers/customer.service.js';
import { RoleService } from '../modules/roles/role.service.js';
import { WorkspaceService } from '../modules/workspaces/workspace.service.js';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    throw new Error(`Test failed: ${testName}`);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING OMNICHANNEL INTEGRATION & VERIFICATION TESTS');
  console.log('====================================================\n');

  // TEST 1: MS SQL Server Connection
  console.log('👉 [Test 1] Database Connection');
  const pool = await getDbPool();
  const dbCheck = await pool.request().query('SELECT DB_NAME() as current_db, @@VERSION as ver');
  assert(dbCheck.recordset[0].current_db === 'BillingOmnichannel', 'Connected to MS SQL database BillingOmnichannel');

  // TEST 2: Authentication & RBAC
  console.log('\n👉 [Test 2] Authentication & RBAC');
  const agentLogin = await AuthService.login('agent_budi', 'Agent123!');
  assert(agentLogin.user.role === 'AGENT', 'Agent role is AGENT');
  assert(agentLogin.user.display_alias === 'CS Budi', 'Agent display alias is CS Budi');
  assert(typeof agentLogin.token === 'string' && agentLogin.token.length > 20, 'Agent JWT token generated');

  const spvLogin = await AuthService.login('spv_dimas', 'Spv123!');
  assert(spvLogin.user.role === 'SUPERVISOR', 'Supervisor role is SUPERVISOR');
  assert(spvLogin.user.display_alias === 'SPV Dimas', 'Supervisor display alias is SPV Dimas');

  // TEST 3: Inbound Message Ingestion & Claim Pool Creation
  console.log('\n👉 [Test 3] Inbound Message & Unassigned Pool');
  const testPhone = '628999888777';
  const customerName = 'Bapak Hendra (Tester)';
  await TicketService.handleInboundMessage({
    channelType: 'WHATSAPP',
    channelId: 1,
    senderId: testPhone,
    senderName: customerName,
    content: 'Halo CS, tolong cek tagihan internet saya bulan ini',
    externalMessageId: `test_msg_${Date.now()}`,
    timestamp: new Date()
  });

  const poolTickets = await TicketService.getClaimPoolTickets();
  const createdTicket = poolTickets.find((t: any) => t.phone_number === testPhone);
  assert(Boolean(createdTicket), 'Ticket created in Unassigned Pool');
  assert(createdTicket.status === 'UNASSIGNED', 'Ticket status is UNASSIGNED');
  assert(createdTicket.ticket_number.startsWith('TKT-'), 'Ticket number generated with TKT- prefix');
  const ticketId = createdTicket.id;

  // TEST 4: Agent Claims Ticket (Manual Claim Pool)
  console.log('\n👉 [Test 4] Agent Claim Pool Action');
  const claimedTicket = await TicketService.claimTicket(ticketId, agentLogin.user);
  assert(claimedTicket.status === 'ASSIGNED', 'Ticket status updated to ASSIGNED');
  assert(claimedTicket.assigned_to_user_id === agentLogin.user.id, 'Assigned user is CS Budi');

  // Verify Audit Log
  const details = await TicketService.getTicketDetails(ticketId);
  const claimLog = details.auditLogs.find((l: any) => l.action === 'CLAIMED');
  assert(Boolean(claimLog), 'Audit log entry for CLAIMED recorded in MS SQL');

  // TEST 5: Dynamic Agent Prefix Injection
  console.log('\n👉 [Test 5] Dynamic Agent Prefix Injection');
  const agentReply = await TicketService.replyToTicket(
    ticketId,
    'Selamat siang Pak Hendra, kami bantu cek tagihan Anda ya.',
    agentLogin.user
  );

  assert(agentReply.content === 'Selamat siang Pak Hendra, kami bantu cek tagihan Anda ya.', 'Internal content remains pure');
  assert(agentReply.injected_prefix === '*[CS Budi]*:', 'Outbound prefix dynamically injected as *[CS Budi]*:');

  const ticketAfterReply = await TicketService.getTicketById(ticketId);
  assert(ticketAfterReply.status === 'WAITING_CUSTOMER', 'Ticket status updated to WAITING_CUSTOMER');
  assert(Boolean(ticketAfterReply.first_response_at), 'First Response Time (FRT) SLA timestamp recorded');

  // TEST 6: Supervisor Whispering & Takeover
  console.log('\n👉 [Test 6] Supervisor Whispering & Takeover');
  // Internal Note
  const whisper = await TicketService.addInternalNote(
    ticketId,
    'Catatan SPV: Pelanggan loyal 2 tahun, infokan promo loyalty diskon 15%.',
    spvLogin.user
  );
  assert(whisper.author_name === 'SPV Dimas', 'Whisper author is SPV Dimas');

  const updatedDetails = await TicketService.getTicketDetails(ticketId);
  assert(updatedDetails.internalNotes.length > 0, 'Internal note saved in MS SQL InternalNotes table');

  // Takeover
  const takeoverTicket = await TicketService.takeoverTicket(ticketId, spvLogin.user, undefined, 'Eskalasi prioritas');
  assert(takeoverTicket.assigned_to_user_id === spvLogin.user.id, 'Ticket successfully taken over by SPV');

  // SPV replies to customer with dynamic prefix
  const spvReply = await TicketService.replyToTicket(
    ticketId,
    'Halo Pak Hendra, saya Dimas dari Supervisor melanjutkan penanganan tiket Anda.',
    spvLogin.user
  );
  assert(spvReply.injected_prefix === '*[SPV Dimas]*:', 'Dynamic prefix automatically adjusted to SPV identity (*[SPV Dimas]*:)');

  // TEST 7: Modular Billing Lookup
  console.log('\n👉 [Test 7] Modular Billing Lookup');
  const billingInfo = await BillingService.lookupCustomerBilling(testPhone);
  assert(Boolean(billingInfo), 'Billing record retrieved');
  assert(billingInfo?.current_bill_amount === 385000, 'Bill amount is Rp 385.000');
  assert(billingInfo?.status === 'UNPAID', 'Billing status is UNPAID');

  // TEST 8: Supervisor Overview Metrics
  console.log('\n👉 [Test 8] Supervisor Overview & Metrics');
  const spvOverview = await SupervisorService.getOverviewMetrics();
  assert(typeof spvOverview.metrics.active_count === 'number', 'Active tickets metric count retrieved');
  assert(spvOverview.agentWorkloads.length > 0, 'Agent workload table populated');

  // TEST 9: Resolve Ticket
  console.log('\n👉 [Test 9] Resolve Ticket');
  const resolved = await TicketService.resolveTicket(ticketId, spvLogin.user);
  assert(resolved.status === 'RESOLVED', 'Ticket status updated to RESOLVED');
  assert(Boolean(resolved.resolved_at), 'Resolution timestamp recorded');

  // TEST 10: Inbound & Outbound Media Messages (Image & Document)
  console.log('\n👉 [Test 10] Media Ingestion & Dispatch');
  const mediaPhone = '628111222' + Math.floor(Math.random() * 899 + 100);
  await TicketService.handleInboundMessage({
    channelType: 'WHATSAPP',
    channelId: 1,
    senderId: mediaPhone,
    senderName: 'Ibu Rina (Media Tester)',
    content: 'Ini foto bukti transfer tagihan saya',
    messageType: 'IMAGE',
    mediaUrl: '/uploads/images/test_transfer.jpg',
    externalMessageId: `test_img_${Date.now()}`,
    timestamp: new Date()
  });

  const allPool = await TicketService.getClaimPoolTickets();
  const mediaTicket = allPool.find(t => t.phone_number === mediaPhone);
  assert(Boolean(mediaTicket), 'Media ticket created in claim pool');

  const mediaDetails = await TicketService.getTicketDetails(mediaTicket.id);
  const mediaMsg = mediaDetails.messages.find((m: any) => m.message_type === 'IMAGE');
  assert(Boolean(mediaMsg), 'Image message properly stored with message_type IMAGE');
  assert(mediaMsg.media_url === '/uploads/images/test_transfer.jpg', 'Image media_url matches');

  // Test Outbound Media
  const mockFile: any = {
    mimetype: 'application/pdf',
    filename: 'invoice_202610.pdf',
    path: 'public/uploads/documents/invoice_202610.pdf',
    originalname: 'Invoice_Internet_Oktober.pdf'
  };

  const outboundMedia = await TicketService.replyMediaToTicket(
    mediaTicket.id,
    mockFile,
    'Terlampir rincian invoice resmi Anda.',
    spvLogin.user
  );
  assert(outboundMedia.message_type === 'DOCUMENT', 'Outbound media saved as DOCUMENT');
  assert(outboundMedia.media_url.includes('invoice_202610.pdf'), 'Outbound media URL generated');
  assert(outboundMedia.injected_prefix === '*[SPV Dimas]*:', 'Prefix dynamically injected into media caption');

  // TEST 11: Customer CRM Profile Update & Persistence
  console.log('\n👉 [Test 11] Customer CRM Profile Update & Persistence');
  const custId = mediaTicket.customer_id;
  const initialCust = await CustomerService.getCustomerById(custId);
  assert(Boolean(initialCust), 'Customer record retrieved by ID');

  const updatedCust = await CustomerService.updateCustomer(custId, {
    full_name: 'Ibu Rina Permata VIP',
    email: 'rina.permata@acme.co.id',
    company_name: 'PT Acme Solusindo',
    customer_category: 'VIP',
    address: 'Jl. Sudirman Tower 8, Jakarta',
    notes: 'Pelanggan prioritas tinggi, tagihan auto-debit'
  }, spvLogin.user);

  assert(updatedCust.full_name === 'Ibu Rina Permata VIP', 'Customer full_name updated');
  assert(updatedCust.customer_category === 'VIP', 'Customer category set to VIP');
  assert(updatedCust.company_name === 'PT Acme Solusindo', 'Company name set properly');
  assert(updatedCust.email === 'rina.permata@acme.co.id', 'Email updated');
  assert(updatedCust.address === 'Jl. Sudirman Tower 8, Jakarta', 'Address persisted');
  assert(updatedCust.notes.includes('Pelanggan prioritas tinggi'), 'CRM notes persisted');

  // Verify through Ticket details query
  const updatedTicketDetails = await TicketService.getTicketById(mediaTicket.id);
  assert(updatedTicketDetails.customer_name === 'Ibu Rina Permata VIP', 'Ticket queries updated customer_name');
  assert(updatedTicketDetails.customer_category === 'VIP', 'Ticket queries updated customer_category');
  assert(updatedTicketDetails.company_name === 'PT Acme Solusindo', 'Ticket queries updated company_name');
  assert(updatedTicketDetails.email === 'rina.permata@acme.co.id', 'Ticket queries updated email');

  // TEST 12: Internal Division Contact Classification & Persistence
  console.log('\n👉 [Test 12] Internal Division Contact Classification & Persistence');
  const internalCust = await CustomerService.updateCustomer(custId, {
    contact_type: 'INTERNAL',
    division: 'Teknisi Jaringan & Lapangan',
    employee_id: 'EMP-9821'
  }, spvLogin.user);

  assert(internalCust.contact_type === 'INTERNAL', 'Contact type classified as INTERNAL');
  assert(internalCust.division === 'Teknisi Jaringan & Lapangan', 'Division name persisted');
  assert(internalCust.employee_id === 'EMP-9821', 'Employee ID persisted');

  const ticketInternal = await TicketService.getTicketById(mediaTicket.id);
  assert(ticketInternal.contact_type === 'INTERNAL', 'Ticket details reflect INTERNAL contact_type');
  assert(ticketInternal.division === 'Teknisi Jaringan & Lapangan', 'Ticket details reflect division');
  assert(ticketInternal.employee_id === 'EMP-9821', 'Ticket details reflect employee_id');

  // TEST 13: Admin User Management (Add User, Deactivate, Reactivate, Avatar)
  console.log('\n👉 [Test 13] Admin User Management (Add User, Deactivate, Reactivate, Avatar)');
  const testUsername = `agent_test_${Date.now()}`;
  const testEmail = `${testUsername}@company.com`;
  const createdUser = await AuthService.createUser({
    username: testUsername,
    display_alias: 'Staf Testing Alpha',
    email: testEmail,
    passwordPlain: 'Secret123!',
    role: 'AGENT',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
    is_active: true
  });

  assert(createdUser.id > 0, 'New user successfully inserted into database');
  assert(createdUser.username === testUsername, 'Username saved correctly');
  assert(createdUser.display_alias === 'Staf Testing Alpha', 'Display alias saved correctly');
  assert(createdUser.avatar_url.includes('unsplash'), 'Avatar URL saved correctly');
  assert(createdUser.is_active === true, 'New user default active is true');

  // Login with new user should succeed
  const testUserLogin = await AuthService.login(testUsername, 'Secret123!');
  assert(testUserLogin.token && testUserLogin.user.id === createdUser.id, 'New user can authenticate and login');
  assert(testUserLogin.user.avatar_url.includes('unsplash'), 'Logged in user payload contains avatar_url');

  // Deactivate user
  const deactivated = await AuthService.toggleUserActive(createdUser.id, false);
  assert(deactivated.is_active === false, 'User status successfully toggled to inactive');

  // Login with deactivated user should be blocked
  let loginBlocked = false;
  try {
    await AuthService.login(testUsername, 'Secret123!');
  } catch (err: any) {
    loginBlocked = err.message.includes('Akun dinonaktifkan');
  }
  assert(loginBlocked, 'Deactivated user is blocked from logging in with Akun dinonaktifkan error');

  // Reactivate user
  const reactivated = await AuthService.toggleUserActive(createdUser.id, true);
  assert(reactivated.is_active === true, 'User status successfully reactivated');

  const reactivatedLogin = await AuthService.login(testUsername, 'Secret123!');
  assert(reactivatedLogin.token !== null, 'Reactivated user can log in again');

  // Update avatar
  const updatedAvatarUser = await AuthService.updateUser(createdUser.id, {
    avatar_url: '/uploads/images/cs_avatar_new.png'
  });
  assert(updatedAvatarUser.avatar_url === '/uploads/images/cs_avatar_new.png', 'User avatar updated successfully');

  // TEST 14: Dynamic Role Creation & Granular Permissions
  console.log('\n👉 [Test 14] Dynamic Role Creation & Granular RBAC');
  const testRoleCode = `ROLE_FIN_${Date.now()}`;
  const customRole = await RoleService.createRole({
    role_code: testRoleCode,
    role_name: 'Staf VIP Billing & Keuangan',
    description: 'Menangani pembayaran prioritas dan tagihan corporate',
    permissions: ['ticket_view', 'ticket_claim', 'ticket_reply', 'whisper_internal']
  });
  assert(customRole.role_code === testRoleCode, 'Custom role code created correctly');
  assert(RoleService.hasPermission(customRole.permissions, 'ticket_reply') === true, 'Role has ticket_reply permission');
  assert(RoleService.hasPermission(customRole.permissions, 'manage_users') === false, 'Role does not have unassigned manage_users permission');

  // Verify system roles cannot be deleted
  let systemRoleBlocked = false;
  try {
    await RoleService.deleteRole(1); // ADMIN is ID 1 (system role)
  } catch (err: any) {
    systemRoleBlocked = err.message.includes('Role bawaan sistem tidak dapat dihapus');
  }
  assert(systemRoleBlocked, 'System roles cannot be deleted (is_system guard works)');

  // TEST 15: Dynamic Multi-Workspace & Agent Assignment
  console.log('\n👉 [Test 15] Dynamic Multi-Workspace & Assignment');
  const testWsCode = `WS_${Date.now()}`;
  const newWorkspace = await WorkspaceService.createWorkspace({
    code: testWsCode,
    name: 'Departemen Penagihan Prioritas',
    description: 'Workspace khusus pelanggan corporate prioritas tinggi',
    color: '#10B981',
    icon: 'receipt',
    member_user_ids: [agentLogin.user.id, spvLogin.user.id]
  });
  assert(newWorkspace.code === testWsCode, 'Workspace created with custom code');
  assert(newWorkspace.color === '#10B981', 'Workspace created with custom brand color');

  const wsMembers = await WorkspaceService.getWorkspaceMembers(newWorkspace.id);
  assert(wsMembers.length === 2, 'Workspace has 2 assigned members');
  assert(wsMembers.some(m => m.id === agentLogin.user.id), 'Agent is assigned to workspace');
  assert(wsMembers.some(m => m.id === spvLogin.user.id), 'Supervisor is assigned to workspace');

  // TEST 16: Channel-to-Workspace Inbound Routing
  console.log('\n👉 [Test 16] Channel-to-Workspace Inbound Routing');
  // Map Channel 2 (Telegram) to the new Workspace
  await WorkspaceService.mapChannelsToWorkspace(newWorkspace.id, [2]);
  const mappedWsId = await WorkspaceService.getWorkspaceForChannel(2);
  assert(mappedWsId === newWorkspace.id, 'Channel 2 is mapped to the new Workspace');

  // Ingest inbound message via Channel 2
  const routedSenderId = `tg_vip_${Date.now()}`;
  await TicketService.handleInboundMessage({
    channelType: 'TELEGRAM',
    channelId: 2,
    senderId: routedSenderId,
    senderName: 'VIP Client Corporate',
    content: 'Halo, kami butuh konfirmasi pelunasan tagihan invoice #9988',
    externalMessageId: `msg_tg_${Date.now()}`,
    timestamp: new Date()
  });

  // Verify ticket was routed directly to the new Workspace
  const wsPoolTickets = await TicketService.getClaimPoolTickets(newWorkspace.id);
  const routedTicket = wsPoolTickets.find(t => t.customer_name === 'VIP Client Corporate');
  assert(routedTicket !== undefined, 'Ticket found in the mapped Workspace claim pool');
  assert(routedTicket.workspace_id === newWorkspace.id, 'Ticket workspace_id accurately matches the mapped Workspace');
  assert(routedTicket.workspace_color === '#10B981', 'Ticket query includes workspace color metadata');

  // TEST 17: Workspace-Filtered Claim Pool & Agent Workspaces
  console.log('\n👉 [Test 17] Workspace-Filtered Queries & User Workspaces');
  const defaultPool = await TicketService.getClaimPoolTickets(1);
  assert(!defaultPool.some(t => t.id === routedTicket.id), 'Ticket does not appear in other unrelated Workspace pool');

  const agentWorkspaces = await WorkspaceService.getUserWorkspaces(agentLogin.user.id, agentLogin.user.role);
  assert(agentWorkspaces.some(w => w.id === newWorkspace.id), 'Agent can access assigned new Workspace');

  console.log('\n====================================================');
  console.log(`🎉 ALL TESTS PASSED! (${passedTests}/${totalTests} tests successful)`);
  console.log('====================================================\n');
  process.exit(0);
}

runTests().catch(err => {
  console.error('\n❌ TEST RUNNER FAILED:', err);
  process.exit(1);
});
