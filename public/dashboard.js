const callBtn = document.getElementById('callBtn');
const autoBtn = document.getElementById('autoBtn');
const numberInput = document.getElementById('numberInput');
const table = document.getElementById('ownersTable');

async function loadOwners() {
  const res = await fetch('/api/owners');
  const owners = await res.json();
  table.innerHTML = owners.map(o => `
    <tr>
      <td>${o.name || ''}</td>
      <td>${o.phone}</td>
      <td>${o.status || ''}</td>
      <td>${o.notes || ''}</td>
      <td>${o.price || ''}</td>
      <td>${o.timing || ''}</td>
      <td>${o.condition || ''}</td>
      <td>${o.lastCallAt ? new Date(o.lastCallAt).toLocaleString() : ''}</td>
    </tr>
  `).join('');
}

callBtn.onclick = async () => {
  const to = numberInput.value.trim();
  if (!to) return alert('Enter a phone number');
  await fetch('/api/call', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to })
  });
};

autoBtn.onclick = async () => {
  await fetch('/api/autoCall', { method: 'POST' });
  alert('Auto-calling started.');
};

setInterval(loadOwners, 5000);
loadOwners();
