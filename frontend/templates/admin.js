/* ===================================================
   BHOPAL TOURISM — ADMIN STUDIO CONTROLLER
   =================================================== */

let destinationsList = [];
let activeAdminCategory = "all";
let locationMap = null;
let locationMarker = null;
let pickerMap = null;
let pickerMarker = null;
let pendingDeleteId = null;

const DEFAULT_LAT = 23.2599;
const DEFAULT_LNG = 77.4126;

const FALLBACK_DEST_IMAGES = [
    "https://images.unsplash.com/photo-1596402184320-417e7178b2cd?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=600&q=80"
];

/* ===================================================
   INITIALIZATION
   =================================================== */
document.addEventListener("DOMContentLoaded", () => {
    loadDashboardData();
    initializeLocationMap();
    initializePickerMap();
    setupDestinationForm();
    setupCloseHandlers();
});

/* ===================================================
   DASHBOARD DATA & STATS
   =================================================== */
async function loadDashboardData() {
    try {
        // Try fetching admin stats first
        const statsRes = await fetch("/api/admin/stats");
        if (statsRes.ok) {
            const statsData = await statsRes.json();
            if (statsData.success && statsData.stats) {
                const s = statsData.stats;
                updateCount("destinationCount", s.destination_count);
                updateCount("photoCount", s.photo_count);
                updateCount("videoCount", s.video_count);
                updateCount("audioCount", (s.audio_count || 0) + (s.model_count || 0));
                
                if (s.destinations && s.destinations.length) {
                    destinationsList = s.destinations;
                    renderDestinations();
                    populateDestinationSelects();
                    return;
                }
            }
        }

        // Fallback or full fetch if stats didn't supply destinations list
        const destRes = await fetch("/api/destinations");
        if (destRes.ok) {
            const destData = await destRes.json();
            destinationsList = destData.destinations || [];
            updateCount("destinationCount", destinationsList.length);
            renderDestinations();
            populateDestinationSelects();
        }
    } catch (err) {
        console.error("Error loading admin data:", err);
        showToast("Unable to load latest dashboard statistics.", "error");
    }
}

function updateCount(elementId, count) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = count !== undefined ? count : 0;
}

/* ===================================================
   SECTION NAVIGATION
   =================================================== */
function showSection(sectionId, clickedBtn) {
    document.querySelectorAll(".page-section").forEach(sec => {
        sec.classList.remove("active-section");
    });

    const target = document.getElementById(sectionId);
    if (target) target.classList.add("active-section");

    document.querySelectorAll(".sidebar-nav .nav-item").forEach(item => {
        item.classList.remove("active");
    });

    if (clickedBtn) {
        clickedBtn.classList.add("active");
    } else {
        const matching = document.querySelector(`.sidebar-nav .nav-item[onclick*="'${sectionId}'"]`);
        if (matching) matching.classList.add("active");
    }

    // Update Topbar Title
    const titleEl = document.getElementById("topbarTitle");
    if (titleEl) {
        switch (sectionId) {
            case "dashboard": titleEl.textContent = "Management Dashboard"; break;
            case "destinations": titleEl.textContent = "Destination Directory"; break;
            case "addDestination": titleEl.textContent = "Destination Studio"; break;
            case "media": titleEl.textContent = "Multimedia Studio"; break;
            case "location": titleEl.textContent = "Geo-Coordinates Explorer"; break;
            default: titleEl.textContent = "Admin Studio";
        }
    }

    // Invalidate Leaflet maps
    if (sectionId === "addDestination" && locationMap) {
        setTimeout(() => locationMap.invalidateSize(), 200);
    }
    if (sectionId === "location" && pickerMap) {
        setTimeout(() => pickerMap.invalidateSize(), 200);
    }

    // Close mobile drawer if open
    closeSidebar();
}

function showSectionByName(sectionId) {
    const btn = document.querySelector(`.sidebar-nav .nav-item[onclick*="'${sectionId}'"]`);
    showSection(sectionId, btn);
}

function toggleSidebar() {
    const sidebar = document.getElementById("adminSidebar");
    const backdrop = document.getElementById("sidebarBackdrop");
    if (sidebar) sidebar.classList.toggle("open");
    if (backdrop) backdrop.classList.toggle("show");
}

