الكتابة
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

// =====================================
// إظهار لوحة الإدارة
// =====================================

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

// =====================================
// التحقق من المدير
// =====================================

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
  await loadUsers();
  await loadNotifications();
}

// =====================================
// تسجيل الدخول
// =====================================

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

// =====================================
// تحميل المقالات
// =====================================

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

  if ($("articlesCount")) {
    $("articlesCount").textContent = data.length;
  }

  if (!data.length) {
    list.textContent = "لا توجد مقالات حالياً.";
    return;
  }
