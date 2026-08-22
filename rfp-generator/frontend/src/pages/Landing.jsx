import { useEffect, useState } from "react";
import AuthModal from "../components/AuthModal";
import { Card, CountUp, Logo, Reveal, SectionHeading, ThemeToggle } from "../components/ui";
import { applyTheme, getInitialTheme } from "../utils/theme";

/* ===============================================================
   Content lives here, once each.
   Nothing below should restate a claim another block already makes:
   the hero owns the promise, the stats own the numbers, "How it
   works" owns the process, and the FAQ answers only what none of
   them covered.
   =============================================================== */

const ROTATING = ["manually.", "from scratch.", "at midnight.", "by hand."];

const STATS = [
  { value: "30s", label: "Average draft time" },
  { value: "3hrs", label: "Saved per response" },
  { value: "4", label: "Sections written for you" },
];

const RFP_FACTS = [
  {
    icon: "🏛️",
    title: "Who publishes them",
    desc: "Government agencies, hospitals, banks and large corporates — anyone who has to pick a vendor fairly and on the record.",
  },
  {
    icon: "💼",
    title: "Who responds",
    desc: "Software firms, consultancies, agencies and freelancers competing for the contract.",
  },
  {
    icon: "🏆",
    title: "What winning means",
    desc: "A signed contract: booked revenue, a long-term client and a reference for the next bid.",
  },
];

const STEPS = [
  { icon: "📄", title: "Drop in the RFP", desc: "PDF, DOCX or TXT — or paste the text straight in." },
  { icon: "🔍", title: "The agent reads it", desc: "Retrieval-augmented parsing pulls out every requirement and deadline." },
  { icon: "✍️", title: "A draft appears", desc: "Written against your company profile, so it sounds like your team." },
  { icon: "📤", title: "Edit and export", desc: "Tune the wording, check the Win Score, download the PDF." },
];

const FAQS = [
  {
    q: "Why is responding to RFPs so painful?",
    a: "A single response means reading 40+ pages closely, mapping each requirement to something you actually do, and writing several sections in a formal register — usually against a deadline, usually on top of your real job. Most teams spend three to five hours on a bid they may not win.",
  },
  {
    q: "How is this different from pasting the RFP into a chatbot?",
    a: "A chatbot sees the text you paste and nothing else. ProposAI indexes the full document, retrieves the passages that matter section by section, and writes against the company profile you saved — capabilities, past projects, tone. You also get a Win Score, revision history and a formatted export instead of a wall of chat.",
  },
  {
    q: "Is my data secure?",
    a: "Your documents and drafts live in your own database records, scoped to your account — no other user can query them. API keys stay server-side and are never shipped to the browser.",
  },
];

/* ===============================================================
   Decorative pieces
   =============================================================== */

/** Two slow-drifting colour fields plus a faint grid, behind everything. */
function Aurora() {
  const blob = (extra) => ({
    position: "absolute",
    borderRadius: "50%",
    filter: "blur(90px)",
    willChange: "transform",
    ...extra,
  });
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      <div
        style={blob({
          top: "-160px",
          left: "8%",
          width: "540px",
          height: "540px",
          background: "var(--brand)",
          opacity: 0.22,
          animation: "drift-a 22s ease-in-out infinite",
        })}
      />
      <div
        style={blob({
          top: "40px",
          right: "2%",
          width: "460px",
          height: "460px",
          background: "var(--accent)",
          opacity: 0.14,
          animation: "drift-b 26s ease-in-out infinite",
        })}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 30%, #000 40%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 50% 30%, #000 40%, transparent 100%)",
        }}
      />
    </div>
  );
}

/** The last word of the headline, swapped on a timer. */
function RotatingWord() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % ROTATING.length), 2600);
    return () => clearInterval(id);
  }, []);
  return (
    <span
      style={{
        display: "inline-block",
        position: "relative",
        overflow: "hidden",
        verticalAlign: "bottom",
        perspective: "400px",
      }}
    >
      <span
        key={i}
        style={{
          display: "inline-block",
          color: "var(--brand)",
          animation: "word-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) both",
        }}
      >
        {ROTATING[i]}
      </span>
    </span>
  );
}