function closeSidebar() {
    const sidebar = document.getElementById("adminSidebar");
    const backdrop = document.getElementById("sidebarBackdrop");
    if (sidebar) sidebar.classList.remove("open");
    if (backdrop) backdrop.classList.remove("show");
}

function setupCloseHandlers() {
    const closeBtn = document.getElementById("sidebarCloseBtn");
    if (closeBtn) closeBtn.addEventListener("click", closeSidebar);
}

/* ===================================================
   RENDER DESTINATIONS
   =================================================== */
function renderDestinations() {
    renderRecentDestinations();
    renderAllDestinations();
}

function renderRecentDestinations() {
    const container = document.getElementById("recentDestinations");
    if (!container) return;

    if (!destinationsList.length) {
        container.innerHTML = `<div class="empty-state"><p>No destinations found in database. Click "+ Add Destination" to create one.</p></div>`;
        return;
    }

    const recent = destinationsList.slice(0, 6);
    container.innerHTML = recent.map(dest => createAdminCardHTML(dest)).join("");
}

function renderAllDestinations() {
    const container = document.getElementById("allDestinations");
    if (!container) return;

    const query = (document.getElementById("adminSearchInput")?.value || "").toLowerCase().trim();

    let filtered = destinationsList;
    if (activeAdminCategory !== "all") {
        filtered = filtered.filter(d => (d.category || "Heritage").toLowerCase() === activeAdminCategory.toLowerCase());
    }

    if (query) {
        filtered = filtered.filter(d =>
            (d.name || "").toLowerCase().includes(query) ||
            (d.short_description || "").toLowerCase().includes(query) ||
            (d.category || "").toLowerCase().includes(query)
        );
    }

    if (!filtered.length) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No destinations match your search or filter criteria.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(dest => createAdminCardHTML(dest)).join("");
}

function createAdminCardHTML(dest) {
    const imgUrl = dest.image_url || (dest.photos && dest.photos[0] ? dest.photos[0].url : null) || FALLBACK_DEST_IMAGES[dest.id % FALLBACK_DEST_IMAGES.length];
    const category = dest.category || "Heritage";
    const lat = Number(dest.latitude) || DEFAULT_LAT;
    const lng = Number(dest.longitude) || DEFAULT_LNG;

    return `
        <div class="admin-dest-card" id="adminCard-${dest.id}">
            <div class="dest-thumb-box">
                <img src="${escapeAttribute(imgUrl)}" alt="${escapeAttribute(dest.name)}" class="dest-thumb-img" loading="lazy">
                <span class="dest-category-pill">${escapeHTML(category)}</span>
                <span class="dest-id-pill">#${dest.id}</span>
            </div>
            <div class="dest-card-info">
                <h4 class="dest-card-name">${escapeHTML(dest.name || "Untitled Destination")}</h4>
                <p class="dest-card-short">${escapeHTML(dest.short_description || "No short description provided.")}</p>
                <div class="dest-meta-chips">
                    <span class="meta-chip">⏰ ${escapeHTML(dest.timings || "9 AM - 6 PM")}</span>
                    <span class="meta-chip">🎟️ ${escapeHTML(dest.entry_fee || "Free")}</span>
                    <span class="meta-chip">📍 ${lat.toFixed(2)}°, ${lng.toFixed(2)}°</span>
                </div>
            </div>
            <div class="dest-card-actions">
                <a href="/destination/${dest.id}" target="_blank" class="card-action-btn view" title="View destination page">
                    <span>View ↗</span>
                </a>
                <button class="card-action-btn media" onclick="openMediaForDestination(${dest.id})" title="Upload media">
                    <span>+ Media</span>
                </button>
                <button class="card-action-btn edit" onclick="editDestination(${dest.id})" title="Edit details">
                    <span>Edit ✏️</span>
                </button>
                <button class="card-action-btn delete" onclick="promptDeleteDestination(${dest.id}, '${escapeAttribute(dest.name)}')" title="Delete destination">
                    <span>Delete 🗑️</span>
                </button>
            </div>
        </div>
    `;
}

