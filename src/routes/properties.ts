
import { Hono } from "hono";

import {
  propertyOptionalValidator,
  propertyParamValidator,
  propertyValidator,
} from "../validators/propertyValidator.js";

import {
  createProperty,
  deletePropertyById,
  getProperties,
  getPropertiesByKind,
  getPropertyById,
  updatePropertyById,
} from "../database/properties.js";

import { requireAuth } from "../middleware/auth.js";
import type { User } from "@supabase/supabase-js";
import type { Property } from "../types/property.js";

const properties = new Hono({ strict: false });

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "PGRST116"
  );
}

properties.get("/", async (c) => {
  const sb = c.get("supabase");
  const sort = c.req.query("sort");

  try {
    const propertyList = await getProperties(sb, {
      maxPrice: Number(c.req.query("maxprice")) || undefined,
      location: c.req.query("location"),
      maxGuests: Number(c.req.query("maxguests")) || undefined,
      sort: sort === "asc" || sort === "desc" ? sort : undefined,
    });

    return c.json(propertyList, 200);
  } catch (e) {
    console.warn("Error in fetching properties from SB database", e);
    return c.json({ message: "Could not fetch properties" }, 500);
  }
});

properties.get("/kind/:kind", propertyParamValidator, async (c) => {
  const kind = c.req.valid("param").kind;
  const sb = c.get("supabase");
  const sort = c.req.query("sort");

  try {
    const propertyList = await getPropertiesByKind(sb, kind, {
      maxPrice: Number(c.req.query("maxprice")) || undefined,
      location: c.req.query("location"),
      maxGuests: Number(c.req.query("maxguests")) || undefined,
      sort: sort === "asc" || sort === "desc" ? sort : undefined,
    });

    return c.json(propertyList, 200);
  } catch (e) {
    console.warn("Error in fetching properties from SB database", e);
    return c.json({ message: "Could not fetch properties" }, 500);
  }
});

properties.get("/:id", async (c) => {
  const propertyId = c.req.param("id")!;
  const sb = c.get("supabase");

  try {
    const property = await getPropertyById(sb, propertyId);
    return c.json(property, 200);
  } catch (e) {
    console.warn("Error in fetching property from SB database", e);

    if (isNotFoundError(e)) {
      return c.json({ message: "Property not found" }, 404);
    }

    return c.json({ message: "Could not fetch property" }, 500);
  }
});

properties.post("/", requireAuth, propertyValidator, async (c) => {
  const propertyBody = c.req.valid("json");
  const sb = c.get("supabase");
  const user = c.get("user") as User;

  try {
    const property = await createProperty(sb, {
      ...propertyBody,
      user_id: user.id,
    });

    return c.json(property, 201);
  } catch (e) {
    console.warn("Error in inserting property into SB DB", e);
    return c.json({ message: "Could not create property" }, 500);
  }
});

properties.patch("/:id", requireAuth, propertyOptionalValidator, async (c) => {
  const propertyId = c.req.param("id")!;
  const propertyBody: Partial<Property> = c.req.valid("json");

  delete propertyBody.user_id;

  const sb = c.get("supabase");

  try {
    const property = await updatePropertyById(
      sb,
      propertyId,
      propertyBody,
    );

    return c.json(property, 200);
  } catch (e) {
    console.warn("Error updating property in SB DB", e);
    return c.json({ message: "Could not update property" }, 500);
  }
});

properties.delete("/:id", requireAuth, async (c) => {
  const propertyId = c.req.param("id")!;
  const sb = c.get("supabase");

  try {
    await deletePropertyById(sb, propertyId);
    return c.json(null, 200);
  } catch (e) {
    console.warn("Error in deleting property", e);
    return c.json({ message: "Could not delete property" }, 500);
  }
});

export default properties;
