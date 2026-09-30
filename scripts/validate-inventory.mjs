import { readFile } from "node:fs/promises";

const markets = JSON.parse(await readFile("config/markets.json", "utf8"));
if (markets.rules?.inventory_requires_validation !== true) {
  throw new Error("Inventory validation gate must be enabled");
}

const productReadme = await readFile("data/products/README.md", "utf8");
if (!(productReadme.includes("Do not add guessed SKU, name, price, stock, barcode, or image values.") || productReadme.includes("SKU, stock, cost, barcode, or image values"))) {
  throw new Error("Inventory anti-guessing guard is missing");
}
if (!productReadme.includes("Staging evidence alone does not open the commercial publication gate")) {
  throw new Error("Inventory evidence-gate guard is missing");
}

console.log("Inventory contract validation passed: validation gate enabled and unverified intake remains blocked");