function filterAdminDestinations() {
    renderAllDestinations();
}

function setAdminCategoryFilter(category, btn) {
    activeAdminCategory = category;
    document.querySelectorAll("#adminCategoryFilters .filter-pill").forEach(p => p.classList.remove("active"));
    if (btn) btn.classList.add("active");
    renderAllDestinations();
}

/* ===================================================
   SELECT DESTINATION POPULATOR
   =================================================== */
function populateDestinationSelects() {
    const selectIds = [
        "photoDestination",
        "videoDestination",
        "modelDestination",
        "audioDestination"
    ];

    selectIds.forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;

        const currentVal = sel.value;
        sel.innerHTML = `<option value="">-- Select Destination --</option>` +
            destinationsList.map(d => `<option value="${d.id}">${escapeHTML(d.name)}</option>`).join("");

        if (currentVal) sel.value = currentVal;
    });
}

function openMediaForDestination(destinationId) {
    showSectionByName("media");
    const selectIds = [
        "photoDestination",
        "videoDestination",
        "modelDestination",
        "audioDestination"
    ];
    selectIds.forEach(id => {
        const sel = document.getElementById(id);
        if (sel) sel.value = destinationId;
    });
}

/* ===================================================
   ADD / EDIT DESTINATION WORKFLOW
   =================================================== */
function openAddDestination() {
    const form = document.getElementById("destinationForm");
    if (form) form.reset();

    const editIdEl = document.getElementById("editDestinationId");
    if (editIdEl) editIdEl.value = "";

    const titleEl = document.getElementById("destinationFormTitle");
    if (titleEl) titleEl.textContent = "Create New Destination";

    const btn = document.getElementById("saveDestinationBtn");
    if (btn) btn.querySelector("span").textContent = "Save Destination";

    // Set default coordinates
    updateFormCoordinates(DEFAULT_LAT, DEFAULT_LNG);
    if (locationMarker && locationMap) {
        locationMarker.setLatLng([DEFAULT_LAT, DEFAULT_LNG]);
        locationMap.setView([DEFAULT_LAT, DEFAULT_LNG], 13);
    }

    showSectionByName("addDestination");
}

function editDestination(id) {
    const dest = destinationsList.find(d => d.id === id);
    if (!dest) {
        showToast("Destination details not found.", "error");
        return;
    }

    const editIdEl = document.getElementById("editDestinationId");
    const nameEl = document.getElementById("destinationName");
    const catEl = document.getElementById("destinationCategory");
    const shortDescEl = document.getElementById("shortDescription");
    const timingsEl = document.getElementById("destTimings");
    const feeEl = document.getElementById("destEntryFee");
    const bestTimeEl = document.getElementById("destBestTime");
    const descEl = document.getElementById("description");

    if (editIdEl) editIdEl.value = dest.id;
    if (nameEl) nameEl.value = dest.name || "";
    if (catEl) catEl.value = dest.category || "Heritage";
    if (shortDescEl) shortDescEl.value = dest.short_description || "";
    if (timingsEl) timingsEl.value = dest.timings || "";
    if (feeEl) feeEl.value = dest.entry_fee || "";
    if (bestTimeEl) bestTimeEl.value = dest.best_time || "";
    if (descEl) descEl.value = dest.description || "";

    const lat = Number(dest.latitude) || DEFAULT_LAT;
    const lng = Number(dest.longitude) || DEFAULT_LNG;
    updateFormCoordinates(lat, lng);

    if (locationMarker && locationMap) {
        locationMarker.setLatLng([lat, lng]);
        locationMap.setView([lat, lng], 14);
    }

    const titleEl = document.getElementById("destinationFormTitle");
    if (titleEl) titleEl.textContent = `Edit Destination — ${dest.name}`;

    const btn = document.getElementById("saveDestinationBtn");
    if (btn) btn.querySelector("span").textContent = "Update Destination";

    showSectionByName("addDestination");
}

