const STORAGE_KEY = "menu-planner-my-menus";
const TAG_STORAGE_KEY = "menu-planner-custom-tags";

const defaultMoods = [
  "あっさり",
  "こってり",
  "肉",
  "野菜",
  "魚",
  "和食",
  "中華",
  "洋食",
  "簡単",
];

let moods = mergeTags(defaultMoods, loadCustomTags());

const recipeSites = [
  {
    id: "site-cookpad",
    source: "site",
    title: "Cookpad",
    url: "https://cookpad.com/",
    description: "家庭料理の投稿レシピを探せる定番サイト。食材名や料理名から探したい時に便利です。",
    tags: ["和食", "中華", "洋食", "肉", "野菜", "魚", "簡単"],
    icon: "pot",
  },
  {
    id: "site-kurashiru",
    source: "site",
    title: "クラシル",
    url: "https://www.kurashiru.com/",
    description: "動画で手順を確認しやすいレシピサービス。短時間で作れる料理を探しやすいです。",
    tags: ["簡単", "肉", "野菜", "魚", "和食", "洋食", "中華"],
    icon: "spoon",
  },
  {
    id: "site-delish",
    source: "site",
    title: "DELISH KITCHEN",
    url: "https://delishkitchen.tv/",
    description: "料理動画とカテゴリ検索が充実したレシピサイト。献立や食材カテゴリから探せます。",
    tags: ["簡単", "肉", "野菜", "魚", "和食", "洋食", "中華"],
    icon: "dish",
  },
  {
    id: "site-nadia",
    source: "site",
    title: "Nadia",
    url: "https://oceans-nadia.com/",
    description: "プロの料理家によるレシピを探せるサイト。見栄えや失敗しにくさを重視したい時に向いています。",
    tags: ["肉", "野菜", "魚", "和食", "洋食", "中華", "簡単"],
    icon: "knife",
  },
  {
    id: "site-rakuten",
    source: "site",
    title: "楽天レシピ",
    url: "https://recipe.rakuten.co.jp/",
    description: "無料で人気順検索ができるレシピサイト。料理名や食材別に候補を探せます。",
    tags: ["肉", "野菜", "魚", "和食", "中華", "洋食", "簡単"],
    icon: "bowl",
  },
];

const sourceLabels = {
  my: "自分の登録献立",
  site: "レシピサイト",
};

const state = {
  source: "all",
  mood: "",
  selectedId: "",
  myMenus: loadMenus(),
};

const menuCards = document.querySelector("#menuCards");
const filterMoodGrid = document.querySelector("#filterMoodGrid");
const formMoodGrid = document.querySelector("#formMoodGrid");
const selectedCount = document.querySelector("#selectedCount");
const todayLabel = document.querySelector("#todayLabel");
const resetButton = document.querySelector("#resetButton");
const clearStorageButton = document.querySelector("#clearStorageButton");
const customTagInput = document.querySelector("#customTagInput");
const addTagButton = document.querySelector("#addTagButton");
const menuForm = document.querySelector("#menuForm");

const formatter = new Intl.DateTimeFormat("ja-JP", {
  month: "long",
  day: "numeric",
  weekday: "short",
});

todayLabel.textContent = formatter.format(new Date());

renderMoodControls();
bindEvents();
render();

function renderMoodControls() {
  filterMoodGrid.innerHTML = "";
  formMoodGrid.innerHTML = "";

  moods.forEach((mood) => {
    const filterButton = document.createElement("button");
    filterButton.type = "button";
    filterButton.className = "mood-chip";
    filterButton.textContent = mood;
    filterButton.dataset.mood = mood;
    filterButton.addEventListener("click", () => {
      state.mood = state.mood === mood ? "" : mood;
      render();
    });
    filterMoodGrid.append(filterButton);

    const label = document.createElement("label");
    label.className = "check-chip";
    const checkbox = document.createElement("input");
    checkbox.name = "tags";
    checkbox.value = mood;
    checkbox.type = "checkbox";
    label.append(checkbox, document.createTextNode(` ${mood}`));
    formMoodGrid.append(label);
  });
}

