// Mock data actualizado para la prueba
const data = {
  categories: [
    "Projektmanagement",
    "Datenschutz",
    "IT-Sicherheit",
    "Qualitätsmanagement",
  ],
  cards: [
    {
      id: 1,
      category: "Datenschutz",
      frontTitle: "¿Qué es GDPR?",
      frontContent: "Regulación europea de datos.",
      backContent:
        "Es el Reglamento General de Protección de Datos que entró en vigor en 2018. lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec a diam lectus. Sed sit amet ipsum mauris.<br><br>Maecenas congue ligula ac quam viverra nec consectetur ante hendrerit. Donec et mollis dolor. Praesent et diam eget libero egestas mattis sit amet vitae augue. Nam tincidunt congue enim, ut porta lorem lacinia consectetur.",
      tags: "ley, gdpr, europa",
    },
    {
      id: 2,
      category: "Datenschutz",
      frontTitle: "Diferencia entre responsable y encargado",
      frontContent:
        "Roles en GDPR. lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec a diam lectus. Sed sit amet ipsum mauris.",
      backContent:
        "El responsable decide el 'por qué', el encargado procesa por cuenta del responsable.<br>El responsable decide el 'por qué', el encargado procesa por cuenta del responsable y sus roles.",
      tags: "roles, gdpr",
    },
    {
      id: 3,
      category: "Datenschutz",
      frontTitle: "Implementación de GDPR en empresas",
      frontContent:
        "Roles y medidas prácticas. lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec a diam lectus. Sed sit amet ipsum mauris.",
      backContent:
        "El responsable decide el 'por qué', el encargado procesa por cuenta del responsable.<br>El responsable decide el 'por qué', el encargado procesa por cuenta del responsable.",
      tags: "roles, management, praxis",
    },
  ],
};

// Inicializar Favoritos desde LocalStorage
let favorites = JSON.parse(localStorage.getItem("flashlearn_favs")) || [];

const container = document.getElementById("app-container");
let currentViewMode = "categories";

function renderCategories() {
  currentViewMode = "categories";
  // Ocultar estadísticas de búsqueda al volver al home
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
    filteredCards = data.cards.filter(
      (c) =>
        c.frontTitle.toLowerCase().includes(filter.toLowerCase()) ||
        (c.tags && c.tags.toLowerCase().includes(filter.toLowerCase())) ||
        c.frontContent.toLowerCase().includes(filter.toLowerCase()) ||
        c.backContent.toLowerCase().includes(filter.toLowerCase()),
    );
  } else if (mode === "favorites") {
    filteredCards = data.cards.filter((c) => favorites.includes(c.id));
  } else {
    // mode === 'category'
    filteredCards = data.cards.filter((c) => c.category === filter);
  }

  // Mostrar estadísticas solo si es una búsqueda
  const statsEl = document.getElementById("searchStats");
  if (statsEl) {
    if (mode === "search") {
      statsEl.style.display = "block";
      statsEl.textContent = `${filteredCards.length} Karten für diese Suche`;
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
    cardEl.className = "flashcard"; // Contenedor principal
    cardEl.setAttribute("tabindex", "0"); // Hacer accesible por teclado (Tab)
    cardEl.setAttribute("role", "button"); // Semántica para lectores de pantalla
    cardEl.setAttribute("aria-pressed", "false"); // Estado inicial (no girada)

    // Estado de favorito
    const isFav = favorites.includes(card.id);
    const favIcon = isFav ? "★" : "☆";
    const favClass = isFav ? "active" : "";

    // Sanitización de contenido HTML antes de renderizar (Seguridad XSS)
    const safeCategory = DOMPurify.sanitize(card.category);
    const safeTitle = DOMPurify.sanitize(card.frontTitle);
    const safeFront = DOMPurify.sanitize(card.frontContent, {
      ADD_ATTR: ["style"],
    });
    const safeBack = DOMPurify.sanitize(card.backContent, {
      ADD_ATTR: ["style"],
    });

    // Procesar tags para visualización (separar por comas)
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

    // Lógica de flip con animación de altura y cierre automático
    cardEl.onclick = function () {
      const isFlipped = this.classList.contains("flipped");

      // 1. Si abrimos una nueva (no estaba flipped), cerrar las otras
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

      // 2. Alternar la actual con animación
      animateHeight(this, () => {
        this.classList.toggle("flipped");
        this.setAttribute("aria-pressed", this.classList.contains("flipped"));
      });
    };

    // Accesibilidad: Permitir girar con Enter o Espacio
    cardEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault(); // Evitar scroll con espacio
        cardEl.click();
      }
    });
    container.appendChild(cardEl);
  });
  updateFavHeader();
}

// Función global para manejar favoritos
window.toggleFavorite = function (e, id) {
  e.stopPropagation(); // Evitar que la tarjeta gire

  const index = favorites.indexOf(id);
  const isRemoving = index !== -1;

  if (index === -1) {
    favorites.push(id);
  } else {
    favorites.splice(index, 1);
  }

  // Guardar en LocalStorage
  localStorage.setItem("flashlearn_favs", JSON.stringify(favorites));
  updateFavHeader();

  // Si estamos en vista favoritos y quitamos uno, eliminar del DOM inmediatamente
  if (currentViewMode === "favorites" && isRemoving) {
    const cardEl = e.target.closest(".flashcard");
    if (cardEl) cardEl.remove();
    if (favorites.length === 0) {
      container.innerHTML = `<p style="color: var(--text); margin-top: 2rem; font-style: italic;">Leere Favoritenliste. Markieren Sie die Karten mit einem Stern, um sie dieser Liste hinzuzufügen.</p>`;
    }
    return;
  }

  // Actualizar UI de todos los botones de esta tarjeta (front y back)
  const cardInner = e.target.closest(".flashcard-inner");
  const buttons = cardInner.querySelectorAll(".card-favorite-btn");
  const isFav = favorites.includes(id);

  buttons.forEach((btn) => {
    btn.innerHTML = isFav ? "★" : "☆";
    btn.classList.toggle("active", isFav);
    // Reiniciar animación
    btn.classList.remove("pop");
    void btn.offsetWidth; // Trigger reflow
    btn.classList.add("pop");
  });
};

// Botones de búsqueda
document.getElementById("searchBtn").onclick = () => {
  // Buenas prácticas: trim() elimina espacios al inicio y final
  const term = document.getElementById("searchInput").value.trim();
  // Si después de limpiar está vacío, no hacemos nada (evita búsquedas vacías)
  if (term) {
    renderCards(term, "search");
  }
};

// Permitir búsqueda presionando la tecla Enter
document.getElementById("searchInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    document.getElementById("searchBtn").click();
  }
});

document.getElementById("resetBtn").onclick = () => {
  document.getElementById("searchInput").value = "";
  renderCategories();
};

// Helper para animar suavemente la altura del contenedor
function animateHeight(card, changeStateFn) {
  const currentHeight = card.offsetHeight;
  card.style.height = currentHeight + "px";

  // Ejecutar el cambio de estado (clase flipped)
  changeStateFn();

  // Calcular nueva altura basada en el lado que será visible (relative)
  const isFlipped = card.classList.contains("flipped");
  const front = card.querySelector(".front");
  const back = card.querySelector(".back");
  const targetHeight = isFlipped ? back.offsetHeight : front.offsetHeight;

  void card.offsetHeight; // Forzar reflow
  card.style.height = targetHeight + "px";

  // Limpiar estilo inline después de la transición (0.5s coincide con CSS)
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

renderCategories();
updateFavHeader();