function setupDestinationForm() {
    const form = document.getElementById("destinationForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const editId = document.getElementById("editDestinationId")?.value;
        const name = document.getElementById("destinationName")?.value.trim();
        const category = document.getElementById("destinationCategory")?.value;
        const shortDesc = document.getElementById("shortDescription")?.value.trim();
        const timings = document.getElementById("destTimings")?.value.trim();
        const entryFee = document.getElementById("destEntryFee")?.value.trim();
        const bestTime = document.getElementById("destBestTime")?.value.trim();
        const description = document.getElementById("description")?.value.trim();
        const latitude = parseFloat(document.getElementById("latitude")?.value);
        const longitude = parseFloat(document.getElementById("longitude")?.value);

        if (!name) {
            showToast("Destination name is required.", "error");
            return;
        }

        if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
            showToast("Please select location coordinates on the map.", "error");
            return;
        }

        const payload = {
            name,
            category,
            short_description: shortDesc,
            timings,
            entry_fee: entryFee,
            best_time: bestTime,
            description,
            latitude,
            longitude
        };

        const submitBtn = document.getElementById("saveDestinationBtn");
        if (submitBtn) submitBtn.disabled = true;

        try {
            const isEditing = Boolean(editId);
            const url = isEditing ? `/api/destinations/${editId}` : "/api/destinations";
            const method = isEditing ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || data.error || "Failed to save destination.");
            }

            showToast(isEditing ? "Destination updated successfully!" : "Destination added successfully!", "success");
            form.reset();
            await loadDashboardData();
            showSectionByName("destinations");
        } catch (err) {
            console.error("Save destination error:", err);
            showToast(err.message || "An error occurred while saving.", "error");
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    });
}

/* ===================================================
   DELETE DESTINATION MODAL
   =================================================== */
function promptDeleteDestination(id, name) {
    pendingDeleteId = id;
    const nameEl = document.getElementById("deleteDestName");
    if (nameEl) nameEl.textContent = `"${name}"`;

    const modal = document.getElementById("deleteModal");
    if (modal) {
        modal.classList.add("show");
        modal.setAttribute("aria-hidden", "false");
    }
}

function closeDeleteModal() {
    pendingDeleteId = null;
    const modal = document.getElementById("deleteModal");
    if (modal) {
        modal.classList.remove("show");
        modal.setAttribute("aria-hidden", "true");
    }
}

async function confirmDeleteDestination() {
    if (!pendingDeleteId) return;

    const btn = document.getElementById("confirmDeleteBtn");
    if (btn) btn.disabled = true;

    try {
        const response = await fetch(`/api/destinations/${pendingDeleteId}`, {
            method: "DELETE"
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || data.error || "Failed to delete destination.");
        }

        showToast("Destination deleted successfully.", "success");
        closeDeleteModal();
        await loadDashboardData();
    } catch (err) {
        console.error("Delete error:", err);
        showToast(err.message || "Error deleting destination.", "error");
    } finally {
        if (btn) btn.disabled = false;
    }
}

/* ===================================================
   LEAFLET MAPS
   =================================================== */
