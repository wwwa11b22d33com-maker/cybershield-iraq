
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// إعداد اتصال Supabase
const SUPABASE_URL = "https://ujgcdhfldomgdksgkoyy.supabase.co";
const SUPABASE_KEY = "sb_publishable_Mewf_vfa7DAngWNoKLnXVA_y7iuToMp";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;

const $ = (id) => document.getElementById(id);

function showStatus(id, message, type = "info") {
  const element = $(id);
  if (!element) return;

  element.textContent = message;
  element.dataset.type = type;
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function formatDate(value) {
  if (!value) return "غير محدد";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "غير محدد";

  return date.toLocaleString("ar-IQ");
}

// التحقق من صلاحية المدير
async function checkAdmin(user) {
  showStatus("loginStatus", "جاري التحقق من صلاحية المدير...");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Profile error:", error);

    $("adminDashboard").hidden = true;
    $("loginSection").hidden = false;

    showStatus(
      "loginStatus",
      "خطأ قاعدة البيانات: " + error.message,
      "error"
    );
    return;
  }

  if (!profile || profile.role !== "admin") {
    await supabase.auth.signOut();

    currentUser = null;
    $("adminDashboard").hidden = true;
    $("loginSection").hidden = false;

    showStatus("loginStatus", "هذا الحساب لا يمتلك صلاحية المدير.", "error");
    return;
  }

  currentUser = user;

  $("loginSection").hidden = true;
  $("adminDashboard").hidden = false;

  $("adminEmailDisplay").textContent = user.email || "";

  showStatus("loginStatus", "");

  await loadArticles();
  await loadMessages();
  await loadUsers();
}

