// ============================================
// NAVIGATION & MENU TOGGLE
// ============================================
const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');
const navbar = document.getElementById('navbar');

// Mobile menu toggle
menuToggle.addEventListener('click', (e) => {
  e.stopPropagation(); // Prevent event from bubbling
  navLinks.classList.toggle('active');
  menuToggle.classList.toggle('active');
});

// Close mobile menu when clicking a navigation link
const navItems = navLinks.querySelectorAll('a');
navItems.forEach(item => {
  item.addEventListener('click', () => {
    navLinks.classList.remove('active');
    menuToggle.classList.remove('active');
  });
});

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
  if (!navbar.contains(e.target) && navLinks.classList.contains('active')) {
    navLinks.classList.remove('active');
    menuToggle.classList.remove('active');
  }
});

// ============================================
// DARK MODE TOGGLE
// ============================================
const darkModeToggle = document.getElementById('darkModeToggle');
const darkModeIcon = darkModeToggle.querySelector('i');

// Load saved theme preference
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
  document.body.classList.add('dark-mode');
  darkModeIcon.classList.remove('fa-moon');
  darkModeIcon.classList.add('fa-sun');
}

// Toggle dark mode
darkModeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  
  // Update icon
  if (isDark) {
    darkModeIcon.classList.remove('fa-moon');
    darkModeIcon.classList.add('fa-sun');
  } else {
    darkModeIcon.classList.remove('fa-sun');
    darkModeIcon.classList.add('fa-moon');
  }
});

// ============================================
// SECTION NAVIGATION
// ============================================
const sections = document.querySelectorAll('.page-section');
const navLinksAll = document.querySelectorAll('[data-section]');

function showSection(sectionId) {
  // Hide all sections
  sections.forEach(section => section.classList.remove('active'));
  
  // Show target section
  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.classList.add('active');
  }
  
  // Update active nav link
  navLinksAll.forEach(link => {
    const linkSection = link.getAttribute('data-section');
    if (linkSection === sectionId) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
  
  // Close mobile menu - IMPORTANT for mobile UX
  if (navLinks && menuToggle) {
    navLinks.classList.remove('active');
    menuToggle.classList.remove('active');
  }
  
  // Scroll to top smoothly
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Add click listeners to all navigation links
navLinksAll.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const sectionId = link.getAttribute('data-section');
    showSection(sectionId);
  });
});

// ============================================
// FLOATING CONTACT BUTTON & POPUP
// ============================================
// const contactIcon = document.getElementById('contactIcon');
// const popupForm = document.getElementById('popupForm');
// const closeBtn = document.getElementById('closeBtn');

// // Open popup
// contactIcon.addEventListener('click', () => {
//   popupForm.classList.add('active');
//   document.body.style.overflow = 'hidden'; // Prevent scrolling
// });

// // Close popup
// closeBtn.addEventListener('click', () => {
//   popupForm.classList.remove('active');
//   document.body.style.overflow = ''; // Restore scrolling
// });

// // Close popup when clicking overlay
// popupForm.addEventListener('click', (e) => {
//   if (e.target === popupForm) {
//     popupForm.classList.remove('active');
//     document.body.style.overflow = '';
//   }
// });

// // Close popup on Escape key
// document.addEventListener('keydown', (e) => {
//   if (e.key === 'Escape' && popupForm.classList.contains('active')) {
//     popupForm.classList.remove('active');
//     document.body.style.overflow = '';
//   }
// });

// ============================================
// VIDEO MODAL
// ============================================
const videoModal = document.getElementById('videoModal');
const videoFrame = document.getElementById('videoFrame');
const videoCloseBtn = document.querySelector('.video-close-btn');
const playButtons = document.querySelectorAll('.play-btn');

// Open video modal
playButtons.forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const videoId = btn.getAttribute('data-video');
    if (videoId) {
      videoFrame.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
      videoModal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  });
});

// Close video modal
function closeVideoModal() {
  videoModal.classList.remove('active');
  videoFrame.src = '';
  document.body.style.overflow = '';
}

videoCloseBtn.addEventListener('click', closeVideoModal);

videoModal.addEventListener('click', (e) => {
  if (e.target === videoModal) {
    closeVideoModal();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && videoModal.classList.contains('active')) {
    closeVideoModal();
  }
});

// ============================================
// CERTIFICATE ENLARGEMENT
// ============================================
const certificateItems = document.querySelectorAll('.certificate-item');

certificateItems.forEach(item => {
  item.addEventListener('click', (e) => {
    e.stopPropagation();
    
    // Close other enlarged certificates
    certificateItems.forEach(otherItem => {
      if (otherItem !== item) {
        otherItem.classList.remove('enlarged');
      }
    });
    
    // Toggle current certificate
    item.classList.toggle('enlarged');
    
    if (item.classList.contains('enlarged')) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  });
});

