
"use strict";

const SUPABASE_URL = "https://ujgcdhfldomgdksgkoyy.supabase.co";
const SUPABASE_KEY = "sb_publishable_Mewf_vfa7DAngWNoKLnXVA_y7iuToMp";

document.addEventListener("DOMContentLoaded", async () => {
  const menuToggle = document.getElementById("menuToggle");
  const mainNav = document.getElementById("mainNav");

  // القائمة الرئيسية
  if (menuToggle && mainNav) {
    menuToggle.addEventListener("click", () => {
      const open = mainNav.classList.toggle("active");
      menuToggle.setAttribute("aria-expanded", String(open));
    });

    mainNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        mainNav.classList.remove("active");
        menuToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // السنة الحالية
  const year = document.getElementById("currentYear");
  if (year) year.textContent = new Date().getFullYear();

  // الاتصال بقاعدة البيانات
  let supabase;

  try {
    const { createClient } = await import(
      "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm"
    );

    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  } catch (error) {
    console.error("Supabase connection error:", error);
  }

  // عرض المقالات المنشورة
  const articlesContainer = document.querySelector(
    "#articles .container"
  );

  async function loadArticles() {
    if (!supabase || !articlesContainer) return;

    const { data, error } = await supabase
      .from("articles")
      .select("id,title,slug,excerpt,content,image_url,created_at")
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Articles error:", error);
      return;
    }

    // إزالة المقالات القديمة مع الإبقاء على عنوان القسم
    articlesContainer.querySelectorAll(".dynamic-articles").forEach((el) => {
      el.remove();
    });

    const articlesGrid = document.createElement("div");
    articlesGrid.className = "cards-grid dynamic-articles";

    if (!data || data.length === 0) {
      const empty = document.createElement("article");
      empty.className = "news-card";
      empty.textContent = "لا توجد مقالات منشورة حالياً.";
      articlesGrid.appendChild(empty);
    } else {
      data.forEach((article) => {
        const card = document.createElement("article");
        card.className = "info-card";

        if (article.image_url) {
          const image = document.createElement("img");
          image.src = article.image_url;
          image.alt = article.title;
          image.loading = "lazy";
          image.style.width = "100%";
          image.style.borderRadius = "12px";
          card.appendChild(image);
        }

        const title = document.createElement("h3");
        title.textContent = article.title || "مقال بدون عنوان";

        const excerpt = document.createElement("p");
        excerpt.textContent =
          article.excerpt || article.content || "";

        const link = document.createElement("a");
        link.href = "#";
        link.className = "btn btn-outline";
        link.textContent = "اقرأ المقال";

        link.addEventListener("click", (event) => {
          event.preventDefault();

          const existing = card.querySelector(".full-article");

          if (existing) {
            existing.remove();
            link.textContent = "اقرأ المقال";
            return;
          }

          const fullContent = document.createElement("p");
          fullContent.className = "full-article";
          fullContent.textContent = article.content || "";
          card.appendChild(fullContent);
          link.textContent = "إخفاء المقال";
        });

        card.append(title, excerpt, link);
        articlesGrid.appendChild(card);
      });
    }

    articlesContainer.appendChild(articlesGrid);
  }

  await loadArticles();

  // نموذج التواصل
  const contactForm = document.getElementById("contactForm");
  const formStatus = document.getElementById("formStatus");

  if (contactForm) {
    contactForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const name = contactForm.elements.namedItem("name").value.trim();
      const email = contactForm.elements.namedItem("email").value.trim();
      const message = contactForm.elements.namedItem("message").value.trim();

      if (!name || !email || !message) {
        if (formStatus) formStatus.textContent = "يرجى ملء جميع الحقول.";
        return;
      }

      const submitButton = contactForm.querySelector('[type="submit"]');

      try {
        if (!supabase) throw new Error("Database connection unavailable");

        if (formStatus) formStatus.textContent = "جاري إرسال رسالتك...";
        if (submitButton) submitButton.disabled = true;

        const { error } = await supabase
          .from("contact_messages")
          .insert([{ name, email, message }]);

        if (error) throw error;

        if (formStatus) {
          formStatus.textContent =
            "تم إرسال رسالتك بنجاح، شكراً لتواصلك معنا.";
        }

        contactForm.reset();
      } catch (error) {
        console.error("Contact form error:", error);

        if (formStatus) {
          formStatus.textContent = "تعذر إرسال الرسالة. حاول مرة أخرى.";
        }
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    });
  }
});
