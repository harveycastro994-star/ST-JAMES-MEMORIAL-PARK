function login() {

    const role = document.getElementById("role").value;
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    // Administrator
    if(role === "admin"){

        if(username === "admin" && password === "admin123"){

            window.location.href = "admin.html";

        }else{

            alert("Invalid Administrator Username or Password.");

        }

    }

    // Visitor
    else if(role === "visitor"){

        if(username === "visitor" && password === "visitor123"){

            window.location.href = "user.html";

        }else{

            alert("Invalid Visitor Username or Password.");

        }

    }

    else{

        alert("Please select a role.");

    }

}

const BURIAL_DB_KEY = "stjames.db";
const INDEXEDDB_NAME = "StJamesMemorialParkDB";
const INDEXEDDB_VERSION = 1;
const INDEXEDDB_STORE = "burial_records";
const defaultBurialRecords = [
    { id: "001", name: "Clance Yhvan Cruz", block: "Block A", plot: "A-024", date: "January 15, 2025", status: "Occupied", cleanliness: "Clean", lat: 14.5995, lng: 120.9842 },
    { id: "002", name: "Maria Elena Santos", block: "Block C", plot: "C-015", date: "February 3, 2025", status: "Occupied", cleanliness: "Dirty", lat: 14.6004, lng: 120.9831 },
    { id: "003", name: "Juan Dela Cruz", block: "Block D", plot: "D-010", date: "March 12, 2025", status: "Reserved", cleanliness: "Clean", lat: 14.5988, lng: 120.9853 },
    { id: "004", name: "Rosa B. Fernandez", block: "Block B", plot: "B-007", date: "April 18, 2025", status: "Available", cleanliness: "Dirty", lat: 14.6011, lng: 120.9860 },
    { id: "005", name: "Emilio R. Torres", block: "Block E", plot: "E-021", date: "May 5, 2025", status: "Occupied", cleanliness: "Clean", lat: 14.5979, lng: 120.9838 }
];

let burialRecords = [];
let editingRecordId = null;

function openBurialDatabase() {
    return new Promise((resolve) => {
        if (typeof window === "undefined" || !window.indexedDB) {
            resolve(null);
            return;
        }

        const request = window.indexedDB.open(INDEXEDDB_NAME, INDEXEDDB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(INDEXEDDB_STORE)) {
                db.createObjectStore(INDEXEDDB_STORE, { keyPath: "id" });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
            console.warn("Unable to open IndexedDB:", request.error);
            resolve(null);
        };
        request.onblocked = () => {
            console.warn("IndexedDB open blocked");
            resolve(null);
        };
    });
}

function getBurialRecordsFromDB() {
    return new Promise(async (resolve) => {
        const db = await openBurialDatabase();
        if (!db) {
            resolve(null);
            return;
        }

        const transaction = db.transaction(INDEXEDDB_STORE, "readonly");
        const store = transaction.objectStore(INDEXEDDB_STORE);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => {
            console.warn("Unable to read burial records from IndexedDB:", request.error);
            resolve(null);
        };
    });
}

function saveBurialRecordsToDB(records) {
    return new Promise(async (resolve) => {
        const db = await openBurialDatabase();
        if (!db) {
            resolve();
            return;
        }

        const transaction = db.transaction(INDEXEDDB_STORE, "readwrite");
        const store = transaction.objectStore(INDEXEDDB_STORE);

        const clearRequest = store.clear();
        clearRequest.onerror = () => console.warn("Unable to clear IndexedDB store:", clearRequest.error);

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => {
            console.warn("Unable to save burial records to IndexedDB:", transaction.error);
            resolve();
        };
        transaction.onabort = () => resolve();

        records.forEach((record) => {
            store.put(record);
        });
    });
}

async function getBurialRecordsFromFile() {
    if (typeof fetch !== "function") {
        return null;
    }

    try {
        const response = await fetch("stjames.db");
        if (!response.ok) {
            return null;
        }

        const records = await response.json();
        return Array.isArray(records) ? records : null;
    } catch (error) {
        console.warn("Unable to load burial records from stjames.db:", error);
        return null;
    }
}

