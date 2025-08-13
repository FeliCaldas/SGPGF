var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  adminLoginSchema: () => adminLoginSchema,
  insertUserSchema: () => insertUserSchema,
  insertWeightRecordSchema: () => insertWeightRecordSchema,
  loginUserSchema: () => loginUserSchema,
  sessions: () => sessions,
  settings: () => settings,
  settingsSchema: () => settingsSchema,
  updateUserSchema: () => updateUserSchema,
  userLoginSchema: () => userLoginSchema,
  users: () => users,
  usersRelations: () => usersRelations,
  weightRecords: () => weightRecords,
  weightRecordsRelations: () => weightRecordsRelations
});
import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  integer,
  decimal,
  boolean,
  date
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { z } from "zod";
var sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull()
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);
var users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  cpf: varchar("cpf", { length: 11 }).unique().notNull(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email").unique(),
  profileImageUrl: varchar("profile_image_url"),
  isAdmin: boolean("is_admin").default(false),
  workType: varchar("work_type"),
  // "Filetagem", "Espinhos"
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var weightRecords = pgTable("weight_records", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id),
  weight: decimal("weight", { precision: 10, scale: 2 }).notNull(),
  workType: varchar("work_type").notNull(),
  notes: text("notes"),
  recordDate: date("record_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var settings = pgTable("settings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  key: varchar("key").unique().notNull(),
  value: varchar("value").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var usersRelations = relations(users, ({ many }) => ({
  weightRecords: many(weightRecords)
}));
var weightRecordsRelations = relations(weightRecords, ({ one }) => ({
  user: one(users, {
    fields: [weightRecords.userId],
    references: [users.id]
  })
}));
var insertUserSchema = z.object({
  cpf: z.string().min(11, "CPF deve ter 11 d\xEDgitos").max(11, "CPF deve ter 11 d\xEDgitos"),
  password: z.string().optional(),
  firstName: z.string().min(1, "Nome \xE9 obrigat\xF3rio"),
  lastName: z.string().min(1, "Sobrenome \xE9 obrigat\xF3rio"),
  profileImageUrl: z.string().optional(),
  isAdmin: z.boolean().default(false),
  workType: z.enum(["Filetagem", "Espinhos"], {
    required_error: "Tipo de trabalho \xE9 obrigat\xF3rio"
  }),
  isActive: z.boolean().default(true)
}).refine((data) => !data.isAdmin || data.password && data.password.length >= 1, {
  message: "Senha \xE9 obrigat\xF3ria para administradores",
  path: ["password"]
});
var adminLoginSchema = z.object({
  cpf: z.string().min(11, "CPF deve ter 11 d\xEDgitos").max(11, "CPF deve ter 11 d\xEDgitos"),
  password: z.string().min(1, "Senha \xE9 obrigat\xF3ria")
});
var userLoginSchema = z.object({
  cpf: z.string().min(11, "CPF deve ter 11 d\xEDgitos").max(11, "CPF deve ter 11 d\xEDgitos")
});
var loginUserSchema = adminLoginSchema;
var insertWeightRecordSchema = z.object({
  userId: z.number().positive(),
  weight: z.number().positive().min(0.1, "Peso deve ser maior que 0"),
  workType: z.enum(["Filetagem", "Espinhos"], {
    required_error: "Tipo de trabalho \xE9 obrigat\xF3rio"
  }),
  notes: z.string().optional(),
  recordDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD")
});
var updateUserSchema = z.object({
  cpf: z.string().min(11, "CPF deve ter 11 d\xEDgitos").max(11, "CPF deve ter 11 d\xEDgitos").optional(),
  password: z.string().min(1, "Senha \xE9 obrigat\xF3ria").optional(),
  firstName: z.string().min(1, "Nome \xE9 obrigat\xF3rio").optional(),
  lastName: z.string().min(1, "Sobrenome \xE9 obrigat\xF3rio").optional(),
  email: z.string().email("Email inv\xE1lido").optional(),
  profileImageUrl: z.string().optional(),
  isAdmin: z.boolean().optional(),
  workType: z.string().optional(),
  isActive: z.boolean().optional()
}).partial();
var settingsSchema = z.object({
  key: z.string().min(1, "Chave \xE9 obrigat\xF3ria"),
  value: z.string().min(1, "Valor \xE9 obrigat\xF3rio")
});

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { eq, and, desc, sql, gte, lte, sum, count, avg, max } from "drizzle-orm";
var DatabaseStorage = class {
  // Helper function to get Brazilian date
  getBrazilianDate() {
    const now = /* @__PURE__ */ new Date();
    const brazilOffset = -3 * 60;
    const utcTime = now.getTime() + now.getTimezoneOffset() * 6e4;
    return new Date(utcTime + brazilOffset * 6e4);
  }
  // Helper function to format date as YYYY-MM-DD
  formatDateString(date2) {
    const year = date2.getFullYear();
    const month = String(date2.getMonth() + 1).padStart(2, "0");
    const day = String(date2.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  // User operations
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserByCpf(cpf) {
    const [user] = await db.select().from(users).where(eq(users.cpf, cpf));
    return user;
  }
  async createUser(userData) {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }
  // User management operations
  async getAllUsers() {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }
  async getActiveUsers() {
    return await db.select().from(users).where(eq(users.isActive, true)).orderBy(desc(users.createdAt));
  }
  async updateUser(id, updates) {
    const [user] = await db.update(users).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.id, id)).returning();
    return user;
  }
  async deleteUser(id) {
    try {
      await db.delete(weightRecords).where(eq(weightRecords.userId, id));
      const result = await db.delete(users).where(eq(users.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting user:", error);
      return false;
    }
  }
  async getUserWithStats(id) {
    const user = await this.getUser(id);
    if (!user) return void 0;
    const today = this.getBrazilianDate();
    const todayWeight = await this.getUserDailyWeight(id, today);
    const monthlyWeight = await this.getUserMonthlyWeight(id, today.getFullYear(), today.getMonth() + 1);
    const weeklyAverage = await this.getUserWeeklyAverage(id);
    const bestDay = await this.getUserBestDay(id);
    return {
      ...user,
      todayWeight,
      monthlyWeight,
      weeklyAverage,
      bestDay
    };
  }
  // Weight record operations
  async createWeightRecord(record) {
    const [weightRecord] = await db.insert(weightRecords).values(record).returning();
    return weightRecord;
  }
  async getWeightRecords(userId, startDate, endDate) {
    const conditions = [];
    if (userId) conditions.push(eq(weightRecords.userId, userId));
    if (startDate) conditions.push(gte(weightRecords.recordDate, startDate.toISOString().split("T")[0]));
    if (endDate) conditions.push(lte(weightRecords.recordDate, endDate.toISOString().split("T")[0]));
    let query = db.select({
      id: weightRecords.id,
      userId: weightRecords.userId,
      weight: weightRecords.weight,
      workType: weightRecords.workType,
      notes: weightRecords.notes,
      recordDate: weightRecords.recordDate,
      createdAt: weightRecords.createdAt,
      updatedAt: weightRecords.updatedAt,
      user: users
    }).from(weightRecords).innerJoin(users, eq(weightRecords.userId, users.id));
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    const results = await query.orderBy(desc(weightRecords.recordDate), desc(weightRecords.createdAt));
    return results.map((result) => ({
      id: result.id,
      userId: result.userId,
      weight: result.weight,
      workType: result.workType,
      notes: result.notes,
      recordDate: result.recordDate,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      user: result.user
    }));
  }
  async updateWeightRecord(id, updates) {
    const updateData = { ...updates, updatedAt: /* @__PURE__ */ new Date() };
    if (typeof updateData.weight === "number") {
      updateData.weight = updateData.weight.toString();
    }
    const [record] = await db.update(weightRecords).set(updateData).where(eq(weightRecords.id, id)).returning();
    return record;
  }
  async deleteWeightRecord(id) {
    const result = await db.delete(weightRecords).where(eq(weightRecords.id, id));
    return (result.rowCount || 0) > 0;
  }
  // Analytics operations
  async getDailyStats() {
    const brazilDate = this.getBrazilianDate();
    const today = this.formatDateString(brazilDate);
    const currentMonth = brazilDate.getMonth() + 1;
    const currentYear = brazilDate.getFullYear();
    const [activeUsersResult] = await db.select({ count: count() }).from(users).where(eq(users.isActive, true));
    const [todayWeightResult] = await db.select({ totalWeight: sum(weightRecords.weight) }).from(weightRecords).where(eq(weightRecords.recordDate, today));
    const [monthlyWeightResult] = await db.select({ totalWeight: sum(weightRecords.weight) }).from(weightRecords).where(and(
      sql`EXTRACT(MONTH FROM ${weightRecords.recordDate}) = ${currentMonth}`,
      sql`EXTRACT(YEAR FROM ${weightRecords.recordDate}) = ${currentYear}`
    ));
    const [totalRecordsResult] = await db.select({ count: count() }).from(weightRecords);
    return {
      activeUsers: activeUsersResult?.count || 0,
      todayWeight: todayWeightResult?.totalWeight ? parseFloat(todayWeightResult.totalWeight) : 0,
      monthlyWeight: monthlyWeightResult?.totalWeight ? parseFloat(monthlyWeightResult.totalWeight) : 0,
      totalRecords: totalRecordsResult?.count || 0
    };
  }
  async getUserDailyWeight(userId, date2) {
    const dateStr = this.formatDateString(date2);
    const [result] = await db.select({ totalWeight: sum(weightRecords.weight) }).from(weightRecords).where(and(eq(weightRecords.userId, userId), eq(weightRecords.recordDate, dateStr)));
    return result?.totalWeight ? parseFloat(result.totalWeight) : 0;
  }
  async getUserMonthlyWeight(userId, year, month) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const [result] = await db.select({ totalWeight: sum(weightRecords.weight) }).from(weightRecords).where(and(
      eq(weightRecords.userId, userId),
      gte(weightRecords.recordDate, this.formatDateString(startDate)),
      lte(weightRecords.recordDate, this.formatDateString(endDate))
    ));
    return result?.totalWeight ? parseFloat(result.totalWeight) : 0;
  }
  async getUserWeeklyAverage(userId) {
    const brazilDate = this.getBrazilianDate();
    const sevenDaysAgo = new Date(brazilDate);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const [result] = await db.select({ avgWeight: avg(weightRecords.weight) }).from(weightRecords).where(and(
      eq(weightRecords.userId, userId),
      gte(weightRecords.recordDate, this.formatDateString(sevenDaysAgo))
    ));
    return result?.avgWeight ? parseFloat(result.avgWeight) : 0;
  }
  async getUserBestDay(userId) {
    const [result] = await db.select({ maxWeight: max(weightRecords.weight) }).from(weightRecords).where(eq(weightRecords.userId, userId));
    return result?.maxWeight ? parseFloat(result.maxWeight) : 0;
  }
  // Settings operations
  async getSetting(key) {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting;
  }
  async setSetting(key, value) {
    const [setting] = await db.insert(settings).values({ key, value }).onConflictDoUpdate({
      target: settings.key,
      set: {
        value,
        updatedAt: /* @__PURE__ */ new Date()
      }
    }).returning();
    return setting;
  }
  async getAllSettings() {
    return await db.select().from(settings);
  }
};
var storage = new DatabaseStorage();

// server/auth.ts
import bcrypt from "bcryptjs";
var authenticate = async (req, res, next) => {
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
var requireAdmin = (req, res, next) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
};
async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}
async function verifyPassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword);
}

