import {
  users,
  weightRecords,
  settings,
  type User,
  type InsertUser,
  type UpdateUser,
  type InsertWeightRecord,
  type WeightRecord,
  type UserWithStats,
  type WeightRecordWithUser,
  type DailyStats,
  type Setting,
  type InsertSetting,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, gte, lte, sum, count, avg, max } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByCpf(cpf: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // User management operations
  getAllUsers(): Promise<User[]>;
  getActiveUsers(): Promise<User[]>;
  updateUser(id: number, updates: UpdateUser): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getUserWithStats(id: number): Promise<UserWithStats | undefined>;
  
  // Weight record operations
  createWeightRecord(record: InsertWeightRecord): Promise<WeightRecord>;
  getWeightRecords(userId?: number, startDate?: Date, endDate?: Date): Promise<WeightRecordWithUser[]>;
  updateWeightRecord(id: number, updates: Partial<InsertWeightRecord>): Promise<WeightRecord | undefined>;
  deleteWeightRecord(id: number): Promise<boolean>;
  
  // Analytics operations
  getDailyStats(): Promise<DailyStats>;
  getUserDailyWeight(userId: number, date: Date): Promise<number>;
  getUserMonthlyWeight(userId: number, year: number, month: number): Promise<number>;
  getUserWeeklyAverage(userId: number): Promise<number>;
  getUserBestDay(userId: number): Promise<number>;
  
  // Settings operations
  getSetting(key: string): Promise<Setting | undefined>;
  setSetting(key: string, value: string): Promise<Setting>;
  getAllSettings(): Promise<Setting[]>;
}

