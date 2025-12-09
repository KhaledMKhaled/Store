import {
  users,
  suppliers,
  itemTypes,
  shipments,
  shipmentItems,
  importingDetails,
  customs,
  customsPerType,
  type User,
  type UpsertUser,
  type Supplier,
  type InsertSupplier,
  type ItemType,
  type InsertItemType,
  type Shipment,
  type InsertShipment,
  type ShipmentItem,
  type InsertShipmentItem,
  type ImportingDetails,
  type InsertImportingDetails,
  type Customs,
  type InsertCustoms,
  type CustomsPerType,
  type InsertCustomsPerType,
  type ShipmentWithRelations,
  type ShipmentItemWithRelations,
  type CustomsWithRelations,
  type CustomsPerTypeWithRelations,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, like, or } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserRole(id: string, role: "ADMIN" | "OPERATOR" | "VIEWER"): Promise<User | undefined>;

  // Supplier operations
  getSuppliers(): Promise<Supplier[]>;
  getSupplier(id: number): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: number, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined>;
  deleteSupplier(id: number): Promise<boolean>;

  // Item Type operations
  getItemTypes(): Promise<ItemType[]>;
  getItemType(id: number): Promise<ItemType | undefined>;
  createItemType(itemType: InsertItemType): Promise<ItemType>;
  updateItemType(id: number, itemType: Partial<InsertItemType>): Promise<ItemType | undefined>;
  deleteItemType(id: number): Promise<boolean>;

  // Shipment operations
  getShipments(filters?: { status?: string; search?: string }): Promise<ShipmentWithRelations[]>;
  getShipment(id: number): Promise<ShipmentWithRelations | undefined>;
  createShipment(shipment: InsertShipment): Promise<Shipment>;
  updateShipment(id: number, shipment: Partial<InsertShipment>): Promise<Shipment | undefined>;
  deleteShipment(id: number): Promise<boolean>;

  // Shipment Item operations
  getShipmentItems(shipmentId: number): Promise<ShipmentItemWithRelations[]>;
  getShipmentItem(id: number): Promise<ShipmentItem | undefined>;
  createShipmentItem(item: InsertShipmentItem): Promise<ShipmentItem>;
  updateShipmentItem(id: number, item: Partial<InsertShipmentItem>): Promise<ShipmentItem | undefined>;
  deleteShipmentItem(id: number): Promise<boolean>;

  // Importing Details operations
  getImportingDetails(shipmentId: number): Promise<ImportingDetails | undefined>;
  upsertImportingDetails(details: InsertImportingDetails): Promise<ImportingDetails>;

  // Customs operations
  getCustoms(shipmentId: number): Promise<CustomsWithRelations | undefined>;
  upsertCustoms(customsData: InsertCustoms): Promise<Customs>;

  // Customs Per Type operations
  getCustomsPerType(customsId: number): Promise<CustomsPerTypeWithRelations[]>;
  createCustomsPerType(data: InsertCustomsPerType): Promise<CustomsPerType>;
  updateCustomsPerType(id: number, data: Partial<InsertCustomsPerType>): Promise<CustomsPerType | undefined>;
  deleteCustomsPerType(id: number): Promise<boolean>;

  // Dashboard operations
  getDashboardStats(): Promise<{
    totalShipments: number;
    totalCtn: number;
    totalPcs: number;
    totalValue: number;
    shipmentsByStatus: Record<string, number>;
  }>;
  getCustomsSummary(): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUserRole(id: string, role: "ADMIN" | "OPERATOR" | "VIEWER"): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Supplier operations
  async getSuppliers(): Promise<Supplier[]> {
    return await db.select().from(suppliers).orderBy(suppliers.name);
  }

  async getSupplier(id: number): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return supplier;
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const [newSupplier] = await db.insert(suppliers).values(supplier).returning();
    return newSupplier;
  }

  async updateSupplier(id: number, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    const [updated] = await db
      .update(suppliers)
      .set({ ...supplier, updatedAt: new Date() })
      .where(eq(suppliers.id, id))
      .returning();
    return updated;
  }

  async deleteSupplier(id: number): Promise<boolean> {
    const result = await db.delete(suppliers).where(eq(suppliers.id, id));
    return true;
  }

  // Item Type operations
  async getItemTypes(): Promise<ItemType[]> {
    return await db.select().from(itemTypes).orderBy(itemTypes.name);
  }

  async getItemType(id: number): Promise<ItemType | undefined> {
    const [itemType] = await db.select().from(itemTypes).where(eq(itemTypes.id, id));
    return itemType;
  }

  async createItemType(itemType: InsertItemType): Promise<ItemType> {
    const [newItemType] = await db.insert(itemTypes).values(itemType).returning();
    return newItemType;
  }

  async updateItemType(id: number, itemType: Partial<InsertItemType>): Promise<ItemType | undefined> {
    const [updated] = await db
      .update(itemTypes)
      .set({ ...itemType, updatedAt: new Date() })
      .where(eq(itemTypes.id, id))
      .returning();
    return updated;
  }

  async deleteItemType(id: number): Promise<boolean> {
    await db.delete(itemTypes).where(eq(itemTypes.id, id));
    return true;
  }

  // Shipment operations
  async getShipments(filters?: { status?: string; search?: string }): Promise<ShipmentWithRelations[]> {
    let query = db
      .select()
      .from(shipments)
      .leftJoin(users, eq(shipments.createdById, users.id))
      .orderBy(desc(shipments.createdAt));

    const results = await query;

    return results.map((row) => ({
      ...row.shipments,
      createdBy: row.users || null,
    })).filter((shipment) => {
      if (filters?.status && shipment.status !== filters.status) {
        return false;
      }
      if (filters?.search) {
        const search = filters.search.toLowerCase();
        return (
          shipment.shipmentName.toLowerCase().includes(search) ||
          shipment.shipmentNumber.toLowerCase().includes(search) ||
          shipment.backendMasterKey.toLowerCase().includes(search)
        );
      }
      return true;
    });
  }

  async getShipment(id: number): Promise<ShipmentWithRelations | undefined> {
    const [result] = await db
      .select()
      .from(shipments)
      .leftJoin(users, eq(shipments.createdById, users.id))
      .where(eq(shipments.id, id));

    if (!result) return undefined;

    const items = await this.getShipmentItems(id);
    const importing = await this.getImportingDetails(id);
    const customsData = await this.getCustoms(id);

    return {
      ...result.shipments,
      createdBy: result.users || null,
      shipmentItems: items,
      importingDetails: importing || null,
      customs: customsData || null,
    };
  }

  async createShipment(shipment: InsertShipment): Promise<Shipment> {
    const [newShipment] = await db.insert(shipments).values(shipment).returning();
    return newShipment;
  }

  async updateShipment(id: number, shipment: Partial<InsertShipment>): Promise<Shipment | undefined> {
    const [updated] = await db
      .update(shipments)
      .set({ ...shipment, updatedAt: new Date() })
      .where(eq(shipments.id, id))
      .returning();
    return updated;
  }

  async deleteShipment(id: number): Promise<boolean> {
    await db.delete(shipments).where(eq(shipments.id, id));
    return true;
  }

  // Shipment Item operations
  async getShipmentItems(shipmentId: number): Promise<ShipmentItemWithRelations[]> {
    const results = await db
      .select()
      .from(shipmentItems)
      .leftJoin(suppliers, eq(shipmentItems.supplierId, suppliers.id))
      .leftJoin(itemTypes, eq(shipmentItems.itemTypeId, itemTypes.id))
      .where(eq(shipmentItems.shipmentId, shipmentId))
      .orderBy(shipmentItems.id);

    return results.map((row) => ({
      ...row.shipment_items,
      supplier: row.suppliers || null,
      itemType: row.item_types || null,
    }));
  }

  async getShipmentItem(id: number): Promise<ShipmentItem | undefined> {
    const [item] = await db.select().from(shipmentItems).where(eq(shipmentItems.id, id));
    return item;
  }

  async createShipmentItem(item: InsertShipmentItem): Promise<ShipmentItem> {
    const cou = (item.ctn || 0) * (item.pcsPerCtn || 0);
    const total = cou * parseFloat(String(item.pri || 0));
    const [newItem] = await db
      .insert(shipmentItems)
      .values({
        ...item,
        cou,
        total: String(total),
      })
      .returning();
    return newItem;
  }

  async updateShipmentItem(id: number, item: Partial<InsertShipmentItem>): Promise<ShipmentItem | undefined> {
    const existing = await this.getShipmentItem(id);
    if (!existing) return undefined;

    const ctn = item.ctn ?? existing.ctn;
    const pcsPerCtn = item.pcsPerCtn ?? existing.pcsPerCtn;
    const pri = item.pri ?? existing.pri;
    const cou = ctn * pcsPerCtn;
    const total = cou * parseFloat(String(pri));

    const [updated] = await db
      .update(shipmentItems)
      .set({ ...item, cou, total: String(total), updatedAt: new Date() })
      .where(eq(shipmentItems.id, id))
      .returning();
    return updated;
  }

  async deleteShipmentItem(id: number): Promise<boolean> {
    await db.delete(shipmentItems).where(eq(shipmentItems.id, id));
    return true;
  }

  // Importing Details operations
  async getImportingDetails(shipmentId: number): Promise<ImportingDetails | undefined> {
    const [details] = await db
      .select()
      .from(importingDetails)
      .where(eq(importingDetails.shipmentId, shipmentId));
    return details;
  }

  async upsertImportingDetails(details: InsertImportingDetails): Promise<ImportingDetails> {
    const commissionAmount =
      parseFloat(String(details.totalShipmentPrice || 0)) *
      (parseFloat(String(details.commissionPercent || 0)) / 100);

    const [result] = await db
      .insert(importingDetails)
      .values({
        ...details,
        commissionAmount: String(commissionAmount),
      })
      .onConflictDoUpdate({
        target: importingDetails.shipmentId,
        set: {
          ...details,
          commissionAmount: String(commissionAmount),
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  // Customs operations
  async getCustoms(shipmentId: number): Promise<CustomsWithRelations | undefined> {
    const [customsData] = await db
      .select()
      .from(customs)
      .where(eq(customs.shipmentId, shipmentId));

    if (!customsData) return undefined;

    const perTypeData = await this.getCustomsPerType(customsData.id);
    return {
      ...customsData,
      customsPerType: perTypeData,
    };
  }

  async upsertCustoms(customsData: InsertCustoms): Promise<Customs> {
    const [result] = await db
      .insert(customs)
      .values(customsData)
      .onConflictDoUpdate({
        target: customs.shipmentId,
        set: {
          ...customsData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  // Customs Per Type operations
  async getCustomsPerType(customsId: number): Promise<CustomsPerTypeWithRelations[]> {
    const results = await db
      .select()
      .from(customsPerType)
      .leftJoin(itemTypes, eq(customsPerType.itemTypeId, itemTypes.id))
      .where(eq(customsPerType.customsId, customsId));

    return results.map((row) => ({
      ...row.customs_per_type,
      itemType: row.item_types || null,
    }));
  }

  async createCustomsPerType(data: InsertCustomsPerType): Promise<CustomsPerType> {
    const [result] = await db.insert(customsPerType).values(data).returning();
    return result;
  }

  async updateCustomsPerType(id: number, data: Partial<InsertCustomsPerType>): Promise<CustomsPerType | undefined> {
    const [updated] = await db
      .update(customsPerType)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(customsPerType.id, id))
      .returning();
    return updated;
  }

  async deleteCustomsPerType(id: number): Promise<boolean> {
    await db.delete(customsPerType).where(eq(customsPerType.id, id));
    return true;
  }

  // Dashboard operations
  async getDashboardStats(): Promise<{
    totalShipments: number;
    totalCtn: number;
    totalPcs: number;
    totalValue: number;
    shipmentsByStatus: Record<string, number>;
  }> {
    const allShipments = await db.select().from(shipments);
    const allItems = await db.select().from(shipmentItems);

    const shipmentsByStatus: Record<string, number> = {};
    allShipments.forEach((s) => {
      shipmentsByStatus[s.status] = (shipmentsByStatus[s.status] || 0) + 1;
    });

    const totalCtn = allItems.reduce((sum, item) => sum + (item.ctn || 0), 0);
    const totalPcs = allItems.reduce((sum, item) => sum + (item.cou || 0), 0);
    const totalValue = allItems.reduce((sum, item) => sum + parseFloat(String(item.total || 0)), 0);

    return {
      totalShipments: allShipments.length,
      totalCtn,
      totalPcs,
      totalValue,
      shipmentsByStatus,
    };
  }

  async getCustomsSummary(): Promise<any[]> {
    const results = await db
      .select()
      .from(customs)
      .innerJoin(shipments, eq(customs.shipmentId, shipments.id));

    const summaries = await Promise.all(
      results.map(async (row) => {
        const perType = await this.getCustomsPerType(row.customs.id);
        const totalPaidCustoms = perType.reduce(
          (sum, pt) => sum + parseFloat(String(pt.paidCustoms || 0)),
          0
        );
        const totalPaidTakhreg = perType.reduce(
          (sum, pt) => sum + parseFloat(String(pt.takhreg || 0)),
          0
        );

        return {
          ...row.customs,
          shipmentName: row.shipments.shipmentName,
          shipmentNumber: row.shipments.shipmentNumber,
          totalPaidCustoms,
          totalPaidTakhreg,
        };
      })
    );

    return summaries;
  }
}

export const storage = new DatabaseStorage();
