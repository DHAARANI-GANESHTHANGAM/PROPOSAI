import { useState, useEffect } from "react";

export default function Profile() {
  const [profile, setProfile] = useState({
    companyName:   "",
    services:      "",
    teamSize:      "",
    location:      "",
    experience:    "",
    speciality:    "",
    website:       "",
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("company_profile");
    if (stored) setProfile(JSON.parse(stored));
  }, []);

  const handleChange = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem("company_profile", JSON.stringify(profile));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const fields = [
    { key: "companyName", label: "Company Name",       placeholder: "e.g. TechCorp Solutions"           },
    { key: "services",    label: "Services Offered",   placeholder: "e.g. Web development, AI, CRM..."  },
    { key: "teamSize",    label: "Team Size",           placeholder: "e.g. 25 employees"                 },
    { key: "location",    label: "Location",            placeholder: "e.g. Dubai, UAE"                   },
    { key: "experience",  label: "Years of Experience", placeholder: "e.g. 8 years"                      },
    { key: "speciality",  label: "Industry Speciality", placeholder: "e.g. Healthcare, Fintech, Retail"  },
    { key: "website",     label: "Website",             placeholder: "e.g. https://techcorp.com"         },
  ];

  return (
    <div className="page" style={{ maxWidth: "700px" }}>

      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "26px", fontWeight: "700",
          color: "#fff", marginBottom: "8px" }}>
          Company Profile
        </h1>
        <p style={{ color: "#555", fontSize: "14px" }}>
          Fill in your company details. The AI will use this to personalize every RFP response.
        </p>
      </div>

      {/* Info Banner */}
      <div style={{ background: "#13131f", border: "1px solid #2e2e5e",
        borderRadius: "10px", padding: "16px", marginBottom: "28px",
        display: "flex", gap: "12px", alignItems: "flex-start" }}>
        <span style={{ fontSize: "20px" }}>💡</span>
        <p style={{ color: "#8888cc", fontSize: "13px", lineHeight: "1.6", margin: 0 }}>
          The more detail you add here, the more personalized and professional
          your AI-generated proposals will sound. Fill in as much as possible!
        </p>
      </div>

      {/* Form */}
      <div style={{ background: "#111118", border: "1px solid #1e1e2e",
        borderRadius: "12px", padding: "28px" }}>
        {fields.map(({ key, label, placeholder }) => (
          <div key={key} style={{ marginBottom: "20px" }}>
            <label style={{ color: "#555", fontSize: "12px", fontWeight: "600",
              letterSpacing: "1px", display: "block", marginBottom: "8px" }}>
              {label.toUpperCase()}
            </label>
            <input
              type="text"
              value={profile[key]}
              onChange={(e) => handleChange(key, e.target.value)}
              placeholder={placeholder}
              style={{ width: "100%", padding: "10px 14px",
                background: "#0d0d14", border: "1px solid #1e1e2e",
                borderRadius: "8px", color: "#fff", fontSize: "14px",
                outline: "none", boxSizing: "border-box",
                transition: "border 0.15s" }}
            />
          </div>
        ))}

        {/* Save Button */}
        <button onClick={handleSave} style={{
          width: "100%", padding: "12px",
          background: saved ? "#14532d" : "#6366f1",
          border: `1px solid ${saved ? "#22c55e" : "transparent"}`,
          borderRadius: "8px", color: saved ? "#22c55e" : "#fff",
          fontSize: "14px", fontWeight: "600", cursor: "pointer",
          transition: "all 0.2s" }}>
          {saved ? "✅ Profile Saved!" : "Save Profile"}
        </button>
      </div>
    </div>
  );
}