import assert from "node:assert/strict"
import { execFileSync, spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import process from "node:process"
import { it } from "node:test"
import { fileURLToPath } from "node:url"

const script = fileURLToPath(new URL("prepare-firefox-release.mjs", import.meta.url))
const { gecko, repository } = JSON.parse(
  await readFile(new URL("firefox-release-config.json", import.meta.url), "utf8"),
)
const { version } = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"))

async function fixture(t, { manifest, tag, previous, corrupt = false } = {}) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "firefox-release-test-"))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const zip = path.join(directory, "input.zip")
  const out = path.join(directory, "output")
  await writeFile(
    path.join(directory, "manifest.json"),
    JSON.stringify(
      manifest ?? {
        manifest_version: 3,
        version,
        browser_specific_settings: { gecko: { ...gecko, strict_min_version: "140.0" } },
      },
    ),
  )
  execFileSync("zip", ["-q", zip, "manifest.json"], { cwd: directory })
  if (corrupt) await writeFile(zip, "not a zip archive")
  const args = [script, "--zip", zip, "--out", out]
  if (tag) args.push("--tag", tag)
  if (previous) {
    const previousFile = path.join(directory, "previous.json")
    await writeFile(previousFile, JSON.stringify({ addons: { [gecko.id]: { updates: previous } } }))
    args.push("--previous", previousFile)
  }
  return { zip, out, result: spawnSync(process.execPath, args, { encoding: "utf8" }) }
}

it("publishes an installable archive and a manifest whose hash matches its bytes", async (t) => {
  const { zip, out, result } = await fixture(t, {
    tag: `firefox-v${version}`,
    previous: [{ version: "1.9.0" }],
  })
  assert.equal(result.status, 0, result.stderr)
  const [asset] = (await readdir(out)).filter((name) => name.endsWith(".xpi"))
  const bytes = await readFile(path.join(out, asset))
  assert.deepEqual(bytes, await readFile(zip))
  const updates = JSON.parse(await readFile(path.join(out, "updates.json"), "utf8"))
  const [update] = updates.addons[gecko.id].updates
  assert.equal(update.version, version)
  assert.equal(update.update_hash, `sha256:${createHash("sha256").update(bytes).digest("hex")}`)
  assert.equal(update.applications.gecko.strict_min_version, "140.0")
  assert.equal(
    new URL(update.update_link).pathname,
    `/${repository}/releases/download/firefox-v${version}/${asset}`,
  )
  assert.equal(new URL(update.update_link).protocol, "https:")
  assert.equal(
    JSON.parse(
      execFileSync("unzip", ["-p", path.join(out, asset), "manifest.json"], { encoding: "utf8" }),
    ).browser_specific_settings.gecko.id,
    gecko.id,
  )
})

it("prepares the first release without requiring a previous update manifest", async (t) => {
  const { result } = await fixture(t)
  assert.equal(result.status, 0, result.stderr)
})

for (const [name, settings] of [
  ["official extension ID", { ...gecko, id: "{bd311a81-4530-4fcc-9178-74006155461b}" }],
  ["another update server", { ...gecko, update_url: "https://example.com/updates.json" }],
  ["missing Firefox identity", undefined],
]) {
  it(`rejects a package with ${name} before writing release artifacts`, async (t) => {
    const { result, out } = await fixture(t, {
      manifest: { version, browser_specific_settings: { gecko: settings } },
    })
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /fork ID and update URL/)
    await assert.rejects(readdir(out), { code: "ENOENT" })
  })
}

it("rejects an archive built for a different version", async (t) => {
  const { result } = await fixture(t, { manifest: { version: "0.0.1" } })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /package version does not match/)
})

it("rejects a tag that does not identify the package version", async (t) => {
  const { result } = await fixture(t, { tag: "firefox-v0.0.1" })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /tag must match package.json/)
})

for (const published of [version, "65535.0.0"]) {
  it(`rejects a release that is not newer than ${published}`, async (t) => {
    const { result } = await fixture(t, { previous: [{ version: published }] })
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /must be newer than published/)
  })
}

for (const published of ["1.2.3-beta", "65536.0.0"]) {
  it(`rejects an invalid version in the existing channel: ${published}`, async (t) => {
    const { result } = await fixture(t, { previous: [{ version: published }] })
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /numeric major.minor.patch/)
  })
}

it("refuses a corrupt package", async (t) => {
  const { result } = await fixture(t, { corrupt: true })
  assert.notEqual(result.status, 0)
})
