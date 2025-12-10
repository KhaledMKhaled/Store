import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  insertSupplierSchema,
  insertItemTypeSchema,
  insertShipmentSchema,
  insertShipmentItemSchema,
  insertImportingDetailsSchema,
  insertCustomsSchema,
  insertCustomsPerTypeSchema,
} from "@shared/schema";

type AuthRequest = Request & { user?: { claims?: { sub?: string } } };

const requireRole = (...roles: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const user = await storage.getUser(userId);
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
};

const requireEditor = requireRole("ADMIN", "OPERATOR");
const requireAdmin = requireRole("ADMIN");

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);

  // Auth routes
  app.get("/api/auth/user", isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard routes
  app.get("/api/dashboard/stats", isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Users routes
  app.get("/api/users", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch("/api/users/:id/role", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      if (!["ADMIN", "OPERATOR", "VIEWER"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      const user = await storage.updateUserRole(id, role);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Suppliers routes
  app.get("/api/suppliers", isAuthenticated, async (req, res) => {
    try {
      const suppliers = await storage.getSuppliers();
      res.json(suppliers);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      res.status(500).json({ message: "Failed to fetch suppliers" });
    }
  });

  app.get("/api/suppliers/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const supplier = await storage.getSupplier(id);
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      res.json(supplier);
    } catch (error) {
      console.error("Error fetching supplier:", error);
      res.status(500).json({ message: "Failed to fetch supplier" });
    }
  });

  app.post("/api/suppliers", isAuthenticated, requireEditor, async (req, res) => {
    try {
      const parsed = insertSupplierSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
      }
      const supplier = await storage.createSupplier(parsed.data);
      res.status(201).json(supplier);
    } catch (error) {
      console.error("Error creating supplier:", error);
      res.status(500).json({ message: "Failed to create supplier" });
    }
  });

  app.patch("/api/suppliers/:id", isAuthenticated, requireEditor, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const supplier = await storage.updateSupplier(id, req.body);
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      res.json(supplier);
    } catch (error) {
      console.error("Error updating supplier:", error);
      res.status(500).json({ message: "Failed to update supplier" });
    }
  });

  app.delete("/api/suppliers/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteSupplier(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting supplier:", error);
      res.status(500).json({ message: "Failed to delete supplier" });
    }
  });

  // Item Types routes
  app.get("/api/item-types", isAuthenticated, async (req, res) => {
    try {
      const itemTypes = await storage.getItemTypes();
      res.json(itemTypes);
    } catch (error) {
      console.error("Error fetching item types:", error);
      res.status(500).json({ message: "Failed to fetch item types" });
    }
  });

  app.get("/api/item-types/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const itemType = await storage.getItemType(id);
      if (!itemType) {
        return res.status(404).json({ message: "Item type not found" });
      }
      res.json(itemType);
    } catch (error) {
      console.error("Error fetching item type:", error);
      res.status(500).json({ message: "Failed to fetch item type" });
    }
  });

  app.post("/api/item-types", isAuthenticated, requireEditor, async (req, res) => {
    try {
      const parsed = insertItemTypeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
      }
      const itemType = await storage.createItemType(parsed.data);
      res.status(201).json(itemType);
    } catch (error) {
      console.error("Error creating item type:", error);
      res.status(500).json({ message: "Failed to create item type" });
    }
  });

  app.patch("/api/item-types/:id", isAuthenticated, requireEditor, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const itemType = await storage.updateItemType(id, req.body);
      if (!itemType) {
        return res.status(404).json({ message: "Item type not found" });
      }
      res.json(itemType);
    } catch (error) {
      console.error("Error updating item type:", error);
      res.status(500).json({ message: "Failed to update item type" });
    }
  });

  app.delete("/api/item-types/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteItemType(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting item type:", error);
      res.status(500).json({ message: "Failed to delete item type" });
    }
  });

  // Shipments routes
  app.get("/api/shipments", isAuthenticated, async (req, res) => {
    try {
      const { status, search } = req.query;
      const shipments = await storage.getShipments({
        status: status as string | undefined,
        search: search as string | undefined,
      });
      res.json(shipments);
    } catch (error) {
      console.error("Error fetching shipments:", error);
      res.status(500).json({ message: "Failed to fetch shipments" });
    }
  });

  app.get("/api/shipments/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const shipment = await storage.getShipment(id);
      if (!shipment) {
        return res.status(404).json({ message: "Shipment not found" });
      }
      res.json(shipment);
    } catch (error) {
      console.error("Error fetching shipment:", error);
      res.status(500).json({ message: "Failed to fetch shipment" });
    }
  });

  app.post("/api/shipments", isAuthenticated, requireEditor, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const parsed = insertShipmentSchema.safeParse({
        ...req.body,
        createdById: userId,
        updatedById: userId,
      });
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
      }
      const shipment = await storage.createShipment(parsed.data);
      res.status(201).json(shipment);
    } catch (error) {
      console.error("Error creating shipment:", error);
      res.status(500).json({ message: "Failed to create shipment" });
    }
  });

  app.patch("/api/shipments/:id", isAuthenticated, requireEditor, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user?.claims?.sub;
      const shipment = await storage.updateShipment(id, {
        ...req.body,
        updatedById: userId,
      });
      if (!shipment) {
        return res.status(404).json({ message: "Shipment not found" });
      }
      res.json(shipment);
    } catch (error) {
      console.error("Error updating shipment:", error);
      res.status(500).json({ message: "Failed to update shipment" });
    }
  });

  app.patch("/api/shipments/:id/status", isAuthenticated, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const userId = req.user?.claims?.sub;
      const shipment = await storage.updateShipment(id, { status, updatedById: userId });
      if (!shipment) {
        return res.status(404).json({ message: "Shipment not found" });
      }
      res.json(shipment);
    } catch (error) {
      console.error("Error updating shipment status:", error);
      res.status(500).json({ message: "Failed to update status" });
    }
  });

  app.delete("/api/shipments/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteShipment(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting shipment:", error);
      res.status(500).json({ message: "Failed to delete shipment" });
    }
  });

  // Shipment Items routes
  app.get("/api/shipments/:shipmentId/items", isAuthenticated, async (req, res) => {
    try {
      const shipmentId = parseInt(req.params.shipmentId);
      const items = await storage.getShipmentItems(shipmentId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching shipment items:", error);
      res.status(500).json({ message: "Failed to fetch items" });
    }
  });

  app.post("/api/shipments/:shipmentId/items", isAuthenticated, requireEditor, async (req, res) => {
    try {
      const shipmentId = parseInt(req.params.shipmentId);
      const parsed = insertShipmentItemSchema.safeParse({
        ...req.body,
        shipmentId,
      });
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
      }
      const item = await storage.createShipmentItem(parsed.data);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating shipment item:", error);
      res.status(500).json({ message: "Failed to create item" });
    }
  });

  app.patch("/api/shipment-items/:id", isAuthenticated, requireEditor, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.updateShipmentItem(id, req.body);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error updating shipment item:", error);
      res.status(500).json({ message: "Failed to update item" });
    }
  });

  app.delete("/api/shipment-items/:id", isAuthenticated, requireEditor, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteShipmentItem(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting shipment item:", error);
      res.status(500).json({ message: "Failed to delete item" });
    }
  });

  app.put("/api/shipments/:shipmentId/items", isAuthenticated, requireEditor, async (req, res) => {
    try {
      const shipmentId = parseInt(req.params.shipmentId);
      const { items } = req.body;
      
      if (!Array.isArray(items)) {
        return res.status(400).json({ message: "Items must be an array" });
      }

      const existingItems = await storage.getShipmentItems(shipmentId);
      const existingIds = new Set(existingItems.map(item => item.id));
      const incomingIds = new Set(items.filter((item: any) => item.id).map((item: any) => item.id));

      for (const existingItem of existingItems) {
        if (!incomingIds.has(existingItem.id)) {
          await storage.deleteShipmentItem(existingItem.id);
        }
      }

      const results = [];
      for (const item of items) {
        if (item.id && existingIds.has(item.id)) {
          const updated = await storage.updateShipmentItem(item.id, {
            supplierId: item.supplierId,
            itemTypeId: item.itemTypeId,
            itemPhotoUrl: item.itemPhotoUrl,
            ctn: item.ctn,
            pcsPerCtn: item.pcsPerCtn,
            cou: item.cou,
            pri: item.pri,
            total: item.total,
          });
          if (updated) results.push(updated);
        } else {
          const created = await storage.createShipmentItem({
            shipmentId,
            supplierId: item.supplierId,
            itemTypeId: item.itemTypeId,
            itemPhotoUrl: item.itemPhotoUrl,
            ctn: item.ctn,
            pcsPerCtn: item.pcsPerCtn,
            cou: item.cou,
            pri: item.pri,
            total: item.total,
          });
          results.push(created);
        }
      }

      res.json(results);
    } catch (error) {
      console.error("Error bulk updating shipment items:", error);
      res.status(500).json({ message: "Failed to update items" });
    }
  });

  // Importing Details routes
  app.get("/api/shipments/:shipmentId/importing", isAuthenticated, async (req, res) => {
    try {
      const shipmentId = parseInt(req.params.shipmentId);
      const details = await storage.getImportingDetails(shipmentId);
      res.json(details || null);
    } catch (error) {
      console.error("Error fetching importing details:", error);
      res.status(500).json({ message: "Failed to fetch importing details" });
    }
  });

  app.get("/api/shipments/:shipmentId/importing-details", isAuthenticated, async (req, res) => {
    try {
      const shipmentId = parseInt(req.params.shipmentId);
      const details = await storage.getImportingDetails(shipmentId);
      res.json(details || null);
    } catch (error) {
      console.error("Error fetching importing details:", error);
      res.status(500).json({ message: "Failed to fetch importing details" });
    }
  });

  app.post("/api/shipments/:shipmentId/importing", isAuthenticated, requireEditor, async (req, res) => {
    try {
      const shipmentId = parseInt(req.params.shipmentId);
      const parsed = insertImportingDetailsSchema.safeParse({
        ...req.body,
        shipmentId,
      });
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
      }
      const details = await storage.upsertImportingDetails(parsed.data);
      res.json(details);
    } catch (error) {
      console.error("Error saving importing details:", error);
      res.status(500).json({ message: "Failed to save importing details" });
    }
  });

  app.put("/api/shipments/:shipmentId/importing-details", isAuthenticated, requireEditor, async (req, res) => {
    try {
      const shipmentId = parseInt(req.params.shipmentId);
      const parsed = insertImportingDetailsSchema.safeParse({
        ...req.body,
        shipmentId,
      });
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
      }
      const details = await storage.upsertImportingDetails(parsed.data);
      res.json(details);
    } catch (error) {
      console.error("Error saving importing details:", error);
      res.status(500).json({ message: "Failed to save importing details" });
    }
  });

  // Customs routes
  app.get("/api/customs/summary", isAuthenticated, async (req, res) => {
    try {
      const summary = await storage.getCustomsSummary();
      res.json(summary);
    } catch (error) {
      console.error("Error fetching customs summary:", error);
      res.status(500).json({ message: "Failed to fetch customs summary" });
    }
  });

  app.get("/api/shipments/:shipmentId/customs", isAuthenticated, async (req, res) => {
    try {
      const shipmentId = parseInt(req.params.shipmentId);
      const customs = await storage.getCustoms(shipmentId);
      res.json(customs || null);
    } catch (error) {
      console.error("Error fetching customs:", error);
      res.status(500).json({ message: "Failed to fetch customs" });
    }
  });

  app.post("/api/shipments/:shipmentId/customs", isAuthenticated, requireEditor, async (req, res) => {
    try {
      const shipmentId = parseInt(req.params.shipmentId);
      const parsed = insertCustomsSchema.safeParse({
        ...req.body,
        shipmentId,
      });
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
      }
      const customs = await storage.upsertCustoms(parsed.data);
      res.json(customs);
    } catch (error) {
      console.error("Error saving customs:", error);
      res.status(500).json({ message: "Failed to save customs" });
    }
  });

  // Customs Per Type routes
  app.post("/api/customs/:customsId/per-type", isAuthenticated, requireEditor, async (req, res) => {
    try {
      const customsId = parseInt(req.params.customsId);
      const parsed = insertCustomsPerTypeSchema.safeParse({
        ...req.body,
        customsId,
      });
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
      }
      const perType = await storage.createCustomsPerType(parsed.data);
      res.status(201).json(perType);
    } catch (error) {
      console.error("Error creating customs per type:", error);
      res.status(500).json({ message: "Failed to create customs per type" });
    }
  });

  app.patch("/api/customs-per-type/:id", isAuthenticated, requireEditor, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const perType = await storage.updateCustomsPerType(id, req.body);
      if (!perType) {
        return res.status(404).json({ message: "Record not found" });
      }
      res.json(perType);
    } catch (error) {
      console.error("Error updating customs per type:", error);
      res.status(500).json({ message: "Failed to update record" });
    }
  });

  app.delete("/api/customs-per-type/:id", isAuthenticated, requireEditor, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCustomsPerType(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting customs per type:", error);
      res.status(500).json({ message: "Failed to delete record" });
    }
  });

  return httpServer;
}
