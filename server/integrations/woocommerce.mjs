const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_PAGE_SIZE = 100;
const DEFAULT_TIMEOUT_MS = 15000;
const MAX_PRODUCTS_PER_RUN = 10000;

function getWooConfig() {
  const baseUrl = String(process.env.WOOCOMMERCE_URL || "").trim().replace(/\/+$/, "");
  const consumerKey = String(process.env.WOOCOMMERCE_CONSUMER_KEY || "").trim();
  const consumerSecret = String(process.env.WOOCOMMERCE_CONSUMER_SECRET || "").trim();
  const enabled = String(process.env.WOOCOMMERCE_SYNC_ENABLED || "").toLowerCase() === "true";
  const batchSize = Math.min(
    100,
    Math.max(1, Number(process.env.WOOCOMMERCE_BATCH_SIZE || DEFAULT_BATCH_SIZE))
  );

  return { baseUrl, consumerKey, consumerSecret, enabled, batchSize };
}

function assertValidBaseUrl(baseUrl) {
  if (!baseUrl) throw new Error("WOOCOMMERCE_URL is not configured");
  const url = new URL(baseUrl);
  if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new Error("WOOCOMMERCE_URL must use HTTPS");
  }
}

export function getWooStatus() {
  const config = getWooConfig();
  const missing = [];

  if (!config.baseUrl) missing.push("WOOCOMMERCE_URL");
  if (!config.consumerKey) missing.push("WOOCOMMERCE_CONSUMER_KEY");
  if (!config.consumerSecret) missing.push("WOOCOMMERCE_CONSUMER_SECRET");

  let urlOk = false;
  if (config.baseUrl) {
    try {
      assertValidBaseUrl(config.baseUrl);
      urlOk = true;
    } catch {
      missing.push("WOOCOMMERCE_URL_HTTPS");
    }
  }

  return {
    configured: missing.length === 0 && urlOk,
    enabled: config.enabled,
    batchSize: config.batchSize,
    missing: [...new Set(missing)],
    api: config.baseUrl ? `${config.baseUrl}/wp-json/wc/v3` : null
  };
}

function authHeader(consumerKey, consumerSecret) {
  return `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64")}`;
}

