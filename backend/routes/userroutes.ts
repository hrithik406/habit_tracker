import { Router, Request, Response } from "express";
import User from "../models/User";
import { ensureUser } from "../utils/ensureUser";

const router = Router();

// PUT /api/users/:id/timezone
router.put("/:id/timezone", async (req: Request<{ id: string }, {}, { timezone?: string }>, res: Response): Promise<void> => {
  try {
    const { timezone } = req.body;
    if (!timezone) { res.status(400).json({ error: "timezone is required" }); return; }

    const user = await ensureUser(req.params.id, timezone);

    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: (err as Error).message });
  }
});

// GET /api/users/:id
router.get("/:id", async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id).select("-passwordHash");
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: (err as Error).message });
  }
});

export default router;