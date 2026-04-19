import "dotenv/config";
import express from "express";
import { createAppServices } from "../app.js";
import { createHttpRouter } from "./routes.js";

const token = process.env.CONTENTFUL_MANAGEMENT_TOKEN;
if (!token) {
  console.error(
    JSON.stringify({
      level: "error",
      msg: "CONTENTFUL_MANAGEMENT_TOKEN is required",
      time: new Date().toISOString(),
    }),
  );
  process.exit(1);
}

const defaultBatchRaw = process.env.DEFAULT_UNLINK_BATCH_SIZE;
const defaultUnlinkBatchSize =
  defaultBatchRaw !== undefined && defaultBatchRaw !== ""
    ? Number.parseInt(defaultBatchRaw, 10)
    : undefined;

const services = createAppServices({
  accessToken: token,
  defaultUnlinkBatchSize: Number.isFinite(defaultUnlinkBatchSize) ? defaultUnlinkBatchSize : undefined,
});
const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(createHttpRouter(services));

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
app.listen(port, () => {
  console.log(
    JSON.stringify({
      level: "info",
      msg: "http.listening",
      port,
      time: new Date().toISOString(),
    }),
  );
});
