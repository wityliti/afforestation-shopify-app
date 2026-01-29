import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { useState } from "react";
import styles from "./_index/styles.module.css";

export const meta: MetaFunction = () => {
  return [
    { title: "Contact Us | Afforestation Shopify App" },
    { name: "description", content: "Get in touch with the Afforestation team" },
  ];
};

export default function Contact() {
  const [formState, setFormState] = useState<'idle' | 'sending' | 'sent'>('idle');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormState('sending');
    // Simulate form submission
    setTimeout(() => {
      setFormState('sent');
    }, 1000);
  };

  return (
    <div className={styles.page} style={{ minHeight: '100vh' }}>
      <div className={styles.bgLayer1} />
      <div className={styles.bgLayer2} />
      <div className={styles.bgLayer3} />
      <div className={styles.gradientTop} />
      <div className={styles.gradientBottom} />

      <div className={styles.content} style={{ opacity: 1, maxWidth: '800px' }}>
        {/* Header */}
        <Link to="/" style={{ textDecoration: 'none' }}>
          <div className={styles.logoSection} style={{ marginBottom: '2rem' }}>
            <div className={styles.logoWrapper}>
              <div className={styles.logoContainer} style={{ width: '80px', height: '80px' }}>
                <img
                  src="/afforestation-logo.png"
                  alt="Afforestation"
                  className={styles.logoImage}
                  style={{ width: '50px', height: '50px' }}
                />
              </div>
            </div>
            <span className={styles.brandName} style={{ fontSize: '1.25rem', marginTop: '1rem' }}>
              afforestation.org
            </span>
          </div>
        </Link>

        {/* Content */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '24px',
          padding: '3rem',
          marginBottom: '2rem',
          color: 'rgba(255, 255, 255, 0.9)',
          lineHeight: '1.8',
        }}>
          <h1 style={{
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
            fontWeight: 600,
            color: 'white',
            marginBottom: '1rem',
          }}>
            Contact Us
          </h1>

          <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '2rem', fontSize: '1.1rem' }}>
            Have questions? We're here to help you make a positive impact on the planet.
          </p>

          {/* Contact Options */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.5rem',
            marginBottom: '3rem'
          }}>
            <div style={{
              padding: '1.5rem',
              background: 'rgba(74, 222, 128, 0.1)',
              borderRadius: '16px',
              border: '1px solid rgba(74, 222, 128, 0.2)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📧</div>
              <h3 style={{ color: '#4ade80', marginBottom: '0.5rem', fontSize: '1rem' }}>General Inquiries</h3>
              <a href="mailto:hello@afforestation.org" style={{ color: 'white', fontSize: '0.9rem' }}>
                hello@afforestation.org
              </a>
            </div>

            <div style={{
              padding: '1.5rem',
              background: 'rgba(74, 222, 128, 0.1)',
              borderRadius: '16px',
              border: '1px solid rgba(74, 222, 128, 0.2)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🛠️</div>
              <h3 style={{ color: '#4ade80', marginBottom: '0.5rem', fontSize: '1rem' }}>Technical Support</h3>
              <a href="mailto:support@afforestation.org" style={{ color: 'white', fontSize: '0.9rem' }}>
                support@afforestation.org
              </a>
            </div>

            <div style={{
              padding: '1.5rem',
              background: 'rgba(74, 222, 128, 0.1)',
              borderRadius: '16px',
              border: '1px solid rgba(74, 222, 128, 0.2)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🤝</div>
              <h3 style={{ color: '#4ade80', marginBottom: '0.5rem', fontSize: '1rem' }}>Partnerships</h3>
              <a href="mailto:partners@afforestation.org" style={{ color: 'white', fontSize: '0.9rem' }}>
                partners@afforestation.org
              </a>
            </div>
          </div>

          {/* Contact Form */}
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'white', marginBottom: '1.5rem' }}>
              Send us a message
            </h2>

            {formState === 'sent' ? (
              <div style={{
                padding: '2rem',
                background: 'rgba(74, 222, 128, 0.15)',
                borderRadius: '16px',
                textAlign: 'center',
                border: '1px solid rgba(74, 222, 128, 0.3)'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                <h3 style={{ color: '#4ade80', marginBottom: '0.5rem' }}>Message Sent!</h3>
                <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  Thank you for reaching out. We'll get back to you within 24 hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    style={{
                      width: '100%',
                      padding: '0.875rem 1rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '12px',
                      color: 'white',
                      fontSize: '1rem',
                      outline: 'none',
                      transition: 'border-color 0.3s ease',
                    }}
                    placeholder="John Smith"
                  />
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    style={{
                      width: '100%',
                      padding: '0.875rem 1rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '12px',
                      color: 'white',
                      fontSize: '1rem',
                      outline: 'none',
                    }}
                    placeholder="you@example.com"
                  />
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>
                    Store URL (optional)
                  </label>
                  <input
                    type="text"
                    style={{
                      width: '100%',
                      padding: '0.875rem 1rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '12px',
                      color: 'white',
                      fontSize: '1rem',
                      outline: 'none',
                    }}
                    placeholder="your-store.myshopify.com"
                  />
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>
                    Subject
                  </label>
                  <select
                    style={{
                      width: '100%',
                      padding: '0.875rem 1rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '12px',
                      color: 'white',
                      fontSize: '1rem',
                      outline: 'none',
                    }}
                  >
                    <option value="general" style={{ background: '#1a1a1a' }}>General Question</option>
                    <option value="support" style={{ background: '#1a1a1a' }}>Technical Support</option>
                    <option value="billing" style={{ background: '#1a1a1a' }}>Billing Inquiry</option>
                    <option value="partnership" style={{ background: '#1a1a1a' }}>Partnership Opportunity</option>
                    <option value="feedback" style={{ background: '#1a1a1a' }}>Feedback / Suggestion</option>
                  </select>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>
                    Message
                  </label>
                  <textarea
                    required
                    rows={5}
                    style={{
                      width: '100%',
                      padding: '0.875rem 1rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '12px',
                      color: 'white',
                      fontSize: '1rem',
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                    }}
                    placeholder="How can we help you?"
                  />
                </div>

                <button
                  type="submit"
                  disabled={formState === 'sending'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    width: '100%',
                    padding: '1rem 2rem',
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: 'white',
                    background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: formState === 'sending' ? 'wait' : 'pointer',
                    opacity: formState === 'sending' ? 0.7 : 1,
                    transition: 'all 0.3s ease',
                  }}
                >
                  {formState === 'sending' ? (
                    <>Sending...</>
                  ) : (
                    <>
                      Send Message
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* FAQ Link */}
          <div style={{
            marginTop: '2rem',
            padding: '1.5rem',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.5rem' }}>
              Looking for quick answers?
            </p>
            <a
              href="https://afforestation.org/faq"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#4ade80', textDecoration: 'none', fontWeight: 500 }}
            >
              Check our FAQ →
            </a>
          </div>
        </div>

        {/* Back link */}
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#4ade80',
            textDecoration: 'none',
            fontSize: '0.9rem',
            marginBottom: '2rem'
          }}
        >
          ← Back to Home
        </Link>

        {/* Footer */}
        <footer className={styles.footer} style={{ opacity: 1 }}>
          <div className={styles.footerContent}>
            <span>Powered by</span>
            <a href="https://afforestation.org" target="_blank" rel="noopener noreferrer" className={styles.footerLink}>
              <img src="/afforestation-logo.png" alt="" className={styles.footerLogo} />
              afforestation.org
            </a>
          </div>
          <div className={styles.footerLinks}>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/contact">Contact</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
