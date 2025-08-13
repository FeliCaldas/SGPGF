import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authenticate, requireAdmin, hashPassword, verifyPassword } from "./auth";
import { loginUserSchema, adminLoginSchema, userLoginSchema, insertUserSchema, insertWeightRecordSchema, updateUserSchema } from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { z } from "zod";
import { config } from "./config";

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session middleware
  app.set("trust proxy", 1);
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: config.databaseUrl,
    createTableIfMissing: false,
    ttl: config.sessionTtl,
    tableName: "sessions",
  });

  app.use(session({
    secret: config.sessionSecret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: config.isProduction,
      maxAge: config.sessionTtl,
    },
  }));

  // Auth routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { cpf, password } = loginUserSchema.parse(req.body);
      
      const user = await storage.getUserByCpf(cpf);
      if (!user) {
        return res.status(401).json({ message: "CPF ou senha incorretos" });
      }

      const isValid = await verifyPassword(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "CPF ou senha incorretos" });
      }

      req.session!.userId = user.id;
      res.json({ message: "Login successful", user: { ...user, password: undefined } });
    } catch (error) {
      console.error("Login error:", error);
      res.status(400).json({ message: "Dados inválidos" });
    }
  });

  // Admin login route
  app.post('/api/auth/admin-login', async (req, res) => {
    try {
      const { cpf, password } = adminLoginSchema.parse(req.body);
      
      const user = await storage.getUserByCpf(cpf);
      if (!user || !user.isAdmin) {
        return res.status(401).json({ message: "CPF ou senha incorretos" });
      }

      const isValid = await verifyPassword(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "CPF ou senha incorretos" });
      }

      req.session!.userId = user.id;
      res.json({ message: "Login admin successful", user: { ...user, password: undefined } });
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(400).json({ message: "CPF ou senha inválidos. Verifique os dados e tente novamente." });
    }
  });

  // User login route (only CPF)
  app.post('/api/auth/user-login', async (req, res) => {
    try {
      const { cpf } = userLoginSchema.parse(req.body);
      
      const user = await storage.getUserByCpf(cpf);
      if (!user || user.isAdmin) {
        return res.status(401).json({ message: "CPF não encontrado no sistema ou não é um funcionário ativo" });
      }

      req.session!.userId = user.id;
      res.json({ message: "Login user successful", user: { ...user, password: undefined } });
    } catch (error) {
      console.error("User login error:", error);
      res.status(400).json({ message: "CPF inválido. Verifique o formato e tente novamente." });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session!.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Erro ao fazer logout" });
      }
      res.json({ message: "Logout successful" });
    });
  });

  app.get('/api/auth/user', authenticate, async (req, res) => {
    try {
      const userStats = await storage.getUserWithStats(req.user.id);
      res.json({ ...userStats, password: undefined });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User management routes
  app.get('/api/users', authenticate, requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users.map(user => ({ ...user, password: undefined })));
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get('/api/users/active', authenticate, requireAdmin, async (req, res) => {
    try {
      const users = await storage.getActiveUsers();
      const usersWithStats = await Promise.all(
        users.map(async (user) => {
          const userStats = await storage.getUserWithStats(user.id);
          return { ...userStats, password: undefined };
        })
      );
      res.json(usersWithStats);
    } catch (error) {
      console.error("Error fetching active users:", error);
      res.status(500).json({ message: "Failed to fetch active users" });
    }
  });

  app.post('/api/users', authenticate, requireAdmin, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Para usuários não administradores, a senha é opcional
      let hashedPassword = null;
      if (userData.isAdmin && userData.password) {
        hashedPassword = await hashPassword(userData.password);
      } else if (userData.password) {
        hashedPassword = await hashPassword(userData.password);
      }
      
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword || "",
      });
      
      res.json({ ...user, password: undefined });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(400).json({ message: "Failed to create user" });
    }
  });

  app.patch('/api/users/:id', authenticate, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = updateUserSchema.parse(req.body);
      
      if ((updates as any).password) {
        (updates as any).password = await hashPassword((updates as any).password);
      }
      
      const user = await storage.updateUser(id, updates);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ ...user, password: undefined });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(400).json({ message: "Failed to update user" });
    }
  });

  app.delete('/api/users/:id', authenticate, requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const success = await storage.deleteUser(userId);
      
      if (success) {
        res.json({ message: "User deleted successfully" });
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.get('/api/users/:id/stats', authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Only admins can see other users' stats
      if (!req.user?.isAdmin && req.user?.id !== id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const userStats = await storage.getUserWithStats(id);
      if (!userStats) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ ...userStats, password: undefined });
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  // Weight record routes
  app.post('/api/weight-records', authenticate, async (req, res) => {
    try {
      const recordData = insertWeightRecordSchema.parse(req.body);
      
      // Non-admins can only create records for themselves
      if (!req.user?.isAdmin && (recordData as any).userId !== req.user?.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const record = await storage.createWeightRecord(recordData);
      res.json(record);
    } catch (error) {
      console.error("Error creating weight record:", error);
      res.status(400).json({ message: "Failed to create weight record" });
    }
  });

  app.get('/api/weight-records', authenticate, async (req, res) => {
    try {
      const { userId, startDate, endDate } = req.query;
      
      let userIdFilter: number | undefined;
      if (userId) {
        userIdFilter = parseInt(userId as string);
        
        // Non-admins can only see their own records
        if (!req.user?.isAdmin && userIdFilter !== req.user?.id) {
          return res.status(403).json({ message: "Forbidden" });
        }
      } else if (!req.user?.isAdmin) {
        // Non-admins can only see their own records
        userIdFilter = req.user?.id;
      }
      
      const records = await storage.getWeightRecords(
        userIdFilter,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      
      res.json(records);
    } catch (error) {
      console.error("Error fetching weight records:", error);
      res.status(500).json({ message: "Failed to fetch weight records" });
    }
  });

  app.patch('/api/weight-records/:id', authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      // For non-admins, verify they own the record
      if (!req.user?.isAdmin) {
        const existingRecord = await storage.getWeightRecords();
        const record = existingRecord.find(r => r.id === id);
        if (!record || record.userId !== req.user?.id) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      
      const record = await storage.updateWeightRecord(id, updates);
      if (!record) {
        return res.status(404).json({ message: "Record not found" });
      }
      
      res.json(record);
    } catch (error) {
      console.error("Error updating weight record:", error);
      res.status(400).json({ message: "Failed to update weight record" });
    }
  });

  app.delete('/api/weight-records/:id', authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // For non-admins, verify they own the record
      if (!req.user?.isAdmin) {
        const existingRecord = await storage.getWeightRecords();
        const record = existingRecord.find(r => r.id === id);
        if (!record || record.userId !== req.user?.id) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      
      const success = await storage.deleteWeightRecord(id);
      if (!success) {
        return res.status(404).json({ message: "Record not found" });
      }
      
      res.json({ message: "Record deleted successfully" });
    } catch (error) {
      console.error("Error deleting weight record:", error);
      res.status(500).json({ message: "Failed to delete weight record" });
    }
  });

  // Analytics routes
  app.get('/api/analytics/daily-stats', authenticate, requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getDailyStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching daily stats:", error);
      res.status(500).json({ message: "Failed to fetch daily stats" });
    }
  });

  // Earnings routes
  app.get('/api/earnings/users', authenticate, requireAdmin, async (req, res) => {
    try {
      const userEarnings = await storage.getAllUsersEarnings();
      res.json(userEarnings);
    } catch (error) {
      console.error("Error fetching user earnings:", error);
      res.status(500).json({ message: "Failed to fetch user earnings" });
    }
  });

  app.get('/api/earnings/user/:userId', authenticate, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Non-admins can only see their own earnings
      if (!req.user?.isAdmin && req.user?.id !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const userEarnings = await storage.getUserEarnings(userId);
      if (!userEarnings) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(userEarnings);
    } catch (error) {
      console.error("Error fetching user earnings:", error);
      res.status(500).json({ message: "Failed to fetch user earnings" });
    }
  });

  // Settings routes
  app.get('/api/settings', authenticate, requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getAllSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.put('/api/settings/:key', authenticate, requireAdmin, async (req, res) => {
    try {
      const { key } = req.params;
      const { value } = req.body;
      
      if (!value) {
        return res.status(400).json({ message: "Value is required" });
      }
      
      const setting = await storage.setSetting(key, value);
      res.json(setting);
    } catch (error) {
      console.error("Error updating setting:", error);
      res.status(500).json({ message: "Failed to update setting" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}