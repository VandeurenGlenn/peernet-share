// Helper to ensure ArrayBuffer type (not SharedArrayBuffer)
const __SAB: any =
  typeof SharedArrayBuffer !== 'undefined' ? SharedArrayBuffer : null
function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  if (
    u8.buffer instanceof ArrayBuffer &&
    (!__SAB || !(u8.buffer instanceof __SAB))
  ) {
    return u8.buffer as ArrayBuffer
  }
  // Copy to new ArrayBuffer if needed
  return new Uint8Array(u8).buffer as ArrayBuffer
}
import Peernet from './../node_modules/@leofcoin/peernet/exports/browser/peernet.js'
import { LiteElement, html, css, property } from '@vandeurenglenn/lite'
import { unsafeHTML } from 'lit/directives/unsafe-html.js'
import '@vandeurenglenn/lite-elements/icon'
import { getOrCreatePassword } from './utils/password.js'
import './elements/info-header.js'

import icons from './icons.js'
import PeernetFile from '@leofcoin/peernet/file'
import QRCode from 'qrcode'
// @ts-ignore - qrcode is a CJS module; rollup-commonjs synthesizes a default
const QRCodeLib: typeof QRCode = (QRCode as any)?.default ?? QRCode
globalThis.peernet = globalThis.peernet || null

declare global {
  var peernet: Peernet
}

