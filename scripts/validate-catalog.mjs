import fs from "node:fs";

const catalog = JSON.parse(fs.readFileSync(new URL("../catalog/projects.json", import.meta.url), "utf8"));
const sources = JSON.parse(fs.readFileSync(new URL("../catalog/sources.json", import.meta.url), "utf8"));

const errors = [];
const allowedStates = new Set(["seed", "migrating", "active", "paused", "archived"]);
const allowedKinds = new Set(["research", "tool", "protocol", "workbench", "library", "infrastructure"]);
const sourceSet = new Set(sources.repositories);
const slugs = new Set();

if (catalog.schemaVersion !== 1) errors.push("catalog schemaVersion must be 1");
if (!Array.isArray(catalog.projects) || catalog.projects.length === 0) errors.push("catalog projects must be non-empty");

for (const [index, project] of (catalog.projects || []).entries()) {
  const at = `projects[${index}]`;
  for (const field of ["repository", "slug", "title", "summary", "kind", "status", "tags"]) {
    if (project[field] == null || project[field] === "") errors.push(`${at} missing ${field}`);
  }

  if (project.repository && !sourceSet.has(project.repository)) errors.push(`${at} repository is not registered in catalog/sources.json: ${project.repository}`);
  if (slugs.has(project.slug)) errors.push(`${at} duplicate slug: ${project.slug}`);
  slugs.add(project.slug);

  if (!allowedKinds.has(project.kind)) errors.push(`${at} invalid kind: ${project.kind}`);
  if (!allowedStates.has(project.status?.state)) errors.push(`${at} invalid status: ${project.status?.state}`);

  if (!Array.isArray(project.tags) || project.tags.length === 0) errors.push(`${at} tags must be non-empty`);
  if (new Set(project.tags || []).size !== (project.tags || []).length) errors.push(`${at} has duplicate tags`);

  for (const [slotName, slot] of Object.entries(project.slots || {})) {
    if (!["demo", "spec", "tests"].includes(slotName)) errors.push(`${at} unknown slot: ${slotName}`);
    if (!slot?.label) errors.push(`${at}.${slotName} missing label`);
    if (!slot?.path && !slot?.url) errors.push(`${at}.${slotName} needs path or url`);
    if (slot?.path?.startsWith("/")) errors.push(`${at}.${slotName} path must be repository-relative`);
  }

  if (project.hero && (!project.hero.kind || !project.hero.path || !project.hero.alt)) {
    errors.push(`${at} hero requires kind, path, and alt`);
  }
}

const missing = [...sourceSet].filter(repo => !(catalog.projects || []).some(project => project.repository === repo));
if (missing.length) errors.push(`registered repositories missing from catalog: ${missing.join(", ")}`);

if (errors.length) {
  console.error(errors.map(error => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log(`catalog ok: ${catalog.projects.length} projects, ${new Set(catalog.projects.flatMap(project => project.tags)).size} tags`);
