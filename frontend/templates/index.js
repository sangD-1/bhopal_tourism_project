/* ===================================================
   BHOPAL TOURISM — HOMEPAGE JAVASCRIPT CONTROLLER
   =================================================== */

let allDestinationsData = [];
let currentCategory = "all";
let currentSearch = "";
let currentSort = "name-asc";

// Fallback high-resolution imagery for destinations before photos are uploaded
const curatedBhopalFallbacks = [
    "https://images.unsplash.com/photo-1596402184320-417e7178b2cd?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1587974928442-77dc3e0dba72?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=800&q=80"
];

document.addEventListener("DOMContentLoaded", () => {
    initNavigation();
    initSession();
    initHeroSearch();
    initCategoryFilters();
    initDestinationToolbar();
    loadDestinations();
    loadHomeGallery();
    initLightbox();
});

/* ===================================================
   NAVIGATION & DRAWER
   =================================================== */

function initNavigation() {
    const mobileBtn = document.getElementById("mobileMenuBtn");
    const closeBtn = document.getElementById("drawerCloseBtn");
    const backdrop = document.getElementById("drawerBackdrop");
    const drawer = document.getElementById("mobileDrawer");

    if (mobileBtn && drawer) {
        mobileBtn.addEventListener("click", () => {
            drawer.classList.add("open");
            backdrop.classList.add("open");
            document.body.style.overflow = "hidden";
        });
    }

    if (closeBtn && drawer) {
        closeBtn.addEventListener("click", closeDrawer);
    }

    if (backdrop) {
        backdrop.addEventListener("click", closeDrawer);
    }

    // Smooth scroll active state updater
    const sections = document.querySelectorAll("section[id]");
    window.addEventListener("scroll", () => {
        const scrollY = window.pageYOffset;
        sections.forEach(current => {
            const sectionHeight = current.offsetHeight;
            const sectionTop = current.offsetTop - 120;
            const sectionId = current.getAttribute("id");
            const navLink = document.querySelector(`.nav-menu a[href*='${sectionId}']`);
            if (navLink) {
                if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                    document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
                    navLink.classList.add("active");
                }
            }
        });
    });
}

function closeDrawer() {
    const drawer = document.getElementById("mobileDrawer");
    const backdrop = document.getElementById("drawerBackdrop");
    if (drawer) drawer.classList.remove("open");
    if (backdrop) backdrop.classList.remove("open");
    document.body.style.overflow = "";
}

/* ===================================================
   SESSION & AUTH STATUS
   =================================================== */

async function initSession() {
    try {
        const res = await fetch("/api/session");
        if (!res.ok) return;
        const data = await res.json();

        const navStatus = document.getElementById("navAuthStatus");
        const drawerAuth = document.getElementById("drawerAuthLink");

        if (data.logged_in) {
            if (data.role === "admin") {
                if (navStatus) {
                    navStatus.innerHTML = `
                        <a href="/admin" class="nav-auth-link" style="color:#d4a259; font-weight:700;">
                            🛡️ Admin Dashboard
                        </a>
                        <button onclick="handleLogout()" style="background:none;border:none;color:#ffffff;cursor:pointer;margin-left:8px;font-size:11px;">(Sign Out)</button>
                    `;
                }
                if (drawerAuth) {
                    drawerAuth.href = "/admin";
                    drawerAuth.textContent = "🛡️ Admin Dashboard";
                }
            } else {
                const displayName = data.name ? data.name.split(" ")[0] : "Explorer";
                if (navStatus) {
                    navStatus.innerHTML = `
                        <span>👋 Welcome, <strong>${escapeHTML(displayName)}</strong></span>
                        <button onclick="handleLogout()" style="background:none;border:none;color:#ffffff;cursor:pointer;margin-left:8px;font-size:11px;text-decoration:underline;">(Sign Out)</button>
                    `;
                }
                if (drawerAuth) {
                    drawerAuth.textContent = `👋 ${displayName} (Sign Out)`;
                    drawerAuth.onclick = handleLogout;
                }
            }
        }
    } catch (e) {
        console.log("Session check skipped");
    }
}

async function handleLogout() {
    try {
        await fetch("/api/logout", { method: "POST" });
        window.location.reload();
    } catch (err) {
        window.location.href = "/login";
    }
}

/* ===================================================
   HERO SEARCH
   =================================================== */

function initHeroSearch() {
    const searchInput = document.getElementById("heroSearchInput");
    const searchBtn = document.getElementById("heroSearchBtn");

    const doSearch = () => {
        const query = (searchInput.value || "").trim();
        currentSearch = query;
        const destFilter = document.getElementById("destinationFilterInput");
        if (destFilter) destFilter.value = query;
        filterAndRenderDestinations();

        // Scroll to destinations section
        const destSection = document.getElementById("destinations");
        if (destSection) {
            destSection.scrollIntoView({ behavior: "smooth" });
        }
    };

    if (searchBtn) searchBtn.addEventListener("click", doSearch);
    if (searchInput) {
        searchInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") doSearch();
        });
    }
}

