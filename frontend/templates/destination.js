import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/* ===================================================
   BHOPAL TOURISM — DESTINATION DETAIL CONTROLLER
   =================================================== */

const destinationId = Number(document.body?.dataset?.destinationId);

// Fallback high-resolution Bhopal landscape images
const FALLBACK_HERO_IMAGES = [
    "https://images.unsplash.com/photo-1596402184320-417e7178b2cd?auto=format&fit=crop&w=1920&q=80",
    "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=1920&q=80",
    "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=1920&q=80"
];

document.addEventListener("DOMContentLoaded", () => {
    if (!destinationId || Number.isNaN(destinationId)) {
        console.error("Destination ID missing or invalid.");
        return;
    }

    initializeModal();
    loadDestinationData();
});

/* ===================================================
   LOAD DESTINATION DATA (MAIN)
   =================================================== */
async function loadDestinationData() {
    try {
        const response = await fetch(`/api/destinations/${destinationId}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const dest = data.destination || data;

        // 1. Text & Headers
        const nameEl = document.getElementById("destinationName");
        const shortDescEl = document.getElementById("destinationShortDescription");
        const descEl = document.getElementById("destinationDescription");
        const catBadgeEl = document.getElementById("destCategoryBadge");

        if (nameEl) nameEl.textContent = dest.name || "Bhopal Destination";
        if (shortDescEl) shortDescEl.textContent = dest.short_description || "";
        if (descEl) descEl.textContent = dest.description || "Historical details and visiting notes for this destination are currently being updated.";
        if (catBadgeEl) catBadgeEl.textContent = dest.category || "Heritage Landmark";
        document.title = `${dest.name || "Destination"} — Bhopal Tourism`;

        // 2. Specifications Cards
        const timingsEl = document.getElementById("specTimings");
        const feeEl = document.getElementById("specFee");
        const bestTimeEl = document.getElementById("specBestTime");
        const coordsEl = document.getElementById("specCoords");

        if (timingsEl) timingsEl.textContent = dest.timings || "Open Daily (9:00 AM – 6:00 PM)";
        if (feeEl) feeEl.textContent = dest.entry_fee || "Free / Nominal Entry";
        if (bestTimeEl) bestTimeEl.textContent = dest.best_time || "October to March";

        const lat = Number(dest.latitude) || 23.2599;
        const lng = Number(dest.longitude) || 77.4126;
        if (coordsEl) {
            coordsEl.textContent = `${lat.toFixed(3)}° N, ${lng.toFixed(3)}° E`;
        }

        // 3. Hero Backdrop Image
        const heroBackdrop = document.getElementById("destHeroBackdrop");
        if (heroBackdrop) {
            let heroUrl = null;
            if (dest.photos && dest.photos.length > 0) {
                heroUrl = dest.photos[0].url || buildUploadUrl(dest.photos[0].file_path);
            }
            if (!heroUrl) {
                heroUrl = FALLBACK_HERO_IMAGES[destinationId % FALLBACK_HERO_IMAGES.length];
            }
            heroBackdrop.style.backgroundImage = `url("${heroUrl}")`;
        }

        // 4. Map & Directions
        initializeMap(lat, lng, dest.name || "Destination");

        const coordsLabel = document.getElementById("mapCoordsLabel");
        if (coordsLabel) {
            coordsLabel.textContent = `Location: ${dest.name || "Bhopal"} (${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E)`;
        }

        const directionsLink = document.getElementById("googleDirectionsLink");
        if (directionsLink) {
            directionsLink.href = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
            directionsLink.setAttribute("target", "_blank");
            directionsLink.setAttribute("rel", "noopener noreferrer");
        }

        // 5. Render Media Galleries
        renderPhotos(dest.photos || []);
        renderVideos(dest.videos || []);
        renderModels(dest.models_3d || []);
        renderAudio(dest.audio_guides || []);
        renderRelated(dest.related || []);

    } catch (error) {
        console.error("Destination loading error:", error);
        const nameEl = document.getElementById("destinationName");
        if (nameEl) nameEl.textContent = "Destination Unavailable";
        const descEl = document.getElementById("destinationDescription");
        if (descEl) descEl.textContent = "We were unable to load details for this attraction. Please return to the homepage or try again later.";
    }
}

/* ===================================================
   PHOTOS SECTION
   =================================================== */
function renderPhotos(photos) {
    const section = document.getElementById("photosSection");
    const gallery = document.getElementById("photoGallery");
    if (!gallery) return;

    if (!photos || photos.length === 0) {
        gallery.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; background: var(--bg-muted); border-radius: var(--radius-md); color: var(--text-muted);">
                <p style="font-size: 15px; margin-bottom: 8px;">📷 No user-uploaded photos yet for this landmark.</p>
                <small>Official photographic surveys are currently in progress.</small>
            </div>
        `;
        return;
    }

    gallery.innerHTML = photos.map(photo => {
        const imageUrl = photo.url || buildUploadUrl(photo.file_path);
        const title = photo.title || "Destination Capture";
        if (!imageUrl) return "";

        return `
            <div class="gallery-photo-card" data-image-url="${escapeAttribute(imageUrl)}" data-title="${escapeAttribute(title)}">
                <img src="${escapeAttribute(imageUrl)}" alt="${escapeAttribute(title)}" loading="lazy">
                <div class="photo-overlay-info">
                    <span>${escapeHTML(title)}</span>
                </div>
            </div>
        `;
    }).join("");

    // Lightbox triggers
    gallery.querySelectorAll(".gallery-photo-card").forEach(card => {
        card.addEventListener("click", () => {
            const url = card.dataset.imageUrl;
            const caption = card.dataset.title;
            if (url) openImage(url, caption);
        });
    });
}

/* ===================================================
   3D MODEL VIEWER
   =================================================== */
function renderModels(models) {
    const section = document.getElementById("modelSection");
    const container = document.getElementById("modelContainer");
    if (!container || !section) return;

    if (!models || models.length === 0) {
        // Gracefully collapse section if no 3D asset exists
        section.style.display = "none";
        return;
    }

    const modelUrl = models[0].url || buildUploadUrl(models[0].file_path);
    if (!modelUrl) {
        section.style.display = "none";
        return;
    }

    section.style.display = "block";
    container.innerHTML = "";
    create3DViewer(container, modelUrl);
}

function create3DViewer(container, modelPath) {
    if (!container || !modelPath) return;

    const width = Math.max(container.clientWidth, 300);
    const height = Math.max(container.clientHeight, 400);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a1c20);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 1.5, 4);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // Dynamic Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.8);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
    keyLight.position.set(5, 8, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x75b79e, 1.2);
    fillLight.position.set(-5, 4, -5);
    scene.add(fillLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.minDistance = 0.5;
    controls.maxDistance = 25;

    // Loading indicator inside canvas wrapper
    const loadingOverlay = document.createElement("div");
    loadingOverlay.style.position = "absolute";
    loadingOverlay.style.inset = "0";
    loadingOverlay.style.display = "flex";
    loadingOverlay.style.flexDirection = "column";
    loadingOverlay.style.alignItems = "center";
    loadingOverlay.style.justifyContent = "center";
    loadingOverlay.style.background = "rgba(10, 28, 32, 0.85)";
    loadingOverlay.style.color = "#ffffff";
    loadingOverlay.style.fontFamily = "sans-serif";
    loadingOverlay.innerHTML = `<div class="spinner" style="border: 3px solid rgba(255,255,255,0.2); border-top-color: #d4a259; border-radius: 50%; width: 36px; height: 36px; animation: spin 0.8s linear infinite; margin-bottom: 12px;"></div><span>Loading 3D asset...</span>`;
    container.style.position = "relative";
    container.appendChild(loadingOverlay);

    const loader = new GLTFLoader();
    loader.load(
        modelPath,
        (gltf) => {
            if (loadingOverlay.parentNode) {
                loadingOverlay.parentNode.removeChild(loadingOverlay);
            }

            const model = gltf.scene;
            scene.add(model);

            // Center & normalize scale
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());

            model.position.sub(center);
            const maxSize = Math.max(size.x, size.y, size.z);
            if (maxSize > 0 && Number.isFinite(maxSize)) {
                model.scale.setScalar(2.2 / maxSize);
            }

            camera.position.set(0, 1.2, 3.8);
            controls.target.set(0, 0, 0);
            controls.update();
        },
        (progress) => {
            if (progress.total > 0) {
                const pct = Math.round((progress.loaded / progress.total) * 100);
                const span = loadingOverlay.querySelector("span");
                if (span) span.textContent = `Loading 3D asset: ${pct}%`;
            }
        },
        (error) => {
            console.error("3D model load error:", error);
            if (loadingOverlay.parentNode) {
                loadingOverlay.innerHTML = `<p style="color: #ff8b7b; font-size: 14px;">⚠️ Interactive 3D asset could not be rendered.</p>`;
            }
        }
    );

    let animId;
    function animate() {
        animId = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();

    function handleResize() {
        if (!container.isConnected) {
            cancelAnimationFrame(animId);
            window.removeEventListener("resize", handleResize);
            renderer.dispose();
            controls.dispose();
            return;
        }
        const nw = Math.max(container.clientWidth, 300);
        const nh = Math.max(container.clientHeight, 400);
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
        renderer.setSize(nw, nh);
    }
    window.addEventListener("resize", handleResize);
}

/* ===================================================
   AUDIO GUIDES SECTION
   =================================================== */
function renderAudio(audioList) {
    const section = document.getElementById("audioSection");
    const gallery = document.getElementById("audioGallery");
    if (!gallery || !section) return;

    if (!audioList || audioList.length === 0) {
        section.style.display = "none";
        return;
    }

    section.style.display = "block";
    gallery.innerHTML = audioList.map(item => {
        const audioUrl = item.url || buildUploadUrl(item.file_path);
        const title = item.title || "Audio Guide";
        const lang = item.language || "English";
        if (!audioUrl) return "";

        return `
            <div class="audio-card">
                <div class="audio-card-head">
                    <h3 class="audio-title">${escapeHTML(title)}</h3>
                    <span class="audio-lang-badge">${escapeHTML(lang)}</span>
                </div>
                <audio class="audio-player-element" controls preload="metadata" src="${escapeAttribute(audioUrl)}"></audio>
            </div>
        `;
    }).join("");
}

/* ===================================================
   VIDEOS SECTION
   =================================================== */
function renderVideos(videos) {
    const section = document.getElementById("videoSection");
    const gallery = document.getElementById("videoGallery");
    if (!gallery || !section) return;

    if (!videos || videos.length === 0) {
        section.style.display = "none";
        return;
    }

    section.style.display = "block";
    gallery.innerHTML = videos.map(video => {
        const embedUrl = video.embed_url || getYouTubeEmbedUrl(video.youtube_url);
        const title = video.title || "Bhopal Tourism Video Experience";
        if (!embedUrl) return "";

        return `
            <div class="video-frame-card">
                <div class="video-responsive-wrap">
                    <iframe
                        src="${escapeAttribute(embedUrl)}"
                        title="${escapeAttribute(title)}"
                        loading="lazy"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowfullscreen
                    ></iframe>
                </div>
                <div class="video-caption">${escapeHTML(title)}</div>
            </div>
        `;
    }).join("");
}

/* ===================================================
   RELATED DESTINATIONS
   =================================================== */
function renderRelated(relatedList) {
    const grid = document.getElementById("relatedDestinations");
    const section = document.getElementById("relatedSection");
    if (!grid || !section) return;

    if (!relatedList || relatedList.length === 0) {
        section.style.display = "none";
        return;
    }

    section.style.display = "block";
    grid.innerHTML = relatedList.map((item, idx) => {
        const imgUrl = item.image_url || FALLBACK_HERO_IMAGES[idx % FALLBACK_HERO_IMAGES.length];
        return `
            <div class="dest-card">
                <div class="dest-card-media">
                    <img src="${escapeAttribute(imgUrl)}" alt="${escapeAttribute(item.name || 'Destination')}" loading="lazy" class="dest-card-img">
                    <span class="dest-badge">Nearby</span>
                </div>
                <div class="dest-card-content">
                    <h3 class="dest-card-title">${escapeHTML(item.name || 'Attraction')}</h3>
                    <p class="dest-card-desc">${escapeHTML(item.short_description || 'Explore this iconic destination in the City of Lakes.')}</p>
                    <div class="dest-card-footer">
                        <a href="/destination/${item.id}" class="dest-explore-btn">
                            <span>Explore Site</span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                        </a>
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

/* ===================================================
   LEAFLET MAP
   =================================================== */
function initializeMap(latitude, longitude, name) {
    const mapElement = document.getElementById("destinationMap");
    if (!mapElement) return;

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        mapElement.innerHTML = `<div class="loading-state"><p>Location coordinates unavailable.</p></div>`;
        return;
    }

    if (mapElement._leaflet_id) return;

    const map = L.map("destinationMap").setView([lat, lng], 15);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);

    const marker = L.marker([lat, lng]).addTo(map);
    marker.bindPopup(`<b>${escapeHTML(name)}</b><br><small>Bhopal, Madhya Pradesh</small>`).openPopup();

    setTimeout(() => {
        map.invalidateSize();
    }, 200);
}

/* ===================================================
   IMAGE LIGHTBOX MODAL
   =================================================== */
function initializeModal() {
    const modal = document.getElementById("imageModal");
    const closeButton = document.getElementById("closeModal");
    if (!modal) return;

    if (closeButton) {
        closeButton.addEventListener("click", closeImageModal);
    }

    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeImageModal();
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal.classList.contains("show")) {
            closeImageModal();
        }
    });
}

function openImage(imageUrl, caption) {
    const modal = document.getElementById("imageModal");
    const image = document.getElementById("modalImage");
    const captionEl = document.getElementById("modalCaption");

    if (!modal || !image) return;

    image.src = imageUrl;
    if (captionEl) {
        captionEl.textContent = caption || "";
        captionEl.style.display = caption ? "block" : "none";
    }

    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
}

function closeImageModal() {
    const modal = document.getElementById("imageModal");
    const image = document.getElementById("modalImage");
    if (!modal) return;

    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
    if (image) image.src = "";
}

/* ===================================================
   UTILITY HELPERS
   =================================================== */
function buildUploadUrl(filePath) {
    if (!filePath) return "";
    if (filePath.startsWith("/uploads/") || filePath.startsWith("http://") || filePath.startsWith("https://")) {
        return filePath;
    }
    return "/uploads/" + filePath.replace(/^\/+/, "");
}

function getYouTubeEmbedUrl(url) {
    if (!url) return "";
    try {
        const parsed = new URL(url);
        const host = parsed.hostname.toLowerCase().replace("www.", "");
        let videoId = "";

        if (host === "youtube.com" || host === "m.youtube.com") {
            videoId = parsed.searchParams.get("v");
            if (!videoId && parsed.pathname.startsWith("/embed/")) {
                videoId = parsed.pathname.split("/embed/")[1]?.split("/")[0];
            }
            if (!videoId && parsed.pathname.startsWith("/shorts/")) {
                videoId = parsed.pathname.split("/shorts/")[1]?.split("/")[0];
            }
        } else if (host === "youtu.be") {
            videoId = parsed.pathname.substring(1).split("/")[0];
        }

        if (videoId && /^[a-zA-Z0-9_-]{6,20}$/.test(videoId)) {
            return "https://www.youtube.com/embed/" + videoId;
        }
        return "";
    } catch {
        return "";
    }
}

function escapeHTML(value) {
    if (value === null || value === undefined) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
    return escapeHTML(value);
}