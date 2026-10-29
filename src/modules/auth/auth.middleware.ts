import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'omnichannel_super_secret_jwt_key_2026!';

export interface AuthenticatedUser {
  id: number;
  username: string;
  display_alias: string;
  role: string;
  avatar_url?: string;
  permissions?: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

export function roleMiddleware(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || (!allowedRoles.includes(req.user.role) && req.user.role !== 'ADMIN')) {
      res.status(403).json({ success: false, message: 'Access denied: insufficient permissions' });
      return;
    }
    next();
  };
}

export function permissionMiddleware(requiredPermission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    // Admin always has full access
    if (req.user.role === 'ADMIN') {
      next();
      return;
    }
    if (req.user.permissions && req.user.permissions.includes(requiredPermission)) {
      next();
      return;
    }
    res.status(403).json({ success: false, message: `Access denied: missing required permission '${requiredPermission}'` });
  };
}
