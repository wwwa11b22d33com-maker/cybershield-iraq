
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://ujgcdhfldomgdksgkoyy.supabase.co";
const SUPABASE_KEY = "sb_publishable_Mewf_vfa7DAngWNoKLnXVA_y7iuToMp";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;

const $ = (id) => document.getElementById(id);

function showStatus(message, type = "error") {
  const status = $("loginStatus");
  if (!status) return;

  status.textContent = message;
  status.dataset.type = type;
  status.hidden = false;
}

function hideStatus() {
  const status = $("loginStatus");
  if (status) {
    status.textContent = "";
    status.hidden = true;
  }
}

async function checkAdmin(user) {
  const dashboard = $("adminDashboard");
  const loginSection = $("loginSection");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile || profile.role !== "admin") {
    await supabase.auth.signOut();
    currentUser = null;

    dashboard.hidden = true;
    loginSection.hidden = false;

    showStatus(
      error
        ? "تعذر التحقق من صلاحيات الحساب: " + error.message
        : "هذا الحساب لا يملك صلاحية المدير."
    );

    return false;
  }

  currentUser = user;

  loginSection.hidden = true;
  dashboard.hidden = false;

  const emailDisplay = $("adminEmailDisplay");
  if (emailDisplay) {
    emailDisplay.textContent = "مرحباً: " + user.email;
  }

  return true;
}

async function login(event) {
  // منع تحديث الصفحة عند إرسال النموذج
  event.preventDefault();
  event.stopPropagation();

  hideStatus();

  const emailInput = $("adminEmail");
  const passwordInput = $("adminPassword");
  const loginButton = $("loginButton");

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showStatus("يرجى إدخال البريد الإلكتروني وكلمة المرور.");
    return;
  }

  if (loginButton) {
    loginButton.disabled = true;
    loginButton.textContent = "جارٍ تسجيل الدخول...";
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      showStatus("فشل تسجيل الدخول: " + error.message);
      return;
    }

    const success = await checkAdmin(data.user);

    if (success) {
      hideStatus();
    }

  } catch (error) {
    showStatus("حدث خطأ غير متوقع: " + error.message);
  } finally {
    if (loginButton) {
      loginButton.disabled = false;
      loginButton.textContent = "دخول";
    }
  }
}

async function logout() {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      showStatus("تعذر تسجيل الخروج: " + error.message);
      return;
    }

    currentUser = null;

    $("adminDashboard").hidden = true;
    $("loginSection").hidden = false;

    $("adminEmail").value = "";
    $("adminPassword").value = "";

    hideStatus();

  } catch (error) {
    showStatus("حدث خطأ أثناء تسجيل الخروج.");
  }
}

async function initialize() {
  const loginForm = $("loginForm");

  if (!loginForm) {
    console.error("لم يتم العثور على نموذج تسجيل الدخول.");
    return;
  }

  // منع الإرسال الافتراضي وتحديث الصفحة
  loginForm.addEventListener("submit", login);

  const logoutButton = $("logoutButton");

  if (logoutButton) {
    logoutButton.addEventListener("click", logout);
  }

  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      showStatus("تعذر استعادة جلسة الدخول.");
      return;
    }

    if (data.session) {
      await checkAdmin(data.session.user);
    }

  } catch (error) {
    showStatus("تعذر الاتصال بخدمة تسجيل الدخول.");
    console.error(error);
  }
}

initialize();
