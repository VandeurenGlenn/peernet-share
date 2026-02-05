import typescript from '@rollup/plugin-typescript'
import nodeResolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import wasm from '@rollup/plugin-wasm'
import inject from '@rollup/plugin-inject'
import alias from '@rollup/plugin-alias'
import { cp, glob, open, unlink } from 'node:fs/promises'
import { watch } from 'node:fs/promises'
import materialSymbols from 'rollup-plugin-material-symbols'
;(async () => {
  try {
    let fd = await open('www/index.html')
    await fd.close()
  } catch (error) {
    cp('src/index.html', 'www/index.html', {
      recursive: true,
      force: true
    })
  }
  const watcher = watch('src/index.html')
  for await (const event of watcher)
    cp('src/index.html', 'www/index.html', {
      recursive: true,
      force: true
    })
})()

const files = await glob('www/**/*.js')

await Promise.allSettled(
  (await Array.fromAsync(files)).map(async (file) => unlink(file))
)

const screens = await Array.fromAsync(await glob('src/screens/*.ts'))

export default {
  input: [
    'src/shell.ts',
    ...screens,
    'src/icons.ts',
    'src/background-animation.ts',
    './node_modules/@leofcoin/storage/exports/browser-store.js'
  ],
  output: {
    dir: 'www',
    format: 'es'
  },
  plugins: [
    alias({
      entries: [
        {
          find: 'events',
          replacement: new URL('node_modules/events/', import.meta.url).pathname
        },
        {
          find: 'process',
          replacement: new URL(
            'node_modules/process/browser.js',
            import.meta.url
          ).pathname
        }
      ]
    }),
    json(),
    wasm(),
    nodeResolve({
      browser: true,
      preferBuiltins: false,
      mainFields: ['module', 'browser']
    }),
    commonjs({ exclude: ['simple-peer', './simple-peer.js'] }),
    typescript(),
    inject({
      process: 'process'
    }),
    materialSymbols({ placeholderPrefix: 'symbol' })
  ]
}
