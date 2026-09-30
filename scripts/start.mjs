import app from "../server/index.mjs";

const port = Number(process.env.PORT || 3000);
const gate = String(process.env.COMMERCIAL_PUBLISH_GATE || "CLOSED").toUpperCase() === "OPEN" ? "OPEN" : "CLOSED";
app.listen(port, () => {
  console.log(`PM Cosmetics Hub API listening on :${port} (Gate ${gate})`);
});
