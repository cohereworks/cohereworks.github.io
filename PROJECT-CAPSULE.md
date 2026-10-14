# COHERE project capsule contract v1

The gallery is an organization-level projection of project-owned evidence. It should not scrape arbitrary repository state or require every project to adopt the same internal layout.

Each canonical project may publish a small capsule at:

`.cohere/site/project.json`

and optional curated public-facing assets under:

`.cohere/site/assets/`

The site aggregator consumes that capsule, validates it, copies only declared assets, and derives repository metadata separately.

## Required slots

Every project capsule supplies:

- `schemaVersion` — currently `1`.
- `slug` — stable site identifier.
- `title` — human-facing project name.
- `summary` — one compact paragraph suitable for a gallery card.
- `kind` — broad project shape such as `research`, `tool`, `protocol`, `workbench`, or `library`.
- `status` — current lifecycle state plus an optional evidence path.
- `tags` — a small, useful set of filtering terms.

## Showcase slots

Projects should fill these when meaningful; absence is allowed and must not be papered over with synthetic claims.

### hero

A curated visual tile.

Preferred kinds:

- `ui-snapshot`
- `architecture-diagram`
- `result-visualization`
- `artifact`

The image should be repository-owned, intentional, and legible at card scale. Generated decorative art is not a substitute for a useful project visual.

### demo

The single best entry point for seeing the project do something.

Examples:

- an interactive HTML page;
- a CLI example;
- a deterministic experiment result;
- an executable fixture;
- a benchmark/report when no interactive demo exists.

### spec

The strongest concise statement of what the project claims, guarantees, or is trying to establish.

### tests

The best executable evidence surface for the project's current claims. This may be a suite directory, one particularly representative test, or a command plus path.

## Status states

The v1 vocabulary is intentionally small:

- `seed` — concept/repository exists but substantial executable evidence is not yet present.
- `migrating` — canonical work exists elsewhere or is actively being moved into the dedicated repository.
- `active` — substantive work and executable evidence are present.
- `paused` — intentionally inactive without being retired.
- `archived` — historical project; no ordinary continuation expected.

Status is not a maturity score.

## Provenance

A capsule may point at repository-relative files. The aggregator records the repository and source commit used to build the site snapshot. Curated assets are copied into the Pages build; the public site never needs runtime credentials to private repositories.

If a project changes a showcase slot, that change belongs to the canonical project participant. The organization site may reject a malformed capsule, but should not silently invent or overwrite project claims.

## Aggregation model

The v1 site build is designed around a read-only aggregation step:

1. enumerate the repositories in `catalog/sources.json`;
2. fetch each `.cohere/site/project.json`;
3. validate against `schema/project-card.schema.json`;
4. fetch only the assets explicitly declared by the capsule;
5. derive neutral GitHub metadata such as source commit and last update;
6. emit a static `catalog/projects.json` plus copied assets;
7. build/deploy GitHub Pages.

The site remains a static application after build.

## Authentication boundary

GitHub's normal `GITHUB_TOKEN` is repository-scoped, so a site workflow cannot use it to read arbitrary sibling private repositories. For automatic private-repository aggregation, use a dedicated GitHub App installation token with **read-only repository contents/metadata** on the participating project repositories.

Do not give the site builder write access to project repositories.

Until that read-only app is configured, `catalog/projects.json` may be maintained as a checked bootstrap snapshot. Project capsules remain the target contract.

## Why not submodules?

Submodules would technically work on ephemeral runners, but they encode whole-repository topology as the dependency mechanism. That creates unnecessary checkout/authentication cost, couples site rebuilds to unrelated repository history, makes partial failure coarse, and requires central gitlink updates for project changes.

The capsule boundary is smaller and more honest: the site depends on exactly the information it renders.

## Filtering semantics

The gallery exposes project tags as an accessible checkbox-style chip cloud. Multiple selected tags narrow by **all selected tags**. Sort is independent and initially supports curated order, title, and lifecycle state. The URL query string should preserve filter/sort state so mobile views are shareable and resumable.
