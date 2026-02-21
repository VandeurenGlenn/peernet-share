import { LiteElement, css, html, property } from '@vandeurenglenn/lite'
import { StyleList } from '@vandeurenglenn/lite/element'
import type { NetworkStats } from '@netpeer/swarm/peer'

export class InfoHeader extends LiteElement {
  @property({ type: String }) accessor peerId: string = ''

  @property({ type: Object }) accessor peers: {
    [peerId: string]: NetworkStats
  } = {}

  @property({ type: Object }) accessor peerLocations: {
    [peerId: string]: { country: string; countryCode: string; flag: string }
  } = {}

  #updateInterval?: NodeJS.Timeout
  #expanded = false

  static styles?: StyleList = [
    css`
      :host {
        display: block;
        background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
        color: #f1f5f9;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        position: relative;
        z-index: 100;
        user-select: none;
      }

      .header-bar {
        display: block;
        cursor: pointer;
        transition: background 0.2s ease;
      }

      .header-inner {
        max-width: 1400px;
        margin: 0 auto;
        padding: 12px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .header-bar:hover {
        background: rgba(56, 189, 248, 0.05);
      }

      .status-bar {
        display: flex;
        align-items: center;
        gap: 16px;
        font-size: 0.85rem;
        flex: 1;
      }

      .status-item {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .status-label {
        color: #94a3b8;
        font-weight: 600;
      }

      .status-value {
        color: #3b82f6;
        font-weight: bold;
      }

      .expand-icon {
        color: #94a3b8;
        font-size: 1.2em;
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        margin-left: 8px;
      }

      .expand-icon.expanded {
        transform: rotate(180deg);
      }

      .expanded-content {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        background: rgba(15, 23, 42, 0.98);
        backdrop-filter: blur(10px);
      }

      .expanded-content.visible {
        max-height: 600px;
        border-top: 1px solid rgba(148, 163, 184, 0.2);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4);
      }

      .expanded-inner {
        padding: 16px;
        max-width: 1400px;
        margin: 0 auto;
      }

      .latency-grid {
        display: flex;
        justify-content: flex-start;
        gap: 24px;
      }

      .latency-item {
        text-align: center;
      }

      .latency-label {
        font-size: 0.7rem;
        color: #94a3b8;
        margin-bottom: 2px;
      }

      .latency-value {
        font-size: 0.95rem;
        font-weight: bold;
        color: #10b981;
      }

      .peers-table {
        margin-top: 12px;
        font-size: 0.8rem;
        width: 100%;
      }

      .peers-header {
        display: grid;
        grid-template-columns: 2.2fr 1.4fr 0.8fr 0.8fr 0.8fr;
        gap: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid rgba(148, 163, 184, 0.2);
        margin-bottom: 8px;
        font-weight: 600;
        color: #94a3b8;
        text-align: left;
      }

      .peers-header > div:nth-child(3),
      .peers-header > div:nth-child(4),
      .peers-header > div:nth-child(5) {
        text-align: right;
      }

      .peer-row {
        display: grid;
        grid-template-columns: 2.2fr 1.4fr 0.8fr 0.8fr 0.8fr;
        gap: 12px;
        padding: 8px 0;
        align-items: center;
        min-width: 0;
      }

      .peer-id {
        color: #3b82f6;
        font-family: monospace;
        font-size: 0.75rem;
        text-align: left;
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        transition: color 0.2s;
        min-width: 0;
      }

      .peer-id:hover {
        color: #60a5fa;
      }

      .peer-id-text {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .country-cell {
        display: flex;
        align-items: center;
        gap: 6px;
        justify-content: flex-start;
        color: #94a3b8;
        font-size: 0.75rem;
        text-align: left;
        min-width: 0;
      }

      .flag-emoji {
        font-size: 1.1em;
      }

      .peer-stat {
        color: #10b981;
        text-align: right;
      }

      @media (max-width: 700px) {
        .header-inner {
          padding: 10px 12px;
        }

        .status-bar {
          gap: 12px;
          overflow-x: auto;
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE/Edge */
          padding-right: 10px;
          mask-image: linear-gradient(to right, black 90%, transparent 100%);
          -webkit-mask-image: linear-gradient(
            to right,
            black 90%,
            transparent 100%
          );
        }

        .status-bar::-webkit-scrollbar {
          display: none;
        }

        .status-label {
          display: none;
        }

        .status-item {
          white-space: nowrap;
        }

        /* Keep labels for ID since it's important, but maybe shorten it? */
        .status-item:first-child .status-label {
          display: inline;
        }
      }
    `
  ]

