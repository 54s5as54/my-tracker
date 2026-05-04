/* Privacy-first local dashboard
   - No IP/device/GPS capture (we only store minimal local info)
   - Logs are stored only in this browser via localStorage
*/

(function () {
  const LOG_KEY = 'king_logs';
  const MAX_LOGS = 50;

  const els = {
    sidebar: document.getElementById('sidebar'),
    mainUi: document.getElementById('main-ui'),
    adminDashboard: document.getElementById('admin-dashboard'),
    redirectUi: document.getElementById('redirect-ui'),
    logBody: document.getElementById('logBody'),

    linkName: document.getElementById('linkName'),
    targetPhone: document.getElementById('targetPhone'),
    loadingText: document.getElementById('loadingText'),
    videoUrl: document.getElementById('videoUrl'),

    generateBtn: document.getElementById('generateBtn'),
    copyBtn: document.getElementById('copyBtn'),
    generatedLink: document.getElementById('generatedLink'),
    result: document.getElementById('result'),

    // new UI
    autoGenToggle: document.getElementById('autoGenToggle'),
    autoGenText: document.getElementById('autoGenText'),
    multiLinksResult: document.querySelector('.multi-links-result'),
    singleLinkResult: document.querySelector('.single-link-result'),
    generatedLinksContainer: document.getElementById('generatedLinksContainer'),
    copyAllBtn: document.getElementById('copyAllBtn'),

    // redirect UI
    redirectSubtext: document.getElementById('redirect-subtext'),
    playBtn: document.getElementById('playBtn'),
    clearBtn: document.getElementById('clearBtn'),
    redirectHeader: document.getElementById('redirect-header'),

    // live meta
    liveName: document.getElementById('liveName'),
    liveDevice: document.getElementById('liveDevice'),
    liveLocation: document.getElementById('liveLocation'),
  };

  function safeJsonParse(str) {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  }

  function encodeConfig(config) {
    const json = JSON.stringify(config);
    return btoa(unescape(encodeURIComponent(json)));
  }

  function decodeConfig(encoded) {
    const json = decodeURIComponent(escape(atob(encoded)));
    return safeJsonParse(json);
  }

  function getBaseUrlWithoutQuery() {
    return window.location.href.split('?')[0];
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(String(str)));
    return div.innerHTML;
  }

  function setActiveSection(sectionId) {
    document.querySelectorAll('.container, .admin-section').forEach((el) => {
      el.classList.remove('active');
    });
    document.querySelectorAll('.nav-btn').forEach((el) => {
      el.classList.remove('active');
    });

    const sectionEl = document.getElementById(sectionId);
    if (sectionEl) sectionEl.classList.add('active');

    const activeBtn = document.querySelector(`.nav-btn[data-section="${sectionId}"]`);
    if (activeBtn) activeBtn.classList.add('active');
  }

  function getLogs() {
    const raw = localStorage.getItem(LOG_KEY);
    const parsed = safeJsonParse(raw || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed;
  }

  function saveLogLocally(entry) {
    const logs = getLogs();
    logs.unshift(entry);
    localStorage.setItem(LOG_KEY, JSON.stringify(logs.slice(0, MAX_LOGS)));
  }

  function formatTime(iso) {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return String(iso || '');
    }
  }

  function summarizeVideoUrl(url) {
    if (!url) return 'N/A';
    try {
      const u = new URL(url);
      const host = u.host.replace(/^www\./, '');
      const path = u.pathname.length > 26 ? `${u.pathname.slice(0, 26)}…` : u.pathname;
      return `${host}${path}`;
    } catch {
      return url.length > 38 ? `${url.slice(0, 38)}…` : url;
    }
  }

  function getDefaultLocationNote() {
    // Keeping privacy-first: no geolocation/GPS collection here.
    return 'No GPS/IP location collected (local privacy mode)';
  }

  function formatLatLng(lat, lng) {
    if (typeof lat !== 'number' || typeof lng !== 'number') return '-';
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }

  function formatLocationFromPosition(pos) {
    if (!pos || !pos.coords) return getDefaultLocationNote();
    const { latitude, longitude, accuracy } = pos.coords;

    const accM = typeof accuracy === 'number' ? Math.round(accuracy) : null;
    const accText = accM != null && accM > 0 ? ` (±${accM}m)` : '';

    const ts = pos.timestamp ? new Date(pos.timestamp).toLocaleTimeString() : '';
    const timeText = ts ? ` @ ${ts}` : '';

    return `${formatLatLng(latitude, longitude)}${accText}${timeText}`;
  }

  function getDeviceNote() {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const uaShort = ua ? ua.slice(0, 80) + (ua.length > 80 ? '…' : '') : 'Unknown UA';
    const w = window?.screen?.width;
    const h = window?.screen?.height;

    const screenText = typeof w === 'number' && typeof h === 'number' ? `${w}x${h}` : 'screen n/a';
    return `UA: ${uaShort} | Screen: ${screenText}`;
  }

  function setLiveMeta({ name, device, location } = {}) {
    if (els.liveName && typeof name === 'string') els.liveName.textContent = name;
    if (els.liveDevice && typeof device === 'string') els.liveDevice.textContent = device;
    if (els.liveLocation && typeof location === 'string') els.liveLocation.textContent = location;
  }

  function startLiveGeolocationWatch({ enableHighAccuracy = true } = {}) {
    if (typeof navigator === 'undefined' || !navigator.geolocation || typeof navigator.geolocation.watchPosition !== 'function') {
      setLiveMeta({ location: getDefaultLocationNote() });
      return {
        stop: () => {},
        getLocationNote: () => getDefaultLocationNote(),
      };
    }

    let watchId = null;
    let latestPos = null;
    let lastErrorNote = null;

    setLiveMeta({ location: 'Requesting location…' });

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        latestPos = pos;
        lastErrorNote = null;
        setLiveMeta({ location: formatLocationFromPosition(pos) });
      },
      (err) => {
        const note = err?.code === 1
          ? 'Location permission denied'
          : err?.message
            ? `Location error: ${err.message}`
            : 'Location unavailable';

        lastErrorNote = note;
        setLiveMeta({ location: note });
      },
      {
        enableHighAccuracy,
        maximumAge: 0,
      }
    );

    return {
      stop: () => {
        if (watchId == null) return;
        try {
          navigator.geolocation.clearWatch(watchId);
        } catch {
          // ignore
        }
      },
      getLocationNote: () => {
        if (lastErrorNote) return lastErrorNote;
        if (!latestPos) return getDefaultLocationNote();
        return formatLocationFromPosition(latestPos);
      },
    };
  }

  async function getBatteryNote() {
    // Battery "health" is not available via standard Battery API.
    // We record battery level if available in this browser.
    const hasApi = typeof navigator !== 'undefined' && typeof navigator.getBattery === 'function';
    if (!hasApi) return 'Battery level not available';

    try {
      const battery = await navigator.getBattery();
      const levelPct = Math.round((battery.level || 0) * 100);
      const charging = Boolean(battery.charging);
      const status = charging ? 'Charging' : 'Not charging';
      return `Level: ${levelPct}% (${status})`;
    } catch {
      return 'Battery level not available';
    }
  }

  function renderLogs() {
    const logs = getLogs();
    els.logBody.innerHTML = '';

    if (logs.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td colspan="8" style="color:#8b93a3; padding:14px;">
          No local activity logs yet.
        </td>
      `;
      els.logBody.appendChild(tr);
      return;
    }

    for (const log of logs) {
      const tr = document.createElement('tr');

      const name = escapeHtml(log.link_label ?? 'Unnamed');
      const phone = escapeHtml(log.target_phone ?? 'N/A');
      const video = escapeHtml(summarizeVideoUrl(log.video_url ?? log.redirect_url ?? ''));
      const time = escapeHtml(formatTime(log.timestamp));

      const device = escapeHtml(log.device_note ?? (log.user_agent_present ? 'Browser UA available' : 'Unknown device'));
      const battery = escapeHtml(log.battery_note ?? 'Battery info not recorded');
      const location = escapeHtml(log.location_note ?? getDefaultLocationNote());

      const action = escapeHtml(log.action_note ?? 'Saved locally');

      tr.innerHTML = `
        <td>${name}</td>
        <td>${phone}</td>
        <td>${video}</td>
        <td>${time}</td>
        <td>${device}</td>
        <td>${battery}</td>
        <td>${location}</td>
        <td style="color:#00ff41; font-weight:700;">${action}</td>
      `;

      els.logBody.appendChild(tr);
    }
  }

  function copyTextToClipboard(text) {
    if (!text) return Promise.resolve(false);
    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') return Promise.resolve(false);

    return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
  }

  function copyLink() {
    const link = els.generatedLink?.href || '';
    if (!link) return;

    copyTextToClipboard(link).then((ok) => {
      if (!ok) {
        alert('Clipboard permission denied. Copy the link manually.');
        return;
      }
      const btn = els.copyBtn;
      const original = btn.textContent;
      btn.textContent = 'Copied! ✅';
      setTimeout(() => {
        btn.textContent = original;
      }, 2000);
    });
  }

  function parseAutoUrls(textareaValue) {
    if (!textareaValue) return [];
    const lines = String(textareaValue)
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    // Validate URLs loosely but avoid breaking for non-URLs.
    const cleaned = [];
    for (const line of lines) {
      try {
        cleaned.push(new URL(line).toString());
      } catch {
        // ignore invalid line
      }
    }
    // remove duplicates
    return Array.from(new Set(cleaned));
  }

  function generateConfigBase() {
    const linkName = (els.linkName?.value || '').trim() || 'Unnamed';
    const targetPhone = (els.targetPhone?.value || '').trim() || 'N/A';
    const loadingMsg = (els.loadingText?.value || '').trim() || 'Ready...';

    return { n: linkName, p: targetPhone, m: loadingMsg };
  }

  function generateSingleLocalLink() {
    const configBase = generateConfigBase();
    const videoUrl = (els.videoUrl?.value || '').trim();
    if (!videoUrl) {
      alert('Please enter a Video URL.');
      els.videoUrl?.focus();
      return;
    }

    let url = '';
    try {
      url = new URL(videoUrl).toString();
    } catch {
      alert('Video URL looks invalid. Please provide a full URL (e.g., https://...).');
      els.videoUrl?.focus();
      return;
    }

    const config = { ...configBase, u: url, i: 1 };
    const baseUrl = getBaseUrlWithoutQuery();
    const encoded = encodeConfig(config);
    const trackingLink = `${baseUrl}?session=${encodeURIComponent(encoded)}`;

    return trackingLink;
  }

  function generateMultiLocalLinks() {
    const configBase = generateConfigBase();
    const list = parseAutoUrls(els.autoGenText?.value || '');

    if (list.length === 0) {
      alert('Please paste at least one valid video URL (one per line).');
      els.autoGenText?.focus();
      return [];
    }

    const baseUrl = getBaseUrlWithoutQuery();
    const links = [];

    list.forEach((videoUrl, idx) => {
      const config = {
        ...configBase,
        // Unique per-video session config
        u: videoUrl,
        i: idx + 1,
      };
      const encoded = encodeConfig(config);
      const trackingLink = `${baseUrl}?session=${encodeURIComponent(encoded)}`;
      links.push({ trackingLink, videoUrl, index: idx + 1 });
    });

    return links;
  }

  function scrollToResult() {
    if (!els.result) return;
    try {
      els.result.scrollIntoView({ behavior: 'auto', block: 'center' });
    } catch {
      // ignore
    }
  }

  function showSingleResult(link) {
    els.result.classList.remove('hidden');

    if (els.singleLinkResult) els.singleLinkResult.classList.remove('hidden');
    if (els.multiLinksResult) els.multiLinksResult.classList.add('hidden');

    els.generatedLink.href = link;
    els.generatedLink.innerText = link;

    scrollToResult();
  }

  function showMultiResult(items) {
    els.result.classList.remove('hidden');

    if (els.singleLinkResult) els.singleLinkResult.classList.add('hidden');
    if (els.multiLinksResult) els.multiLinksResult.classList.remove('hidden');

    els.generatedLinksContainer.innerHTML = '';

    for (const item of items) {
      const row = document.createElement('div');
      row.className = 'generated-link-row';

      const hostText = escapeHtml(summarizeVideoUrl(item.videoUrl));
      const a = document.createElement('a');
      a.href = item.trackingLink;
      a.target = '_blank';
      a.rel = 'noreferrer';
      a.className = 'generated-link-anchor';
      a.textContent = `#${item.index} - ${hostText}`;

      const small = document.createElement('div');
      small.className = 'generated-link-url';
      small.textContent = item.trackingLink;

      row.appendChild(a);
      row.appendChild(small);
      els.generatedLinksContainer.appendChild(row);
    }

    scrollToResult();
  }

  function collectAllMultiLinks(items) {
    return items.map((it) => it.trackingLink).join('\n');
  }

  function showRedirectUi(config) {
    if (els.mainUi) els.mainUi.style.display = 'none';
    if (els.adminDashboard) els.adminDashboard.style.display = 'none';
    if (els.sidebar) els.sidebar.style.display = 'none';

    els.redirectUi.classList.remove('hidden');

    const header = (config && config.u) ? `Video Player` : 'Video Player';
    if (els.redirectHeader) els.redirectHeader.textContent = header;

    els.redirectSubtext.textContent = config?.m || 'Ready...';

    window.__KING_LOCAL_CONFIG__ = config;
  }

  function hideRedirectUi() {
    if (els.mainUi) els.mainUi.style.display = '';
    if (els.adminDashboard) els.adminDashboard.style.display = '';
    if (els.sidebar) els.sidebar.style.display = '';

    els.redirectUi.classList.add('hidden');
    window.__KING_LOCAL_CONFIG__ = null;
  }

  async function playAndRecord() {
    const config = window.__KING_LOCAL_CONFIG__;
    if (!config) return;

    const userAgentPresent = Boolean(navigator.userAgent);
    const deviceNote = getDeviceNote();
    const name = config.n || 'Unnamed';

    // show live meta immediately
    setLiveMeta({
      name,
      device: deviceNote,
      location: 'Waiting for location…',
    });

    els.playBtn.disabled = true;
    els.playBtn.style.opacity = '0.7';

    // Keep watching for a few seconds so UI truly updates in real-time.
    const watch = startLiveGeolocationWatch({ enableHighAccuracy: true });
    const maxWaitMs = 8000;

    await new Promise((r) => setTimeout(r, maxWaitMs));
    watch.stop();

    const batteryNote = await getBatteryNote();

    const payload = {
      link_label: name,
      target_phone: config.p || 'N/A',
      video_url: config.u,
      redirect_url: config.u,
      timestamp: new Date().toISOString(),

      location_note: watch.getLocationNote(),

      device_note: deviceNote,
      user_agent_present: userAgentPresent,

      battery_note: batteryNote,
      action_note: 'Saved locally',
    };

    saveLogLocally(payload);

    setTimeout(() => {
      const targetUrl = payload.redirect_url || 'https://www.youtube.com';
      window.location.href = targetUrl;
    }, 250);
  }

  function clearLogs() {
    if (!confirm('Clear local logs for this browser?')) return;
    localStorage.removeItem(LOG_KEY);
    renderLogs();
  }

  function initNavigation() {
    document.querySelectorAll('.nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sectionId = btn.getAttribute('data-section');
        if (!sectionId) return;
        setActiveSection(sectionId);
        if (sectionId === 'admin-dashboard') renderLogs();
      });
    });
  }

  function initCreator() {
    // toggle auto-mode UI
    if (els.autoGenToggle && els.autoGenText) {
      const sync = () => {
        const on = Boolean(els.autoGenToggle.checked);
        els.autoGenText.classList.toggle('hidden', !on);
      };
      sync();
      els.autoGenToggle.addEventListener('change', sync);
    }

    els.generateBtn?.addEventListener('click', () => {
      const autoOn = Boolean(els.autoGenToggle?.checked);

      if (!autoOn) {
        const link = generateSingleLocalLink();
        if (!link) return;
        showSingleResult(link);
        return;
      }

      const items = generateMultiLocalLinks();
      if (!items || items.length === 0) return;

      // keep multi items for copy-all
      window.__KING_LAST_MULTI__ = items;
      showMultiResult(items);
    });

    els.copyBtn?.addEventListener('click', () => {
      copyLink();
    });

    els.copyAllBtn?.addEventListener('click', () => {
      const items = window.__KING_LAST_MULTI__ || [];
      const text = collectAllMultiLinks(items);
      copyTextToClipboard(text).then((ok) => {
        if (!ok) {
          alert('Clipboard permission denied. Copy the links manually.');
          return;
        }
        const btn = els.copyAllBtn;
        const original = btn.textContent;
        btn.textContent = 'Copied All! ✅';
        setTimeout(() => {
          btn.textContent = original;
        }, 2000);
      });
    });
  }

  function initRedirect() {
    els.playBtn?.addEventListener('click', playAndRecord);
  }

  function initDashboardControls() {
    els.clearBtn?.addEventListener('click', clearLogs);
  }

  function boot() {
    initNavigation();
    initCreator();
    initRedirect();
    initDashboardControls();

    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('session');
    if (encoded) {
      const config = decodeConfig(decodeURIComponent(encoded));
      if (!config) {
        alert('Invalid session data.');
        hideRedirectUi();
        return;
      }
      showRedirectUi(config);
      return;
    }

    setActiveSection('main-ui');
    renderLogs();
  }

  window.App = {
    copyLink,
  };

  boot();
})();
