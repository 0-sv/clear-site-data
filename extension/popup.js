const TYPES = [
  {
    key: 'cookies',
    label: 'Cookies',
    hint: 'For the whole domain, including subdomains',
    default: true,
  },
  { key: 'localStorage', label: 'Local storage', default: true },
  { key: 'sessionStorage', label: 'Session storage', hint: 'This tab only', default: true },
  { key: 'indexedDB', label: 'IndexedDB', default: true },
  { key: 'cacheStorage', label: 'Cache storage', hint: 'Service worker caches', default: true },
  { key: 'serviceWorkers', label: 'Service workers', default: true },
  { key: 'cache', label: 'HTTP cache', default: true },
  { key: 'fileSystems', label: 'File systems', default: false },
]

const PREFS_KEY = 'prefs'

const $ = (id) => document.getElementById(id)
const typesEl = $('types')
const selectAll = $('select-all')
const reload = $('reload')
const clearBtn = $('clear')
const statusEl = $('status')

function setStatus(text, kind = '') {
  statusEl.textContent = text
  statusEl.className = `status ${kind}`
}

function checkedTypes() {
  return [...typesEl.querySelectorAll('input:checked')].map((el) => el.value)
}

function syncSelectAll() {
  const boxes = [...typesEl.querySelectorAll('input')]
  const n = boxes.filter((b) => b.checked).length
  selectAll.checked = n === boxes.length
  selectAll.indeterminate = n > 0 && n < boxes.length
  clearBtn.disabled = clearBtn.dataset.blocked === 'true' || n === 0
}

function savePrefs() {
  const prefs = { types: checkedTypes(), reload: reload.checked }
  chrome.storage.sync.set({ [PREFS_KEY]: prefs }).catch(() => {})
}

function render(prefs) {
  const selected = new Set(prefs?.types ?? TYPES.filter((t) => t.default).map((t) => t.key))
  for (const t of TYPES) {
    const label = document.createElement('label')
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.value = t.key
    input.checked = selected.has(t.key)
    const text = document.createElement('span')
    text.textContent = t.label
    if (t.hint) {
      const hint = document.createElement('small')
      hint.className = 'hint'
      hint.textContent = t.hint
      text.append(hint)
    }
    label.append(input, text)
    typesEl.append(label)
  }
  reload.checked = prefs?.reload ?? true
  syncSelectAll()
}

async function clearSessionStorage(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    func: () => {
      try {
        sessionStorage.clear()
      } catch {}
    },
  })
}

async function main() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const { [PREFS_KEY]: prefs } = await chrome.storage.sync.get(PREFS_KEY).catch(() => ({}))
  render(prefs)

  let url
  try {
    url = new URL(tab?.url ?? '')
  } catch {}

  if (!url || !['http:', 'https:'].includes(url.protocol)) {
    $('origin').textContent = 'Not a website'
    clearBtn.dataset.blocked = 'true'
    syncSelectAll()
    setStatus('Open a regular http(s) page to clear its data.', 'err')
    return
  }

  $('origin').textContent = url.origin

  typesEl.addEventListener('change', () => {
    syncSelectAll()
    savePrefs()
  })
  selectAll.addEventListener('change', () => {
    for (const box of typesEl.querySelectorAll('input')) box.checked = selectAll.checked
    syncSelectAll()
    savePrefs()
  })
  reload.addEventListener('change', savePrefs)

  $('form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const types = checkedTypes()
    if (types.length === 0) return

    clearBtn.disabled = true
    setStatus('Clearing…')

    try {
      const dataToRemove = Object.fromEntries(
        types.filter((t) => t !== 'sessionStorage').map((t) => [t, true]),
      )
      if (Object.keys(dataToRemove).length > 0) {
        await chrome.browsingData.remove({ origins: [url.origin] }, dataToRemove)
      }
      if (types.includes('sessionStorage')) await clearSessionStorage(tab.id)

      setStatus(`Cleared ${types.length} item${types.length === 1 ? '' : 's'}.`, 'ok')
      if (reload.checked) {
        await chrome.tabs.reload(tab.id, { bypassCache: true })
        setTimeout(() => window.close(), 600)
      }
    } catch (err) {
      setStatus(err?.message ?? String(err), 'err')
    } finally {
      syncSelectAll()
    }
  })
}

main()
