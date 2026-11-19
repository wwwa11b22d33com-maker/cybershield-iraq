
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://ujgcdhfldomgdksgkoyy.supabase.co";
const SUPABASE_KEY = "sb_publishable_Mewf_vfa7DAngWNoKLnXVA_y7iuToMp";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;

const $ = id => document.getElementById(id);

function status(id, message) {
  const element = $(id);
  if (element) element.textContent = message;
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

// إظهار لوحة الإدارة
function showDashboard(user) {
  currentUser = user;

  $("loginSection").hidden = true;

  const dashboard = $("adminDashboard");
  dashboard.hidden = false;
  dashboard.style.display = "block";
  dashboard.style.visibility = "visible";
  dashboard.style.minHeight = "500px";
  dashboard.style.padding = "20px";

  $("adminEmailDisplay").textContent = user.email || "";

  console.log("NEXORA DASHBOARD DISPLAYED");
}

// التحقق من المدير
async function checkAdmin(user) {
  status("loginStatus", "جاري التحقق من صلاحيات المدير...");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error(error);
    status("loginStatus", "خطأ قاعدة البيانات: " + error.message);
    return;
  }

  if (!profile || profile.role !== "admin") {
    await supabase.auth.signOut();
    currentUser = null;
    status("loginStatus", "هذا الحساب ليس مديراً.");
    return;
  }

  showDashboard(user);

  await loadArticles();
  await loadMessages();
}

// تسجيل الدخول
async function login(event) {
  event.preventDefault();

  const email = $("adminEmail").value.trim();
  const password = $("adminPassword").value;

  status("loginStatus", "جاري تسجيل الدخول...");

  const button = $("loginForm").querySelector('button[type="submit"]');
  button.disabled = true;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      status("loginStatus", "خطأ الدخول: " + error.message);
      return;
    }

    await checkAdmin(data.user);

  } catch (error) {
    console.error(error);
    status("loginStatus", "حدث خطأ: " + error.message);
  } finally {
    button.disabled = false;
  }
}

// تحميل المقالات
async function loadArticles() {
  const list = $("articlesList");

  if (!list) return;

  list.textContent = "جاري تحميل المقالات...";

  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    list.textContent = "خطأ تحميل المقالات: " + error.message;
    return;
  }

  $("articlesCount").textContent = data.length;

  if (!data.length) {
    list.textContent = "لا توجد مقالات حالياً.";
    return;
  }

  list.innerHTML = data.map(article => `
    <article class="admin-item">
      <h3>${escapeHTML(article.title)}</h3>
      <p>${escapeHTML(article.slug)}</p>
      <p>الحالة: ${escapeHTML(article.status)}</p>
      <button type="button" data-edit="${escapeHTML(article.id)}">تعديل</button>
      <button type="button" data-delete="${escapeHTML(article.id)}">حذف</button>
    </article>
  `).join("");

  list.querySelectorAll("[data-edit]").forEach(button => {
    button.addEventListener("click", () => {
      editArticle(button.dataset.edit, data);
    });
  });

  list.querySelectorAll("[data-delete]").forEach(button => {
    button.addEventListener("click", () => {
      deleteArticle(button.dataset.delete);
    });
  });
}

// حفظ مقال
async function saveArticle(event) {
  event.preventDefault();

  if (!currentUser) {
    status("articleStatusMessage", "سجّل الدخول أولاً.");
    return;
  }

  const id = $("articleId").value;

  const article = {
    title: $("articleTitle").value.trim(),
    slug: $("articleSlug").value.trim(),
    excerpt: $("articleExcerpt").value.trim(),
    content: $("articleContent").value.trim(),
    image_url: $("articleImage").value.trim() || null,
    status: $("articleStatus").value
  };

  status("articleStatusMessage", "جاري الحفظ...");

  const result = id
    ? await supabase.from("articles").update(article).eq("id", id)
    : await supabase.from("articles").insert(article);

  if (result.error) {
    status("articleStatusMessage", "خطأ: " + result.error.message);
    return;
  }

  status("articleStatusMessage", "تم حفظ المقال بنجاح.");

  $("articleForm").reset();
  $("articleId").value = "";
  $("saveArticleButton").textContent = "حفظ المقال";

  await loadArticles();
}

// تعديل مقال
function editArticle(id, articles) {
  const article = articles.find(item => String(item.id) === String(id));

  if (!article) return;

  $("articleId").value = article.id;
  $("articleTitle").value = article.title || "";
  $("articleSlug").value = article.slug || "";
  $("articleExcerpt").value = article.excerpt || "";
  $("articleContent").value = article.content || "";
  $("articleImage").value = article.image_url || "";
  $("articleStatus").value = article.status || "draft";

  $("saveArticleButton").textContent = "تحديث المقال";

  $("articleForm").scrollIntoView({ behavior: "smooth" });
}

// حذف مقال
async function deleteArticle(id) {
  if (!confirm("هل تريد حذف هذا المقال؟")) return;

  const { error } = await supabase
    .from("articles")
    .delete()
    .eq("id", id);

  if (error) {
    status("articleStatusMessage", "خطأ الحذف: " + error.message);
    return;
  }

  status("articleStatusMessage", "تم حذف المقال.");
  await loadArticles();
}

// إعادة ضبط نموذج المقال
function resetArticleForm() {
  $("articleForm").reset();
  $("articleId").value = "";
  $("saveArticleButton").textContent = "حفظ المقال";
}

// تحميل الرسائل
async function loadMessages() {
  const list = $("messagesList");

  if (!list) return;

  list.textContent = "جاري تحميل الرسائل...";

  const { data, error } = await supabase
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    list.textContent = "خطأ تحميل الرسائل: " + error.message;
    return;
  }

  $("messagesCount").textContent = data.length;

  if (!data.length) {
    list.textContent = "لا توجد رسائل.";
    return;
  }

  list.innerHTML = data.map(message => `
    <article class="admin-item">
      <h3>${escapeHTML(message.subject || "رسالة زائر")}</h3>
      <p>الاسم: ${escapeHTML(message.name || "غير محدد")}</p>
      <p>البريد: ${escapeHTML(message.email || "غير محدد")}</p>
      <p>الرسالة: ${escapeHTML(message.message || "")}</p>
    </article>
  `).join("");
}

// تسجيل الخروج
async function logout() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    alert(error.message);
    return;
  }

  currentUser = null;

  $("adminDashboard").hidden = true;
  $("adminDashboard").style.display = "";

  $("loginSection").hidden = false;
  $("loginForm").reset();
}

// تشغيل الصفحة
document.addEventListener("DOMContentLoaded", async () => {
  $("loginForm").addEventListener("submit", login);

  $("articleForm").addEventListener("submit", saveArticle);

  $("cancelEditButton").addEventListener("click", resetArticleForm);

  $("logoutButton").addEventListener("click", logout);

  $("menuToggle").addEventListener("click", () => {
    $("sidebar").classList.toggle("active");
  });

  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) throw error;

    if (data.session?.user) {
      await checkAdmin(data.session.user);
    }
  } catch (error) {
    console.error(error);
    status("loginStatus", "خطأ تشغيل لوحة الإدارة: " + error.message);
  }
});

