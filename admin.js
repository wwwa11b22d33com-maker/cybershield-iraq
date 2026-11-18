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

    showStatus("loginStatus", "خطأ قاعدة البيانات: " + error.message);
    return;
  }

  if (!profile || profile.role !== "admin") {
    $("adminDashboard").hidden = true;
    $("loginSection").hidden = false;

    showStatus("loginStatus", "الحساب لا يمتلك صلاحية المدير.");
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
