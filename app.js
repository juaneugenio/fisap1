// Local data structure
let data = {
  categories: [],
  cards: [],
};

// Initialize Favorites from LocalStorage
let favorites = JSON.parse(localStorage.getItem("flashlearn_favs")) || [];

const container = document.getElementById("app-container");
let currentViewMode = "categories";

// Load data from Supabase
async function loadData() {
  container.innerHTML =
    '<p style="margin-top:2rem; color: var(--accent);">Lade Karten...</p>';

  // 1. Load Categories
  const { data: cats, error: catError } = await supabaseClient
    .from("categories")
    .select("name")
    .order("name");

  if (!catError && cats) {
    data.categories = cats.map((c) => c.name);
  }

  // 2. Load Cards
  const { data: cards, error } = await supabaseClient
    .from("cards")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    container.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    return;
  }

  // Map SQL data (snake_case) to App (camelCase)
  data.cards = cards.map((c) => ({
    ...c,
    frontTitle: c.front_title,
    frontContent: c.front_content,
    backContent: c.back_content,
  }));

  renderCategories();
}

function renderCategories() {
  currentViewMode = "categories";
  // Hide search stats when returning home
  const statsEl = document.getElementById("searchStats");
  if (statsEl) statsEl.style.display = "none";

  container.innerHTML = "";
  data.categories.forEach((cat) => {
    const div = document.createElement("div");
    div.className = "category-item";
    div.innerHTML = `<h3>${cat}</h3>`;
    div.onclick = () => renderCards(cat);
    container.appendChild(div);
  });
}

function renderCards(filter = null, mode = "category") {
  currentViewMode = mode;
  container.innerHTML = "";
  let filteredCards = [];

  if (mode === "search") {
    const lowerFilter = filter.toLowerCase();

    // Search in Title, Tags, and Content (Front/Back) regardless of whether it is a number or text
    filteredCards = data.cards.filter((c) => {
      if (c.frontTitle.toLowerCase().includes(lowerFilter)) return true;
      if (c.tags && c.tags.toLowerCase().includes(lowerFilter)) return true;

      const cleanFront = c.frontContent.replace(/<[^>]+>/g, " ").toLowerCase();
      const cleanBack = c.backContent.replace(/<[^>]+>/g, " ").toLowerCase();

      return (
        cleanFront.includes(lowerFilter) || cleanBack.includes(lowerFilter)
      );
    });
  } else if (mode === "favorites") {
    filteredCards = data.cards.filter((c) => favorites.includes(c.id));
  } else {
    // mode === 'category'
    filteredCards = data.cards.filter((c) => c.category === filter);
  }

  // Show stats only if searching
  const statsEl = document.getElementById("searchStats");
  if (statsEl) {
    if (mode === "search") {
      statsEl.style.display = "block";
      statsEl.textContent = `Suchergebnisse: ${filteredCards.length}`;
    } else {
      statsEl.style.display = "none";
    }
  }

  if (filteredCards.length === 0) {
    const msg =
      mode === "favorites"
        ? "Leere Favoritenliste. Markieren Sie die Karten mit einem Stern, um sie dieser Liste hinzuzufügen."
        : "Es wurden keine Karten gefunden.";
    container.innerHTML = `<p style="color: var(--text); margin-top: 2rem; font-style: italic;">${msg}</p>`;
    return;
  }

  filteredCards.forEach((card, index) => {
    const cardEl = document.createElement("div");
    cardEl.className = "flashcard"; // Main container
    cardEl.setAttribute("tabindex", "0"); // Make accessible via keyboard (Tab)
    cardEl.setAttribute("role", "button"); // Semantics for screen readers
    cardEl.setAttribute("aria-pressed", "false"); // Initial state (not flipped)

    // Favorite state
    const isFav = favorites.includes(card.id);
    const favIcon = isFav ? "★" : "☆";
    const favClass = isFav ? "active" : "";

    // HTML Content Sanitization (XSS Security)
    const safeCategory = DOMPurify.sanitize(card.category);
    const safeTitle = DOMPurify.sanitize(card.frontTitle);
    const safeFront = DOMPurify.sanitize(card.frontContent, {
      ADD_ATTR: ["style"],
    });
    const safeBack = DOMPurify.sanitize(card.backContent, {
      ADD_ATTR: ["style"],
    });

    // Process tags for display (comma separated)
    const tagsList = card.tags
      ? card.tags
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t)
      : [];

    const tagsHtml =
      tagsList.length > 0
        ? `<div class="card-tags">${tagsList.map((tag) => `<span class="tag">#${DOMPurify.sanitize(tag)}</span>`).join("")}</div>`
        : "";

    cardEl.innerHTML = `
        <div class="flashcard-inner">
            <div class="front">
                <button class="card-favorite-btn ${favClass}" onclick="toggleFavorite(event, ${card.id})">${favIcon}</button>
                <span class="card-label">Card ${index + 1} | ${safeCategory}</span>
                <h3>${safeTitle}</h3>
                <div class="front-content">${safeFront}</div>
            </div>
            <div class="back">
                <button class="card-favorite-btn ${favClass}" onclick="toggleFavorite(event, ${card.id})">${favIcon}</button>
                <span class="card-label">Card ${index + 1} | ${safeCategory}</span>
                <div class="back-content">${safeBack}</div>
                ${tagsHtml}
            </div>
        </div>
    `;

    // Flip logic with height animation and auto-close
    cardEl.onclick = function () {
      const isFlipped = this.classList.contains("flipped");

      // 1. If opening a new one (not flipped), close others
      if (!isFlipped) {
        document.querySelectorAll(".flashcard.flipped").forEach((other) => {
          if (other !== this) {
            animateHeight(other, () => {
              other.classList.remove("flipped");
              other.setAttribute("aria-pressed", "false");
            });
          }
        });
      }

      // 2. Toggle current with animation
      animateHeight(this, () => {
        this.classList.toggle("flipped");
        this.setAttribute("aria-pressed", this.classList.contains("flipped"));
      });
    };

    // Accessibility: Allow flip with Enter or Space
    cardEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault(); // Prevent scroll with space
        cardEl.click();
      }
    });
    container.appendChild(cardEl);
  });
  updateFavHeader();
}