/** Stylised product shot: the RFP on the left, the draft writing itself on the right. */
function HeroMockup() {
  const line = (w, delay, color = "var(--border-strong)") => (
    <div
      key={`${w}-${delay}`}
      style={{
        "--w": w,
        height: "7px",
        borderRadius: "4px",
        background: color,
        width: w,
        animation: `type-line 0.5s ease ${delay}s both`,
        marginBottom: "9px",
      }}
    />
  );

  return (
    <div style={{ position: "relative", animation: "float-y 6s ease-in-out infinite" }}>
      <Card
        hover={false}
        style={{
          padding: 0,
          overflow: "hidden",
          boxShadow: "var(--shadow-lg)",
          borderRadius: "16px",
        }}
      >
        {/* window chrome */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            padding: "12px 16px",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-alt)",
          }}
        >
          {["#ef4444", "#f59e0b", "#22c55e"].map((c) => (
            <span
              key={c}
              style={{ width: "9px", height: "9px", borderRadius: "50%", background: c, opacity: 0.75 }}
            />
          ))}
          <span style={{ marginLeft: "8px", fontSize: "11px", color: "var(--text-faint)" }}>
            proposai · new response
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: "230px" }}>
          {/* source document */}
          <div style={{ padding: "18px", borderRight: "1px solid var(--border)" }}>
            <div
              style={{
                fontSize: "10px",
                letterSpacing: "1px",
                color: "var(--text-faint)",
                marginBottom: "14px",
              }}
            >
              📄 RFP-2026-014.PDF
            </div>
            {[["92%", 0], ["78%", 0.08], ["86%", 0.16], ["64%", 0.24], ["88%", 0.32], ["71%", 0.4]].map(
              ([w, d]) => line(w, d)
            )}
          </div>

          {/* generated draft */}
          <div style={{ padding: "18px", background: "var(--brand-tint)" }}>
            <div
              style={{
                fontSize: "10px",
                letterSpacing: "1px",
                color: "var(--brand)",
                marginBottom: "14px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              ✨ YOUR PROPOSAL
              <span style={{ animation: "caret 1s steps(1) infinite" }}>▌</span>
            </div>
            {[["88%", 0.9], ["96%", 1.05], ["73%", 1.2], ["90%", 1.35], ["81%", 1.5]].map(([w, d]) =>
              line(w, d, "var(--brand-soft)")
            )}
            <div
              style={{
                marginTop: "14px",
                height: "6px",
                borderRadius: "4px",
                background:
                  "linear-gradient(90deg, var(--brand-tint) 0%, var(--brand) 50%, var(--brand-tint) 100%)",
                backgroundSize: "220% 100%",
                animation: "shimmer 2.2s linear infinite",
              }}
            />
          </div>
        </div>
      </Card>

      {/* floating chips */}
      <div
        style={{
          position: "absolute",
          bottom: "-18px",
          left: "-16px",
          padding: "9px 14px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          fontSize: "12px",
          fontWeight: 600,
          color: "var(--text)",
          boxShadow: "var(--shadow-sm)",
          animation: "float-y 5s ease-in-out infinite 0.6s",
        }}
      >
        <span style={{ color: "var(--success)" }}>●</span> Win Score 87
      </div>
      <div
        style={{
          position: "absolute",
          top: "-16px",
          right: "-14px",
          padding: "9px 14px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          fontSize: "12px",
          fontWeight: 600,
          color: "var(--text)",
          boxShadow: "var(--shadow-sm)",
          animation: "float-y 7s ease-in-out infinite 1.2s",
        }}
      >
        ⚡ Drafted in 28s
      </div>
    </div>
  );
}

