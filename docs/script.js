const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");
const navLinks = [...document.querySelectorAll(".site-nav a[href^='#']")];
const sections = [...document.querySelectorAll("main section[id]")];
const filterButtons = [...document.querySelectorAll(".filter-button")];
const testCards = [...document.querySelectorAll(".test-card")];
const modal = document.querySelector(".image-modal");
const modalImage = modal?.querySelector("img");
const modalCaption = modal?.querySelector("p");
const modalClose = modal?.querySelector(".modal-close");

document.getElementById("current-year").textContent =
  new Date().getFullYear();

menuToggle?.addEventListener("click", () => {
  const isOpen = siteNav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    siteNav.classList.remove("open");
    menuToggle?.setAttribute("aria-expanded", "false");
  });
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      navLinks.forEach((link) => {
        const target = link.getAttribute("href");

        link.classList.toggle(
          "active",
          target === `#${entry.target.id}`
        );
      });
    });
  },
  {
    rootMargin: "-35% 0px -55% 0px",
    threshold: 0
  }
);

sections.forEach((section) => {
  observer.observe(section);
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;

    filterButtons.forEach((item) => {
      item.classList.remove("active");
    });

    button.classList.add("active");

    testCards.forEach((card) => {
      const matches =
        filter === "all" ||
        card.dataset.category === filter;

      card.classList.toggle("hidden", !matches);
    });
  });
});

document.querySelectorAll(".image-button").forEach((button) => {
  button.addEventListener("click", () => {
    if (!modal || !modalImage || !modalCaption) {
      return;
    }

    modalImage.src = button.dataset.image;
    modalImage.alt =
      button.dataset.alt || "Expanded project screenshot";

    modalCaption.textContent =
      button.dataset.alt || "";

    modal.showModal();
    document.body.classList.add("modal-open");
  });
});

function closeModal() {
  if (!modal) {
    return;
  }

  modal.close();
  document.body.classList.remove("modal-open");
}

modalClose?.addEventListener("click", closeModal);

modal?.addEventListener("click", (event) => {
  const rectangle = modal.getBoundingClientRect();

  const clickedOutside =
    event.clientX < rectangle.left ||
    event.clientX > rectangle.right ||
    event.clientY < rectangle.top ||
    event.clientY > rectangle.bottom;

  if (clickedOutside) {
    closeModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal?.open) {
    closeModal();
  }
});