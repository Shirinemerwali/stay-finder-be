import { Hono } from "hono";
import type { PostgrestError, User } from "@supabase/supabase-js";

import {
  bookingOptionalValidator,
  bookingValidator,
} from "../validators/bookingValidator.js";
import {
  createBooking,
  deleteBooking,
  getBookingsByPropertyId,
  updateBooking,
} from "../database/bookings.js";
import { requireAuth } from "../middleware/auth.js";

const FOREIGN_KEY_VIOLATION = "23503";

const bookings = new Hono({ strict: false });

bookings.get("/properties/:propertyId", requireAuth, async (c) => {
  const propertyId = c.req.param("propertyId")!;
  const sb = c.get("supabase");

  try {
    const bookings = await getBookingsByPropertyId(sb, propertyId);
    return c.json(bookings);
  } catch (e) {
    console.warn("Error in fetching bookings from SB database", e);
    return c.json([]);
  }
});

bookings.post(
  "/properties/:propertyId",
  bookingValidator,
  requireAuth,
  async (c) => {
    const propertyId = c.req.param("propertyId")!;
    const bookingBody = c.req.valid("json");
    const sb = c.get("supabase");
    const user = c.get("user") as User;

    try {
      const booking = await createBooking(sb, {
        ...bookingBody,
        property_id: propertyId,
        user_id: user.id,
      });
      return c.json(booking, 201);
    } catch (e) {
      console.warn("Error in inserting booking into SB DB", e);
      if ((e as PostgrestError).code === FOREIGN_KEY_VIOLATION) {
        return c.json(null, 404);
      }
      return c.json(e, 500);
    }
  },
);

bookings.patch(
  "/properties/:propertyId/:bookingId",
  bookingOptionalValidator,
  requireAuth,
  async (c) => {
    const propertyId = c.req.param("propertyId")!;
    const bookingId = c.req.param("bookingId")!;
    const bookingBody = c.req.valid("json");
    const sb = c.get("supabase");

    try {
      const booking = await updateBooking(
        sb,
        propertyId,
        bookingId,
        bookingBody,
      );
      return c.json(booking);
    } catch (e) {
      console.warn("Error updating booking in SB DB", e);
      return c.json(null, 404);
    }
  },
);

bookings.delete(
  "/properties/:propertyId/:bookingId",
  requireAuth,
  async (c) => {
    const propertyId = c.req.param("propertyId")!;
    const bookingId = c.req.param("bookingId")!;
    const sb = c.get("supabase");

    try {
      await deleteBooking(sb, propertyId, bookingId);
      return c.json(null, 200);
    } catch (e) {
      console.warn("Error in deleting booking", e);
      return c.json(null, 404);
    }
  },
);

export default bookings;