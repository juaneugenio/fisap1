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
      tags: "ley",
    },
    {
      id: 2,
      category: "Datenschutz",
      frontTitle: "Diferencia entre responsable y encargado",
      frontContent:
        "Roles en GDPR. lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec a diam lectus. Sed sit amet ipsum mauris.",
      backContent:
        "El responsable decide el 'por qué', el encargado procesa por cuenta del responsable.<br>El responsable decide el 'por qué', el encargado procesa por cuenta del responsable.",
      tags: "roles",
    },
    {
      id: 3,
      category: "IT-Sicherheit",
      frontTitle: "Test de Seguridad XSS",
      frontContent:
        "Si ves una alerta, la seguridad falló. <img src=x onerror=alert('HACKED')>",
      backContent:
        "Este script no debe ejecutarse: <script>alert('HACKED')</script>",
      tags: "test",
    },
  ],
};

const container = document.getElementById("app-container");

function renderCategories() {
  container.innerHTML = "";
  data.categories.forEach((cat) => {
    const div = document.createElement("div");
    div.className = "category-item";
    div.innerHTML = `<h3>${cat}</h3>`;
    div.onclick = () => renderCards(cat);
    container.appendChild(div);
  });
}

function renderCards(filter = null, isSearch = false) {
  container.innerHTML = "";
  let filteredCards = isSearch
    ? data.cards.filter(
        (c) =>
          c.frontTitle.toLowerCase().includes(filter.toLowerCase()) ||
          c.tags.toLowerCase().includes(filter.toLowerCase()),
      )
    : data.cards.filter((c) => c.category === filter);

  if (filteredCards.length === 0) {
    container.innerHTML = `<p style="color: var(--text); margin-top: 2rem; font-style: italic;">Es gibt noch keine Karten für diese Suche.</p>`;
    return;
  }

  filteredCards.forEach((card, index) => {
    const cardEl = document.createElement("div");
    cardEl.className = "flashcard"; // Contenedor principal
    cardEl.setAttribute("tabindex", "0"); // Hacer accesible por teclado (Tab)
    cardEl.setAttribute("role", "button"); // Semántica para lectores de pantalla
    cardEl.setAttribute("aria-pressed", "false"); // Estado inicial (no girada)

    // Sanitización de contenido HTML antes de renderizar (Seguridad XSS)
    const safeCategory = DOMPurify.sanitize(card.category);
    const safeTitle = DOMPurify.sanitize(card.frontTitle);
    const safeFront = DOMPurify.sanitize(card.frontContent, {
      ADD_ATTR: ["style"],
    });
    const safeBack = DOMPurify.sanitize(card.backContent, {
      ADD_ATTR: ["style"],
    });

    cardEl.innerHTML = `
        <div class="flashcard-inner">
            <div class="front">
                <span class="card-label">Card ${index + 1} | ${safeCategory}</span>
                <h3>${safeTitle}</h3>
                <div class="front-content">${safeFront}</div>
            </div>
            <div class="back">
                <span class="card-label">Card ${index + 1} | ${safeCategory}</span>
                <div class="back-content">${safeBack}</div>
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
}

// Botones de búsqueda
document.getElementById("searchBtn").onclick = () => {
  const term = document.getElementById("searchInput").value;
  if (term) renderCards(term, true);
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

renderCategories();
