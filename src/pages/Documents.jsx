import React, { useState, useEffect, useRef } from "react";
import "./Documents.css";

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [toastMessage, setToastMessage] = useState(null);

  // Upload Form State
  const [selectedFile, setSelectedFile] = useState(null);
  const [docCategory, setDocCategory] = useState("FIR");
  const [linkedCaseId, setLinkedCaseId] = useState("");
  const [docNotes, setDocNotes] = useState("");
  const [uploadedBy, setUploadedBy] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem("cybex_auth_user"));
      return u?.fullName || u?.userId || "Inspector Ramesh (Cyber Cell)";
    } catch {
      return "Inspector Ramesh (Cyber Cell)";
    }
  });

  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:3001/api/documents");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (err) {
      console.error("Error fetching documents:", err);
      showToast("❌ Error loading documents vault");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (file) => {
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      alert("File size exceeds 50MB limit.");
      return;
    }
    setSelectedFile(file);
    setShowUploadModal(true);
  };

  const handleUploadSubmit = async (e) => {
    e?.preventDefault();
    if (!selectedFile) {
      alert("Please select a file to attach.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("uploadedBy", uploadedBy);
    formData.append("linkedCaseId", linkedCaseId.trim() || "CC-GENERAL");
    formData.append("docType", docCategory);
    if (docNotes.trim()) {
      formData.append("notes", docNotes.trim());
    }

    setIsUploading(true);
    try {
      const res = await fetch("http://localhost:3001/api/documents", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to upload document");
      }

      const newDoc = await res.json();
      setDocuments((prev) => [newDoc, ...prev]);
      showToast(`✓ Document "${selectedFile.name}" attached successfully!`);
      
      // Reset upload modal
      setShowUploadModal(false);
      setSelectedFile(null);
      setLinkedCaseId("");
      setDocNotes("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      console.error("Error uploading file:", err);
      alert(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" from the repository?`)) {
      return;
    }

    try {
      const res = await fetch(`http://localhost:3001/api/documents/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
        showToast(`🗑️ Document "${name}" deleted.`);
      } else {
        alert("Failed to delete document.");
      }
    } catch (err) {
      console.error("Error deleting document:", err);
      alert("Error deleting document.");
    }
  };

  const getFileIcon = (mimetype, filename = "") => {
    const type = (mimetype || "").toLowerCase();
    const ext = filename.split(".").pop().toLowerCase();

    if (type.includes("pdf") || ext === "pdf") return "📄";
    if (type.includes("image") || ["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return "🖼️";
    if (type.includes("video") || ["mp4", "mkv", "avi", "mov"].includes(ext)) return "🎥";
    if (type.includes("sheet") || type.includes("csv") || ["xlsx", "xls", "csv"].includes(ext)) return "📊";
    if (type.includes("zip") || type.includes("tar") || type.includes("rar") || ["zip", "7z", "tar", "gz"].includes(ext)) return "📦";
    if (type.includes("word") || ["doc", "docx"].includes(ext)) return "📝";
    return "📁";
  };

  const formatBytes = (bytes, decimals = 1) => {
    if (!+bytes) return "0 B";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  // Filtered documents
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      searchTerm === "" ||
      doc.originalName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.uploadedBy?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.linkedCaseId?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === "All" ||
      (doc.mimetype && doc.mimetype.toLowerCase().includes(selectedCategory.toLowerCase())) ||
      (doc.originalName && doc.originalName.toLowerCase().includes(selectedCategory.toLowerCase())) ||
      (selectedCategory === "PDF" && (doc.mimetype?.includes("pdf") || doc.originalName?.endsWith(".pdf"))) ||
      (selectedCategory === "Images" && (doc.mimetype?.includes("image") || /\.(png|jpg|jpeg|webp)$/i.test(doc.originalName))) ||
      (selectedCategory === "Data" && (doc.mimetype?.includes("sheet") || doc.mimetype?.includes("csv") || /\.(csv|xlsx|xls)$/i.test(doc.originalName)));

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="documents-container">
      {toastMessage && (
        <div className="doc-toast-banner">
          {toastMessage}
        </div>
      )}

      {/* Top Header */}
      <div className="documents-header">
        <div>
          <h2>📂 Evidence & Documents Vault</h2>
          <p>
            Secure digital repository for FIR copies, seizure memos, CDR logs, forensic extractions, and bank KYC records
          </p>
        </div>

        <div className="upload-actions">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFileSelect(e.target.files[0])}
            style={{ display: "none" }}
            accept="*/*"
          />
          <button
            type="button"
            className="primary-btn upload-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? "⏳ Uploading..." : "📎 Attach Document / Evidence"}
          </button>
        </div>
      </div>

      {/* Drag & Drop Quick Area */}
      <div
        className={`doc-dropzone ${isDragging ? "dragging" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
          }
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="dropzone-icon">📁</div>
        <div className="dropzone-text">
          <strong>Drag & Drop evidence files here, or click to browse</strong>
          <span>Supports FIRs, Bank Memos, PDF Dossiers, CCTV Stills, CSV Logs, and ZIP bundles (Max 50MB)</span>
        </div>
      </div>

      {/* Search and Filters Strip */}
      <div className="doc-filter-strip">
        <div className="doc-search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search document by name, Case ID (e.g. CC-2026), or Officer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="clear-search"
              onClick={() => setSearchTerm("")}
            >
              ✕
            </button>
          )}
        </div>

        <div className="doc-category-pills">
          {["All", "PDF", "Images", "Data"].map((cat) => (
            <button
              type="button"
              key={cat}
              className={`cat-pill ${selectedCategory === cat ? "active" : ""}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat === "All" ? "All Formats" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Grid / Content */}
      <div className="documents-content">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading digital evidence repository...</p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📂</div>
            <h3>No Documents Found</h3>
            <p>
              {searchTerm || selectedCategory !== "All"
                ? "No uploaded documents match your current filter query."
                : "No digital evidence or files attached yet."}
            </p>
            <button
              type="button"
              className="primary-btn"
              style={{ marginTop: "12px" }}
              onClick={() => fileInputRef.current?.click()}
            >
              📎 Attach First Document
            </button>
          </div>
        ) : (
          <div className="documents-grid">
            {filteredDocuments.map((doc) => (
              <div key={doc.id} className="document-card">
                <div className="doc-card-top">
                  <div className="doc-icon">
                    {getFileIcon(doc.mimetype, doc.originalName)}
                  </div>
                  <div className="doc-details">
                    <h4 className="doc-title" title={doc.originalName}>
                      {doc.originalName}
                    </h4>
                    <div className="doc-meta">
                      <span className="doc-size">{formatBytes(doc.size)}</span>
                      <span>•</span>
                      <span className="doc-date">
                        {new Date(doc.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="doc-tags">
                  {doc.linkedCaseId && (
                    <span className="doc-case-tag">
                      🆔 {doc.linkedCaseId}
                    </span>
                  )}
                  <span className="doc-uploader-tag">
                    👮 {doc.uploadedBy}
                  </span>
                </div>

                <div className="doc-actions">
                  <a
                    href={`http://localhost:3001/uploads/${doc.filename}`}
                    target="_blank"
                    rel="noreferrer"
                    className="view-btn"
                  >
                    👁️ View / Download
                  </a>
                  <button
                    type="button"
                    className="delete-btn"
                    title="Delete Document"
                    onClick={() => handleDelete(doc.id, doc.originalName)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ATTACHMENT DETAILS MODAL */}
      {showUploadModal && selectedFile && (
        <div className="doc-modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="doc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="doc-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "28px" }}>📎</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: "17px", color: "#f8fafc" }}>
                    Attach Evidence / Document
                  </h3>
                  <small style={{ color: "#94a3b8" }}>
                    Complete metadata before archiving to the secure repository
                  </small>
                </div>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowUploadModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadSubmit}>
              <div className="doc-selected-file-banner">
                <div className="doc-selected-file-icon">
                  {getFileIcon(selectedFile.type, selectedFile.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ display: "block", color: "#fff", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                    {selectedFile.name}
                  </strong>
                  <small style={{ color: "#94a3b8" }}>
                    {formatBytes(selectedFile.size)} • {selectedFile.type || "Binary / Document"}
                  </small>
                </div>
              </div>

              <div className="doc-form-group">
                <label>Document Category</label>
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value)}
                >
                  <option value="FIR">Official FIR Copy / Complaint Copy</option>
                  <option value="Bank Statement">Bank Statement / Transaction Trace</option>
                  <option value="KYC Document">KYC Dossier / Beneficiary Identity</option>
                  <option value="Forensic Report">Digital Forensic / Extraction Report</option>
                  <option value="CCTV Footage">CCTV Camera Still / Video Extract</option>
                  <option value="CDR Log">CDR / IP Call Data Record</option>
                  <option value="General Evidence">General Case Evidence</option>
                </select>
              </div>

              <div className="doc-form-group">
                <label>Linked Complaint / Case Reference ID</label>
                <input
                  type="text"
                  placeholder="e.g. CC-2026-00412 or FIR-889"
                  value={linkedCaseId}
                  onChange={(e) => setLinkedCaseId(e.target.value)}
                />
              </div>

              <div className="doc-form-group">
                <label>Uploaded By (Officer / Investigator)</label>
                <input
                  type="text"
                  value={uploadedBy}
                  onChange={(e) => setUploadedBy(e.target.value)}
                />
              </div>

              <div className="doc-form-group">
                <label>Notes / Case Annotations (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Add notes about source, seizure hash, or chain of custody..."
                  value={docNotes}
                  onChange={(e) => setDocNotes(e.target.value)}
                />
              </div>

              <div className="doc-modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowUploadModal(false)}
                  disabled={isUploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={isUploading}
                >
                  {isUploading ? "⏳ Uploading..." : "✓ Upload & Attach"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
