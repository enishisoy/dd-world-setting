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
    return {
      ok: false,
      type: "FETCH_ERROR",
      status: response.status,
      statusText: response.statusText,
      url,
      path
    };
  }

  const text = await response.text();

  // 空JSONファイルはエラー扱いにせず、未記入プレースホルダーとして扱う
  if (text.trim() === "") {
    return {
      ok: true,
      type: "EMPTY_PLACEHOLDER",
      empty: true,
      data: {},
      url,
      path
    };
  }

  try {
    return {
      ok: true,
      empty: false,
      data: JSON.parse(text),
      url,
      path
    };
  } catch (error) {
    return {
      ok: false,
      type: "JSON_PARSE_ERROR",
      error: error.message,
      url,
      path,
      preview: text.slice(0, 500),
      tail: text.slice(-500)
    };
  }
}

async function listJsonFiles(dir, diagnostics) {
  const apiUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${ROOT}/${dir}?ref=${BRANCH}`;
  const response = await fetch(apiUrl);

  diagnostics.directory_checks.push({
    dir,
    url: apiUrl,
    ok: response.ok,
    status: response.status,
    statusText: response.statusText
  });

  if (!response.ok) {
    const text = await response.text();

    diagnostics.directory_errors.push({
      dir,
      url: apiUrl,
      status: response.status,
      statusText: response.statusText,
      body_preview: text.slice(0, 500)
    });

    return [];
  }

  const items = await response.json();
  let results = [];

  for (const item of items) {
    diagnostics.scanned_items.push({
      path: item.path,
      name: item.name,
      type: item.type
    });

    if (item.type === "file" && item.name.endsWith(".json")) {
      results.push(`${dir}/${item.name}`);
    }

    if (item.type === "dir") {
      const childDir = `${dir}/${item.name}`;
      const childFiles = await listJsonFiles(childDir, diagnostics);
      results = results.concat(childFiles);
    }
  }

  return results;
}

app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "DD_WORLD API",
    endpoints: ["/health", "/world", "/debug"]
  });
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/world", async (req, res) => {
  try {
    const diagnostics = {
      directory_checks: [],
      directory_errors: [],
      scanned_items: []
    };

    const dynamicFiles = [
      ...(await listJsonFiles("character", diagnostics)),
      ...(await listJsonFiles("story", diagnostics))
    ];

    const allFiles = [...new Set([...FIXED_FILES, ...dynamicFiles])];

    const files = {};
    const errorFiles = [];
    const emptyFiles = [];

    for (const file of allFiles) {
      const result = await fetchJsonFile(file);
      files[file] = result;

      if (!result.ok) {
        errorFiles.push({
          path: file,
          type: result.type,
          error: result.error || result.statusText || result.status
        });
      }

      if (result.empty) {
        emptyFiles.push({
          path: file,
          type: result.type
        });
      }
    }

    res.json({
      ok: errorFiles.length === 0 && diagnostics.directory_errors.length === 0,
      source: `https://github.com/${OWNER}/${REPO}/tree/${BRANCH}/${ROOT}`,
      total_files: allFiles.length,
      dynamic_files_count: dynamicFiles.length,
      error_files_count: errorFiles.length,
      empty_files_count: emptyFiles.length,
      directory_errors_count: diagnostics.directory_errors.length,
      dynamic_files: dynamicFiles,
      error_files: errorFiles,
      empty_files: emptyFiles,
      diagnostics,
      files
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      type: "SERVER_ERROR",
      error: error.message,
      stack: error.stack
    });
  }
});

app.get("/debug", async (req, res) => {
  try {
    const diagnostics = {
      directory_checks: [],
      directory_errors: [],
      scanned_items: []
    };

    const characterFiles = await listJsonFiles("character", diagnostics);
    const storyFiles = await listJsonFiles("story", diagnostics);

    res.json({
      ok: diagnostics.directory_errors.length === 0,
      root: ROOT,
      branch: BRANCH,
      character_files_count: characterFiles.length,
      story_files_count: storyFiles.length,
      character_files: characterFiles,
      story_files: storyFiles,
      diagnostics
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      type: "DEBUG_SERVER_ERROR",
      error: error.message,
      stack: error.stack
    });
  }
});

app.listen(PORT, () => {
  console.log(`DD_WORLD API listening on port ${PORT}`);
});
