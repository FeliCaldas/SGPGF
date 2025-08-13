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
  date,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - mandatory for auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table
export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  cpf: varchar("cpf", { length: 11 }).unique().notNull(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email").unique(),
  profileImageUrl: varchar("profile_image_url"),
  isAdmin: boolean("is_admin").default(false),
  workType: varchar("work_type"), // "Filetagem", "Espinhos"
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Weight records table
export const weightRecords = pgTable("weight_records", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id),
  weight: decimal("weight", { precision: 10, scale: 2 }).notNull(),
  workType: varchar("work_type").notNull(),
  notes: text("notes"),
  recordDate: date("record_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Settings table
export const settings = pgTable("settings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  key: varchar("key").unique().notNull(),
  value: varchar("value").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  weightRecords: many(weightRecords),
}));

export const weightRecordsRelations = relations(weightRecords, ({ one }) => ({
  user: one(users, {
    fields: [weightRecords.userId],
    references: [users.id],
  }),
}));

// Zod schemas  
export const insertUserSchema = z.object({
  cpf: z.string().min(11, "CPF deve ter 11 dígitos").max(11, "CPF deve ter 11 dígitos"),
  password: z.string().optional(),
  firstName: z.string().min(1, "Nome é obrigatório"),
  lastName: z.string().min(1, "Sobrenome é obrigatório"),
  profileImageUrl: z.string().optional(),
  isAdmin: z.boolean().default(false),
  workType: z.enum(["Filetagem", "Espinhos"], {
    required_error: "Tipo de trabalho é obrigatório",
  }),
  isActive: z.boolean().default(true),
}).refine(data => !data.isAdmin || (data.password && data.password.length >= 1), {
  message: "Senha é obrigatória para administradores",
  path: ["password"],
});

// Login schemas
export const adminLoginSchema = z.object({
  cpf: z.string().min(11, "CPF deve ter 11 dígitos").max(11, "CPF deve ter 11 dígitos"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export const userLoginSchema = z.object({
  cpf: z.string().min(11, "CPF deve ter 11 dígitos").max(11, "CPF deve ter 11 dígitos"),
});

// Backward compatibility
export const loginUserSchema = adminLoginSchema;

export const insertWeightRecordSchema = z.object({
  userId: z.number().positive(),
  weight: z.number().positive().min(0.1, "Peso deve ser maior que 0"),
  workType: z.enum(["Filetagem", "Espinhos"], {
    required_error: "Tipo de trabalho é obrigatório",
  }),
  notes: z.string().optional(),
  recordDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
});

export const updateUserSchema = z.object({
  cpf: z.string().min(11, "CPF deve ter 11 dígitos").max(11, "CPF deve ter 11 dígitos").optional(),
  password: z.string().min(1, "Senha é obrigatória").optional(),
  firstName: z.string().min(1, "Nome é obrigatório").optional(),
  lastName: z.string().min(1, "Sobrenome é obrigatório").optional(),
  email: z.string().email("Email inválido").optional(),
  profileImageUrl: z.string().optional(),
  isAdmin: z.boolean().optional(),
  workType: z.string().optional(),
  isActive: z.boolean().optional(),
}).partial();

export const settingsSchema = z.object({
  key: z.string().min(1, "Chave é obrigatória"),
  value: z.string().min(1, "Valor é obrigatório"),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type AdminLogin = z.infer<typeof adminLoginSchema>;
export type UserLogin = z.infer<typeof userLoginSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>; // Backward compatibility
export type User = typeof users.$inferSelect;
export type InsertWeightRecord = z.infer<typeof insertWeightRecordSchema>;
export type WeightRecord = typeof weightRecords.$inferSelect;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof settingsSchema>;

// Extended types for API responses
export type UserWithStats = User & {
  todayWeight?: number;
  monthlyWeight?: number;
  weeklyAverage?: number;
  bestDay?: number;
  dailyEarnings?: number;
  monthlyEarnings?: number;
  dailyWeight?: number;
};

export type WeightRecordWithUser = WeightRecord & {
  user: User;
};

export type DailyStats = {
  activeUsers: number;
  todayWeight: number;
  monthlyWeight: number;
  totalRecords: number;
  totalDailyEarnings: number;
  totalMonthlyEarnings: number;
};

export type UserEarnings = {
  userId: number;
  user: User;
  dailyWeight: number;
  monthlyWeight: number;
  dailyEarnings: number;
  monthlyEarnings: number;
  pricePerKg: number;
};