/* ===================================================
   CATEGORY FILTERS
   =================================================== */

function initCategoryFilters() {
    const filterBar = document.getElementById("categoryFilterBar");
    if (!filterBar) return;

    filterBar.addEventListener("click", (e) => {
        const btn = e.target.closest(".cat-pill");
        if (!btn) return;

        filterBar.querySelectorAll(".cat-pill").forEach(p => p.classList.remove("active"));
        btn.classList.add("active");

        currentCategory = btn.dataset.category || "all";
        filterAndRenderDestinations();
    });
}

/* ===================================================
   TOOLBAR (COMPACT SEARCH & SORT)
   =================================================== */

function initDestinationToolbar() {
    const filterInput = document.getElementById("destinationFilterInput");
    const sortSelect = document.getElementById("sortSelect");

    if (filterInput) {
        filterInput.addEventListener("input", (e) => {
            currentSearch = e.target.value.trim();
            filterAndRenderDestinations();
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener("change", (e) => {
            currentSort = e.target.value;
            filterAndRenderDestinations();
        });
    }
}

/* ===================================================
   LOAD & RENDER DESTINATIONS
   =================================================== */

async function loadDestinations() {
    const container = document.getElementById("destinationContainer");
    if (!container) return;

    container.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading Bhopal's iconic destinations...</p>
        </div>
    `;

    try {
        const res = await fetch("/api/destinations");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        allDestinationsData = Array.isArray(data) ? data : (data.destinations || []);

        filterAndRenderDestinations();
    } catch (err) {
        console.error("Error loading destinations:", err);
        container.innerHTML = `
            <div class="empty-state">
                <p>Unable to load destinations right now.</p>
                <button onclick="loadDestinations()" class="cat-pill" style="margin-top:12px;">Try Again</button>
            </div>
        `;
    }
}

function filterAndRenderDestinations() {
    const container = document.getElementById("destinationContainer");
    if (!container) return;

    let filtered = [...allDestinationsData];

    // Category filtering
    if (currentCategory && currentCategory !== "all") {
        filtered = filtered.filter(d => {
            const cat = (d.category || "").toLowerCase();
            return cat === currentCategory.toLowerCase();
        });
    }

    // Search query filtering
    if (currentSearch) {
        const q = currentSearch.toLowerCase();
        filtered = filtered.filter(d => {
            return (
                (d.name || "").toLowerCase().includes(q) ||
                (d.short_description || "").toLowerCase().includes(q) ||
                (d.category || "").toLowerCase().includes(q)
            );
        });
    }

    // Sorting
    filtered.sort((a, b) => {
        const nameA = (a.name || "").toLowerCase();
        const nameB = (b.name || "").toLowerCase();
        if (currentSort === "name-desc") {
            return nameB.localeCompare(nameA);
        }
        return nameA.localeCompare(nameB);
    });

    if (!filtered.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 36px; margin-bottom: 8px;">🔍</div>
                <h3>No Destinations Found</h3>
                <p>No places matched your search filter "${escapeHTML(currentSearch || currentCategory)}".</p>
                <button onclick="resetFilters()" class="cat-pill" style="margin-top:14px;">Reset Filters</button>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map((dest, idx) => {
        const id = dest.id;
        const name = dest.name || "Bhopal Destination";
        const desc = dest.short_description || dest.description || "Discover the majestic heritage and tranquil lakes of Bhopal.";
        const category = dest.category || "Heritage";
        const timings = dest.timings || "Open Daily";
        const fee = dest.entry_fee || "Free / Nominal";

        // Pick photo or fall back gracefully
        let photoUrl = "";
        if (dest.photos && dest.photos.length > 0 && dest.photos[0].url) {
            photoUrl = dest.photos[0].url;
        } else if (dest.image_url) {
            photoUrl = dest.image_url;
        } else {
            photoUrl = curatedBhopalFallbacks[idx % curatedBhopalFallbacks.length];
        }

        const coords = (dest.latitude && dest.longitude)
            ? `${Number(dest.latitude).toFixed(2)}° N, ${Number(dest.longitude).toFixed(2)}° E`
            : "Bhopal, MP";

        return `
            <article class="dest-card" data-id="${id}">
                <div class="dest-thumb-wrap">
                    <img 
                        src="${escapeAttribute(photoUrl)}" 
                        alt="${escapeAttribute(name)}"
                        class="dest-thumb"
                        loading="lazy"
                        onerror="this.onerror=null; this.src='${curatedBhopalFallbacks[0]}';"
                    >
                    <span class="dest-category-badge">${escapeHTML(category)}</span>
                    <span class="dest-pin-badge">📍 ${escapeHTML(coords)}</span>
                </div>

                <div class="dest-body">
                    <h3 class="dest-title">${escapeHTML(name)}</h3>
                    <p class="dest-desc">${escapeHTML(desc)}</p>

                    <div class="dest-meta">
                        <span class="meta-chip">⏰ ${escapeHTML(timings)}</span>
                        <span class="meta-chip">🎟️ ${escapeHTML(fee)}</span>
                    </div>

                    <div class="dest-action">
                        <a href="/destination/${id}" class="explore-link">
                            <span>Explore Destination</span>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
                        </a>
                    </div>
                </div>
            </article>
        `;
    }).join("");
}

function resetFilters() {
    currentCategory = "all";
    currentSearch = "";
    const filterInput = document.getElementById("destinationFilterInput");
    if (filterInput) filterInput.value = "";
    const heroInput = document.getElementById("heroSearchInput");
    if (heroInput) heroInput.value = "";

    const filterBar = document.getElementById("categoryFilterBar");
    if (filterBar) {
        filterBar.querySelectorAll(".cat-pill").forEach(p => p.classList.remove("active"));
        const allBtn = filterBar.querySelector('[data-category="all"]');
        if (allBtn) allBtn.classList.add("active");
    }

    filterAndRenderDestinations();
}

/* ===================================================
   TOURISM GALLERY LOADER
   =================================================== */

async function loadHomeGallery() {
    const container = document.getElementById("homeGalleryContainer");
    if (!container) return;

    try {
        const res = await fetch("/api/gallery");
        if (!res.ok) throw new Error("Gallery fetch error");

        const data = await res.json();
        let photos = data.photos || [];

        // Fallback curated gallery if no uploaded photos yet
        if (!photos.length) {
            photos = [
                { url: "https://images.unsplash.com/photo-1596402184320-417e7178b2cd?auto=format&fit=crop&w=700&q=80", title: "Taj-ul-Masajid Minarets", destination_name: "Taj-ul-Masajid" },
                { url: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=700&q=80", title: "Upper Lake Sunset", destination_name: "Bhojtal" },
                { url: "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=700&q=80", title: "Shaukat Mahal Arches", destination_name: "Shaukat Mahal" },
                { url: "https://images.unsplash.com/photo-1587974928442-77dc3e0dba72?auto=format&fit=crop&w=700&q=80", title: "Wildlife Safari Pathway", destination_name: "Van Vihar" }
            ];
        }

        container.innerHTML = photos.slice(0, 8).map(photo => {
            const caption = photo.title || photo.destination_name || "Bhopal Landmark";
            const sub = photo.destination_name || "Scenic View";
            return `
                <div class="gallery-item" onclick="openLightbox('${escapeAttribute(photo.url)}', '${escapeAttribute(caption)}')">
                    <img src="${escapeAttribute(photo.url)}" alt="${escapeAttribute(caption)}" loading="lazy">
                    <div class="gallery-caption-overlay">
                        <h4>${escapeHTML(caption)}</h4>
                        <span>${escapeHTML(sub)}</span>
                    </div>
                </div>
            `;
        }).join("");
    } catch (err) {
        container.innerHTML = `<p style="text-align:center;color:var(--text-muted);">Explore our destinations above for photos.</p>`;
    }
}

/* ===================================================
   LIGHTBOX MODAL
   =================================================== */

function initLightbox() {
    const modal = document.getElementById("lightboxModal");
    const closeBtn = document.getElementById("lightboxClose");

    if (closeBtn && modal) {
        closeBtn.addEventListener("click", closeLightbox);
        modal.addEventListener("click", (e) => {
            if (e.target === modal) closeLightbox();
        });
    }

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeLightbox();
    });
}

function openLightbox(imgSrc, caption) {
    const modal = document.getElementById("lightboxModal");
    const img = document.getElementById("lightboxImg");
    const cap = document.getElementById("lightboxCaption");

    if (modal && img) {
        img.src = imgSrc;
        if (cap) cap.textContent = caption || "";
        modal.classList.add("open");
        modal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
    }
}

function closeLightbox() {
    const modal = document.getElementById("lightboxModal");
    if (modal) {
        modal.classList.remove("open");
        modal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
    }
}

/* ===================================================
   CONTACT INQUIRY HANDLER
   =================================================== */

function handleContactSubmit(event) {
    event.preventDefault();
    const name = document.getElementById("contactName").value.trim();
    const feedback = document.getElementById("contactFeedback");

    if (feedback) {
        feedback.style.display = "block";
        feedback.innerHTML = `✓ Thank you, <strong>${escapeHTML(name)}</strong>! Your tourism inquiry has been submitted. Our Bhopal Information Desk will contact you shortly.`;
        document.getElementById("contactForm").reset();

        setTimeout(() => {
            feedback.style.display = "none";
        }, 6000);
    }
}

/* ===================================================
   UTILITY ESCAPE HELPERS
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