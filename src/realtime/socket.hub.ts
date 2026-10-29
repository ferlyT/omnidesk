import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { AuthenticatedUser } from '../modules/auth/auth.middleware.js';

const JWT_SECRET = process.env.JWT_SECRET || 'omnichannel_super_secret_jwt_key_2026!';

export class SocketHub {
  private static instance: SocketHub;
  private io: SocketIOServer | null = null;

  public static getInstance(): SocketHub {
    if (!SocketHub.instance) {
      SocketHub.instance = new SocketHub();
    }
    return SocketHub.instance;
  }

  public init(httpServer: HttpServer): void {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    this.io.use((socket: Socket, next) => {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error('Authentication error: Missing token'));
      }

      try {
        const decoded = jwt.verify(token as string, JWT_SECRET) as AuthenticatedUser;
        socket.data.user = decoded;
        next();
      } catch (err) {
        next(new Error('Authentication error: Invalid token'));
      }
    });

    this.io.on('connection', (socket: Socket) => {
      const user = socket.data.user as AuthenticatedUser;
      console.log(`[SocketHub] User connected: ${user.username} (${user.role})`);

      // Otomatis join room berdasarkan role
      if (user.role === 'ADMIN' || user.role === 'SUPERVISOR') {
        socket.join('supervisors');
        socket.join('agents');
      } else if (user.role === 'AGENT') {
        socket.join('agents');
      }

      // Join ruang obrolan tiket tertentu untuk live spectator / chat
      socket.on('ticket:join', (ticketId: number) => {
        socket.join(`ticket_${ticketId}`);
        console.log(`[SocketHub] ${user.username} joined room ticket_${ticketId}`);
      });

      socket.on('ticket:leave', (ticketId: number) => {
        socket.leave(`ticket_${ticketId}`);
      });

      socket.on('disconnect', () => {
        console.log(`[SocketHub] User disconnected: ${user.username}`);
      });
    });
  }

  public emitNewTicket(ticket: any): void {
    if (!this.io) return;
    this.io.to('agents').to('supervisors').emit('ticket:new', ticket);
  }

  public emitTicketClaimed(ticket: any): void {
    if (!this.io) return;
    this.io.to('agents').to('supervisors').emit('ticket:claimed', ticket);
  }

  public emitNewMessage(ticketId: number, message: any): void {
    if (!this.io) return;
    // Kirim ke room tiket dan seluruh SPV yang sedang live monitoring
    this.io.to(`ticket_${ticketId}`).to('supervisors').emit('message:new', { ticketId, message });
  }

  public emitInternalNote(ticketId: number, note: any): void {
    if (!this.io) return;
    // Internal note HANYA dikirim ke Agen yang menangani dan Supervisor
    this.io.to(`ticket_${ticketId}`).to('supervisors').emit('ticket:internal_note', { ticketId, note });
  }

  public emitTicketUpdated(ticket: any): void {
    if (!this.io) return;
    this.io.to('agents').to('supervisors').to(`ticket_${ticket.id}`).emit('ticket:updated', ticket);
  }

  public emitAuditLog(audit: any): void {
    if (!this.io) return;
    this.io.to('supervisors').emit('audit:new', audit);
  }

  public emitChannelStatus(data: any): void {
    if (!this.io) return;
    this.io.emit('channel:status', data);
  }
}