  firstRender(): void {
    pubsub.subscribe('peer:connected', async (peer) => {
      if (!this.peers[peer]) {
        this.peers[peer] = await peernet.getConnection(peer).getNetworkStats()
        this.fetchPeerLocation(peer)
        this.requestRender()
      }
    })

    pubsub.subscribe('peer:disconnected', (peer) => {
      if (this.peers[peer]) {
        delete this.peers[peer]
        delete this.peerLocations[peer]
        this.requestRender()
      }
    })

    // Update network stats every 10 seconds
    this.#updateInterval = setInterval(async () => {
      for (const peerId of Object.keys(this.peers)) {
        try {
          this.peers[peerId] = await peernet
            .getConnection(peerId)
            .getNetworkStats()
        } catch (error) {
          // Peer might have disconnected
          console.warn(`Failed to update stats for peer ${peerId}:`, error)
        }
      }
      this.requestRender()
    }, 10000)
  }

  disconnectedCallback(): void {
    if (this.#updateInterval) {
      clearInterval(this.#updateInterval)
    }
  }

  async fetchPeerLocation(peerId: string) {
    try {
      const connection = peernet.getConnection(peerId)
      const ip = this.extractPeerIp(connection) || (await this.fetchPublicIp())
      if (!ip) return

      const response = await fetch(
        `https://whereis.leofcoin.org/?ip=${encodeURIComponent(ip)}`
      )
      const data = await response.json()

      const latitude = data.lat ?? data.latitude
      const longitude = data.lon ?? data.lng ?? data.longitude

      if (latitude != null && longitude != null) {
        const reverse = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
          {
            headers: {
              'Accept-Language': 'en'
            }
          }
        )
        const reverseData = await reverse.json()
        const countryCode = reverseData?.address?.country_code?.toUpperCase()
        const countryName = reverseData?.address?.country

        if (countryCode) {
          const flag = this.countryCodeToFlag(countryCode)
          this.peerLocations = {
            ...this.peerLocations,
            [peerId]: {
              country: countryName || countryCode,
              countryCode,
              flag
            }
          }
          this.requestRender()
          return
        }
      }

      this.peerLocations = {
        ...this.peerLocations,
        [peerId]: {
          country: 'Unknown',
          countryCode: 'UN',
          flag: '🏳️'
        }
      }
      this.requestRender()
    } catch (error) {
      console.warn(`Failed to fetch location for peer ${peerId}:`, error)
    }
  }

  extractPeerIp(connection: any): string | null {
    if (!connection) return null
    const candidates = [
      connection.remoteAddress,
      connection.address,
      connection.ip,
      connection.host,
      connection?.remote?.address,
      connection?._socket?.remoteAddress
    ]
    const ip = candidates.find((value) => typeof value === 'string')
    return ip || null
  }

  async fetchPublicIp(): Promise<string | null> {
    try {
      const response = await fetch('https://api.ipify.org?format=json')
      const data = await response.json()
      return data.ip || null
    } catch (error) {
      console.warn('Failed to fetch public IP:', error)
      return null
    }
  }

  countryCodeToFlag(countryCode: string): string {
    // Convert ISO country code to flag emoji
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map((char) => 127397 + char.charCodeAt(0))
    return String.fromCodePoint(...codePoints)
  }

  toggleExpanded() {
    this.#expanded = !this.#expanded
    this.requestRender()
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      // Could show a toast notification here
      console.log('Copied to clipboard:', text)
    })
  }

  render() {
    const uploadBytes = Object.values(this.peers || {}).reduce(
      (acc, stats) => acc + (stats.bytesSent || 0),
      0
    )
    const downloadBytes = Object.values(this.peers || {}).reduce(
      (acc, stats) => acc + (stats.bytesReceived || 0),
      0
    )

    const formatBytes = (bytes: number): string => {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
    }

    const latencyStats = (() => {
      const latencies = Object.values(this.peers || {}).map(
        (stats) => stats.latency || 0
      )
      if (latencies.length === 0) {
        return { min: 0, median: 0, max: 0 }
      }
      latencies.sort((a, b) => a - b)
      const min = latencies[0]
      const max = latencies[latencies.length - 1]
      const mid = Math.floor(latencies.length / 2)
      const median =
        latencies.length % 2 !== 0
          ? latencies[mid]
          : (latencies[mid - 1] + latencies[mid]) / 2
      return { min, median, max }
    })()

    return html`
      <div class="header-bar" @click="${() => this.toggleExpanded()}">
        <div class="header-inner">
          <div class="status-bar">
            ${this.peerId
              ? html`<div class="status-item">
                  <span class="status-label">ID:</span>
                  <span class="status-value" title="${this.peerId}"
                    >${this.peerId.slice(0, 12)}...</span
                  >
                </div>`
              : ''}
            <div class="status-item">
              <span class="status-label">Peers:</span>
              <span class="status-value"
                >${Object.keys(this.peers || {}).length}</span
              >
            </div>
            <div class="status-item">
              <span class="status-label">↑</span>
              <span class="status-value">${formatBytes(uploadBytes)}</span>
            </div>
            <div class="status-item">
              <span class="status-label">↓</span>
              <span class="status-value">${formatBytes(downloadBytes)}</span>
            </div>
            <div class="status-item">
              <span class="status-label">Latency:</span>
              <span class="status-value"
                >${latencyStats.median.toFixed(0)}ms</span
              >
            </div>
          </div>
          <div class="expand-icon ${this.#expanded ? 'expanded' : ''}">▼</div>
        </div>
      </div>

      <div class="expanded-content ${this.#expanded ? 'visible' : ''}">
        <div class="expanded-inner">
          ${this.peerId
            ? html`
                <div
                  style="display:flex;align-items:center;gap:8px;margin-bottom:12px;color:#94a3b8;font-size:0.8rem;"
                >
                  <span style="font-weight:600;">Your ID:</span>
                  <span
                    style="color:#3b82f6;font-family:monospace;cursor:pointer;"
                    title="Click to copy peer ID"
                    @click=${() => this.copyToClipboard(this.peerId)}
                    >${this.peerId}</span
                  >
                </div>
              `
            : ''}
          <div class="latency-grid">
            <div class="latency-item">
              <div class="latency-label">Min</div>
              <div class="latency-value">${latencyStats.min}ms</div>
            </div>
            <div class="latency-item">
              <div class="latency-label">Median</div>
              <div class="latency-value">
                ${latencyStats.median.toFixed(2)}ms
              </div>
            </div>
            <div class="latency-item">
              <div class="latency-label">Max</div>
              <div class="latency-value">${latencyStats.max}ms</div>
            </div>
          </div>

          ${Object.keys(this.peers || {}).length > 0
            ? html`
                <div class="peers-table">
                  <div class="peers-header">
                    <div>Peer ID</div>
                    <div>Country</div>
                    <div>Latency</div>
                    <div>↑ Sent</div>
                    <div>↓ Received</div>
                  </div>
                  ${Object.entries(this.peers || {}).map(([peerId, stats]) => {
                    const location = this.peerLocations[peerId]
                    const isYou = peerId === this.peerId
                    return html`
                      <div class="peer-row">
                        <div
                          class="peer-id"
                          @click=${() => this.copyToClipboard(peerId)}
                          title="Click to copy peer ID"
                        >
                          <span class="peer-id-text">${peerId}</span>
                          ${isYou
                            ? html`<span
                                style="color:#10b981;font-weight:600;margin-left:8px;font-size:0.85em;"
                                >(You)</span
                              >`
                            : ''}
                        </div>
                        <div class="country-cell">
                          ${location
                            ? html`<span class="flag-emoji"
                                  >${location.flag}</span
                                >
                                <span>${location.country}</span>`
                            : html`<span>—</span>`}
                        </div>
                        <div class="peer-stat">${stats.latency || 0}ms</div>
                        <div class="peer-stat">
                          ${formatBytes(stats.bytesSent || 0)}
                        </div>
                        <div class="peer-stat">
                          ${formatBytes(stats.bytesReceived || 0)}
                        </div>
                      </div>
                    `
                  })}
                </div>
              `
            : ''}
        </div>
      </div>
    `
  }
}

customElements.define('info-header', InfoHeader)
declare global {
  interface HTMLElementTagNameMap {
    'info-header': InfoHeader
  }
}
