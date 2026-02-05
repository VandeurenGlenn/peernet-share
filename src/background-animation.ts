import { LiteElement, css, html } from "@vandeurenglenn/lite";

export class BackgroundAnimation extends LiteElement {
  static styles = [
    css`
      :host {
        display: block;
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 0;
        pointer-events: none;
      }

      svg {
        width: 100%;
        height: 100%;
        filter: drop-shadow(0 0 40px #60a5fa88) blur(0.5px);
      }

      .glow {
        filter: blur(3px) brightness(1.3) drop-shadow(0 0 32px #60a5fa88);
      }

      .blur {
        filter: blur(7px);
        opacity: 0.7;
      }

      .pulse {
        animation: pulseGlow 2.5s infinite alternate;
      }

      @keyframes pulseGlow {
        0%,
        100% {
          filter: drop-shadow(0 0 60px #60a5fa88);
        }
        50% {
          filter: drop-shadow(0 0 120px #38bdf8);
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
          transform: translate(40px, 30px);
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
    `,
  ];

  render() {
    return html`
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 800 600"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="glow" cx="50%" cy="50%" r="80%">
            <stop offset="0%" stop-color="#60a5fa" stop-opacity="0.7" />
            <stop offset="100%" stop-color="#1e3a8a" stop-opacity="0.2" />
          </radialGradient>
        </defs>
        <g opacity="0.5">
          <circle class="move1 pulse" cx="200" cy="100" r="60" fill="#38bdf8" />
          <circle class="move2 glow" cx="650" cy="500" r="40" fill="#818cf8" />
          <circle class="move3 blur" cx="700" cy="120" r="30" fill="#f472b6" />
          <circle class="move6 pulse" cx="100" cy="500" r="50" fill="#fbbf24" />
          <circle class="move7 glow" cx="400" cy="80" r="35" fill="#34d399" />
        </g>
        <g opacity="0.2">
          <rect
            class="move4 blur"
            x="100"
            y="400"
            width="120"
            height="40"
            rx="20"
            fill="#fbbf24"
          />
          <rect
            class="move5 pulse"
            x="600"
            y="50"
            width="80"
            height="30"
            rx="15"
            fill="#34d399"
          />
          <rect
            class="move8 glow"
            x="300"
            y="520"
            width="100"
            height="30"
            rx="15"
            fill="#818cf8"
          />
        </g>
      </svg>
    `;
  }
}

customElements.define("background-animation", BackgroundAnimation);