function bindEvents() {
  document.querySelectorAll(".segment").forEach((button) => {
    button.addEventListener("click", () => {
      state.source = button.dataset.source;
      render();
    });
  });

  resetButton.addEventListener("click", () => {
    state.source = "all";
    state.mood = "";
    render();
  });

  clearStorageButton.addEventListener("click", () => {
    if (!state.myMenus.length) return;
    const ok = window.confirm("登録した献立をすべて削除しますか？");
    if (!ok) return;
    state.myMenus = [];
    saveMenus();
    state.selectedId = "";
    render();
  });

  addTagButton.addEventListener("click", addCustomTag);
  customTagInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addCustomTag();
  });

  menuForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(menuForm);
    const title = String(formData.get("title") || "").trim();
    const ingredients = linesFromText(formData.get("ingredients"));
    const steps = linesFromText(formData.get("steps"));
    const photoFile = formData.get("photo");

    if (!title || ingredients.length === 0 || steps.length === 0) return;

    const menu = {
      id: `my-${Date.now()}`,
      source: "my",
      title,
      time: Number(formData.get("time")) || null,
      description:
        String(formData.get("description") || "").trim() ||
        "登録した自分の献立です。",
      tags: formData.getAll("tags").map(String),
      ingredients,
      steps,
      photo: photoFile instanceof File && photoFile.size > 0 ? await fileToDataUrl(photoFile) : "",
    };

    state.myMenus.unshift(menu);
    state.selectedId = menu.id;
    state.source = "my";
    saveMenus();
    menuForm.reset();
    render();
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", reject);
    reader.readAsDataURL(file);
  });
}

function addCustomTag() {
  const tag = customTagInput.value.trim();
  if (!tag) return;

  const selectedTags = new Set(
    [...document.querySelectorAll("#formMoodGrid input:checked")].map((input) => input.value),
  );
  selectedTags.add(tag);

  moods = mergeTags(moods, [tag]);
  saveCustomTags(moods.filter((mood) => !defaultMoods.includes(mood)));
  customTagInput.value = "";
  renderMoodControls();
  render();

  document.querySelectorAll("#formMoodGrid input").forEach((input) => {
    input.checked = selectedTags.has(input.value);
  });
}