function downloadBurialDatabaseFile() {
    const blob = new Blob([JSON.stringify(burialRecords, null, 4)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "stjames.db";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

async function loadBurialRecords() {
    try {
        const dbRecords = await getBurialRecordsFromDB();
        if (Array.isArray(dbRecords) && dbRecords.length > 0) {
            return dbRecords;
        }

        const storedRecords = JSON.parse(localStorage.getItem(BURIAL_DB_KEY) || "null");
        if (Array.isArray(storedRecords) && storedRecords.length > 0) {
            await saveBurialRecordsToDB(storedRecords);
            return storedRecords;
        }

        const fileRecords = await getBurialRecordsFromFile();
        if (Array.isArray(fileRecords) && fileRecords.length > 0) {
            await saveBurialRecordsToDB(fileRecords);
            try {
                localStorage.setItem(BURIAL_DB_KEY, JSON.stringify(fileRecords));
            } catch (error) {
                console.warn("Unable to save file-based records to localStorage:", error);
            }
            return fileRecords;
        }

        await saveBurialRecordsToDB(defaultBurialRecords);
        try {
            localStorage.setItem(BURIAL_DB_KEY, JSON.stringify(defaultBurialRecords));
        } catch (error) {
            console.warn("Unable to save default burial records to localStorage:", error);
        }
    } catch (error) {
        console.warn("Unable to load burial records:", error);
    }

    return defaultBurialRecords;
}

async function saveBurialRecords() {
    try {
        localStorage.setItem(BURIAL_DB_KEY, JSON.stringify(burialRecords));
    } catch (error) {
        console.warn("Unable to save burial records to localStorage:", error);
    }

    await saveBurialRecordsToDB(burialRecords);
}

const RECENT_SEARCHES_KEY = "recentBurialSearches";
const GRAVE_CONDITION_NOTIFICATIONS_KEY = "graveConditionNotifications";
let cemeteryMap = null;
let currentMarker = null;
let adminMap = null;
let adminMarker = null;
let cemeteryMarkersLayer = null;
let adminMarkersLayer = null;
let cemeteryLocationMarker = null;
let activeRecordMode = "add";
const PLARIDEL_CEMETERY_COORDINATES = [14.8830, 120.8614];

function getRecentSearches() {
    try {
        return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || "[]");
    } catch (error) {
        return [];
    }
}

function saveRecentSearches(searches) {
    try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
    } catch (error) {
        console.warn("Unable to save recent searches:", error);
    }
}

function getGraveConditionNotifications() {
    try {
        return JSON.parse(localStorage.getItem(GRAVE_CONDITION_NOTIFICATIONS_KEY) || "[]");
    } catch (error) {
        console.warn("Unable to load grave condition notifications:", error);
        return [];
    }
}

function saveGraveConditionNotifications(notifications) {
    try {
        localStorage.setItem(GRAVE_CONDITION_NOTIFICATIONS_KEY, JSON.stringify(notifications));
    } catch (error) {
        console.warn("Unable to save grave condition notifications:", error);
    }
}

function addGraveConditionNotification(record, oldCondition, newCondition) {
    const notifications = getGraveConditionNotifications();
    const notification = {
        id: `${record.id}-${Date.now()}`,
        name: record.name,
        plot: record.plot,
        oldCondition,
        newCondition,
        timestamp: Date.now(),
    };

    const updatedNotifications = [notification, ...notifications].slice(0, 5);
    saveGraveConditionNotifications(updatedNotifications);
}

function renderConditionNotifications() {
    const listElement = document.getElementById("conditionNotificationList");
    const badgeElement = document.getElementById("notificationBadge");
    if (!listElement) {
        return;
    }

    const notifications = getGraveConditionNotifications();
    const count = notifications.length;

    if (badgeElement) {
        badgeElement.textContent = count > 0 ? count : "";
        badgeElement.style.display = count > 0 ? "inline-block" : "none";
    }

    if (notifications.length === 0) {
        listElement.innerHTML = `<div class="notification-empty">No condition updates yet.</div>`;
        return;
    }

    listElement.innerHTML = notifications.map((item) => `
        <div class="notification-item">
            <p><strong>${item.name}</strong> (${item.plot}) grave condition changed from <strong>${item.oldCondition}</strong> to <strong>${item.newCondition}</strong>.</p>
            <span>${new Date(item.timestamp).toLocaleString()}</span>
        </div>
    `).join("");
}

function findBurialRecord(query) {
    const searchTerm = query.trim().toLowerCase();

    if (!searchTerm) {
        return null;
    }

    return burialRecords.find((record) => {
        const fullName = record.name.toLowerCase();
        return fullName === searchTerm || fullName.includes(searchTerm);
    }) || null;
}

function updateBurialDetails(record) {
    const nameElement = document.getElementById("burialName");
    const blockElement = document.getElementById("burialBlock");
    const plotElement = document.getElementById("burialPlot");
    const dateElement = document.getElementById("burialDate");
    const statusElement = document.getElementById("burialStatus");

    if (!nameElement || !blockElement || !plotElement || !dateElement || !statusElement) {
        return;
    }

    if (!record) {
        nameElement.textContent = "No matching record found";
        blockElement.textContent = "-";
        plotElement.textContent = "-";
        dateElement.textContent = "-";
        statusElement.textContent = "Not found";
        return;
    }

    nameElement.textContent = record.name;
    blockElement.textContent = record.block;
    plotElement.textContent = record.plot;
    dateElement.textContent = record.date;
    statusElement.textContent = record.status;

    if (record.lat !== undefined && record.lng !== undefined) {
        focusBurialOnMap(record);
    }
}

function createCemeteryLocationIcon() {
    return L.divIcon({
        html: '<div class="cemetery-location-marker"></div>',
        className: "",
        iconSize: [22, 22],
        iconAnchor: [11, 11]
    });
}

function renderBurialMarkers(map, layerGroup, records) {
    if (!map || !layerGroup) {
        return;
    }

    layerGroup.clearLayers();

    records.forEach((record) => {
        if (record.lat === undefined || record.lng === undefined) {
            return;
        }

        const marker = L.marker([record.lat, record.lng]).addTo(layerGroup);

        marker.bindPopup(`<strong>${record.name}</strong><br>${record.block} • Plot ${record.plot}<br>Status: ${record.status}`);
        marker.on("click", () => {
            if (map === cemeteryMap) {
                updateBurialDetails(record);
            }
            if (map === adminMap) {
                focusAdminRecord(record);
            }
        });
    });
}

function renderMapMarkers() {
    if (cemeteryMap) {
        if (!cemeteryMarkersLayer) {
            cemeteryMarkersLayer = L.layerGroup().addTo(cemeteryMap);
        }
        renderBurialMarkers(cemeteryMap, cemeteryMarkersLayer, burialRecords);
    }

    if (adminMap) {
        if (!adminMarkersLayer) {
            adminMarkersLayer = L.layerGroup().addTo(adminMap);
        }
        renderBurialMarkers(adminMap, adminMarkersLayer, burialRecords);
    }
}

function initializeMap() {
    const mapElement = document.getElementById("map");

    if (!mapElement || typeof L === "undefined") {
        return;
    }

    if (cemeteryMap) {
        cemeteryMap.invalidateSize();
        renderMapMarkers();
        return;
    }

    cemeteryMap = L.map("map", {
        zoomControl: true
    }).setView([14.8829944, 120.8613913], 20);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 22,
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(cemeteryMap);

    cemeteryMarkersLayer = L.layerGroup().addTo(cemeteryMap);
    cemeteryLocationMarker = L.marker(PLARIDEL_CEMETERY_COORDINATES, {
        icon: createCemeteryLocationIcon()
    }).addTo(cemeteryMap);
    cemeteryLocationMarker.bindPopup("Plaridel Cemetery<br>Philippines");

    setTimeout(() => {
        cemeteryMap.invalidateSize();
        cemeteryMap.setView(PLARIDEL_CEMETERY_COORDINATES, 20);
    }, 200);

    renderMapMarkers();
    focusBurialOnMap(burialRecords[0]);
}

function initializeAdminMap() {
    const adminMapElement = document.getElementById("adminMap");

    if (!adminMapElement || typeof L === "undefined") {
        return;
    }

    if (adminMap) {
        adminMap.invalidateSize();
        renderMapMarkers();
        return;
    }

    adminMap = L.map("adminMap", {
        zoomControl: true
    }).setView([14.8829944, 120.8613913], 20);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 22,
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(adminMap);

    adminMarkersLayer = L.layerGroup().addTo(adminMap);
    cemeteryLocationMarker = L.marker(PLARIDEL_CEMETERY_COORDINATES, {
        icon: createCemeteryLocationIcon()
    }).addTo(adminMap);
    cemeteryLocationMarker.bindPopup("Plaridel Cemetery<br>Philippines");

    adminMarker = L.marker(PLARIDEL_CEMETERY_COORDINATES).addTo(adminMap);
    adminMarker.bindPopup("Current cemetery coordinate");

    setTimeout(() => {
        adminMap.invalidateSize();
        adminMap.setView(PLARIDEL_CEMETERY_COORDINATES, 20);
    }, 200);

    renderMapMarkers();

    adminMap.on("move", () => {
        const center = adminMap.getCenter();
        const latitudeElement = document.getElementById("adminLatitude");
        const longitudeElement = document.getElementById("adminLongitude");

        if (latitudeElement) {
            latitudeElement.textContent = center.lat.toFixed(6);
        }

        if (longitudeElement) {
            longitudeElement.textContent = center.lng.toFixed(6);
        }
    });
}

function focusAdminRecord(record) {
    if (!adminMap || !record || record.lat === undefined || record.lng === undefined) {
        return;
    }

    if (adminMarker) {
        adminMarker.setLatLng([record.lat, record.lng]);
        adminMarker.bindPopup(`<strong>${record.name}</strong><br>${record.block} • Plot ${record.plot}`);
    } else {
        adminMarker = L.marker([record.lat, record.lng]).addTo(adminMap);
        adminMarker.bindPopup(`<strong>${record.name}</strong><br>${record.block} • Plot ${record.plot}`);
    }

    adminMap.setView([record.lat, record.lng], 16);
    adminMarker.openPopup();

    const latitudeElement = document.getElementById("adminLatitude");
    const longitudeElement = document.getElementById("adminLongitude");

    if (latitudeElement) {
        latitudeElement.textContent = record.lat.toFixed(6);
    }

    if (longitudeElement) {
        longitudeElement.textContent = record.lng.toFixed(6);
    }
}

function findMatchingRecord(query) {
    const searchTerm = query.trim().toLowerCase();

    if (!searchTerm) {
        return null;
    }

    return burialRecords.find((record) => {
        const fullName = record.name.toLowerCase();
        const block = record.block.toLowerCase();
        const plot = record.plot.toLowerCase();
        return fullName === searchTerm || block === searchTerm || plot === searchTerm || fullName.includes(searchTerm) || block.includes(searchTerm) || plot.includes(searchTerm);
    }) || null;
}

function filterAdminRecords(searchValue) {
    const rows = document.querySelectorAll("#burialRecordsTableBody tr");
    const query = searchValue.trim().toLowerCase();
    let matchedRecord = null;

    rows.forEach((row) => {
        const rowName = (row.dataset.name || "").toLowerCase();
        const rowBlock = (row.dataset.block || "").toLowerCase();
        const rowPlot = (row.dataset.plot || "").toLowerCase();
        const isMatch = !query || rowName === query || rowBlock === query || rowPlot === query || rowName.includes(query) || rowBlock.includes(query) || rowPlot.includes(query);

        row.classList.toggle("table-row-hidden", !isMatch);
        row.classList.toggle("table-row-highlight", isMatch && query);

        if (isMatch && query && !matchedRecord) {
            matchedRecord = findMatchingRecord(query);
        }
    });

    if (matchedRecord) {
        focusAdminRecord(matchedRecord);
    }
}

function focusBurialOnMap(record) {
    if (!cemeteryMap || !record || record.lat === undefined || record.lng === undefined) {
        return;
    }

    if (currentMarker) {
        cemeteryMap.removeLayer(currentMarker);
    }

    currentMarker = L.marker([record.lat, record.lng]).addTo(cemeteryMap);
    currentMarker.bindPopup(`<strong>${record.name}</strong><br>${record.block} • Plot ${record.plot}`);
    cemeteryMap.setView([record.lat, record.lng], 16);
}

function renderRecentSearches() {
    const listElement = document.getElementById("recentSearchesList");

    if (!listElement) {
        return;
    }

    const searches = getRecentSearches();

    if (searches.length === 0) {
        listElement.innerHTML = `
            <div class="activity">
                <i class="fa-solid fa-clock-rotate-left"></i>
                <div>
                    <h4>No recent searches yet</h4>
                    <p>Search a name to see burial results here.</p>
                </div>
                <span>Ready</span>
            </div>
        `;
        return;
    }

    listElement.innerHTML = searches.map((item) => `
        <div class="activity">
            <i class="fa-solid fa-clock-rotate-left"></i>
            <div>
                <h4>${item.name}</h4>
                <p>${item.block} • Plot ${item.plot}</p>
            </div>
            <span>Recent</span>
        </div>
    `).join("");
}

function addRecentSearch(record) {
    const searches = getRecentSearches();
    const updatedSearches = [record, ...searches.filter((item) => item.name !== record.name)].slice(0, 5);
    saveRecentSearches(updatedSearches);
    renderRecentSearches();
}

function searchBurialRecord() {
    const input = document.getElementById("burialSearchInput");

    if (!input) {
        return;
    }

    const query = input.value;
    const record = findMatchingRecord(query);

    if (!query.trim()) {
        alert("Please enter a deceased name.");
        return;
    }

    updateBurialDetails(record);

    // Ensure the cemetery/user map recenters to the found record
    if (record && typeof focusBurialOnMap === 'function') {
        focusBurialOnMap(record);
    }

    if (record) {
        addRecentSearch(record);
    } else {
        renderRecentSearches();
    }
}

function toggleAddRecordModal(show) {
    const modal = document.getElementById("addRecordModal");

    if (!modal) {
        return;
    }

    modal.classList.toggle("hidden", !show);
    if (!show) {
        // ensure we remove any temporary listeners/state when closing
        try { resetRecordForm(); } catch (e) {}
    }
}

function normalizeDateValue(value) {
    const parsedDate = new Date(value);
    if (!Number.isNaN(parsedDate.getTime())) {
        return parsedDate.toISOString().split("T")[0];
    }
    return value;
}

function formatDisplayDate(value) {
    const parsedDate = new Date(value);
    if (!Number.isNaN(parsedDate.getTime())) {
        return parsedDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    }
    return value;
}

function updateDashboardStats() {
    const totalBurials = document.getElementById("statsTotalBurials");
    const occupiedPlots = document.getElementById("statsOccupiedPlots");
    const availablePlots = document.getElementById("statsAvailablePlots");
    const reservedPlots = document.getElementById("statsReservedPlots");

    if (totalBurials) {
        totalBurials.textContent = burialRecords.length.toString();
    }

    if (occupiedPlots) {
        occupiedPlots.textContent = burialRecords.filter((record) => record.status === "Occupied").length.toString();
    }

    if (availablePlots) {
        availablePlots.textContent = burialRecords.filter((record) => record.status === "Available").length.toString();
    }

    if (reservedPlots) {
        reservedPlots.textContent = burialRecords.filter((record) => record.status === "Reserved").length.toString();
    }
}

function formatRelativeActivityTime(timestamp) {
    const diffMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));

    if (diffMinutes < 1) {
        return "Just now";
    }

    if (diffMinutes < 60) {
        return `${diffMinutes} min ago`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
        return `${diffHours} hr${diffHours === 1 ? "" : "s"} ago`;
    }

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) {
        return "Yesterday";
    }

    return `${diffDays} days ago`;
}

