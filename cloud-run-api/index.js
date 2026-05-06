async function fetchJsonFile(path) {
  const url = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${ROOT}/${path}`;
  const response = await fetch(url);

  if (!response.ok) {
    return { ok: false, status: response.status, url };
  }

  const text = await response.text();

  try {
    return { ok: true, data: JSON.parse(text), url };
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
