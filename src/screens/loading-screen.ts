import { css, LiteElement, html, property } from '@vandeurenglenn/lite'
export class LoadingScreen extends LiteElement {
  @property({ type: Boolean, reflect: true }) accessor shown: boolean = true

  @property({ type: String }) accessor status: string = 'starting'

  static styles = [
    css`
      .modern-loader {
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
      #loadingContent {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #fff;
        text-align: center;
        z-index: 2;
      }

      #loadingContent h2 {
        font-size: 2em;
        margin-bottom: 0.5em;
        letter-spacing: 1px;
      }
      #loadingContent p {
        font-size: 1.1em;
        margin-bottom: 1.5em;
        color: #bae6fd;
      }
      .loader {
        border: 6px solid #2563eb;
        border-top: 6px solid #38bdf8;
        border-radius: 50%;
        width: 48px;
        height: 48px;
        animation: spin 1s linear infinite;
        margin: 0 auto;
      }
      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }
      svg {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 0;
        pointer-events: none;
        filter: drop-shadow(0 0 40px #60a5fa88) blur(0.5px);
      }
      .glow {
        filter: blur(2px) brightness(1.2);
      }
      .blur {
        filter: blur(4px);
        opacity: 0.7;
      }
      .pulse {
        animation: pulseGlow 2.5s infinite alternate;
      }
      @keyframes pulseGlow {
        0%,
        100% {
          filter: drop-shadow(0 0 40px #60a5fa88);
        }
        50% {
          filter: drop-shadow(0 0 80px #60a5fa);
        }
      }
      .move1 {
        animation: move1 8s ease-in-out infinite alternate;
      }
      .move2 {
        animation: move2 10s ease-in-out infinite alternate;
      }
      .move3 {
        animation: move3 7s ease-in-out infinite alternate;
      }
      .move4 {
        animation: move4 12s ease-in-out infinite alternate;
      }
      .move5 {
        animation: move5 9s ease-in-out infinite alternate;
      }
      .move6 {
        animation: move6 11s ease-in-out infinite alternate;
      }
      .move7 {
        animation: move7 13s ease-in-out infinite alternate;
      }
      .move8 {
        animation: move8 10s ease-in-out infinite alternate;
      }
      @keyframes move1 {
        0% {
          transform: translate(0, 0);
        }
        100% {
          transform: translate(50px, 30px);
        }
      }
      @keyframes move2 {
        0% {
          transform: translate(0, 0);
        }
        100% {
          transform: translate(-50px, -20px);
        }
      }
      @keyframes move3 {
        0% {
          transform: translate(0, 0);
        }
        100% {
          transform: translate(20px, 40px);
        }
      }
      @keyframes move4 {
        0% {
          transform: translate(0, 0);
        }
        100% {
          transform: translate(20px, 20px);
        }
      }
      @keyframes move5 {
        0% {
          transform: translate(0, 0);
        }
        100% {
          transform: translate(20px, 20px);
        }
      }
      @keyframes move6 {
        0% {
          transform: translate(0, 0);
        }
        100% {
          transform: translate(40px, -30px);
        }
      }
      @keyframes move7 {
        0% {
          transform: translate(0, 0);
        }
        100% {
          transform: translate(-30px, 40px);
        }
      }
      @keyframes move8 {
        0% {
          transform: translate(0, 0);
        }
        100% {
          transform: translate(-40px, 20px);
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
      <div id="loadingContent" class="loading-card">
        <h2>${current.title}</h2>
        <p
          style="color:#bae6fd;font-size:1.1em;margin-bottom:1.5em;text-align:center;"
        >
          ${current.subtitle}
        </p>
        ${this.status !== 'connected'
          ? html`<div class="modern-loader"></div>`
          : html`<div style="color:#10b981;font-size:2em;">✓</div>`}
        <p style="color:#64748b;font-size:0.9em;margin-top:1em;">
          ${this.status}
        </p>
      </div>
    `
  }

  // All animation is now handled by CSS only
}
customElements.define('loading-screen', LoadingScreen)
