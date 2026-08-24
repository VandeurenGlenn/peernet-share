import { html } from '@vandeurenglenn/lite'
import '@vandeurenglenn/lite-elements/icon-set'
export default html`
  <custom-icon-set>
    <template>
      <span name="home">@symbol-home</span>
      <span name="settings">@symbol-settings</span>
      <span name="upload">@symbol-upload</span>
      <span name="folder">@symbol-folder</span>
      <span name="download">@symbol-download</span>
      <span name="share">@symbol-share</span>
      <span name="delete">@symbol-delete</span>
      <span name="check">@symbol-check</span>
      <span name="search">@symbol-search</span>
      <span name="account_circle">@symbol-account_circle</span>
      <span name="help">@symbol-help</span>
      <span name="logout">@symbol-logout</span>
      <span name="spinner">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="#38bdf8"
            stroke-width="4"
            opacity="0.2"
          />
          <path
            d="M22 12a10 10 0 0 1-10 10"
            stroke="#38bdf8"
            stroke-width="4"
            stroke-linecap="round"
          />
        </svg>
      </span>
    </template>
  </custom-icon-set>
`
