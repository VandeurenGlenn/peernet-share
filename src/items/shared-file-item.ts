import { LiteElement, property } from '@vandeurenglenn/lite'

export class SharedFileItem extends LiteElement {
  // This component will represent a single file item in the shared files view.
  // This component is a placeholder for the actual file item component that will be used in the shared files view.
  // It can be used to display the file name, size, and other metadata, as well as provide actions such as download and delete.
  @property({ type: String }) accessor filename: string = ''
  @property({ type: Number }) accessor filesize: number = 0
  @property({ type: String }) accessor filehash: string = ''
  @property({ type: String }) accessor status:
    | 'available'
    | 'downloading'
    | 'downloaded'
    | 'error' = 'available'
  @property({ type: Boolean }) accessor isDownloading: boolean = false
}

customElements.define('shared-file-item', SharedFileItem)

declare global {
  interface HTMLElementTagNameMap {
    'shared-file-item': SharedFileItem
  }
}
