
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// ===================================
// NEXORA - SUPABASE
// ===================================

const SUPABASE_URL = "https://ujgcdhfldomgdksgkoyy.supabase.co";
const SUPABASE_KEY = "sb_publishable_Mewf_vfa7DAngWNoKLnXVA_y7iuToMp";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let isLoggingIn = false;

const $ = id => document.getElementById(id);

// ===================================
// SECURITY HELPERS
// ===================================

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function safeImageUrl(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

// ===================================
// STATUS
// ===================================

function showStatus(message, type = "error") {
  const status = $("loginStatus");
  if (!status) return;

  status.textContent = message;
  status.dataset.type = type;
  status.hidden = false;
}

function hideStatus() {
  const status = $("loginStatus");
  if (!status) return;

  status.textContent = "";
  status.hidden = true;
}

function articleMessage(message, type = "info") {
  const element = $("articleStatusMessage");
  if (!element) return;

  element.textContent = message;
  element.dataset.type = type;
}

// ===================================
// LOGIN DISPLAY
// ===================================

function showLogin() {
  if ($("adminDashboard")) $("adminDashboard").hidden = true;
  if ($("loginSection")) $("loginSection").hidden = false;

  currentUser = null;
}

// ===================================
// ADMIN VERIFICATION
// ===================================

async function checkAdmin(user) {
  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (error) throw error;

    if (!profile || profile.role !== "admin") {
      await supabase.auth.signOut();
      showLogin();
      showStatus("هذا الحساب لا يملك صلاحية المدير.");
      return false;
    }

    currentUser = user;

    $("loginSection").hidden = true;
    $("adminDashboard").hidden = false;

    if ($("adminEmailDisplay")) {
      $("adminEmailDisplay").textContent = "مرحباً: " + user.email;
    }

    hideStatus();

    await loadArticles();

    return true;

  } catch (error) {
    console.error(error);
    showLogin();
    showStatus("تعذر التحقق من صلاحيات المدير: " + error.message);
    return false;
  }
}

// ===================================
// LOGIN
// ===================================

async function login(event) {
  event.preventDefault();

  if (isLoggingIn) return;

  const email = $("adminEmail").value.trim();
  const password = $("adminPassword").value;
  const button = $("loginButton");

  if (!email || !password) {
    showStatus("يرجى إدخال البريد وكلمة المرور.");
    return;
  }

  isLoggingIn = true;
  button.disabled = true;
  button.textContent = "جارٍ الدخول...";

  hideStatus();

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    if (!data.user) throw new Error("لم يتم العثور على الحساب.");

    const success = await checkAdmin(data.user);

    if (success) $("adminPassword").value = "";

  } catch (error) {
    showLogin();
    showStatus("فشل تسجيل الدخول: " + error.message);

  } finally {
    isLoggingIn = false;
    button.disabled = false;
    button.textContent = "دخول";
  }
}

// ===================================
// LOGOUT
// ===================================

async function logout() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    alert("تعذر تسجيل الخروج: " + error.message);
    return;
  }

  currentUser = null;
  showLogin();

  $("adminEmail").value = "";
  $("adminPassword").value = "";
  hideStatus();
}

// ===================================
// ARTICLE FORM
// ===================================

function resetArticleForm() {
  $("articleForm").reset();
  $("articleId").value = "";
  $("saveArticleButton").textContent = "حفظ المقال";
  articleMessage("");
}

function getArticleData() {
  return {
    title: $("articleTitle").value.trim(),
    slug: $("articleSlug").value.trim(),
    excerpt: $("articleExcerpt").value.trim() || null,
    content: $("articleContent").value.trim(),
    image_url: $("articleImage").value.trim() || null,
    status: $("articleStatus").value
  };
}

// ===================================
// LOAD ARTICLES
// ===================================

