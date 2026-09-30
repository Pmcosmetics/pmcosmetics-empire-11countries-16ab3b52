import { readFile } from "node:fs/promises";

const schema = JSON.parse(await readFile("config/catalog.schema.json", "utf8"));
if (schema?.properties?.brand?.type !== "string") throw new Error("Catalog brand must accept the full brand catalog");
const skuPattern = schema?.properties?.sku?.pattern;
if (!skuPattern) throw new Error("Catalog SKU pattern is missing");

const skuRegex = new RegExp(skuPattern);
for (const sku of ["PM-ABC12345", "DERMAELLE007", "86067"]) {
  if (!skuRegex.test(sku)) {
    throw new Error(`Catalog SKU contract rejects known live SKU format: ${sku}`);
  }
}

if (!Array.isArray(schema?.properties?.markets?.items?.enum) || schema.properties.markets.items.enum.length !== 11) {
  throw new Error("Catalog markets must contain all 11 configured markets");
}
const markets = JSON.parse(await readFile("config/markets.json", "utf8"));
if (markets.markets?.length !== 11) throw new Error("markets.json must define exactly 11 markets");
if (markets.rules?.catalog_requires_validation !== true) throw new Error("Catalog validation gate must be enabled");
console.log("Catalog contract validation passed");
