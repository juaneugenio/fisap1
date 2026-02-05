// Datos de ejemplo (Simulando lo que vendrá de la DB)
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
      frontContent: "Regulación europea",
      backContent: "Es el Reglamento General de Protección de Datos.",
      tags: "ley, seguridad",
      image: "",
    },
    {
      id: 2,
      category: "IT-Sicherheit",
      frontTitle: "Phishing",
      frontContent: "Definición corta",
      backContent: "Método de estafa para obtener información confidencial.",
      tags: "ataque, seguridad",
      image: "https://via.placeholder.com/100",
    },
  ],
};

const container = document.getElementById("app-container");
const searchInput = document.getElementById("searchInput");

// 1. Mostrar Categorías
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

// 2. Mostrar Tarjetas por Categoría o Búsqueda
function renderCards(filter = null, isSearch = false) {
  container.innerHTML = "";
  let filteredCards = [];

  if (isSearch) {
    filteredCards = data.cards.filter(
      (c) =>
        c.frontTitle.toLowerCase().includes(filter.toLowerCase()) ||
        c.tags.toLowerCase().includes(filter.toLowerCase()),
    );
  } else {
    filteredCards = data.cards.filter((c) => c.category === filter);
  }

  filteredCards.forEach((card) => {
    const cardEl = document.createElement("div");
    cardEl.className = "flashcard";
    cardEl.innerHTML = `
            <div class="flashcard-inner">
                <div class="front">
                    <small>${card.category}</small>
                    <h3>${card.frontTitle}</h3>
                    <p>${card.frontContent}</p>
                </div>
                <div class="back">
                    <p>${card.backContent}</p>
                    ${card.image ? `<img src="${card.image}">` : ""}
                </div>
            </div>
        `;
    cardEl.onclick = () => cardEl.classList.toggle("flipped");
    container.appendChild(cardEl);
  });
}

// 3. Eventos de Búsqueda
document.getElementById("searchBtn").onclick = () => {
  const term = searchInput.value;
  if (term) renderCards(term, true);
};

document.getElementById("resetBtn").onclick = () => {
  searchInput.value = "";
  renderCategories();
};

// Iniciar App
renderCategories();
