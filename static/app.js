let data = {};
let expandedFloors = {};

function toggleInstructions() {
  const panel = document.getElementById('instructionsPanel');
  const text = document.getElementById('instructionsToggleText');
  panel.classList.toggle('hidden');
  text.textContent = panel.classList.contains('hidden') ? 'Show Instructions' : 'Hide Instructions';
}

function showError(message) {
  const alert = document.getElementById('errorAlert');
  document.getElementById('errorMessage').textContent = message;
  alert.classList.remove('hidden');
}

function hideError() {
  document.getElementById('errorAlert').classList.add('hidden');
}

async function fetchData() {
  try {
    const response = await fetch('/data');
    data = await response.json();
    renderBuilding();
  } catch (err) {
    showError('Failed to fetch building data');
  }
}

function renderBuilding() {
  const buildingEl = document.getElementById('building');
  buildingEl.innerHTML = '';

  if (Object.keys(data).length === 0) {
    buildingEl.innerHTML = '<div class="bg-white rounded-lg shadow-lg p-8 text-center">No floors added yet. Add your first floor to get started!</div>';
    return;
  }

  Object.entries(data).forEach(([floor, floorData]) => {
    const floorEl = document.createElement('div');
    floorEl.className = 'bg-white rounded-lg shadow-lg p-4';

    const header = `
      <div class="flex items-center justify-between cursor-pointer" onclick="toggleFloor('${floor}')">
        <div class="flex items-center gap-3">
          <i class="fas fa-building text-blue-600"></i>
          <h2 class="text-xl font-semibold">${floor}</h2>
        </div>
        <i class="fas ${expandedFloors[floor] ? 'fa-chevron-up' : 'fa-chevron-down'} text-gray-500"></i>
      </div>
    `;
    floorEl.innerHTML = header;

    if (expandedFloors[floor]) {
      const content = document.createElement('div');
      content.className = 'mt-4';
      Object.entries(floorData).forEach(([room, roomData]) => {
        const roomEl = document.createElement('div');
        roomEl.className = 'bg-gray-50 rounded-lg p-4 mb-4';

        const roomHeader = `
          <div class="flex items-center justify-between">
            <h3 class="font-semibold text-lg">${room}</h3>
            <span class="text-sm text-gray-500">${Object.keys(roomData.bulbs).length} bulbs</span>
          </div>
        `;
        roomEl.innerHTML = roomHeader;

        const sensorData = `<p class="text-sm text-gray-600">Sensor Data: ${JSON.stringify(roomData.sensor_data)}</p>`;
        const controllerData = `<p class="text-sm text-gray-600">Controller Data: ${JSON.stringify(roomData.controller_data)}</p>`;
        roomEl.innerHTML += sensorData + controllerData;

        const bulbsContainer = document.createElement('div');
        bulbsContainer.className = 'mt-4 flex flex-wrap gap-2';
        Object.entries(roomData.bulbs).forEach(([id, intensity]) => {
          const bulb = document.createElement('div');
          bulb.className = `flex items-center gap-2 px-3 py-1 rounded-full ${
            intensity === 'low' ? 'bg-red-50 text-red-500' :
            intensity === 'medium' ? 'bg-yellow-50 text-yellow-500' :
            'bg-green-50 text-green-500'
          }`;
          bulb.innerHTML = `<i class="fas fa-lightbulb"></i><span class="text-sm font-medium">Bulb ${id}: ${intensity}</span>`;
          bulbsContainer.appendChild(bulb);
        });
        roomEl.appendChild(bulbsContainer);
        content.appendChild(roomEl);
      });
      floorEl.appendChild(content);
    }

    buildingEl.appendChild(floorEl);
  });
}

function toggleFloor(floor) {
  expandedFloors[floor] = !expandedFloors[floor];
  renderBuilding();
}

async function handleAddRoom() {
  const floor = document.getElementById('roomFloor').value.trim();
  const room = document.getElementById('newRoom').value.trim();
  if (!floor || !room) return showError('Please enter both floor and room names');
  try {
    const response = await fetch('/add_room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ floor, room })
    });
    if (response.ok) {
      document.getElementById('roomFloor').value = '';
      document.getElementById('newRoom').value = '';
      fetchData();  // Refresh the display
    } else {
      const errorData = await response.json();
      showError(errorData.error || 'Failed to add room');
    }
  } catch (error) {
    console.error('Error:', error);
    showError('Failed to add room');
  }
}

async function handleAddFloor() {
    const floorName = document.getElementById('newFloor').value.trim();
    if (!floorName) return showError('Please enter a floor name');
    
    try {
      const response = await fetch('/add_floor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ floor_name: floorName })
      });
      if (response.ok) {
        console.log(`Floor "${floorName}" added successfully.`);
        document.getElementById('newFloor').value = '';
        fetchData();  // Refresh the display
      } else {
        const errorData = await response.json();
        console.error('Error:', errorData);
        showError(errorData.error || 'Failed to add floor');
      }
    } catch (error) {
      console.error('Error:', error);
      showError('Failed to add floor');
    }
  }
  

async function handleAddBulb() {
  const floor = document.getElementById('bulbFloor').value.trim();
  const room = document.getElementById('bulbRoom').value.trim();
  const bulbId = document.getElementById('newBulb').value.trim();
  if (!floor || !room || !bulbId) return showError('Please enter floor, room, and bulb ID');
  try {
    await fetch('/add_bulb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ floor, room, bulb_id: bulbId })
    });
    document.getElementById('bulbFloor').value = '';
    document.getElementById('bulbRoom').value = '';
    document.getElementById('newBulb').value = '';
    fetchData();
  } catch {
    showError('Failed to add bulb');
  }
}

async function handleModeChange(floor, room) {
  const selectEl = document.getElementById(`sensorMode_${floor}_${room}`);
  const newMode = selectEl.value;

  console.log("Sending mode change request:", { floor, room, mode: newMode }); // Debugging line

  try {
      const response = await fetch('/toggle_mode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ floor, room, mode: newMode }) // Correct payload
      });

      const result = await response.json();
      if (!response.ok) {
          console.error("Error:", result.error);
          showError(result.error || 'Failed to update sensor mode');
      } else {
          console.log(result.message);
      }
  } catch (error) {
      console.error('Error updating sensor mode:', error);
      showError('Failed to update sensor mode');
  }
}

document.addEventListener('DOMContentLoaded', fetchData);
setInterval(fetchData, 5000);
