import { getDbPool } from '../../database/connection.js';

export interface BillingRecord {
  account_id: string;
  customer_name: string;
  package_plan: string;
  current_bill_amount: number;
  currency: string;
  status: 'PAID' | 'UNPAID' | 'OVERDUE';
  due_date: string;
  payment_history: Array<{
    invoice_no: string;
    date: string;
    amount: number;
    status: string;
  }>;
}

export class BillingService {
  /**
   * Modular Customer Billing Lookup
   * Dapat dipanggil dari sidebar chat oleh agen atau SPV
   */
  static async lookupCustomerBilling(queryParam: string): Promise<BillingRecord | null> {
    const pool = await getDbPool();

    // 1. Coba cari di database Customers lokal
    const customerRes = await pool.request()
      .input('q', `%${queryParam}%`)
      .query(`
        SELECT TOP 1 id, full_name, phone_number, billing_account_id
        FROM Customers
        WHERE phone_number LIKE @q OR billing_account_id LIKE @q OR full_name LIKE @q
      `);

    const customer = customerRes.recordset[0];
    const customerName = customer ? customer.full_name : `Pelanggan (${queryParam})`;
    const accountId = customer?.billing_account_id || `BILL-${queryParam.replace(/\D/g, '').slice(-6) || '883921'}`;

    // 2. Format mock/modular billing data
    // Siap dihubungkan ke tabel Invoice / Billing ERP eksternal
    return {
      account_id: accountId,
      customer_name: customerName,
      package_plan: 'Omni Business Fiber 100 Mbps',
      current_bill_amount: 385000,
      currency: 'IDR',
      status: 'UNPAID',
      due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      payment_history: [
        {
          invoice_no: 'INV-2026-09-0012',
          date: '2026-09-15',
          amount: 385000,
          status: 'PAID'
        },
        {
          invoice_no: 'INV-2026-08-0098',
          date: '2026-08-14',
          amount: 385000,
          status: 'PAID'
        }
      ]
    };
  }

  /**
   * Tautkan billing account ID ke Customer di MS SQL
   */
  static async linkBillingAccount(customerId: number, billingAccountId: string): Promise<boolean> {
    const pool = await getDbPool();
    await pool.request()
      .input('id', customerId)
      .input('accId', billingAccountId)
      .query(`
        UPDATE Customers
        SET billing_account_id = @accId
        WHERE id = @id
      `);
    return true;
  }
}