async function wooRequest(path, { method = "GET", body, signal } = {}) {
  const config = getWooConfig();
  assertValidBaseUrl(config.baseUrl);

  if (!config.consumerKey || !config.consumerSecret) {
    throw new Error("WooCommerce API credentials are not configured");
  }

  const requestSignal = signal || AbortSignal.timeout(DEFAULT_TIMEOUT_MS);
  const response = await fetch(`${config.baseUrl}/wp-json/wc/v3${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: authHeader(config.consumerKey, config.consumerSecret)
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: requestSignal
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }

  if (!response.ok) {
    const message = payload?.message || payload?.code || `WooCommerce request failed with HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return { payload, headers: response.headers };
}

export async function checkWooConnection() {
  const status = getWooStatus();
  if (!status.configured) {
    return {
      ok: false,
      configured: false,
      reachable: false,
      enabled: status.enabled,
      missing: status.missing,
      api: status.api
    };
  }

  try {
    const { payload, headers } = await wooRequest("/products?per_page=1&page=1&orderby=id&order=asc");
    return {
      ok: true,
      configured: true,
      reachable: true,
      enabled: status.enabled,
      api: status.api,
      sampleCount: Array.isArray(payload) ? payload.length : 0,
      remoteProductCount: Number(headers.get("x-wp-total") || 0),
      remotePageCount: Number(headers.get("x-wp-totalpages") || 0)
    };
  } catch (error) {
    return {
      ok: false,
      configured: true,
      reachable: false,
      enabled: status.enabled,
      api: status.api,
      httpStatus: Number(error?.status || 0) || null,
      error: error instanceof Error ? error.message : "Unknown WooCommerce connection error"
    };
  }
}

async function listAllProducts() {
  const existing = [];
  let page = 1;

  while (true) {
    const { payload, headers } = await wooRequest(
      `/products?per_page=${DEFAULT_PAGE_SIZE}&page=${page}&orderby=id&order=asc`
    );
    if (!Array.isArray(payload) || payload.length === 0) break;

    existing.push(...payload);
    if (existing.length > MAX_PRODUCTS_PER_RUN) {
      throw new Error(`WooCommerce catalog exceeds the safe ${MAX_PRODUCTS_PER_RUN}-product run limit`);
    }

    const totalPages = Number(headers.get("x-wp-totalpages") || page);
    if (page >= totalPages) break;
    page += 1;
  }

  return existing;
}

function normalizeProduct(input) {
  const source = input && typeof input === "object" ? input : {};
  const sku = String(source.sku ?? source.SKU ?? "").trim();
  const name = String(source.name ?? source.product ?? source.title ?? "").trim();
  const price = source.regular_price ?? source.price ?? source.retail_price ?? source.public_price;

  if (!sku || !name) return null;

  const item = {
    name,
    sku,
    type: source.type || "simple",
    status: source.status || "draft"
  };

  const barcode = source.barcode ?? source.gtin ?? source.GTIN;
  if (barcode) item.meta_data = [{ key: "_pm_gtin", value: String(barcode).trim() }];

  if (price !== undefined && price !== null && String(price).trim() !== "") {
    item.regular_price = String(price);
  }

  const stock = source.stock_quantity ?? source.stock ?? source.pm_stock;
  if (stock !== undefined && stock !== null && String(stock).trim() !== "") {
    const stockQuantity = Number(stock);
    if (Number.isFinite(stockQuantity)) {
      item.manage_stock = true;
      item.stock_quantity = Math.max(0, Math.floor(stockQuantity));
      item.stock_status = stockQuantity > 0 ? "instock" : "outofstock";
    }
  }

  const description = source.description ?? source.long_description;
  const shortDescription = source.short_description ?? source.shortDescription;
  if (description) item.description = String(description);
  if (shortDescription) item.short_description = String(shortDescription);

  const images = Array.isArray(source.images)
    ? source.images
        .map((image) => typeof image === "string" ? image : image?.src || image?.url)
        .filter(Boolean)
        .map((src) => ({ src }))
    : [];

  if (images.length > 0) item.images = images;

  if (source.category) {
    const categories = Array.isArray(source.category) ? source.category : [source.category];
    item.categories = categories
      .map((category) => typeof category === "string" ? category : category?.name)
      .filter(Boolean)
      .map((name) => ({ name: String(name) }));
  }

  return item;
}

function dedupeBySku(products) {
  const unique = [];
  const seen = new Set();
  let duplicateCount = 0;

  for (const product of products) {
    const sku = String(product?.sku || "").trim();
    if (!sku || seen.has(sku)) {
      if (sku) duplicateCount += 1;
      continue;
    }
    seen.add(sku);
    unique.push(product);
  }

  return { unique, duplicateCount };
}

function chunk(items, size) {
  const output = [];
  for (let i = 0; i < items.length; i += size) {
    output.push(items.slice(i, i + size));
  }
  return output;
}

export async function syncWooProducts(products, { dryRun = true } = {}) {
  if (!Array.isArray(products)) throw new Error("products must be an array");
  if (products.length > MAX_PRODUCTS_PER_RUN) {
    throw new Error(`Product run exceeds the safe ${MAX_PRODUCTS_PER_RUN}-product limit`);
  }

  const normalized = products.map(normalizeProduct).filter(Boolean);
  const skipped = products.length - normalized.length;
  const { unique, duplicateCount } = dedupeBySku(normalized);

  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      sourceCount: products.length,
      validCount: unique.length,
      skippedCount: skipped,
      duplicateSkuCount: duplicateCount,
      createCount: unique.length,
      updateCount: 0,
      batches: 0
    };
  }

  const config = getWooConfig();
  if (!config.enabled) throw new Error("WOOCOMMERCE_SYNC_ENABLED is not true");
  if (!getWooStatus().configured) throw new Error("WooCommerce integration is not fully configured");

  const existing = await listAllProducts();
  const existingBySku = new Map(
    existing
      .filter((item) => item?.sku)
      .map((item) => [String(item.sku).trim(), item])
  );

  const creates = [];
  const updates = [];

  for (const item of unique) {
    const current = existingBySku.get(item.sku);
    if (current?.id) {
      updates.push({ id: current.id, ...item });
    } else {
      creates.push(item);
    }
  }

  let createResults = 0;
  let updateResults = 0;
  const totalBatches = Math.ceil(creates.length / config.batchSize) + Math.ceil(updates.length / config.batchSize);

  for (const batch of chunk(creates, config.batchSize)) {
    const { payload } = await wooRequest("/products/batch", {
      method: "POST",
      body: { create: batch }
    });
    const created = Array.isArray(payload?.create) ? payload.create : [];
    const errors = created.filter((item) => item?.error);
    if (errors.length) throw new Error(`WooCommerce rejected ${errors.length} product creates`);
    createResults += created.length || batch.length;
  }

  for (const batch of chunk(updates, config.batchSize)) {
    const { payload } = await wooRequest("/products/batch", {
      method: "POST",
      body: { update: batch }
    });
    const updated = Array.isArray(payload?.update) ? payload.update : [];
    const errors = updated.filter((item) => item?.error);
    if (errors.length) throw new Error(`WooCommerce rejected ${errors.length} product updates`);
    updateResults += updated.length || batch.length;
  }

  return {
    ok: true,
    dryRun: false,
    sourceCount: products.length,
    validCount: unique.length,
    skippedCount: skipped,
    duplicateSkuCount: duplicateCount,
    createCount: createResults,
    updateCount: updateResults,
    batches: totalBatches
  };
}
