import assert from "node:assert/strict";
import app from "../server/index.mjs";

assert.equal(typeof app, "function");
assert.equal(typeof app.get, "function");

const server = app.listen(0);
const { port } = server.address();

try {
  const health = await fetch(`http://127.0.0.1:${port}/api/health`);
  assert.equal(health.status, 200);
  const healthBody = await health.json();
  assert.equal(healthBody.ok, true);
  assert.equal(healthBody.gate, "CLOSED");
  assert.equal(healthBody.service, "pmcosmetics-empire-11countries");
  assert.equal(healthBody.supabaseConfigured, healthBody.dataSource === "Supabase");
  assert.deepEqual(healthBody.architecture, ["ChatGPT","Products OS","Airtable","Supabase","Vercel","Railway","Manus","WooCommerce","Shopify","Noon","Amazon","Jumia"]);

  const readiness = await fetch(`http://127.0.0.1:${port}/api/readiness`);
  assert.equal(readiness.status, 200);
  const readinessBody = await readiness.json();
  assert.equal(readinessBody.ok, true);
  assert.equal(readinessBody.mode, "CONTROLLED_PILOT");
  assert.equal(readinessBody.commercialWrites, "LOCKED");
  assert.equal(readinessBody.marketScope.count, 11);
  assert.equal(readinessBody.marketScope.launchValidationRequired, true);
  assert.equal(readinessBody.externalWriteRoutes.shopify, "LOCKED_BY_GATE");
  assert.equal(readinessBody.externalWriteRoutes.noon, "LOCKED_BY_GATE");

  const manus = await fetch(`http://127.0.0.1:${port}/api/manus/status`);
  assert.equal(manus.status, 200);
  const manusBody = await manus.json();
  assert.equal(manusBody.ok, true);
  assert.equal(manusBody.gate, "CLOSED");

  const manusImport = await fetch(`http://127.0.0.1:${port}/api/manus/import`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ products: [
      { sku: "PM-MANUS-001", name: "Manus Product A" },
      { sku: "PM-MANUS-001", name: "Duplicate" },
      { name: "Missing SKU" }
    ]})
  });
  assert.equal(manusImport.status, 200);
  const manusBody2 = await manusImport.json();
  assert.equal(manusBody2.validCount, 1);
  assert.equal(manusBody2.duplicateSkuCount, 1);
  assert.equal(manusBody2.invalidCount, 1);
  assert.equal(manusBody2.publishable, false);

  const woo = await fetch(`http://127.0.0.1:${port}/api/woocommerce/status`);
  assert.equal(woo.status, 200);
  const wooBody = await woo.json();
  assert.equal(wooBody.ok, true);
  assert.equal(wooBody.gate, "CLOSED");

  const dryRun = await fetch(`http://127.0.0.1:${port}/api/woocommerce/sync`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ dryRun: true, products: [
      { sku: "PM-TEST-001", name: "PM Test Product", price: 100, stock: 1 },
      { sku: "PM-TEST-001", name: "Duplicate" }
    ]})
  });
  assert.equal(dryRun.status, 200);
  const dryRunBody = await dryRun.json();
  assert.equal(dryRunBody.dryRun, true);
  assert.equal(dryRunBody.validCount, 1);
  assert.equal(dryRunBody.duplicateSkuCount, 1);

  const products = await fetch(`http://127.0.0.1:${port}/api/products`);
  const productsBody = await products.json();
  assert.equal(productsBody.gate, "CLOSED");
  assert.equal(productsBody.source, "Supabase");
  assert.equal(productsBody.readOnly, true);
  if (products.status === 200) {
    assert.equal(productsBody.ok, true);
    assert.equal(productsBody.publishable, false);
    assert.ok(Array.isArray(productsBody.products));
  } else {
    assert.equal(products.status, 503);
    assert.equal(productsBody.ok, false);
    assert.ok(productsBody.reason);
  }
} finally {
  server.close();
}

console.log("Gate API contract tests passed");
