'use strict';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const state = {
  token: localStorage.getItem('coworkhub_token') || '',
  profile: null,
  page: 'dashboard',
  catalogTab: 'sedes',
  bookings: [], rooms: [], locations: [], members: [], equipment: [], plans: [], services: [],
  consumption: null,
  busy: false
};

const labels = {
  ADMIN: 'Administrador', RECEPTIONIST: 'Recepción', MEMBER: 'Miembro',
  PENDING: 'Pendiente', CONFIRMED: 'Confirmada', COMPLETED: 'Completada', CANCELLED: 'Cancelada',
  ACTIVE: 'Activo', SUSPENDED: 'Suspendido',
  MEETING_ROOM: 'Sala de reuniones', PRIVATE_OFFICE: 'Oficina privada', DESK: 'Escritorio'
};
const endpoint = {
  sedes: '/api/sedes', salas: '/api/salas', equipamientos: '/api/equipamientos',
  planes: '/api/planes', servicios: '/api/servicios-adicionales'
};

function apiBase() {
  return (window.COWORKHUB_CONFIG.apiBaseUrl || 'http://localhost:8080').replace(/\/+$/, '');
}
function setApiBase(value) {
  const clean = String(value || '').trim().replace(/\/+$/, '');
  window.COWORKHUB_CONFIG.apiBaseUrl = clean;
  localStorage.setItem('coworkhub_api_url', clean);
}
function apiUrl(path) { return `${apiBase()}${path}`; }

