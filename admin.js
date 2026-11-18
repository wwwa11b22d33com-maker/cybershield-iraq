
async function checkAdmin(user) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id,role")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile || profile.role !== "admin") {
    await supabase.auth.signOut();
    currentUser = null;

    $("adminDashboard").hidden = true;
    $("loginSection").hidden = false;

    showStatus(
      "loginStatus",
      "تعذر التحقق من صلاحية المدير: " + (error?.message || "الحساب ليس مديراً")
    );
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
