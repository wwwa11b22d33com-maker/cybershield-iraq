
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://ujgcdhfldomgdksgkoyy.supabase.co";
const SUPABASE_KEY = "sb_publishable_Mewf_vfa7DAngWNoKLnXVA_y7iuToMp";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;

const $ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", async () => {

  // قائمة الهاتف
  $("menuToggle")?.addEventListener("click", () => {
    $("sidebar")?.classList.toggle("active");
  });

  // تسجيل الدخول
  $("loginForm")?.addEventListener("submit", login);

  // تسجيل الخروج
  $("logoutButton")?.addEventListener("click", logout);

  // حفظ المقال
  $("articleForm")?.addEventListener("submit", saveArticle);

  // إلغاء التعديل
  $("cancelEditButton")?.addEventListener("click", resetArticleForm);

  // التحقق من الجلسة
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    showStatus("loginStatus", error.message);
    return;
  }

  if (data.session) {
    await checkAdmin(data.session.user);
  }
});

// تسجيل الدخول
async function login(event) {
  event.preventDefault();

  const email = $("adminEmail").value.trim();
  const password = $("adminPassword").value;

  showStatus("loginStatus", "جاري تسجيل الدخول...");

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    showStatus("loginStatus", "تعذر تسجيل الدخول: " + error.message);
    return;
  }

  await checkAdmin(data.user);
}

// التحقق من صلاحية المدير
async function checkAdmin(user) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id,email,role")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile || profile.role !== "admin") {
    await supabase.auth.signOut();
    currentUser = null;

    $("adminDashboard").hidden = true;
    $("loginSection").hidden = false;

    showStatus("loginStatus", "هذا الحساب لا يمتلك صلاحية المدير.");
    return;
  }

  currentUser = user;

  $("loginSection").hidden = true;
  $("adminDashboard").hidden = false;

  $("adminEmailDisplay").textContent = user.email || "";

  await loadArticles();
  await loadMessages();
  await loadUsers();
}

// تسجيل الخروج
async function logout() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    alert("تعذر تسجيل الخروج.");
    return;
  }

  currentUser = null;
  $("adminDashboard").hidden = true;
  $("loginSection").hidden = false;

  $("loginForm")?.reset();

  showStatus("loginStatus", "تم تسجيل الخروج.");
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
    return;
  }

  $("articlesCount").textContent = data.length;

  list.replaceChildren();

  if (!data.length) {
    list.textContent = "لا توجد مقالات حالياً.";
    return;
  }

  data.forEach((article) => {
    const card = document.createElement("article");
    const title = document.createElement("h3");
    const details = document.createElement("p");
    const edit = document.createElement("button");
    const remove = document.createElement("button");

    title.textContent = article.title || "بدون عنوان";
    details.textContent =
      "الحالة: " + (article.status === "published" ? "منشور" : "مسودة");

    edit.textContent = "تعديل";
    remove.textContent = "حذف";

    edit.type = "button";
    remove.type = "button";

    edit.addEventListener("click", () => editArticle(article));

    remove.addEventListener("click", () => deleteArticle(article.id));

    card.append(title, details, edit, remove);
    list.appendChild(card);
  });
}

// حفظ مقال جديد أو تعديل مقال
async function saveArticle(event) {
  event.preventDefault();

  if (!currentUser) return;

  const id = $("articleId").value;

  const article = {
    title: $("articleTitle").value.trim(),
    slug: $("articleSlug").value.trim(),
    excerpt: $("articleExcerpt").value.trim(),
    content: $("articleContent").value.trim(),
    image_url: $("articleImage").value.trim() || null,
    status: $("articleStatus").value,
    updated_at: new Date().toISOString()
  };

  if (!article.title || !article.slug || !article.content) {
    showStatus("articleStatusMessage", "يرجى إكمال الحقول المطلوبة.");
    return;
  }

  const button = $("saveArticleButton");
  button.disabled = true;

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
        .insert([{
          ...article,
          author_id: currentUser.id
        }]);
    }

    if (result.error) throw result.error;

    showStatus("articleStatusMessage", "تم حفظ المقال بنجاح.");

    resetArticleForm();
    await loadArticles();

  } catch (error) {
    showStatus("articleStatusMessage", "خطأ: " + error.message);
  } finally {
    button.disabled = false;
  }
}

// تعبئة نموذج التعديل
function editArticle(article) {
  $("articleId").value = article.id;
  $("articleTitle").value = article.title || "";
  $("articleSlug").value = article.slug || "";
  $("articleExcerpt").value = article.excerpt || "";
  $("articleContent").value = article.content || "";
  $("articleImage").value = article.image_url || "";
  $("articleStatus").value = article.status || "draft";

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
    showStatus("articleStatusMessage", error.message);
    return;
  }

  showStatus("articleStatusMessage", "تم حذف المقال.");
  await loadArticles();
}

// إعادة نموذج المقال
function resetArticleForm() {
  $("articleForm")?.reset();
  $("articleId").value = "";
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
    return;
  }

  $("messagesCount").textContent = data.length;

  list.replaceChildren();

  if (!data.length) {
    list.textContent = "لا توجد رسائل حالياً.";
    return;
  }

  data.forEach((message) => {
    const card = document.createElement("article");
    const name = document.createElement("h3");
    const email = document.createElement("p");
    const content = document.createElement("p");

    name.textContent = message.name || "زائر";
    email.textContent = message.email || "";
    content.textContent = message.message || "";

    card.append(name, email, content);
    list.appendChild(card);
  });
}

// تحميل المستخدمين
async function loadUsers() {
  const list = $("usersList");

  if (!list) return;

  list.textContent = "جاري تحميل المستخدمين...";
  showStatus("usersStatus", "");

  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,role")
    .order("email", { ascending: true });

  if (error) {
    list.textContent = "تعذر تحميل المستخدمين.";
    showStatus(
      "usersStatus",
      "تحقق من سياسة قراءة جدول profiles للمدير في Supabase. " + error.message
    );
    return;
  }

  $("usersCount").textContent = data.length;
  list.replaceChildren();

  if (!data.length) {
    list.textContent = "لا يوجد مستخدمون حالياً.";
    return;
  }

  data.forEach((user) => {
    const card = document.createElement("article");
    const email = document.createElement("h3");
    const role = document.createElement("p");
    const id = document.createElement("small");

    email.textContent = user.email || "بريد غير متوفر";

    role.textContent =
      user.role === "admin" ? "الصلاحية: مدير" : "الصلاحية: مستخدم";

    id.textContent = "معرّف الحساب: " + user.id;

    card.append(email, role, id);
    list.appendChild(card);
  });

  showStatus("usersStatus", "تم تحميل المستخدمين بنجاح.");
}

// رسائل الحالة
function showStatus(id, message) {
  const element = $(id);
  if (element) element.textContent = message;
}
