import React, { useState, useEffect, useRef } from "react";
import "./Documents.css";

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/documents");
      const data = await res.json();
      setDocuments(data);
    } catch (err) {
      console.error("Error fetching documents:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("uploadedBy", "Inspector Ramesh"); // Mock current user

    setIsUploading(true);
    try {
      const res = await fetch("http://localhost:3001/api/documents", {
        method: "POST",
        body: formData,
      });
      const newDoc = await res.json();
      setDocuments([newDoc, ...documents]);
    } catch (err) {
      console.error("Error uploading file:", err);
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const getFileIcon = (mimetype) => {
    if (mimetype.includes("image")) return "🖼️";
    if (mimetype.includes("pdf")) return "📄";
    return "📁";
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  return (
    <div className="documents-container">
      <div className="documents-header">
        <div>
          <h2>Documents Vault</h2>
          <p>Securely store and manage FIRs, evidence, and KYC documents.</p>
        </div>
        <div className="upload-actions">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            style={{ display: "none" }} 
            accept="image/*,.pdf"
          />
          <button 
            className="primary-btn upload-btn" 
            onClick={() => fileInputRef.current.click()}
            disabled={isUploading}
          >
            {isUploading ? "Uploading..." : "+ Upload Document"}
          </button>
        </div>
      </div>

      <div className="documents-content">
        {loading ? (
          <div className="loading-state">Loading documents...</div>
        ) : documents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📂</div>
            <p>No documents uploaded yet.</p>
            <p className="empty-subtext">Click upload to securely store evidence.</p>
          </div>
        ) : (
          <div className="documents-grid">
            {documents.map(doc => (
              <div key={doc.id} className="document-card">
                <div className="doc-icon">
                  {getFileIcon(doc.mimetype)}
                </div>
                <div className="doc-details">
                  <h4 className="doc-title" title={doc.originalName}>{doc.originalName}</h4>
                  <div className="doc-meta">
                    <span>{formatBytes(doc.size)}</span>
                    <span>•</span>
                    <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="doc-uploader">
                    👤 {doc.uploadedBy}
                  </div>
                </div>
                <div className="doc-actions">
                  <a 
                    href={`http://localhost:3001/uploads/${doc.filename}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="view-btn"
                  >
                    View
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