function renderRecentBurialActivity() {
    const activityList = document.getElementById("recentBurialActivityList");

    if (!activityList) {
        return;
    }

    const latestRecord = burialRecords[0];
    const updatedRecord = burialRecords[1];
    const mappedRecord = burialRecords[2];

    const activities = [];

    if (latestRecord) {
        activities.push({
            icon: "fa-solid fa-user-plus",
            title: "New Burial Record Added",
            description: `${latestRecord.name} • ${latestRecord.block} • Plot ${latestRecord.plot}`,
            timestamp: Date.now() - 5 * 60000
        });
    }

    if (updatedRecord) {
        activities.push({
            icon: "fa-solid fa-pen",
            title: "Burial Record Updated",
            description: `${updatedRecord.name} • ${updatedRecord.block} • Plot ${updatedRecord.plot}`,
            timestamp: Date.now() - 2 * 60 * 60000
        });
    }

    if (mappedRecord) {
        activities.push({
            icon: "fa-solid fa-map-location-dot",
            title: "GIS Map Updated",
            description: `${mappedRecord.block} • ${mappedRecord.plot} • ${mappedRecord.status}`,
            timestamp: Date.now() - 24 * 60 * 60000
        });
    }

    if (activities.length === 0) {
        activityList.innerHTML = '<div class="activity"><p>No recent activity yet.</p></div>';
        return;
    }

    activityList.innerHTML = activities.map((activity) => `
        <div class="activity">
            <i class="${activity.icon}"></i>
            <div>
                <h4>${activity.title}</h4>
                <p>${activity.description}</p>
            </div>
            <span>${formatRelativeActivityTime(activity.timestamp)}</span>
        </div>
    `).join("");
}

