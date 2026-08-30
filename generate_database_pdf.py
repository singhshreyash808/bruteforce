import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 9)
        self.setFillColor(colors.HexColor("#64748b"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 750, "CybEx – Cybercrime Predictive Intelligence System | Database Architecture & Viva Guide")
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.5)
            self.line(54, 742, letter[0] - 54, 742)
            
        # Footer
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(letter[0] - 54, 36, page_text)
        self.drawString(54, 36, "CONFIDENTIAL & PROPRIETARY — LAW ENFORCEMENT & ACADEMIC PROJECT USE")
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(54, 48, letter[0] - 54, 48)
        self.restoreState()

def build_pdf():
    pdf_path = "CybEx_Database_Architecture_And_Viva_Guide.pdf"
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    # Custom Palette
    c_primary = colors.HexColor("#0f172a") # Slate 900
    c_accent = colors.HexColor("#0284c7")  # Sky 600
    c_dark_accent = colors.HexColor("#0369a1")
    c_success = colors.HexColor("#059669")
    c_bg_light = colors.HexColor("#f8fafc")
    c_border = colors.HexColor("#e2e8f0")
    c_text = colors.HexColor("#1e293b")
    c_muted = colors.HexColor("#475569")

    title_style = ParagraphStyle(
        'DocTitle',
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=c_primary,
        spaceAfter=6
    )

    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=c_accent,
        spaceAfter=14
    )

    h1_style = ParagraphStyle(
        'H1',
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=c_primary,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'H2',
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=c_dark_accent,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body',
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=c_text,
        spaceAfter=6
    )

    bold_body = ParagraphStyle(
        'BoldBody',
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13.5,
        textColor=c_text
    )

    callout_style = ParagraphStyle(
        'Callout',
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor("#0c4a6e")
    )

    table_header = ParagraphStyle(
        'TableHeader',
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )

    table_cell = ParagraphStyle(
        'TableCell',
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=c_text
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=c_text
    )

    q_style = ParagraphStyle(
        'Question',
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#b91c1c"), # Dark Red
        spaceBefore=8,
        spaceAfter=2,
        keepWithNext=True
    )

    ans_style = ParagraphStyle(
        'Answer',
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=c_text,
        spaceAfter=6
    )

    story = []

    # -------------------------------------------------------------
    # COVER / HEADER
    # -------------------------------------------------------------
    story.append(Paragraph("CYBEX – CYBERCRIME PREDICTIVE INTELLIGENCE", title_style))
    story.append(Paragraph("DATABASE ARCHITECTURE, DATA SCHEMAS & VIVA PRESENTATION GUIDE", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=c_accent, spaceBefore=0, spaceAfter=12))

    # Meta banner table
    meta_data = [
        [
            Paragraph("<b>Project:</b> CybEx Cybercrime Intelligence", table_cell),
            Paragraph("<b>Database Engine:</b> SQLite 3 (Relational RDBMS)", table_cell),
            Paragraph("<b>Total Active Records:</b> 62,700+", table_cell)
        ],
        [
            Paragraph("<b>ORM Layer:</b> Sequelize ORM (Node.js)", table_cell),
            Paragraph("<b>ML Microservice:</b> Python (Scikit-Learn)", table_cell),
            Paragraph("<b>Date:</b> August 2026", table_cell)
        ]
    ]
    t_meta = Table(meta_data, colWidths=[170, 170, 164])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), c_bg_light),
        ('BOX', (0, 0), (-1, -1), 1, c_border),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 10))

    # -------------------------------------------------------------
    # SECTION 1: WHAT TO TELL TEACHER (VIVA ANSWER)
    # -------------------------------------------------------------
    story.append(Paragraph("1. Teacher / Examiner Ko Kya Batana Hai? (Quick Viva Answer)", h1_style))
    
    callout_text = """
    <b>🎯 30-Second Perfect Answer for Teacher:</b><br/>
    <i>"Sir/Ma'am, humne is project me <b>Relational Database Management System (RDBMS) ke roop me SQLite</b> use kiya hai, jisko <b>Sequelize ORM (Object-Relational Mapping)</b> ke through Node.js Express backend se seamlessly connect kiya gaya hai. Database me total <b>10 structured tables</b> hain jinme <b>62,700+ records</b> hain (including 55,254 nationwide cybercrime complaints, 4,249 ATMs, real-time alerts, tasks, audit logs, and encrypted evidence documents). Iske sath Python Machine Learning model ko real-time risk prediction aur ML evaluation ke liye SQLite database ke sath integrated rakha gaya hai as a single source of truth."</i>
    """
    t_callout = Table([[Paragraph(callout_text, callout_style)]], colWidths=[504])
    t_callout.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f0f9ff")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#bae6fd")),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(t_callout)
    story.append(Spacer(1, 12))

    # -------------------------------------------------------------
    # SECTION 2: SYSTEM DATA INVENTORY (ALL TABLES & COUNTS)
    # -------------------------------------------------------------
    story.append(Paragraph("2. Backend Database Inventory (Tables & Live Record Counts)", h1_style))
    story.append(Paragraph("Humare database (<code>server/database.sqlite</code>) me total 10 tables hain:", body_style))

    table_inventory = [
        [Paragraph("Table Name", table_header), Paragraph("Record Count", table_header), Paragraph("Primary Key", table_header), Paragraph("Functional Description in Project", table_header)],
        [Paragraph("<b>Complaints</b>", table_cell_bold), Paragraph("55,254", table_cell), Paragraph("id (Auto) / complaintId", table_cell), Paragraph("Central registry of all verified cybercrime FIRs across 28 states & 8 UTs (UPI, Phishing, ATM Skimming, etc.).", table_cell)],
        [Paragraph("<b>ATMs</b>", table_cell_bold), Paragraph("4,249", table_cell), Paragraph("id / atmId", table_cell), Paragraph("Geocoded ATM kiosks, dispensers, CCTV status, nearby vulnerability scores for GIS heatmap.", table_cell)],
        [Paragraph("<b>Alerts</b>", table_cell_bold), Paragraph("201 (127 Active)", table_cell), Paragraph("id", table_cell), Paragraph("Real-time threat alerts with risk levels (CRITICAL, HIGH, MEDIUM), time window & target location.", table_cell)],
        [Paragraph("<b>Tasks</b>", table_cell_bold), Paragraph("1,000", table_cell), Paragraph("id", table_cell), Paragraph("Officer workflow assignments (Freeze Mule Account, Verify KYC, Contact Victim, etc.).", table_cell)],
        [Paragraph("<b>AuditLogs</b>", table_cell_bold), Paragraph("1,000", table_cell), Paragraph("id", table_cell), Paragraph("Tamper-evident legal audit log capturing officer logins, case edits, report exports.", table_cell)],
        [Paragraph("<b>Notifications</b>", table_cell_bold), Paragraph("500", table_cell), Paragraph("id", table_cell), Paragraph("Role-based notifications for Officers, Citizen Portal, and Bank Nodal Officers.", table_cell)],
        [Paragraph("<b>Messages</b>", table_cell_bold), Paragraph("500", table_cell), Paragraph("id", table_cell), Paragraph("Inter-officer & inter-bank secure communication regarding active mule chains.", table_cell)],
        [Paragraph("<b>Reports</b>", table_cell_bold), Paragraph("Persistent (Dynamic)", table_cell), Paragraph("id", table_cell), Paragraph("Generated officer intelligence dossiers, crime summaries, state/district custom reports.", table_cell)],
        [Paragraph("<b>Documents</b>", table_cell_bold), Paragraph("Persistent (Vault)", table_cell), Paragraph("id", table_cell), Paragraph("Secure evidence vault storing citizen transaction slips, audio/video evidence, KYC docs.", table_cell)],
        [Paragraph("<b>Users & PassReset</b>", table_cell_bold), Paragraph("Active Accounts", table_cell), Paragraph("id / userId", table_cell), Paragraph("Bcrypt-hashed authentication credentials, role RBAC (Officer, Bank, Citizen), and OTP reset tokens.", table_cell)],
    ]
    t_inv = Table(table_inventory, colWidths=[90, 80, 110, 224])
    t_inv.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_primary),
        ('ALIGN', (1, 1), (1, -1), 'CENTER'),
        ('BOX', (0, 0), (-1, -1), 1, c_border),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_light]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_inv)
    story.append(Spacer(1, 14))

    # -------------------------------------------------------------
    # SECTION 3: KEY TABLE SCHEMAS (DETAILED FIELD BREAKDOWN)
    # -------------------------------------------------------------
    story.append(Paragraph("3. Detailed Schema Specifications (Core Tables)", h1_style))

    # Table 1: Complaints Schema
    story.append(Paragraph("<b>Table 1: Complaints (Core Dataset)</b>", h2_style))
    complaints_schema = [
        [Paragraph("Field Name", table_header), Paragraph("Data Type", table_header), Paragraph("Constraints", table_header), Paragraph("Example / Description", table_header)],
        [Paragraph("id", table_cell_bold), Paragraph("INTEGER", table_cell), Paragraph("PRIMARY KEY, AUTOINCREMENT", table_cell), Paragraph("1, 2, 3...", table_cell)],
        [Paragraph("complaintId", table_cell_bold), Paragraph("VARCHAR(255)", table_cell), Paragraph("UNIQUE, INDEXED", table_cell), Paragraph("CC-2026-0001, CC-2026-0042, CC001", table_cell)],
        [Paragraph("type", table_cell_bold), Paragraph("VARCHAR(255)", table_cell), Paragraph("NOT NULL", table_cell), Paragraph("UPI Fraud, Phishing & SIM Swap, ATM Skimming", table_cell)],
        [Paragraph("amount", table_cell_bold), Paragraph("VARCHAR(255)", table_cell), Paragraph("NOT NULL", table_cell), Paragraph("₹85,000, ₹2,50,000", table_cell)],
        [Paragraph("location", table_cell_bold), Paragraph("VARCHAR(255)", table_cell), Paragraph("NULLABLE", table_cell), Paragraph("Andheri East, Mumbai, Maharashtra", table_cell)],
        [Paragraph("state", table_cell_bold), Paragraph("VARCHAR(255)", table_cell), Paragraph("INDEXED", table_cell), Paragraph("Maharashtra, Uttar Pradesh, Delhi", table_cell)],
        [Paragraph("district", table_cell_bold), Paragraph("VARCHAR(255)", table_cell), Paragraph("INDEXED", table_cell), Paragraph("Mumbai, Pune, Lucknow, Bengaluru", table_cell)],
        [Paragraph("latitude / longitude", table_cell_bold), Paragraph("FLOAT / REAL", table_cell), Paragraph("NULLABLE", table_cell), Paragraph("19.1136, 72.8697 (GIS Coordinates)", table_cell)],
        [Paragraph("status", table_cell_bold), Paragraph("ENUM / VARCHAR", table_cell), Paragraph("DEFAULT 'Pending'", table_cell), Paragraph("Pending, Analyzed, Under Investigation, Resolved", table_cell)],
        [Paragraph("victimBank", table_cell_bold), Paragraph("VARCHAR(255)", table_cell), Paragraph("NULLABLE", table_cell), Paragraph("State Bank of India, HDFC Bank, ICICI Bank", table_cell)],
        [Paragraph("suspectMule", table_cell_bold), Paragraph("VARCHAR(255)", table_cell), Paragraph("NULLABLE", table_cell), Paragraph("AC-78945612 (Mule Cluster #4)", table_cell)],
        [Paragraph("predictionData", table_cell_bold), Paragraph("JSON / TEXT", table_cell), Paragraph("NULLABLE", table_cell), Paragraph("{ score: 87, riskLevel: 'HIGH', confidence: '94%' }", table_cell)],
        [Paragraph("date / time", table_cell_bold), Paragraph("VARCHAR(255)", table_cell), Paragraph("NULLABLE", table_cell), Paragraph("28 Aug 2026, 18:45", table_cell)],
        [Paragraph("createdAt / updatedAt", table_cell_bold), Paragraph("DATETIME", table_cell), Paragraph("NOT NULL", table_cell), Paragraph("Automatic timestamp tracking", table_cell)]
    ]
    t_c_schema = Table(complaints_schema, colWidths=[95, 75, 125, 209])
    t_c_schema.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_accent),
        ('BOX', (0, 0), (-1, -1), 1, c_border),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_light]),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_c_schema)
    story.append(Spacer(1, 10))

    # Page Break for Viva & Architecture
    story.append(PageBreak())

    # -------------------------------------------------------------
    # SECTION 4: ARCHITECTURE & SINGLE SOURCE OF TRUTH
    # -------------------------------------------------------------
    story.append(Paragraph("4. Architecture & Single Source of Truth Pipeline", h1_style))
    story.append(Paragraph(
        "Is system ka sabse bada technical strength yeh hai ki har ek interface (Officer Dashboard, Citizen Portal, Bank Nodal Desk, GIS Heatmap, ML Prediction) alag-alag dummy arrays use nahi karta, balki <b>ek centralized backend database</b> se sync rehta hai:",
        body_style
    ))

    arch_steps = [
        [
            Paragraph("<b>Layer</b>", table_header),
            Paragraph("<b>Technology</b>", table_header),
            Paragraph("<b>Responsibility & Role</b>", table_header)
        ],
        [
            Paragraph("<b>Frontend UI</b>", table_cell_bold),
            Paragraph("React 18 + Vite + Leaflet GIS", table_cell),
            Paragraph("Server-side pagination (50 items/page), deep-linking URL parameters, real-time map radar rendering.", table_cell)
        ],
        [
            Paragraph("<b>REST API Server</b>", table_cell_bold),
            Paragraph("Node.js + Express (Port 3001)", table_cell),
            Paragraph("Exposes <code>/api/cases</code>, <code>/api/alerts</code>, <code>/api/dashboard/stats</code>, <code>/api/ml/evaluation</code>, JWT auth sessions.", table_cell)
        ],
        [
            Paragraph("<b>ORM Layer</b>", table_cell_bold),
            Paragraph("Sequelize ORM", table_cell),
            Paragraph("Type safety, automated schema migrations, SQL query building, connection pooling.", table_cell)
        ],
        [
            Paragraph("<b>Database Engine</b>", table_cell_bold),
            Paragraph("SQLite 3 (<code>database.sqlite</code>)", table_cell),
            Paragraph("Persistent ACID-compliant relational storage storing 62,700+ records with zero external database daemon overhead.", table_cell)
        ],
        [
            Paragraph("<b>ML Microservice</b>", table_cell_bold),
            Paragraph("Python Flask + Scikit-Learn (Port 5000)", table_cell),
            Paragraph("Gradient Boosting Classifier trained on 55,254 complaints; generates real evaluated 99.98% accuracy on 11,051 test samples.", table_cell)
        ]
    ]
    t_arch = Table(arch_steps, colWidths=[95, 120, 289])
    t_arch.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_primary),
        ('BOX', (0, 0), (-1, -1), 1, c_border),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_light]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_arch)
    story.append(Spacer(1, 14))

    # -------------------------------------------------------------
    # SECTION 5: TOP 10 VIVA QUESTIONS & MODEL ANSWERS
    # -------------------------------------------------------------
    story.append(Paragraph("5. Top 10 Viva / Teacher Presentation Questions & Answers", h1_style))

    viva_qa = [
        (
            "Q1: Which database have you used in this project and why?",
            "Answer: Humne Relational Database Management System (RDBMS) ke roop me SQLite 3 use kiya hai using Sequelize ORM. SQLite ko select karne ka reason yeh hai ki yeh serverless, self-contained, ACID-compliant, aur high performance hai. Isme bina kisi heavy database installation ke poora dataset (62,700+ records) lightweight file ke roop me embedded rehta hai, jo enterprise law enforcement portal ke local deployment ke liye ideal hai."
        ),
        (
            "Q2: How does the system handle 55,000+ complaints without slowing down the React UI?",
            "Answer: Humne Server-Side Pagination aur Search Indexing implement kiya hai. Frontend ek sath poore 55k records ko browser memory me load nahi karta, balki GET /api/cases?page=1&limit=50 ke through chunk-by-chunk 50 records fetch karta hai. Is wajah se frontend lightning-fast render hota hai aur memory utilization minimum rehta hai."
        ),
        (
            "Q3: What is the relationship between Complaint, Prediction, Alert, and Map?",
            "Answer: Complaint ID is the single anchor thread. Jab ek complaint (jaise CC-2026-0001) par Python ML prediction chalta hai, toh uski risk score, level aur geographic coordinates (Latitude, Longitude) calculate hoti hain. Agar risk score ≥ 70% hota hai, toh backend automatically Alerts table me live Alert insert karta hai. Jab officer 'View on Map' click karta hai, toh URL me exact coordinates deep-link ho kar Heatmap us location par zoom hota hai."
        ),
        (
            "Q4: What machine learning model is trained and what is its accuracy?",
            "Answer: Humne Scikit-Learn ka GradientBoostingClassifier train kiya hai on 55,254 complaints using an 80/20 train/test split. 11,051 unseen test samples par evaluate karne par model ne 99.98% Accuracy, 0.9998 Precision, 0.9998 Recall, aur 0.9998 F1-Score deliver kiya hai, jo GET /api/ml/evaluation API par expose hota hai."
        ),
        (
            "Q5: How are user passwords and authentication tokens stored in the database?",
            "Answer: Passwords database me plain text me store nahi hote. Humne bcrypt hashing (salt rounds: 10) use kiya hai. Login ke waqt password hash match hone par backend JWT (JSON Web Token) generate karta hai jo frontend ke session state aur role-based access control (Officer, Bank, Citizen) ko secure karta hai."
        ),
        (
            "Q6: Can SQLite be replaced with PostgreSQL or MySQL in production?",
            "Answer: Yes, absolutely. Kyunki humne Sequelize ORM use kiya hai, hume sirf config connection string change karni hogi (e.g. postgres://user:pass@host/db). Database schema aur saari queries automatically PostgreSQL ya MySQL ke sath compatible hain bina kisi code rewrite ke."
        ),
        (
            "Q7: Where are files and evidence stored?",
            "Answer: Evidence files (PDFs, images, transaction slips) disk storage par /uploads directory me securely store hoti hain, aur unke cryptographic metadata (filename, size, mimetype, uploadedBy, linkedCaseId, timestamp) database ke Documents table me store hote hain."
        ),
        (
            "Q8: How does the Officer Reports module work with the database?",
            "Answer: Jab officer kisi State ya District ka custom report generate karta hai, backend dynamically Complaints database se aggregated metrics (total loss, top crime categories, status distribution) calculate karke Reports table me permanently store karta hai."
        ),
        (
            "Q9: What is the difference between SQLite and NoSQL (MongoDB) for this use case?",
            "Answer: Cybercrime financial records, FIR numbers, bank mule accounts aur legal audit trails me strict relational integrity aur ACID compliance mandatory hoti hai. SQLite structured tabular schema and foreign relations ensure karta hai."
        ),
        (
            "Q10: What are the main tables in your system?",
            "Answer: Humare system me 10 core tables hain: Complaints (55k+ records), ATMs (4k+ records), Alerts, Tasks, AuditLogs, Notifications, Messages, Reports, Documents, aur Users."
        ),
    ]

    for q, a in viva_qa:
        story.append(Paragraph(q, q_style))
        story.append(Paragraph(a, ans_style))

    # Build PDF
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF successfully generated at: {pdf_path}")

if __name__ == "__main__":
    build_pdf()
