
// CYBER SHIELD IRAQ
// Main JavaScript File

document.addEventListener("DOMContentLoaded", function () {

    // Welcome message
    console.log("Cyber Shield Iraq is running!");

    // Smooth navigation
    document.querySelectorAll('nav a').forEach(function (link) {
        link.addEventListener('click', function (event) {
            const target = document.querySelector(
                link.getAttribute('href')
            );

            if (target) {
                event.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Service cards interaction
    document.querySelectorAll('.card').forEach(function (card) {
        card.addEventListener('click', function () {
            card.classList.toggle('selected');
        });
    });

    // Current year in footer
    const year = new Date().getFullYear();
    const footerText = document.querySelector('footer p:last-child');

    if (footerText) {
        footerText.textContent =
            '© ' + year + ' Cyber Shield Iraq. جميع الحقوق محفوظة';
    }

});
