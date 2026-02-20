import Peernet from './../node_modules/@leofcoin/peernet/exports/browser/peernet.js'
import { LiteElement, html, css, property } from '@vandeurenglenn/lite'
import { unsafeHTML } from 'lit/directives/unsafe-html.js'
import '@vandeurenglenn/lite-elements/icon'
import { getOrCreatePassword } from './password.js'
import './elements/info-header.js'

import icons from './icons.js'
import PeernetFile from '@leofcoin/peernet/file'
globalThis.peernet = globalThis.peernet || null

declare global {
  var peernet: Peernet
}

export class AppShell extends LiteElement {
  @property({ type: String }) accessor peerId: string = ''
  @property({ type: Array }) accessor log: string[] = []
  @property({ type: Array }) accessor files: File[] = []
  @property({ type: Boolean }) accessor dropActive: boolean = false
  @property({ type: Boolean }) accessor showHint: boolean = true
  @property({ type: String }) accessor shareHash: string = ''
  @property({ type: Boolean }) accessor isProcessing: boolean = false
  @property({ type: Number }) accessor processingTotal: number = 0
  @property({ type: Number }) accessor processingDone: number = 0
  @property({ type: String }) accessor processingName: string = ''
  @property({ type: Number }) accessor processingBytesTotal: number = 0
  @property({ type: Number }) accessor processingBytesDone: number = 0
  @property({ type: Array }) accessor processingItems: Array<{
    id: string
    name: string
    size: number
    doneBytes: number
    stage: 'reading' | 'hashing' | 'storing' | 'done' | 'error'
  }> = []
  @property({ type: Array }) accessor sharedFiles: Array<{
    name: string
    hash: string
    peerId: string
    type?: 'file' | 'folder'
    fileCount?: number
  }> = []
  @property({ type: Object }) accessor uploadProgress: Record<string, number> =
    {}
  @property({ type: Boolean }) accessor logExpanded: boolean = false
  @property({ type: Boolean }) accessor isDownloading: boolean = false
  @property({ type: Number }) accessor downloadBytesTotal: number = 0
  @property({ type: Number }) accessor downloadBytesDone: number = 0
  @property({ type: String }) accessor downloadName: string = ''
  @property({ type: String }) accessor downloadStage: string = ''
  @property({ type: Number }) accessor downloadChunkTotal: number = 0
  @property({ type: Number }) accessor downloadChunkDone: number = 0
  @property({ type: Number }) accessor downloadRateBytes: number = 0
  @property({ type: Number }) accessor downloadEtaSeconds: number = 0
  @property({ type: String }) accessor downloadHash: string = ''
  @property({ type: Boolean }) accessor downloadReady: boolean = false
  @property({ type: Object }) accessor downloadConfirmPending: {
    hash: string
    name?: string
  } | null = null
  static readonly chunkSizeBytes = 4 * 1024 * 1024
  static readonly chunkThresholdBytes = 64 * 1024 * 1024
  static readonly maxInMemoryBytes = 1024 * 1024 * 1024
  #dragCounter = 0
  #fileInput?: HTMLInputElement
  #folderInput?: HTMLInputElement
  #pendingDownload?: { hash: string; name?: string }
  #isSearching = false
  #readyBlob?: Blob
  #readyFilename?: string
  static styles = [
    css`
      :host {
        display: flex;
        flex-direction: column;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        box-sizing: border-box;
        padding: 0;
        margin: 0;
        overflow: hidden;
        position: absolute;
        inset: 0;
      }

      .main-content {
        flex: 1;
        overflow-y: auto;
        padding: 1em 1em 1em 1em;
      }

      .content-wrapper {
        margin: 0 auto;
        max-width: 1400px;
        width: 100%;
        box-sizing: border-box;
      }

      .section-card {
        background: linear-gradient(
          135deg,
          rgba(18, 28, 48, 0.72) 0%,
          rgba(10, 15, 28, 0.86) 45%,
          rgba(8, 12, 22, 0.9) 100%
        );
        border-radius: 26px;
        box-shadow:
          0 8px 32px 0 rgba(5, 10, 20, 0.55),
          0 1.5px 8px 0 rgba(80, 120, 180, 0.14) inset,
          0 -1px 12px 0 rgba(56, 189, 248, 0.08) inset;
        border: 1.5px solid rgba(120, 170, 240, 0.22);
        backdrop-filter: blur(36px) saturate(240%);
        -webkit-backdrop-filter: blur(36px) saturate(240%);
        padding: 2em;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        gap: 1.1em;
        position: relative;
        overflow: hidden;
      }

      .files-card {
        min-height: 240px;
      }

      .section-card::before {
        content: '';
        position: absolute;
        inset: 0;
        background: radial-gradient(
          circle at 20% 0%,
          rgba(56, 189, 248, 0.18),
          transparent 45%
        );
        opacity: 0.8;
        pointer-events: none;
      }

      .section-card::after {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        border: 1px solid rgba(255, 255, 255, 0.06);
        pointer-events: none;
        mix-blend-mode: screen;
      }

      .section-title {
        margin: 0;
        font-size: 1.15em;
        color: #38bdf8;
        font-weight: 700;
        letter-spacing: 0.2px;
      }

      .files-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1em;
        flex-wrap: wrap;
      }

      .files-actions {
        display: flex;
        gap: 0.6em;
        align-items: center;
      }

      .share-cta {
        background: rgba(56, 189, 248, 0.15);
        color: #38bdf8;
        border: 1.5px solid rgba(56, 189, 248, 0.4);
        border-radius: 9px;
        padding: 0.35em 0.8em;
        font-size: 0.85em;
        font-weight: 700;
        cursor: pointer;
      }

      .share-cta:hover {
        background: rgba(56, 189, 248, 0.25);
      }

      .share-cta[disabled] {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .hint-bar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 0.8em;
        padding: 0.85em 1.1em;
        margin-bottom: 1.1em;
        border-radius: 14px;
        background: rgba(15, 23, 42, 0.55);
        border: 1px solid rgba(80, 120, 180, 0.22);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        color: #cbd5f5;
      }

      .hint-text {
        font-size: 0.95em;
        color: #b6c2d6;
      }

      .hint-actions {
        display: flex;
        align-items: center;
        gap: 0.6em;
      }

      .hint-dismiss {
        background: none;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        font-size: 0.85em;
      }

      .hint-dismiss:hover {
        color: #cbd5f5;
      }

      .share-hash-row {
        display: flex;
        align-items: center;
        gap: 0.6em;
        flex-wrap: wrap;
        margin: 0.2em 0 0.6em 0;
      }

      .share-hash-label {
        color: #94a3b8;
        font-size: 0.85em;
      }

      .share-hash-value {
        font-family:
          ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
          'Liberation Mono', 'Courier New', monospace;
        color: #e2e8f0;
        background: rgba(15, 23, 42, 0.6);
        border: 1px solid rgba(80, 120, 180, 0.2);
        padding: 0.35em 0.6em;
        border-radius: 8px;
        font-size: 0.82em;
      }

      .share-hash-copy {
        background: rgba(56, 189, 248, 0.15);
        color: #38bdf8;
        border: 1.5px solid rgba(56, 189, 248, 0.4);
        border-radius: 8px;
        padding: 0.3em 0.6em;
        font-size: 0.8em;
        font-weight: 600;
        cursor: pointer;
      }

      .share-hash-copy:hover {
        background: rgba(56, 189, 248, 0.25);
      }

      .share-hash-share {
        background: rgba(15, 23, 42, 0.6);
        color: #e2e8f0;
        border: 1px solid rgba(80, 120, 180, 0.25);
        border-radius: 8px;
        padding: 0.3em 0.6em;
        font-size: 0.8em;
        font-weight: 600;
        cursor: pointer;
      }

      .share-hash-share:hover {
        border-color: rgba(56, 189, 248, 0.45);
        color: #38bdf8;
      }

      .processing-banner {
        display: flex;
        align-items: center;
        gap: 0.75em;
        padding: 0.65em 0.9em;
        border-radius: 12px;
        background: rgba(15, 23, 42, 0.6);
        border: 1px solid rgba(56, 189, 248, 0.25);
        color: #cbd5f5;
        font-size: 0.9em;
      }

      .processing-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border-radius: 999px;
        border: 1px solid rgba(56, 189, 248, 0.35);
        background: rgba(56, 189, 248, 0.12);
        color: #38bdf8;
        animation: spin 1.4s linear infinite;
      }

      .processing-icon custom-icon {
        --custom-icon-size: 16px;
        --custom-icon-color: currentColor;
      }

      .processing-meta {
        display: flex;
        flex-direction: column;
        gap: 0.1em;
        min-width: 0;
      }

      .processing-title {
        font-weight: 600;
        color: #e2e8f0;
      }

      .processing-name {
        font-size: 0.85em;
        color: #94a3b8;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .processing-bar {
        flex: 1;
        height: 6px;
        background: rgba(30, 41, 59, 0.55);
        border-radius: 999px;
        overflow: hidden;
        border: 1px solid rgba(80, 120, 180, 0.2);
      }

      .processing-bar span {
        display: block;
        height: 100%;
        background: linear-gradient(90deg, #38bdf8 0%, #2563eb 100%);
        transition: width 0.2s ease;
      }

      .file-progress-list {
        display: flex;
        flex-direction: column;
        gap: 0.75em;
      }

      .file-progress-item {
        background: rgba(30, 41, 59, 0.32);
        border-radius: 10px;
        border: 1px solid rgba(80, 120, 180, 0.13);
        padding: 0.8em 0.9em;
        display: flex;
        flex-direction: column;
        gap: 0.45em;
      }

      .file-progress-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75em;
      }

      .file-progress-name {
        color: #e2e8f0;
        font-weight: 600;
        font-size: 0.92em;
        flex: 1;
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .file-progress-stage {
        font-size: 0.8em;
        color: #94a3b8;
        white-space: nowrap;
      }

      .file-progress-bar {
        height: 6px;
        background: rgba(15, 23, 42, 0.55);
        border-radius: 999px;
        overflow: hidden;
        border: 1px solid rgba(80, 120, 180, 0.18);
      }

      .file-progress-bar span {
        display: block;
        height: 100%;
        background: linear-gradient(90deg, #38bdf8 0%, #2563eb 100%);
        transition: width 0.2s ease;
      }

      .file-progress-bar[data-stage='hashing'] span,
      .file-progress-bar[data-stage='storing'] span {
        animation: progress-pulse 1.4s ease-in-out infinite;
      }

      @keyframes progress-pulse {
        0% {
          filter: brightness(1);
        }
        50% {
          filter: brightness(1.4);
        }
        100% {
          filter: brightness(1);
        }
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      .fab-dock {
        position: fixed;
        left: 50%;
        bottom: 72px;
        transform: translateX(-50%);
        width: min(1400px, calc(100% - 2rem));
        display: flex;
        justify-content: flex-end;
        pointer-events: none;
        z-index: 45;
      }

      .fab-group {
        display: flex;
        gap: 0.75em;
        pointer-events: auto;
        align-items: center;
      }

      .fab-btn {
        width: 48px;
        height: 48px;
        border-radius: 999px;
        border: 1.5px solid rgba(56, 189, 248, 0.55);
        background: #2563eb;
        color: #fff;
        font-size: 1.4em;
        line-height: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.55);
        transition:
          transform 0.2s ease,
          box-shadow 0.2s ease;
      }

      .fab-btn:hover {
        transform: translateY(-1px) scale(1.03);
        box-shadow: 0 8px 18px rgba(15, 23, 42, 0.6);
      }

      .fab-btn[data-tooltip]::after {
        content: attr(data-tooltip);
        position: absolute;
        right: 100%;
        margin-right: 10px;
        top: 50%;
        transform: translateY(-50%) translateX(6px);
        opacity: 0;
        pointer-events: none;
        background: rgba(15, 23, 42, 0.92);
        border: 1px solid rgba(80, 120, 180, 0.25);
        color: #cbd5f5;
        font-size: 0.8em;
        padding: 0.35em 0.6em;
        border-radius: 10px;
        white-space: nowrap;
        box-shadow: 0 6px 18px rgba(15, 23, 42, 0.55);
        transition:
          opacity 0.2s ease,
          transform 0.2s ease;
      }

      .fab-btn[data-tooltip]::before {
        content: '';
        position: absolute;
        right: 100%;
        margin-right: 4px;
        top: 50%;
        transform: translateY(-50%) translateX(6px);
        opacity: 0;
        border-width: 6px 0 6px 6px;
        border-style: solid;
        border-color: transparent transparent transparent rgba(15, 23, 42, 0.92);
        transition:
          opacity 0.2s ease,
          transform 0.2s ease;
      }

      .fab-btn[data-tooltip]:hover::after,
      .fab-btn[data-tooltip]:hover::before {
        opacity: 1;
        transform: translateY(-50%) translateX(0);
      }

      .fab-btn.secondary {
        background: rgba(30, 41, 59, 0.9);
        color: #38bdf8;
        border-color: rgba(56, 189, 248, 0.45);
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.5);
      }

      .fab-btn custom-icon {
        --custom-icon-size: 22px;
        --custom-icon-color: currentColor;
      }

      .global-drop {
        position: fixed;
        inset: 0;
        border: 2px dashed rgba(56, 189, 248, 0.45);
        background: rgba(15, 23, 42, 0.55);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s ease;
        z-index: 40;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #e2e8f0;
        font-size: 1.2em;
        font-weight: 600;
        letter-spacing: 0.3px;
      }

      .global-drop.active {
        opacity: 1;
      }

      .intro-card {
        margin-bottom: 1.2em;
      }

      .intro-text {
        color: #b6c2d6;
        line-height: 1.6;
        font-size: 0.98em;
      }

      .steps-list {
        margin: 0.75em 0 0 0;
        padding-left: 1.2em;
        color: #cbd5f5;
      }

      .steps-list li {
        margin: 0.3em 0;
      }
      .divider {
        width: 100%;
        height: 1.5px;
        background: linear-gradient(90deg, #38bdf8 0%, #2563eb 100%);
        opacity: 0.13;
        border-radius: 2px;
        margin: 1.2em 0 1.2em 0;
      }
      .header {
        font-size: 2.5em;
        font-weight: 800;
        letter-spacing: -1.5px;
        color: #fff;
        background: linear-gradient(90deg, #38bdf8 0%, #2563eb 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin-bottom: 1.2em;
        padding-top: 0.2em;
        text-align: center;
        text-shadow: 0 2px 24px #2563eb33;
      }
      .controls-row {
        display: flex;
        flex-wrap: wrap;
        gap: 1em;
        align-items: center;
        margin-bottom: 1.7em;
        width: 100%;
        justify-content: center;
      }

      .content-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1.2em;
      }

      .selected-files {
        background: rgba(30, 41, 59, 0.32);
        border-radius: 12px;
        padding: 1.2em;
        margin-bottom: 1.5em;
        border: 1px solid rgba(80, 120, 180, 0.13);
        display: none;
        max-height: 220px;
        overflow-y: auto;
      }

      .selected-files.visible {
        display: block;
      }

      .selected-files-title {
        color: #38bdf8;
        font-weight: 600;
        margin-bottom: 1em;
        font-size: 1.05em;
      }

      .file-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.8em 0;
        border-bottom: 1px solid rgba(80, 120, 180, 0.1);
        color: #b6c2d6;
        gap: 0.75em;
      }

      .file-item:last-child {
        border-bottom: none;
      }

      .file-name {
        flex: 1;
        word-break: break-all;
        margin-right: 1em;
      }

      .file-size {
        color: #64748b;
        font-size: 0.9em;
        white-space: nowrap;
      }

      .file-remove {
        background: none;
        border: none;
        color: #ef4444;
        cursor: pointer;
        padding: 0 0.5em;
        font-size: 1.2em;
        transition: color 0.2s;
      }

      .file-remove:hover {
        color: #f87171;
      }
      .secondary-btn {
        background: rgba(56, 189, 248, 0.15);
        color: #38bdf8;
        border: 1.5px solid #38bdf8;
        border-radius: 10px;
        padding: 0.8em 1.7em;
        font-size: 1.13em;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
        outline: none;
      }

      .secondary-btn:hover {
        background: rgba(56, 189, 248, 0.25);
        box-shadow: 0 2px 12px #38bdf844;
      }

      #fileInput {
        display: none;
      }

      .log-pane {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: linear-gradient(
          180deg,
          rgba(15, 23, 42, 0.98) 0%,
          rgba(10, 15, 28, 0.99) 100%
        );
        border-top: 2px solid rgba(56, 189, 248, 0.3);
        box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        overflow: hidden;
        z-index: 50;
        transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        max-height: 40px;
      }

      .log-pane[data-expanded='true'] {
        max-height: 350px;
      }

      .log-inner {
        max-width: 1400px;
        margin: 0 auto;
      }

      .log-header {
        padding: 0.75em 1.5em;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: space-between;
        user-select: none;
        border-bottom: 1px solid rgba(56, 189, 248, 0.2);
        transition: all 0.2s ease;
      }

      .log-header:hover {
        background: rgba(56, 189, 248, 0.05);
      }

      .log-title {
        color: #38bdf8;
        font-weight: 600;
        font-size: 0.95em;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 0.5em;
      }

      .log-toggle {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #38bdf8;
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        font-size: 1.2em;
      }

      .log-pane[data-expanded='true'] .log-toggle {
        transform: rotate(180deg);
      }

      .log-content {
        color: #b6c2d6;
        font-size: 0.9em;
        padding: 1em 1.5em;
        overflow-y: auto;
        max-height: 200px;
      }

      .log-content div {
        margin-bottom: 0.3em;
        word-break: break-all;
        line-height: 1.4;
      }

      .shared-files-list {
        width: 100%;
      }

      .shared-files-title {
        margin: 0 0 1em 0;
        font-size: 1.15em;
        color: #38bdf8;
        font-weight: 700;
      }

      .shared-file-item {
        background: rgba(30, 41, 59, 0.32);
        border-radius: 10px;
        border: 1px solid rgba(80, 120, 180, 0.13);
        padding: 1em;
        margin-bottom: 0.8em;
        display: flex;
        align-items: center;
        gap: 1em;
        transition: all 0.2s;
        flex-wrap: wrap;
      }

      .shared-file-item:hover {
        background: rgba(30, 41, 59, 0.5);
        border-color: rgba(56, 189, 248, 0.3);
      }

      .shared-file-name {
        flex: 1;
        word-break: break-all;
        color: #e2e8f0;
        font-weight: 500;
      }

      .shared-file-peer {
        font-size: 0.85em;
        color: #64748b;
        white-space: nowrap;
      }

      .download-btn {
        background: linear-gradient(90deg, #38bdf8 0%, #2563eb 100%);
        color: #fff;
        padding: 0.6em 1.2em;
        border-radius: 7px;
        text-decoration: none;
        font-weight: 600;
        white-space: nowrap;
        transition: all 0.2s;
        font-size: 0.95em;
      }

      .download-btn:hover {
        box-shadow: 0 4px 12px rgba(56, 189, 248, 0.4);
        transform: translateY(-1px);
      }

      .share-btn {
        background: rgba(15, 23, 42, 0.6);
        color: #e2e8f0;
        border: 1px solid rgba(80, 120, 180, 0.25);
        border-radius: 7px;
        padding: 0.5em 0.7em;
        text-decoration: none;
        font-weight: 600;
        white-space: nowrap;
        transition: all 0.2s;
        font-size: 0.9em;
        display: inline-flex;
        align-items: center;
        gap: 0.4em;
        cursor: pointer;
      }

      .share-btn:hover {
        border-color: rgba(56, 189, 248, 0.45);
        color: #38bdf8;
      }

      .shared-remove {
        background: rgba(15, 23, 42, 0.6);
        color: #f87171;
        border: 1px solid rgba(248, 113, 113, 0.4);
        border-radius: 7px;
        padding: 0.45em 0.6em;
        text-decoration: none;
        font-weight: 600;
        white-space: nowrap;
        transition: all 0.2s;
        font-size: 0.9em;
        display: inline-flex;
        align-items: center;
        gap: 0.4em;
        cursor: pointer;
      }

      .shared-remove:hover {
        border-color: rgba(248, 113, 113, 0.7);
        color: #fecaca;
      }

      .empty-state {
        color: #64748b;
        font-size: 1em;
        padding: 2em;
        text-align: center;
      }
      .controls-row select {
        font-size: 1em;
        padding: 0.5em 1em;
        border-radius: 7px;
        border: 1.5px solid #38bdf8;
        background: rgba(30, 41, 59, 0.18);
        color: #fff;
        outline: none;
        min-width: 120px;
        transition:
          border 0.2s,
          box-shadow 0.2s;
        box-shadow: 0 1px 4px #38bdf822;
      }
      .controls-row button {
        background: linear-gradient(90deg, #38bdf8 0%, #2563eb 100%);
        color: #fff;
        border: none;
        border-radius: 10px;
        padding: 0.8em 1.7em;
        font-size: 1.13em;
        font-weight: 700;
        cursor: pointer;
        box-shadow:
          0 2px 12px #38bdf844,
          0 0 0 0 #38bdf800;
        transition:
          background 0.2s,
          box-shadow 0.2s,
          outline 0.2s;
        outline: none;
      }
      .controls-row button:focus,
      .controls-row button:hover {
        background: linear-gradient(90deg, #2563eb 0%, #38bdf8 100%);
        box-shadow:
          0 4px 24px #38bdf888,
          0 0 0 2px #38bdf8;
        outline: none;
      }
      .status-card {
        background: rgba(30, 41, 59, 0.32);
        border-radius: 14px;
        box-shadow: 0 2px 12px 0 rgba(31, 38, 135, 0.13);
        border: 1.2px solid rgba(80, 120, 180, 0.13);
        padding: 1.3em 1.5em 1.3em 1.5em;
        color: #b6c2d6;
        font-size: 1.08em;
        margin-bottom: 0.5em;
        min-height: 90px;
        overflow-y: auto;
        max-height: 180px;
        background-clip: padding-box;
      }
      .status-card div {
        margin-bottom: 0.3em;
        color: #b6c2d6;
        word-break: break-all;
        font-size: 0.98em;
      }
      .peer-id {
        color: #38bdf8;
        font-size: 1.13em;
        margin-bottom: 1.1em;
        word-break: break-all;
        font-weight: 600;
        letter-spacing: 0.01em;
      }
      @media (max-width: 700px) {
        .section-card {
          padding: 1.2em 0.9em 1em 0.9em;
        }

        .controls-row {
          flex-direction: column;
          align-items: stretch;
        }
        .controls-row button,
        .controls-row input[type='file'],
        .controls-row select {
          width: 100%;
          min-width: 0;
        }

        .shared-file-item {
          flex-direction: column;
          align-items: stretch;
          text-align: center;
        }
      }

      @media (min-width: 900px) {
        .content-wrapper {
          max-width: 1400px;
        }

        .content-grid {
          grid-template-columns: 1fr;
          align-items: start;
        }

        .selected-files,
        .shared-files-list {
          margin-bottom: 1.2em;
        }
      }
    `
  ]
  async firstRender(): Promise<void> {
    // Check for share/download hash in URL
    const urlParams = new URLSearchParams(window.location.search)
    const shareHash = urlParams.get('share')
    const downloadHash = urlParams.get('download')
    const downloadName = urlParams.get('name') || undefined
    if (downloadHash) {
      this.#pendingDownload = { hash: downloadHash, name: downloadName }
      this.downloadConfirmPending = { hash: downloadHash, name: downloadName }
    }
    if (shareHash || downloadHash) {
      // Fetch shared files/folders from Peernet store
      let hashesToFetch = []
      if (shareHash) {
        // Fetch all files for the share hash
        // (Assume shareHash maps to a list of file hashes in your store)
        try {
          const fileList =
            (await globalThis.shareStore.get(shareHash)) ??
            (await peernet?.requestData?.(shareHash, 'share'))
          if (fileList && Array.isArray(fileList)) {
            hashesToFetch = fileList
          }
        } catch (e) {
          this.addLog('Could not fetch shared files for hash: ' + shareHash)
        }
      } else if (downloadHash) {
        hashesToFetch = [downloadHash]
      }
      // Fetch file metadata for each hash
      const fetchedFiles = []
      for (const hash of hashesToFetch) {
        try {
          const encoded =
            (await globalThis.shareStore.get(hash)) ??
            (await peernet?.requestData?.(hash, 'share'))
          if (encoded) {
            // Decode file metadata (assume peernet-file proto)
            const fileProto = new peernet.protos['peernet-file']()
            await fileProto.decode(encoded)
            const linkSizes = Array.isArray(fileProto.links)
              ? fileProto.links.reduce(
                  (sum: number, link: { size?: number }) =>
                    sum + (link?.size ?? 0),
                  0
                )
              : 0
            fetchedFiles.push({
              name: fileProto.path,
              hash,
              peerId: this.peerId,
              type: 'file',
              size: fileProto.content?.length || linkSizes || 0
            })
          }
        } catch (e) {
          this.addLog('Could not fetch file for hash: ' + hash)
        }
      }
      if (fetchedFiles.length) {
        this.sharedFiles = fetchedFiles
        this.addLog('Fetched shared files for download link.')
      }
    }
    this.#attachGlobalDropHandlers()
    try {
      this.showHint = localStorage.getItem('peernet-hide-hint') !== '1'
    } catch (error) {
      this.showHint = true
    }
    const loadingScreen = document.querySelector('loading-screen') as any
    const updateStatus = (status: string) => {
      if (loadingScreen) loadingScreen.status = status
    }

    try {
      updateStatus('starting')
      const password = await getOrCreatePassword()
      const options = {
        stars: ['wss://star.leofcoin.org'],
        network: 'leofcoin:peach',
        autoStart: false,
        version: '0.1.1'
      }

      peernet = await new Peernet(options, password)
      // todo should only be shareable to other peers we want to share with
      peernet.addStore('share', 'peernet', false)

      updateStatus('connecting-stars')
      pubsub.subscribe('star:connected', () => {
        if (loadingScreen?.shown) updateStatus('connecting-peers')
        this.addLog('Connecting to star...')
      })

      pubsub.subscribe('peer:connected', (peer: any) => {
        if (peer !== peernet.peerId) this.addLog(`Peer connected: ${peer}`)
        if (
          this.#pendingDownload &&
          !this.#isSearching &&
          !this.isDownloading &&
          !this.downloadReady
        ) {
          this.#isSearching = true
          this.#downloadSharedFile(
            this.#pendingDownload.hash,
            this.#pendingDownload.name
          ).finally(() => {
            this.#isSearching = false
          })
        }
      })

      await peernet.start()
      this.peerId = peernet.peerId

      // peernet is ready — dismiss loading immediately
      updateStatus('connected')
      setTimeout(() => {
        if (loadingScreen) loadingScreen.shown = false
      }, 500)

      this.addLog(`Peernet started. Your ID: ${peernet.peerId}`)
    } catch (err) {
      this.addLog(`Failed to initialize Peernet: ${err}`)
      console.error(err)
    }
  }

  async #getFromShareStore(hash: string): Promise<any> {
    try {
      let data = await globalThis.shareStore.get(hash)
      if (!data) {
        try {
          this.addLog(`Fetching ${hash.slice(0, 12)}… from network`)
          data = await peernet.requestData(hash, 'share')
        } catch {
          // network fetch failed
        }
      }
      return data
    } catch (error) {
      try {
        this.addLog(`Fetching ${hash.slice(0, 12)}… from network`)
        return await peernet.requestData(hash, 'share')
      } catch {
        return null
      }
    }
  }

  getFromShareStore(hash: string): Promise<any> {
    return this.#getFromShareStore(hash)
  }

  #saveToFilesystem = () => {
    if (!this.#readyBlob || !this.#readyFilename) return
    const url = URL.createObjectURL(this.#readyBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = this.#readyFilename
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    this.addLog(`Saved: ${this.#readyFilename}`)
    this.#readyBlob = undefined
    this.#readyFilename = undefined
    this.downloadReady = false
    this.downloadConfirmPending = null
    this.#pendingDownload = undefined
  }
  async #downloadSharedFile(hash: string, name?: string) {
    let downloadStartedAt = 0
    const resetDownload = () => {
      this.isDownloading = false
      this.downloadBytesDone = 0
      this.downloadBytesTotal = 0
      this.downloadName = ''
      this.downloadStage = ''
      this.downloadHash = ''
      this.downloadChunkTotal = 0
      this.downloadChunkDone = 0
      this.downloadRateBytes = 0
      this.downloadEtaSeconds = 0
      downloadStartedAt = 0
      this.#readyBlob = undefined
      this.#readyFilename = undefined
      this.downloadReady = false
    }

    try {
      await globalThis.shareStore.get(hash)
    } catch (error) {
      console.error(error)

      if (error.message.includes('not found')) {
        this.addLog(`File not found for download hash: ${hash}`)
      } else {
        this.addLog(`Error accessing share store for hash ${hash}: ${error}`)
        console.error(error)
      }
    }
    try {
      const _timeout = new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                'Download timed out: peer did not respond within 30 seconds'
              )
            ),
          30_000
        )
      )
      const encoded = await Promise.race([peernet.get(hash, 'share'), _timeout])
      if (!encoded) {
        this.addLog(`Could not find file for download hash: ${hash}`)
        return
      }

      if (this.#pendingDownload?.hash === hash)
        this.#pendingDownload = undefined

      const fileProto = new peernet.protos['peernet-file'](
        encoded
      ) as PeernetFile
      console.log(fileProto)

      const { path, content, links } = fileProto.decoded as {
        path?: string
        content?: Uint8Array
        links?: { hash: string; size?: number; path?: string }[]
      }
      let filename = name || path || 'download'
      this.isDownloading = true
      this.downloadName = filename
      this.downloadHash = hash
      this.downloadStage = 'Preparing'
      downloadStartedAt = performance.now()
      const parts: Uint8Array[] = []

      if (Array.isArray(links) && links.length) {
        const ordered = [...links].sort((a: any, b: any) =>
          String(a.path || '').localeCompare(String(b.path || ''))
        )
        this.downloadBytesTotal = ordered.reduce(
          (sum, link) => sum + (link.size ?? 0),
          0
        )
        this.downloadChunkTotal = ordered.length
        this.downloadChunkDone = 0
        this.downloadStage = 'Downloading'

        for (const link of ordered) {
          const chunkEncoded = await this.#getFromShareStore(link.hash)
          if (!chunkEncoded) {
            this.addLog(`Missing chunk for ${filename}: ${link.hash}`)
            return
          }
          const chunkProto = new peernet.protos['peernet-file']()
          await chunkProto.decode(chunkEncoded)
          if (!chunkProto.content) {
            this.addLog(`Invalid chunk content for ${filename}`)
            return
          }
          parts.push(chunkProto.content)
          this.downloadBytesDone = Math.min(
            this.downloadBytesTotal,
            this.downloadBytesDone + chunkProto.content.length
          )
          this.downloadChunkDone += 1
          const elapsedSeconds = Math.max(
            0.5,
            (performance.now() - downloadStartedAt) / 1000
          )
          this.downloadRateBytes = this.downloadBytesDone / elapsedSeconds
          this.downloadEtaSeconds = this.downloadRateBytes
            ? Math.max(
                0,
                (this.downloadBytesTotal - this.downloadBytesDone) /
                  this.downloadRateBytes
              )
            : 0
          this.requestRender()
          await new Promise((resolve) => requestAnimationFrame(() => resolve()))
        }
      } else if (content) {
        parts.push(content)
        this.downloadBytesTotal = content.length
        this.downloadBytesDone = content.length
        this.downloadChunkTotal = 1
        this.downloadChunkDone = 1
        this.downloadStage = 'Downloading'
        this.downloadRateBytes = this.downloadBytesTotal
        this.downloadEtaSeconds = 0
        this.requestRender()
      } else {
        this.addLog(`No content available for download: ${filename}`)
        return
      }

      this.downloadStage = 'Ready'
      this.requestRender()
      this.#readyBlob = new Blob(parts)
      this.#readyFilename = filename
      this.isDownloading = false
      this.downloadReady = true
      this.addLog(`File ready to save: ${filename}`)
    } catch (error) {
      this.addLog(`Failed to download shared file: ${error}`)
      console.error(error)
      resetDownload()
    }
  }

  #formatDuration(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds <= 0) return '0:00'
    const total = Math.round(seconds)
    const mins = Math.floor(total / 60)
    const secs = total % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.#detachGlobalDropHandlers()
  }

  #attachGlobalDropHandlers() {
    window.addEventListener('dragenter', this.#handleWindowDragEnter)
    window.addEventListener('dragover', this.#handleWindowDragOver)
    window.addEventListener('dragleave', this.#handleWindowDragLeave)
    window.addEventListener('drop', this.#handleWindowDrop)
  }

  #detachGlobalDropHandlers() {
    window.removeEventListener('dragenter', this.#handleWindowDragEnter)
    window.removeEventListener('dragover', this.#handleWindowDragOver)
    window.removeEventListener('dragleave', this.#handleWindowDragLeave)
    window.removeEventListener('drop', this.#handleWindowDrop)
  }

  #handleWindowDragEnter = (e: DragEvent) => {
    e.preventDefault()
    this.#dragCounter += 1
    this.dropActive = true
  }

  #handleWindowDragOver = (e: DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy'
    }
    this.dropActive = true
  }

  #handleWindowDragLeave = () => {
    this.#dragCounter = Math.max(0, this.#dragCounter - 1)
    if (this.#dragCounter === 0) {
      this.dropActive = false
    }
  }

  #handleWindowDrop = async (e: DragEvent) => {
    e.preventDefault()
    this.dropActive = false
    this.#dragCounter = 0

    const items = e.dataTransfer?.items
    let files: File[] = []

    if (items && items.length) {
      files = await this.#getFilesFromDataTransferItems(items)
    }

    if (!files.length && e.dataTransfer?.files) {
      files = Array.from(e.dataTransfer.files)
    }

    if (files.length) {
      this.#applySelectedFiles(files)
    }
  }

  #applySelectedFiles(files: File[], name?: any) {
    this.files = files
    this.addLog(`Selected ${this.files.length} file(s).`)
    this.handleShare()
  }

  addLog(msg: string) {
    this.log = [...this.log, msg]
    setTimeout(() => this.scrollLogToBottom(), 0)
  }

  scrollLogToBottom() {
    const logDiv = this.shadowRoot?.querySelector('#log')
    if (logDiv) logDiv.scrollTop = logDiv.scrollHeight
  }

  handleFilesSelected(e: CustomEvent) {
    const { files } = e.detail
    if (files && files.length) {
      this.#applySelectedFiles(files)
    }
  }

  #openFilePicker = async () => {
    if ('showOpenFilePicker' in window) {
      try {
        const fileHandles = await (window as any).showOpenFilePicker({
          multiple: true
        })
        const files = await Promise.all(
          fileHandles.map((handle: any) => handle.getFile())
        )
        if (files.length) {
          this.#applySelectedFiles(files)
        }
        return
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          return
        }
      }
    }

    if (!this.#fileInput) {
      this.#fileInput = document.createElement('input')
      this.#fileInput.type = 'file'
      this.#fileInput.multiple = true
      this.#fileInput.addEventListener('change', (e) => {
        const input = e.target as HTMLInputElement
        const fileList = input.files
        if (fileList) {
          const files = Array.from(fileList)
          this.#applySelectedFiles(files)
        }
      })
    }
    this.#fileInput.click()
  }

  #openFolderPicker = async () => {
    if ('showDirectoryPicker' in window) {
      try {
        const directoryHandle = await (window as any).showDirectoryPicker()
        const files = await this.#getFilesFromDirectoryHandle(directoryHandle)
        if (files.length) {
          this.#applySelectedFiles(files, directoryHandle.name)
        }
        return
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          return
        }
      }
    }

    if (!this.#folderInput) {
      this.#folderInput = document.createElement('input')
      this.#folderInput.type = 'file'
      this.#folderInput.setAttribute('webkitdirectory', '')
      this.#folderInput.addEventListener('change', (e) => {
        const input = e.target as HTMLInputElement
        const fileList = input.files
        if (fileList) {
          const files = Array.from(fileList)
          this.#applySelectedFiles(
            files,
            input.webkitdirectory ? input.webkitdirectory : undefined
          )
        }
      })
    }
    this.#folderInput.click()
  }

  #dismissHint = () => {
    this.showHint = false
    try {
      localStorage.setItem('peernet-hide-hint', '1')
    } catch (error) {
      // ignore storage errors
    }
  }

  async #getFilesFromDirectoryHandle(handle: any, path = ''): Promise<File[]> {
    const files: File[] = []
    if (!handle) return files

    if (handle.kind === 'file') {
      const file = await handle.getFile()
      const filename = path ? `${path}${file.name}` : file.name
      files.push(
        new File([file], filename, {
          type: file.type,
          lastModified: file.lastModified
        })
      )
      return files
    }

    const newPath = `${path}${handle.name}/`
    for await (const entry of handle.values()) {
      const entryFiles = await this.#getFilesFromDirectoryHandle(entry, newPath)
      files.push(...entryFiles)
    }
    return files
  }

  async #getFilesFromDataTransferItems(
    items: DataTransferItemList
  ): Promise<File[]> {
    const files: File[] = []

    const traverseHandle = async (handle: any, path = '') => {
      if (!handle) return
      if (handle.kind === 'file') {
        const file = await handle.getFile()
        const filename = path ? `${path}${file.name}` : file.name
        files.push(
          new File([file], filename, {
            type: file.type,
            lastModified: file.lastModified
          })
        )
      } else if (handle.kind === 'directory') {
        const newPath = `${path}${handle.name}/`
        for await (const entry of handle.values()) {
          await traverseHandle(entry, newPath)
        }
      }
    }

    const readEntries = (reader: any) =>
      new Promise<any[]>((resolve) => reader.readEntries(resolve))

    const traverseEntry = async (entry: any, path = '') => {
      if (!entry) return
      if (entry.isFile) {
        await new Promise<void>((resolve) => {
          entry.file((file: File) => {
            const filename = path ? `${path}${file.name}` : file.name
            files.push(
              new File([file], filename, {
                type: file.type,
                lastModified: file.lastModified
              })
            )
            resolve()
          })
        })
      } else if (entry.isDirectory) {
        const reader = entry.createReader()
        let entries: any[] = []
        do {
          entries = await readEntries(reader)
          for (const child of entries) {
            await traverseEntry(child, `${path}${entry.name}/`)
          }
        } while (entries.length)
      }
    }

    for (const item of Array.from(items)) {
      if (item.kind !== 'file') continue

      const getHandle = (item as any).getAsFileSystemHandle
      if (getHandle) {
        try {
          const handle = await getHandle.call(item)
          await traverseHandle(handle)
          continue
        } catch (error) {
          // Fallback to webkitGetAsEntry
        }
      }

      const entry = (item as any).webkitGetAsEntry?.()
      if (entry) {
        await traverseEntry(entry)
      } else {
        const file = item.getAsFile()
        if (file) files.push(file)
      }
    }

    return files
  }

  removeFile(index: number) {
    this.files = this.files.filter((_, i) => i !== index)
  }

  async #refreshShareHash() {
    const allHashes = this.sharedFiles
      .filter((file) => file.hash)
      .map((file) => file.hash)
    if (allHashes.length) {
      this.shareHash = await this.#computeShareHash(allHashes)
    } else {
      this.shareHash = ''
    }
  }

  #updateProcessingProgress(item: any, bytes: number) {
    item.doneBytes = Math.min(item.size, item.doneBytes + bytes)
    this.processingBytesDone = Math.min(
      this.processingBytesTotal,
      this.processingBytesDone + bytes
    )
    this.requestRender()
  }

  #concatUint8(a: Uint8Array, b: Uint8Array): Uint8Array {
    const output = new Uint8Array(a.length + b.length)
    output.set(a, 0)
    output.set(b, a.length)
    return output
  }

  async #readFileBytesWithProgress(file: File, item: any): Promise<Uint8Array> {
    if (!file.stream) {
      if (file.size > AppShell.maxInMemoryBytes) {
        throw new RangeError('File too large to process in memory.')
      }
      const buffer = await file.arrayBuffer()
      item.doneBytes = item.size
      this.processingBytesDone = Math.min(
        this.processingBytesTotal,
        this.processingBytesDone + buffer.byteLength
      )
      this.requestRender()
      return new Uint8Array(buffer)
    }

    if (file.size > AppShell.maxInMemoryBytes) {
      throw new RangeError('File too large to process in memory.')
    }

    const reader = file.stream().getReader()
    const chunks = []
    let received = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        chunks.push(value)
        received += value.length
        this.#updateProcessingProgress(item, value.length)
        await new Promise((resolve) => requestAnimationFrame(() => resolve()))
      }
    }
    const output = new Uint8Array(received)
    let offset = 0
    for (const chunk of chunks) {
      output.set(chunk, offset)
      offset += chunk.length
    }
    return output
  }

  async #storeChunkedFile(file: File, item: any): Promise<string> {
    if (!file.stream) {
      throw new RangeError('Streaming not supported for large files.')
    }

    const reader = file.stream().getReader()
    const links: Array<{ hash: string; path: string; size: number }> = []
    let pending = new Uint8Array(0)
    let index = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        pending = pending.length ? this.#concatUint8(pending, value) : value
        this.#updateProcessingProgress(item, value.length)
        while (pending.length >= AppShell.chunkSizeBytes) {
          const chunk = pending.slice(0, AppShell.chunkSizeBytes)
          pending = pending.slice(AppShell.chunkSizeBytes)

          item.stage = 'hashing'
          this.requestRender()
          const chunkNode = new peernet.protos['peernet-file']({
            path: `${file.name}.part-${index}`,
            content: chunk
          })
          await chunkNode.encode()
          const chunkHash = await chunkNode.hash()

          item.stage = 'storing'
          this.requestRender()
          await globalThis.shareStore.put(chunkHash, chunkNode.encoded)

          links.push({
            hash: chunkHash,
            path: `part-${index.toString().padStart(6, '0')}`,
            size: chunk.length
          })
          index += 1
        }
        await new Promise((resolve) => requestAnimationFrame(() => resolve()))
      }
    }

    if (pending.length) {
      item.stage = 'hashing'
      this.requestRender()
      const chunkNode = new peernet.protos['peernet-file']({
        path: `${file.name}.part-${index}`,
        content: pending
      })
      await chunkNode.encode()
      const chunkHash = await chunkNode.hash()

      item.stage = 'storing'
      this.requestRender()
      await globalThis.shareStore.put(chunkHash, chunkNode.encoded)

      links.push({
        hash: chunkHash,
        path: `part-${index.toString().padStart(6, '0')}`,
        size: pending.length
      })
    }

    const node = new peernet.protos['peernet-file']({
      path: file.name,
      links
    })
    await node.encode()
    const hash = await node.hash()
    await globalThis.shareStore.put(hash, node.encoded)
    return hash
  }

  #removeSharedItem = async (entry: {
    name: string
    hash: string
    peerId: string
    type?: 'file' | 'folder'
  }) => {
    if (entry.type === 'folder') {
      const prefix = `${entry.name}/`
      this.sharedFiles = this.sharedFiles.filter((item) => {
        if (item.type === 'folder' && item.name === entry.name) return false
        if (item.type === 'file' && item.name.startsWith(prefix)) return false
        return true
      })
      this.files = this.files.filter((file) => {
        const rel = (file as any).webkitRelativePath || file.name
        return !rel.startsWith(prefix)
      })
    } else {
      this.sharedFiles = this.sharedFiles.filter((item) => item !== entry)
      this.files = this.files.filter((file) => file.name !== entry.name)
    }
    await this.#refreshShareHash()
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
  }

  async handleShare() {
    const hashes: string[] = []
    const newSharedFiles = [...this.sharedFiles]

    this.isProcessing = this.files.length > 0
    this.processingTotal = this.files.length
    this.processingDone = 0
    this.processingBytesTotal = this.files.reduce(
      (sum, file) => sum + file.size,
      0
    )
    this.processingBytesDone = 0
    this.processingItems = this.files.map((file, index) => {
      const name = (file as any).webkitRelativePath || file.name
      return {
        id: `${name}-${file.size}-${file.lastModified}-${index}`,
        name,
        size: file.size,
        doneBytes: 0,
        stage: 'reading'
      }
    })

    const folderGroups = new Map<string, number>()
    for (const file of this.files) {
      const relativePath = (file as any).webkitRelativePath || ''
      const pathSource = relativePath || file.name
      if (pathSource.includes('/')) {
        const topFolder = pathSource.split('/')[0]
        if (topFolder) {
          folderGroups.set(topFolder, (folderGroups.get(topFolder) ?? 0) + 1)
        }
      }
    }

    if (folderGroups.size) {
      for (const [name, fileCount] of folderGroups.entries()) {
        const exists = newSharedFiles.some(
          (entry) => entry.type === 'folder' && entry.name === name
        )
        if (!exists) {
          newSharedFiles.push({
            name,
            hash: '',
            peerId: this.peerId,
            type: 'folder',
            fileCount
          })
        }
      }
    }

    const results: Array<{ hash: string; name: string } | null> = Array(
      this.files.length
    ).fill(null)
    const concurrency = Math.max(
      1,
      Math.min(4, navigator.hardwareConcurrency ?? 2)
    )
    let cursor = 0

    const processNext = async () => {
      while (true) {
        const index = cursor
        cursor += 1
        if (index >= this.files.length) return

        const file = this.files[index]
        const item = this.processingItems[index]
        console.log('Processing file for sharing:', file.name)
        console.log(file)
        this.processingName = file.name
        this.requestRender()
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve())
        )
        try {
          const hash =
            file.stream && file.size > AppShell.chunkThresholdBytes
              ? await this.#storeChunkedFile(file, item)
              : await (async () => {
                  const bytes = await this.#readFileBytesWithProgress(
                    file,
                    item
                  )
                  item.stage = 'hashing'
                  this.requestRender()

                  const fileProto = new peernet.protos['peernet-file']({
                    path: file.name,
                    content: bytes
                  })
                  await fileProto.encode()
                  const resolvedHash = await fileProto.hash()

                  item.stage = 'storing'
                  this.requestRender()

                  try {
                    await globalThis.shareStore.put(
                      resolvedHash,
                      fileProto.encoded
                    )
                  } catch (e) {
                    this.addLog(
                      `Warning: Could not add ${file.name} to datastore: ${e}`
                    )
                  }
                  return resolvedHash
                })()
          results[index] = { hash, name: file.name }
          item.stage = 'done'
        } catch (err) {
          this.addLog(`Failed to share file: ${file.name} (error reading file)`)
          console.error(err)
          if (item) item.stage = 'error'
        } finally {
          this.processingDone += 1
          this.requestRender()
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() => resolve())
          )
        }
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(concurrency, this.files.length) }, () =>
        processNext()
      )
    )

    for (const result of results) {
      if (!result) continue
      hashes.push(result.hash)
      newSharedFiles.push({
        name: result.name,
        hash: result.hash,
        peerId: this.peerId,
        type: 'file'
      })
    }

    this.isProcessing = false
    this.processingName = ''
    this.processingItems = []

    this.sharedFiles = newSharedFiles
    const allHashes = newSharedFiles
      .filter((file) => file.hash)
      .map((file) => file.hash)
    if (allHashes.length) {
      this.shareHash = await this.#computeShareHash(allHashes)
    } else {
      this.shareHash = ''
    }
  }

  async #computeShareHash(hashes: string[]): Promise<string> {
    const sorted = [...hashes].sort()
    const data = new TextEncoder().encode(sorted.join('|'))
    const digest = await crypto.subtle.digest('SHA-256', data)
    const bytes = Array.from(new Uint8Array(digest))
    return bytes.map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  #copyShareHash = () => {
    if (!this.shareHash) return
    navigator.clipboard.writeText(this.shareHash)
  }

  #copyShareLink = () => {
    if (!this.shareHash) return
    const url = new URL(window.location.href)
    url.searchParams.set('share', this.shareHash)
    navigator.clipboard.writeText(url.toString())
  }

  #copyFileShareLink = (hash: string, name: string) => {
    const url = new URL(window.location.href)
    url.searchParams.set('download', hash)
    url.searchParams.set('name', name)
    navigator.clipboard.writeText(url.toString())
  }

  render() {
    return html`
      <info-header .peerId=${this.peerId}></info-header>
      <div class="main-content">
        <div class="content-wrapper">
          <div class="header">Peernet File Share</div>

          <div class="section-card intro-card">
            <h3 class="section-title">How it works</h3>
            <div class="intro-text">
              Peernet runs entirely in your browser. When you pick files, they
              are prepared locally and shared directly with connected peers—no
              central server stores your data. Transfers are fast because data
              flows peer-to-peer, and every file is content‑hashed, so identical
              files map to the same hash and duplicates aren’t re-sent. Anyone
              with the shared link can download from your device while you're
              online.
            </div>
            <ol class="steps-list">
              <li>Upload files or a folder.</li>
              <li>Peernet hashes and announces them to peers.</li>
              <li>Share the download link; peers fetch from you directly.</li>
            </ol>
          </div>

          ${this.showHint
            ? html`
                <div class="hint-bar">
                  <div class="hint-text">
                    Tip: drag & drop anywhere to share instantly.
                  </div>
                  <div class="hint-actions">
                    <button class="hint-dismiss" @click=${this.#dismissHint}>
                      Do not show again
                    </button>
                  </div>
                </div>
              `
            : ''}

          <div class="content-grid">
            <div class="right-pane">
              <div class="section-card files-card">
                <div class="files-header">
                  <h3 class="section-title">Files</h3>
                  <div class="files-actions">
                    <button
                      class="share-cta"
                      @click=${this.#copyShareLink}
                      ?disabled=${!this.shareHash}
                      title=${this.shareHash
                        ? 'Copy share link for all files'
                        : 'Share link will appear after files are shared'}
                    >
                      Share all
                    </button>
                  </div>
                </div>
                ${this.shareHash
                  ? html`
                      <div class="share-hash-row">
                        <span class="share-hash-label">All files hash:</span>
                        <span class="share-hash-value"
                          >${this.shareHash.slice(
                            0,
                            12
                          )}…${this.shareHash.slice(-8)}</span
                        >
                        <button
                          class="share-hash-copy"
                          @click=${this.#copyShareHash}
                        >
                          Copy
                        </button>
                        <button
                          class="share-hash-share"
                          @click=${this.#copyShareLink}
                        >
                          Share
                        </button>
                      </div>
                    `
                  : ''}
                ${this.isProcessing
                  ? html`
                      <div class="processing-banner">
                        <span class="processing-icon">
                          <custom-icon icon="upload"></custom-icon>
                        </span>
                        <div class="processing-meta">
                          <div class="processing-title">
                            Processing
                            ${this.processingDone}/${this.processingTotal}
                            ${this.processingBytesTotal
                              ? html` •
                                ${Math.round(
                                  (this.processingBytesDone /
                                    this.processingBytesTotal) *
                                    100
                                )}%`
                              : ''}
                          </div>
                          <div class="processing-name">
                            ${this.processingName || 'Preparing files...'}
                          </div>
                        </div>
                        <div class="processing-bar">
                          <span
                            style="width:${this.processingBytesTotal
                              ? Math.round(
                                  (this.processingBytesDone /
                                    this.processingBytesTotal) *
                                    100
                                )
                              : this.processingTotal
                                ? Math.round(
                                    (this.processingDone /
                                      this.processingTotal) *
                                      100
                                  )
                                : 0}%"
                          ></span>
                        </div>
                      </div>
                    `
                  : ''}
                ${this.downloadConfirmPending &&
                !this.isDownloading &&
                !this.downloadReady
                  ? html`
                      <div class="processing-banner" style="cursor:default">
                        <span class="processing-icon">
                          <custom-icon icon="download"></custom-icon>
                        </span>
                        <div class="processing-meta">
                          <div class="processing-title">
                            Fetching from network…
                          </div>
                          <div class="processing-name">
                            ${this.downloadConfirmPending.name
                              ? this.downloadConfirmPending.name
                              : html`Hash
                                  <code
                                    >${this.downloadConfirmPending.hash.slice(
                                      0,
                                      16
                                    )}…</code
                                  >`}
                            &bull; Please be patient
                          </div>
                        </div>
                      </div>
                    `
                  : ''}
                ${this.downloadReady
                  ? html`
                      <div class="processing-banner" style="cursor:default">
                        <span class="processing-icon">
                          <custom-icon icon="download"></custom-icon>
                        </span>
                        <div class="processing-meta">
                          <div class="processing-title">Ready to save</div>
                          <div class="processing-name">
                            ${this.#readyFilename || ''}
                          </div>
                        </div>
                        <button
                          class="share-btn"
                          style="margin-left:auto;white-space:nowrap"
                          @click=${this.#saveToFilesystem}
                        >
                          Save to disk
                        </button>
                      </div>
                    `
                  : ''}
                ${this.isDownloading
                  ? html`
                      <div class="processing-banner">
                        <span class="processing-icon">
                          <custom-icon icon="download"></custom-icon>
                        </span>
                        <div class="processing-meta">
                          <div class="processing-title">
                            Downloading
                            ${this.downloadBytesTotal
                              ? html` •
                                ${Math.round(
                                  (this.downloadBytesDone /
                                    this.downloadBytesTotal) *
                                    100
                                )}%`
                              : ''}
                          </div>
                          <div class="processing-name">
                            ${this.downloadStage === 'Preparing'
                              ? html`Downloading hash
                                  <code
                                    >${this.downloadHash.slice(0, 16)}…</code
                                  >
                                  &bull; Please be patient`
                              : html`${this.downloadName || ''}
                                ${this.downloadStage
                                  ? html` • ${this.downloadStage}`
                                  : ''}
                                ${this.downloadChunkTotal
                                  ? html` • Chunks
                                    ${this.downloadChunkDone}/${this
                                      .downloadChunkTotal}`
                                  : ''}
                                ${this.downloadRateBytes
                                  ? html` •
                                    ${this.formatFileSize(
                                      this.downloadRateBytes
                                    )}/s`
                                  : ''}
                                ${this.downloadEtaSeconds &&
                                this.downloadBytesTotal
                                  ? html` • ETA
                                    ${this.#formatDuration(
                                      this.downloadEtaSeconds
                                    )}`
                                  : ''}`}
                          </div>
                        </div>
                        <div class="processing-bar">
                          <span
                            style="width:${this.downloadBytesTotal
                              ? Math.round(
                                  (this.downloadBytesDone /
                                    this.downloadBytesTotal) *
                                    100
                                )
                              : 0}%"
                          ></span>
                        </div>
                      </div>
                    `
                  : ''}
                ${this.isProcessing && this.processingItems.length
                  ? html`
                      <div class="file-progress-list">
                        ${this.processingItems.map((item) => {
                          const percent = item.size
                            ? Math.round((item.doneBytes / item.size) * 100)
                            : 0
                          const stageLabel =
                            item.stage === 'reading'
                              ? `Reading ${percent}%`
                              : item.stage === 'hashing'
                                ? 'Hashing'
                                : item.stage === 'storing'
                                  ? 'Storing'
                                  : item.stage === 'done'
                                    ? 'Done'
                                    : 'Error'
                          return html`
                            <div class="file-progress-item">
                              <div class="file-progress-header">
                                <div class="file-progress-name">
                                  ${item.name}
                                </div>
                                <div class="file-progress-stage">
                                  ${stageLabel}
                                </div>
                              </div>
                              <div
                                class="file-progress-bar"
                                data-stage=${item.stage}
                              >
                                <span
                                  style="width:${item.stage === 'reading'
                                    ? percent
                                    : 100}%"
                                ></span>
                              </div>
                            </div>
                          `
                        })}
                      </div>
                    `
                  : ''}
                <div class="divider"></div>

                <!-- Shared Files List -->
                <div class="shared-files-list">
                  ${this.sharedFiles.filter((file) => file.type === 'folder')
                    .length === 0 &&
                  this.sharedFiles.filter((file) => file.type !== 'folder')
                    .length === 0
                    ? html`<div class="empty-state">
                        No files have been shared yet.
                      </div>`
                    : html`
                        ${this.sharedFiles.filter(
                          (file) => file.type === 'folder'
                        ).length
                          ? html`
                              <h3 class="shared-files-title">Shared Folders</h3>
                              ${this.sharedFiles
                                .filter((file) => file.type === 'folder')
                                .map(
                                  (folder) => html`
                                    <div class="shared-file-item">
                                      <div class="shared-file-name">
                                        <custom-icon
                                          icon="folder"
                                        ></custom-icon>
                                        ${folder.name}
                                        ${folder.fileCount != null
                                          ? html`<span
                                              style="color:#64748b;font-size:0.85em;"
                                              >(${folder.fileCount} files)</span
                                            >`
                                          : ''}
                                      </div>
                                      <div class="shared-file-peer">
                                        ${folder.peerId === this.peerId
                                          ? '(You)'
                                          : folder.peerId.slice(0, 8) + '...'}
                                      </div>
                                      <button
                                        class="shared-remove"
                                        @click=${() =>
                                          this.#removeSharedItem(folder)}
                                        title="Remove folder"
                                      >
                                        <custom-icon
                                          icon="delete"
                                        ></custom-icon>
                                        Remove
                                      </button>
                                    </div>
                                  `
                                )}
                            `
                          : ''}
                        ${this.sharedFiles.filter(
                          (file) => file.type !== 'folder'
                        ).length
                          ? html`
                              <h3 class="shared-files-title">Shared Files</h3>
                              ${this.sharedFiles
                                .filter((file) => file.type !== 'folder')
                                .map(
                                  (file) => html`
                                    <div class="shared-file-item">
                                      <div class="shared-file-name">
                                        <custom-icon
                                          icon=${file.type === 'folder'
                                            ? 'folder'
                                            : 'download'}
                                        ></custom-icon>
                                        ${file.name}
                                      </div>
                                      <div class="shared-file-peer">
                                        ${file.peerId === this.peerId
                                          ? '(You)'
                                          : file.peerId.slice(0, 8) + '...'}
                                      </div>
                                      <button
                                        class="shared-remove"
                                        @click=${() =>
                                          this.#removeSharedItem(file)}
                                        title="Remove file"
                                      >
                                        <custom-icon
                                          icon="delete"
                                        ></custom-icon>
                                        Remove
                                      </button>
                                      <button
                                        class="share-btn"
                                        @click=${() =>
                                          this.#copyFileShareLink(
                                            file.hash,
                                            file.name
                                          )}
                                        title="Copy share link"
                                      >
                                        <custom-icon icon="share"></custom-icon>
                                        Share
                                      </button>
                                      <a
                                        href="?download=${encodeURIComponent(
                                          file.hash
                                        )}&name=${encodeURIComponent(
                                          file.name
                                        )}"
                                        class="download-btn"
                                        download
                                        >Download</a
                                      >
                                    </div>
                                  `
                                )}
                            `
                          : ''}
                      `}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Log Pane -->
      <div
        class="log-pane"
        data-expanded=${this.logExpanded ? 'true' : 'false'}
      >
        <div class="log-inner">
          <div
            class="log-header"
            @click=${() => (this.logExpanded = !this.logExpanded)}
          >
            <h3 class="log-title">Activity Log</h3>
            <div class="log-toggle">▲</div>
          </div>
          <div class="log-content" id="log">
            ${this.log.length === 0
              ? html`<div style="color:#64748b;">No activity yet...</div>`
              : this.log.map((msg) => html`<div>${unsafeHTML(msg)}</div>`)}
          </div>
        </div>
      </div>

      <div class="global-drop ${this.dropActive ? 'active' : ''}">
        Drop files or folders to share
      </div>

      <div class="fab-dock">
        <div class="fab-group">
          <button
            class="fab-btn secondary"
            @click=${this.#openFolderPicker}
            aria-label="Add folder"
            title="Add folder"
            data-tooltip="Add folder"
          >
            <custom-icon icon="folder" aria-hidden="true"></custom-icon>
          </button>
          <button
            class="fab-btn"
            @click=${this.#openFilePicker}
            aria-label="Add files"
            title="Add files"
            data-tooltip="Add files"
          >
            <custom-icon icon="upload" aria-hidden="true"></custom-icon>
          </button>
        </div>
      </div>

      ${icons}
    `
  }
}
customElements.define('app-shell', AppShell)