function renderBurialRecordsTable() {
    const tableBody = document.getElementById("burialRecordsTableBody");
    renderMapMarkers();

    if (!tableBody) {
        return;
    }

    tableBody.innerHTML = burialRecords.map((record) => `
        <tr data-name="${record.name}" data-block="${record.block}" data-plot="${record.plot}">
            <td>${record.id}</td>
            <td>${record.name}</td>
            <td>${record.block.replace("Block ", "")}</td>
            <td>${record.plot}</td>
            <td>${record.date}</td>
            <td><span class="status ${record.status.toLowerCase()}">${record.status}</span></td>
            <td>
                <button class="table-action-btn" data-action="edit" data-record-id="${record.id}">Edit</button>
                <button class="table-action-btn" data-action="view" data-record-id="${record.id}">View</button>
                <button class="table-action-btn delete-btn" data-action="delete" data-record-id="${record.id}">Remove</button>
            </td>
        </tr>
    `).join("");

    updateDashboardStats();
}

function getReservationCounts() {
    return {
        reserved: burialRecords.filter((record) => record.status === "Reserved").length,
        available: burialRecords.filter((record) => record.status === "Available").length,
        occupied: burialRecords.filter((record) => record.status === "Occupied").length,
    };
}

function updateUserReservationStats() {
    const counts = getReservationCounts();
    const reservedCount = document.getElementById("userReservedCount");
    const availableCount = document.getElementById("userAvailableCount");
    const occupiedCount = document.getElementById("userOccupiedCount");

    if (reservedCount) {
        reservedCount.textContent = counts.reserved.toString();
    }
    if (availableCount) {
        availableCount.textContent = counts.available.toString();
    }
    if (occupiedCount) {
        occupiedCount.textContent = counts.occupied.toString();
    }
}

