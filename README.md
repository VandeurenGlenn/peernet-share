# Peernet Share

A browser-based, peer-to-peer file sharing app built on [Peernet](https://github.com/leofcoin/peernet). Drop files or folders, get a share hash, and let others download directly from your browser — no server, no sign-up.

## Features

- **Drag & drop or browse** — share individual files or entire folders
- **Folder support** — folders are shared as a collection of individually addressed files, grouped under a common folder name via `webkitRelativePath`
- **Chunked transfer** — large files are split into 4 MB chunks (threshold: 64 MB)
- **Download by hash** — recipient just pastes the share hash (or scans a QR code)
- **Progress tracking** — per-file read / hash / store stages on upload; chunk-level ETA on download
- **No account needed** — identity is a randomly generated key stored in `localStorage`
- **Fully client-side** — all P2P traffic goes through Peernet's WebRTC/WebSocket layer

## Tech Stack

| Layer | Library |
|---|---|
| P2P network | [`@leofcoin/peernet`](https://github.com/leofcoin/peernet) |
| UI components | [`@vandeurenglenn/lite`](https://github.com/vandeurenglenn/lite) + lite-elements |
| Icons | Material Symbols (400 weight) |
| Build | [Rollup](https://rollupjs.org) + TypeScript |

## Getting Started

### Prerequisites

- Node.js ≥ 18

### Install

```bash
npm install
```

### Development

```bash
npm run watch   # rebuild on file changes
npm run start   # serve www/ on http://localhost:3000
```

### Production build

```bash
npm run build
```

Output lands in `www/`.

## Usage

1. Open the app in two browser tabs (or on two devices on the same network / via a relay).
2. **Sender:** drop files or click the upload area, then hit **Share**. Copy the generated hash.
3. **Receiver:** paste the hash into the download field and confirm. The file saves automatically when the transfer completes.

## How it Works

### The `peernet-file` proto

All data — whether a single small file, a chunk of a large file, or a folder manifest — is encoded using Peernet's built-in `peernet-file` protocol buffer. Each node has three fields:

| Field | Type | Purpose |
|---|---|---|
| `path` | string | filename or chunk name (e.g. `photo.jpg` / `photo.jpg.part-000001`) |
| `content` | `Uint8Array` | raw file bytes (present for small files and individual chunks) |
| `links` | `{ hash, path, size }[]` | ordered list of chunk references (present for large-file manifests) |

Nodes are content-addressed: calling `.encode()` serialises the proto and `.hash()` produces a deterministic hash of that serialised form, which becomes the lookup key in the share store.

### Upload flow

**Small files** (< 64 MB)
1. File bytes are read into memory.
2. A single `peernet-file` node is created with `{ path: filename, content: bytes }`.
3. The node is encoded, hashed, and written to the `share` store.
4. The resulting hash is the file's share identifier.

**Large files** (≥ 64 MB)
1. The file is streamed and split into 4 MB chunks.
2. Each chunk is encoded as a `peernet-file` node: `{ path: "filename.part-N", content: chunkBytes }`, stored under its own hash.
3. Once all chunks are stored, a **manifest** node is created: `{ path: filename, links: [{ hash, path, size }, …] }` — `content` is empty; `links` point to the ordered chunks.
4. The manifest node's hash is the file's share identifier.

**Share hash**
After all files are processed, the per-file hashes are sorted, joined with `|`, and SHA-256 hashed to produce a single share hash that represents the whole batch.

### Download flow

1. The recipient provides a file hash (or a share link containing `?download=<hash>`).
2. `peernet.get(hash, 'share')` fetches the encoded `peernet-file` node from the network (falling back to local store first).
3. The node is decoded:
   - If it has `content`: the bytes are used directly.
   - If it has `links`: each chunk is fetched and decoded sequentially; bytes are concatenated and saved as a `Blob`.
4. The assembled `Blob` is saved via a synthetic `<a download>` click.

### Identity & networking

On first visit, a random 128-bit hex password is generated and persisted in `localStorage`. This seeds the Peernet node's identity. The node connects to a star relay (`wss://star.leofcoin.org`, network `leofcoin:peach`) and from there establishes direct WebRTC connections to peers sharing the same share hash.

## Project Structure

```
src/
  shell.ts              # main app shell (upload, share, download logic)
  password.ts           # auto-generated peer identity (localStorage)
  icons.ts              # icon bundle
  background-animation.ts
  elements/
    card.ts
    info-header.ts
    upload-box.ts       # drag & drop upload area
  screens/
    loading-screen.ts
  views/
    home.ts
www/                    # built output — serve this directory
```

## License

See [LICENSE](LICENSE).

