      // Header scroll effect
      window.addEventListener('scroll', function() {
        const header = document.querySelector('header');
        if (header) {
          if (window.scrollY > 50) {
            header.classList.add('bg-white', 'shadow-sm');
            header.classList.remove('bg-transparent');
          } else {
            header.classList.add('bg-transparent');
            header.classList.remove('bg-white', 'shadow-sm');
          }
        }
      });

      // Mobile menu toggle
      const menuButton = document.querySelector('button[aria-label="Toggle menu"]');
      const mobileNav = document.querySelector('.fixed.inset-0.z-40');

      if (menuButton && mobileNav) {
        menuButton.addEventListener('click', function() {
          mobileNav.classList.toggle('translate-x-full');
        });
      }

      // Back to top button
      const backToTopButton = document.querySelector('button.group');
      if (backToTopButton) {
        backToTopButton.addEventListener('click', function() {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      }