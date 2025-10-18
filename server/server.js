const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors');
const dayjs = require('dayjs');
const fs = require('fs');
const { findIndex, saveOwners, getOwners, getNextOwner, updateOwnerStatus } = require('./data');

require('dotenv').config();
const {
  VAPI_API_KEY,
  VAPI_ASSISTANT_ID,
  ACQUISITIONS_LEAD_NUMBER,
  PORT = 3000,
  BASE_URL
} = process.env;

if (!VAPI_API_KEY || !ACQUISITIONS_LEAD_NUMBER || !BASE_URL) {
  console.error('Missing env vars. Check VAPI_API_KEY, ACQUISITIONS_LEAD_NUMBER, BASE_URL');
  process.exit(1);
}

const app = express();
app.use(express.json());
app.use(express.static('public'));

// in-memory store
// [{id, to, status, summary, notes, price, timing, condition, owner, outcome, createdAt}]
const calls = [];
const byId = new Map();

// --- helpers ---
const vapi = axios.create({
	baseURL: 'https://api.vapi.ai',
	headers: { Authorization: `Bearer ${VAPI_API_KEY}` },
});

let owners = getOwners()

async function makeCall(owner) {
  const res = await vapi.post('/call', {
    assistantId: process.env.VAPI_ASSISTANT_ID,
    phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
    customer: { name: owner.name, number: owner.phone },
  });
	// To Do: add callId into json db
  owner.callId = res.data.id;
  owner.status = 'calling';
  updateOwnerStatus(owner.phone, 'called');
  return res.data.id;
}

// Auto call: iterate through owners.json+18882870695
app.post('/api/autoCall', async (req, res) => {
  res.json({ ok: true, message: 'Started auto-call loop' });

  (async function loop() {
    let next;
    while ((next = getNextOwner(owners))) {
      console.log(`📞 Calling ${next.name} at ${next.phone}`);
      await makeCall(next);
      await new Promise(r => setTimeout(r, 6000)); // wait before next
    }
    console.log('✅ All owners processed.');
  })();
});

// Kick off an outbound call based on input number
// !!!To Do!!! the database cucurrency 
app.post('/api/call', async (req, res) => {
  try {
    const { to } = req.body;
    if (!to) return res.status(400).json({ error: 'Missing "to" phone number' });
		const phoneNumber = to.trim();
		// Check if this number already exists in owners list
    const existingIndex = findIndex(owners, phoneNumber)
		if (existingIndex !== -1) {
      const existing = owners[existingIndex];
      // Case 1: currently calling
      if (existing.status === 'calling') {
        return res.json({
          ok: false,
          message: `A colleague is already calling ${phone}.`
        });
      }
      // Case 2: already called
      return res.json({
        ok: false,
        message: `We’ve already called ${phone} (status: ${existing.status}).`
      });
    }
		// Case 3: new number
    const getNextOwnerId = () => {
      if (owners.length === 0) return 1;
      const lastId = Math.max(...owners.map(o => o.id || 0));
      return lastId + 1;
    };
		const owner = {
      id: getNextOwnerId(),
      name: '',
			address: '',
      phone: phoneNumber,
      status: 'new',
    };

    owners.push(owner);
    saveOwners(owners);
    const { data } = await vapi.post('/call', {
      assistantId: process.env.VAPI_ASSISTANT_ID,
      phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
			customer: { name: 'John Doe',number: phoneNumber},
      metadata: { createdAt: new Date().toISOString() }
    });

    const record = {
      id: data.id,
      phoneNumber,
      status: 'started',
      createdAt: new Date().toISOString()
    };

    calls.unshift(record);
    byId.set(data.id, record);
    res.json({ ok: true, callId: data.id });
  } catch (e) {
    console.error(e.response?.data || e.message);
    res.status(500).json({ error: 'Failed to start call' });
  }
})

app.post('/owner/update', async (req, res) => {
  try {
    const { phone, status, notes } = req.body;
    if (!phone || !status) {
      return res.status(400).json({ ok: false, error: 'Missing phone or status' });
    }
		const existingIndex = findIndex(owners, phoneNumber)
		if (!existingIndex) {
      return res.status(404).json({ ok: false, error: 'Owner not found' });
    }
    const owner = owners[existingIndex]

    owner.status = status;
    if (notes) owner.notes = notes;
    owner.lastCallAt = new Date().toISOString();
    saveOwners();

    console.log(`✅ Updated ${phone}: status → ${status}`);
    res.json({ ok: true, message: `Owner ${phone} updated to ${status}` });
  } catch (err) {
    console.error('❌ Error updating owner:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Vapi webhook receiver
app.post('/webhooks/vapi', async (req, res) => {
  // Vapi sends events (call.started, transcript, tool.called, call.ended, etc.)
  const evt = req.body;

	console.log('event record')
	console.log(evt)

  // Track basic lifecycle
  if (evt.type === 'call.started') {
    call.status = 'in_progress';
  }

  if (evt.type === 'end-of-call-report') {
    call.status = 'completed';
    call.endedAt = new Date().toISOString();
  }

  // Always 200 OK for unhandled events
  res.json({ ok: true });
});



// Endpoint for dashboard fetch
app.get('/api/owners', (req, res) => {
  res.json(owners);
});


app.listen(PORT, () => {
  console.log(`Vanessa demo server on http://localhost:${PORT}`);
});
