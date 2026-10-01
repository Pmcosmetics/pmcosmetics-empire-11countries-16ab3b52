import express from "express";
import helmet from "helmet";
import cors from "cors";
import { createRequire } from "node:module";
import { checkWooConnection, getWooStatus, syncWooProducts } from "./integrations/woocommerce.mjs";
import { getManusStatus, pullManusProducts, validateManusProducts } from "./integrations/manus.mjs";
import { isSupabaseConfigured, listActiveProducts } from "./integrations/supabase.mjs";

const require = createRequire(import.meta.url);
const marketConfig = require("../config/markets.json");

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "25mb" }));

// gate: "CLOSED" - Active server gate contract
const gateState = () => String(process.env.COMMERCIAL_PUBLISH_GATE || "CLOSED").toUpperCase() === "OPEN" ? "OPEN" : "CLOSED";

// DATA_INTAKE_LOCKED - Active products API lock
const locked = (service, reason = "DATA_INTAKE_LOCKED") => ({
  ok: false, service, status: 503, gate: gateState(), reason
});

const healthResponse = (_req, res) => res.json({
  ok: true,
  service: "pmcosmetics-empire-11countries",
  gate: gateState(),
  runtime: "Vercel/Railway",
  dataSource: isSupabaseConfigured() ? "Supabase" : "Airtable",
  supabaseConfigured: isSupabaseConfigured(),
  architecture: ["ChatGPT","Products OS","Airtable","Supabase","Vercel","Railway","Manus","WooCommerce","Shopify","Noon","Amazon","Jumia"]
});

app.get("/", (_req, res) => res.json({
  ok: true,
  service: "pmcosmetics-empire-11countries",
  gate: gateState(),
  message: "PM Cosmetics Hub API is running on Vercel/Railway",
  health: "/api/health",
  healthAlias: "/health",
  readiness: "/api/readiness",
  products: "/api/products",
  staging: "/api/products/staging",
  manus: "/api/manus/status",
  supabase: "/api/supabase/status",
  woocommerce: "/api/woocommerce/status"
}));

app.get("/api/health", healthResponse);
app.get("/health", healthResponse);
app.get("/favicon.ico", (_req, res) => res.status(204).end());

app.get("/api/readiness", (_req, res) => {
  const gate = gateState();
  const manus = getManusStatus();
  const woocommerce = getWooStatus();
  const supabaseConfigured = isSupabaseConfigured();
  const markets = Array.isArray(marketConfig?.markets) ? marketConfig.markets : [];
  const blockedWrites = gate !== "OPEN";

  return res.json({
    ok: true,
    service: "pmcosmetics-empire-11countries",
    gate,
    mode: blockedWrites ? "CONTROLLED_PILOT" : "COMMERCIAL",
    commercialWrites: blockedWrites ? "LOCKED" : "GATE_OPEN",
    evidencePolicy: "PM-owned identity + exact image + stock + cost/provenance required before commercial publication",
    marketScope: {
      count: markets.length,
      canonicalConfig: "config/markets.json",
      launchValidationRequired: true
    },
    layers: {
      supabase: { configured: supabaseConfigured },
      manus: { configured: manus.configured, enabled: manus.enabled, maxProducts: manus.maxProducts, missing: manus.missing },
      woocommerce: { configured: woocommerce.configured, enabled: woocommerce.enabled, missing: woocommerce.missing }
    },
    externalWriteRoutes: {
      shopify: "LOCKED_BY_GATE",
      noon: "LOCKED_BY_GATE",
      amazon: "LOCKED_BY_GATE",
      jumia: "LOCKED_BY_GATE"
    }
  });
});

app.get("/api/supabase/status", (_req, res) => {
  res.json({
    ok: true,
    gate: gateState(),
    configured: isSupabaseConfigured(),
    mode: isSupabaseConfigured() ? "read-only-products" : "not-configured"
  });
});

app.get("/api/manus/status", (_req, res) => {
  res.json({ ok: true, gate: gateState(), service: "manus-catalog-adapter", ...getManusStatus() });
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
      gate: gateState(),
      reason: "MANUS_IMPORT_FAILED",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.post("/api/manus/woocommerce/sync", async (req, res) => {
  try {
    const products = Array.isArray(req.body?.products) ? req.body.products : await pullManusProducts();
    const dryRun = req.body?.dryRun !== false;

    if (!dryRun && gateState() !== "OPEN") {
      return res.status(503).json(locked("manus-woocommerce-sync", "COMMERCIAL_PUBLISH_GATE_CLOSED"));
    }

    const result = await syncWooProducts(products, { dryRun });
    return res.json({ ok: true, source: "Manus", ...result, gate: dryRun ? gateState() : "OPEN" });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      gate: gateState(),
      reason: "MANUS_WOOCOMMERCE_SYNC_FAILED",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.get("/api/woocommerce/status", (_req, res) => {
  res.json({
    ok: true,
    gate: gateState(),
    service: "woocommerce-connector",
    ...getWooStatus()
  });
});

app.get("/api/woocommerce/check", async (_req, res) => {
  const result = await checkWooConnection();
  res.status(result.reachable ? 200 : result.configured ? 502 : 200).json({
    ...result,
    gate: gateState()
  });
});

app.post("/api/woocommerce/sync", async (req, res) => {
  try {
    const products = Array.isArray(req.body?.products) ? req.body.products : [];
    const dryRun = req.body?.dryRun !== false;

    if (products.length === 0) {
      return res.status(400).json({ ok: false, gate: gateState(), reason: "NO_PRODUCTS" });
    }

    if (!dryRun && gateState() !== "OPEN") {
      return res.status(503).json(locked("woocommerce-sync", "COMMERCIAL_PUBLISH_GATE_CLOSED"));
    }

    const result = await syncWooProducts(products, { dryRun });
    return res.json({ ...result, gate: dryRun ? gateState() : "OPEN" });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      gate: gateState(),
      reason: "WOOCOMMERCE_SYNC_FAILED",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.get("/api/chat", (_req, res) => res.status(503).json(locked("chat")));
app.post("/api/chat", (_req, res) => res.status(503).json(locked("chat")));

app.get("/api/products", async (_req, res) => {
  try {
    const products = await listActiveProducts();
    return res.json({
      ok: true,
      gate: gateState(),
      source: "Supabase",
      readOnly: true,
      publishable: false,
      products
    });
  } catch (error) {
    const reason = error?.code || "SUPABASE_PRODUCTS_READ_FAILED";
    return res.status(503).json({
      ok: false,
      gate: gateState(),
      source: "Supabase",
      readOnly: true,
      reason,
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.get("/api/products/staging", (_req, res) => res.json({
  ok: true,
  gate: gateState(),
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
