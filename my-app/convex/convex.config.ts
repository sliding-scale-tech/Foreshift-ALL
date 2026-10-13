// Convex components. The Agent component stores AI Pass chat threads/messages and
// streams replies to the client (convex/aiPass.ts). It brings its own isolated
// tables; nothing Bubble calls reads or writes them.
import { defineApp } from "convex/server";
import agent from "@convex-dev/agent/convex.config";

const app = defineApp();
app.use(agent);

export default app;