function initializeLocationMap() {
    const el = document.getElementById("locationMap");
    if (!el || el._leaflet_id) return;

    locationMap = L.map("locationMap").setView([DEFAULT_LAT, DEFAULT_LNG], 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(locationMap);

    locationMarker = L.marker([DEFAULT_LAT, DEFAULT_LNG], { draggable: true }).addTo(locationMap);

    locationMarker.on("dragend", () => {
        const pos = locationMarker.getLatLng();
        updateFormCoordinates(pos.lat, pos.lng);
    });

    locationMap.on("click", (e) => {
        locationMarker.setLatLng(e.latlng);
        updateFormCoordinates(e.latlng.lat, e.latlng.lng);
    });
}

function updateFormCoordinates(lat, lng) {
    const latEl = document.getElementById("latitude");
    const lngEl = document.getElementById("longitude");
    const msgEl = document.getElementById("locationMessage");

    if (latEl) latEl.value = Number(lat).toFixed(6);
    if (lngEl) lngEl.value = Number(lng).toFixed(6);
    if (msgEl) {
        msgEl.innerHTML = `<span>📍 Selected: <strong>${Number(lat).toFixed(4)}° N, ${Number(lng).toFixed(4)}° E</strong></span>`;
    }
}

function initializePickerMap() {
    const el = document.getElementById("pickerMap");

    if (!el || el._leaflet_id) return;

    pickerMap = L.map("pickerMap").setView(
        [DEFAULT_LAT, DEFAULT_LNG],
        13
    );

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19
        }
    ).addTo(pickerMap);


    pickerMarker = L.marker(
        [DEFAULT_LAT, DEFAULT_LNG],
        {
            draggable: true
        }
    ).addTo(pickerMap);


    // Update latitude and longitude inputs
    function updatePickerCoordinates(lat, lng) {

        const latInput =
            document.getElementById("pickerLatitude");

        const lngInput =
            document.getElementById("pickerLongitude");

        if (latInput) {
            latInput.value =
                Number(lat).toFixed(7);
        }

        if (lngInput) {
            lngInput.value =
                Number(lng).toFixed(7);
        }
    }


    // Initial coordinates
    updatePickerCoordinates(
        DEFAULT_LAT,
        DEFAULT_LNG
    );


    // Marker drag
    pickerMarker.on(
        "dragend",
        function () {

            const position =
                pickerMarker.getLatLng();

            updatePickerCoordinates(
                position.lat,
                position.lng
            );
        }
    );


    // Click anywhere on map
    pickerMap.on(
        "click",
        function (event) {

            pickerMarker.setLatLng(
                event.latlng
            );

            updatePickerCoordinates(
                event.latlng.lat,
                event.latlng.lng
            );
        }
    );
}


/* =========================================
   SET LOCATION FROM MANUAL COORDINATES
========================================= */

function setLocationFromCoordinates() {

    const latInput =
        document.getElementById(
            "pickerLatitude"
        );

    const lngInput =
        document.getElementById(
            "pickerLongitude"
        );


    if (!latInput || !lngInput) {
        return;
    }


    const lat =
        parseFloat(latInput.value);

    const lng =
        parseFloat(lngInput.value);


    // Validate latitude
    if (
        Number.isNaN(lat) ||
        lat < -90 ||
        lat > 90
    ) {

        showToast(
            "Please enter a valid latitude.",
            "error"
        );

        return;
    }


    // Validate longitude
    if (
        Number.isNaN(lng) ||
        lng < -180 ||
        lng > 180
    ) {

        showToast(
            "Please enter a valid longitude.",
            "error"
        );

        return;
    }


    if (!pickerMap || !pickerMarker) {
        return;
    }


    // Move marker
    pickerMarker.setLatLng(
        [lat, lng]
    );


    // Move map
    pickerMap.setView(
        [lat, lng],
        16
    );


    // Format values
    latInput.value =
        lat.toFixed(7);

    lngInput.value =
        lng.toFixed(7);


    showToast(
        "Location updated successfully!",
        "success"
    );
}


/* =========================================
   SEARCH LOCATION USING OPENSTREETMAP
========================================= */

