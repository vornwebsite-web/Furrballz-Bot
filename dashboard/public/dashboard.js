// ── Copyright 2026 Furrballz Bot™ — TheFurrballz Hotel ───────────────────────
'use strict';

// ── Toast notifications ───────────────────────────────────────────────────────

function toast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity .3s';
    setTimeout(() => el.remove(), 300);
  }, 3500);
}

// ── Generic form save ─────────────────────────────────────────────────────────

async function saveForm(formId, endpoint) {
  const form = document.getElementById(formId);
  if (!form) return;

  const data       = {};
  const formData   = new FormData(form);
  const checkboxes = form.querySelectorAll('input[type="checkbox"]');

  // Set all checkboxes to false first, then override with checked values
  checkboxes.forEach(cb => { if (cb.name) data[cb.name] = 'false'; });

  for (const [key, value] of formData.entries()) {
    if (data[key] === 'false' && value === 'true') {
      data[key] = 'true';
    } else if (data[key] !== 'true') {
      data[key] = value;
    }
  }

  try {
    const res = await fetch(endpoint, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    });
    const json = await res.json();
    if (json.success) {
      toast('Settings saved successfully!', 'success');
    } else {
      toast(json.error || 'Failed to save settings.', 'error');
    }
  } catch (err) {
    toast('Network error — please try again.', 'error');
  }
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

document.addEventListener('click', (e) => {
  const tab = e.target.closest('.tab[data-tab]');
  if (!tab) return;
  const tabId = tab.dataset.tab;
  const parent = tab.closest('.card, .content, .main') || document;

  parent.querySelectorAll('.tab[data-tab]').forEach(t => t.classList.remove('active'));
  parent.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

  tab.classList.add('active');
  const panel = document.getElementById(`tab-${tabId}`);
  if (panel) panel.classList.add('active');
});

// ── Moderation ────────────────────────────────────────────────────────────────

async function clearWarn(guildId, caseId, btn) {
  if (!confirm('Clear this warning?')) return;
  btn.disabled = true;
  try {
    const res  = await fetch(`/guild/${guildId}/moderation/clearwarn/${caseId}`, { method: 'POST' });
    const json = await res.json();
    if (json.success) {
      toast('Warning cleared.', 'success');
      btn.closest('tr').querySelector('td:last-child').innerHTML = '<span class="badge badge-muted">Cleared</span>';
    } else {
      toast('Failed to clear warning.', 'error');
      btn.disabled = false;
    }
  } catch {
    toast('Network error.', 'error');
    btn.disabled = false;
  }
}

// ── Tickets ───────────────────────────────────────────────────────────────────

async function saveTicketConfig(guildId) {
  const form = document.getElementById('ticket-config-form');
  if (!form) return;
  const data = {};
  new FormData(form).forEach((v, k) => { data[k] = v; });
  try {
    const res  = await fetch(`/guild/${guildId}/tickets/config`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    });
    const json = await res.json();
    toast(json.success ? 'Ticket config saved!' : (json.error || 'Error'), json.success ? 'success' : 'error');
  } catch { toast('Network error.', 'error'); }
}

// ── Giveaways ─────────────────────────────────────────────────────────────────

async function endGiveaway(guildId, id, btn) {
  if (!confirm('End this giveaway early?')) return;
  btn.disabled = true;
  try {
    const res  = await fetch(`/guild/${guildId}/giveaways/${id}/end`, { method: 'POST' });
    const json = await res.json();
    if (json.success) { toast('Giveaway ended!', 'success'); location.reload(); }
    else { toast('Failed.', 'error'); btn.disabled = false; }
  } catch { toast('Network error.', 'error'); btn.disabled = false; }
}

async function rerollGiveaway(guildId, id, btn) {
  btn.disabled = true;
  try {
    const res  = await fetch(`/guild/${guildId}/giveaways/${id}/reroll`, { method: 'POST' });
    const json = await res.json();
    if (json.success) { toast(`Rerolled! Winners: ${json.winners.join(', ')}`, 'success'); }
    else { toast('Failed to reroll.', 'error'); }
    btn.disabled = false;
  } catch { toast('Network error.', 'error'); btn.disabled = false; }
}

// ── Social feeds ──────────────────────────────────────────────────────────────

async function toggleFeedPause(guildId, id, btn) {
  btn.disabled = true;
  try {
    const res  = await fetch(`/guild/${guildId}/social/pause/${id}`, { method: 'POST' });
    const json = await res.json();
    if (json.success) {
      btn.textContent = json.paused ? 'Resume' : 'Pause';
      toast(json.paused ? 'Feed paused.' : 'Feed resumed.', 'success');
    }
    btn.disabled = false;
  } catch { toast('Network error.', 'error'); btn.disabled = false; }
}

