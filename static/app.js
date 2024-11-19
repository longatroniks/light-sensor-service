let data = {};
let expandedFloors = {};

function toggleInstructions() {
  const panel = document.getElementById("instructionsPanel");
  const text = document.getElementById("instructionsToggleText");
  panel.classList.toggle("hidden");
  text.textContent = panel.classList.contains("hidden")
    ? "Show Instructions"
    : "Hide Instructions";
}

function showError(message) {
  const alert = document.getElementById("errorAlert");
  document.getElementById("errorMessage").textContent = message;
  alert.classList.remove("hidden");
}

function hideError() {
  document.getElementById("errorAlert").classList.add("hidden");
}

function renderBuilding() {
  const buildingEl = document.getElementById("building");
  buildingEl.innerHTML = "";

  if (Object.keys(data).length === 0) {
    buildingEl.innerHTML =
      '<div class="bg-white rounded-lg shadow-lg p-8 text-center">No floors added yet. Add your first floor to get started!</div>';
    return;
  }

  Object.entries(data).forEach(([floor, floorData]) => {
    const floorEl = document.createElement("div");
    floorEl.className = "bg-white rounded-lg shadow-lg p-4";

    const header = `
      <div class="flex items-center justify-between cursor-pointer" onclick="toggleFloor('${floor}')">
        <div class="flex items-center gap-3">
          <i class="fas fa-building text-blue-600"></i>
          <h2 class="text-xl font-semibold">${floor}</h2>
        </div>
        <i class="fas ${
          expandedFloors[floor] ? "fa-chevron-up" : "fa-chevron-down"
        } text-gray-500"></i>
      </div>
    `;
    floorEl.innerHTML = header;

    if (expandedFloors[floor]) {
      const content = document.createElement("div");
      content.className = "mt-4";

      Object.entries(floorData).forEach(([room, roomData]) => {
        const roomEl = document.createElement("div");
        roomEl.className = "bg-gray-50 rounded-lg p-4 mb-4";

        // Room header
        const roomHeader = `
        <div class="flex justify-between items-center mb-2">
          <div class="flex items-center gap-2">
            <i class="fas fa-door-open text-blue-500 text-sm"></i>
            <h3 class="text-sm font-medium text-gray-700">${room}</h3>
          </div>
          <span class="text-xs text-gray-400">${
            Object.keys(roomData.bulbs).length
          } bulbs</span>
        </div>
      `;

        // Sensor and Controller Data
        const sensorData = roomData.sensor_data
          ? JSON.stringify(roomData.sensor_data, null, 2).replace(/[{}]/g, "")
          : "No data";
        const controllerData = roomData.controller_data
          ? JSON.stringify(roomData.controller_data, null, 2).replace(
              /[{}]/g,
              ""
            )
          : "No data";

        const sensorAndControllerSection = `
          <div class="text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-200">
            <strong class="block mb-1 text-gray-500">Room Data</strong>
            Sensor: ${sensorData} | Controller: ${controllerData}
          </div>
        `;

        roomEl.innerHTML = `
        <div class="bg-white p-3 border border-gray-200 rounded-md shadow-sm">
          ${roomHeader}
          ${sensorAndControllerSection}
        </div>
        `;

        // Bulb information
        const bulbsContainer = document.createElement("div");
        bulbsContainer.className = "flex flex-wrap gap-1 mt-2";
        Object.entries(roomData.bulbs).forEach(([id, bulbData]) => {
          // Extract intensity and capacity
          const { intensity, capacity } = bulbData;

          const bulb = document.createElement("div");
          bulb.className = `flex flex-col items-start px-2 py-1 text-xs rounded-md border ${
            intensity === "off"
              ? "bg-gray-200 text-gray-500 border-gray-300"
              : intensity === "low"
              ? "bg-red-200 text-red-600 border-red-400"
              : intensity === "medium"
              ? "bg-yellow-200 text-yellow-700 border-yellow-400"
              : "bg-green-200 text-green-600 border-green-400"
          }`;

          // Adding the bulb icon, intensity, and capacity details
          bulb.innerHTML = `
            <div class="flex items-center gap-1">
              <i class="fas fa-lightbulb"></i>
              <span>${id}</span>
            </div>
            <div>Intensity: ${intensity}</div>
            <div>Capacity: ${capacity}%</div>
          `;

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
  const floor = document.getElementById("roomFloor").value.trim();
  const room = document.getElementById("newRoom").value.trim();
  if (!floor || !room)
    return showError("Please enter both floor and room names");
  try {
    const response = await fetch("/add_room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ floor, room }),
    });
    if (response.ok) {
      document.getElementById("roomFloor").value = "";
      document.getElementById("newRoom").value = "";
      fetchData(); // Refresh the display
    } else {
      const errorData = await response.json();
      showError(errorData.error || "Failed to add room");
    }
  } catch (error) {
    console.error("Error:", error);
    showError("Failed to add room");
  }
}

async function handleAddFloor() {
  const floorName = document.getElementById("newFloor").value.trim();
  if (!floorName) return showError("Please enter a floor name");

  try {
    const response = await fetch("/add_floor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ floor_name: floorName }),
    });
    if (response.ok) {
      document.getElementById("newFloor").value = "";
      fetchData(); // Refresh the display
    } else {
      const errorData = await response.json();
      showError(errorData.error || "Failed to add floor");
    }
  } catch (error) {
    console.error("Error:", error);
    showError("Failed to add floor");
  }
}

async function handleAddBulb() {
  const floor = document.getElementById("bulbFloor").value.trim();
  const room = document.getElementById("bulbRoom").value.trim();
  const bulbId = document.getElementById("newBulb").value.trim();
  if (!floor || !room || !bulbId)
    return showError("Please enter floor, room, and bulb ID");
  try {
    const response = await fetch("/add_bulb", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ floor, room, bulb_id: bulbId }),
    });
    if (response.ok) {
      document.getElementById("bulbFloor").value = "";
      document.getElementById("bulbRoom").value = "";
      document.getElementById("newBulb").value = "";
      fetchData();
    } else {
      const errorData = await response.json();
      showError(errorData.error || "Failed to add bulb");
    }
  } catch (error) {
    console.error("Error:", error);
    showError("Failed to add bulb");
  }
}

async function fetchData() {
  try {
    const response = await fetch("/data"); // Ensure this matches your Flask route
    data = await response.json();
    renderBuilding();
  } catch (err) {
    showError("Failed to fetch building data");
  }
}

async function handleModeChange() {
  const modeSelector = document.getElementById("sensorModeGlobal");
  const newMode = modeSelector.value;

  try {
    const response = await fetch("/toggle_mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: newMode }), // Update global mode only
    });

    if (!response.ok) {
      const errorData = await response.json();
      showError(errorData.error || "Failed to update global sensor mode");
      return;
    }

    const result = await response.json();
    console.log(result.message);

    // Refresh the data to reflect changes
    fetchData();
  } catch (error) {
    console.error("Error updating global sensor mode:", error);
    showError("Failed to update global sensor mode");
  }
}

document.addEventListener("DOMContentLoaded", fetchData);
setInterval(fetchData, 5000);