function updateAdminReservationStats() {
    const counts = getReservationCounts();
    const reservedCount = document.getElementById("adminReservedCount");
    const availableCount = document.getElementById("adminAvailableCount");
    const occupiedCount = document.getElementById("adminOccupiedCount");

    if (reservedCount) {
        reservedCount.textContent = counts.reserved.toString();
    }
    if (availableCount) {
        availableCount.textContent = counts.available.toString();
    }
    if (occupiedCount) {
        occupiedCount.textContent = counts.occupied.toString();
    }
}

function getDisplayName(record) {
    if (!record) {
        return "";
    }

    return record.status === "Available" ? "Available Plot" : record.name || "";
}

function renderUserReservations() {
    const tableBody = document.getElementById("reservationUserTableBody");
    if (!tableBody) {
        return;
    }

    tableBody.innerHTML = burialRecords.map((record) => `
        <tr data-name="${record.name}" data-block="${record.block}" data-plot="${record.plot}">
            <td>${record.id}</td>
            <td>${getDisplayName(record)}</td>
            <td>${record.block.replace("Block ", "")}</td>
            <td>${record.plot}</td>
            <td><span class="status ${record.status.toLowerCase()}">${record.status}</span></td>
            <td>
                <button class="table-action-btn" data-action="reservation" data-record-id="${record.id}" ${record.status !== "Available" ? "disabled" : ""}>
                    ${record.status === "Available" ? "Reserve" : "Unavailable"}
                </button>
            </td>
        </tr>
    `).join("");

    updateUserReservationStats();
}

function renderAdminReservations() {
    const tableBody = document.getElementById("reservationsAdminTableBody");
    if (!tableBody) {
        return;
    }

    tableBody.innerHTML = burialRecords.map((record) => `
        <tr data-name="${record.name}" data-block="${record.block}" data-plot="${record.plot}">
            <td>${record.id}</td>
            <td>${getDisplayName(record)}</td>
            <td>${record.block.replace("Block ", "")}</td>
            <td>${record.plot}</td>
            <td><span class="status ${record.status.toLowerCase()}">${record.status}</span></td>
            <td>
                <button class="table-action-btn" data-action="toggle-reservation" data-record-id="${record.id}">
                    ${record.status === "Reserved" ? "Release" : record.status === "Available" ? "Reserve" : "Locked"}
                </button>
            </td>
        </tr>
    `).join("");

    updateAdminReservationStats();
}