export class DatabaseStorage implements IStorage {
  // Helper function to get Brazilian date
  private getBrazilianDate(): Date {
    // Create a date in Brazilian timezone (UTC-3)
    const now = new Date();
    const brazilOffset = -3 * 60; // -3 hours in minutes
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utcTime + (brazilOffset * 60000));
  }

  // Helper function to format date as YYYY-MM-DD
  private formatDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByCpf(cpf: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.cpf, cpf));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData as any)
      .returning();
    return user;
  }

  // User management operations
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getActiveUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.isActive, true)).orderBy(desc(users.createdAt));
  }

  async updateUser(id: number, updates: UpdateUser): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      // First, delete all weight records for this user
      await db
        .delete(weightRecords)
        .where(eq(weightRecords.userId, id));
      
      // Then delete the user
      const result = await db
        .delete(users)
        .where(eq(users.id, id))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  async getUserWithStats(id: number): Promise<UserWithStats | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;

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
      bestDay,
    };
  }

  // Weight record operations
  async createWeightRecord(record: InsertWeightRecord): Promise<WeightRecord> {
    const [weightRecord] = await db
      .insert(weightRecords)
      .values(record as any)
      .returning();
    return weightRecord;
  }

  async getWeightRecords(userId?: number, startDate?: Date, endDate?: Date): Promise<WeightRecordWithUser[]> {
    const conditions = [];
    if (userId) conditions.push(eq(weightRecords.userId, userId));
    if (startDate) conditions.push(gte(weightRecords.recordDate, startDate.toISOString().split('T')[0]));
    if (endDate) conditions.push(lte(weightRecords.recordDate, endDate.toISOString().split('T')[0]));

    let query = db
      .select({
        id: weightRecords.id,
        userId: weightRecords.userId,
        weight: weightRecords.weight,
        workType: weightRecords.workType,
        notes: weightRecords.notes,
        recordDate: weightRecords.recordDate,
        createdAt: weightRecords.createdAt,
        updatedAt: weightRecords.updatedAt,
        user: users,
      })
      .from(weightRecords)
      .innerJoin(users, eq(weightRecords.userId, users.id));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const results = await query.orderBy(desc(weightRecords.recordDate), desc(weightRecords.createdAt));
    
    return results.map(result => ({
      id: result.id,
      userId: result.userId,
      weight: result.weight,
      workType: result.workType,
      notes: result.notes,
      recordDate: result.recordDate,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      user: result.user,
    }));
  }

  async updateWeightRecord(id: number, updates: Partial<InsertWeightRecord>): Promise<WeightRecord | undefined> {
    const updateData: any = { ...updates, updatedAt: new Date() };
    
    // Convert weight to string if it's a number (database expects decimal as string)
    if (typeof updateData.weight === 'number') {
      updateData.weight = updateData.weight.toString();
    }
    
    const [record] = await db
      .update(weightRecords)
      .set(updateData)
      .where(eq(weightRecords.id, id))
      .returning();
    return record;
  }

  async deleteWeightRecord(id: number): Promise<boolean> {
    const result = await db.delete(weightRecords).where(eq(weightRecords.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Analytics operations
  async getDailyStats(): Promise<DailyStats> {
    const brazilDate = this.getBrazilianDate();
    const today = this.formatDateString(brazilDate);
    const currentMonth = brazilDate.getMonth() + 1;
    const currentYear = brazilDate.getFullYear();

    const [activeUsersResult] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.isActive, true));

    const [todayWeightResult] = await db
      .select({ totalWeight: sum(weightRecords.weight) })
      .from(weightRecords)
      .where(eq(weightRecords.recordDate, today));

    const [monthlyWeightResult] = await db
      .select({ totalWeight: sum(weightRecords.weight) })
      .from(weightRecords)
      .where(and(
        sql`EXTRACT(MONTH FROM ${weightRecords.recordDate}) = ${currentMonth}`,
        sql`EXTRACT(YEAR FROM ${weightRecords.recordDate}) = ${currentYear}`
      ));

    const [totalRecordsResult] = await db
      .select({ count: count() })
      .from(weightRecords);

    // Calculate earnings
    const totalDailyEarnings = await this.calculateTotalEarnings(today);
    const totalMonthlyEarnings = await this.calculateTotalEarningsForMonth(currentYear, currentMonth);

    return {
      activeUsers: activeUsersResult?.count || 0,
      todayWeight: todayWeightResult?.totalWeight ? parseFloat(todayWeightResult.totalWeight) : 0,
      monthlyWeight: monthlyWeightResult?.totalWeight ? parseFloat(monthlyWeightResult.totalWeight) : 0,
      totalRecords: totalRecordsResult?.count || 0,
      totalDailyEarnings,
      totalMonthlyEarnings,
    };
  }

  async getUserDailyWeight(userId: number, date: Date): Promise<number> {
    const dateStr = this.formatDateString(date);
    const [result] = await db
      .select({ totalWeight: sum(weightRecords.weight) })
      .from(weightRecords)
      .where(and(eq(weightRecords.userId, userId), eq(weightRecords.recordDate, dateStr)));
    return result?.totalWeight ? parseFloat(result.totalWeight) : 0;
  }

  async getUserMonthlyWeight(userId: number, year: number, month: number): Promise<number> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    const [result] = await db
      .select({ totalWeight: sum(weightRecords.weight) })
      .from(weightRecords)
      .where(and(
        eq(weightRecords.userId, userId),
        gte(weightRecords.recordDate, this.formatDateString(startDate)),
        lte(weightRecords.recordDate, this.formatDateString(endDate))
      ));
    return result?.totalWeight ? parseFloat(result.totalWeight) : 0;
  }

  async getUserWeeklyAverage(userId: number): Promise<number> {
    const brazilDate = this.getBrazilianDate();
    const sevenDaysAgo = new Date(brazilDate);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const [result] = await db
      .select({ avgWeight: avg(weightRecords.weight) })
      .from(weightRecords)
      .where(and(
        eq(weightRecords.userId, userId),
        gte(weightRecords.recordDate, this.formatDateString(sevenDaysAgo))
      ));
    return result?.avgWeight ? parseFloat(result.avgWeight) : 0;
  }

  async getUserBestDay(userId: number): Promise<number> {
    const [result] = await db
      .select({ maxWeight: max(weightRecords.weight) })
      .from(weightRecords)
      .where(eq(weightRecords.userId, userId));
    return result?.maxWeight ? parseFloat(result.maxWeight) : 0;
  }

  // Settings operations
  async getSetting(key: string): Promise<Setting | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting;
  }

  async setSetting(key: string, value: string): Promise<Setting> {
    const [setting] = await db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value,
          updatedAt: new Date(),
        },
      })
      .returning();
    return setting;
  }

  async getAllSettings(): Promise<Setting[]> {
    return await db.select().from(settings);
  }

  // Earnings calculation methods
  async calculateUserDailyEarnings(userId: number, date: Date): Promise<number> {
    const dateStr = this.formatDateString(date);
    
    // Get user's work type
    const user = await this.getUser(userId);
    if (!user) return 0;
    
    // Get user's weight for the day
    const dailyWeight = await this.getUserDailyWeight(userId, date);
    if (dailyWeight === 0) return 0;
    
    // Get price per kg based on work type
    const priceKey = user.workType === 'Filetagem' ? 'file_price_per_kg' : 'spine_price_per_kg';
    const priceSetting = await this.getSetting(priceKey);
    const pricePerKg = priceSetting ? parseFloat(priceSetting.value) : 0;
    
    return dailyWeight * pricePerKg;
  }

  async calculateUserMonthlyEarnings(userId: number, year: number, month: number): Promise<number> {
    // Get user's work type
    const user = await this.getUser(userId);
    if (!user) return 0;
    
    // Get user's monthly weight
    const monthlyWeight = await this.getUserMonthlyWeight(userId, year, month);
    if (monthlyWeight === 0) return 0;
    
    // Get price per kg based on work type
    const priceKey = user.workType === 'Filetagem' ? 'file_price_per_kg' : 'spine_price_per_kg';
    const priceSetting = await this.getSetting(priceKey);
    const pricePerKg = priceSetting ? parseFloat(priceSetting.value) : 0;
    
    return monthlyWeight * pricePerKg;
  }

  async calculateTotalEarnings(date: string): Promise<number> {
    // Get all weight records for the date with user info
    const records = await db
      .select({
        weight: weightRecords.weight,
        workType: weightRecords.workType,
      })
      .from(weightRecords)
      .where(eq(weightRecords.recordDate, date));

    if (records.length === 0) return 0;

    // Get pricing settings
    const [filePrice, spinePrice] = await Promise.all([
      this.getSetting('file_price_per_kg'),
      this.getSetting('spine_price_per_kg')
    ]);

    const filePricePerKg = filePrice ? parseFloat(filePrice.value) : 0;
    const spinePricePerKg = spinePrice ? parseFloat(spinePrice.value) : 0;

    // Calculate total earnings
    return records.reduce((total, record) => {
      const weight = parseFloat(record.weight);
      const pricePerKg = record.workType === 'Filetagem' ? filePricePerKg : spinePricePerKg;
      return total + (weight * pricePerKg);
    }, 0);
  }

  async calculateTotalEarningsForMonth(year: number, month: number): Promise<number> {
    // Get all weight records for the month with work type
    const records = await db
      .select({
        weight: weightRecords.weight,
        workType: weightRecords.workType,
      })
      .from(weightRecords)
      .where(and(
        sql`EXTRACT(MONTH FROM ${weightRecords.recordDate}) = ${month}`,
        sql`EXTRACT(YEAR FROM ${weightRecords.recordDate}) = ${year}`
      ));

    if (records.length === 0) return 0;

    // Get pricing settings
    const [filePrice, spinePrice] = await Promise.all([
      this.getSetting('file_price_per_kg'),
      this.getSetting('spine_price_per_kg')
    ]);

    const filePricePerKg = filePrice ? parseFloat(filePrice.value) : 0;
    const spinePricePerKg = spinePrice ? parseFloat(spinePrice.value) : 0;

    // Calculate total earnings
    return records.reduce((total, record) => {
      const weight = parseFloat(record.weight);
      const pricePerKg = record.workType === 'Filetagem' ? filePricePerKg : spinePricePerKg;
      return total + (weight * pricePerKg);
    }, 0);
  }

  async getUserEarnings(userId: number): Promise<UserEarnings | null> {
    const user = await this.getUser(userId);
    if (!user) return null;

    const brazilDate = this.getBrazilianDate();
    const currentMonth = brazilDate.getMonth() + 1;
    const currentYear = brazilDate.getFullYear();

    // Get weights
    const dailyWeight = await this.getUserDailyWeight(userId, brazilDate);
    const monthlyWeight = await this.getUserMonthlyWeight(userId, currentYear, currentMonth);

    // Get price per kg based on work type
    const priceKey = user.workType === 'Filetagem' ? 'file_price_per_kg' : 'spine_price_per_kg';
    const priceSetting = await this.getSetting(priceKey);
    const pricePerKg = priceSetting ? parseFloat(priceSetting.value) : 0;

    // Calculate earnings
    const dailyEarnings = dailyWeight * pricePerKg;
    const monthlyEarnings = monthlyWeight * pricePerKg;

    return {
      userId,
      user,
      dailyWeight,
      monthlyWeight,
      dailyEarnings,
      monthlyEarnings,
      pricePerKg,
    };
  }

  async getAllUsersEarnings(): Promise<UserEarnings[]> {
    const activeUsers = await this.getActiveUsers();
    const userEarnings = await Promise.all(
      activeUsers.map(user => this.getUserEarnings(user.id))
    );
    
    return userEarnings.filter((earnings): earnings is UserEarnings => earnings !== null);
  }
}

export const storage = new DatabaseStorage();