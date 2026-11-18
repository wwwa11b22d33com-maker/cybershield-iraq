
const SUPABASE_URL = "https://ujgcdhfldomgdksgkoyy.supabase.co";

const SUPABASE_KEY = "sb_publishable_Mewf_vfa7DAngWNoKLnXVA_y7iuToMp";

document.addEventListener("DOMContentLoaded", async () => {
  // القائمة الرئيسية للموبايل
  const menuToggle = document.getElementById("menuToggle");
  const mainNav = document.getElementById("mainNav");

  if (menuToggle && mainNav) {
    menuToggle.addEventListener("click", () => {
      mainNav.classList.toggle("active");
    });

    mainNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        mainNav.classList.remove("active");
      });
    });
  }

  // السنة الحالية
  const year = document.getElementById("currentYear");
  if (year) {
    year.textContent = new Date().getFullYear();
  }

  // نموذج التواصل
  const contactForm = document.getElementById("contactForm");
  const formStatus = document.getElementById("formStatus");

  if (!contactForm) return;

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
      if (formStatus) formStatus.textContent = "جاري إرسال رسالتك...";
      if (submitButton) submitButton.disabled = true;

      const { createClient } = await import(
        "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm"
      );

      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

      const { error } = await supabase
        .from("contact_messages")
        .insert([{ name, email, message }]);

      if (error) throw error;

      if (formStatus) {
        formStatus.textContent = "تم إرسال رسالتك بنجاح، شكراً لتواصلك معنا.";
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
});