// تسجيل الدخول
async function login(event) {
  event.preventDefault();

  const email = $("adminEmail").value.trim();
  const password = $("adminPassword").value;

  if (!email || !password) {
    showStatus("loginStatus", "يرجى إدخال البريد وكلمة المرور.", "error");
    return;
  }

  const button = $("loginForm").querySelector('button[type="submit"]');
  if (button) button.disabled = true;

  showStatus("loginStatus", "جاري تسجيل الدخول...");

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      showStatus("loginStatus", "فشل تسجيل الدخول: " + error.message, "error");
      return;
    }

    await checkAdmin(data.user);
  } catch (error) {
    console.error(error);
    showStatus("loginStatus", "حدث خطأ غير متوقع أثناء تسجيل الدخول.", "error");
  } finally {
    if (button) button.disabled = false;
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
    list.textContent = "تعذر تحميل المقالات: " + error.message;
    console.error(error);
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
      <p>الرابط: ${escapeHTML(article.slug)}</p>
      <p>الحالة: ${escapeHTML(article.status)}</p>
      <button type="button" data-edit="${escapeHTML(article.id)}">
        تعديل
      </button>
      <button type="button" data-delete="${escapeHTML(article.id)}">
        حذف
      </button>
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

// إضافة أو تعديل مقال
async function saveArticle(event) {
  event.preventDefault();

  if (!currentUser) {
    showStatus("articleStatusMessage", "يجب تسجيل الدخول أولاً.", "error");
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

  if (!article.title || !article.slug || !article.content) {
    showStatus("articleStatusMessage", "يرجى إكمال الحقول المطلوبة.", "error");
    return;
  }

  const button = $("saveArticleButton");
  button.disabled = true;

  showStatus("articleStatusMessage", "جاري حفظ المقال...");

  try {
    let result;

    if (id) {
      result = await supabase
        .from("articles")
        .update(article)
        .eq("id", id);
    } else {
      result = await supabase
        .from("articles")
        .insert(article);
    }

    if (result.error) {
      showStatus(
        "articleStatusMessage",
        "تعذر حفظ المقال: " + result.error.message,
        "error"
      );
      return;
    }

    showStatus("articleStatusMessage", "تم حفظ المقال بنجاح.", "success");
    resetArticleForm();
    await loadArticles();
  } catch (error) {
    console.error(error);
    showStatus("articleStatusMessage", "حدث خطأ أثناء حفظ المقال.", "error");
  } finally {
    button.disabled = false;
  }
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

  $("articleForm").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

// حذف مقال
async function deleteArticle(id) {
  if (!confirm("هل أنت متأكد من حذف هذا المقال؟")) return;

  const { error } = await supabase
    .from("articles")
    .delete()
    .eq("id", id);

  if (error) {
    showStatus("articleStatusMessage", "تعذر حذف المقال: " + error.message, "error");
    return;
  }

  showStatus("articleStatusMessage", "تم حذف المقال.", "success");
  await loadArticles();
}

// تفريغ نموذج المقال
function resetArticleForm() {
  $("articleForm").reset();
  $("articleId").value = "";
  $("saveArticleButton").textContent = "حفظ المقال";
}

// تحميل رسائل الزوار
async function loadMessages() {
  const list = $("messagesList");
  if (!list) return;

  list.textContent = "جاري تحميل الرسائل...";

  const { data, error } = await supabase
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    list.textContent = "تعذر تحميل الرسائل: " + error.message;
    console.error(error);
    return;
  }

  $("messagesCount").textContent = data.length;

  if (!data.length) {
    list.textContent = "لا توجد رسائل حالياً.";
    return;
  }

  list.innerHTML = data.map(message => `
    <article class="admin-item">
      <h3>${escapeHTML(message.subject || "رسالة من زائر")}</h3>
      <p>الاسم: ${escapeHTML(message.name || message.full_name || "غير محدد")}</p>
      <p>البريد: ${escapeHTML(message.email || "غير محدد")}</p>
      <p>الرسالة: ${escapeHTML(message.message || message.content || "")}</p>
      <p>التاريخ: ${escapeHTML(formatDate(message.created_at))}</p>
    </article>
  `).join("");
}

// تحميل المستخدمين
async function loadUsers() {
  const list = $("usersList");
  if (!list) return;

  list.textContent = "جاري تحميل المستخدمين...";

  const { data, error } = await supabase
    .from("profiles")
    .select("id, role")
    .order("id", { ascending: true });

  if (error) {
    list.textContent = "تعذر تحميل المستخدمين: " + error.message;
    console.error(error);
    return;
  }

  $("usersCount").textContent = data.length;

  if (!data.length) {
    list.textContent = "لا توجد حسابات مسجلة.";
    return;
  }

  list.innerHTML = data.map(user => `
    <article class="admin-item">
      <p>معرّف المستخدم:</p>
      <code>${escapeHTML(user.id)}</code>
      <p>الصلاحية: ${escapeHTML(user.role || "user")}</p>
    </article>
  `).join("");
}

// تسجيل الخروج
async function logout() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    alert("تعذر تسجيل الخروج: " + error.message);
    return;
  }

  currentUser = null;

  $("adminDashboard").hidden = true;
  $("loginSection").hidden = false;
  $("loginForm").reset();

  showStatus("loginStatus", "تم تسجيل الخروج.");
}

// تشغيل الصفحة
document.addEventListener("DOMContentLoaded", async () => {
  $("loginForm")?.addEventListener("submit", login);

  $("articleForm")?.addEventListener("submit", saveArticle);

  $("cancelEditButton")?.addEventListener("click", resetArticleForm);

  $("logoutButton")?.addEventListener("click", logout);

  $("menuToggle")?.addEventListener("click", () => {
    $("sidebar")?.classList.toggle("active");
  });

  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      showStatus("loginStatus", "تعذر استعادة الجلسة: " + error.message, "error");
      return;
    }

    if (data.session?.user) {
      await checkAdmin(data.session.user);
    }
  } catch (error) {
    console.error("Startup error:", error);
    showStatus("loginStatus", "حدث خطأ أثناء تشغيل لوحة الإدارة.", "error");
  }
});
console.log("NEXORA ADMIN JS WORKING");