async function searchLocation() {

    const searchInput =
        document.getElementById(
            "locationSearch"
        );

    const resultsBox =
        document.getElementById(
            "locationSearchResults"
        );

    const statusBox =
        document.getElementById(
            "locationSearchStatus"
        );


    if (!searchInput) return;


    const query =
        searchInput.value.trim();


    if (!query) {

        if (resultsBox) {
            resultsBox.innerHTML = "";
        }

        if (statusBox) {
            statusBox.textContent =
                "Please enter a location.";
        }

        return;
    }


    if (statusBox) {
        statusBox.textContent =
            "Searching...";
    }


    if (resultsBox) {
        resultsBox.innerHTML = "";
    }


    try {

        // Prefer Bhopal for ambiguous searches
        const searchQuery = query;


        const url =
            "https://nominatim.openstreetmap.org/search" +
            "?q=" +
            encodeURIComponent(searchQuery) +
            "&format=jsonv2" +
            "&limit=5" +
            "&countrycodes=in";


        const response =
            await fetch(url, {
                headers: {
                    "Accept":
                        "application/json"
                }
            });


        if (!response.ok) {

            throw new Error(
                "Location search failed."
            );
        }


        const results =
            await response.json();


        if (!results.length) {

            if (statusBox) {
                statusBox.textContent =
                    "No location found.";
            }

            return;
        }


        if (statusBox) {
            statusBox.textContent =
                "Select a location:";
        }


        results.forEach(
            function (result) {

                const item =
                    document.createElement(
                        "button"
                    );

                item.type = "button";

                item.className =
                    "location-result-item";


                item.innerHTML = `
                    <strong>
                        ${result.name || "Location"}
                    </strong>
                    <span>
                        ${result.display_name}
                    </span>
                `;


                item.addEventListener(
                    "click",
                    function () {

                        const lat =
                            parseFloat(
                                result.lat
                            );

                        const lng =
                            parseFloat(
                                result.lon
                            );


                        if (
                            Number.isNaN(lat) ||
                            Number.isNaN(lng)
                        ) {

                            showToast(
                                "Invalid location coordinates.",
                                "error"
                            );

                            return;
                        }


                        if (
                            !pickerMap ||
                            !pickerMarker
                        ) {
                            return;
                        }


                        // Move marker
                        pickerMarker.setLatLng(
                            [lat, lng]
                        );


                        // Move map
                        pickerMap.setView(
                            [lat, lng],
                            16
                        );


                        // Update inputs
                        const latInput =
                            document.getElementById(
                                "pickerLatitude"
                            );

                        const lngInput =
                            document.getElementById(
                                "pickerLongitude"
                            );


                        if (latInput) {
                            latInput.value =
                                lat.toFixed(7);
                        }

                        if (lngInput) {
                            lngInput.value =
                                lng.toFixed(7);
                        }


                        // Put selected place
                        searchInput.value =
                            result.display_name;


                        resultsBox.innerHTML = "";


                        if (statusBox) {
                            statusBox.textContent =
                                "Location selected successfully.";
                        }

                    }
                );


                resultsBox.appendChild(
                    item
                );

            }
        );

    }
    catch (error) {

        console.error(error);

        if (statusBox) {
            statusBox.textContent =
                "Unable to search location. Check your internet connection.";
        }

    }
}


/* =========================================
   COPY COORDINATES
========================================= */

function copyPickerCoordinates() {

    const latInput =
        document.getElementById(
            "pickerLatitude"
        );

    const lngInput =
        document.getElementById(
            "pickerLongitude"
        );


    const lat =
        latInput?.value || "";

    const lng =
        lngInput?.value || "";


    if (!lat || !lng) {

        showToast(
            "Coordinates are not available.",
            "error"
        );

        return;
    }


    const text =
        `${lat}, ${lng}`;


    navigator.clipboard
        .writeText(text)
        .then(
            function () {

                showToast(
                    `Copied coordinates: ${text}`,
                    "success"
                );

            }
        )
        .catch(
            function () {

                showToast(
                    `Coordinates: ${text}`,
                    "info"
                );

            }
        );
}

/* ===================================================
   MEDIA UPLOADERS
   =================================================== */
async function uploadPhotos() {
    const destEl = document.getElementById("photoDestination");
    const titleEl = document.getElementById("photoTitle");
    const fileEl = document.getElementById("photoFile");

    const destId = destEl?.value;
    const title = titleEl?.value.trim() || "Destination Photo";
    const files = fileEl?.files;

    if (!destId) return showToast("Please select a destination.", "error");
    if (!files || !files.length) return showToast("Please select at least one photo.", "error");

    showToast(`Uploading ${files.length} photo(s)...`, "info");

    try {
        let successCount = 0;
        for (let i = 0; i < files.length; i++) {
            const formData = new FormData();
            formData.append("file", files[i]);
            formData.append("title", title);

            const res = await fetch(`/api/destinations/${destId}/photos`, {
                method: "POST",
                body: formData
            });
            const data = await res.json();
            if (res.ok && data.success) successCount++;
        }

        showToast(`Successfully uploaded ${successCount} photo(s)!`, "success");
        if (fileEl) fileEl.value = "";
        if (titleEl) titleEl.value = "";
        loadDashboardData();
    } catch (err) {
        console.error("Upload photos error:", err);
        showToast("Error uploading photos.", "error");
    }
}