// Close enlarged certificate when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.certificate-item')) {
    certificateItems.forEach(item => {
      item.classList.remove('enlarged');
    });
    document.body.style.overflow = '';
  }
});

// Close on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    certificateItems.forEach(item => {
      item.classList.remove('enlarged');
    });
    document.body.style.overflow = '';
  }
});

// ============================================
// NAME ENCRYPTION ANIMATION
// ============================================
const nameElement = document.getElementById('decrypt-name');
const realName = 'Kurt Decena';
const chars = '!@#$%^&*()_+-={}[]<>?/|~0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

let displayText = realName.split('');
let isEncrypting = false;
let interval;

// Settings
const frameSpeed = 60;
const charChangeRate = 0.2;
const pauseRealName = 3000;
const pauseEncrypted = 1000;

function randomChar() {
  return chars[Math.floor(Math.random() * chars.length)];
}

function animate() {
  let completed = true;
  
  if (isEncrypting) {
    // Scrambling phase
    for (let i = 0; i < displayText.length; i++) {
      if (Math.random() < charChangeRate) {
        displayText[i] = randomChar();
        completed = false;
      }
    }
  } else {
    // Revealing phase
    for (let i = 0; i < realName.length; i++) {
      if (displayText[i] !== realName[i]) {
        displayText[i] = (Math.random() < charChangeRate) ? randomChar() : realName[i];
        completed = false;
      }
    }
  }
  
  nameElement.textContent = displayText.join('');
  
  if (completed) {
    clearInterval(interval);
    setTimeout(() => {
      isEncrypting = !isEncrypting;
      interval = setInterval(animate, frameSpeed);
    }, isEncrypting ? pauseEncrypted : pauseRealName);
  }
}

// Start animation
interval = setInterval(animate, frameSpeed);

// ============================================
// INTERSECTION OBSERVER FOR ANIMATIONS
// ============================================
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, observerOptions);

// Observe animated elements
document.addEventListener('DOMContentLoaded', () => {
  const animatedElements = document.querySelectorAll('.project-card, .timeline-item, .certificate-item');
  
  animatedElements.forEach((el, index) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`;
    observer.observe(el);
  });
});

// ============================================
// SMOOTH SCROLL BEHAVIOR
// ============================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// ============================================
// NAVBAR SCROLL EFFECT
// ============================================
let lastScroll = 0;

window.addEventListener('scroll', () => {
  const currentScroll = window.pageYOffset;
  
  if (currentScroll <= 0) {
    navbar.style.boxShadow = 'none';
  } else {
    navbar.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
  }
  
  lastScroll = currentScroll;
});

// ============================================
// FORM HANDLING
// ============================================
const forms = document.querySelectorAll('form[name="contact"]');

forms.forEach(form => {
  form.addEventListener('submit', (e) => {
    // Let Netlify handle the form submission
    // You can add additional validation or analytics here if needed
    console.log('Form submitted');
  });
});

// ============================================
// PERFORMANCE: LAZY LOADING IMAGES
// ============================================
if ('loading' in HTMLImageElement.prototype) {
  const images = document.querySelectorAll('img[loading="lazy"]');
  images.forEach(img => {
    img.src = img.dataset.src;
  });
} else {
  // Fallback for browsers that don't support lazy loading
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/lazysizes/5.3.2/lazysizes.min.js';
  document.body.appendChild(script);
}

// ============================================
// SUCCESS PAGE CONFETTI EFFECT
// ============================================
function createConfetti() {
  const colors = ['#0066ff', '#00d4ff', '#00ff88', '#ff6b6b', '#ffd93d'];
  for (let i = 0; i < 50; i++) {
    setTimeout(() => {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.animationDelay = Math.random() * 0.5 + 's';
      confetti.style.animationDuration = Math.random() * 2 + 2 + 's';
      document.body.appendChild(confetti);
      
      setTimeout(() => confetti.remove(), 3000);
    }, i * 30);
  }
}

// Trigger confetti if on success page
if (document.querySelector('.success-container')) {
  window.addEventListener('load', () => {
    createConfetti();
  });
}

// ============================================
// CONSOLE EASTER EGG
// ============================================
console.log('%c👋 Hello there!', 'font-size: 24px; font-weight: bold; color: #0066ff;');
console.log('%cLooking for something? Check out my GitHub: https://github.com/devKurt6', 'font-size: 14px; color: #00d4ff;');
console.log('%cInterested in working together? Let\'s connect!', 'font-size: 14px; color: #6c757d;');