async function changeReservationStatus(recordId, newStatus) {
    const record = burialRecords.find((item) => item.id === recordId);
    if (!record) {
        return;
    }

    record.status = newStatus;
    await saveBurialRecords();
    renderMapMarkers();
    renderUserReservations();
    renderAdminReservations();
    updateDashboardStats();
}

async function reserveBurialRecord(recordId) {
    const record = burialRecords.find((item) => item.id === recordId);
    if (!record || record.status !== "Available") {
        return;
    }

    record.status = "Reserved";
    await saveBurialRecords();
    renderUserReservations();
    renderAdminReservations();
    updateDashboardStats();
    alert(`Plot ${record.plot} has been reserved successfully.`);
}

async function toggleReservationForAdmin(recordId) {
    const record = burialRecords.find((item) => item.id === recordId);
    if (!record) {
        return;
    }

    if (record.status === "Reserved") {
        const confirmed = confirm(`Release reservation for ${record.name || "this plot"} (Plot ${record.plot})?`);
        if (!confirmed) {
            return;
        }
        record.status = "Available";
        record.name = "";
    } else if (record.status === "Available") {
        record.status = "Reserved";
    } else {
        alert("Occupied plots cannot be reserved or released.");
        return;
    }

    await saveBurialRecords();
    renderAdminReservations();
    renderUserReservations();
    renderMapMarkers();
    updateDashboardStats();
}

function filterReservationRows(tableBodyId, query) {
    const rows = document.querySelectorAll(`#${tableBodyId} tr`);
    const normalizedQuery = query.trim().toLowerCase();

    rows.forEach((row) => {
        const name = (row.dataset.name || "").toLowerCase();
        const block = (row.dataset.block || "").toLowerCase();
        const plot = (row.dataset.plot || "").toLowerCase();
        const isMatch = !normalizedQuery || name.includes(normalizedQuery) || block.includes(normalizedQuery) || plot.includes(normalizedQuery);
        row.style.display = isMatch ? "table-row" : "none";
    });
}

function initializeUserReservations() {
    const body = document.getElementById("reservationUserPage");
    if (!body) {
        return;
    }

    const searchInput = document.getElementById("reservationSearchInput");
    const tableBody = document.getElementById("reservationUserTableBody");

    renderUserReservations();

    if (searchInput) {
        searchInput.addEventListener("input", (event) => filterReservationRows("reservationUserTableBody", event.target.value));
        searchInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                filterReservationRows("reservationUserTableBody", searchInput.value);
            }
        });
    }

    if (tableBody) {
        tableBody.addEventListener("click", async (event) => {
            const button = event.target.closest(".table-action-btn");
            if (!button) {
                return;
            }
            const action = button.dataset.action;
            const recordId = button.dataset.recordId;
            if (action === "reservation") {
                await reserveBurialRecord(recordId);
            }
        });
    }
}

function initializeAdminReservations() {
    const body = document.getElementById("reservationsAdminPage");
    if (!body) {
        return;
    }

    const searchInput = document.getElementById("reservationAdminSearchInput");
    const tableBody = document.getElementById("reservationsAdminTableBody");

    renderAdminReservations();

    if (searchInput) {
        searchInput.addEventListener("input", (event) => filterReservationRows("reservationsAdminTableBody", event.target.value));
        searchInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                filterReservationRows("reservationsAdminTableBody", searchInput.value);
            }
        });
    }

    if (tableBody) {
        tableBody.addEventListener("click", async (event) => {
            const button = event.target.closest(".table-action-btn");
            if (!button) {
                return;
            }
            const action = button.dataset.action;
            const recordId = button.dataset.recordId;
            if (action === "toggle-reservation") {
                await toggleReservationForAdmin(recordId);
            }
        });
    }
}

function getPhilippineDate() {
    const now = new Date();
    const philippineTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
    return philippineTime.toISOString().split("T")[0];
}

function updateNameFieldRequirement(status) {
    const nameInput = document.getElementById("recordName");
    if (!nameInput) {
        return;
    }
    if (status === "Available") {
        nameInput.value = "";
        nameInput.removeAttribute("required");
    } else {
        nameInput.setAttribute("required", "required");
    }
}

function resetRecordForm() {
    const nameInput = document.getElementById("recordName");
    const blockInput = document.getElementById("recordBlock");
    const plotInput = document.getElementById("recordPlot");
    const dateInput = document.getElementById("recordDate");
    const statusInput = document.getElementById("recordStatus");
    const cleanlinessInput = document.getElementById("recordCleanliness");
    const latitudeInput = document.getElementById("recordLatitude");
    const longitudeInput = document.getElementById("recordLongitude");

    document.getElementById("recordId").value = "";
    nameInput.value = "";
    blockInput.value = "";
    plotInput.value = "";
    dateInput.value = activeRecordMode === "edit" ? "" : getPhilippineDate();
    statusInput.value = "Occupied";
    cleanlinessInput.value = "Clean";
    latitudeInput.value = 14.954621;
    longitudeInput.value = 120.896542;
    document.getElementById("recordModalTitle").textContent = "Add Burial Record";
    document.getElementById("saveRecordBtn").textContent = "Save Record";

    nameInput.disabled = false;
    blockInput.disabled = false;
    plotInput.disabled = false;
    dateInput.disabled = false;
    statusInput.disabled = false;
    cleanlinessInput.disabled = false;
    latitudeInput.disabled = false;
    longitudeInput.disabled = false;
    // remove live listeners when resetting
    latitudeInput.oninput = null;
    longitudeInput.oninput = null;
    editingRecordId = null;
    updateNameFieldRequirement(statusInput.value);
}

