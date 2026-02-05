import { LiteElement, html, css } from "@vandeurenglenn/lite";

export class HomeView extends LiteElement {
  static styles = [
    css`
      :host {
        display: block;
        padding: 16px;
      }
    `,
  ];
  render() {
    return html`
      <h1>Welcome to PeerNet Share</h1>
      <p>This is the home view of the PeerNet Share application.</p>
    `;
  }
}

customElements.define("home-view", HomeView);
declare global {
  interface HTMLElementTagNameMap {
    "home-view": HomeView;
  }
}