export class AppShell extends LiteElement {
  // ...existing code...
  downloadError: string = ''
  @property({ type: String }) accessor peerId: string = ''
  @property({ type: Array }) accessor log: string[] = []
  @property({ type: Array }) accessor files: File[] = []
  @property({ type: Boolean }) accessor dropActive: boolean = false
  @property({ type: Boolean }) accessor showHint: boolean = true
  @property({ type: Boolean }) accessor recipientMode: boolean = false
  @property({ type: Array }) accessor diskFiles: Array<{
    hash: string
    name: string
    size: number
  }> = []
  @property({ type: Boolean }) accessor diskExpanded: boolean = false
  @property({ type: Boolean }) accessor diskLoading: boolean = false
  @property({ type: String }) accessor diskQuery: string = ''
  @property({ type: String }) accessor diskSort:
    | 'name-asc'
    | 'name-desc'
    | 'size-desc'
    | 'size-asc' = 'name-asc'
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
  @property({ type: String }) accessor connectionPhase:
    | 'idle'
    | 'connecting'
    | 'searching'
    | 'peer'
    | 'fetching'
    | 'downloading'
    | 'saved' = 'idle'
  @property({ type: String }) accessor savedFilename: string = ''
  @property({ type: String }) accessor qrPanelKey: string = ''
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
        padding: 12px;
        display: flex;
        flex-direction: column;
        top: 24px;
        position: relative;
        bottom: 24px;
        position: absolute;
        right: 0;
        left: 0;
        overflow-y: auto;
        box-sizing: border-box;
      }

      .content-wrapper {
        margin: 0 auto;
        max-width: 1400px;
        width: 100%;
        box-sizing: border-box;
        flex: 1;
        display: flex;
        flex-direction: column;
        height: 100%;
      }

      .content-grid {
        display: flex;
        flex-direction: column;
        flex: 1;
        height: 100%;
      }

      .right-pane {
        flex: 1;
        display: flex;
        flex-direction: column;
        height: 100%;
      }

      .background-animation {
        position: absolute;
        width: 100%;
        height: 100%;
        inset: 0;
        pointer-events: none;
        z-index: 0;
      }

      .files-card {
        min-height: 240px;
        flex: 1;
        display: flex;
        flex-direction: column;
        height: 100%;
        text-align: center;
        z-index: 1;
        background: rgba(18, 28, 48, 0.96);
        box-shadow: 0 8px 32px 0 rgba(5, 10, 20, 0.25);
        border-radius: 24px;
        padding: 2.5em 2em 2em 2em;
        margin: 2em auto 0 auto;
        max-width: 700px;
        width: 100%;
        box-sizing: border-box;

        margin-bottom: 48px;
      }
      .disk-card {
        margin-top: 0;
        min-height: 0;
      }
      .files-header {
        padding-bottom: 0.5em;
      }
      .shared-files-list {
        margin-top: 1em;
      }
      .empty-state {
        color: #94a3b8;
        font-size: 1.1em;
        padding: 2em;
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
        background: linear-gradient(120deg, #0ea5e9 0%, #2563eb 100%);
        color: #f8fafc;
        border: 1px solid rgba(148, 197, 255, 0.42);
        border-radius: 11px;
        padding: 0.5em 0.95em;
        font-size: 0.84em;
        font-weight: 700;
        letter-spacing: 0.02em;
        cursor: pointer;
        transition:
          transform 0.16s ease,
          box-shadow 0.18s ease,
          filter 0.18s ease;
        box-shadow: 0 8px 18px rgba(14, 165, 233, 0.2);
      }

      .share-cta:hover {
        transform: translateY(-1px);
        filter: brightness(1.06);
        box-shadow: 0 11px 22px rgba(14, 165, 233, 0.28);
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
        background: linear-gradient(120deg, #0ea5e9 0%, #2563eb 100%);
        color: #f8fafc;
        border: 1px solid rgba(148, 197, 255, 0.42);
        border-radius: 10px;
        padding: 0.38em 0.75em;
        font-size: 0.8em;
        font-weight: 700;
        letter-spacing: 0.02em;
        cursor: pointer;
        transition:
          transform 0.16s ease,
          box-shadow 0.18s ease,
          filter 0.18s ease;
        box-shadow: 0 7px 16px rgba(14, 165, 233, 0.22);
      }

      .share-hash-copy:hover {
        transform: translateY(-1px);
        filter: brightness(1.06);
        box-shadow: 0 10px 21px rgba(14, 165, 233, 0.3);
      }

      .share-hash-share {
        background: rgba(15, 23, 42, 0.72);
        color: #dbeafe;
        border: 1px solid rgba(125, 160, 212, 0.36);
        border-radius: 10px;
        padding: 0.38em 0.72em;
        font-size: 0.8em;
        font-weight: 600;
        cursor: pointer;
        transition:
          transform 0.16s ease,
          border-color 0.16s ease,
          color 0.16s ease,
          background 0.16s ease;
      }

      .share-hash-share:hover {
        transform: translateY(-1px);
        border-color: rgba(125, 211, 252, 0.62);
        color: #7dd3fc;
        background: rgba(15, 23, 42, 0.88);
      }

      .qr-panel {
        margin: 0.4em 0 1em 0;
        padding: 1em;
        border-radius: 12px;
        background: rgba(15, 23, 42, 0.65);
        border: 1px solid rgba(80, 120, 180, 0.25);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.6em;
      }

      .qr-panel canvas {
        border-radius: 8px;
        background: #e2e8f0;
        max-width: 100%;
        height: auto;
      }

      .qr-panel-url {
        font-family:
          ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
          'Liberation Mono', 'Courier New', monospace;
        color: #94a3b8;
        font-size: 0.75em;
        word-break: break-all;
        text-align: center;
        max-width: 280px;
      }

      .status-banner {
        display: flex;
        align-items: center;
        gap: 0.75em;
        padding: 0.7em 0.95em;
        border-radius: 12px;
        background: rgba(15, 23, 42, 0.65);
        border: 1px solid rgba(56, 189, 248, 0.28);
        color: #cbd5f5;
        font-size: 0.92em;
        margin-bottom: 0.8em;
      }

      .status-banner[data-phase='saved'] {
        border-color: rgba(74, 222, 128, 0.45);
        background: rgba(15, 42, 26, 0.55);
      }

      .status-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border-radius: 999px;
        border: 1px solid rgba(56, 189, 248, 0.35);
        background: rgba(56, 189, 248, 0.12);
        color: #38bdf8;
        flex: 0 0 auto;
      }

      .status-icon.spin {
        animation: spin 1.4s linear infinite;
      }

      .status-icon.ok {
        border-color: rgba(74, 222, 128, 0.5);
        background: rgba(74, 222, 128, 0.15);
        color: #4ade80;
      }

      .status-icon custom-icon {
        --custom-icon-size: 16px;
        --custom-icon-color: currentColor;
      }

      .status-meta {
        display: flex;
        flex-direction: column;
        gap: 0.1em;
        min-width: 0;
        flex: 1;
      }

      .status-title {
        font-weight: 600;
        color: #e2e8f0;
      }

      .status-detail {
        font-size: 0.85em;
        color: #94a3b8;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .status-bar {
        flex: 1 1 140px;
        max-width: 220px;
        height: 6px;
        background: rgba(30, 41, 59, 0.55);
        border-radius: 999px;
        overflow: hidden;
        border: 1px solid rgba(80, 120, 180, 0.2);
      }

      .status-bar span {
        display: block;
        height: 100%;
        background: linear-gradient(90deg, #38bdf8 0%, #2563eb 100%);
        transition: width 0.2s ease;
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

      .shared-file-meta {
        display: flex;
        align-items: center;
        gap: 0.5em;
        flex-wrap: wrap;
      }

      .size-pill {
        display: inline-flex;
        align-items: center;
        padding: 0.22em 0.58em;
        border-radius: 999px;
        background: rgba(14, 165, 233, 0.13);
        border: 1px solid rgba(125, 211, 252, 0.3);
        color: #bae6fd;
        font-size: 0.75em;
        font-weight: 600;
      }

      .hash-pill {
        display: inline-flex;
        align-items: center;
        padding: 0.2em 0.58em;
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.8);
        border: 1px solid rgba(80, 120, 180, 0.25);
        color: #94a3b8;
        font-size: 0.73em;
        font-family:
          ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
          'Liberation Mono', 'Courier New', monospace;
      }

      .disk-toolbar {
        display: grid;
        grid-template-columns: 1.7fr auto auto auto;
        gap: 0.6em;
        align-items: center;
        margin: 0.3em 0 0.9em 0;
      }

      .disk-search,
      .disk-select {
        height: 36px;
        border-radius: 10px;
        border: 1px solid rgba(80, 120, 180, 0.3);
        background: rgba(15, 23, 42, 0.72);
        color: #dbeafe;
        font-size: 0.85em;
        padding: 0 0.75em;
        outline: none;
      }

      .disk-search:focus,
      .disk-select:focus {
        border-color: rgba(125, 211, 252, 0.7);
        box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.22);
      }

      .disk-summary {
        margin-bottom: 0.85em;
        color: #94a3b8;
        font-size: 0.82em;
        text-align: left;
      }

      .disk-actions {
        margin-left: auto;
        display: inline-flex;
        gap: 0.5em;
        flex-wrap: wrap;
        align-items: center;
      }

      .download-btn {
        background: linear-gradient(120deg, #0ea5e9 0%, #2563eb 100%);
        color: #f8fafc;
        border: 1px solid rgba(148, 197, 255, 0.42);
        padding: 0.5em 0.84em;
        border-radius: 10px;
        text-decoration: none;
        font-weight: 700;
        letter-spacing: 0.02em;
        white-space: nowrap;
        transition:
          transform 0.16s ease,
          box-shadow 0.18s ease,
          filter 0.18s ease;
        font-size: 0.83em;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 34px;
      }

      .download-btn:hover {
        box-shadow: 0 10px 20px rgba(14, 165, 233, 0.3);
        transform: translateY(-1px);
        filter: brightness(1.06);
      }

      .download-btn[disabled] {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }

      .share-btn {
        background: rgba(15, 23, 42, 0.72);
        color: #dbeafe;
        border: 1px solid rgba(125, 160, 212, 0.36);
        border-radius: 10px;
        padding: 0.45em 0.68em;
        text-decoration: none;
        font-weight: 600;
        white-space: nowrap;
        transition:
          transform 0.16s ease,
          border-color 0.16s ease,
          color 0.16s ease,
          background 0.16s ease;
        font-size: 0.8em;
        display: inline-flex;
        align-items: center;
        gap: 0.4em;
        cursor: pointer;
        min-height: 34px;
      }

      .share-btn:hover {
        transform: translateY(-1px);
        border-color: rgba(125, 211, 252, 0.6);
        color: #7dd3fc;
        background: rgba(15, 23, 42, 0.9);
      }

      .shared-remove {
        background: rgba(15, 23, 42, 0.6);
        color: #f87171;
        border: 1px solid rgba(248, 113, 113, 0.5);
        border-radius: 10px;
        padding: 0.45em 0.7em;
        text-decoration: none;
        font-weight: 600;
        white-space: nowrap;
        transition:
          transform 0.16s ease,
          border-color 0.16s ease,
          color 0.16s ease,
          background 0.16s ease;
        font-size: 0.8em;
        display: inline-flex;
        align-items: center;
        gap: 0.4em;
        cursor: pointer;
        min-height: 34px;
      }

      .shared-remove:hover {
        transform: translateY(-1px);
        border-color: rgba(248, 113, 113, 0.7);
        color: #fee2e2;
        background: rgba(127, 29, 29, 0.18);
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
        .files-header {
          flex-wrap: wrap;
          gap: 10px;
        }

        .disk-toolbar {
          grid-template-columns: 1fr;
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
          gap: 12px;
          padding: 1.25em;
        }

        .shared-file-name {
          width: 100%;
          font-size: 1.15em;
          margin-bottom: 2px;
        }

        .shared-file-peer {
          display: block;
          margin-bottom: 12px;
          font-size: 0.9em;
        }

        .shared-file-item button,
        .shared-file-item a.download-btn {
          width: 100%;
          justify-content: center;
          padding: 12px 0;
          font-size: 1.1em;
        }
      }

      @media (min-width: 900px) {
        .content-wrapper {
          max-width: 1400px;
        }

        .content-grid {
          flex-direction: row;
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
    // Defer share/download fetching until peernet is started; just remember it.
    const pendingShareHash = shareHash || ''
    const pendingShareEntries: Array<{ hash: string; name?: string }> = []
    if (downloadHash) {
      pendingShareEntries.push({ hash: downloadHash, name: downloadName })
    }
    this.recipientMode = Boolean(shareHash || downloadHash)
    if (this.recipientMode) this.connectionPhase = 'connecting'
    if (!this.recipientMode) this.#attachGlobalDropHandlers()
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
        if (peer !== peernet.peerId) {
          this.addLog(`Peer connected: ${peer}`)
          if (
            this.recipientMode &&
            (this.connectionPhase === 'connecting' ||
              this.connectionPhase === 'searching')
          ) {
            this.connectionPhase = 'peer'
          }
        }
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
      if (this.recipientMode && this.connectionPhase === 'connecting') {
        this.connectionPhase = 'searching'
      }

      // peernet is ready — dismiss loading immediately
      updateStatus('connected')
      setTimeout(() => {
        if (loadingScreen) loadingScreen.shown = false
      }, 500)

      this.addLog(`Peernet started. Your ID: ${peernet.peerId}`)

      // Now that peernet is ready, resolve any incoming share/download links.
      if (pendingShareHash) {
        this.#resolveShareLink(pendingShareHash).catch((err) => {
          this.addLog(`Failed to resolve share link: ${err}`)
          console.error(err)
        })
      }
      for (const entry of pendingShareEntries) {
        // Surface the file in the list right away so user sees what is incoming.
        this.sharedFiles = [
          ...this.sharedFiles,
          {
            name: entry.name || entry.hash.slice(0, 12),
            hash: entry.hash,
            peerId: '',
            type: 'file'
          }
        ]
      }
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
          if (data) {
            await globalThis.shareStore.put(hash, data)
          }
        } catch {
          this.addLog(`Failed to fetch ${hash.slice(0, 12)} from network`)
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
    const savedName = this.#readyFilename
    this.#readyBlob = undefined
    this.#readyFilename = undefined
    this.downloadReady = false
    this.downloadConfirmPending = null
    this.#pendingDownload = undefined
    if (this.recipientMode) {
      this.savedFilename = savedName
      this.connectionPhase = 'saved'
      setTimeout(() => {
        if (this.connectionPhase === 'saved') {
          this.connectionPhase = 'idle'
          this.savedFilename = ''
        }
      }, 5000)
    }
  }

  #autoSavePending = false
  #autoSaveListener?: () => void
  #scheduleAutoSave() {
    if (!this.recipientMode) return
    if (!this.#readyBlob || !this.#readyFilename) return
    const tryNow = () => {
      if (document.visibilityState === 'visible' && document.hasFocus()) {
        if (this.#autoSaveListener) {
          document.removeEventListener(
            'visibilitychange',
            this.#autoSaveListener
          )
          window.removeEventListener('focus', this.#autoSaveListener)
          this.#autoSaveListener = undefined
        }
        this.#autoSavePending = false
        this.#saveToFilesystem()
        return true
      }
      return false
    }
    if (tryNow()) return
    if (this.#autoSavePending) return
    this.#autoSavePending = true
    const listener = () => {
      if (!this.downloadReady) {
        this.#autoSavePending = false
        document.removeEventListener('visibilitychange', listener)
        window.removeEventListener('focus', listener)
        this.#autoSaveListener = undefined
        return
      }
      tryNow()
    }
    this.#autoSaveListener = listener
    document.addEventListener('visibilitychange', listener)
    window.addEventListener('focus', listener)
  }

  async #downloadSharedFile(hash: string, name?: string) {
    // Prevent duplicate downloads for the same hash
    if (this.isDownloading && this.downloadHash === hash) {
      this.addLog(`Download already in progress for hash: ${hash}`)
      return
    }
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

    // Immediate visible feedback so the user knows the click registered.
    this.addLog(`Download requested: ${name || hash.slice(0, 12)}…`)
    if (this.recipientMode) this.connectionPhase = 'fetching'
    this.isDownloading = true
    this.downloadHash = hash
    this.downloadName = name || hash.slice(0, 12)
    this.downloadStage = 'Preparing'
    this.downloadBytesDone = 0
    this.downloadBytesTotal = 0
    this.downloadChunkTotal = 0
    this.downloadChunkDone = 0
    this.requestRender()

    try {
      await globalThis.shareStore.get(hash)
    } catch (error: any) {
      if (error?.message?.includes?.('not found')) {
        // expected when the hash is not in the local store
      } else {
        console.warn('shareStore.get pre-check failed:', error)
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
        resetDownload()
        return
      }
      try {
        await globalThis.shareStore.put(hash, encoded)
      } catch {
        // local cache write failure is non-fatal
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
        if (this.recipientMode) this.connectionPhase = 'downloading'

        for (const link of ordered) {
          const chunkEncoded = await this.#getFromShareStore(link.hash)
          if (!chunkEncoded) {
            this.addLog(`Missing chunk for ${filename}: ${link.hash}`)
            this.downloadError = `Missing chunk for ${filename}: ${link.hash}`
            this.isDownloading = false
            this.downloadStage = 'Error'
            this.requestRender()
            resetDownload()
            return
          }
          console.log('Got chunk', link.hash, chunkEncoded)
          const chunkProto = new peernet.protos['peernet-file'](chunkEncoded)
          if (!chunkProto.decoded.content) {
            this.addLog(`Invalid chunk content for ${filename}`)
            this.downloadError = `Invalid chunk content for ${filename}`
            this.isDownloading = false
            this.downloadStage = 'Error'
            this.requestRender()
            resetDownload()
            return
          }
          parts.push(chunkProto.decoded.content)
          this.downloadBytesDone = Math.min(
            this.downloadBytesTotal,
            this.downloadBytesDone + chunkProto.decoded.content.length
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
          await new Promise((resolve) =>
            requestAnimationFrame(() => resolve(true))
          )
        }
      } else if (content) {
        parts.push(content)
        this.downloadBytesTotal = content.length
        this.downloadBytesDone = content.length
        this.downloadChunkTotal = 1
        this.downloadChunkDone = 1
        this.downloadStage = 'Downloading'
        if (this.recipientMode) this.connectionPhase = 'downloading'
        this.downloadRateBytes = this.downloadBytesTotal
        this.downloadEtaSeconds = 0
        this.requestRender()
      } else {
        this.addLog(`No content available for download: ${filename}`)
        return
      }

      this.downloadStage = 'Ready'
      this.requestRender()
      // Fix: ensure all parts are ArrayBuffer for Blob
      this.#readyBlob = new Blob(
        parts.map((p) => {
          if (p instanceof Uint8Array) {
            return toArrayBuffer(p)
          }
          return p
        })
      )
      this.#readyFilename = filename
      this.isDownloading = false
      this.downloadReady = true
      this.addLog(`File ready to save: ${filename}`)
      this.requestRender()
      this.#scheduleAutoSave()
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
    // Always copy to a new ArrayBuffer to avoid SharedArrayBuffer issues
    function toSafeUint8Array(u8: Uint8Array): Uint8Array {
      if (
        u8.buffer instanceof ArrayBuffer &&
        (!__SAB || !(u8.buffer instanceof __SAB))
      ) {
        return u8
      }
      // Copy to new ArrayBuffer if needed
      return new Uint8Array(Array.from(u8))
    }
    const aSafe = toSafeUint8Array(a)
    const bSafe = toSafeUint8Array(b)
    const abuf = new ArrayBuffer(aSafe.length + bSafe.length)
    const output = new Uint8Array(abuf)
    output.set(aSafe, 0)
    output.set(bSafe, aSafe.length)
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
        await new Promise((resolve) =>
          requestAnimationFrame(() => resolve(true))
        )
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
        // Ensure value is Uint8Array<ArrayBuffer>
        // Always use safe Uint8Array (ArrayBuffer, not SharedArrayBuffer)
        let safeValue: Uint8Array
        if (
          value.buffer instanceof ArrayBuffer &&
          (!__SAB || !(value.buffer instanceof __SAB))
        ) {
          safeValue = value
        } else {
          safeValue = new Uint8Array(Array.from(value))
        }
        pending = pending.length
          ? this.#concatUint8(pending, safeValue)
          : safeValue
        this.#updateProcessingProgress(item, safeValue.length)
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
        await new Promise((resolve) =>
          requestAnimationFrame(() => resolve(true))
        )
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
      // Only remove file if explicitly requested (user action)
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

    // Only update sharedFiles if not already present (prevents removal after download)
    if (!this.sharedFiles || !this.sharedFiles.length) {
      this.sharedFiles = newSharedFiles
    } else {
      // Only add new files that are not already in sharedFiles
      for (const file of newSharedFiles) {
        if (
          !this.sharedFiles.some(
            (f) => f.hash === file.hash && f.name === file.name
          )
        ) {
          this.sharedFiles.push(file)
        }
      }
    }
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
    // Build a peernet-file manifest listing all shared file hashes and store
    // it in the share store. The manifest's content-hash IS the share hash,
    // so peers can fetch it via `peernet.get(shareHash, 'share')`.
    const entries = this.sharedFiles.filter(
      (file) => file.hash && hashes.includes(file.hash)
    )
    const links = entries.map((entry) => ({
      hash: entry.hash,
      path: entry.name,
      size: 0
    }))
    const manifest = new peernet.protos['peernet-file']({
      path: 'share-manifest',
      links
    })
    await manifest.encode()
    const hash = await manifest.hash()
    try {
      await globalThis.shareStore.put(hash, manifest.encoded)
    } catch (e) {
      this.addLog(`Warning: could not store share manifest: ${e}`)
    }
    return hash
  }

  async #resolveShareLink(shareHash: string): Promise<void> {
    this.addLog(`Resolving share ${shareHash.slice(0, 12)}…`)
    if (this.recipientMode) this.connectionPhase = 'fetching'
    let encoded: Uint8Array | undefined
    try {
      encoded = await peernet.get(shareHash, 'share')
    } catch (err) {
      this.addLog(`Could not fetch share manifest: ${err}`)
      return
    }
    if (!encoded) {
      this.addLog(`Share manifest not found for ${shareHash.slice(0, 12)}…`)
      return
    }
    try {
      await globalThis.shareStore.put(shareHash, encoded)
    } catch {
      // ignore local-store write errors
    }
    let manifest: PeernetFile
    try {
      manifest = new peernet.protos['peernet-file'](encoded) as PeernetFile
    } catch (err) {
      this.addLog(`Invalid share manifest: ${err}`)
      return
    }
    const links = (manifest.decoded as any)?.links
    if (!Array.isArray(links) || !links.length) {
      this.addLog('Share manifest contained no files.')
      return
    }
    const incoming = links.map(
      (link: { hash: string; path?: string; size?: number }) => ({
        name: link.path || link.hash.slice(0, 12),
        hash: link.hash,
        peerId: '',
        type: 'file' as const
      })
    )
    const existingHashes = new Set(this.sharedFiles.map((f) => f.hash))
    const merged = [...this.sharedFiles]
    for (const item of incoming) {
      if (!existingHashes.has(item.hash)) merged.push(item)
    }
    this.sharedFiles = merged
    this.shareHash = shareHash
    this.addLog(`Share resolved: ${incoming.length} file(s) available.`)
  }

  async #refreshDiskFiles(): Promise<void> {
    if (!globalThis.shareStore?.entries) return
    this.diskLoading = true
    this.requestRender()
    try {
      const entries: [string, Uint8Array][] =
        await globalThis.shareStore.entries()
      // Build set of chunk hashes referenced by manifests so we can hide them.
      const chunkHashes = new Set<string>()
      const decoded: Array<{
        hash: string
        path: string
        size: number
        isManifest: boolean
        isChunk: boolean
      }> = []
      for (const [hash, encoded] of entries) {
        try {
          const proto = new peernet.protos['peernet-file'](
            encoded
          ) as PeernetFile
          const data = proto.decoded as {
            path?: string
            content?: Uint8Array
            links?: { hash: string; size?: number }[]
          }
          const path = data.path || ''
          const isChunk = /\.part-\d+$/.test(path)
          const isManifest = Array.isArray(data.links) && data.links.length > 0
          if (isManifest) {
            for (const link of data.links!) chunkHashes.add(link.hash)
          }
          const size = isManifest
            ? (data.links || []).reduce((s, l) => s + (l.size ?? 0), 0)
            : (data.content?.length ?? 0)
          decoded.push({ hash, path, size, isManifest, isChunk })
        } catch {
          // not a peernet-file we can decode; skip from explorer
        }
      }
      this.diskFiles = decoded
        .filter((d) => !d.isChunk && !chunkHashes.has(d.hash) && d.path)
        .map((d) => ({ hash: d.hash, name: d.path, size: d.size }))
        .sort((a, b) => a.name.localeCompare(b.name))
    } catch (err) {
      this.addLog(`Could not read local store: ${err}`)
    } finally {
      this.diskLoading = false
      this.requestRender()
    }
  }

  #toggleDiskExplorer = async () => {
    this.diskExpanded = !this.diskExpanded
    if (this.diskExpanded) await this.#refreshDiskFiles()
  }

  #copyDiskHash = async (hash: string) => {
    try {
      await navigator.clipboard.writeText(hash)
      this.addLog(`Copied hash: ${hash.slice(0, 12)}…`)
    } catch (error) {
      this.addLog(`Failed to copy hash: ${error}`)
    }
  }

  #publishDiskFile = async (file: { hash: string; name: string }) => {
    if (this.sharedFiles.some((entry) => entry.hash === file.hash)) {
      this.addLog(`${file.name} is already in the shared list.`)
      return
    }
    this.sharedFiles = [
      ...this.sharedFiles,
      {
        name: file.name,
        hash: file.hash,
        peerId: this.peerId,
        type: 'file'
      }
    ]
    await this.#refreshShareHash()
    this.addLog(`Added ${file.name} to shared list.`)
  }

  #getFilteredDiskFiles() {
    const query = this.diskQuery.trim().toLowerCase()
    const filtered = query
      ? this.diskFiles.filter((file) =>
          `${file.name} ${file.hash}`.toLowerCase().includes(query)
        )
      : [...this.diskFiles]

    filtered.sort((a, b) => {
      if (this.diskSort === 'name-asc') return a.name.localeCompare(b.name)
      if (this.diskSort === 'name-desc') return b.name.localeCompare(a.name)
      if (this.diskSort === 'size-asc') return a.size - b.size
      return b.size - a.size
    })

    return filtered
  }

  #renderDiskExplorer() {
    const filtered = this.#getFilteredDiskFiles()
    const totalSize = filtered.reduce((sum, file) => sum + (file.size || 0), 0)
    return html`
      <div class="files-card disk-card">
        <div class="files-header">
          <h3 class="section-title">On disk</h3>
          <div class="files-actions">
            ${this.diskExpanded
              ? html`
                  <button
                    class="share-cta"
                    @click=${() => this.#refreshDiskFiles()}
                    ?disabled=${this.diskLoading}
                    title="Reload local store"
                  >
                    ${this.diskLoading ? 'Loading…' : 'Refresh'}
                  </button>
                `
              : ''}
            <button
              class="share-cta"
              @click=${this.#toggleDiskExplorer}
              title="Browse files cached locally by peernet"
            >
              ${this.diskExpanded ? 'Hide' : 'Browse local store'}
            </button>
          </div>
        </div>
        ${this.diskExpanded
          ? html`
              <div class="disk-toolbar">
                <input
                  class="disk-search"
                  type="search"
                  placeholder="Search name or hash"
                  .value=${this.diskQuery}
                  @input=${(event: Event) => {
                    const target = event.target as HTMLInputElement
                    this.diskQuery = target.value
                  }}
                />
                <select
                  class="disk-select"
                  .value=${this.diskSort}
                  @change=${(event: Event) => {
                    const target = event.target as HTMLSelectElement
                    this.diskSort = target.value as
                      | 'name-asc'
                      | 'name-desc'
                      | 'size-desc'
                      | 'size-asc'
                  }}
                >
                  <option value="name-asc">Name A-Z</option>
                  <option value="name-desc">Name Z-A</option>
                  <option value="size-desc">Largest first</option>
                  <option value="size-asc">Smallest first</option>
                </select>
                <button
                  class="share-btn"
                  @click=${() => {
                    this.diskQuery = ''
                    this.diskSort = 'name-asc'
                  }}
                  title="Reset filters"
                >
                  Reset
                </button>
                <button
                  class="share-btn"
                  @click=${() => this.#refreshDiskFiles()}
                  ?disabled=${this.diskLoading}
                  title="Reload local store"
                >
                  ${this.diskLoading ? 'Loading…' : 'Refresh'}
                </button>
              </div>
              <div class="disk-summary">
                ${filtered.length} item(s)
                ${filtered.length
                  ? html` • ${this.formatFileSize(totalSize)}`
                  : ''}
              </div>
              <div class="shared-files-list">
                ${this.diskLoading
                  ? html`<div class="empty-state">Reading local store…</div>`
                  : filtered.length === 0
                    ? html`<div class="empty-state">Nothing cached yet.</div>`
                    : filtered.map(
                        (file) => html`
                          <div class="shared-file-item">
                            <div class="shared-file-name">
                              <custom-icon icon="download"></custom-icon>
                              ${file.name}
                            </div>
                            <div class="shared-file-meta">
                              ${file.size
                                ? html`<span class="size-pill"
                                    >${this.formatFileSize(file.size)}</span
                                  >`
                                : html`<span class="size-pill">0 B</span>`}
                              <span class="hash-pill"
                                >${file.hash.slice(0, 12)}…${file.hash.slice(
                                  -6
                                )}</span
                              >
                            </div>
                            <div class="disk-actions">
                              <button
                                class="share-btn"
                                @click=${() => this.#copyDiskHash(file.hash)}
                                title="Copy file hash"
                              >
                                Copy hash
                              </button>
                              <button
                                class="share-btn"
                                ?disabled=${this.sharedFiles.some(
                                  (entry) => entry.hash === file.hash
                                )}
                                @click=${() => this.#publishDiskFile(file)}
                                title="Add this file to your shared list"
                              >
                                ${this.sharedFiles.some(
                                  (entry) => entry.hash === file.hash
                                )
                                  ? 'Shared'
                                  : 'Add to shared'}
                              </button>
                              <button
                                class="download-btn"
                                ?disabled=${this.isDownloading &&
                                this.downloadHash === file.hash}
                                @click=${() =>
                                  this.#downloadSharedFile(
                                    file.hash,
                                    file.name
                                  )}
                              >
                                Download
                              </button>
                            </div>
                          </div>
                        `
                      )}
              </div>
            `
          : ''}
      </div>
    `
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

  #shareAllUrl(): string {
    return `${location.origin}${location.pathname}?share=${this.shareHash}`
  }

  #fileShareUrl(hash: string, name: string): string {
    const params = new URLSearchParams()
    params.set('download', hash)
    params.set('name', name)
    return `${location.origin}${location.pathname}?${params.toString()}`
  }

  #toggleQrPanel = (key: string) => {
    this.qrPanelKey = this.qrPanelKey === key ? '' : key
    if (this.qrPanelKey === key) {
      // Render after DOM updates so canvas exists.
      requestAnimationFrame(() => this.#renderQrCanvas(key))
    }
  }

  #renderQrCanvas(key: string) {
    const canvas = this.shadowRoot?.querySelector(
      `canvas[data-qr="${key}"]`
    ) as HTMLCanvasElement | null
    if (!canvas) return
    let url = ''
    if (key === 'all') url = this.#shareAllUrl()
    else if (key.startsWith('file:')) {
      const rest = key.slice(5)
      const sep = rest.indexOf('|')
      const hash = sep === -1 ? rest : rest.slice(0, sep)
      const name = sep === -1 ? '' : rest.slice(sep + 1)
      url = this.#fileShareUrl(hash, name)
    }
    if (!url) return
    QRCodeLib.toCanvas(canvas, url, {
      width: 224,
      margin: 1,
      color: { dark: '#0f172a', light: '#e2e8f0' }
    }).catch((err: any) => {
      this.addLog(`Failed to render QR: ${err}`)
    })
  }

  #renderQrPanel(key: string, url: string) {
    return html`
      <div class="qr-panel">
        <canvas data-qr=${key} width="224" height="224"></canvas>
        <div class="qr-panel-url">${url}</div>
      </div>
    `
  }

  #renderRecipientStatusBanner() {
    const phase = this.connectionPhase
    const targetName =
      this.downloadName ||
      this.downloadConfirmPending?.name ||
      this.#readyFilename ||
      ''
    type BannerSpec = {
      title: string
      detail: any
      iconName: string
      iconClass: string
      showBar?: boolean
      barPercent?: number
      saveButton?: boolean
    }
    let spec: BannerSpec | null = null
    if (phase === 'connecting') {
      spec = {
        title: 'Connecting',
        detail: 'Starting peernet…',
        iconName: 'upload',
        iconClass: 'spin'
      }
    } else if (phase === 'searching') {
      spec = {
        title: 'Searching peers',
        detail: 'Looking for someone to share with you…',
        iconName: 'upload',
        iconClass: 'spin'
      }
    } else if (phase === 'peer') {
      spec = {
        title: 'Found peer',
        detail: 'Requesting file information…',
        iconName: 'download',
        iconClass: 'spin'
      }
    } else if (phase === 'fetching') {
      spec = {
        title: 'Fetching manifest',
        detail: targetName || 'Resolving share link…',
        iconName: 'download',
        iconClass: 'spin'
      }
    } else if (phase === 'downloading' || this.isDownloading) {
      const percent = this.downloadBytesTotal
        ? Math.round((this.downloadBytesDone / this.downloadBytesTotal) * 100)
        : 0
      const detailParts: any[] = [targetName || 'Downloading…']
      if (this.downloadChunkTotal)
        detailParts.push(
          ` • Chunks ${this.downloadChunkDone}/${this.downloadChunkTotal}`
        )
      if (this.downloadRateBytes)
        detailParts.push(` • ${this.formatFileSize(this.downloadRateBytes)}/s`)
      if (this.downloadEtaSeconds && this.downloadBytesTotal)
        detailParts.push(
          ` • ETA ${this.#formatDuration(this.downloadEtaSeconds)}`
        )
      spec = {
        title: `Downloading${this.downloadBytesTotal ? ` • ${percent}%` : ''}`,
        detail: detailParts,
        iconName: 'download',
        iconClass: 'spin',
        showBar: true,
        barPercent: percent
      }
    } else if (this.downloadReady) {
      spec = {
        title: 'Ready to save',
        detail: this.#readyFilename || '',
        iconName: 'download',
        iconClass: '',
        saveButton: true
      }
    } else if (phase === 'saved') {
      spec = {
        title: 'Saved',
        detail: this.savedFilename || '',
        iconName: 'check',
        iconClass: 'ok'
      }
    }
    if (!spec) return ''
    return html`
      <div class="status-banner" data-phase=${phase}>
        <span class="status-icon ${spec.iconClass}">
          <custom-icon icon=${spec.iconName}></custom-icon>
        </span>
        <div class="status-meta">
          <div class="status-title">${spec.title}</div>
          <div class="status-detail">${spec.detail}</div>
        </div>
        ${spec.showBar
          ? html`<div class="status-bar">
              <span style="width:${spec.barPercent ?? 0}%"></span>
            </div>`
          : ''}
        ${spec.saveButton
          ? html`<button
              class="share-btn"
              style="margin-left:auto;white-space:nowrap"
              @click=${this.#saveToFilesystem}
            >
              Save to disk
            </button>`
          : ''}
      </div>
    `
  }

  render() {
    return html`
      <info-header .peerId=${this.peerId}></info-header>
      <div class="main-content">
        <div class="content-wrapper">
          ${this.showHint && !this.recipientMode
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
              <div class="files-card">
                <div class="files-header">
                  <h3 class="section-title">
                    ${this.recipientMode ? 'Available to download' : 'Files'}
                  </h3>
                  ${this.recipientMode
                    ? ''
                    : html`
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
                      `}
                </div>
                ${this.shareHash && !this.recipientMode
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
                        <button
                          class="share-hash-share"
                          @click=${() => this.#toggleQrPanel('all')}
                          title="Show QR code for the share link"
                        >
                          ${this.qrPanelKey === 'all' ? 'Hide QR' : 'Show QR'}
                        </button>
                      </div>
                      ${this.qrPanelKey === 'all'
                        ? this.#renderQrPanel('all', this.#shareAllUrl())
                        : ''}
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
                ${this.recipientMode
                  ? this.#renderRecipientStatusBanner()
                  : html`
                      ${this.downloadConfirmPending &&
                      !this.isDownloading &&
                      !this.downloadReady
                        ? html`
                            <div
                              class="processing-banner"
                              style="cursor:default"
                            >
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
                                        >
                                        Please be patient`}
                                </div>
                              </div>
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
                                          >${this.downloadHash.slice(
                                            0,
                                            16
                                          )}…</code
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
                        : this.downloadReady
                          ? html`
                              <div
                                class="processing-banner"
                                style="cursor:default"
                              >
                                <span class="processing-icon">
                                  <custom-icon icon="download"></custom-icon>
                                </span>
                                <div class="processing-meta">
                                  <div class="processing-title">
                                    Ready to save
                                  </div>
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
                    `}
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
                              ${this.sharedFiles
                                .filter((file) => file.type !== 'folder')
                                .map((file) => {
                                  const isOwn = file.peerId === this.peerId
                                  return html`
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
                                        ${isOwn
                                          ? '(You)'
                                          : file.peerId
                                            ? file.peerId.slice(0, 8) + '...'
                                            : 'remote'}
                                      </div>
                                      ${isOwn
                                        ? html`
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
                                              <custom-icon
                                                icon="share"
                                              ></custom-icon>
                                              Share
                                            </button>
                                            <button
                                              class="share-btn"
                                              @click=${() =>
                                                this.#toggleQrPanel(
                                                  `file:${file.hash}|${file.name}`
                                                )}
                                              title="Show QR code for this file"
                                            >
                                              ${this.qrPanelKey ===
                                              `file:${file.hash}|${file.name}`
                                                ? 'Hide QR'
                                                : 'QR'}
                                            </button>
                                          `
                                        : ''}
                                      <button
                                        class="download-btn"
                                        ?disabled=${this.isDownloading &&
                                        this.downloadHash === file.hash}
                                        @click=${() =>
                                          this.#downloadSharedFile(
                                            file.hash,
                                            file.name
                                          )}
                                      >
                                        Download
                                      </button>
                                    </div>
                                    ${isOwn &&
                                    this.qrPanelKey ===
                                      `file:${file.hash}|${file.name}`
                                      ? this.#renderQrPanel(
                                          `file:${file.hash}|${file.name}`,
                                          this.#fileShareUrl(
                                            file.hash,
                                            file.name
                                          )
                                        )
                                      : ''}
                                  `
                                })}
                            `
                          : ''}
                      `}
                </div>
              </div>
              ${this.recipientMode ? '' : this.#renderDiskExplorer()}
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

      ${this.recipientMode
        ? ''
        : html`
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
          `}
      ${icons}
    `
  }
}
customElements.define('app-shell', AppShell)
