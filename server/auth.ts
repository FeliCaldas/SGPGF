import { RequestHandler } from "express";
import { storage } from "./storage";
import bcrypt from "bcryptjs";

export const authenticate: RequestHandler = async (req, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await storage.getUser(req.session.userId);
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  req.user = user;
  next();
};

export const requireAdmin: RequestHandler = (req, res, next) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
};

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}