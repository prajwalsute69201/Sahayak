/**
 * Sahayak Landing Page Client Logic
 * Handles theme toggling, interactive agent simulation, FAQ accordions,
 * and copy-to-clipboard interactions.
 */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initMobileMenu();
  initSimulator();
  initFaqAccordions();
  initCopyButtons();
});

/* -------------------------------------------------------------------------- */
/* Theme Management                                                           */
/* -------------------------------------------------------------------------- */
function initTheme() {
  const themeToggle = document.getElementById('theme-toggle');
  if (!themeToggle) return;

  const savedTheme = localStorage.getItem('sahayak_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('sahayak_theme', next);
    updateThemeIcon(next);
  });
}

function updateThemeIcon(theme) {
  const toggleBtn = document.getElementById('theme-toggle');
  if (!toggleBtn) return;
  toggleBtn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
  toggleBtn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
}
window.updateThemeIcon = updateThemeIcon;

/* -------------------------------------------------------------------------- */
/* Mobile Menu Toggle                                                         */
/* -------------------------------------------------------------------------- */
function initMobileMenu() {
  const menuBtn = document.getElementById('mobile-menu-btn');
  const navMenu = document.getElementById('nav-menu');
  if (!menuBtn || !navMenu) return;

  menuBtn.addEventListener('click', () => {
    navMenu.classList.toggle('mobile-open');
    menuBtn.setAttribute('aria-expanded', navMenu.classList.contains('mobile-open'));
  });

  // Close when clicking a nav link
  navMenu.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('mobile-open');
    });
  });
}

/* -------------------------------------------------------------------------- */
/* Interactive Agent Simulator                                                */
/* -------------------------------------------------------------------------- */
const SIMULATOR_STEPS = [
  {
    step: 1,
    title: '1. User Instruction',
    content: `
      <div class="sim-message">
        <div class="sim-avatar user">U</div>
        <div class="sim-bubble">
          <strong>User:</strong> "Find the pricing plans on this page and scroll to them."
        </div>
      </div>
      <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.75rem;">
        Sahayak activates the Interactive Element Scanner and natural-language element ranker to locate the target element.
      </p>
    `,
    btnText: 'Proceed to Planning →',
  },
  {
    step: 2,
    title: '2. DOM Analysis & Proposal',
    content: `
      <div class="sim-message">
        <div class="sim-avatar agent">S</div>
        <div class="sim-bubble">
          <strong>Sahayak Planner:</strong> Identified target <code>&lt;section id="pricing"&gt;</code>.<br/>
          <em>Prepared single-step action:</em> <strong>scroll_to_element</strong> (#pricing).
        </div>
      </div>
      <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 6px; padding: 0.75rem; margin-top: 0.5rem; font-size: 0.85rem;">
        <span style="color: #34d399; font-weight: 700;">Deterministic Risk Assessment: LOW RISK</span><br/>
        Visual viewport navigation only. Zero external, financial, or data-mutating impact.
      </div>
    `,
    btnText: 'Show Approval Card →',
  },
  {
    step: 3,
    title: '3. Human-In-The-Loop Approval UI',
    content: `
      <div class="approval-card-mock">
        <div class="approval-card-header">
          <span class="approval-card-title">Proposed Action #act_8291</span>
          <span class="badge badge-green">LOW RISK</span>
        </div>
        <div class="approval-meta-row">
          <div><strong>Action:</strong> Scroll to Pricing Section (<code>scroll_to_element</code>)</div>
          <div><strong>Target:</strong> &lt;section id="pricing"&gt; • "Pricing Plans"</div>
          <div><strong>Token:</strong> <code>tok_9b2e81...</code> (Single-Use Only)</div>
        </div>
        <div class="approval-actions">
          <button class="btn btn-primary btn-sm" id="sim-approve-btn">✓ Approve & Execute</button>
          <button class="btn btn-secondary btn-sm" id="sim-reject-btn">✕ Reject</button>
        </div>
      </div>
    `,
    btnText: null, // Interactive buttons handle this
  },
  {
    step: 4,
    title: '4. Execution & Verification',
    content: `
      <div style="text-align: center; padding: 1rem 0;">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🎉</div>
        <h4 style="font-size: 1.15rem; color: #34d399; margin-bottom: 0.5rem;">Action Executed Successfully</h4>
        <p style="font-size: 0.875rem; color: var(--text-secondary); max-width: 480px; margin: 0 auto;">
          The browser smoothly scrolled to the Pricing Section in 38ms. Single-use approval token consumed. Execution recorded in local Action Logs.
        </p>
      </div>
    `,
    btnText: '↻ Reset Simulator',
  },
];

function initSimulator() {
  renderSimStep(0);

  const dots = document.querySelectorAll('.step-dot');
  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      renderSimStep(index);
    });
  });
}

function renderSimStep(index) {
  const data = SIMULATOR_STEPS[index];
  const container = document.getElementById('sim-content');
  const actionBtn = document.getElementById('sim-action-btn');
  const dots = document.querySelectorAll('.step-dot');

  if (!container) return;

  dots.forEach((d, i) => {
    d.classList.toggle('active', i === index);
  });

  container.innerHTML = data.content;

  if (actionBtn) {
    if (data.btnText) {
      actionBtn.style.display = 'inline-flex';
      actionBtn.textContent = data.btnText;
      actionBtn.onclick = () => {
        if (index === SIMULATOR_STEPS.length - 1) {
          renderSimStep(0);
        } else {
          renderSimStep(index + 1);
        }
      };
    } else {
      actionBtn.style.display = 'none';
    }
  }

  // Bind approval card buttons if in step 3
  if (index === 2) {
    const approveBtn = document.getElementById('sim-approve-btn');
    const rejectBtn = document.getElementById('sim-reject-btn');
    if (approveBtn) {
      approveBtn.onclick = () => renderSimStep(3);
    }
    if (rejectBtn) {
      rejectBtn.onclick = () => renderSimStep(0);
    }
  }
}

/* -------------------------------------------------------------------------- */
/* FAQ Accordions                                                             */
/* -------------------------------------------------------------------------- */
function initFaqAccordions() {
  const items = document.querySelectorAll('.faq-item');
  items.forEach((item) => {
    const question = item.querySelector('.faq-question');
    if (question) {
      question.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        items.forEach((other) => other.classList.remove('open'));
        if (!isOpen) {
          item.classList.add('open');
        }
      });
    }
  });
}

/* -------------------------------------------------------------------------- */
/* Copy to Clipboard                                                          */
/* -------------------------------------------------------------------------- */
function initCopyButtons() {
  const copyBtns = document.querySelectorAll('[data-copy]');
  copyBtns.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const textToCopy = btn.getAttribute('data-copy');
      if (!textToCopy) return;

      try {
        await navigator.clipboard.writeText(textToCopy);
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        btn.classList.add('badge-green');
        setTimeout(() => {
          btn.textContent = originalText;
          btn.classList.remove('badge-green');
        }, 2000);
      } catch (err) {
        console.warn('Clipboard write failed:', err);
      }
    });
  });
}