async function loadArticles() {
  const list = $("articlesList");

  if (!currentUser || !list) return;

  list.textContent = "جارٍ تحميل المقالات...";

  try {
    const { data, error } = await supabase
      .from("articles")
      .select("id, title, slug, content, excerpt, image_url, status, author_id, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    renderArticles(data || []);

    if ($("articlesCount")) {
      $("articlesCount").textContent = data.length;
    }

  } catch (error) {
    console.error(error);
    list.textContent = "تعذر تحميل المقالات: " + error.message;
  }
}

// ===================================
// DISPLAY ARTICLES
// ===================================

function renderArticles(articles) {
  const list = $("articlesList");

  if (!articles.length) {
    list.innerHTML = "<p>لا توجد مقالات حالياً. أضف أول مقال!</p>";
    return;
  }

  list.innerHTML = articles.map(article => {
    const image = safeImageUrl(article.image_url);

    return `
      <article class="article-admin-card"
        data-id="${escapeHTML(article.id)}">

        ${image ? `
          <img
            src="${escapeHTML(image)}"
            alt="${escapeHTML(article.title)}"
            loading="lazy"
            style="max-width:160px;height:auto"
          >
        ` : ""}

        <h3>${escapeHTML(article.title)}</h3>

        <p>${escapeHTML(article.excerpt || "")}</p>

        <p>الرابط: ${escapeHTML(article.slug)}</p>

        <p>الحالة:
          <strong>
            ${article.status === "published" ? "منشور" : "مسودة"}
          </strong>
        </p>

        <button type="button" data-action="edit">
          تعديل
        </button>

        <button type="button" data-action="delete">
          حذف
        </button>

      </article>
    `;
  }).join("");
}

// ===================================
// SAVE ARTICLE
// ===================================

async function saveArticle(event) {
  event.preventDefault();

  if (!currentUser) {
    articleMessage("يجب تسجيل الدخول أولاً.");
    return;
  }

  const button = $("saveArticleButton");
  const articleId = $("articleId").value;
  const article = getArticleData();

  if (!article.title || !article.slug || !article.content) {
    articleMessage("يرجى إكمال الحقول المطلوبة.");
    return;
  }

  button.disabled = true;
  button.textContent = "جارٍ الحفظ...";

  try {
    let result;

    if (articleId) {
      result = await supabase
        .from("articles")
        .update({
          ...article,
          updated_at: new Date().toISOString()
        })
        .eq("id", articleId)
        .select();

    } else {
      result = await supabase
        .from("articles")
        .insert({
          ...article,
          author_id: currentUser.id
        })
        .select();
    }

    if (result.error) throw result.error;

    if (!result.data || result.data.length === 0) {
      throw new Error("لم يتم حفظ المقال. تحقق من صلاحيات قاعدة البيانات.");
    }

    articleMessage(
      articleId ? "تم تعديل المقال بنجاح." : "تمت إضافة المقال بنجاح.",
      "success"
    );

    resetArticleForm();
    await loadArticles();

  } catch (error) {
    console.error(error);
    articleMessage("فشل حفظ المقال: " + error.message);

  } finally {
    button.disabled = false;
    button.textContent = "حفظ المقال";
  }
}

// ===================================
// EDIT ARTICLE
// ===================================

async function editArticle(id) {
  try {
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    $("articleId").value = data.id;
    $("articleTitle").value = data.title || "";
    $("articleSlug").value = data.slug || "";
    $("articleExcerpt").value = data.excerpt || "";
    $("articleContent").value = data.content || "";
    $("articleImage").value = data.image_url || "";
    $("articleStatus").value = data.status || "draft";

    $("saveArticleButton").textContent = "حفظ التعديلات";

    $("articleForm").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    articleMessage("أنت الآن تعدّل المقال.");

  } catch (error) {
    articleMessage("تعذر تحميل المقال: " + error.message);
  }
}

// ===================================
// DELETE ARTICLE
// ===================================

async function deleteArticle(id) {
  if (!confirm("هل أنت متأكد من حذف هذا المقال؟")) return;

  try {
    const { error } = await supabase
      .from("articles")
      .delete()
      .eq("id", id);

    if (error) throw error;

    articleMessage("تم حذف المقال بنجاح.", "success");

    await loadArticles();

  } catch (error) {
    articleMessage("فشل حذف المقال: " + error.message);
  }
}

// ===================================
// ARTICLE BUTTONS
// ===================================

function setupArticleActions() {
  $("articlesList").addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const card = button.closest("[data-id]");
    if (!card) return;

    const id = card.dataset.id;

    if (button.dataset.action === "edit") {
      editArticle(id);
    }

    if (button.dataset.action === "delete") {
      deleteArticle(id);
    }
  });

  $("articleForm").addEventListener("submit", saveArticle);

  $("cancelEditButton").addEventListener("click", resetArticleForm);
}

// ===================================
// MOBILE MENU
// ===================================

function setupMenu() {
  const toggle = $("menuToggle");
  const sidebar = $("sidebar");

  if (!toggle || !sidebar) return;

  toggle.addEventListener("click", () => {
    sidebar.classList.toggle("active");
  });

  sidebar.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      sidebar.classList.remove("active");
    });
  });
}

// ===================================
// INITIALIZATION
// ===================================

async function initialize() {
  $("loginForm").addEventListener("submit", login);
  $("logoutButton").addEventListener("click", logout);

  setupMenu();
  setupArticleActions();

  showLogin();

  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) throw error;

    if (data.session) {
      await checkAdmin(data.session.user);
    }

  } catch (error) {
    console.error(error);
    showStatus("تعذر استعادة جلسة الدخول: " + error.message);
  }
}

initialize();
