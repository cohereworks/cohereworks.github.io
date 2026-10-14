const STATUS_ORDER = { active: 0, migrating: 1, seed: 2, paused: 3, archived: 4 };

const state = {
  projects: [],
  tags: new Set(),
  sort: "curated"
};

const els = {
  grid: document.querySelector("#project-grid"),
  tags: document.querySelector("#tag-cloud"),
  sort: document.querySelector("#sort"),
  count: document.querySelector("#result-count"),
  clear: document.querySelector("#clear-filters"),
  empty: document.querySelector("#empty-state"),
  loading: document.querySelector("#gallery-loading"),
  filters: document.querySelector(".filters")
};

function repoUrl(project) {
  return `https://github.com/${project.repository}`;
}

function pathUrl(project, path) {
  const clean = path.replace(/^\/+/, "");
  const isTree = clean.endsWith("/");
  const ref = project.ref || "main";
  return `${repoUrl(project)}/${isTree ? "tree" : "blob"}/${encodeURIComponent(ref).replace(/%2F/g, "/")}/${clean.split("/").map(encodeURIComponent).join("/")}`;
}

function slotUrl(project, slot) {
  return slot.url || pathUrl(project, slot.path);
}

function monogram(title) {
  const words = title.replace(/[^A-Za-z0-9 ]/g, " ").trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 5).toUpperCase();
  return words.slice(0, 4).map(word => word[0]).join("").toUpperCase();
}

function renderHero(project) {
  if (project.hero?.publicPath) {
    return `<img src="${escapeAttr(project.hero.publicPath)}" alt="${escapeAttr(project.hero.alt)}" loading="lazy">`;
  }
  return `<div class="card-fallback" aria-hidden="true"><div class="card-monogram">${escapeHtml(monogram(project.title))}</div></div>`;
}

function renderSlot(project, key, label) {
  const slot = project.slots?.[key];
  if (!slot) return "";
  return `<a class="card-link" href="${escapeAttr(slotUrl(project, slot))}">${escapeHtml(label || slot.label)}</a>`;
}

function renderCard(project) {
  const status = project.status || { state: "seed" };
  return `
    <article class="project-card" data-slug="${escapeAttr(project.slug)}">
      <div class="card-hero">
        ${renderHero(project)}
        <span class="card-kind">${escapeHtml(project.kind)}</span>
      </div>
      <div class="card-body">
        <div class="card-title-row">
          <h3 class="card-title"><a href="${escapeAttr(repoUrl(project))}">${escapeHtml(project.title)}</a></h3>
          <span class="status" data-state="${escapeAttr(status.state)}" title="${escapeAttr(status.detail || status.label || status.state)}">
            <span class="status-dot"></span>${escapeHtml(status.label || status.state)}
          </span>
        </div>
        <p class="card-summary">${escapeHtml(project.summary)}</p>
        ${status.detail ? `<p class="card-detail">${escapeHtml(status.detail)}</p>` : ""}
        <div class="card-tags">${project.tags.map(tag => `<span class="card-tag">${escapeHtml(tag)}</span>`).join("")}</div>
        <nav class="card-links" aria-label="${escapeAttr(project.title)} links">
          ${renderSlot(project, "demo", "Demo")}
          ${renderSlot(project, "spec", "Spec")}
          ${renderSlot(project, "tests", "Tests")}
          <a class="card-link" href="${escapeAttr(repoUrl(project))}">Repo</a>
        </nav>
      </div>
    </article>`;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function escapeAttr(value = "") { return escapeHtml(value); }

function selectedTagsFromUrl() {
  return new Set(new URLSearchParams(location.search).getAll("tag"));
}

function applyUrl() {
  const params = new URLSearchParams();
  [...state.tags].sort().forEach(tag => params.append("tag", tag));
  if (state.sort !== "curated") params.set("sort", state.sort);
  const query = params.toString();
  history.replaceState(null, "", query ? `?${query}` : location.pathname);
}

function buildTagCloud() {
  const counts = new Map();
  state.projects.forEach(project => project.tags.forEach(tag => counts.set(tag, (counts.get(tag) || 0) + 1)));
  const sorted = [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  els.tags.innerHTML = sorted.map(([tag, count]) => {
    const id = `tag-${tag}`;
    return `<span class="tag-choice">
      <input type="checkbox" id="${escapeAttr(id)}" value="${escapeAttr(tag)}" ${state.tags.has(tag) ? "checked" : ""}>
      <label for="${escapeAttr(id)}"><span>${escapeHtml(tag)}</span><span class="tag-count">${count}</span></label>
    </span>`;
  }).join("");

  els.tags.querySelectorAll("input").forEach(input => {
    input.addEventListener("change", () => {
      input.checked ? state.tags.add(input.value) : state.tags.delete(input.value);
      applyUrl();
      render();
    });
  });
}

function filteredProjects() {
  const projects = state.tags.size
    ? state.projects.filter(project => [...state.tags].every(tag => project.tags.includes(tag)))
    : [...state.projects];

  if (state.sort === "title") {
    projects.sort((a, b) => a.title.localeCompare(b.title));
  } else if (state.sort === "status") {
    projects.sort((a, b) => (STATUS_ORDER[a.status?.state] ?? 99) - (STATUS_ORDER[b.status?.state] ?? 99) || a.title.localeCompare(b.title));
  } else {
    projects.sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
  }
  return projects;
}

function render() {
  const projects = filteredProjects();
  els.grid.innerHTML = projects.map(renderCard).join("");
  els.count.textContent = `${projects.length} of ${state.projects.length} projects`;
  els.empty.dataset.visible = String(projects.length === 0);
}

async function boot() {
  const params = new URLSearchParams(location.search);
  state.tags = selectedTagsFromUrl();
  state.sort = params.get("sort") || "curated";
  if (![...els.sort.options].some(option => option.value === state.sort)) state.sort = "curated";
  els.sort.value = state.sort;

  if (matchMedia("(max-width: 760px)").matches && state.tags.size === 0) {
    els.filters?.removeAttribute("open");
  }

  const response = await fetch("catalog/projects.json", { cache: "no-cache" });
  if (!response.ok) throw new Error(`catalog fetch failed: ${response.status}`);
  const data = await response.json();
  state.projects = data.projects || [];

  buildTagCloud();
  render();
  els.loading.hidden = true;

  els.sort.addEventListener("change", () => {
    state.sort = els.sort.value;
    applyUrl();
    render();
  });
  els.clear.addEventListener("click", () => {
    state.tags.clear();
    els.tags.querySelectorAll("input:checked").forEach(input => { input.checked = false; });
    applyUrl();
    render();
  });
}

boot().catch(error => {
  console.error(error);
  els.loading.textContent = "The project catalog could not be loaded.";
});
