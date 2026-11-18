
"use strict";

const SUPABASE_URL = "https://ujgcdhfldomgdksgkoyy.supabase.co";
const SUPABASE_KEY = "sb_publishable_Mewf_vfa7DAngWNoKLnXVA_y7iuToMp";

document.addEventListener("DOMContentLoaded", async () => {
  const { createClient } = await import(
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm"
  );

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const $ = (id) => document.getElementById(id);

  const loginSection = $("loginSection");
  const dashboard = $("adminDashboard");
  const loginForm = $("loginForm");
  const loginStatus = $("loginStatus");

  let currentUser = null;

  // القائمة الجانبية
  $("menuToggle")?.addEventListener("click", () => {
    $("sidebar")?.classList.toggle("open");
  });

  // التحقق من المدير
  async function checkAdmin() {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      showLogin();
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile || profile.role !== "admin") {
      await supabase.auth.signOut();
      showLogin();
      loginStatus.textContent = "هذا الحساب لا يمتلك صلاحية المدير.";
      return;
    }

    currentUser = user;
    loginSection.hidden = true;
    dashboard.hidden = false;

    $("adminEmailDisplay").textContent = user.email || "";

    await loadArticles();
    await loadMessages();
  }

  function showLogin() {
    loginSection.hidden = false;
    dashboard.hidden = true;
  }

  // تسجيل الدخول
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    loginStatus.textContent = "جاري تسجيل الدخول...";

    const email = $("adminEmail").value.trim();
    const password = $("adminPassword").value;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      loginStatus.textContent = "فشل تسجيل الدخول. تحقق من البيانات.";
      return;
    }

    loginStatus.textContent = "";
    await checkAdmin();
  });

  // تسجيل الخروج
  $("logoutButton").addEventListener("click", async () => {
    await supabase.auth.signOut();
    currentUser = null;
    showLogin();
    loginStatus.textContent = "تم تسجيل الخروج.";
  });

  // تحميل المقالات
  async function loadArticles() {
    const list = $("articlesList");
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
      card.className = "stat-card";

      const title = document.createElement("h3");
      title.textContent = article.title;

      const status = document.createElement("p");
      status.textContent = "الحالة: " + article.status;

      const edit = document.createElement("button");
      edit.type = "button";
      edit.textContent = "تعديل";

      edit.addEventListener("click", () => {
        $("articleId").value = article.id;
        $("articleTitle").value = article.title || "";
        $("articleSlug").value = article.slug || "";
        $("articleExcerpt").value = article.excerpt || "";
        $("articleContent").value = article.content || "";
        $("articleImage").value = article.image_url || "";
        $("articleStatus").value = article.status || "draft";

        $("articleForm").scrollIntoView({ behavior: "smooth" });
      });

      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "حذف";

      remove.addEventListener("click", async () => {
        if (!confirm("هل تريد حذف هذا المقال؟")) return;

        const { error } = await supabase
          .from("articles")
          .delete()
          .eq("id", article.id);

        if (error) {
          alert("تعذر الحذف: " + error.message);
        } else {
          await loadArticles();
        }
      });

      card.append(title, status, edit, remove);
      list.appendChild(card);
    });
  }

  // إضافة أو تعديل مقال
  $("articleForm").addEventListener("submit", async (event) => {
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
      $("articleStatusMessage").textContent =
        "يرجى ملء العنوان والرابط والمحتوى.";
      return;
    }

    $("saveArticleButton").disabled = true;
    $("articleStatusMessage").textContent = "جاري الحفظ...";

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

    $("saveArticleButton").disabled = false;

    if (result.error) {
      $("articleStatusMessage").textContent =
        "فشل الحفظ: " + result.error.message;
      return;
    }

    $("articleStatusMessage").textContent = "تم حفظ المقال بنجاح.";
    $("articleForm").reset();
    $("articleId").value = "";

    await loadArticles();
  });

  // إلغاء التعديل
  $("cancelEditButton").addEventListener("click", () => {
    $("articleForm").reset();
    $("articleId").value = "";
    $("articleStatusMessage").textContent = "";
  });

  // تحميل رسائل الزوار
  async function loadMessages() {
    const list = $("messagesList");
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
      card.className = "stat-card";

      const name = document.createElement("h3");
      name.textContent = message.name || "بدون اسم";

      const email = document.createElement("p");
      email.textContent = message.email || "";

      const content = document.createElement("p");
      content.textContent = message.message || "";

      const date = document.createElement("small");
      date.textContent = message.created_at
        ? new Date(message.created_at).toLocaleString("ar")
        : "";

      card.append(name, email, content, date);
      list.appendChild(card);
    });
  }

  // فحص جلسة الدخول عند فتح الصفحة
  try {
    await checkAdmin();
  } catch (error) {
    console.error(error);
    showLogin();
    loginStatus.textContent = "حدث خطأ أثناء الاتصال. حاول مرة أخرى.";
  }
});