async function api(path, options = {}) {
  const headers = { Accept: 'application/json', ...(options.headers || {}) };
  if (state.token && options.auth !== false) headers.Authorization = `Bearer ${state.token}`;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  let response;
  try {
    response = await fetch(apiUrl(path), {
      method: options.method || 'GET', headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error(`No se pudo conectar con ${apiBase()}. Verifica que Spring Boot esté activo y que CORS esté configurado.`);
  }
  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type') || '';
  let data = null;
  if (contentType.includes('application/json')) data = await response.json().catch(() => null);
  else data = await response.text().catch(() => '');
  if (!response.ok) {
    const message = data?.error || data?.message || data?.mensaje || (typeof data === 'string' && data) || `Error HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = data;
    if (response.status === 401 && state.token) {
      logout(false);
      showToast('Tu sesión venció. Inicia sesión nuevamente.', 'info');
    }
    throw error;
  }
  return data;
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
function money(value) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(value || 0));
}
function dateShort(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}
function dateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value).replace('T', ' ') : new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
}
function timeOnly(value) { return value ? String(value).slice(0, 5) : '—'; }
function initials(value) { return String(value || 'U').trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('') || 'U'; }
function role() { return state.profile?.rol || ''; }
function isAdmin() { return role() === 'ADMIN'; }
function isStaff() { return ['ADMIN', 'RECEPTIONIST'].includes(role()); }
function isMember() { return role() === 'MEMBER'; }
function statusBadge(status) { return `<span class="status-badge status-${esc(status)}">${esc(labels[status] || status || '—')}</span>`; }
function toastText(message) { return esc(message).replace(/\n/g, '<br>'); }
function showToast(message, type = 'success') {
  const node = document.createElement('div');
  node.className = `toast ${type === 'error' ? 'error' : type === 'info' ? 'info' : ''}`;
  node.innerHTML = toastText(message);
  $('#toast-region').append(node);
  window.setTimeout(() => node.remove(), 4300);
}
function emptyState(title, message, icon = '⌁') {
  return `<div class="empty-state"><div class="empty-icon">${icon}</div><strong>${esc(title)}</strong><p>${esc(message)}</p></div>`;
}
function pageHeading(kicker, title, description, actions = '') {
  return `<div class="page-heading"><div><span class="section-kicker">${esc(kicker)}</span><h1>${esc(title)}</h1><p>${esc(description)}</p></div><div class="heading-actions">${actions}</div></div>`;
}
function button(label, action, className = 'button button-primary', extra = '') {
  return `<button type="button" class="${className}" data-action="${esc(action)}" ${extra}>${label}</button>`;
}
function safeArray(value) { return Array.isArray(value) ? value : []; }

async function login(username, password, baseUrl) {
  setApiBase(baseUrl);
  const result = await api('/auth/login', { method: 'POST', auth: false, body: { username, password } });
  if (!result?.token) throw new Error('La respuesta de inicio de sesión no contiene un token JWT.');
  state.token = result.token;
  localStorage.setItem('coworkhub_token', result.token);
  state.profile = await api('/auth/perfil');
  localStorage.setItem('coworkhub_profile', JSON.stringify(state.profile));
  showApp();
}
function logout(showMessage = true) {
  state.token = '';
  state.profile = null;
  state.bookings = []; state.rooms = []; state.locations = []; state.members = [];
  localStorage.removeItem('coworkhub_token');
  localStorage.removeItem('coworkhub_profile');
  $('#app-view').classList.add('hidden');
  $('#login-view').classList.remove('hidden');
  $('#login-password').value = '';
  $('#login-error').classList.add('hidden');
  $('#login-username').focus();
  if (showMessage) showToast('Sesión cerrada correctamente.', 'info');
}

function showApp() {
  $('#login-view').classList.add('hidden');
  $('#app-view').classList.remove('hidden');
  const name = state.profile?.usuario || 'Usuario';
  $('#sidebar-username').textContent = name;
  $('#sidebar-role').textContent = labels[role()] || role();
  $('#user-avatar').textContent = initials(name);
  $('#profile-shortcut').textContent = initials(name);
  $('#members-nav').classList.toggle('hidden', !isStaff());
  $('#catalog-nav').classList.toggle('hidden', !isAdmin());
  $('#consumption-nav').classList.toggle('hidden', !isMember());
  $('#api-url').value = apiBase();
  refreshHealth();
  navigate('dashboard');
}

async function refreshHealth() {
  try {
    const result = await api('/actuator/health', { auth: false });
    const healthy = result?.status === 'UP';
    $('#connection-dot').className = `status-dot ${healthy ? 'online' : 'offline'}`;
    $('#connection-label').textContent = healthy ? 'API conectada' : 'API con alertas';
  } catch {
    $('#connection-dot').className = 'status-dot offline';
    $('#connection-label').textContent = 'API desconectada';
  }
}

async function loadSharedData() {
  const [bookings, rooms, locations, plans, services] = await Promise.all([
    api('/api/reservas').catch(() => []), api('/api/salas').catch(() => []),
    api('/api/sedes').catch(() => []), api('/api/planes').catch(() => []),
    api('/api/servicios-adicionales').catch(() => [])
  ]);
  state.bookings = safeArray(bookings);
  state.rooms = safeArray(rooms);
  state.locations = safeArray(locations);
  state.plans = safeArray(plans);
  state.services = safeArray(services);
  if (isStaff()) {
    const [members, equipment] = await Promise.all([
      api('/api/miembros').catch(() => []), api('/api/equipamientos').catch(() => [])
    ]);
    state.members = safeArray(members);
    state.equipment = safeArray(equipment);
  }
  $('#booking-nav-count').textContent = state.bookings.filter(b => ['PENDING', 'CONFIRMED'].includes(b.status)).length;
}

async function navigate(page) {
  state.page = page;
  const names = { dashboard: 'Resumen', bookings: 'Reservas', rooms: 'Salas y espacios', members: 'Miembros', catalogs: 'Catálogos', consumption: 'Mi consumo' };
  $$('.nav-link').forEach(link => link.classList.toggle('active', link.dataset.page === page));
  $('#breadcrumb-current').textContent = names[page] || 'Resumen';
  const contexts = {
    dashboard: 'Vista general de tu espacio de trabajo', bookings: 'Consulta y administra las reservas',
    rooms: 'Explora los espacios disponibles', members: 'Administra los clientes y sus membresías',
    catalogs: 'Configura los recursos de CoWorkHub', consumption: 'Revisa el uso de tu plan mensual'
  };
  $('#page-context').textContent = contexts[page] || '';
  $('#page-content').innerHTML = '<div class="loading-state"><span class="spinner"></span><p>Cargando información...</p></div>';
  $('#sidebar').classList.remove('open');
  $('#sidebar-overlay')?.remove();
  try {
    await loadSharedData();
    if (page === 'dashboard') renderDashboard();
    else if (page === 'bookings') renderBookings();
    else if (page === 'rooms') renderRooms();
    else if (page === 'members' && isStaff()) renderMembers();
    else if (page === 'catalogs' && isAdmin()) renderCatalogs();
    else if (page === 'consumption' && isMember()) await renderConsumption();
    else { state.page = 'dashboard'; renderDashboard(); }
  } catch (error) {
    $('#page-content').innerHTML = `<div class="panel panel-body">${emptyState('No se pudo cargar la información', error.message, '⚠')}</div>`;
  }
}

function renderDashboard() {
  const activeBookings = state.bookings.filter(b => ['PENDING', 'CONFIRMED'].includes(b.status));
  const confirmed = state.bookings.filter(b => b.status === 'CONFIRMED').length;
  const completed = state.bookings.filter(b => b.status === 'COMPLETED').length;
  const activeRooms = state.rooms.filter(r => r.active).length;
  const revenue = state.bookings.filter(b => b.status !== 'CANCELLED').reduce((sum, b) => sum + Number(b.totalCost || 0), 0);
  const countTitle = isMember() ? 'Mis reservas activas' : 'Reservas activas';
  const memberTotal = isStaff() ? state.members.length : 0;
  const recent = [...state.bookings].sort((a, b) => String(b.startTime).localeCompare(String(a.startTime))).slice(0, 6);
  const stats = [
    [countTitle, activeBookings.length, 'Pendientes y confirmadas', '▤', ''],
    ['Salas disponibles', activeRooms, `${state.rooms.length} espacios registrados`, '▣', 'blue'],
    [isMember() ? 'Reservas completadas' : 'Miembros registrados', isMember() ? completed : memberTotal, isMember() ? 'Histórico de uso' : `${state.members.filter(m => m.status === 'ACTIVE').length} miembros activos`, '♙', 'amber'],
    [isMember() ? 'Servicios contratados' : 'Valor reservado', isMember() ? state.bookings.reduce((n,b)=>n+safeArray(b.items).length,0) : money(revenue), isMember() ? 'En tus reservas' : 'Reservas no canceladas', '◈', 'red']
  ];
  $('#page-content').innerHTML = `
    ${pageHeading('CENTRO DE CONTROL', 'Buenos días, ' + (state.profile?.usuario || 'equipo'), 'Aquí tienes el estado general de CoWorkHub.', `<button class="button button-primary" data-action="new-booking">＋ Nueva reserva</button>`)}
    <section class="stats-grid">${stats.map(([name,value,foot,icon,color]) => `<article class="stat-card"><div class="stat-top"><span>${esc(name)}</span><span class="stat-icon ${color}">${icon}</span></div><div class="stat-value">${esc(value)}</div><div class="stat-foot">${esc(foot)}</div></article>`).join('')}</section>
    <section class="content-grid">
      <article class="panel"><div class="panel-header"><div><h2 class="panel-title">${isMember() ? 'Mis próximas reservas' : 'Reservas recientes'}</h2><p class="panel-subtitle">Actividad registrada en la plataforma</p></div><button class="text-link" data-page-jump="bookings">Ver todas →</button></div>
        <div class="table-wrap">${recent.length ? `<table><thead><tr><th>RESERVA</th><th>FECHA Y HORA</th><th>ESTADO</th><th>TOTAL</th></tr></thead><tbody>${recent.map(b => `<tr><td><span class="table-primary">${esc(b.roomName || 'Sala #' + b.roomId)}</span><span class="table-secondary">${esc(b.memberName || 'Miembro')}</span></td><td>${dateTime(b.startTime)}<span class="table-secondary">${timeOnly(b.startTime)} – ${timeOnly(b.endTime)}</span></td><td>${statusBadge(b.status)}</td><td><span class="table-primary">${money(b.totalCost)}</span></td></tr>`).join('')}</tbody></table>` : emptyState('Aún no hay reservas', 'Cuando se creen reservas aparecerán aquí.', '▤')}</div>
      </article>
      <div class="panel"><div class="panel-header"><div><h2 class="panel-title">Accesos rápidos</h2><p class="panel-subtitle">Atajos a las funciones principales</p></div></div><div class="panel-body quick-actions">
        <button class="quick-action" data-action="new-booking"><span class="quick-action-icon">＋</span><span><strong>Crear una reserva</strong><small>Selecciona sala, fecha y servicios</small></span><span class="arrow">→</span></button>
        <button class="quick-action" data-page-jump="rooms"><span class="quick-action-icon">▣</span><span><strong>Explorar salas</strong><small>Consulta espacios y capacidades</small></span><span class="arrow">→</span></button>
        ${isStaff() ? `<button class="quick-action" data-page-jump="members"><span class="quick-action-icon">♙</span><span><strong>Gestionar miembros</strong><small>Consulta clientes y membresías</small></span><span class="arrow">→</span></button>` : `<button class="quick-action" data-page-jump="consumption"><span class="quick-action-icon">◷</span><span><strong>Ver mi consumo</strong><small>Horas incluidas y utilizadas</small></span><span class="arrow">→</span></button>`}
      </div></div>
    </section>
    <section class="panel" style="margin-top:17px"><div class="panel-header"><div><h2 class="panel-title">Estado de reservas</h2><p class="panel-subtitle">Distribución de los estados actuales</p></div></div><div class="panel-body"><div class="mini-list">${[['Pendientes',state.bookings.filter(b=>b.status==='PENDING').length,'#e6a13d'],['Confirmadas',confirmed,'#4b83e6'],['Completadas',completed,'#259774'],['Canceladas',state.bookings.filter(b=>b.status==='CANCELLED').length,'#cf606b']].map(([name,count,color])=>`<div class="mini-row"><span class="mini-row-info"><strong>${name}</strong><small>${count} reservas</small></span><div style="width:38%;height:7px;background:#f0f2f5;border-radius:20px;overflow:hidden"><div style="height:100%;width:${state.bookings.length ? Math.round(count/state.bookings.length*100) : 0}%;background:${color};border-radius:20px"></div></div><span class="mini-row-value">${state.bookings.length ? Math.round(count/state.bookings.length*100) : 0}%</span></div>`).join('')}</div></div></section>`;
}

function renderBookings() {
  const bookings = [...state.bookings].sort((a,b) => String(b.startTime).localeCompare(String(a.startTime)));
  const statusFilter = $('#booking-status-filter')?.value || '';
  const query = ($('#booking-search')?.value || '').toLowerCase();
  const filtered = bookings.filter(b => (!statusFilter || b.status === statusFilter) && (!query || `${b.roomName} ${b.memberName} ${b.id}`.toLowerCase().includes(query)));
  const rows = filtered.map(b => `<tr>
    <td><span class="table-primary">#${b.id} · ${esc(b.roomName || 'Sala #' + b.roomId)}</span><span class="table-secondary">${esc(b.memberName || 'Miembro')}</span></td>
    <td>${dateShort(b.startTime)}<span class="table-secondary">${timeOnly(b.startTime)} – ${timeOnly(b.endTime)}</span></td>
    <td>${b.attendees || 1} personas</td><td>${statusBadge(b.status)}</td><td><span class="table-primary">${money(b.totalCost)}</span></td>
    <td><div class="row-actions"><button class="button button-secondary button-small" data-action="booking-detail" data-id="${b.id}">Detalle</button>${b.status==='PENDING' && isStaff() ? `<button class="button button-secondary button-small" data-action="booking-confirm" data-id="${b.id}">Confirmar</button>` : ''}${b.status==='CONFIRMED' && isStaff() ? `<button class="button button-secondary button-small" data-action="booking-complete" data-id="${b.id}">Completar</button>` : ''}${['PENDING','CONFIRMED'].includes(b.status) ? `<button class="button button-danger button-small" data-action="booking-cancel" data-id="${b.id}">Cancelar</button>` : ''}</div></td>
  </tr>`).join('');
  $('#page-content').innerHTML = `${pageHeading('OPERACIÓN', 'Reservas', 'Consulta, crea y administra las reservas de los espacios.', `<button class="button button-primary" data-action="new-booking">＋ Nueva reserva</button>`)}
    <section class="panel"><div class="filter-bar"><input id="booking-search" class="filter-input" type="search" placeholder="Buscar por sala, miembro o número..." value="${esc(query)}"><select id="booking-status-filter" class="filter-select"><option value="">Todos los estados</option>${['PENDING','CONFIRMED','COMPLETED','CANCELLED'].map(s=>`<option value="${s}" ${statusFilter===s?'selected':''}>${labels[s]}</option>`).join('')}</select><span class="filter-spacer"></span><span class="muted" style="font-size:10px">${filtered.length} resultados</span></div>
    <div class="table-wrap">${filtered.length ? `<table><thead><tr><th>RESERVA / MIEMBRO</th><th>FECHA Y HORA</th><th>ASISTENTES</th><th>ESTADO</th><th>TOTAL</th><th>ACCIONES</th></tr></thead><tbody>${rows}</tbody></table>` : emptyState('No encontramos reservas', 'Prueba cambiar los filtros o crea una nueva reserva.', '▤')}</div></section>`;
  $('#booking-search').addEventListener('input', renderBookingsPreserveFilters);
  $('#booking-status-filter').addEventListener('change', renderBookingsPreserveFilters);
}
function renderBookingsPreserveFilters() {
  const query = $('#booking-search')?.value || '';
  const status = $('#booking-status-filter')?.value || '';
  renderBookings();
  $('#booking-search').value = query;
  $('#booking-status-filter').value = status;
  // Apply locally without reloading server data.
  const needle = query.toLowerCase();
  let count = 0;
  $$('#page-content tbody tr').forEach(row => {
    const matchText = row.textContent.toLowerCase();
    const statusCell = row.querySelector('.status-badge')?.className || '';
    const visible = matchText.includes(needle) && (!status || statusCell.includes(`status-${status}`));
    row.classList.toggle('hidden', !visible); if (visible) count++;
  });
  const countNode = $('#page-content .filter-bar .muted'); if (countNode) countNode.textContent = `${count} resultados`;
}

function renderRooms() {
  const activeRooms = state.rooms.filter(r => r.active);
  const cards = state.rooms.map(room => {
    const location = room.location || {};
    const equipment = safeArray(room.equipment).map(e => e.name).filter(Boolean);
    return `<article class="room-card"><div class="room-card-top"><span class="room-illustration">${room.type==='DESK'?'⌑':room.type==='PRIVATE_OFFICE'?'▣':'▤'}</span>${room.active ? '<span class="status-badge status-ACTIVE">Activa</span>' : '<span class="status-badge status-SUSPENDED">Inactiva</span>'}</div><h3>${esc(room.name)}</h3><p class="room-meta">${esc(labels[room.type] || room.type)} · ${esc(location.name || 'Sede')}<br>Capacidad: ${room.capacity} ${room.capacity===1?'persona':'personas'}</p><div class="tag-list">${equipment.length ? equipment.map(e=>`<span class="tag">${esc(e)}</span>`).join('') : '<span class="tag">Sin equipamiento asociado</span>'}</div><div class="room-card-bottom"><span class="room-price">${money(room.hourlyRate)} <small>/ hora</small></span>${isAdmin() ? `<button class="button button-secondary button-small" data-action="edit-room" data-id="${room.id}">Editar</button><button class="button button-danger button-small" data-action="delete-room" data-id="${room.id}">Eliminar</button>` : ''}</div></article>`;
  }).join('');
  $('#page-content').innerHTML = `${pageHeading('ESPACIOS', 'Salas y espacios', 'Conoce la capacidad, tarifas y equipamiento de cada espacio.', `${isAdmin()?'<button class="button button-primary" data-action="new-room">＋ Agregar sala</button>':''}`)}
    <div class="filter-bar" style="padding:0 0 15px;border:0"><span class="muted" style="font-size:10px">${activeRooms.length} salas activas de ${state.rooms.length} registradas</span><span class="filter-spacer"></span><select id="room-location-filter" class="filter-select"><option value="">Todas las sedes</option>${state.locations.map(l=>`<option value="${l.id}">${esc(l.name)}</option>`).join('')}</select><select id="room-active-filter" class="filter-select"><option value="active">Solo activas</option><option value="all">Todas</option><option value="inactive">Inactivas</option></select></div>
    <div id="room-cards" class="cards-grid">${cards || emptyState('No hay salas registradas','Todavía no se han creado salas.','▣')}</div>`;
  $('#room-location-filter').addEventListener('change', filterRoomCards);
  $('#room-active-filter').addEventListener('change', filterRoomCards);
}
function filterRoomCards() {
  const loc = $('#room-location-filter').value;
  const active = $('#room-active-filter').value;
  const visible = state.rooms.filter(r => (!loc || String(r.location?.id) === loc) && (active==='all' || (active==='active' ? r.active : !r.active)));
  $('#room-cards').innerHTML = visible.length ? visible.map(room => {
    const equipment = safeArray(room.equipment).map(e=>e.name).filter(Boolean);
    return `<article class="room-card"><div class="room-card-top"><span class="room-illustration">${room.type==='DESK'?'⌑':room.type==='PRIVATE_OFFICE'?'▣':'▤'}</span>${room.active?'<span class="status-badge status-ACTIVE">Activa</span>':'<span class="status-badge status-SUSPENDED">Inactiva</span>'}</div><h3>${esc(room.name)}</h3><p class="room-meta">${esc(labels[room.type]||room.type)} · ${esc(room.location?.name||'Sede')}<br>Capacidad: ${room.capacity} personas</p><div class="tag-list">${equipment.map(e=>`<span class="tag">${esc(e)}</span>`).join('')||'<span class="tag">Sin equipamiento asociado</span>'}</div><div class="room-card-bottom"><span class="room-price">${money(room.hourlyRate)} <small>/ hora</small></span>${isAdmin()?`<button class="button button-secondary button-small" data-action="edit-room" data-id="${room.id}">Editar</button><button class="button button-danger button-small" data-action="delete-room" data-id="${room.id}">Eliminar</button>`:''}</div></article>`;
  }).join('') : emptyState('Sin resultados','No hay salas con esos filtros.','▣');
}

function renderMembers() {
  const nameFilter = $('#member-name-filter')?.value || '';
  const statusFilter = $('#member-status-filter')?.value || '';
  const list = state.members.filter(m => (!nameFilter || String(m.fullName).toLowerCase().includes(nameFilter.toLowerCase())) && (!statusFilter || m.status === statusFilter));
  $('#page-content').innerHTML = `${pageHeading('CLIENTES', 'Miembros', 'Gestiona las cuentas, planes y estado de los clientes.', `<button class="button button-primary" data-action="new-member">＋ Registrar miembro</button>`)}
    <section class="panel"><div class="filter-bar"><input id="member-name-filter" class="filter-input" type="search" placeholder="Buscar por nombre..." value="${esc(nameFilter)}"><select id="member-status-filter" class="filter-select"><option value="">Todos los estados</option><option value="ACTIVE" ${statusFilter==='ACTIVE'?'selected':''}>Activos</option><option value="SUSPENDED" ${statusFilter==='SUSPENDED'?'selected':''}>Suspendidos</option></select><span class="filter-spacer"></span><span class="muted" style="font-size:10px">${list.length} miembros</span></div><div id="member-table" class="table-wrap">${memberTable(list)}</div></section>`;
  $('#member-name-filter').addEventListener('input', filterMembers);
  $('#member-status-filter').addEventListener('change', filterMembers);
}
function memberTable(list) {
  if (!list.length) return emptyState('No hay miembros para mostrar','Registra un miembro o cambia los filtros.','♙');
  return `<table><thead><tr><th>MIEMBRO</th><th>DOCUMENTO</th><th>PLAN</th><th>ESTADO</th><th>ACCIONES</th></tr></thead><tbody>${list.map(m=>`<tr><td><span class="table-primary">${esc(m.fullName)}</span><span class="table-secondary">${esc(m.email)}</span></td><td>${esc(m.documentNumber)}</td><td>${esc(m.plan?.name || 'Plan #' + (m.plan?.id || '—'))}</td><td>${statusBadge(m.status)}</td><td><div class="row-actions"><button class="button button-secondary button-small" data-action="edit-member" data-id="${m.id}">Editar</button>${m.status==='ACTIVE'?`<button class="button button-danger button-small" data-action="suspend-member" data-id="${m.id}">Suspender</button>`:`<button class="button button-secondary button-small" data-action="activate-member" data-id="${m.id}">Activar</button>`}<button class="button button-danger button-small" data-action="delete-member" data-id="${m.id}">Eliminar</button></div></td></tr>`).join('')}</tbody></table>`;
}
function filterMembers() {
  const name = $('#member-name-filter').value.toLowerCase();
  const status = $('#member-status-filter').value;
  const list = state.members.filter(m => (!name || String(m.fullName).toLowerCase().includes(name)) && (!status || m.status===status));
  $('#member-table').innerHTML = memberTable(list);
  const count = $('#member-name-filter').parentElement.querySelector('.muted'); if(count)count.textContent=`${list.length} miembros`;
}

async function renderConsumption() {
  const memberId = Number(state.profile?.miembroId || 0);
  if (!memberId) { $('#page-content').innerHTML = emptyState('Cuenta sin miembro vinculado','La cuenta no tiene un miembro asociado.','◷'); return; }
  const current = new Date();
  const month = `${current.getFullYear()}-${String(current.getMonth()+1).padStart(2,'0')}`;
  const [consumption, member] = await Promise.all([
    api(`/api/miembros/${memberId}/consumo?mes=${month}`), api(`/api/miembros/${memberId}`).catch(()=>null)
  ]);
  state.consumption = consumption;
  const used = Number(consumption.horasUsadas || 0), included = Number(consumption.horasIncluidas || 0);
  const percent = included ? Math.min(100, used/included*100) : 0;
  $('#page-content').innerHTML = `${pageHeading('TU MEMBRESÍA', 'Mi consumo', 'Consulta las horas utilizadas y el saldo de tu plan mensual.')}
    <div class="profile-strip"><div class="profile-large-avatar">${initials(member?.fullName || state.profile?.usuario)}</div><div><h3>${esc(member?.fullName || state.profile?.usuario)}</h3><p>${esc(member?.email || '')} · ${esc(member?.plan?.name || 'Plan de membresía')}</p></div><span style="margin-left:auto">${statusBadge(member?.status || 'ACTIVE')}</span></div>
    <div class="consumption-grid"><article class="consumption-card"><span>Horas incluidas</span><strong>${included.toFixed(1)} h</strong></article><article class="consumption-card"><span>Horas utilizadas</span><strong>${used.toFixed(1)} h</strong></article><article class="consumption-card"><span>Horas restantes</span><strong>${Number(consumption.horasRestantes||0).toFixed(1)} h</strong></article><article class="consumption-card"><span>Horas excedentes</span><strong>${Number(consumption.horasExcedentes||0).toFixed(1)} h</strong></article></div>
    <section class="panel"><div class="panel-header"><div><h2 class="panel-title">Uso de tu plan · ${esc(consumption.mes || month)}</h2><p class="panel-subtitle">Progreso de consumo de las horas incluidas</p></div><span class="table-primary">${Math.round(percent)}%</span></div><div class="panel-body"><div class="progress-track"><div class="progress-fill" style="width:${percent}%"></div></div><p class="muted" style="font-size:10px;margin:12px 0 0">${used.toFixed(1)} de ${included.toFixed(1)} horas utilizadas en el mes.</p></div></section>`;
}

const catalogConfig = {
  sedes: { title:'Sedes', endpoint:'/api/sedes', singular:'sede' },
  equipos: { title:'Equipamientos', endpoint:'/api/equipamientos', singular:'equipamiento' },
  planes: { title:'Planes', endpoint:'/api/planes', singular:'plan' },
  servicios: { title:'Servicios adicionales', endpoint:'/api/servicios-adicionales', singular:'servicio' }
};
function renderCatalogs() {
  const config = catalogConfig[state.catalogTab];
  const items = state.catalogTab==='sedes'?state.locations:state.catalogTab==='equipos'?state.equipment:state.catalogTab==='planes'?state.plans:state.services;
  let table = '';
  if (state.catalogTab==='sedes') table = `<table><thead><tr><th>SEDE</th><th>CIUDAD</th><th>DIRECCIÓN</th><th>HORARIO</th><th>ACCIONES</th></tr></thead><tbody>${items.map(i=>`<tr><td class="table-primary">${esc(i.name)}</td><td>${esc(i.city)}</td><td>${esc(i.address||'—')}</td><td>${timeOnly(i.openingTime)} – ${timeOnly(i.closingTime)}</td><td>${catalogActions(i.id)}</td></tr>`).join('')}</tbody></table>`;
  if (state.catalogTab==='equipos') table = `<table><thead><tr><th>NOMBRE DEL EQUIPAMIENTO</th><th>ID</th><th>ACCIONES</th></tr></thead><tbody>${items.map(i=>`<tr><td class="table-primary">${esc(i.name)}</td><td>${i.id}</td><td>${catalogActions(i.id)}</td></tr>`).join('')}</tbody></table>`;
  if (state.catalogTab==='planes') table = `<table><thead><tr><th>PLAN</th><th>HORAS / MES</th><th>DESCUENTO EXCEDENTE</th><th>RESERVAS ACTIVAS MÁX.</th><th>ACCIONES</th></tr></thead><tbody>${items.map(i=>`<tr><td class="table-primary">${esc(i.name)}</td><td>${i.includedHoursPerMonth} h</td><td>${i.overageDiscount}%</td><td>${i.maxActiveBookings}</td><td>${catalogActions(i.id)}</td></tr>`).join('')}</tbody></table>`;
  if (state.catalogTab==='servicios') table = `<table><thead><tr><th>SERVICIO</th><th>PRECIO UNITARIO</th><th>ACCIONES</th></tr></thead><tbody>${items.map(i=>`<tr><td class="table-primary">${esc(i.name)}</td><td>${money(i.unitPrice)}</td><td>${catalogActions(i.id)}</td></tr>`).join('')}</tbody></table>`;
  $('#page-content').innerHTML = `${pageHeading('CONFIGURACIÓN', 'Catálogos', 'Administra los elementos base de la operación de coworking.', `<button class="button button-primary" data-action="new-catalog">＋ Agregar ${esc(config.singular)}</button>`)}<section class="panel"><div class="catalog-tabs">${Object.entries(catalogConfig).map(([key,value])=>`<button class="tab-button ${key===state.catalogTab?'active':''}" data-catalog-tab="${key}">${value.title}</button>`).join('')}</div><div class="panel-header"><div><h2 class="panel-title">${config.title}</h2><p class="panel-subtitle">${items.length} registros disponibles</p></div></div><div class="table-wrap">${items.length?table:emptyState(`No hay ${config.title.toLowerCase()}`,`Agrega el primer ${config.singular}.`,'◫')}</div></section>`;
}
function catalogActions(id) { return `<div class="row-actions"><button class="button button-secondary button-small" data-action="edit-catalog" data-id="${id}">Editar</button><button class="button button-danger button-small" data-action="delete-catalog" data-id="${id}">Eliminar</button></div>`; }

/* Modal helpers */
function openModal(title, subtitle, body, footer, wide = false) {
  $('#modal-root').innerHTML = `<div class="modal-backdrop" data-backdrop><section class="modal ${wide?'modal-wide':''}" role="dialog" aria-modal="true"><header class="modal-header"><div><h2>${esc(title)}</h2><p>${esc(subtitle || '')}</p></div><button class="modal-close" data-action="close-modal" aria-label="Cerrar">×</button></header><div class="modal-body">${body}</div>${footer ? `<footer class="modal-footer">${footer}</footer>` : ''}</section></div>`;
}
function closeModal() { $('#modal-root').innerHTML = ''; }
function selectOptions(items, selected = '', value = 'id', text = 'name', empty = 'Selecciona una opción') {
  return `<option value="">${empty}</option>${items.map(i=>`<option value="${esc(i[value])}" ${String(i[value])===String(selected)?'selected':''}>${esc(i[text])}</option>`).join('')}`;
}
function tomorrowISO() { const d=new Date();d.setDate(d.getDate()+1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

function openBookingModal() {
  const start = '09:00', end = '10:00';
  const body = `<form id="booking-form"><div class="form-grid">
    <div class="form-field"><label for="booking-location">Sede</label><select id="booking-location" required>${selectOptions(state.locations)}</select></div>
    <div class="form-field"><label for="booking-date">Fecha</label><input id="booking-date" type="date" min="${tomorrowISO()}" value="${tomorrowISO()}" required></div>
    <div class="form-field"><label for="booking-start">Hora de inicio</label><input id="booking-start" type="time" value="${start}" required></div>
    <div class="form-field"><label for="booking-end">Hora de finalización</label><input id="booking-end" type="time" value="${end}" required></div>
    <div class="form-field full"><button class="button button-secondary" type="button" data-action="search-available">Buscar salas disponibles</button><span class="form-hint">La búsqueda respeta la capacidad, el horario de la sede y las reservas existentes.</span></div>
    <div class="form-field"><label for="booking-room">Sala disponible</label><select id="booking-room" required>${selectOptions(state.rooms.filter(r=>r.active))}</select></div>
    <div class="form-field"><label for="booking-attendees">Número de asistentes</label><input id="booking-attendees" type="number" min="1" value="2" required></div>
    ${isStaff()?`<div class="form-field full"><label for="booking-member">Miembro</label><select id="booking-member" required>${selectOptions(state.members.filter(m=>m.status==='ACTIVE').map(m=>({id:m.id,name:`${m.fullName} — ${m.documentNumber}`})))}</select></div>`:''}
    <div class="form-field full"><label>Servicios adicionales</label><div class="service-checks">${state.services.map(s=>`<label class="service-option"><input type="checkbox" name="booking-service" value="${s.id}"><span>${esc(s.name)}</span><small>${money(s.unitPrice)}</small></label>`).join('') || '<span class="form-hint">No hay servicios adicionales registrados.</span>'}</div></div>
    <div class="form-field full"><div class="alert-note">Las reservas deben durar entre 30 minutos y 8 horas, empezar con al menos una hora de anticipación y respetar la capacidad de la sala. El sistema calcula el costo final.</div></div>
  </div></form>`;
  openModal('Crear nueva reserva', 'Completa los datos del espacio y el horario solicitado.', body, `<button class="button button-secondary" data-action="close-modal">Cancelar</button><button class="button button-primary" data-action="submit-booking">Crear reserva</button>`, true);
}

async function searchAvailableRooms() {
  const locationId = $('#booking-location').value;
  const date = $('#booking-date').value;
  const start = $('#booking-start').value;
  const end = $('#booking-end').value;
  if (!locationId || !date || !start || !end) { showToast('Selecciona sede, fecha y horario.', 'error'); return; }
  const roomSelect = $('#booking-room');
  roomSelect.innerHTML = '<option value="">Buscando...</option>';
  try {
    const rooms = await api(`/api/disponibilidad?sedeId=${encodeURIComponent(locationId)}&fecha=${encodeURIComponent(date)}&horaInicio=${encodeURIComponent(start)}&horaFin=${encodeURIComponent(end)}`);
    const list = safeArray(rooms).filter(r=>r.active);
    roomSelect.innerHTML = selectOptions(list.map(r=>({id:r.id,name:`${r.name} · ${r.capacity} personas · ${money(r.hourlyRate)}/h`})));
    if (!list.length) showToast('No hay salas disponibles para ese horario.', 'info');
    else showToast(`${list.length} sala(s) disponible(s).`);
  } catch (error) {
    roomSelect.innerHTML = selectOptions(state.rooms.filter(r=>r.active));
    showToast(error.message, 'error');
  }
}
async function submitBooking() {
  const form = $('#booking-form');
  if (!form.reportValidity()) return;
  const date = $('#booking-date').value, start = $('#booking-start').value, end = $('#booking-end').value;
  const payload = {
    roomId: Number($('#booking-room').value),
    startTime: `${date}T${start}:00`, endTime: `${date}T${end}:00`,
    attendees: Number($('#booking-attendees').value),
    services: $$('input[name="booking-service"]:checked', form).map(el=>({serviceId:Number(el.value),quantity:1}))
  };
  if (isStaff()) payload.memberId = Number($('#booking-member').value);
  const btn = $('[data-action="submit-booking"]');
  btn.disabled = true; btn.textContent = 'Guardando...';
  try {
    const result = await api('/api/reservas', { method:'POST', body:payload });
    closeModal(); showToast(`Reserva #${result.id} creada correctamente. Total: ${money(result.totalCost)}`);
    await navigate('bookings');
  } catch (error) { btn.disabled=false;btn.textContent='Crear reserva';showToast(error.message,'error'); }
}

async function bookingAction(id, action) {
  const names = { confirm:'confirmar', complete:'completar', cancel:'cancelar' };
  const prompts = { confirm:'¿Confirmas esta reserva?', complete:'¿Marcar esta reserva como completada?', cancel:'¿Deseas cancelar esta reserva? Se aplicará la política de cancelación.' };
  if (!window.confirm(prompts[action])) return;
  try {
    const result = await api(`/api/reservas/${id}/${names[action]}`, { method:'POST' });
    showToast(action==='cancel' ? `Reserva cancelada. Cargo aplicado: ${money(result.cancellationFee)}` : `Reserva ${action==='confirm'?'confirmada':'completada'} correctamente.`);
    await navigate('bookings');
  } catch (error) { showToast(error.message,'error'); }
}
async function openBookingDetail(id) {
  try {
    const b = await api(`/api/reservas/${id}`);
    const items = safeArray(b.items);
    const canManageServices = b.status==='PENDING' && !isMember() ? true : b.status==='PENDING' && isMember();
    const body = `<div class="form-grid"><div class="form-field"><label>Miembro</label><div class="table-primary">${esc(b.memberName)}</div></div><div class="form-field"><label>Sala</label><div class="table-primary">${esc(b.roomName)}</div></div><div class="form-field"><label>Fecha y horario</label><div class="table-primary">${dateShort(b.startTime)} · ${timeOnly(b.startTime)} – ${timeOnly(b.endTime)}</div></div><div class="form-field"><label>Estado</label>${statusBadge(b.status)}</div><div class="form-field"><label>Asistentes</label><div class="table-primary">${b.attendees}</div></div><div class="form-field"><label>Costo de sala</label><div class="table-primary">${money(b.roomCost)}</div></div></div><div style="margin:19px 0 10px;font-size:11px;font-weight:800;color:#33435a">Servicios adicionales</div>${items.length?`<div class="table-wrap"><table><thead><tr><th>SERVICIO</th><th>CANTIDAD</th><th>PRECIO</th><th>SUBTOTAL</th>${canManageServices?'<th></th>':''}</tr></thead><tbody>${items.map(i=>`<tr><td>${esc(i.serviceName)}</td><td>${i.quantity}</td><td>${money(i.unitPrice)}</td><td>${money(i.subtotal)}</td>${canManageServices?`<td><button class="button button-danger button-small" data-action="remove-booking-service" data-id="${b.id}" data-service-id="${i.serviceId}">Quitar</button></td>`:''}</tr>`).join('')}</tbody></table></div>`:emptyState('Sin servicios adicionales','Esta reserva no tiene servicios contratados.','◈')}<div class="mini-row" style="justify-content:flex-end;margin-top:16px"><span class="muted" style="font-size:10px">Total de reserva</span><strong style="font:800 19px Manrope;color:#1d3449">${money(b.totalCost)}</strong></div>${b.status==='CANCELLED'?`<div class="alert-note" style="margin-top:12px">Cargo de cancelación aplicado: ${money(b.cancellationFee)}</div>`:''}${canManageServices?`<div style="margin-top:16px"><label class="field-label" for="add-booking-service">Agregar servicio</label><div class="inline-search"><div class="form-field"><select id="add-booking-service">${selectOptions(state.services)}</select></div><div class="form-field" style="max-width:85px"><input id="add-booking-quantity" type="number" min="1" value="1"></div><button class="button button-secondary" data-action="add-booking-service" data-id="${b.id}">Agregar</button></div><p class="form-hint">Los servicios solo se pueden modificar mientras la reserva está pendiente.</p></div>`:''}`;
    openModal(`Reserva #${b.id}`, 'Detalle de la reserva y costos calculados.', body, `<button class="button button-secondary" data-action="close-modal">Cerrar</button>`, true);
  } catch (error) { showToast(error.message,'error'); }
}

function openMemberModal(member = null) {
  const edit = Boolean(member);
  const body = `<form id="member-form"><div class="form-grid">${edit?'':`<div class="form-field"><label for="member-document">Documento</label><input id="member-document" required value=""></div>`}<div class="form-field ${edit?'full':''}"><label for="member-fullname">Nombre completo</label><input id="member-fullname" required value="${esc(member?.fullName||'')}"></div><div class="form-field full"><label for="member-email">Correo electrónico</label><input id="member-email" type="email" required value="${esc(member?.email||'')}"></div><div class="form-field full"><label for="member-plan">Plan de membresía</label><select id="member-plan" required>${selectOptions(state.plans,member?.plan?.id)}</select></div>${edit?'':`<div class="form-field"><label for="member-username">Nombre de usuario</label><input id="member-username" required></div><div class="form-field"><label for="member-password">Contraseña inicial</label><input id="member-password" type="password" minlength="6" required></div>`}</div></form>`;
  openModal(edit?'Editar miembro':'Registrar miembro', edit?'Actualiza los datos principales del cliente.':'Se crearán el miembro y su cuenta de acceso.', body, `<button class="button button-secondary" data-action="close-modal">Cancelar</button><button class="button button-primary" data-action="submit-member" data-id="${member?.id||''}">${edit?'Guardar cambios':'Registrar miembro'}</button>`);
}
async function submitMember(id) {
  const form=$('#member-form'); if(!form.reportValidity())return;
  const payload = { fullName:$('#member-fullname').value.trim(), email:$('#member-email').value.trim(), planId:Number($('#member-plan').value) };
  if(id) { /* update DTO contains only these properties */ }
  else { payload.documentNumber=$('#member-document').value.trim();payload.username=$('#member-username').value.trim();payload.password=$('#member-password').value; }
  const btn=$('[data-action="submit-member"]');btn.disabled=true;btn.textContent='Guardando...';
  try { await api(id?`/api/miembros/${id}`:'/api/miembros',{method:id?'PUT':'POST',body:payload});closeModal();showToast(id?'Miembro actualizado.':'Miembro registrado correctamente.');await navigate('members'); }
  catch(error){btn.disabled=false;btn.textContent=id?'Guardar cambios':'Registrar miembro';showToast(error.message,'error');}
}
async function memberStatusAction(id, active) {
  if(!window.confirm(active?'¿Reactivar este miembro?':'¿Suspender este miembro?'))return;
  try{await api(`/api/miembros/${id}/${active?'activar':'suspender'}`,{method:'PATCH'});showToast(active?'Miembro reactivado.':'Miembro suspendido.');await navigate('members');}catch(error){showToast(error.message,'error');}
}
async function deleteMember(id) {
  if(!window.confirm('¿Eliminar este miembro y su cuenta de acceso? El backend rechazará la operación si tiene reservas asociadas.'))return;
  try{await api(`/api/miembros/${id}`,{method:'DELETE'});showToast('Miembro eliminado.');await navigate('members');}catch(error){showToast(error.message,'error');}
}

function openRoomModal(room = null) {
  const body = `<form id="room-form"><div class="form-grid"><div class="form-field"><label for="room-name">Nombre de la sala</label><input id="room-name" required value="${esc(room?.name||'')}"></div><div class="form-field"><label for="room-type">Tipo de espacio</label><select id="room-type"><option value="MEETING_ROOM" ${room?.type==='MEETING_ROOM'?'selected':''}>Sala de reuniones</option><option value="PRIVATE_OFFICE" ${room?.type==='PRIVATE_OFFICE'?'selected':''}>Oficina privada</option><option value="DESK" ${room?.type==='DESK'?'selected':''}>Escritorio</option></select></div><div class="form-field"><label for="room-capacity">Capacidad</label><input id="room-capacity" type="number" min="1" value="${room?.capacity||4}" required></div><div class="form-field"><label for="room-rate">Tarifa por hora (COP)</label><input id="room-rate" type="number" min="0" step="1000" value="${room?.hourlyRate??50000}" required></div><div class="form-field full"><label for="room-location">Sede</label><select id="room-location" required>${selectOptions(state.locations,room?.location?.id)}</select></div><div class="form-field full"><label>Equipamiento</label><div class="service-checks">${state.equipment.map(e=>`<label class="service-option"><input type="checkbox" name="room-equipment" value="${e.id}" ${safeArray(room?.equipment).some(x=>x.id===e.id)?'checked':''}><span>${esc(e.name)}</span></label>`).join('')}</div></div><div class="form-field full"><label class="checkbox-line"><input id="room-active" type="checkbox" ${room?.active!==false?'checked':''}> Sala activa y disponible para reservar</label></div></div></form>`;
  openModal(room?'Editar sala':'Agregar sala', 'Configura las características del espacio.', body, `<button class="button button-secondary" data-action="close-modal">Cancelar</button><button class="button button-primary" data-action="submit-room" data-id="${room?.id||''}">Guardar sala</button>`);
}
async function submitRoom(id) {
  const form=$('#room-form');if(!form.reportValidity())return;
  const payload={name:$('#room-name').value.trim(),type:$('#room-type').value,capacity:Number($('#room-capacity').value),hourlyRate:Number($('#room-rate').value),active:$('#room-active').checked,locationId:Number($('#room-location').value),equipmentIds:$$('input[name="room-equipment"]:checked',form).map(e=>Number(e.value))};
  try{await api(id?`/api/salas/${id}`:'/api/salas',{method:id?'PUT':'POST',body:payload});closeModal();showToast(id?'Sala actualizada.':'Sala creada correctamente.');await navigate('rooms');}catch(error){showToast(error.message,'error');}
}
async function deleteRoom(id) {
  if(!window.confirm('¿Eliminar esta sala? Si tiene reservas asociadas, el backend podría impedirlo.'))return;
  try{await api(`/api/salas/${id}`,{method:'DELETE'});showToast('Sala eliminada.');await navigate('rooms');}catch(error){showToast(error.message,'error');}
}

function getCatalogData(key) { return key==='sedes'?state.locations:key==='equipos'?state.equipment:key==='planes'?state.plans:state.services; }
function openCatalogModal(item = null) {
  const key=state.catalogTab, edit=Boolean(item);
  let body='';
  if(key==='sedes')body=`<form id="catalog-form"><div class="form-grid"><div class="form-field"><label>Nombre</label><input id="cat-name" required value="${esc(item?.name||'')}"></div><div class="form-field"><label>Ciudad</label><input id="cat-city" required value="${esc(item?.city||'')}"></div><div class="form-field full"><label>Dirección</label><input id="cat-address" value="${esc(item?.address||'')}"></div><div class="form-field"><label>Hora de apertura</label><input id="cat-open" type="time" required value="${timeOnly(item?.openingTime)||'08:00'}"></div><div class="form-field"><label>Hora de cierre</label><input id="cat-close" type="time" required value="${timeOnly(item?.closingTime)||'20:00'}"></div></div></form>`;
  if(key==='equipos'||key==='servicios')body=`<form id="catalog-form"><div class="form-grid"><div class="form-field full"><label>Nombre</label><input id="cat-name" required value="${esc(item?.name||'')}"></div>${key==='servicios'?`<div class="form-field full"><label>Precio unitario (COP)</label><input id="cat-price" type="number" min="0" step="1000" required value="${item?.unitPrice??0}"></div>`:''}</div></form>`;
  if(key==='planes')body=`<form id="catalog-form"><div class="form-grid"><div class="form-field full"><label>Nombre del plan</label><input id="cat-name" required value="${esc(item?.name||'')}"></div><div class="form-field"><label>Horas incluidas al mes</label><input id="cat-hours" type="number" min="0" required value="${item?.includedHoursPerMonth??10}"></div><div class="form-field"><label>Descuento de excedentes (%)</label><input id="cat-discount" type="number" min="0" max="100" required value="${item?.overageDiscount??0}"></div><div class="form-field"><label>Máximo de reservas activas</label><input id="cat-max-bookings" type="number" min="1" required value="${item?.maxActiveBookings??2}"></div></div></form>`;
  openModal(`${edit?'Editar':'Agregar'} ${catalogConfig[key].singular}`, 'Los cambios se guardarán en el catálogo de CoWorkHub.', body, `<button class="button button-secondary" data-action="close-modal">Cancelar</button><button class="button button-primary" data-action="submit-catalog" data-id="${item?.id||''}">Guardar</button>`);
}
async function submitCatalog(id) {
  const key=state.catalogTab;
  let payload={name:$('#cat-name').value.trim()};
  if(key==='sedes')Object.assign(payload,{city:$('#cat-city').value.trim(),address:$('#cat-address').value.trim(),openingTime:$('#cat-open').value+':00',closingTime:$('#cat-close').value+':00'});
  if(key==='servicios')payload.unitPrice=Number($('#cat-price').value);
  if(key==='planes')Object.assign(payload,{includedHoursPerMonth:Number($('#cat-hours').value),overageDiscount:Number($('#cat-discount').value),maxActiveBookings:Number($('#cat-max-bookings').value)});
  if(!$('#catalog-form').reportValidity())return;
  try{await api(`${catalogConfig[key].endpoint}${id?'/'+id:''}`,{method:id?'PUT':'POST',body:payload});closeModal();showToast(id?'Registro actualizado.':'Registro creado correctamente.');await navigate('catalogs');}catch(error){showToast(error.message,'error');}
}
async function deleteCatalog(id) {
  if(!window.confirm('¿Eliminar este registro? Si está siendo utilizado, el backend puede rechazar la operación.'))return;
  try{await api(`${catalogConfig[state.catalogTab].endpoint}/${id}`,{method:'DELETE'});showToast('Registro eliminado.');await navigate('catalogs');}catch(error){showToast(error.message,'error');}
}

async function handleAction(action, id, element) {
  if(action==='new-booking')return openBookingModal();
  if(action==='search-available')return searchAvailableRooms();
  if(action==='submit-booking')return submitBooking();
  if(action==='booking-confirm')return bookingAction(id,'confirm');
  if(action==='booking-complete')return bookingAction(id,'complete');
  if(action==='booking-cancel')return bookingAction(id,'cancel');
  if(action==='booking-detail')return openBookingDetail(id);
  if(action==='new-member')return openMemberModal();
  if(action==='edit-member') { const m=state.members.find(x=>String(x.id)===String(id));return openMemberModal(m); }
  if(action==='submit-member')return submitMember(id);
  if(action==='suspend-member')return memberStatusAction(id,false);
  if(action==='activate-member')return memberStatusAction(id,true);
  if(action==='delete-member')return deleteMember(id);
  if(action==='new-room')return openRoomModal();
  if(action==='edit-room')return openRoomModal(state.rooms.find(x=>String(x.id)===String(id)));
  if(action==='submit-room')return submitRoom(id);
  if(action==='delete-room')return deleteRoom(id);
  if(action==='new-catalog')return openCatalogModal();
  if(action==='edit-catalog')return openCatalogModal(getCatalogData(state.catalogTab).find(x=>String(x.id)===String(id)));
  if(action==='submit-catalog')return submitCatalog(id);
  if(action==='delete-catalog')return deleteCatalog(id);
  if(action==='close-modal')return closeModal();
  if(action==='add-booking-service') {
    const serviceId=Number($('#add-booking-service').value),quantity=Number($('#add-booking-quantity').value);
    try{await api(`/api/reservas/${id}/servicios`,{method:'POST',body:{serviceId,quantity}});showToast('Servicio agregado.');return openBookingDetail(id);}catch(error){return showToast(error.message,'error');}
  }
  if(action==='remove-booking-service') {
    if(!window.confirm('¿Quitar este servicio de la reserva?'))return;
    try{await api(`/api/reservas/${id}/servicios/${element.dataset.serviceId}`,{method:'DELETE'});showToast('Servicio eliminado.');return openBookingDetail(id);}catch(error){return showToast(error.message,'error');}
  }
}

/* Event wiring */
$('#login-form').addEventListener('submit', async event => {
  event.preventDefault();
  const btn=$('#login-form button[type="submit"]');
  const errorNode=$('#login-error');
  errorNode.classList.add('hidden');
  btn.disabled=true;btn.querySelector('span').textContent='Validando...';
  try { await login($('#login-username').value.trim(),$('#login-password').value,$('#api-url').value);showToast(`Bienvenido, ${state.profile.usuario}.`); }
  catch(error){errorNode.textContent=error.message;errorNode.classList.remove('hidden');}
  finally{btn.disabled=false;btn.querySelector('span').textContent='Entrar al panel';}
});
$('#toggle-password').addEventListener('click',()=>{const input=$('#login-password');input.type=input.type==='password'?'text':'password';});
$$('[data-demo-user]').forEach(btn=>btn.addEventListener('click',()=>{$('#login-username').value=btn.dataset.demoUser;$('#login-password').value='password';}));
$('#logout-button').addEventListener('click',()=>logout());
$('#open-sidebar').addEventListener('click',()=>{ $('#sidebar').classList.add('open');let overlay=document.createElement('div');overlay.id='sidebar-overlay';overlay.className='sidebar-overlay';overlay.addEventListener('click',()=>{$('#sidebar').classList.remove('open');overlay.remove();});document.body.append(overlay);});
$('#close-sidebar').addEventListener('click',()=>{$('#sidebar').classList.remove('open');$('#sidebar-overlay')?.remove();});
$('#profile-shortcut').addEventListener('click',()=>{if(isMember())navigate('consumption');else showToast(`${state.profile.usuario} · ${labels[role()]}`,'info');});
$$('.nav-link').forEach(link=>link.addEventListener('click',()=>navigate(link.dataset.page)));
$('#page-content').addEventListener('click',event=>{
  const jump=event.target.closest('[data-page-jump]'); if(jump){navigate(jump.dataset.pageJump);return;}
  const actionEl=event.target.closest('[data-action]');if(actionEl){handleAction(actionEl.dataset.action,actionEl.dataset.id,actionEl);return;}
});
$('#page-content').addEventListener('click',event=>{const tab=event.target.closest('[data-catalog-tab]');if(tab){state.catalogTab=tab.dataset.catalogTab;renderCatalogs();}});
$('#modal-root').addEventListener('click',event=>{
  if(event.target.matches('[data-backdrop]'))closeModal();
  const actionEl=event.target.closest('[data-action]');if(actionEl)handleAction(actionEl.dataset.action,actionEl.dataset.id,actionEl);
});
$('#modal-root').addEventListener('keydown',event=>{if(event.key==='Escape')closeModal();});

document.addEventListener('keydown',event=>{if(event.key==='Escape')closeModal();});

// Restore a still-valid session when the page is reloaded.
(async function bootstrap(){
  $('#api-url').value=apiBase();
  const savedProfile=localStorage.getItem('coworkhub_profile');
  if(state.token){
    try { state.profile=await api('/auth/perfil');localStorage.setItem('coworkhub_profile',JSON.stringify(state.profile));showApp(); }
    catch { logout(false); }
  } else if(savedProfile) localStorage.removeItem('coworkhub_profile');
})();
