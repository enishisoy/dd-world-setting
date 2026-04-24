import express from "express";

const app = express();
const PORT = process.env.PORT || 8080;

const BASE_URL =
  "https://raw.githubusercontent.com/enishisoy/dd-world-setting/main/DD_WORLD";

const FILES = [
  "build/build_index.json",
  "system/patch_set_latest.json",
  "world/world_bundle.json",
  "world/world_log.json",
  "world/world_rules.json",
  "world/timeline_master.json",
  "world/world_map_tokyo.json",
  "world/government_access_hierarchy.json",
  "world/location_index.json",
  "index/world_index_log.json",
  "index/factor_compatibility_index.json"
];

app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "DD_WORLD API",
    endpoints: ["/health", "/world"]
  });
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/world", async (req, res) => {
  try {
    const files = {};

    for (const file of FILES) {
      const url = `${BASE_URL}/${file}`;
      const response = await fetch(url);

      if (!response.ok) {
        files[file] = {
          ok: false,
          status: response.status,
          url
        };
        continue;
      }

      files[file] = {
        ok: true,
        data: await response.json()
      };
    }

    res.json({
      ok: true,
      source: BASE_URL,
      files
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`DD_WORLD API listening on port ${PORT}`);
});
