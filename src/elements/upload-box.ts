import { LiteElement, property, html, css } from '@vandeurenglenn/lite'
import '@vandeurenglenn/lite-elements/icon'

export class UploadBox extends LiteElement {
  @property({ type: Boolean, reflect: true }) accessor active: boolean = false

  #dragCounter = 0
  #fileInput?: HTMLInputElement
  #folderInput?: HTMLInputElement

  static styles = [
    css`
      :host {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 140px;
        background: linear-gradient(
          135deg,
          rgba(30, 41, 59, 0.4) 0%,
          rgba(15, 23, 42, 0.6) 100%
        );
        border: 2px dashed rgba(56, 189, 248, 0.5);
        border-radius: 16px;
        padding: 32px;
        text-align: center;
        color: #94a3b8;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        cursor: pointer;
        box-sizing: border-box;
        position: relative;
        overflow: hidden;
      }

      :host::before {
        content: '';
        position: absolute;
        inset: 0;
        background: radial-gradient(
          circle at center,
          rgba(56, 189, 248, 0.1) 0%,
          transparent 70%
        );
        opacity: 0;
        transition: opacity 0.3s ease;
        pointer-events: none;
      }

      :host(:hover) {
        border-color: #38bdf8;
        background: linear-gradient(
          135deg,
          rgba(30, 41, 59, 0.6) 0%,
          rgba(15, 23, 42, 0.8) 100%
        );
        box-shadow: 0 0 20px rgba(56, 189, 248, 0.15);
      }

      :host(:hover)::before {
        opacity: 1;
      }

      :host([active]) {
        background: linear-gradient(
          135deg,
          rgba(30, 41, 59, 0.8) 0%,
          rgba(15, 23, 42, 0.95) 100%
        );
        border-color: #38bdf8;
        color: #60a5fa;
        box-shadow:
          0 0 30px rgba(56, 189, 248, 0.3),
          inset 0 0 20px rgba(56, 189, 248, 0.1);
        transform: scale(1.01);
      }

      :host([active])::before {
        opacity: 1;
      }

      custom-icon.upload-icon {
        --custom-icon-size: 48px;
        --custom-icon-color: #64748b;
        margin-bottom: 16px;
        transition:
          transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
          color 0.3s ease;
        opacity: 0.8;
      }

      :host(:hover) custom-icon.upload-icon {
        transform: scale(1.1);
        opacity: 1;
        color: #38bdf8;
      }

      :host([active]) .upload-icon {
        transform: scale(1.15);
        opacity: 1;
        animation: pulse 0.6s ease-in-out;
        color: #38bdf8;
      }

      @keyframes pulse {
        0%,
        100% {
          transform: scale(1.15);
        }
        50% {
          transform: scale(1.25);
        }
      }

      .upload-text {
        font-size: 1.15em;
        font-weight: 500;
        letter-spacing: 0.3px;
        transition: color 0.3s ease;
      }

      :host([active]) .upload-text {
        color: #38bdf8;
        font-weight: 600;
      }

      input[type='file'] {
        display: none;
      }

      .fab-row {
        display: flex;
        align-items: center;
        gap: 0.75em;
        margin-top: 0.9em;
      }

      .fab-button {
        width: 44px;
        height: 44px;
        border-radius: 999px;
        border: 1.5px solid rgba(56, 189, 248, 0.55);
        background: linear-gradient(135deg, #38bdf8 0%, #2563eb 100%);
        color: #fff;
        font-size: 1.6em;
        line-height: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow:
          0 6px 18px rgba(56, 189, 248, 0.35),
          inset 0 0 12px rgba(255, 255, 255, 0.12);
        transition:
          transform 0.2s ease,
          box-shadow 0.2s ease;
      }

      .fab-button:hover {
        transform: translateY(-1px) scale(1.03);
        box-shadow:
          0 10px 22px rgba(56, 189, 248, 0.45),
          inset 0 0 14px rgba(255, 255, 255, 0.18);
      }

      .fab-hint {
        font-size: 0.9em;
        color: #94a3b8;
      }

      .folder-link {
        background: none;
        border: none;
        color: #38bdf8;
        font-weight: 600;
        cursor: pointer;
        padding: 0;
        margin-left: 0.4em;
      }

      .folder-link:hover {
        text-decoration: underline;
      }
    `
  ]

  firstRender(): void {
    this.addEventListener('dragenter', this.#handleDragEnter)
    this.addEventListener('dragover', this.#handleDragOver)
    this.addEventListener('dragleave', this.#handleDragLeave)
    this.addEventListener('drop', this.#handleDrop)
    this.addEventListener('click', this.#handleClick)
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()

    this.removeEventListener('dragenter', this.#handleDragEnter)
    this.removeEventListener('dragover', this.#handleDragOver)
    this.removeEventListener('dragleave', this.#handleDragLeave)
    this.removeEventListener('drop', this.#handleDrop)
    this.removeEventListener('click', this.#handleClick)
  }

  #handleDragEnter = (e: DragEvent) => {
    e.preventDefault()
    this.#dragCounter += 1
    this.active = true
  }

  #handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy'
    }
    this.active = true
  }

  #handleDragLeave = () => {
    this.#dragCounter = Math.max(0, this.#dragCounter - 1)
    if (this.#dragCounter === 0) {
      this.active = false
    }
  }

  #handleDrop = async (e: DragEvent) => {
    e.preventDefault()
    this.active = false
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
      this.#emitFilesSelected(files)
    }
  }

  #handleClick = async (event?: MouseEvent) => {
    if (event?.target && (event.target as HTMLElement).closest('button')) {
      return
    }
    await this.#openFilePicker()
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
          this.#emitFilesSelected(files)
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
          this.#emitFilesSelected(files)
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
          this.#emitFilesSelected(files)
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
          this.#emitFilesSelected(files)
        }
      })
    }
    this.#folderInput.click()
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

  #emitFilesSelected(files: File[]) {
    this.dispatchEvent(
      new CustomEvent('files-selected', {
        detail: { files },
        bubbles: true,
        composed: true
      })
    )
  }

  render() {
    return html`
      <custom-icon icon="upload" class="upload-icon"></custom-icon>
      <div class="upload-text">Drop files/folders or add via the + button</div>
      <div class="fab-row">
        <button
          class="fab-button"
          @click=${this.#openFilePicker}
          aria-label="Add files"
        >
          +
        </button>
        <div class="fab-hint">
          Files
          <button class="folder-link" @click=${this.#openFolderPicker}>
            or Folder
          </button>
        </div>
      </div>
    `
  }
}

customElements.define('upload-box', UploadBox)
declare global {
  interface HTMLElementTagNameMap {
    'upload-box': UploadBox
  }
}