async function addVideo() {
    const destEl = document.getElementById("videoDestination");
    const titleEl = document.getElementById("videoTitle");
    const urlEl = document.getElementById("youtubeUrl");

    const destId = destEl?.value;
    const title = titleEl?.value.trim() || "Bhopal Destination Tour";
    const youtubeUrl = urlEl?.value.trim();

    if (!destId) return showToast("Please select a destination.", "error");
    if (!youtubeUrl) return showToast("Please provide a valid YouTube URL.", "error");

    try {
        const res = await fetch(`/api/destinations/${destId}/videos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, youtube_url: youtubeUrl })
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
            throw new Error(data.message || data.error || "Failed to link video.");
        }

        showToast("YouTube video linked successfully!", "success");
        if (urlEl) urlEl.value = "";
        if (titleEl) titleEl.value = "";
        loadDashboardData();
    } catch (err) {
        console.error("Add video error:", err);
        showToast(err.message || "Error adding YouTube video.", "error");
    }
}

async function uploadModel() {
    const destEl = document.getElementById("modelDestination");
    const titleEl = document.getElementById("modelTitle");
    const fileEl = document.getElementById("modelFile");

    const destId = destEl?.value;
    const title = titleEl?.value.trim() || "3D Model Asset";
    const file = fileEl?.files && fileEl.files[0];

    if (!destId) return showToast("Please select a destination.", "error");
    if (!file) return showToast("Please select a .glb 3D model file.", "error");

    showToast("Uploading 3D model...", "info");

    try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("title", title);

        const res = await fetch(`/api/destinations/${destId}/models`, {
            method: "POST",
            body: formData
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
            throw new Error(data.message || data.error || "Failed to upload 3D model.");
        }

        showToast("3D model uploaded successfully!", "success");
        if (fileEl) fileEl.value = "";
        if (titleEl) titleEl.value = "";
        loadDashboardData();
    } catch (err) {
        console.error("Upload model error:", err);
        showToast(err.message || "Error uploading 3D model.", "error");
    }
}

async function uploadAudio() {
    const destEl = document.getElementById("audioDestination");
    const titleEl = document.getElementById("audioTitle");
    const langEl = document.getElementById("audioLanguage");
    const fileEl = document.getElementById("audioFile");

    const destId = destEl?.value;
    const title = titleEl?.value.trim() || "Audio Tour";
    const language = langEl?.value || "English";
    const file = fileEl?.files && fileEl.files[0];

    if (!destId) return showToast("Please select a destination.", "error");
    if (!file) return showToast("Please select an audio file.", "error");

    showToast("Uploading audio guide...", "info");

    try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("title", title);
        formData.append("language", language);

        const res = await fetch(`/api/destinations/${destId}/audio`, {
            method: "POST",
            body: formData
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
            throw new Error(data.message || data.error || "Failed to upload audio.");
        }

        showToast("Audio guide uploaded successfully!", "success");
        if (fileEl) fileEl.value = "";
        if (titleEl) titleEl.value = "";
        loadDashboardData();
    } catch (err) {
        console.error("Upload audio error:", err);
        showToast(err.message || "Error uploading audio guide.", "error");
    }
}

/* ===================================================
   AUTHENTICATION & LOGOUT
   =================================================== */
async function logout() {
    try {
        await fetch("/api/logout", { method: "POST" });
    } catch (e) {
        console.warn("Logout request error:", e);
    }
    showToast("Signed out. Redirecting...", "info");
    setTimeout(() => {
        window.location.href = "/login";
    }, 400);
}

/* ===================================================
   TOAST NOTIFICATION
   =================================================== */
let toastTimeout = null;
function showToast(message, type = "info") {
    const toast = document.getElementById("toast");
    if (!toast) return;

    clearTimeout(toastTimeout);
    toast.textContent = message;
    toast.className = `toast show ${type}`;

    toastTimeout = setTimeout(() => {
        toast.className = "toast";
    }, 3800);
}

/* ===================================================
   UTILITIES
   =================================================== */
function escapeHTML(str) {
    if (str === null || str === undefined) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeAttribute(str) {
    return escapeHTML(str);
}