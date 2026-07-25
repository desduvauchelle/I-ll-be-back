import { copyFile, rm } from 'node:fs/promises'

const outputDirectory = '.open-next/wrangler-dist'

// Sites runs the OpenNext entrypoint as-is. Wrangler's dry-run build resolves
// the Node compatibility imports first so the uploaded ESM worker never relies
// on a CommonJS `require` global at runtime.
await copyFile(`${outputDirectory}/worker.js`, '.open-next/worker.js')
await rm(outputDirectory, { recursive: true, force: true })
