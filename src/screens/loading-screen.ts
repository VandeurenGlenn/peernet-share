import { css, LiteElement, html, property } from '@vandeurenglenn/lite'
export class LoadingScreen extends LiteElement {
  @property({ type: Boolean, reflect: true }) accessor shown: boolean = true

  @property({ type: String }) accessor status: string = 'starting'

  static styles = [
    css`
      :host {
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.5s;
      }
      :host([shown]) {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: #0f172a;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        transition: opacity 0.5s;
        opacity: 1;
      }

      .loading-card {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #fff;
        text-align: center;
        z-index: 2;
      }

      h2 {
        font-size: 2em;
        margin-bottom: 0.5em;
        letter-spacing: 1px;
      }
      p {
        font-size: 1.1em;
        margin-bottom: 1.5em;
        color: #bae6fd;
        text-align: center;
      }
      .loader {
        width: 48px;
        height: 48px;
        border: 4px solid #2563eb44;
        border-top: 4px solid #38bdf8;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto;
        box-shadow: 0 0 16px #38bdf888;
      }
      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }
    `
  ]

  render() {
    const messages: Record<string, { title: string; subtitle: string }> = {
      starting: {
        title: 'Starting Peernet...',
        subtitle: 'Initializing your peer-to-peer network connection.'
      },
      'connecting-stars': {
        title: 'Connecting to Stars...',
        subtitle: 'Establishing connection to discovery nodes.'
      },
      'connecting-peers': {
        title: 'Connecting to Peers...',
        subtitle: 'Finding and connecting to other peers in the network.'
      },
      connected: {
        title: 'Connected!',
        subtitle: "You're now part of the Peernet network."
      }
    }

    const current = messages[this.status] || messages['starting']

    return html`
      <div class="loading-card">
        <h2>${current.title}</h2>
        <p>${current.subtitle}</p>
        ${this.status !== 'connected'
          ? html`<div class="loader"></div>`
          : html`<div style="color:#10b981;font-size:2em;">✓</div>`}
        <p style="color:#64748b;font-size:0.9em;margin-top:1em;">
          ${this.status}
        </p>
      </div>
    `
  }
}
customElements.define('loading-screen', LoadingScreen)
