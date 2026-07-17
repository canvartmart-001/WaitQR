import dotenv from "dotenv";
import http from "node:http";
import express from "express";
import { Server as SocketIOServer } from "socket.io";
import {
  ensureSchema,
  createSubmission,
  getSubmissionById,
  getSubmissionByLabel,
  listSubmissions,
  updateSubmissionStatus,
  clearSubmissions,
  getSubmissionStats,
  getLiveQueueCounts,
  recordQueueCountEvent,
  listQueueCountEvents,
  getAppSettings,
  saveAppSettings,
} from "./store.js";

dotenv.config();

const app = express();
const server = http.createServer(app);
const port = Number(process.env.PORT || 4000);
const corsOrigin = process.env.CORS_ORIGIN || "*";
const resolveOriginHeader = (origin) => {
  if (!origin || corsOrigin === "*") return origin || "*";
  return origin === corsOrigin ? origin : corsOrigin;
};
const io = new SocketIOServer(server, {
  cors: {
    origin(origin, callback) {
      callback(null, resolveOriginHeader(origin));
    },
    methods: ["GET", "POST"],
  },
});

function emitSubmissionChange(type, submission = null) {
  io.emit("submissions:changed", {
    type,
    submissionId: submission?.id || null,
  });
}

async function emitLiveQueueCounts(eventType, submission = null) {
  try {
    io.emit("queue:counts", await recordQueueCountEvent(eventType, submission?.id || null));
  } catch (error) {
    console.error("Failed to emit live queue counts", error);
  }
}

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", resolveOriginHeader(req.headers.origin));
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }

  next();
});
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/submissions", async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit || 100), 1), 500);
    const submissions = await listSubmissions(limit);
    res.json({ submissions });
  } catch (error) {
    console.error("Failed to list submissions", error);
    res.status(500).json({ error: "Failed to load submissions." });
  }
});

app.get("/api/submissions/label/:label", async (req, res) => {
  try {
    const submission = await getSubmissionByLabel(req.params.label);

    if (!submission) {
      res.status(404).json({ error: "Submission not found." });
      return;
    }

    res.json({ submission });
  } catch (error) {
    console.error("Failed to load submission", error);
    res.status(500).json({ error: "Failed to load submission." });
  }
});

app.get("/api/submissions/stats", async (_req, res) => {
  try {
    const stats = await getSubmissionStats();
    res.json({ stats });
  } catch (error) {
    console.error("Failed to load submission stats", error);
    res.status(500).json({ error: "Failed to load submission stats." });
  }
});

app.get("/api/submissions/:id", async (req, res) => {
  try {
    const submission = await getSubmissionById(req.params.id);

    if (!submission) {
      res.status(404).json({ error: "Submission not found." });
      return;
    }

    res.json({ submission });
  } catch (error) {
    console.error("Failed to load submission", error);
    res.status(500).json({ error: "Failed to load submission." });
  }
});

app.get("/api/queue-count-events", async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit || 500), 1), 2000);
    const events = await listQueueCountEvents(limit);
    res.json({ events });
  } catch (error) {
    console.error("Failed to load queue count events", error);
    res.status(500).json({ error: "Failed to load queue count events." });
  }
});

app.delete("/api/submissions", async (_req, res) => {
  try {
    await clearSubmissions();
    res.json({ ok: true });
    emitSubmissionChange("cleared");
    await emitLiveQueueCounts("cleared");
  } catch (error) {
    console.error("Failed to clear submissions", error);
    res.status(500).json({ error: "Failed to clear submissions." });
  }
});

app.get("/api/settings", async (_req, res) => {
  try {
    const settings = await getAppSettings();
    if (!Array.isArray(settings.members) && Array.isArray(settings.staff)) {
      settings.members = settings.staff;
    }
    res.json({ settings });
  } catch (error) {
    console.error("Failed to load settings", error);
    res.status(500).json({ error: "Failed to load settings." });
  }
});

app.put("/api/settings", async (req, res) => {
  const { services, desks, members, staff, appearance } = req.body || {};
  const settings = {};
  const memberSettings = Array.isArray(members) ? members : Array.isArray(staff) ? staff : null;

  if (Array.isArray(services)) settings.services = services;
  if (Array.isArray(desks)) settings.desks = desks;
  if (Array.isArray(memberSettings)) settings.members = memberSettings;
  if (appearance && typeof appearance === "object" && !Array.isArray(appearance)) settings.appearance = appearance;

  try {
    await saveAppSettings(settings);
    res.json({ settings });
  } catch (error) {
    console.error("Failed to save settings", error);
    res.status(500).json({ error: "Failed to save settings." });
  }
});

app.post("/api/submissions", async (req, res) => {
  const { name, phone, serviceId = "", type } = req.body || {};
  const trimmedName = typeof name === "string" ? name.trim() : "";
  const trimmedPhone = typeof phone === "string" ? phone.trim() : "";
  const phoneDigits = trimmedPhone.replace(/\D/g, "");

  if (!trimmedName || !phoneDigits) {
    res.status(400).json({ error: "Name and mobile number are required." });
    return;
  }

  if (type !== "general" && type !== "priority") {
    res.status(400).json({ error: "Ticket type must be general or priority." });
    return;
  }

  try {
    const { submission, counterValue } = await createSubmission({
      name: trimmedName,
      phone: trimmedPhone,
      serviceId,
      type,
    });

    res.status(201).json({
      submission,
      counters: {
        [type]: counterValue,
      },
    });
    emitSubmissionChange("created", submission);
    await emitLiveQueueCounts("created", submission);
  } catch (error) {
    console.error("Failed to create submission", error);
    res.status(500).json({ error: "Failed to save submission." });
  }
});

app.patch("/api/submissions/:id/status", async (req, res) => {
  const allowedStatuses = new Set(["queued", "called", "serving", "completed", "skipped", "removed"]);
  const { status, deskId = null } = req.body || {};
  const normalizedDeskId = deskId == null || deskId === "" ? null : String(deskId);

  if (!allowedStatuses.has(status)) {
    res.status(400).json({ error: "Invalid submission status." });
    return;
  }

  if ((status === "called" || status === "serving") && normalizedDeskId == null) {
    res.status(400).json({ error: "Desk assignment is required for called and serving tickets." });
    return;
  }

  try {
    const submission = await updateSubmissionStatus(req.params.id, status, normalizedDeskId);

    if (!submission) {
      res.status(404).json({ error: "Submission not found." });
      return;
    }

    res.json({ submission });
    emitSubmissionChange("status-updated", submission);
    if (submission.status !== "called") {
      await emitLiveQueueCounts(`status:${submission.status}`, submission);
    }
  } catch (error) {
    console.error("Failed to update submission status", error);
    res.status(500).json({ error: "Failed to update submission status." });
  }
});

async function start() {
  await ensureSchema();
  io.on("connection", (socket) => {
    socket.emit("realtime:ready", { ok: true });
    Promise.all([getLiveQueueCounts(), listQueueCountEvents()])
      .then(([counts, events]) => {
        socket.emit("queue:history", { events });
        socket.emit("queue:current", counts);
      })
      .catch((error) => console.error("Failed to send live queue history", error));
  });

  server.listen(port, () => {
    console.log(`WaitQR backend listening on http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start backend", error);
  process.exit(1);
});