// Global function to handle favorites
window.toggleFavorite = function (e, id) {
  e.stopPropagation(); // Prevent card flip

  const index = favorites.indexOf(id);
  const isRemoving = index !== -1;

  if (index === -1) {
    favorites.push(id);
  } else {
    favorites.splice(index, 1);
  }

  // Save to LocalStorage
  localStorage.setItem("flashlearn_favs", JSON.stringify(favorites));
  updateFavHeader();

  // If in favorites view and removing one, remove from DOM immediately
  if (currentViewMode === "favorites" && isRemoving) {
    const cardEl = e.target.closest(".flashcard");
    if (cardEl) cardEl.remove();
    if (favorites.length === 0) {
      container.innerHTML = `<p style="color: var(--text); margin-top: 2rem; font-style: italic;">Leere Favoritenliste. Markieren Sie die Karten mit einem Stern, um sie dieser Liste hinzuzufügen.</p>`;
    }
    return;
  }

  // Update UI for all buttons on this card (front and back)
  const cardInner = e.target.closest(".flashcard-inner");
  const buttons = cardInner.querySelectorAll(".card-favorite-btn");
  const isFav = favorites.includes(id);

  buttons.forEach((btn) => {
    btn.innerHTML = isFav ? "★" : "☆";
    btn.classList.toggle("active", isFav);
    // Reset animation
    btn.classList.remove("pop");
    void btn.offsetWidth; // Trigger reflow
    btn.classList.add("pop");
  });
};

// Search buttons
document.getElementById("searchBtn").onclick = () => {
  // Best practices: trim() removes whitespace
  const term = document.getElementById("searchInput").value.trim();
  // If empty after trim, do nothing (avoids empty searches)
  if (term) {
    renderCards(term, "search");
  }
};

// Allow search by pressing Enter
document.getElementById("searchInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    document.getElementById("searchBtn").click();
  }
});

document.getElementById("resetBtn").onclick = () => {
  document.getElementById("searchInput").value = "";
  renderCategories();
};

// Helper to smoothly animate container height
function animateHeight(card, changeStateFn) {
  const currentHeight = card.offsetHeight;
  card.style.height = currentHeight + "px";

  // Execute state change (flipped class)
  changeStateFn();

  // Calculate new height based on visible side
  const isFlipped = card.classList.contains("flipped");
  const front = card.querySelector(".front");
  const back = card.querySelector(".back");
  const targetHeight = isFlipped ? back.offsetHeight : front.offsetHeight;

  void card.offsetHeight; // Forzar reflow
  card.style.height = targetHeight + "px";

  // Clear inline style after transition (0.5s matches CSS)
  setTimeout(() => {
    card.style.height = "";
  }, 500);
}

function updateFavHeader() {
  const count = favorites.length;
  const countEl = document.getElementById("favCount");
  if (countEl) {
    countEl.textContent = count > 0 ? `(${count})` : "";
  }
}

loadData(); // Start data loading
updateFavHeader();
