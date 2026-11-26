import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { parseArgs } from "node:util"

const root = fileURLToPath(new URL("../", import.meta.url))
const { repository, gecko } = JSON.parse(
  await readFile(new URL("firefox-release-config.json", import.meta.url), "utf8"),
)
const { version } = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"))
const { values } = parseArgs({
  options: {
    zip: {
      type: "string",
      default: path.join(root, `.output/read-frogextension-${version}-firefox.zip`),
    },
    out: { type: "string", default: path.join(root, ".output/firefox-release") },
    tag: { type: "string", default: `firefox-v${version}` },
    previous: { type: "string" },
  },
})

function assertVersion(value) {
  if (
    !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value) ||
    value.split(".").some((part) => Number(part) > 65535)
  ) {
    throw new Error(`Firefox releases require a numeric major.minor.patch version: ${value}`)
  }
}

async function checkPreviousVersion(previousFile) {
  const previous = JSON.parse(await readFile(previousFile, "utf8"))
  const updates = previous.addons[gecko.id].updates
  for (const update of updates) {
    assertVersion(update.version)
    if (version.localeCompare(update.version, "en", { numeric: true }) <= 0) {
      throw new Error(`Release ${version} must be newer than published version ${update.version}`)
    }
  }
}

assertVersion(version)
if (values.tag !== `firefox-v${version}`) {
  throw new Error(`Release tag must match package.json: firefox-v${version}`)
}
const manifest = JSON.parse(
  execFileSync("unzip", ["-p", values.zip, "manifest.json"], { encoding: "utf8" }),
)
if (manifest.version !== version)
  throw new Error("Firefox package version does not match package.json")
const settings = manifest.browser_specific_settings?.gecko
if (settings?.id !== gecko.id || settings.update_url !== gecko.update_url) {
  throw new Error("Firefox package must use the fork ID and update URL")
}
if (values.previous) await checkPreviousVersion(values.previous)

const assetName = `read-frog-fork-${version}-firefox.xpi`
const digest = createHash("sha256")
  .update(await readFile(values.zip))
  .digest("hex")
const updates = {
  addons: {
    [gecko.id]: {
      updates: [
        {
          version,
          update_link: `https://github.com/${repository}/releases/download/${values.tag}/${assetName}`,
          update_hash: `sha256:${digest}`,
          applications: { gecko: { strict_min_version: settings.strict_min_version } },
        },
      ],
    },
  },
}

await mkdir(values.out, { recursive: true })
await copyFile(values.zip, path.join(values.out, assetName))
await writeFile(path.join(values.out, "updates.json"), `${JSON.stringify(updates, null, 2)}\n`)
console.log(`Prepared Firefox ${version}: ${path.join(values.out, assetName)}`)
