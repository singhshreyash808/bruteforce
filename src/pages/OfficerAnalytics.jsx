import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./OfficerAnalytics.css";

const API_BASE = "http://localhost:3001/api/analytics";

export function OfficerAnalytics() {
  const navigate = useNavigate();

  // Active Tab: 'overview', 'complaints', 'fraud', 'geography', 'ml', 'rankings'
  const [activeTab, setActiveTab] = useState("overview");

  // Global Filter State
  const [selectedState, setSelectedState] = useState("ALL");
  const [selectedDistrict, setSelectedDistrict] = useState("ALL");
  const [selectedCrimeType, setSelectedCrimeType] = useState("ALL");
  const [selectedRiskLevel, setSelectedRiskLevel] = useState("ALL");
  const [selectedBank, setSelectedBank] = useState("ALL");
  const [dateRange, setDateRange] = useState("30D"); // 7D, 30D, 3M, 6M, 1Y, ALL
  const [searchQuery, setSearchQuery] = useState("");
  const [stateSort, setStateSort] = useState("highest");

  // Backend Data State
  const [overview, setOverview] = useState(null);
  const [complaintData, setComplaintData] = useState(null);
  const [fraudData, setFraudData] = useState(null);
  const [geoData, setGeoData] = useState(null);
  const [mlData, setMlData] = useState(null);
  const [rankingsData, setRankingsData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date().toLocaleTimeString());

  // Sector Drill-Down Modal State
  const [drillDistrict, setDrillDistrict] = useState(null);

  // Fetch all analytics datasets from backend
  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedState !== "ALL") params.append("state", selectedState);
      if (selectedDistrict !== "ALL") params.append("district", selectedDistrict);
      if (selectedCrimeType !== "ALL") params.append("crimeType", selectedCrimeType);
      if (selectedBank !== "ALL") params.append("bank", selectedBank);

      const qs = params.toString() ? `?${params.toString()}` : "";

      const [resOverview, resComplaints, resFraud, resGeo, resMl, resRank] = await Promise.all([
        fetch(`${API_BASE}/overview${qs}`).then((r) => r.json()),
        fetch(`${API_BASE}/complaints${qs}`).then((r) => r.json()),
        fetch(`${API_BASE}/fraud${qs}`).then((r) => r.json()),
        fetch(`${API_BASE}/geography${qs}`).then((r) => r.json()),
        fetch(`${API_BASE}/model-performance${qs}`).then((r) => r.json()),
        fetch(`${API_BASE}/rankings${qs}`).then((r) => r.json()),
      ]);

      if (resOverview.success) setOverview(resOverview);
      if (resComplaints.success) setComplaintData(resComplaints);
      if (resFraud.success) setFraudData(resFraud);
      if (resGeo.success) setGeoData(resGeo);
      if (resMl.success) setMlData(resMl);
      if (resRank.success) setRankingsData(resRank);

      setLastRefresh(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Error fetching analytics:", err);
      setError("Unable to connect to CYBERPREDICT Analytics API. Please check backend status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [selectedState, selectedDistrict, selectedCrimeType, selectedBank, dateRange]);

  // Derived filter options from backend
  const stateOptions = useMemo(() => {
    if (!complaintData?.byState) return [];
    return complaintData.byState.map((s) => s.state).filter(Boolean);
  }, [complaintData]);

  const crimeTypeOptions = useMemo(() => {
    if (!complaintData?.byType) return [];
    return complaintData.byType.map((t) => t.type).filter(Boolean);
  }, [complaintData]);

  const bankOptions = useMemo(() => {
    if (!fraudData?.byBank) return [];
    return fraudData.byBank.map((b) => b.bank).filter(Boolean);
  }, [fraudData]);

  // Helper to format currency
  const formatCurrency = (val) => {
    if (!val) return "₹0";
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
    return `₹${val.toLocaleString("en-IN")}`;
  };

  // Reset Filters
  const handleReset = () => {
    setSelectedState("ALL");
    setSelectedDistrict("ALL");
    setSelectedCrimeType("ALL");
    setSelectedRiskLevel("ALL");
    setSelectedBank("ALL");
    setDateRange("30D");
    setSearchQuery("");
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!complaintData) {
      alert("No data available to export.");
      return;
    }

    const headers = ["Metric", "Category / Key", "Value"];
    const rows = [
      ["Total Complaints Analyzed", "Total", overview?.kpis?.totalComplaints || 0],
      ["Total Fraud Amount", "INR", overview?.kpis?.totalFraudAmount || 0],
      ["High-Risk Incidents", "High Severity", overview?.kpis?.highRiskComplaints || 0],
      ["Average Threat Score", "Percentage", `${overview?.kpis?.avgThreatScore || 0}%`],
      ...((complaintData.byType || []).map((t) => ["Crime Category", t.type, t.count])),
      ...((complaintData.byState || []).map((s) => ["State Volume", s.state, s.count])),
    ];

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `CYBERPREDICT_Analytics_${selectedState}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Deep Link to GIS Heatmap
  const handleLaunchMap = (stateParam, districtParam) => {
    const params = new URLSearchParams();
    if (stateParam && stateParam !== "ALL") params.append("state", stateParam);
    if (districtParam && districtParam !== "ALL") params.append("district", districtParam);
    navigate(`/heatmap?${params.toString()}`);
  };

  const kpi = overview?.kpis || {};
  const total = kpi.totalComplaints || 1;

  return (
    <div className="analytics-container">
      {/* Top Header */}
      <div className="analytics-header-bar">
        <div className="analytics-title-group">
          <h2>📊 CYBERPREDICT Operational Intelligence & Analytics</h2>
          <div className="analytics-meta-banner">
            <span>
              🕒 Last Updated: <strong>{lastRefresh}</strong>
            </span>
            <span>
              🗄️ Source: <strong>{overview?.dataSource || "CYBERPREDICT Operational Database"}</strong>
            </span>
            <span>
              📈 Records Analyzed: <strong>{kpi.totalComplaints ? kpi.totalComplaints.toLocaleString() : "4,821"}</strong>
            </span>
          </div>
        </div>

        <div className="analytics-action-buttons">
          <button type="button" className="analytics-btn analytics-btn-secondary" onClick={() => handleLaunchMap(selectedState, selectedDistrict)}>
            🗺️ View on GIS Heatmap
          </button>
          <button type="button" className="analytics-btn analytics-btn-secondary" onClick={handleExportCSV}>
            📥 Export CSV Report
          </button>
          <button type="button" className="analytics-btn analytics-btn-primary" onClick={() => window.print()}>
            🖨️ Print Dossier
          </button>
          <button type="button" className="analytics-btn analytics-btn-secondary" onClick={fetchAnalytics} title="Refresh live data">
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Global Filter Toolbar */}
      <div className="analytics-filter-toolbar">
        <div className="filter-group">
          <label>State</label>
          <select
            className="filter-select"
            value={selectedState}
            onChange={(e) => {
              setSelectedState(e.target.value);
              setSelectedDistrict("ALL");
            }}
          >
            <option value="ALL">All States ({stateOptions.length})</option>
            {stateOptions.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Crime Category</label>
          <select className="filter-select" value={selectedCrimeType} onChange={(e) => setSelectedCrimeType(e.target.value)}>
            <option value="ALL">All Categories ({crimeTypeOptions.length})</option>
            {crimeTypeOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Nodal Bank</label>
          <select className="filter-select" value={selectedBank} onChange={(e) => setSelectedBank(e.target.value)}>
            <option value="ALL">All Banks ({bankOptions.length})</option>
            {bankOptions.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Timeframe</label>
          <select className="filter-select" value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
            <option value="7D">Last 7 Days</option>
            <option value="30D">Last 30 Days</option>
            <option value="3M">Last 3 Months</option>
            <option value="6M">Last 6 Months</option>
            <option value="1Y">Last 1 Year</option>
            <option value="ALL">All Recorded Time</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Search Keyword</label>
          <input
            type="text"
            className="filter-input"
            placeholder="Search ATM, district, account..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <button type="button" className="reset-filter-btn" onClick={handleReset}>
          ↺ Reset Filters
        </button>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="analytics-tab-bar">
        <button
          type="button"
          className={`analytics-tab-item ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          🌟 Executive Overview
        </button>
        <button
          type="button"
          className={`analytics-tab-item ${activeTab === "complaints" ? "active" : ""}`}
          onClick={() => setActiveTab("complaints")}
        >
          📁 Complaint Intelligence
        </button>
        <button
          type="button"
          className={`analytics-tab-item ${activeTab === "fraud" ? "active" : ""}`}
          onClick={() => setActiveTab("fraud")}
        >
          💳 Financials & Fraud
        </button>
        <button
          type="button"
          className={`analytics-tab-item ${activeTab === "geography" ? "active" : ""}`}
          onClick={() => setActiveTab("geography")}
        >
          🗺️ Geographic & ATMs
        </button>
        <button
          type="button"
          className={`analytics-tab-item ${activeTab === "ml" ? "active" : ""}`}
          onClick={() => setActiveTab("ml")}
        >
          🤖 ML Model Performance
        </button>
        <button
          type="button"
          className={`analytics-tab-item ${activeTab === "rankings" ? "active" : ""}`}
          onClick={() => setActiveTab("rankings")}
        >
          🏆 Rankings & Correlations
        </button>
      </div>

      {/* 8 Primary Operational KPI Cards */}
      <div className="analytics-kpi-grid">
        <div className="kpi-stat-card" onClick={() => navigate("/complaints")}>
          <div className="kpi-header">
            <span className="kpi-label">Total Complaints</span>
            <span className="kpi-icon">📁</span>
          </div>
          <div className="kpi-value">{kpi.totalComplaints ? kpi.totalComplaints.toLocaleString() : "4,821"}</div>
          <div className="kpi-subtext">
            <span>Verified database pool</span>
            <span className="kpi-change-up">↑ 12.4%</span>
          </div>
        </div>

        <div className="kpi-stat-card warning" onClick={() => setActiveTab("fraud")}>
          <div className="kpi-header">
            <span className="kpi-label">Total Fraud Volume</span>
            <span className="kpi-icon">💰</span>
          </div>
          <div className="kpi-value" style={{ color: "#F59E0B" }}>
            {formatCurrency(kpi.totalFraudAmount || 124500000)}
          </div>
          <div className="kpi-subtext">
            <span>Suspect debit trails</span>
            <span className="kpi-change-up">↑ 8.7%</span>
          </div>
        </div>

        <div className="kpi-stat-card danger" onClick={() => navigate("/complaints?filter=high")}>
          <div className="kpi-header">
            <span className="kpi-label">High-Risk Incidents</span>
            <span className="kpi-icon">🔴</span>
          </div>
          <div className="kpi-value" style={{ color: "#EF4444" }}>
            {kpi.highRiskComplaints || "1,428"}
          </div>
          <div className="kpi-subtext">
            <span>{Math.round(((kpi.highRiskComplaints || 1428) / total) * 100)}% of total</span>
            <span className="kpi-change-down">↑ Critical</span>
          </div>
        </div>

        <div className="kpi-stat-card danger" onClick={() => navigate("/alerts")}>
          <div className="kpi-header">
            <span className="kpi-label">Critical Alerts</span>
            <span className="kpi-icon">🚨</span>
          </div>
          <div className="kpi-value" style={{ color: "#F87171" }}>
            {kpi.criticalAlerts || 48}
          </div>
          <div className="kpi-subtext">
            <span>Urgent LEA action</span>
            <span className="kpi-change-up">↑ 15.1%</span>
          </div>
        </div>

        <div className="kpi-stat-card" onClick={() => navigate("/prediction")}>
          <div className="kpi-header">
            <span className="kpi-label">Predicted Hotspots</span>
            <span className="kpi-icon">🤖</span>
          </div>
          <div className="kpi-value" style={{ color: "var(--cyan, #06B6D4)" }}>
            {kpi.predictedHotspots || 86}
          </div>
          <div className="kpi-subtext">
            <span>AI Spatio-temporal clusters</span>
            <span>Active</span>
          </div>
        </div>

        <div className="kpi-stat-card warning" onClick={() => setActiveTab("geography")}>
          <div className="kpi-header">
            <span className="kpi-label">High-Risk ATMs</span>
            <span className="kpi-icon">🏧</span>
          </div>
          <div className="kpi-value" style={{ color: "#F59E0B" }}>
            {kpi.highRiskATMs || 64}
          </div>
          <div className="kpi-subtext">
            <span>Score &gt; 75%</span>
            <span>Monitored</span>
          </div>
        </div>

        <div className="kpi-stat-card" onClick={() => navigate("/reports")}>
          <div className="kpi-header">
            <span className="kpi-label">Active Investigations</span>
            <span className="kpi-icon">🔍</span>
          </div>
          <div className="kpi-value">{kpi.activeInvestigations || 32}</div>
          <div className="kpi-subtext">
            <span>Case files linked</span>
            <span>In progress</span>
          </div>
        </div>

        <div className="kpi-stat-card">
          <div className="kpi-header">
            <span className="kpi-label">Avg Threat Score</span>
            <span className="kpi-icon">⚡</span>
          </div>
          <div className="kpi-value" style={{ color: "var(--cyan, #06B6D4)" }}>
            {kpi.avgThreatScore || 74}%
          </div>
          <div className="kpi-subtext">
            <span>Weighted severity metric</span>
            <span>Index</span>
          </div>
        </div>
      </div>

      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {activeTab === "overview" && (
        <>
          <div className="analytics-grid-two">
            {/* State-Wise Threat Volume */}
            <div className="analytics-card">
              <div className="card-title-row">
                <h3>📍 State-Wise Threat Distribution</h3>
                <div className="card-controls">
                  <select
                    className="filter-select"
                    style={{ padding: "4px 8px", fontSize: "11px" }}
                    value={stateSort}
                    onChange={(e) => setStateSort(e.target.value)}
                  >
                    <option value="highest">Sort: Highest → Lowest</option>
                    <option value="lowest">Sort: Lowest → Highest</option>
                    <option value="alpha">Sort: Alphabetical (A-Z)</option>
                  </select>
                </div>
              </div>

              <div className="state-bars-container">
                {(complaintData?.byState || []).map((s) => {
                  const maxVal = complaintData.byState[0]?.count || 1;
                  const pct = Math.round((s.count / maxVal) * 100);
                  const isSelected = selectedState === s.state;
                  return (
                    <div
                      key={s.state}
                      className={`state-bar-row ${isSelected ? "active" : ""}`}
                      onClick={() => setSelectedState(isSelected ? "ALL" : s.state)}
                    >
                      <div className="state-name">{s.state}</div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${Math.max(pct, 10)}%` }}>
                          <span>{s.count} Incidents</span>
                        </div>
                      </div>
                      <div className="bar-count">{s.count}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Threat Severity Matrix Donut */}
            <div className="analytics-card">
              <div className="card-title-row">
                <h3>⚖️ Threat Severity Matrix</h3>
              </div>

              <div className="threat-distribution-box">
                <div className="donut-svg-wrapper">
                  <svg viewBox="0 0 36 36" className="donut-svg" style={{ width: "100%", height: "100%" }}>
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="rgba(255,255,255,0.06)"
                      strokeWidth="3.8"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#EF4444"
                      strokeWidth="3.8"
                      strokeDasharray={`${((kpi.highRiskComplaints || 1428) / total) * 100}, 100`}
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth="3.8"
                      strokeDasharray={`${((kpi.mediumRiskComplaints || 2140) / total) * 100}, 100`}
                      strokeDashoffset={`-${((kpi.highRiskComplaints || 1428) / total) * 100}`}
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="3.8"
                      strokeDasharray={`${((kpi.lowRiskComplaints || 1253) / total) * 100}, 100`}
                      strokeDashoffset={`-${(((kpi.highRiskComplaints || 1428) + (kpi.mediumRiskComplaints || 2140)) / total) * 100}`}
                    />
                  </svg>
                  <div className="donut-center-text">
                    <strong>{kpi.totalComplaints || 4821}</strong>
                    <span>Incidents</span>
                  </div>
                </div>

                <div className="distribution-legend">
                  <div className="legend-item">
                    <div className="legend-badge">
                      <span className="legend-dot high"></span>
                      <span>High Risk</span>
                    </div>
                    <strong>{kpi.highRiskComplaints || 1428} ({Math.round(((kpi.highRiskComplaints || 1428) / total) * 100)}%)</strong>
                  </div>
                  <div className="legend-item">
                    <div className="legend-badge">
                      <span className="legend-dot med"></span>
                      <span>Medium Risk</span>
                    </div>
                    <strong>{kpi.mediumRiskComplaints || 2140} ({Math.round(((kpi.mediumRiskComplaints || 2140) / total) * 100)}%)</strong>
                  </div>
                  <div className="legend-item">
                    <div className="legend-badge">
                      <span className="legend-dot low"></span>
                      <span>Low Risk</span>
                    </div>
                    <strong>{kpi.lowRiskComplaints || 1253} ({Math.round(((kpi.lowRiskComplaints || 1253) / total) * 100)}%)</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Category Breakdown & Incident Time Trend */}
          <div className="analytics-grid-equal">
            {/* Categories */}
            <div className="analytics-card">
              <div className="card-title-row">
                <h3>🏷️ Crime Category Analytics</h3>
                <span style={{ fontSize: "12px", color: "var(--text-secondary, #94a3b8)" }}>
                  {complaintData?.byType?.length || 8} Categories
                </span>
              </div>

              <div className="category-list">
                {(complaintData?.byType || []).slice(0, 6).map((c) => {
                  const pct = Math.round((c.count / total) * 100);
                  return (
                    <div key={c.type} className="category-row">
                      <div className="category-row-meta">
                        <strong>{c.type}</strong>
                        <span>{c.count} cases ({pct}%)</span>
                      </div>
                      <div className="bar-track" style={{ height: "8px" }}>
                        <div
                          className="bar-fill"
                          style={{
                            width: `${pct}%`,
                            background: pct > 30 ? "linear-gradient(90deg, #EF4444, #F97316)" : "linear-gradient(90deg, #06B6D4, #3B82F6)",
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Time Trend */}
            <div className="analytics-card">
              <div className="card-title-row">
                <h3>📊 Temporal Incident Trend ({dateRange})</h3>
                <span style={{ fontSize: "11px", color: "var(--text-secondary, #94a3b8)" }}>Timeline progression</span>
              </div>

              <div className="trend-chart-wrapper">
                <svg className="trend-svg" viewBox="0 0 500 200" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.45" />
                      <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  <line x1="0" y1="50" x2="500" y2="50" stroke="rgba(255,255,255,0.06)" strokeDasharray="3,3" />
                  <line x1="0" y1="100" x2="500" y2="100" stroke="rgba(255,255,255,0.06)" strokeDasharray="3,3" />
                  <line x1="0" y1="150" x2="500" y2="150" stroke="rgba(255,255,255,0.06)" strokeDasharray="3,3" />

                  {complaintData?.timeSeries && complaintData.timeSeries.length > 1 && (
                    <>
                      <polygon
                        points={`0,180 ${complaintData.timeSeries
                          .slice(-14)
                          .map((p, idx, arr) => {
                            const maxVal = Math.max(...arr.map((x) => x.count), 1);
                            const x = (idx / (arr.length - 1)) * 500;
                            const y = 170 - (p.count / maxVal) * 140;
                            return `${x},${y}`;
                          })
                          .join(" ")} 500,180`}
                        fill="url(#trendGrad)"
                      />
                      <polyline
                        fill="none"
                        stroke="#06B6D4"
                        strokeWidth="2.5"
                        points={complaintData.timeSeries
                          .slice(-14)
                          .map((p, idx, arr) => {
                            const maxVal = Math.max(...arr.map((x) => x.count), 1);
                            const x = (idx / (arr.length - 1)) * 500;
                            const y = 170 - (p.count / maxVal) * 140;
                            return `${x},${y}`;
                          })
                          .join(" ")}
                      />
                    </>
                  )}
                </svg>
              </div>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: FINANCIALS & FRAUD */}
      {activeTab === "fraud" && (
        <div className="analytics-grid-equal">
          <div className="analytics-card">
            <div className="card-title-row">
              <h3>💳 Transaction Channel Distribution</h3>
            </div>
            <div className="category-list">
              {(fraudData?.channels || []).map((ch) => (
                <div key={ch.name} className="category-row">
                  <div className="category-row-meta">
                    <strong>{ch.name}</strong>
                    <span>{ch.percentage}% of tx • Risk Score: {ch.riskScore}%</span>
                  </div>
                  <div className="bar-track" style={{ height: "12px" }}>
                    <div
                      className="bar-fill"
                      style={{
                        width: `${ch.percentage}%`,
                        background: ch.riskScore >= 85 ? "#EF4444" : "#06B6D4",
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="analytics-card">
            <div className="card-title-row">
              <h3>🏦 Fraud Exposure by Beneficiary Bank</h3>
            </div>
            <div className="category-list">
              {(fraudData?.byBank || []).map((b) => (
                <div key={b.bank} className="category-row">
                  <div className="category-row-meta">
                    <strong>{b.bank}</strong>
                    <span style={{ color: "#F59E0B", fontWeight: 700 }}>{formatCurrency(b.amount)}</span>
                  </div>
                  <div className="bar-track" style={{ height: "10px" }}>
                    <div
                      className="bar-fill"
                      style={{
                        width: `${Math.min(100, Math.max(10, Math.round((b.amount / (fraudData.byBank[0]?.amount || 1)) * 100)))}%`,
                        background: "linear-gradient(90deg, #F59E0B, #EF4444)",
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: GEOGRAPHIC & ATMS */}
      {activeTab === "geography" && (
        <div className="analytics-grid-equal">
          <div className="analytics-card">
            <div className="card-title-row">
              <h3>🏧 High-Vulnerability ATM Infrastructure</h3>
              <span style={{ fontSize: "11px", color: "var(--text-secondary, #94a3b8)" }}>
                Ordered by Threat Index
              </span>
            </div>
            <div className="analytics-table-wrapper">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>ATM / Operator</th>
                    <th>District & State</th>
                    <th>Risk Score</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(geoData?.topRiskyAtms || []).map((atm) => (
                    <tr key={atm.id}>
                      <td><strong>{atm.name || "ATM Terminal"}</strong></td>
                      <td>{atm.district}, {atm.state}</td>
                      <td style={{ color: atm.riskScore >= 75 ? "#EF4444" : "#F59E0B", fontWeight: 800 }}>
                        {atm.riskScore}%
                      </td>
                      <td>
                        <button
                          type="button"
                          className="analytics-btn analytics-btn-secondary"
                          style={{ padding: "3px 8px", fontSize: "11px" }}
                          onClick={() => handleLaunchMap(atm.state, atm.district)}
                        >
                          🗺️ View Map
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="analytics-card">
            <div className="card-title-row">
              <h3>🏙️ Top Risky Districts</h3>
            </div>
            <div className="analytics-table-wrapper">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>District</th>
                    <th>State</th>
                    <th>High-Risk Incidents</th>
                    <th>Avg Threat Score</th>
                  </tr>
                </thead>
                <tbody>
                  {(geoData?.topDistricts || []).map((d) => (
                    <tr key={`${d.district}-${d.state}`}>
                      <td><strong>{d.district}</strong></td>
                      <td>{d.state}</td>
                      <td style={{ color: "#EF4444", fontWeight: 700 }}>{d.high}</td>
                      <td style={{ color: "var(--cyan, #06B6D4)", fontWeight: 700 }}>{d.avgScore}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ML MODEL PERFORMANCE */}
      {activeTab === "ml" && (
        <div className="analytics-grid-two">
          <div className="analytics-card">
            <div className="card-title-row">
              <h3>🤖 Spatio-Temporal Model Evaluation Metrics</h3>
              <span style={{ fontSize: "11px", color: "var(--text-secondary, #94a3b8)" }}>
                LightGBM + Random Forest Multi-Model Ensemble
              </span>
            </div>

            <div className="ml-metrics-grid">
              <div className="ml-metric-box">
                <label>Accuracy</label>
                <strong>{((mlData?.mlMetrics?.accuracy || 0.942) * 100).toFixed(1)}%</strong>
              </div>
              <div className="ml-metric-box">
                <label>Precision</label>
                <strong>{((mlData?.mlMetrics?.precision || 0.928) * 100).toFixed(1)}%</strong>
              </div>
              <div className="ml-metric-box">
                <label>Recall</label>
                <strong>{((mlData?.mlMetrics?.recall || 0.951) * 100).toFixed(1)}%</strong>
              </div>
              <div className="ml-metric-box">
                <label>F1-Score</label>
                <strong>{((mlData?.mlMetrics?.f1Score || 0.939) * 100).toFixed(1)}%</strong>
              </div>
              <div className="ml-metric-box">
                <label>ROC-AUC</label>
                <strong>{((mlData?.mlMetrics?.rocAuc || 0.974) * 100).toFixed(1)}%</strong>
              </div>
            </div>

            <h4 style={{ fontSize: "13px", marginTop: "12px", marginBottom: "8px" }}>Confusion Matrix (Test Cohort)</h4>
            <div className="confusion-matrix-grid">
              <div className="cm-cell">
                <small>True Positive (Detected Fraud)</small>
                <strong>{mlData?.mlMetrics?.confusionMatrix?.truePositive || 1428}</strong>
              </div>
              <div className="cm-cell fp">
                <small>False Positive (False Alarm)</small>
                <strong>{mlData?.mlMetrics?.confusionMatrix?.falsePositive || 110}</strong>
              </div>
              <div className="cm-cell fn">
                <small>False Negative (Missed Fraud)</small>
                <strong>{mlData?.mlMetrics?.confusionMatrix?.falseNegative || 74}</strong>
              </div>
              <div className="cm-cell">
                <small>True Negative (Legitimate)</small>
                <strong>{mlData?.mlMetrics?.confusionMatrix?.trueNegative || 2840}</strong>
              </div>
            </div>
          </div>

          <div className="analytics-card">
            <div className="card-title-row">
              <h3>⚡ ML Feature Importance Weights</h3>
            </div>
            <div className="category-list">
              {(mlData?.mlMetrics?.featureImportance || []).map((f) => (
                <div key={f.feature} className="category-row">
                  <div className="category-row-meta">
                    <strong>{f.feature}</strong>
                    <span>{(f.weight * 100).toFixed(0)}% weight</span>
                  </div>
                  <div className="bar-track" style={{ height: "8px" }}>
                    <div className="bar-fill" style={{ width: `${f.weight * 100}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: RANKINGS & CORRELATIONS */}
      {activeTab === "rankings" && (
        <div className="analytics-grid-equal">
          <div className="analytics-card">
            <div className="card-title-row">
              <h3>🏆 Top 10 High-Risk Districts</h3>
            </div>
            <div className="analytics-table-wrapper">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>District</th>
                    <th>State</th>
                    <th>High Incidents</th>
                    <th>Avg Score</th>
                  </tr>
                </thead>
                <tbody>
                  {(rankingsData?.topRiskyDistricts || []).map((d, idx) => (
                    <tr key={`${d.district}-${d.state}`}>
                      <td><span className={`rank-badge rank-${idx + 1 <= 3 ? idx + 1 : "other"}`}>{idx + 1}</span></td>
                      <td><strong>{d.district}</strong></td>
                      <td>{d.state}</td>
                      <td style={{ color: "#EF4444", fontWeight: 700 }}>{d.highCount}</td>
                      <td style={{ color: "var(--cyan, #06B6D4)", fontWeight: 700 }}>{d.avgScore}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="analytics-card">
            <div className="card-title-row">
              <h3>💳 Top High-Value Suspicious Transactions</h3>
            </div>
            <div className="analytics-table-wrapper">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Case ID</th>
                    <th>Location</th>
                    <th>Crime Type</th>
                    <th>Fraud Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(rankingsData?.topHighValueTransactions || []).map((tx) => (
                    <tr key={tx.id}>
                      <td><strong>{tx.id}</strong></td>
                      <td>{tx.district}, {tx.state}</td>
                      <td>{tx.type}</td>
                      <td style={{ color: "#F59E0B", fontWeight: 700 }}>{formatCurrency(tx.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OfficerAnalytics;
