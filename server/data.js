// server/data.js
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, 'owners.json');

// Load owners from file
function getOwners() {
  if (!fs.existsSync(dataPath)) return [];
  const data = fs.readFileSync(dataPath, 'utf-8');
  return JSON.parse(data || '[]');
}

function findIndex(owners, idOrPhone){
  const index = owners.findIndex(o => o.callId === idOrPhone || o.phone === idOrPhone);
	return index
}


// Find next eligible owner to call
function getNextOwner(owners) {
  return owners.find(o => o.status === 'new' || o.status === 'later');
}

// Save owners to file
function saveOwners(owners) {
  fs.writeFileSync(dataPath, JSON.stringify(owners, null, 2));
}

function updateOwnerStatus(idOrPhone, newStatus) {
  const owners = getOwners();
	const index = findIndex(owners, idOrPhone)
  if (index == -1) return console.warn(`Owner not found for idOrPhone ${idOrPhone}`);

  owners[index].status = newStatus;
  saveOwners(owners);
  console.log(`✅ Updated owner ${owners[index].name} → ${newStatus}`);
}

// Update owner by callId or phone
function updateOwnerInfo( idOrPhone, updates) {
	const owners = getOwners();
  const index =	findIndex(owners, idOrPhone)
  if (index === -1) {
    console.warn(`⚠️ Owner not found for idOrPhone ${idOrPhone}`);
    return;
  }

  owners[index] = { ...owners[index], ...updates };
  saveOwners(owners);
  return owner;
}

module.exports = { findIndex, saveOwners, getOwners, getNextOwner, updateOwnerInfo, updateOwnerStatus };
