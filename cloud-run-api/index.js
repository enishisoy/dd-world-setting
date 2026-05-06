import express from "express";

const app = express();
const PORT = process.env.PORT || 8080;

const OWNER = "enishisoy";
const REPO = "dd-world-setting";
const BRANCH = "main";
const ROOT = "DD_WORLD";

const FIXED_FILES = [
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

async function fetchJsonFile(path) {
  const url = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${ROOT}/${path}`;
  const response = await fetch(url);

  if (!response.ok) {
    return { ok: false, status: response.status, url, path };
  }

  const text = await response.text();

  try {
    return { ok: true, data: JSON.parse(text), url, path };
  } catch (error) {
    return {
      ok: false,
      error: error.message,
      url,
      path,
      preview: text.slice(0, 300),
      tail: text.slice(-300)
    };
  }
}

async function listJsonFiles(dir) {
  const apiUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${ROOT}/${dir}?ref=${BRANCH}`;
  const response = await fetch(apiUrl);

  if (!response.ok) {
    return [];
  }

  const items = await response.json();
  let results = [];

  for (const item of items) {
    if (item.type === "file" && item.name.endsWith(".json")) {
      results.push(`${dir}/${item.name}`);
    }

    if (item.type === "dir") {
      const childDir = `${dir}/${item.name}`;
      const childFiles = await listJsonFiles(childDir);
      results = results.concat(childFiles);
    }
  }

  return results;
}

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
    const dynamicFiles = [
      ...(await listJsonFiles("character")),
      ...(await listJsonFiles("story"))
    ];

    const allFiles = [...new Set([...FIXED_FILES, ...dynamicFiles])];

    const files = {};

    for (const file of allFiles) {
      files[file] = await fetchJsonFile(file);
    }

    res.json({
      ok: true,
      source: `https://github.com/${OWNER}/${REPO}/tree/${BRANCH}/${ROOT}`,
      total_files: allFiles.length,
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
