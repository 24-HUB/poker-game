const $ = (selector) => document.querySelector(selector);
const views = ['lobby', 'waiting', 'collection', 'invitations'];
let formMode = 'create';
let lastTrigger;
let localRoom;

function showView(name) {
  if (!views.includes(name)) return;
  views.forEach(view => $(`#${view}-view`).hidden = view !== name);
  document.querySelectorAll('.nav-item').forEach(button => {
    const active = button.dataset.view === name || (name === 'waiting' && button.dataset.view === 'lobby');
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  $('#main').focus({preventScroll: true});
  window.scrollTo({top: 0, behavior: 'instant'});
}
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => showView(button.dataset.view)));
$('.brand').addEventListener('click', event => { event.preventDefault(); showView('lobby'); });

function openRoomDialog(mode, source, code = '') {
  formMode = mode; lastTrigger = source;
  const create = mode === 'create';
  $('#dialog-title').textContent = create ? 'Set your table.' : 'A seat is waiting.';
  $('#dialog-description').textContent = create ? 'Give your private table a name. We’ll take you to a sample waiting room.' : 'Paste a preview invitation link or enter its six-character room code.';
  $('#input-label').textContent = create ? 'Room name' : 'Preview room code or link';
  $('#room-input').value = create ? 'The tea table' : code;
  $('#room-input').maxLength = create ? 40 : 300;
  $('#room-input').placeholder = create ? 'Name your table' : 'TEA123';
  $('#input-hint').textContent = create ? '1–40 characters. You can keep the suggested name.' : 'Try TEA123 for the sample room. Codes and links work only in this demo.';
  $('#submit-room').textContent = create ? 'Create preview room' : 'Join preview room';
  $('#sample-room').hidden = create;
  $('#input-error').textContent = '';
  $('#room-input').removeAttribute('aria-invalid');
  $('#room-dialog').showModal(); $('#room-input').focus(); $('#room-input').select();
}
$('#create-room').addEventListener('click', event => openRoomDialog('create', event.currentTarget));
$('#join-room').addEventListener('click', event => openRoomDialog('join', event.currentTarget));
document.querySelectorAll('.close-dialog').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('close', () => lastTrigger?.focus()));
$('#sample-room').addEventListener('click', () => { $('#room-input').value = 'TEA123'; $('#room-input').focus(); $('#input-error').textContent = ''; $('#room-input').removeAttribute('aria-invalid'); });
$('#room-input').addEventListener('input', () => { $('#input-error').textContent = ''; $('#room-input').removeAttribute('aria-invalid'); });

function parseCode(value) {
  if (/^[a-z0-9]{6}$/i.test(value)) return value.toUpperCase();
  try { const url = new URL(value); if (url.origin !== location.origin || url.pathname !== location.pathname) return ''; return (url.searchParams.get('room') || '').toUpperCase(); } catch { return ''; }
}
function openWaiting(room, host) {
  $('#room-name').textContent = room.name;
  $('#room-code').textContent = room.code;
  $('#host-label').textContent = host ? 'Host · Demo' : 'Guest · Demo';
  const url = new URL(location.href); url.search = ''; url.hash = ''; url.searchParams.set('room', room.code);
  $('#room-link').value = url.href;
  $('#copy-feedback').textContent = '';
  showView('waiting');
}
$('#room-form').addEventListener('submit', event => {
  event.preventDefault();
  const input = $('#room-input').value.trim();
  let room;
  let error = '';
  if (formMode === 'create') {
    if (!input || input.length > 40) error = 'Enter a room name between 1 and 40 characters.';
    else { room = {name: input, code: 'LG' + crypto.getRandomValues(new Uint32Array(1))[0].toString(36).toUpperCase().padStart(4, '0').slice(-4)}; localRoom = room; }
  } else {
    const code = parseCode(input);
    if (!/^[A-Z0-9]{6}$/.test(code)) error = 'Enter six letters or numbers, or a valid link from this preview.';
    else if (code !== 'TEA123' && code !== localRoom?.code && code !== new URL(location.href).searchParams.get('room')?.toUpperCase()) error = 'This demo room was not found. Try the sample invitation below.';
    else room = localRoom?.code === code ? localRoom : {name: 'The tea table', code};
  }
  if (error) { $('#input-error').textContent = error; $('#room-input').setAttribute('aria-invalid', 'true'); $('#room-input').focus(); return; }
  $('#room-dialog').close();
  openWaiting(room, formMode === 'create');
});
$('#leave-room').addEventListener('click', () => showView('lobby'));
$('#copy-link').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('#room-link').value); $('#copy-feedback').textContent = 'Preview link copied.'; }
  catch { $('#room-link').focus(); $('#room-link').select(); $('#copy-feedback').textContent = 'Link selected. Copy it with your device’s copy command.'; }
});
function showInfo(title, content, trigger) {
  lastTrigger = trigger; $('#info-title').textContent = title; $('#info-body').innerHTML = content; $('#info-dialog').showModal();
}
$('#tickets').addEventListener('click', event => showInfo('A ticket to something new.', '<p>The 25 tickets shown here are sample data.</p><p>In the game, completed poker hands earn tickets for cosmetic invitations. Poker chips and tickets stay separate. There are no ticket purchases.</p>', event.currentTarget));
$('#how-it-works').addEventListener('click', event => showInfo('A few friends. A deck of cards.', '<ol><li>Create a private room and share its invitation.</li><li>Play Texas Hold’em with two to six friends and equal starting stacks.</li><li>Earn tickets through play, then collect and equip cosmetic avatars and card backs.</li></ol><p>This preview lets you explore creating and joining a room. Live poker and rewards are not connected yet.</p>', event.currentTarget));
const invitedCode = new URL(location.href).searchParams.get('room');
if (invitedCode) openRoomDialog('join', $('#join-room'), invitedCode);