async function deleteFeed(guildId, id, btn) {
  if (!confirm('Remove this social feed?')) return;
  btn.disabled = true;
  try {
    const res  = await fetch(`/guild/${guildId}/social/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) { toast('Feed removed.', 'success'); btn.closest('.feed-card').remove(); }
    else { toast('Failed.', 'error'); btn.disabled = false; }
  } catch { toast('Network error.', 'error'); btn.disabled = false; }
}

// ── Suggestions ───────────────────────────────────────────────────────────────

async function reviewSuggestion(guildId, id, action, btn) {
  btn.disabled = true;
  try {
    const res  = await fetch(`/guild/${guildId}/suggestions/${id}/${action}`, { method: 'POST' });
    const json = await res.json();
    if (json.success) { toast(`Suggestion ${action}d.`, 'success'); btn.closest('tr').remove(); }
    else { toast('Failed.', 'error'); btn.disabled = false; }
  } catch { toast('Network error.', 'error'); btn.disabled = false; }
}

// ── Leveling ──────────────────────────────────────────────────────────────────

async function resetXP(guildId, userId, btn) {
  if (!confirm('Reset this user\'s XP and level?')) return;
  btn.disabled = true;
  try {
    const res  = await fetch(`/guild/${guildId}/levels/reset/${userId}`, { method: 'POST' });
    const json = await res.json();
    if (json.success) { toast('XP reset.', 'success'); location.reload(); }
    else { toast('Failed.', 'error'); btn.disabled = false; }
  } catch { toast('Network error.', 'error'); btn.disabled = false; }
}

// ── Economy ───────────────────────────────────────────────────────────────────

async function deleteItem(guildId, id, btn) {
  if (!confirm('Remove this shop item?')) return;
  btn.disabled = true;
  try {
    const res  = await fetch(`/guild/${guildId}/economy/item/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) { toast('Item removed.', 'success'); btn.closest('tr').remove(); }
    else { toast('Failed.', 'error'); btn.disabled = false; }
  } catch { toast('Network error.', 'error'); btn.disabled = false; }
}

async function setBalance(guildId, userId) {
  const input  = document.getElementById(`bal-${userId}`);
  const amount = parseInt(input?.value);
  if (isNaN(amount)) return toast('Enter a valid amount.', 'error');
  try {
    const res  = await fetch(`/guild/${guildId}/economy/balance/${userId}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ amount }),
    });
    const json = await res.json();
    toast(json.success ? 'Balance updated.' : 'Failed.', json.success ? 'success' : 'error');
  } catch { toast('Network error.', 'error'); }
}

// ── Counting ──────────────────────────────────────────────────────────────────

async function resetCount(guildId) {
  if (!confirm('Reset the count to 0?')) return;
  try {
    const res  = await fetch(`/guild/${guildId}/counting/reset`, { method: 'POST' });
    const json = await res.json();
    toast(json.success ? 'Count reset to 0.' : 'Failed.', json.success ? 'success' : 'error');
    if (json.success) location.reload();
  } catch { toast('Network error.', 'error'); }
}

// ── Owner panel ───────────────────────────────────────────────────────────────

async function setMode(mode) {
  try {
    const res  = await fetch('/owner/mode', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ mode }),
    });
    const json = await res.json();
    toast(json.success ? `Mode set to ${mode}.` : 'Failed.', json.success ? 'success' : 'error');
    if (json.success) location.reload();
  } catch { toast('Network error.', 'error'); }
}

async function setMaintenance(enabled) {
  try {
    const res  = await fetch('/owner/maintenance', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ enabled: String(enabled) }),
    });
    const json = await res.json();
    toast(json.success ? `Maintenance ${enabled ? 'enabled' : 'disabled'}.` : 'Failed.', json.success ? 'success' : 'error');
    if (json.success) location.reload();
  } catch { toast('Network error.', 'error'); }
}

async function addBlacklist() {
  const id     = document.getElementById('bl-id')?.value?.trim();
  const type   = document.getElementById('bl-type')?.value;
  const reason = document.getElementById('bl-reason')?.value?.trim();
  if (!id) return toast('Enter a user or guild ID.', 'error');
  try {
    const res  = await fetch('/owner/blacklist', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ targetId: id, targetType: type, reason }),
    });
    const json = await res.json();
    toast(json.success ? `${id} blacklisted.` : 'Failed.', json.success ? 'success' : 'error');
    if (json.success) location.reload();
  } catch { toast('Network error.', 'error'); }
}

async function removeBlacklist(id, btn) {
  if (!confirm('Remove from blacklist?')) return;
  btn.disabled = true;
  try {
    const res  = await fetch(`/owner/blacklist/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) { toast('Removed from blacklist.', 'success'); btn.closest('tr').remove(); }
    else { toast('Failed.', 'error'); btn.disabled = false; }
  } catch { toast('Network error.', 'error'); btn.disabled = false; }
}

async function toggleAllowed(guildId, currentlyAllowed, btn) {
  const action = currentlyAllowed ? 'remove' : 'add';
  btn.disabled = true;
  try {
    const res  = await fetch('/owner/allowed-guild', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ guildId, action }),
    });
    const json = await res.json();
    toast(json.success ? `Guild ${action === 'add' ? 'allowed' : 'disallowed'}.` : 'Failed.', json.success ? 'success' : 'error');
    if (json.success) location.reload();
    else btn.disabled = false;
  } catch { toast('Network error.', 'error'); btn.disabled = false; }
}

// ── Live stats refresh (overview page) ───────────────────────────────────────

if (document.querySelector('.stats-grid') && window.location.pathname.match(/^\/guild\/\d+$/)) {
  const guildId = window.location.pathname.split('/')[2];
  setInterval(async () => {
    try {
      const res   = await fetch(`/api/guild/${guildId}/stats`);
      const data  = await res.json();
      const cells = document.querySelectorAll('.stat-value');
      if (cells[0]) cells[0].textContent = data.members?.toLocaleString() || cells[0].textContent;
      if (cells[1]) cells[1].textContent = data.openTickets ?? cells[1].textContent;
    } catch { /* silent */ }
  }, 30000);
}
