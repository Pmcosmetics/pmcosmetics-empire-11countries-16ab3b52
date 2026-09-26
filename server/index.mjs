import express from "express";
import helmet from "helmet";
import cors from "cors";
import { checkWooConnection, getWooStatus, syncWooProducts } from "./integrations/woocommerce.mjs";
import { getManusStatus, pullManusProducts, validateManusProducts } from "./integrations/manus.mjs";

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "25mb" }));

const locked = (service, reason = "DATA_INTAKE_LOCKED") => ({
  ok: false, service, status: 503, gate: "CLOSED", reason
});

app.get("/", (_req, res) => res.json({
  ok: true,
  service: "pmcosmetics-empire-11countries",
  gate: "CLOSED",
  message: "PM Cosmetics Hub API is running on Vercel/Railway",
  health: "/api/health",
  products: "/api/products",
  staging: "/api/products/staging",
  manus: "/api/manus/status",
  woocommerce: "/api/woocommerce/status"
}));

app.get("/api/health", (_req, res) => res.json({
  ok: true,
  service: "pmcosmetics-empire-11countries",
  gate: "CLOSED",
  runtime: "Vercel/Railway",
  dataSource: "Airtable",
  architecture: ["ChatGPT","Products OS","Airtable","Vercel","Railway","Manus","WooCommerce","Shopify","Noon","Amazon","Jumia"]
}));

app.get("/api/manus/status", (_req, res) => {
  res.json({ ok: true, gate: "CLOSED", service: "manus-catalog-adapter", ...getManusStatus() });
});

app.post("/api/manus/import", async (req, res) => {
  try {
    const products = Array.isArray(req.body?.products) ? req.body.products : await pullManusProducts();
    const result = validateManusProducts(products);
    return res.json({
      ok: true,
      source: "Manus",
      ...result,
      message: result.publishable ? "Ready" : "Staged only: evidence gate remains closed"
    });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      gate: "CLOSED",
      reason: "MANUS_IMPORT_FAILED",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.post("/api/manus/woocommerce/sync", async (req, res) => {
  try {
    const products = Array.isArray(req.body?.products) ? req.body.products : await pullManusProducts();
    const dryRun = req.body?.dryRun !== false;

    if (!dryRun && process.env.COMMERCIAL_PUBLISH_GATE !== "OPEN") {
      return res.status(503).json(locked("manus-woocommerce-sync", "COMMERCIAL_PUBLISH_GATE_CLOSED"));
    }

    const result = await syncWooProducts(products, { dryRun });
    return res.json({ ok: true, source: "Manus", ...result, gate: dryRun ? "CLOSED" : "OPEN" });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      gate: "CLOSED",
      reason: "MANUS_WOOCOMMERCE_SYNC_FAILED",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.get("/api/woocommerce/status", (_req, res) => {
  res.json({
    ok: true,
    gate: "CLOSED",
    service: "woocommerce-connector",
    ...getWooStatus()
  });
});

app.get("/api/woocommerce/check", async (_req, res) => {
  const result = await checkWooConnection();
  res.status(result.reachable ? 200 : result.configured ? 502 : 200).json({
    ...result,
    gate: "CLOSED"
  });
});

app.post("/api/woocommerce/sync", async (req, res) => {
  try {
    const products = Array.isArray(req.body?.products) ? req.body.products : [];
    const dryRun = req.body?.dryRun !== false;

    if (products.length === 0) {
      return res.status(400).json({ ok: false, gate: "CLOSED", reason: "NO_PRODUCTS" });
    }

    if (!dryRun && process.env.COMMERCIAL_PUBLISH_GATE !== "OPEN") {
      return res.status(503).json(locked("woocommerce-sync", "COMMERCIAL_PUBLISH_GATE_CLOSED"));
    }

    const result = await syncWooProducts(products, { dryRun });
    return res.json({ ...result, gate: dryRun ? "CLOSED" : "OPEN" });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      gate: "CLOSED",
      reason: "WOOCOMMERCE_SYNC_FAILED",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.post("/api/chat", (_req, res) => res.status(503).json(locked("chat")));
app.get("/api/products", (_req, res) => res.status(503).json(locked("products")));
app.get("/api/products/staging", (_req, res) => res.json({
  ok: true,
  gate: "CLOSED",
  publishable: false,
  source: "Airtable",
  feed: "/data/products/staging-evidence.json"
}));
app.post("/api/products", (_req, res) => res.status(503).json(locked("products")));
app.post("/api/shopify/sync", (_req, res) => res.status(503).json(locked("shopify-sync","SHOPIFY_NOT_VERIFIED")));
app.post("/api/noon/import", (_req, res) => res.status(503).json(locked("noon-import","NOON_NOT_VERIFIED")));
app.post("/api/amazon/import", (_req, res) => res.status(503).json(locked("amazon-import","AMAZON_NOT_VERIFIED")));
app.post("/api/jumia/import", (_req, res) => res.status(503).json(locked("jumia-import","JUMIA_NOT_VERIFIED")));

export default app;
