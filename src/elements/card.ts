import { LiteElement, property, css, html } from "@vandeurenglenn/lite";

export class CardElement extends LiteElement {
  @property({ type: Boolean, reflect: true }) accessor elevated: boolean =
    false;

  static styles = [
    css`
      :host {
        display: block;
        background: #1e293b;
        border-radius: 8px;
        box-shadow:
          0 1px 3px rgba(0, 0, 0, 0.1),
          0 1px 2px rgba(0, 0, 0, 0.06);
        transition: box-shadow 0.3s ease-in-out;
        padding: 16px;
      }
      :host([elevated]) {
        box-shadow:
          0 10px 15px rgba(0, 0, 0, 0.1),
          0 4px 6px rgba(0, 0, 0, 0.05);
      }
    `,
  ];

  render() {
    return html` <slot></slot> `;
  }
}

customElements.define("card-element", CardElement);
declare global {
  interface HTMLElementTagNameMap {
    "card-element": CardElement;
  }
}