// server/routes.ts
import session from "express-session";
import connectPg from "connect-pg-simple";

// server/config.ts
var config = {
  port: parseInt(process.env.PORT || "5000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
  isDevelopment: process.env.NODE_ENV === "development",
  // Database configuration
  databaseUrl: process.env.DATABASE_URL,
  // Session configuration
  sessionSecret: process.env.SESSION_SECRET || "default-secret",
  sessionTtl: 7 * 24 * 60 * 60 * 1e3,
  // 1 week
  // Replit Auth configuration
  replitDomains: process.env.REPLIT_DOMAINS,
  replId: process.env.REPL_ID,
  issuerUrl: process.env.ISSUER_URL || "https://replit.com/oidc",
  // Check if Replit Auth is enabled
  get isReplitAuthEnabled() {
    return !!(this.replitDomains && this.replId);
  },
  // Validate required environment variables
  validate() {
    const requiredVars = ["DATABASE_URL", "SESSION_SECRET"];
    const missingVars = requiredVars.filter((varName) => !process.env[varName]);
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(", ")}`);
    }
    if (this.replitDomains && !this.replId) {
      throw new Error("REPL_ID is required when REPLIT_DOMAINS is set");
    }
    if (this.isProduction && !this.isReplitAuthEnabled) {
      console.warn("Warning: Running in production without Replit Auth. Basic session auth will be used.");
    }
  }
};
config.validate();

// server/routes.ts
async function registerRoutes(app2) {
  app2.set("trust proxy", 1);
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: config.databaseUrl,
    createTableIfMissing: false,
    ttl: config.sessionTtl,
    tableName: "sessions"
  });
  app2.use(session({
    secret: config.sessionSecret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: config.isProduction,
      maxAge: config.sessionTtl
    }
  }));
  app2.post("/api/auth/login", async (req, res) => {
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
      req.session.userId = user.id;
      res.json({ message: "Login successful", user: { ...user, password: void 0 } });
    } catch (error) {
      console.error("Login error:", error);
      res.status(400).json({ message: "Dados inv\xE1lidos" });
    }
  });
  app2.post("/api/auth/admin-login", async (req, res) => {
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
      req.session.userId = user.id;
      res.json({ message: "Login admin successful", user: { ...user, password: void 0 } });
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(400).json({ message: "CPF ou senha inv\xE1lidos. Verifique os dados e tente novamente." });
    }
  });
  app2.post("/api/auth/user-login", async (req, res) => {
    try {
      const { cpf } = userLoginSchema.parse(req.body);
      const user = await storage.getUserByCpf(cpf);
      if (!user || user.isAdmin) {
        return res.status(401).json({ message: "CPF n\xE3o encontrado no sistema ou n\xE3o \xE9 um funcion\xE1rio ativo" });
      }
      req.session.userId = user.id;
      res.json({ message: "Login user successful", user: { ...user, password: void 0 } });
    } catch (error) {
      console.error("User login error:", error);
      res.status(400).json({ message: "CPF inv\xE1lido. Verifique o formato e tente novamente." });
    }
  });
  app2.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Erro ao fazer logout" });
      }
      res.json({ message: "Logout successful" });
    });
  });
  app2.get("/api/auth/user", authenticate, async (req, res) => {
    try {
      const userStats = await storage.getUserWithStats(req.user.id);
      res.json({ ...userStats, password: void 0 });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  app2.get("/api/users", authenticate, requireAdmin, async (req, res) => {
    try {
      const users2 = await storage.getAllUsers();
      res.json(users2.map((user) => ({ ...user, password: void 0 })));
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  app2.get("/api/users/active", authenticate, requireAdmin, async (req, res) => {
    try {
      const users2 = await storage.getActiveUsers();
      const usersWithStats = await Promise.all(
        users2.map(async (user) => {
          const userStats = await storage.getUserWithStats(user.id);
          return { ...userStats, password: void 0 };
        })
      );
      res.json(usersWithStats);
    } catch (error) {
      console.error("Error fetching active users:", error);
      res.status(500).json({ message: "Failed to fetch active users" });
    }
  });
  app2.post("/api/users", authenticate, requireAdmin, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      let hashedPassword = null;
      if (userData.isAdmin && userData.password) {
        hashedPassword = await hashPassword(userData.password);
      } else if (userData.password) {
        hashedPassword = await hashPassword(userData.password);
      }
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword || ""
      });
      res.json({ ...user, password: void 0 });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(400).json({ message: "Failed to create user" });
    }
  });
  app2.patch("/api/users/:id", authenticate, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = updateUserSchema.parse(req.body);
      if (updates.password) {
        updates.password = await hashPassword(updates.password);
      }
      const user = await storage.updateUser(id, updates);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ ...user, password: void 0 });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(400).json({ message: "Failed to update user" });
    }
  });
  app2.delete("/api/users/:id", authenticate, requireAdmin, async (req, res) => {
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
  app2.get("/api/users/:id/stats", authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (!req.user?.isAdmin && req.user?.id !== id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const userStats = await storage.getUserWithStats(id);
      if (!userStats) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ ...userStats, password: void 0 });
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });
  app2.post("/api/weight-records", authenticate, async (req, res) => {
    try {
      const recordData = insertWeightRecordSchema.parse(req.body);
      if (!req.user?.isAdmin && recordData.userId !== req.user?.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const record = await storage.createWeightRecord(recordData);
      res.json(record);
    } catch (error) {
      console.error("Error creating weight record:", error);
      res.status(400).json({ message: "Failed to create weight record" });
    }
  });
  app2.get("/api/weight-records", authenticate, async (req, res) => {
    try {
      const { userId, startDate, endDate } = req.query;
      let userIdFilter;
      if (userId) {
        userIdFilter = parseInt(userId);
        if (!req.user?.isAdmin && userIdFilter !== req.user?.id) {
          return res.status(403).json({ message: "Forbidden" });
        }
      } else if (!req.user?.isAdmin) {
        userIdFilter = req.user?.id;
      }
      const records = await storage.getWeightRecords(
        userIdFilter,
        startDate ? new Date(startDate) : void 0,
        endDate ? new Date(endDate) : void 0
      );
      res.json(records);
    } catch (error) {
      console.error("Error fetching weight records:", error);
      res.status(500).json({ message: "Failed to fetch weight records" });
    }
  });
  app2.patch("/api/weight-records/:id", authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      if (!req.user?.isAdmin) {
        const existingRecord = await storage.getWeightRecords();
        const record2 = existingRecord.find((r) => r.id === id);
        if (!record2 || record2.userId !== req.user?.id) {
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
  app2.delete("/api/weight-records/:id", authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (!req.user?.isAdmin) {
        const existingRecord = await storage.getWeightRecords();
        const record = existingRecord.find((r) => r.id === id);
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
  app2.get("/api/analytics/daily-stats", authenticate, requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getDailyStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching daily stats:", error);
      res.status(500).json({ message: "Failed to fetch daily stats" });
    }
  });
  app2.get("/api/settings", authenticate, requireAdmin, async (req, res) => {
    try {
      const settings2 = await storage.getAllSettings();
      res.json(settings2);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });
  app2.put("/api/settings/:key", authenticate, requireAdmin, async (req, res) => {
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
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = config.port;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
