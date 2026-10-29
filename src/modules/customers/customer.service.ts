import { getDbPool } from '../../database/connection.js';
import { AuthenticatedUser } from '../auth/auth.middleware.js';

export interface UpdateCustomerDto {
  full_name?: string;
  email?: string;
  company_name?: string;
  customer_category?: 'REGULER' | 'VIP' | 'BISNIS';
  address?: string;
  notes?: string;
  contact_type?: 'CUSTOMER' | 'INTERNAL' | 'VENDOR';
  division?: string;
  employee_id?: string;
}

export class CustomerService {
  static async getCustomerById(customerId: number) {
    const pool = await getDbPool();
    const result = await pool.request()
      .input('id', customerId)
      .query(`
        SELECT id, phone_number, telegram_user_id, full_name, email, company_name, customer_category, address, notes, contact_type, division, employee_id, channel_source, billing_account_id, created_at
        FROM Customers
        WHERE id = @id
      `);
    return result.recordset[0] || null;
  }

  static async updateCustomer(customerId: number, data: UpdateCustomerDto, actor?: AuthenticatedUser) {
    const pool = await getDbPool();
    
    // Check if customer exists
    const existing = await this.getCustomerById(customerId);
    if (!existing) {
      throw new Error('Pelanggan tidak ditemukan');
    }

    const fullName = data.full_name !== undefined ? data.full_name.trim() : existing.full_name;
    const email = data.email !== undefined ? data.email.trim() : existing.email;
    const companyName = data.company_name !== undefined ? data.company_name.trim() : existing.company_name;
    const customerCategory = data.customer_category || existing.customer_category || 'REGULER';
    const address = data.address !== undefined ? data.address.trim() : existing.address;
    const notes = data.notes !== undefined ? data.notes.trim() : existing.notes;
    const contactType = data.contact_type || existing.contact_type || 'CUSTOMER';
    const division = data.division !== undefined ? data.division.trim() : existing.division;
    const employeeId = data.employee_id !== undefined ? data.employee_id.trim() : existing.employee_id;

    await pool.request()
      .input('id', customerId)
      .input('full_name', fullName)
      .input('email', email || null)
      .input('company_name', companyName || null)
      .input('customer_category', customerCategory)
      .input('address', address || null)
      .input('notes', notes || null)
      .input('contact_type', contactType)
      .input('division', division || null)
      .input('employee_id', employeeId || null)
      .query(`
        UPDATE Customers
        SET full_name = @full_name,
            email = @email,
            company_name = @company_name,
            customer_category = @customer_category,
            address = @address,
            notes = @notes,
            contact_type = @contact_type,
            division = @division,
            employee_id = @employee_id
        WHERE id = @id
      `);

    // Audit log if actor provided
    if (actor) {
      try {
        await pool.request()
          .input('userId', actor.id)
          .input('action', 'CUSTOMER_UPDATED')
          .input('details', `Data pelanggan ${fullName} (ID: ${customerId}) diperbarui oleh ${actor.display_alias}`)
          .query(`
            INSERT INTO TicketAuditLogs (ticket_id, user_id, action, details)
            VALUES (
              COALESCE((SELECT TOP 1 id FROM Tickets WHERE customer_id = ${customerId} ORDER BY id DESC), 1),
              @userId, @action, @details
            )
          `);
      } catch (e) {
        // Non fatal audit log
      }
    }

    return await this.getCustomerById(customerId);
  }
}
