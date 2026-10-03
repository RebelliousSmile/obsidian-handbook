/* global console, process */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'

/* Prints `<package> <tag>` for every schema package pinned to a candidate release. It is what
   the `Notify provider` workflow reads to tell a provider that its candidate was adopted. */

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const CANDIDATE = /^https:\/\/github\.com\/RebelliousSmile\/(schema-[a-z-]+)\/releases\/download\/(v\d+\.\d+\.\d+-rc\.\d+)\//

/** The `[package, tag]` pairs of the schema candidates `dependencies` pins. */
export function candidatePins(dependencies) {
    const pins = []
    for (const name of Object.keys(dependencies)) {
        const match = CANDIDATE.exec(String(dependencies[name]))
        if (match && match[1] === name) pins.push([name, match[2]])
    }
    return pins
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const dependencies = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).dependencies ?? {}
    for (const [name, tag] of candidatePins(dependencies)) console.log(`${name} ${tag}`)
}
