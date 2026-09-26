const DEFAULT_MAX_PRODUCTS = 10000;

function manusConfig() {
  const url = String(process.env.MANUS_PRODUCTS_URL || "").trim().replace(/\/+$/, "");
  const token = String(process.env.MANUS_API_TOKEN || "").trim();
  const enabled = String(process.env.MANUS_SYNC_ENABLED || "").toLowerCase() === "true";
  const maxProducts = Math.min(
    DEFAULT_MAX_PRODUCTS,
    Math.max(1, Number(process.env.MANUS_MAX_PRODUCTS || DEFAULT_MAX_PRODUCTS))
  );
  return { url, token, enabled, maxProducts };
}

function assertValidManusUrl(url) {
  if (!url) throw new Error("MANUS_PRODUCTS_URL is not configured");
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") {
    throw new Error("MANUS_PRODUCTS_URL must use HTTPS");
  }
}

export function getManusStatus() {
  const config = manusConfig();
  let urlOk = false;
  if (config.url) {
    try {
      assertValidManusUrl(config.url);
      urlOk = true;
    } catch {
      urlOk = false;
    }
  }

  const missing = [];
  if (!config.url) missing.push("MANUS_PRODUCTS_URL");
  if (config.url && !urlOk) missing.push("MANUS_PRODUCTS_URL_HTTPS");

  return {
    configured: missing.length === 0 && urlOk,
    enabled: config.enabled,
    maxProducts: config.maxProducts,
    missing,
    source: config.url || null
  };
}

function extractProducts(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.products)) return payload.products;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.products)) return payload.data.products;
  throw new Error("Manus response does not contain a products array");
}

export async function pullManusProducts() {
  const config = manusConfig();
  assertValidManusUrl(config.url);

  const headers = { Accept: "application/json" };
  if (config.token) headers.Authorization = `Bearer ${config.token}`;

  const response = await fetch(config.url, {
    headers,
    signal: AbortSignal.timeout(20000)
  });
  const text = await response.text();

  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new Error("Manus catalog response is not valid JSON");
  }

  if (!response.ok) {
    const message = payload?.message || payload?.error || `Manus catalog request failed with HTTP ${response.status}`;
    throw new Error(message);
  }

  const products = extractProducts(payload);
  if (products.length > config.maxProducts) {
    throw new Error(`Manus catalog contains ${products.length} products; configured maximum is ${config.maxProducts}`);
  }

  return products;
}

export function validateManusProducts(products) {
  if (!Array.isArray(products)) throw new Error("products must be an array");

  const seen = new Set();
  let invalidCount = 0;
  let duplicateSkuCount = 0;
  const validProducts = [];

  for (const raw of products) {
    const item = raw && typeof raw === "object" ? raw : {};
    const sku = String(item.sku ?? item.SKU ?? "").trim();
    const name = String(item.name ?? item.product ?? item.title ?? "").trim();

    if (!sku || !name) {
      invalidCount += 1;
      continue;
    }
    if (seen.has(sku)) {
      duplicateSkuCount += 1;
      continue;
    }

    seen.add(sku);
    validProducts.push(item);
  }

  return {
    sourceCount: products.length,
    validCount: validProducts.length,
    invalidCount,
    duplicateSkuCount,
    publishable: false,
    gate: "CLOSED"
  };
}
