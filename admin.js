document.addEventListener("DOMContentLoaded", () => {
  const quillConfig = {
    theme: "snow",
    modules: {
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ["bold", "italic", "underline"],
        [{ list: "ordered" }, { list: "bullet" }],
        [{ align: [] }],
        [{ color: [] }, { background: [] }],
        ["blockquote", "code", "code-block"],
        ["link", "image"],
        ["clean"],
      ],
    },
  };

  const qFront = new Quill("#editor-front", quillConfig);
  const qBack = new Quill("#editor-back", quillConfig);

  // --- IMAGE HANDLING WITH SUPABASE STORAGE ---
  // Override default Quill image handler
  qFront
    .getModule("toolbar")
    .addHandler("image", () => selectLocalImage(qFront));
  qBack.getModule("toolbar").addHandler("image", () => selectLocalImage(qBack));

  function selectLocalImage(quillInstance) {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.click();

    input.onchange = async () => {
      const file = input.files[0];
      if (/^image\//.test(file.type)) {
        await saveImageToSupabase(file, quillInstance);
      } else {
        alert("Nur Bilder sind erlaubt.");
      }
    };
  }

  async function saveImageToSupabase(file, quillInstance) {
    // Generate unique name: timestamp-random.ext
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabaseClient.storage
      .from("card-images") // Name of the bucket you created
      .upload(filePath, file);

    if (error) {
      alert("Fehler beim Hochladen des Bildes: " + error.message);
      return;
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabaseClient.storage.from("card-images").getPublicUrl(filePath);

    // Insert image into editor
    const range = quillInstance.getSelection(true);
    quillInstance.insertEmbed(range.index, "image", publicUrl);
  }

  // Global variables
  let allCategories = [];
  let cardToDeleteId = null;
  let catToDeleteId = null;
  let catToDeleteName = null;
  let catToEditId = null;

  // Check session on load
  async function checkSession() {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();
    if (session) {
      // Check for the secure admin claim from the JWT's app_metadata
      if (session.user.app_metadata?.admin !== true) {
        alert("Zugriff verweigert. Sie sind kein Administrator.");
        // Securely log out the user and redirect
        await supabaseClient.auth.signOut();
        window.location.href = "index.html";
        return;
      }
      document.getElementById("login-overlay").style.display = "none";
      loadCategories(); // Load categories on init
      showView("dashboard-view");
    }
  }

  async function login() {
    const email = document.getElementById("emailInput").value;
    const password = document.getElementById("passInput").value;
    const errorEl = document.getElementById("loginError");

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      errorEl.textContent = "Fehler: " + error.message;
      errorEl.style.display = "block";
    } else {
      // Check for the secure admin claim after login
      if (data.user.app_metadata?.admin !== true) {
        errorEl.textContent =
          "Zugriff verweigert. Sie sind kein Administrator.";
        errorEl.style.display = "block";
        await supabaseClient.auth.signOut(); // Log them out immediately
        return;
      }
      errorEl.style.display = "none";
      document.getElementById("login-overlay").style.display = "none";
      loadCategories();
      showView("dashboard-view");
    }
  }

  // --- VIEW MANAGEMENT ---
  function showView(viewId) {
    // Hide all
    [
      "dashboard-view",
      "categories-view",
      "cards-view",
      "card-form-view",
    ].forEach((id) => {
      document.getElementById(id).classList.add("hidden");
    });
    // Show selected
    document.getElementById(viewId).classList.remove("hidden");

    if (viewId === "categories-view") renderCategoriesList();
    if (viewId === "cards-view") searchAdminCards(); // Load all on view entry
  }

  // --- CATEGORY MANAGEMENT ---
  async function loadCategories() {
    const { data, error } = await supabaseClient
      .from("categories")
      .select("*")
      .order("name");
    if (data) {
      allCategories = data;
      updateCategorySelect();
    }
  }

  function updateCategorySelect() {
    const select = document.getElementById("categorySelect");
    select.innerHTML = '<option value="">☞ Kategorie auswählen</option>';
    allCategories.forEach((cat) => {
      const option = document.createElement("option");
      option.value = cat.name;
      option.textContent = cat.name;
      select.appendChild(option);
    });
  }

  function renderCategoriesList() {
    const list = document.getElementById("categories-list");
    list.innerHTML = "";
    allCategories.forEach((cat) => {
      const item = document.createElement("div");
      item.className = "admin-list-item";
      item.innerHTML = `
        <div style="font-weight: bold;">${DOMPurify.sanitize(cat.name)}</div>
        <div style="display: flex; gap: 5px; justify-content: flex-end; flex: 0 0 auto;">
          <button class="btn btn-edit-cat" style="padding: 5px 10px; font-size: 0.8rem;" data-id="${cat.id}">Edit</button>
          <button class="btn btn-delete-cat" style="background: #ff6b6b; color: white; padding: 5px 10px; font-size: 0.8rem;" data-id="${cat.id}">Delete</button>
        </div>
      `;
      list.appendChild(item);
    });
  }

  async function addCategory() {
    const name = document.getElementById("newCatInput").value.trim();
    if (!name) return;
    const { error } = await supabaseClient
      .from("categories")
      .insert([{ name }]);
    if (!error) {
      document.getElementById("newCatInput").value = "";
      await loadCategories();
      renderCategoriesList();
    } else {
      alert("Fehler: " + error.message);
    }
  }

  function editCategory(id) {
    const cat = allCategories.find((c) => c.id === id);
    if (!cat) return;

    catToEditId = id;
    document.getElementById("editCatInput").value = cat.name;
    document.getElementById("edit-cat-modal-overlay").style.display = "flex";
  }

  async function confirmEditCategory() {
    const cat = allCategories.find((c) => c.id === catToEditId);
    if (!cat) return;

    const newName = document.getElementById("editCatInput").value;

    if (newName && newName.trim() !== "" && newName !== cat.name) {
      const trimmedName = newName.trim();

      // 1. Update name in categories table
      const { error: catError } = await supabaseClient
        .from("categories")
        .update({ name: trimmedName })
        .eq("id", catToEditId);

      if (catError) {
        alert("Fehler beim Aktualisieren der Kategorie: " + catError.message);
        return;
      }

      await loadCategories();
      renderCategoriesList();
      closeEditCatModal();
    }
  }

  function closeEditCatModal() {
    document.getElementById("edit-cat-modal-overlay").style.display = "none";
    catToEditId = null;
  }

  async function askDeleteCategory(id) {
    const cat = allCategories.find((c) => c.id === id);
    if (!cat) return;

    catToDeleteId = id;
    catToDeleteName = cat.name;

    // Count affected cards
    const { count, error } = await supabaseClient
      .from("cards")
      .select("*", { count: "exact", head: true })
      .eq("category", cat.name);

    if (error) {
      alert("Fehler beim Zählen der Karten: " + error.message);
      return;
    }

    const msg = `Möchten Sie die Kategorie "${cat.name}" wirklich löschen? ${count} zugehörige Karten werden ebenfalls gelöscht.`;
    document.getElementById("delete-cat-msg").textContent = msg;
    document.getElementById("delete-cat-modal-overlay").style.display = "flex";
  }

  async function confirmDeleteCategory() {
    if (!catToDeleteId || !catToDeleteName) return;

    // Delete category (Database will auto-delete associated cards via CASCADE)
    const { error } = await supabaseClient
      .from("categories")
      .delete()
      .eq("id", catToDeleteId);

    if (error) {
      alert("Fehler beim Löschen der Kategorie: " + error.message);
    } else {
      closeDeleteCatModal();
      await loadCategories();
      renderCategoriesList();
    }
  }

  function closeDeleteCatModal() {
    document.getElementById("delete-cat-modal-overlay").style.display = "none";
    catToDeleteId = null;
    catToDeleteName = null;
  }

  function resetAdminSearch() {
    document.getElementById("adminSearchInput").value = "";
    searchAdminCards();
  }

  // --- CARD MANAGEMENT ---
  async function searchAdminCards() {
    const term = document.getElementById("adminSearchInput").value.trim();
    const list = document.getElementById("cards-list");
    const statsEl = document.getElementById("adminSearchStats");
    list.innerHTML = "<p>Laden...</p>";
    if (statsEl) statsEl.style.display = "none";

    let query = supabaseClient
      .from("cards")
      .select("*")
      .order("created_at", { ascending: false });

    if (term) {
      // Comprehensive search across title, tags, and content
      const searchFilter = `front_title.ilike.%${term}%,tags.ilike.%${term}%,front_content.ilike.%${term}%,back_content.ilike.%${term}%`;
      query = query.or(searchFilter);
    }

    const { data, error } = await query;

    list.innerHTML = "";

    if (term && statsEl && data) {
      if (data.length > 0) {
        statsEl.style.display = "block";
        statsEl.textContent = `${data.length} Karten gefunden`;
      } else {
        statsEl.style.display = "none";
      }
    }

    if (data && data.length > 0) {
      data.forEach((card) => {
        const item = document.createElement("div");
        item.className = "admin-card-item";

        // Format date (use updated_at or created_at if it doesn't exist)
        const dateStr = new Date(
          card.updated_at || card.created_at,
        ).toLocaleDateString("de-DE");

        item.innerHTML = `
          <span class="card-label">Card ${card.id} | ${DOMPurify.sanitize(card.category)}</span>
          <div class="card-title-truncate">${DOMPurify.sanitize(card.front_title)}</div>
          <div style="font-size: 0.65rem; color: #3A5F1F; margin-right: 10px; white-space: nowrap;">${dateStr}</div>
          <button class="btn btn-edit-card" style="flex: 0 0 auto; padding: 5px 10px;" data-id="${card.id}">edit</button>
        `;
        list.appendChild(item);
      });
    } else {
      list.innerHTML = "<p>Keine Karten gefunden.</p>";
    }
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById("editCardId").value;
    const cat = document.getElementById("categorySelect").value;
    const title = DOMPurify.sanitize(
      document.getElementById("frontTitle").value.trim(),
    );
    const tags = DOMPurify.sanitize(
      document.getElementById("tags").value.trim(),
    );
    const frontHtml = DOMPurify.sanitize(qFront.root.innerHTML.trim(), {
      ADD_ATTR: ["style"],
    });
    const backHtml = DOMPurify.sanitize(qBack.root.innerHTML.trim(), {
      ADD_ATTR: ["style"],
    });

    const isBackEmpty =
      qBack.getText().trim().length === 0 && !backHtml.includes("<img");

    // Validation
    if (!cat || !title || !tags || isBackEmpty) {
      const err = document.getElementById("formError");
      err.textContent = "Bitte füllen Sie alle Felder aus."; // German message consistent with modals
      err.style.display = "block";
      return;
    }
    document.getElementById("formError").style.display = "none";

    // Save to Supabase
    const cardData = {
      category: cat,
      front_title: title,
      tags: tags,
      front_content: frontHtml,
      back_content: backHtml,
      updated_at: new Date().toISOString(), // Save update date
    };

    saveCardToSupabase(cardData, id);
  }

  function prepareCreateCard() {
    resetForNew();
    document.getElementById("formTitle").textContent = "Flashcard erstellen";
    document.getElementById("saveBtn").textContent = "KARTE SPEICHERN";
    document.getElementById("deleteBtn").style.display = "none";
    document.getElementById("editCardId").value = "";
    showView("card-form-view");
  }

  async function editCard(id) {
    const { data, error } = await supabaseClient
      .from("cards")
      .select("*")
      .eq("id", id)
      .single();
    if (data) {
      document.getElementById("formError").style.display = "none";
      document.getElementById("formTitle").textContent =
        `Karte Nr. ${id} bearbeiten`;
      document.getElementById("saveBtn").textContent = "KARTE AKTUALISIEREN";
      document.getElementById("deleteBtn").style.display = "inline-block";
      document.getElementById("editCardId").value = id;

      document.getElementById("categorySelect").value = data.category;
      document.getElementById("tags").value = data.tags || "";
      document.getElementById("frontTitle").value = data.front_title;
      qFront.clipboard.dangerouslyPasteHTML(data.front_content);
      qBack.clipboard.dangerouslyPasteHTML(data.back_content);

      showView("card-form-view");
    }
  }

  function askDeleteCard() {
    cardToDeleteId = document.getElementById("editCardId").value;
    document.getElementById("delete-modal-overlay").style.display = "flex";
  }

  function closeDeleteModal() {
    document.getElementById("delete-modal-overlay").style.display = "none";
    cardToDeleteId = null;
  }

  async function confirmDelete() {
    if (cardToDeleteId) {
      const { error } = await supabaseClient
        .from("cards")
        .delete()
        .eq("id", cardToDeleteId);
      if (!error) {
        closeDeleteModal();
        showView("cards-view");
      } else {
        alert("Fehler beim Löschen: " + error.message);
      }
    }
  }

  async function saveCardToSupabase(cardData, id = null) {
    let result;
    if (id) {
      // Update
      result = await supabaseClient.from("cards").update(cardData).eq("id", id);
    } else {
      // Insert
      result = await supabaseClient.from("cards").insert([cardData]);
    }

    const { error } = result;

    if (error) {
      alert("Fehler beim Speichern: " + error.message);
    } else {
      showSuccessModal(id ? "update" : "create");
    }
  }

  function showSuccessModal(mode) {
    const overlay = document.getElementById("modal-overlay");
    const title = document.getElementById("successModalTitle");
    const msg = document.getElementById("successModalMsg");
    const btnYes = document.getElementById("successModalYesBtn");
    const btnNo = document.getElementById("successModalNoBtn");

    overlay.style.display = "flex";

    if (mode === "create") {
      title.textContent = "Karte gespeichert!";
      msg.textContent = "Eine weitere Karte erstellen?";
      btnYes.textContent = "Ja";
      btnYes.onclick = resetForNew;

      btnNo.textContent = "Nein (Zurück)";
      btnNo.onclick = () => {
        overlay.style.display = "none";
        showView("cards-view");
      };
    } else {
      title.textContent = "Karte aktualisiert!";
      msg.textContent = "Möchten Sie diese Karte weiter bearbeiten?";
      btnYes.textContent = "Ja";
      btnYes.onclick = () => {
        overlay.style.display = "none";
      };

      btnNo.textContent = "Nein (Zurück)";
      btnNo.onclick = () => {
        overlay.style.display = "none";
        showView("cards-view");
      };
    }
  }

  async function logout() {
    const { error } = await supabaseClient.auth.signOut();
    if (!error) {
      window.location.href = "index.html";
    }
  }

  function resetForNew() {
    document.getElementById("modal-overlay").style.display = "none";
    document.getElementById("cardForm").reset();
    document.getElementById("formError").style.display = "none";
    qFront.setContents([]);
    qBack.setContents([]);
    window.scrollTo(0, 0);
  }

  // --- EVENT LISTENERS ---

  // Login
  document.getElementById("loginBtn").addEventListener("click", login);
  document
    .getElementById("exitLoginBtn")
    .addEventListener("click", () => (window.location.href = "index.html"));

  // View Changers
  document.querySelectorAll("[data-view-target]").forEach((el) => {
    el.addEventListener("click", () => {
      showView(el.dataset.viewTarget);
    });
  });

  // Logout
  document.querySelector(".btn-logout").addEventListener("click", logout);

  // Modals
  document
    .getElementById("confirmDeleteBtn")
    .addEventListener("click", confirmDelete);
  document
    .getElementById("cancelDeleteBtn")
    .addEventListener("click", closeDeleteModal);
  document
    .getElementById("confirmDeleteCatBtn")
    .addEventListener("click", confirmDeleteCategory);
  document
    .getElementById("cancelDeleteCatBtn")
    .addEventListener("click", closeDeleteCatModal);
  document
    .getElementById("confirmEditCatBtn")
    .addEventListener("click", confirmEditCategory);
  document
    .getElementById("cancelEditCatBtn")
    .addEventListener("click", closeEditCatModal);

  // Category Management
  document.getElementById("addCatBtn").addEventListener("click", addCategory);
  document.getElementById("categories-list").addEventListener("click", (e) => {
    const target = e.target;
    const id = parseInt(target.dataset.id, 10);
    if (target.matches(".btn-edit-cat")) {
      editCategory(id);
    } else if (target.matches(".btn-delete-cat")) {
      askDeleteCategory(id);
    }
  });

  // Card Management
  document
    .getElementById("addCardBtn")
    .addEventListener("click", prepareCreateCard);
  document
    .getElementById("resetAdminSearchBtn")
    .addEventListener("click", resetAdminSearch);
  document
    .getElementById("searchAdminBtn")
    .addEventListener("click", searchAdminCards);
  document
    .getElementById("adminSearchInput")
    .addEventListener("keypress", (e) => {
      if (e.key === "Enter") searchAdminCards();
    });
  document.getElementById("cards-list").addEventListener("click", (e) => {
    const editButton = e.target.closest(".btn-edit-card");
    if (editButton) {
      const id = parseInt(editButton.dataset.id, 10);
      editCard(id);
    }
  });

  // Card Form
  document
    .getElementById("cardForm")
    .addEventListener("submit", handleFormSubmit);
  document.getElementById("deleteBtn").addEventListener("click", askDeleteCard);

  // Initial Load
  checkSession();
});
