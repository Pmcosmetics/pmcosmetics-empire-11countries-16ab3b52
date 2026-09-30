import { readFile } from "node:fs/promises";

const read = (file) => readFile(file, "utf8");
const required = [
  "README.md",
  "package.json",
  "config/markets.json",
  "config/catalog.schema.json",
  "server/index.mjs",
  "app/intake/README.md",
  "data/products/README.md",
  "data/images/real/README.md",
  "design-system/astryx/README.md",
];

for (const file of required) await read(file);

const server = await read("server/index.mjs");
const productReadme = await read("data/products/README.md");
const imageReadme = await read("data/images/real/README.md");

if (!server.includes('gate: "CLOSED"')) throw new Error("Active server gate contract is not CLOSED");
if (!server.includes("DATA_INTAKE_LOCKED")) throw new Error("Active products API lock is missing");
if (!server.includes('app.get("/api/products"')) throw new Error("Active products API route is missing");
if (!productReadme.includes("verified PM Cosmetics product source")) {
  throw new Error("Product source staging contract is missing");
}
if (!productReadme.includes("Staging evidence alone does not open the commercial publication gate")) {
  throw new Error("Product staging evidence-gate rule is missing");
}
if (!imageReadme.includes("verified PM-owned real product images")) {
  throw new Error("Real image staging contract is missing");
}
if (!imageReadme.includes("Do not add placeholders")) {
  throw new Error("Real image anti-placeholder guard is missing");
}

console.log("Validation passed: active server contract, staging provenance rules, Gate CLOSED, and products API lock");