/** One collapsible FAQ row. */
function FaqItem({ q, a, open, onToggle }) {
  return (
    <Card
      hover={false}
      style={{ padding: 0, marginBottom: "12px", overflow: "hidden" }}
    >
      <button
        onClick={onToggle}
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          padding: "20px 22px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          fontFamily: "inherit",
          fontSize: "15px",
          fontWeight: 600,
          color: "var(--text)",
        }}
      >
        {q}
        <span
          aria-hidden="true"
          style={{
            flexShrink: 0,
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            border: "1px solid var(--border-strong)",
            display: "grid",
            placeItems: "center",
            fontSize: "13px",
            color: "var(--brand)",
            transform: open ? "rotate(45deg)" : "none",
            transition: "transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          +
        </span>
      </button>
      <div
        style={{
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
          transition: "grid-template-rows 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div style={{ overflow: "hidden" }}>
          <p
            style={{
              padding: "0 22px 22px",
              color: "var(--text-muted)",
              fontSize: "14px",
              lineHeight: 1.8,
            }}
          >
            {a}
          </p>
        </div>
      </div>
    </Card>
  );
}

/* ===============================================================
   Page
   =============================================================== */

const PAD = "clamp(20px, 6vw, 60px)";

export default function Landing() {
  const [theme, setTheme] = useState(getInitialTheme);
  const [authMode, setAuthMode] = useState(null); // null | "login" | "signup"
  const [openFaq, setOpenFaq] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => applyTheme(theme), [theme]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const goTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  const primaryBtn = {
    padding: "13px 28px",
    background: "var(--brand)",
    border: "none",
    borderRadius: "10px",
    color: "#fff",
    fontSize: "15px",
    fontWeight: 600,
    fontFamily: "inherit",
    cursor: "pointer",
    boxShadow: "0 10px 30px var(--brand-glow)",
  };

  const ghostBtn = {
    padding: "13px 28px",
    background: "transparent",
    border: "1px solid var(--border-strong)",
    borderRadius: "10px",
    color: "var(--text)",
    fontSize: "15px",
    fontWeight: 500,
    fontFamily: "inherit",
    cursor: "pointer",
  };

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", color: "var(--text)" }}>
      {/* ---------- Navbar ---------- */}
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "20px",
          padding: `16px ${PAD}`,
          position: "sticky",
          top: 0,
          zIndex: 200,
          background: scrolled ? "var(--nav-bg)" : "transparent",
          backdropFilter: scrolled ? "blur(14px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(14px)" : "none",
          borderBottom: `1px solid ${scrolled ? "var(--border)" : "transparent"}`,
          transition: "background 0.3s ease, border-color 0.3s ease",
        }}
      >
        <Logo />

        <div className="nav-links">
          <button className="nav-link" onClick={() => goTo("what-is-rfp")}>
            What's an RFP?
          </button>
          <button className="nav-link" onClick={() => goTo("how-it-works")}>
            How it works
          </button>
          <button className="nav-link" onClick={() => goTo("faq")}>
            FAQ
          </button>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <ThemeToggle
            theme={theme}
            onToggle={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          />
          <button
            onClick={() => setAuthMode("login")}
            className="press hide-sm"
            style={{
              padding: "9px 18px",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "9px",
              color: "var(--text-muted)",
              fontSize: "13px",
              fontFamily: "inherit",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => setAuthMode("signup")}
            className="sheen press"
            style={{
              padding: "9px 18px",
              background: "var(--brand)",
              border: "none",
              borderRadius: "9px",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Start free
          </button>
        </div>
      </nav>

      {/* ---------- Hero ---------- */}
      <header style={{ position: "relative", padding: `70px ${PAD} 90px`, overflow: "hidden" }}>
        <Aurora />
        <div
          style={{
            position: "relative",
            zIndex: 1,
            maxWidth: "1180px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
            gap: "60px",
            alignItems: "center",
          }}
        >
          {/* copy */}
          <div>
            <Reveal>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 14px",
                  background: "var(--brand-tint)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: "999px",
                  fontSize: "12px",
                  color: "var(--brand)",
                  marginBottom: "24px",
                }}
              >
                <span
                  style={{
                    position: "relative",
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "var(--brand)",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: "50%",
                      background: "var(--brand)",
                      animation: "ring 1.8s ease-out infinite",
                    }}
                  />
                </span>
                Free while in beta
              </div>
            </Reveal>

            <Reveal delay={80}>
              <h1
                style={{
                  fontSize: "clamp(38px, 6vw, 60px)",
                  fontWeight: 800,
                  lineHeight: 1.1,
                  letterSpacing: "-1.6px",
                  marginBottom: "22px",
                }}
              >
                Stop writing proposals{" "}
                <br />
                <RotatingWord />
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p
                style={{
                  color: "var(--text-muted)",
                  fontSize: "17px",
                  lineHeight: 1.75,
                  maxWidth: "460px",
                  marginBottom: "34px",
                }}
              >
                Hand ProposAI the RFP. Get back a complete, personalised proposal
                draft before your coffee cools — then edit it and send it.
              </p>
            </Reveal>

            <Reveal delay={240}>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <button
                  onClick={() => setAuthMode("signup")}
                  className="sheen press"
                  style={primaryBtn}
                >
                  Start free →
                </button>
                <button onClick={() => goTo("how-it-works")} className="press" style={ghostBtn}>
                  See how it works
                </button>
              </div>
            </Reveal>

            {/* stats */}
            <Reveal delay={320}>
              <div
                style={{
                  display: "flex",
                  gap: "36px",
                  marginTop: "52px",
                  flexWrap: "wrap",
                  paddingTop: "28px",
                  borderTop: "1px solid var(--border)",
                }}
              >
                {STATS.map(({ value, label }) => (
                  <div key={label}>
                    <div style={{ fontSize: "30px", fontWeight: 800, color: "var(--brand)" }}>
                      <CountUp value={value} />
                    </div>
                    <div style={{ fontSize: "12.5px", color: "var(--text-muted)", marginTop: "2px" }}>
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          {/* product shot */}
          <Reveal delay={200}>
            <HeroMockup />
          </Reveal>
        </div>
      </header>

      {/* ---------- What is an RFP ---------- */}
      <section
        id="what-is-rfp"
        style={{
          padding: `90px ${PAD}`,
          background: "var(--bg-alt)",
          borderTop: "1px solid var(--border)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ maxWidth: "920px", margin: "0 auto" }}>
          <Reveal>
            <SectionHeading
              accent="RFP?"
              sub="A Request for Proposal is what an organisation publishes when it needs to buy a service and wants competing bids. Answer it well and the contract is yours."
            >
              New here — what's an
            </SectionHeading>
          </Reveal>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "16px",
            }}
          >
            {RFP_FACTS.map(({ icon, title, desc }, i) => (
              <Reveal key={title} delay={i * 110}>
                <Card style={{ height: "100%" }}>
                  <div style={{ fontSize: "26px", marginBottom: "12px" }}>{icon}</div>
                  <h3
                    style={{
                      fontSize: "15px",
                      fontWeight: 600,
                      marginBottom: "8px",
                      color: "var(--text)",
                    }}
                  >
                    {title}
                  </h3>
                  <p style={{ color: "var(--text-muted)", fontSize: "13.5px", lineHeight: 1.75 }}>
                    {desc}
                  </p>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section id="how-it-works" style={{ padding: `90px ${PAD}` }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <Reveal>
            <SectionHeading accent="works" sub="Four steps, one sitting.">
              How it
            </SectionHeading>
          </Reveal>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: "18px",
            }}
          >
            {STEPS.map(({ icon, title, desc }, i) => (
              <Reveal key={title} delay={i * 120}>
                <Card style={{ height: "100%" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "14px",
                    }}
                  >
                    <span
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "11px",
                        background: "var(--brand-tint)",
                        display: "grid",
                        placeItems: "center",
                        fontSize: "19px",
                      }}
                    >
                      {icon}
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 800,
                        color: "var(--text-faint)",
                        letterSpacing: "1px",
                      }}
                    >
                      0{i + 1}
                    </span>
                  </div>
                  <h3
                    style={{
                      fontSize: "14.5px",
                      fontWeight: 600,
                      marginBottom: "8px",
                      color: "var(--text)",
                    }}
                  >
                    {title}
                  </h3>
                  <p style={{ color: "var(--text-muted)", fontSize: "13.5px", lineHeight: 1.75 }}>
                    {desc}
                  </p>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section
        id="faq"
        style={{
          padding: `90px ${PAD}`,
          background: "var(--bg-alt)",
          borderTop: "1px solid var(--border)",
        }}
      >
        <div style={{ maxWidth: "740px", margin: "0 auto" }}>
          <Reveal>
            <SectionHeading accent="questions">Frequently asked</SectionHeading>
          </Reveal>
          {FAQS.map(({ q, a }, i) => (
            <Reveal key={q} delay={i * 90}>
              <FaqItem
                q={q}
                a={a}
                open={openFaq === i}
                onToggle={() => setOpenFaq(openFaq === i ? -1 : i)}
              />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- Closing CTA ---------- */}
      <section style={{ padding: `90px ${PAD}` }}>
        <Reveal>
          <div
            style={{
              maxWidth: "880px",
              margin: "0 auto",
              position: "relative",
              overflow: "hidden",
              textAlign: "center",
              padding: "60px 32px",
              borderRadius: "22px",
              border: "1px solid var(--border-strong)",
              background:
                "radial-gradient(ellipse at 50% 0%, var(--brand-tint), transparent 70%), var(--surface)",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                top: "-120px",
                left: "50%",
                transform: "translateX(-50%)",
                width: "420px",
                height: "260px",
                background: "var(--brand)",
                filter: "blur(100px)",
                opacity: 0.28,
                animation: "drift-b 18s ease-in-out infinite",
              }}
            />
            <div style={{ position: "relative" }}>
              <h2
                style={{
                  fontSize: "clamp(24px, 4vw, 34px)",
                  fontWeight: 800,
                  letterSpacing: "-1px",
                  marginBottom: "14px",
                }}
              >
                There's an RFP on your desk right now.
              </h2>
              <p
                style={{
                  color: "var(--text-muted)",
                  fontSize: "15.5px",
                  lineHeight: 1.7,
                  maxWidth: "440px",
                  margin: "0 auto 30px",
                }}
              >
                Upload it and see what the first draft looks like. It costs nothing to find out.
              </p>
              <button
                onClick={() => setAuthMode("signup")}
                className="sheen press"
                style={primaryBtn}
              >
                Create your free account →
              </button>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ---------- Footer ---------- */}
      <footer
        style={{
          padding: `26px ${PAD}`,
          borderTop: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <Logo size={15} />
        <div style={{ color: "var(--text-faint)", fontSize: "12px" }}>
          © {new Date().getFullYear()} ProposAI. All rights reserved.
        </div>
      </footer>

      {authMode && <AuthModal mode={authMode} onClose={() => setAuthMode(null)} />}
    </div>
  );
}
