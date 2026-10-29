import { getDbPool } from '../../database/connection.js';

export class SupervisorService {
  /**
   * Mengambil statistik ringkasan operasional untuk SPV
   */
  static async getOverviewMetrics(): Promise<any> {
    const pool = await getDbPool();

    const countsRes = await pool.request().query(`
      SELECT 
        (SELECT COUNT(*) FROM Tickets WHERE status = 'UNASSIGNED') as unassigned_count,
        (SELECT COUNT(*) FROM Tickets WHERE status IN ('ASSIGNED', 'IN_PROGRESS', 'WAITING_CUSTOMER')) as active_count,
        (SELECT COUNT(*) FROM Tickets WHERE status = 'RESOLVED' AND CAST(resolved_at AS DATE) = CAST(SYSDATETIMEOFFSET() AS DATE)) as resolved_today_count,
        (SELECT COUNT(*) FROM Tickets WHERE is_sla_breached = 1 AND status NOT IN ('RESOLVED', 'CLOSED')) as sla_breached_count
    `);

    // Kinerja & Beban Kerja per Agen
    const agentWorkloadRes = await pool.request().query(`
      SELECT 
        u.id, u.username, u.display_alias, u.role, u.is_active,
        COUNT(CASE WHEN t.status IN ('ASSIGNED', 'IN_PROGRESS', 'WAITING_CUSTOMER') THEN 1 END) as active_tickets,
        COUNT(CASE WHEN t.status = 'RESOLVED' THEN 1 END) as total_resolved
      FROM Users u
      LEFT JOIN Tickets t ON u.id = t.assigned_to_user_id
      WHERE u.role IN ('AGENT', 'SUPERVISOR')
      GROUP BY u.id, u.username, u.display_alias, u.role, u.is_active
      ORDER BY active_tickets DESC
    `);

    return {
      metrics: countsRes.recordset[0],
      agentWorkloads: agentWorkloadRes.recordset
    };
  }

  /**
   * Mengambil seluruh Audit Trail Log terbaru
   */
  static async getAuditLogs(limit = 50): Promise<any[]> {
    const pool = await getDbPool();
    const res = await pool.request()
      .input('limit', limit)
      .query(`
        SELECT TOP (@limit)
          a.id, a.ticket_id, a.action, a.details, a.created_at,
          t.ticket_number,
          u.display_alias as user_name, u.role as user_role
        FROM TicketAuditLogs a
        JOIN Tickets t ON a.ticket_id = t.id
        LEFT JOIN Users u ON a.user_id = u.id
        ORDER BY a.id DESC
      `);
    return res.recordset;
  }
}
