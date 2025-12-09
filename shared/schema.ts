import { sql, relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  date,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["ADMIN", "OPERATOR", "VIEWER"]);
export const shipmentStatusEnum = pgEnum("shipment_status", [
  "CREATED",
  "IMPORTING_DETAILS_DONE",
  "CUSTOMS_IN_PROGRESS",
  "CUSTOMS_RECEIVED",
]);

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").default("VIEWER").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  createdShipments: many(shipments, { relationName: "createdBy" }),
  updatedShipments: many(shipments, { relationName: "updatedBy" }),
}));

// Suppliers table
export const suppliers = pgTable("suppliers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  contactInfo: text("contact_info"),
  defaultCountry: varchar("default_country", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  shipmentItems: many(shipmentItems),
}));

// Item Types table
export const itemTypes = pgTable("item_types", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const itemTypesRelations = relations(itemTypes, ({ many }) => ({
  shipmentItems: many(shipmentItems),
  customsPerType: many(customsPerType),
}));

// Shipments table
export const shipments = pgTable("shipments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  shipmentName: varchar("shipment_name", { length: 255 }).notNull(),
  shipmentNumber: varchar("shipment_number", { length: 100 }).notNull(),
  backendMasterKey: varchar("backend_master_key", { length: 100 }).notNull().unique(),
  status: shipmentStatusEnum("status").default("CREATED").notNull(),
  createdById: varchar("created_by_id").references(() => users.id),
  updatedById: varchar("updated_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const shipmentsRelations = relations(shipments, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [shipments.createdById],
    references: [users.id],
    relationName: "createdBy",
  }),
  updatedBy: one(users, {
    fields: [shipments.updatedById],
    references: [users.id],
    relationName: "updatedBy",
  }),
  shipmentItems: many(shipmentItems),
  importingDetails: one(importingDetails),
  customs: one(customs),
}));

// Shipment Items table
export const shipmentItems = pgTable("shipment_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  shipmentId: integer("shipment_id").references(() => shipments.id, { onDelete: "cascade" }).notNull(),
  itemPhotoUrl: text("item_photo_url"),
  supplierId: integer("supplier_id").references(() => suppliers.id).notNull(),
  itemTypeId: integer("item_type_id").references(() => itemTypes.id).notNull(),
  ctn: integer("ctn").notNull().default(0),
  pcsPerCtn: integer("pcs_per_ctn").notNull().default(0),
  cou: integer("cou").notNull().default(0),
  pri: decimal("pri", { precision: 18, scale: 2 }).notNull().default("0"),
  total: decimal("total", { precision: 18, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const shipmentItemsRelations = relations(shipmentItems, ({ one }) => ({
  shipment: one(shipments, {
    fields: [shipmentItems.shipmentId],
    references: [shipments.id],
  }),
  supplier: one(suppliers, {
    fields: [shipmentItems.supplierId],
    references: [suppliers.id],
  }),
  itemType: one(itemTypes, {
    fields: [shipmentItems.itemTypeId],
    references: [itemTypes.id],
  }),
}));

// Importing Details table
export const importingDetails = pgTable("importing_details", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  shipmentId: integer("shipment_id").references(() => shipments.id, { onDelete: "cascade" }).notNull().unique(),
  totalShipmentPrice: decimal("total_shipment_price", { precision: 18, scale: 2 }).notNull().default("0"),
  commissionPercent: decimal("commission_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  commissionAmount: decimal("commission_amount", { precision: 18, scale: 2 }).notNull().default("0"),
  shipmentCost: decimal("shipment_cost", { precision: 18, scale: 2 }).notNull().default("0"),
  shipmentSpaceM2: decimal("shipment_space_m2", { precision: 18, scale: 3 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const importingDetailsRelations = relations(importingDetails, ({ one }) => ({
  shipment: one(shipments, {
    fields: [importingDetails.shipmentId],
    references: [shipments.id],
  }),
}));

// Customs table
export const customs = pgTable("customs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  shipmentId: integer("shipment_id").references(() => shipments.id, { onDelete: "cascade" }).notNull().unique(),
  billDate: date("bill_date"),
  totalPiecesRecorded: integer("total_pieces_recorded").notNull().default(0),
  totalPiecesAdjusted: integer("total_pieces_adjusted").notNull().default(0),
  lossOrDamagePieces: integer("loss_or_damage_pieces").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const customsRelations = relations(customs, ({ one, many }) => ({
  shipment: one(shipments, {
    fields: [customs.shipmentId],
    references: [shipments.id],
  }),
  customsPerType: many(customsPerType),
}));

// Customs Per Type table
export const customsPerType = pgTable("customs_per_type", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  customsId: integer("customs_id").references(() => customs.id, { onDelete: "cascade" }).notNull(),
  itemTypeId: integer("item_type_id").references(() => itemTypes.id).notNull(),
  totalPcsPerType: integer("total_pcs_per_type").notNull().default(0),
  totalCtnPerType: integer("total_ctn_per_type").notNull().default(0),
  paidCustoms: decimal("paid_customs", { precision: 18, scale: 2 }).notNull().default("0"),
  takhreg: decimal("takhreg", { precision: 18, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const customsPerTypeRelations = relations(customsPerType, ({ one }) => ({
  customs: one(customs, {
    fields: [customsPerType.customsId],
    references: [customs.id],
  }),
  itemType: one(itemTypes, {
    fields: [customsPerType.itemTypeId],
    references: [itemTypes.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertItemTypeSchema = createInsertSchema(itemTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertShipmentSchema = createInsertSchema(shipments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertShipmentItemSchema = createInsertSchema(shipmentItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertImportingDetailsSchema = createInsertSchema(importingDetails).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCustomsSchema = createInsertSchema(customs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCustomsPerTypeSchema = createInsertSchema(customsPerType).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;

export type ItemType = typeof itemTypes.$inferSelect;
export type InsertItemType = z.infer<typeof insertItemTypeSchema>;

export type Shipment = typeof shipments.$inferSelect;
export type InsertShipment = z.infer<typeof insertShipmentSchema>;

export type ShipmentItem = typeof shipmentItems.$inferSelect;
export type InsertShipmentItem = z.infer<typeof insertShipmentItemSchema>;

export type ImportingDetails = typeof importingDetails.$inferSelect;
export type InsertImportingDetails = z.infer<typeof insertImportingDetailsSchema>;

export type Customs = typeof customs.$inferSelect;
export type InsertCustoms = z.infer<typeof insertCustomsSchema>;

export type CustomsPerType = typeof customsPerType.$inferSelect;
export type InsertCustomsPerType = z.infer<typeof insertCustomsPerTypeSchema>;

// Extended types for frontend with relations
export type ShipmentWithRelations = Shipment & {
  createdBy?: User | null;
  updatedBy?: User | null;
  shipmentItems?: ShipmentItemWithRelations[];
  importingDetails?: ImportingDetails | null;
  customs?: CustomsWithRelations | null;
};

export type ShipmentItemWithRelations = ShipmentItem & {
  supplier?: Supplier | null;
  itemType?: ItemType | null;
};

export type CustomsWithRelations = Customs & {
  shipment?: Shipment | null;
  customsPerType?: CustomsPerTypeWithRelations[];
};

export type CustomsPerTypeWithRelations = CustomsPerType & {
  itemType?: ItemType | null;
};