function openRecordModal(mode, record) {
    const modalTitle = document.getElementById("recordModalTitle");
    const saveButton = document.getElementById("saveRecordBtn");
    const nameInput = document.getElementById("recordName");
    const blockInput = document.getElementById("recordBlock");
    const plotInput = document.getElementById("recordPlot");
    const dateInput = document.getElementById("recordDate");
    const statusInput = document.getElementById("recordStatus");
    const cleanlinessInput = document.getElementById("recordCleanliness");
    const latitudeInput = document.getElementById("recordLatitude");
    const longitudeInput = document.getElementById("recordLongitude");

    activeRecordMode = mode;
    resetRecordForm();

    if (statusInput) {
        statusInput.onchange = () => updateNameFieldRequirement(statusInput.value);
    }

    if (mode === "edit" && record) {
        modalTitle.textContent = "Edit Burial Record";
        saveButton.textContent = "Update Record";
        document.getElementById("recordId").value = record.id;
        nameInput.value = record.name;
        blockInput.value = record.block;
        plotInput.value = record.plot;
        dateInput.value = normalizeDateValue(record.date);
        statusInput.value = record.status;
        latitudeInput.value = record.lat;
        longitudeInput.value = record.lng;
        updateNameFieldRequirement(record.status);
        // live update the admin map when coordinates are changed in the form
        editingRecordId = record.id;
        latitudeInput.oninput = () => onRecordCoordinateInputChange(record.id);
        longitudeInput.oninput = () => onRecordCoordinateInputChange(record.id);
    } else if (mode === "view" && record) {
        modalTitle.textContent = "Burial Record Details";
        saveButton.textContent = "Close";
        document.getElementById("recordId").value = record.id;
        nameInput.value = record.name;
        blockInput.value = record.block;
        plotInput.value = record.plot;
        dateInput.value = normalizeDateValue(record.date);
        statusInput.value = record.status;
        cleanlinessInput.value = record.cleanliness || "Clean";
        latitudeInput.value = record.lat;
        longitudeInput.value = record.lng;

        nameInput.disabled = true;
        blockInput.disabled = true;
        plotInput.disabled = true;
        dateInput.disabled = true;
        statusInput.disabled = true;
        cleanlinessInput.disabled = true;
        latitudeInput.disabled = true;
        longitudeInput.disabled = true;
    }

    toggleAddRecordModal(true);
}

function isValidLatitude(lat) {
    return typeof lat === 'number' && isFinite(lat) && lat >= -90 && lat <= 90;
}

function isValidLongitude(lng) {
    return typeof lng === 'number' && isFinite(lng) && lng >= -180 && lng <= 180;
}

function onRecordCoordinateInputChange(recordId) {
    if (!adminMap) return;
    const latVal = parseFloat(document.getElementById('recordLatitude').value);
    const lngVal = parseFloat(document.getElementById('recordLongitude').value);
    if (!isValidLatitude(latVal) || !isValidLongitude(lngVal)) return;

    // Update the admin focus marker so admin can preview position immediately
    if (editingRecordId && editingRecordId === recordId) {
        if (adminMarker) {
            try { adminMarker.setLatLng([latVal, lngVal]); } catch (e) {}
            adminMarker.bindPopup(`<strong>Preview</strong><br>${document.getElementById('recordName').value || ''} • ${document.getElementById('recordBlock').value || ''} • ${document.getElementById('recordPlot').value || ''}`);
        } else {
            adminMarker = L.marker([latVal, lngVal]).addTo(adminMap);
        }
        adminMap.setView([latVal, lngVal], 18);
    }
}

async function deleteBurialRecord(recordId) {
    const record = burialRecords.find((item) => item.id === recordId);
    if (!record) {
        return;
    }

    const confirmed = confirm(`Are you sure you want to remove ${record.name} (Plot ${record.plot})?`);
    if (!confirmed) {
        return;
    }

    burialRecords = burialRecords.filter((item) => item.id !== recordId);
    await saveBurialRecords();
    renderBurialRecordsTable();
    renderRecentBurialActivity();
    renderMapMarkers();
    filterAdminRecords(document.getElementById("adminSearchInput")?.value || "");
    toggleAddRecordModal(false);
}