function linesFromText(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function loadMenus() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function loadCustomTags() {
  try {
    return JSON.parse(localStorage.getItem(TAG_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveCustomTags(tags) {
  localStorage.setItem(TAG_STORAGE_KEY, JSON.stringify(tags));
}

function mergeTags(...tagLists) {
  return [...new Set(tagLists.flat().map((tag) => String(tag).trim()).filter(Boolean))];
}

function saveMenus() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.myMenus));
}

function allItems() {
  return [...state.myMenus, ...recipeSites];
}

function getFilteredItems() {
  return allItems().filter((item) => {
    const matchesSource = state.source === "all" || item.source === state.source;
    const matchesMood = !state.mood || item.tags.includes(state.mood);
    return matchesSource && matchesMood;
  });
}

function render() {
  const filteredItems = getFilteredItems();
  selectedCount.textContent = `${filteredItems.length}件`;

  document.querySelectorAll(".segment").forEach((button) => {
    button.classList.toggle("active", button.dataset.source === state.source);
  });

  document.querySelectorAll("#filterMoodGrid .mood-chip").forEach((button) => {
    button.classList.toggle("active", button.dataset.mood === state.mood);
  });

  if (!filteredItems.some((item) => item.id === state.selectedId)) {
    state.selectedId = filteredItems[0]?.id ?? "";
  }

  renderCards(filteredItems);
  renderDetails(allItems().find((item) => item.id === state.selectedId));
}

function renderCards(filteredItems) {
  menuCards.innerHTML = "";

  if (filteredItems.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent =
      "条件に合う候補がありません。自分の献立を登録するか、別の気分を選んでください。";
    menuCards.append(empty);
    return;
  }

  filteredItems.forEach((item) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `menu-card ${item.id === state.selectedId ? "active" : ""}`;
    card.addEventListener("click", () => {
      state.selectedId = item.id;
      render();
    });

    const timeLabel = item.source === "my" && item.time ? `${item.time}分` : "外部サイト";
    const visual = item.photo
      ? `<img src="${item.photo}" alt="" />`
      : `<span class="food-mark ${item.icon || "dish"}" aria-hidden="true"></span>`;
    card.innerHTML = `
      <div class="card-visual">${visual}</div>
      <div class="menu-card-top">
        <h3>${escapeHtml(item.title)}</h3>
        <span class="badge ${item.source}">${sourceLabels[item.source]}</span>
      </div>
      <p>${escapeHtml(item.description)}</p>
      <div class="card-footer">
        <span class="small-time">${timeLabel}</span>
        ${item.source === "my" ? `<span class="delete-link" data-delete="${item.id}">削除</span>` : ""}
      </div>
      <div class="mini-tags">
        ${item.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
      </div>
    `;
    menuCards.append(card);
  });

  document.querySelectorAll("[data-delete]").forEach((deleteButton) => {
    deleteButton.addEventListener("click", (event) => {
      event.stopPropagation();
      const id = deleteButton.dataset.delete;
      state.myMenus = state.myMenus.filter((menu) => menu.id !== id);
      if (state.selectedId === id) state.selectedId = "";
      saveMenus();
      render();
    });
  });
}

function renderDetails(item) {
  document.querySelector("#detailSource").textContent = item
    ? sourceLabels[item.source]
    : "献立";
  document.querySelector("#detailTitle").textContent = item
    ? item.title
    : "献立を登録、またはサイトを選んでください";
  document.querySelector("#detailTime").textContent =
    item?.source === "my" && item.time ? `${item.time}分` : "--分";
  document.querySelector("#detailDescription").textContent = item
    ? item.description
    : "自分の献立を登録すると、材料と調理方法をここで確認できます。";

  const tags = document.querySelector("#detailTags");
  const ingredients = document.querySelector("#ingredientsList");
  const steps = document.querySelector("#stepsList");
  const siteLinks = document.querySelector("#siteLinks");
  const detailPhoto = document.querySelector("#detailPhoto");

  tags.innerHTML = "";
  ingredients.innerHTML = "";
  steps.innerHTML = "";
  siteLinks.innerHTML = "";
  detailPhoto.innerHTML = "";
  detailPhoto.className = "detail-photo";

  if (!item) return;

  if (item.photo) {
    detailPhoto.innerHTML = `<img src="${item.photo}" alt="" />`;
    detailPhoto.classList.add("has-photo");
  } else {
    detailPhoto.innerHTML = `<span class="food-mark large ${item.icon || "dish"}" aria-hidden="true"></span>`;
  }

  item.tags.forEach((tag) => {
    const tagItem = document.createElement("span");
    tagItem.textContent = tag;
    tags.append(tagItem);
  });

  if (item.source === "site") {
    siteLinks.innerHTML = `
      <a class="primary-link" href="${item.url}" target="_blank" rel="noreferrer">公式サイトを開く</a>
      <a class="secondary-link" href="https://www.google.com/search?q=${encodeURIComponent(item.title + " " + (state.mood || "献立"))}" target="_blank" rel="noreferrer">この条件で検索する</a>
    `;
    ingredients.innerHTML = `<li>外部サイトでレシピを選ぶと、各サイト上で材料を確認できます。</li>`;
    steps.innerHTML = `<li>外部サイトのレシピページで調理手順を確認してください。</li>`;
    return;
  }

  item.ingredients.forEach((ingredient) => {
    const listItem = document.createElement("li");
    listItem.textContent = ingredient;
    ingredients.append(listItem);
  });

  item.steps.forEach((step) => {
    const listItem = document.createElement("li");
    listItem.textContent = step;
    steps.append(listItem);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
