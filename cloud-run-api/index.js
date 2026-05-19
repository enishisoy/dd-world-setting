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

  // =========================
  // FETCH ERROR
  // =========================
  if (!response.ok) {
    return {
      ok: false,
      status_type: "FETCH_ERROR",
      status: response.status,
      statusText: response.statusText,
      url,
      path
    };
  }

  const text = await response.text();

  // =========================
  // EMPTY FILE
  // =========================
  if (text.trim() === "") {
    return {
      ok: true,
      status_type: "EMPTY_FILE",
      message: "JSON file is empty",
      data: null,
      url,
      path
    };
  }

  // =========================
  // JSON PARSE
  // =========================
  try {
    return {
      ok: true,
      status_type: "VALID_JSON",
      data: JSON.parse(text),
      url,
      path
    };
  } catch (error) {
    return {
      ok: false,
      status_type: "JSON_PARSE_ERROR",
      error: error.message,
      url,
      path,
      preview: text.slice(0, 500),
      tail: text.slice(-500)
    };
  }
}

async function listJsonFiles(dir, diagnostics) {
  const apiUrl =
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${ROOT}/${dir}?ref=${BRANCH}`;

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

    // =========================
    // JSON FILE
    // =========================
    if (item.type === "file" && item.name.endsWith(".json")) {
      results.push(`${dir}/${item.name}`);
    }

    // =========================
    // CHILD DIRECTORY
    // =========================
    if (item.type === "dir") {
      const childDir = `${dir}/${item.name}`;

      const childFiles =
        await listJsonFiles(childDir, diagnostics);

      results = results.concat(childFiles);
    }
  }

  return results;
}

app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "DD_WORLD API",
    endpoints: [
      "/health",
      "/world",
      "/debug"
    ]
  });
});

app.get("/health", (req, res) => {
  res.json({
    ok: true
  });
});

app.get("/world", async (req, res) => {
  try {

    // =========================
    // SINGLE FILE / PATH MODE
    // =========================
    const fileQuery = req.query.file;
    const pathQuery = req.query.path;

    function getByDotPath(obj, dotPath) {
      if (!dotPath) return obj;

      return dotPath
        .split(".")
        .reduce((current, key) => {
          if (
            current &&
            typeof current === "object" &&
            key in current
          ) {
            return current[key];
          }
          return undefined;
        }, obj);
    }

    if (fileQuery) {
      const safeFile = String(fileQuery).replace(/^\/+/, "");

      if (
        safeFile.includes("..") ||
        !safeFile.endsWith(".json")
      ) {
        return res.status(400).json({
          ok: false,
          status_type: "INVALID_FILE_QUERY",
          message: "file must be a safe .json path under DD_WORLD"
        });
      }

      const result = await fetchJsonFile(safeFile);

      if (!result.ok) {
        return res.status(404).json(result);
      }

      const picked = getByDotPath(result.data, pathQuery);

      if (pathQuery && picked === undefined) {
        return res.status(404).json({
          ok: false,
          status_type: "PATH_NOT_FOUND",
          file: safeFile,
          path: pathQuery
        });
      }

      return res.json({
        ok: true,
        mode: pathQuery ? "single_path" : "single_file",
        file: safeFile,
        path: pathQuery || null,
        data: picked
      });
    }

    const diagnostics = {
      directory_checks: [],
      directory_errors: [],
      scanned_items: []
    };

    // ↓ 以降既存コード
    // =========================
    // FILE SCAN
    // =========================
    const dynamicFiles = [
      ...(await listJsonFiles("character", diagnostics)),
      ...(await listJsonFiles("story", diagnostics))
    ];

    const allFiles = [
      ...new Set([
        ...FIXED_FILES,
        ...dynamicFiles
      ])
    ];

    const files = {};

    const errorFiles = [];
    const emptyFiles = [];
    const validFiles = [];

    // =========================
    // FILE LOAD
    // =========================
    for (const file of allFiles) {

      const result = await fetchJsonFile(file);

      files[file] = result;

      // VALID JSON
      if (
        result.ok &&
        result.status_type === "VALID_JSON"
      ) {
        validFiles.push(file);
      }

      // EMPTY FILE
      if (
        result.ok &&
        result.status_type === "EMPTY_FILE"
      ) {
        emptyFiles.push(file);
      }

      // ERROR
      if (!result.ok) {
        errorFiles.push({
          path: file,
          type: result.status_type,
          error:
            result.error ||
            result.statusText ||
            result.status
        });
      }
    }

    // =========================
    // RESPONSE
    // =========================
    res.json({

      ok:
        errorFiles.length === 0 &&
        diagnostics.directory_errors.length === 0,

      service: "DD_WORLD API",

      source:
        `https://github.com/${OWNER}/${REPO}/tree/${BRANCH}/${ROOT}`,

      total_files: allFiles.length,

      valid_files_count: validFiles.length,

      empty_files_count: emptyFiles.length,

      error_files_count: errorFiles.length,

      directory_errors_count:
        diagnostics.directory_errors.length,

      valid_files: validFiles,

      empty_files: emptyFiles,

      error_files: errorFiles,

      diagnostics,

      files
    });

  } catch (error) {

    res.status(500).json({
      ok: false,
      status_type: "SERVER_ERROR",
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

    const characterFiles =
      await listJsonFiles("character", diagnostics);

    const storyFiles =
      await listJsonFiles("story", diagnostics);

    res.json({
      ok:
        diagnostics.directory_errors.length === 0,

      root: ROOT,

      branch: BRANCH,

      character_files_count:
        characterFiles.length,

      story_files_count:
        storyFiles.length,

      character_files,

      story_files,

      diagnostics
    });

  } catch (error) {

    res.status(500).json({
      ok: false,
      status_type: "DEBUG_SERVER_ERROR",
      error: error.message,
      stack: error.stack
    });

  }
});

app.listen(PORT, () => {
  console.log(
    `DD_WORLD API listening on port ${PORT}`
  );
});
