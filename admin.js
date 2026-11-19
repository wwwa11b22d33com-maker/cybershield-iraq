
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

async function checkAdmin(user) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile || profile.role !== "admin") {
    await supabase.auth.signOut();
    currentUser = null;

    $("adminDashboard").hidden = true;
    $("loginSection").hidden = false;

    showStatus("هذا الحساب لا يملك صلاحية المدير.");
    return false;
  }

  currentUser = user;

  $("loginSection").hidden = true;
  $("adminDashboard").hidden = false;

  return true;
}

async function login(event) {
  event.preventDefault();

  const email = $("adminEmail").value.trim();
  const password = $("adminPassword").value;

  if (!email || !password) {
    showStatus("يرجى إدخال البريد الإلكتروني وكلمة المرور.");
    return;
  }

  const loginButton = $("loginButton");
  if (loginButton) loginButton.disabled = true;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      showStatus("فشل تسجيل الدخول: " + error.message);
      return;
    }

    await checkAdmin(data.user);

  } catch (error) {
    showStatus("حدث خطأ: " + error.message);
  } finally {
    if (loginButton) loginButton.disabled = false;
  }
}

async function logout() {
  await supabase.auth.signOut();
  currentUser = null;

  $("adminDashboard").hidden = true;
  $("loginSection").hidden = false;

  $("adminEmail").value = "";
  $("adminPassword").value = "";
}

async function initialize() {
  const loginForm = $("loginForm");

  if (loginForm) {
    loginForm.addEventListener("submit", login);
  }

  const logoutButton = $("logoutButton");

  if (logoutButton) {
    logoutButton.addEventListener("click", logout);
  }

  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    await checkAdmin(session.user);
  }
}

initialize();
