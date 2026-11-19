
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// ===================================
// NEXORA - SUPABASE CONFIGURATION
// ===================================

const SUPABASE_URL = "https://ujgcdhfldomgdksgkoyy.supabase.co";

const SUPABASE_KEY = "sb_publishable_Mewf_vfa7DAngWNoKLnXVA_y7iuToMp";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let isLoggingIn = false;

const $ = (id) => document.getElementById(id);

// ===================================
// STATUS MESSAGES
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

// ===================================
// SHOW LOGIN
// ===================================

function showLogin() {
  if ($("adminDashboard")) {
    $("adminDashboard").hidden = true;
  }

  if ($("loginSection")) {
    $("loginSection").hidden = false;
  }

  currentUser = null;
}

// ===================================
// CHECK ADMIN PERMISSIONS
// ===================================

async function checkAdmin(user) {
  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      showLogin();

      showStatus(
        "تعذر التحقق من صلاحيات الحساب: " + error.message
      );

      return false;
    }

    if (!profile || profile.role !== "admin") {
      await supabase.auth.signOut();

      showLogin();

      showStatus("هذا الحساب لا يملك صلاحية المدير.");

      return false;
    }

    currentUser = user;

    $("loginSection").hidden = true;
    $("adminDashboard").hidden = false;

    const emailDisplay = $("adminEmailDisplay");

    if (emailDisplay) {
      emailDisplay.textContent = "مرحباً: " + user.email;
    }

    hideStatus();

    return true;

  } catch (error) {
    console.error("Admin verification error:", error);

    showLogin();

    showStatus("حدث خطأ أثناء التحقق من صلاحيات المدير.");

    return false;
  }
}

// ===================================
// LOGIN
// ===================================

async function login(event) {
  event.preventDefault();
  event.stopPropagation();

  if (isLoggingIn) return;

  const emailInput = $("adminEmail");
  const passwordInput = $("adminPassword");
  const loginButton = $("loginButton");

  if (!emailInput || !passwordInput) {
    showStatus("تعذر العثور على حقول تسجيل الدخول.");
    return;
  }

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showStatus("يرجى إدخال البريد الإلكتروني وكلمة المرور.");
    return;
  }

  isLoggingIn = true;

  if (loginButton) {
    loginButton.disabled = true;
    loginButton.textContent = "جارٍ تسجيل الدخول...";
  }

  hideStatus();

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      showLogin();
      showStatus("فشل تسجيل الدخول: " + error.message);
      return;
    }

    if (!data.user) {
      showLogin();
      showStatus("لم يتم العثور على بيانات الحساب.");
      return;
    }

    const success = await checkAdmin(data.user);

    if (success) {
      // مسح كلمة المرور بعد نجاح الدخول فقط
      passwordInput.value = "";
    }

  } catch (error) {
    console.error(error);

    showLogin();

    showStatus(
      "حدث خطأ أثناء تسجيل الدخول. حاول مرة أخرى."
    );

  } finally {
    isLoggingIn = false;

    if (loginButton) {
      loginButton.disabled = false;
      loginButton.textContent = "دخول";
    }
  }
}

// ===================================
// LOGOUT
// ===================================

async function logout() {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error(error);
      alert("تعذر تسجيل الخروج: " + error.message);
      return;
    }

    currentUser = null;

    showLogin();

    if ($("adminEmail")) {
      $("adminEmail").value = "";
    }

    if ($("adminPassword")) {
      $("adminPassword").value = "";
    }

    hideStatus();

  } catch (error) {
    console.error(error);
    alert("حدث خطأ أثناء تسجيل الخروج.");
  }
}

// ===================================
// MOBILE MENU
// ===================================

function setupMenu() {
  const menuToggle = $("menuToggle");
  const sidebar = $("sidebar");

  if (!menuToggle || !sidebar) return;

  menuToggle.addEventListener("click", () => {
    sidebar.classList.toggle("active");
  });

  sidebar.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      sidebar.classList.remove("active");
    });
  });
}

// ===================================
// INITIALIZATION
// ===================================

async function initialize() {
  const loginForm = $("loginForm");

  if (!loginForm) {
    console.error("Login form not found.");
    return;
  }

  // ربط نموذج الدخول
  loginForm.addEventListener("submit", login);

  // ربط تسجيل الخروج
  const logoutButton = $("logoutButton");

  if (logoutButton) {
    logoutButton.addEventListener("click", logout);
  }

  // إعداد القائمة الجانبية
  setupMenu();

  // إظهار نموذج الدخول مبدئياً
  showLogin();

  // استعادة جلسة المستخدم
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
    console.error("Session error:", error);

    showStatus("تعذر الاتصال بخدمة تسجيل الدخول.");
  }
}

// تشغيل النظام
initialize();
