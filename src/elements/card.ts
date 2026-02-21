import { LiteElement, property, css, html } from '@vandeurenglenn/lite'

export class CardElement extends LiteElement {
  @property({ type: Boolean, reflect: true }) accessor elevated: boolean = false

  static styles = [
    css`
      :host {
        display: block;
        background: rgba(35, 41, 70, 0.55);
        border-radius: 24px;
        box-shadow: 0 8px 32px 0 #6ee7ff33, 0 1.5px 4px 0 #23294633;
        transition: box-shadow 0.3s ease-in-out;
        padding: 32px;
        border: 1.5px solid #6ee7ff;
        backdrop-filter: blur(16px) saturate(180%);
        -webkit-backdrop-filter: blur(16px) saturate(180%);
      }
      :host([elevated]) {
        box-shadow: 0 16px 48px 0 #6ee7ff55, 0 2px 8px 0 #23294644;
      }
    `,
  ]

  render() {
    return html` <slot></slot> `
  }
}

customElements.define('card-element', CardElement)
declare global {
  interface HTMLElementTagNameMap {
    'card-element': CardElement
  }
}