async function handleAddBurialRecord(event) {
    event.preventDefault();

    const name = document.getElementById("recordName").value.trim();
    const block = document.getElementById("recordBlock").value.trim();
    const plot = document.getElementById("recordPlot").value.trim();
    const date = document.getElementById("recordDate").value;
    const status = document.getElementById("recordStatus").value;
    const cleanliness = document.getElementById("recordCleanliness").value;
    const latitude = parseFloat(document.getElementById("recordLatitude").value);
    const longitude = parseFloat(document.getElementById("recordLongitude").value);

    if (!block || !plot || !date) {
        alert("Please complete all required fields.");
        return;
    }

    if (status !== "Available" && !name) {
        alert("Please enter the deceased name when the plot is occupied or reserved.");
        return;
    }

    const recordId = document.getElementById("recordId").value;

    if (activeRecordMode === "view") {
        toggleAddRecordModal(false);
        resetRecordForm();
        return;
    }

    if (recordId) {
        const existingRecord = burialRecords.find((item) => item.id === recordId);
        if (existingRecord) {
            const oldCondition = existingRecord.cleanliness;
            existingRecord.name = status === "Available" ? "" : name;
            existingRecord.block = block;
            existingRecord.plot = plot;
            existingRecord.date = formatDisplayDate(date);
            existingRecord.status = status;
            existingRecord.cleanliness = cleanliness;
            if (!Number.isNaN(latitude) && !Number.isNaN(longitude)) {
                existingRecord.lat = latitude;
                existingRecord.lng = longitude;
            }

            if (oldCondition !== cleanliness) {
                addGraveConditionNotification(existingRecord, oldCondition, cleanliness);
            }
        }
    } else {
        burialRecords.unshift({
            id: `00${burialRecords.length + 1}`,
            name: status === "Available" ? "" : name,
            block,
            plot,
            date: formatDisplayDate(date),
            status,
            cleanliness,
            lat: !Number.isNaN(latitude) ? latitude : 14.954621,
            lng: !Number.isNaN(longitude) ? longitude : 120.896542
        });
    }

    await saveBurialRecords();

    const updatedRecord = burialRecords.find((item) => item.id === recordId) || burialRecords[0];

    if (updatedRecord && adminMarker) {
        adminMarker.setLatLng([updatedRecord.lat, updatedRecord.lng]);
        adminMarker.bindPopup(`<strong>${updatedRecord.name}</strong><br>${updatedRecord.block} • Plot ${updatedRecord.plot}`);
    }

    if (updatedRecord && adminMap) {
        adminMap.setView([updatedRecord.lat, updatedRecord.lng], 16);
        if (adminMarker) {
            adminMarker.openPopup();
        }
    }

    renderBurialRecordsTable();
    renderRecentBurialActivity();
    renderMapMarkers();
    filterAdminRecords(document.getElementById("adminSearchInput")?.value || "");
    resetRecordForm();
    toggleAddRecordModal(false);
    alert(activeRecordMode === "edit" ? `Burial record for ${name} updated successfully.` : `Burial record for ${name} added successfully.`);
}

function initializeBurialSearch() {
    const searchButton = document.getElementById("searchBurialBtn");
    const searchInput = document.getElementById("burialSearchInput");
    const notificationButton = document.getElementById("notificationButton");

    initializeMap();
    const initialRecord = burialRecords[0];
    if (initialRecord) {
        updateBurialDetails(initialRecord);
    }
    renderRecentSearches();
    renderConditionNotifications();

    if (searchButton) {
        searchButton.addEventListener("click", searchBurialRecord);
    }

    if (notificationButton) {
        notificationButton.addEventListener("click", () => {
            const section = document.getElementById("conditionNotificationSection");
            if (section) {
                section.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        });
    }

    if (searchInput) {
        searchInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                searchBurialRecord();
            }
        });
    }
}

function initializeAdminDashboard() {
    initializeAdminMap();
    updateDashboardStats();

    const openButton = document.getElementById("openAddRecordBtn");
    const closeButton = document.getElementById("closeAddRecordModal");
    const cancelButton = document.getElementById("cancelAddRecordBtn");
    const form = document.getElementById("addBurialRecordForm");
    const searchInput = document.getElementById("adminSearchInput");

    if (openButton) {
        openButton.addEventListener("click", () => toggleAddRecordModal(true));
    }

    if (closeButton) {
        closeButton.addEventListener("click", () => toggleAddRecordModal(false));
    }

    if (cancelButton) {
        cancelButton.addEventListener("click", () => toggleAddRecordModal(false));
    }

    if (form) {
        form.addEventListener("submit", handleAddBurialRecord);
    }

    if (searchInput) {
        searchInput.addEventListener("input", (event) => {
            const q = event.target.value;
            filterAdminRecords(q);
            const matched = findMatchingRecord(q || "");
            if (matched) {
                focusAdminRecord(matched);
            }
        });
        searchInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                filterAdminRecords(searchInput.value);
                const matched = findMatchingRecord(searchInput.value || "");
                if (matched) focusAdminRecord(matched);
            }
        });
    }

    renderBurialRecordsTable();
    renderRecentBurialActivity();
    renderMapMarkers();
    if (typeof filterAdminRecords === "function") {
        filterAdminRecords("");
    }

    const tableBody = document.getElementById("burialRecordsTableBody");

    if (tableBody) {
        tableBody.addEventListener("click", async (event) => {
            const button = event.target.closest(".table-action-btn");

            if (!button) {
                return;
            }

            const action = button.dataset.action;
            const recordId = button.dataset.recordId;
            const record = burialRecords.find((item) => item.id === recordId);

            if (!action || !record) {
                return;
            }

            if (action === "delete") {
                await deleteBurialRecord(recordId);
                return;
            }

            openRecordModal(action, record);
        });
    }

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            toggleAddRecordModal(false);
        }
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    burialRecords = await loadBurialRecords();
    updateDashboardStats();
    initializeBurialSearch();
    initializeAdminDashboard();
    initializeUserReservations();
    initializeAdminReservations();
});