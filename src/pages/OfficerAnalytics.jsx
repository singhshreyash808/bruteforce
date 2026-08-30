import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase";
import "./OfficerAnalytics.css";

export function OfficerAnalytics() {
  const navigate = useNavigate();
  const location = useLocation();

  // Raw Database Records State
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataSource, setDataSource] = useState("Connecting...");

  // Global Filters State
  const [selectedState, setSelectedState] = useState("ALL");
  const [selectedDistrict, setSelectedDistrict] = useState("ALL");
  const [selectedLevel, setSelectedLevel] = useState("ALL");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [dateRange, setDateRange] = useState("30D"); // 7D, 30D, 3M, 6M, 1Y, ALL
  const [searchQuery, setSearchQuery] = useState("");
  const [stateSort, setStateSort] = useState("highest"); // highest, lowest, alpha

  // Drill-down Modal State
  const [drillDistrict, setDrillDistrict] = useState(null);

  // Multi-State Comparison State
  const [compareStates, setCompareStates] = useState(["Maharashtra", "Uttar Pradesh"]);

  // 1. Fetch live records from Firebase Firestore + Backend Synchronization
  useEffect(() => {
    let unsubscribeFirestore = () => {};

    const loadData = async () => {
      setLoading(true);
      let firestoreLoaded = false;

      try {
        // Attempt Realtime Firestore Listener on 'predictions' & 'complaints'
        const predQuery = query(collection(db, "predictions"), orderBy("createdAt", "desc"), limit(200));
        unsubscribeFirestore = onSnapshot(predQuery, (snapshot) => {
          if (!snapshot.empty) {
            const fsData = snapshot.docs.map((doc) => {
              const d = doc.data();
              return {
                id: doc.id,
                state: d.state || "Maharashtra",
                district: d.district || d.city || "Mumbai",
                location: d.location || d.district || "Mumbai Sector",
                threatLevel: d.threatLevel || d.riskLevel || (d.threatScore > 75 ? "High" : d.threatScore > 45 ? "Medium" : "Low"),
                threatScore: Number(d.threatScore || d.score || 70),
                category: d.category || d.crimeCategory || d.type || "ATM Fraud & Skimming",
                status: d.status || "Active",
                timestamp: d.timestamp?.toDate ? d.timestamp.toDate() : d.createdAt ? new Date(d.createdAt) : new Date(),
                latitude: d.latitude || 19.076,
                longitude: d.longitude || 72.8777,
              };
            });
            setRecords(fsData);
            setDataSource("Firebase Firestore (Realtime Live Sync)");
            firestoreLoaded = true;
            setLoading(false);
          }
        }, (err) => {
          console.warn("Firestore listener warning (falling back to backend API):", err.message);
        });
      } catch (e) {
        console.warn("Firestore connect error:", e);
      }

      // Concurrently fetch local backend database records to ensure full dataset
      try {
        const [casesRes, hotspotsRes] = await Promise.allSettled([
          fetch("http://localhost:3001/api/cases"),
          fetch("http://localhost:3001/api/hotspots/predict"),
        ]);

        let apiRecords = [];

        if (casesRes.status === "fulfilled" && casesRes.value.ok) {
          const casesData = await casesRes.value.json();
          const casesList = Array.isArray(casesData) ? casesData : casesData.cases || [];
          casesList.forEach((c) => {
            apiRecords.push({
              id: c.complaintId || `CASE-${c.id}`,
              state: c.state || "Maharashtra",
              district: c.district || c.city || "Mumbai",
              location: c.location || c.district || "Mumbai",
              threatLevel: c.riskLevel || (c.threatScore > 75 ? "High" : c.threatScore > 45 ? "Medium" : "Low"),
              threatScore: Number(c.threatScore || (c.riskLevel === "High" ? 85 : c.riskLevel === "Medium" ? 60 : 35)),
              category: c.crimeCategory || c.type || "Cyber Financial Fraud",
              status: c.status || "Active",
              timestamp: c.createdAt ? new Date(c.createdAt) : new Date(),
              latitude: Number(c.latitude || 19.076),
              longitude: Number(c.longitude || 72.8777),
            });
          });
        }

        if (hotspotsRes.status === "fulfilled" && hotspotsRes.value.ok) {
          const hsData = await hotspotsRes.value.json();
          const hsList = Array.isArray(hsData) ? hsData : hsData.hotspots || [];
          hsList.forEach((h, idx) => {
            apiRecords.push({
              id: h.id || `HS-${idx + 1}`,
              state: h.state || "Maharashtra",
              district: h.district || h.city || "Mumbai",
              location: h.location || h.name || "ATM Corridor",
              threatLevel: h.threatLevel || (h.threatScore > 75 ? "High" : h.threatScore > 45 ? "Medium" : "Low"),
              threatScore: Number(h.threatScore || 78),
              category: h.category || "ATM Cash-Out Corridor",
              status: "Active",
              timestamp: h.timestamp ? new Date(h.timestamp) : new Date(),
              latitude: Number(h.latitude || 19.076),
              longitude: Number(h.longitude || 72.8777),
            });
          });
        }

        if (!firestoreLoaded && apiRecords.length > 0) {
          setRecords(apiRecords);
          setDataSource("Node.js / SQLite Database Active");
          setLoading(false);
        } else if (firestoreLoaded && apiRecords.length > 0) {
          // Merge unique records
          setRecords((prev) => {
            const map = new Map();
            prev.forEach((r) => map.set(r.id, r));
            apiRecords.forEach((r) => {
              if (!map.has(r.id)) map.set(r.id, r);
            });
            return Array.from(map.values());
          });
          setDataSource("Unified Live Database (Firestore + Spatial API)");
        }
      } catch (apiErr) {
        console.error("Backend fetch error:", apiErr);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    return () => unsubscribeFirestore();
  }, []);

  // 2. Extract dynamic Filter Lists from real records
  const allStates = useMemo(() => {
    const set = new Set(records.map((r) => r.state).filter(Boolean));
    return Array.from(set).sort();
  }, [records]);

  const availableDistricts = useMemo(() => {
    const filtered = selectedState === "ALL" ? records : records.filter((r) => r.state === selectedState);
    const set = new Set(filtered.map((r) => r.district).filter(Boolean));
    return Array.from(set).sort();
  }, [records, selectedState]);

  const allCategories = useMemo(() => {
    const set = new Set(records.map((r) => r.category).filter(Boolean));
    return Array.from(set).sort();
  }, [records]);

  // 3. Apply Global Filters
  const filteredRecords = useMemo(() => {
    const now = new Date();
    let minDate = new Date(0);

    if (dateRange === "7D") minDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    else if (dateRange === "30D") minDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    else if (dateRange === "3M") minDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    else if (dateRange === "6M") minDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    else if (dateRange === "1Y") minDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    return records.filter((r) => {
      if (selectedState !== "ALL" && r.state !== selectedState) return false;
      if (selectedDistrict !== "ALL" && r.district !== selectedDistrict) return false;
      if (selectedLevel !== "ALL" && r.threatLevel !== selectedLevel) return false;
      if (selectedCategory !== "ALL" && r.category !== selectedCategory) return false;
      if (selectedStatus !== "ALL" && r.status !== selectedStatus) return false;
      if (r.timestamp && r.timestamp < minDate) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          r.state?.toLowerCase().includes(q) ||
          r.district?.toLowerCase().includes(q) ||
          r.location?.toLowerCase().includes(q) ||
          r.category?.toLowerCase().includes(q) ||
          r.id?.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [records, selectedState, selectedDistrict, selectedLevel, selectedCategory, selectedStatus, dateRange, searchQuery]);

  // 4. Dynamic KPI Calculations
  const totalPredictions = filteredRecords.length;
  const highRiskCount = filteredRecords.filter((r) => r.threatLevel === "High").length;
  const mediumRiskCount = filteredRecords.filter((r) => r.threatLevel === "Medium").length;
  const lowRiskCount = filteredRecords.filter((r) => r.threatLevel === "Low").length;
  const statesCovered = new Set(filteredRecords.map((r) => r.state).filter(Boolean)).size;
  const districtsCovered = new Set(filteredRecords.map((r) => r.district).filter(Boolean)).size;
  const activeAlerts = filteredRecords.filter((r) => r.threatLevel === "High" || r.status === "Active").length;
  const avgThreatScore = totalPredictions
    ? Math.round(filteredRecords.reduce((acc, r) => acc + (r.threatScore || 0), 0) / totalPredictions)
    : 0;

  // 5. State-Wise Analysis Breakdown
  const stateBreakdown = useMemo(() => {
    const map = {};
    filteredRecords.forEach((r) => {
      const s = r.state || "Unknown";
      if (!map[s]) map[s] = { state: s, count: 0, high: 0, medium: 0, low: 0, totalScore: 0 };
      map[s].count += 1;
      if (r.threatLevel === "High") map[s].high += 1;
      else if (r.threatLevel === "Medium") map[s].medium += 1;
      else map[s].low += 1;
      map[s].totalScore += r.threatScore || 0;
    });

    const list = Object.values(map).map((item) => ({
      ...item,
      avgScore: Math.round(item.totalScore / item.count),
    }));

    if (stateSort === "highest") list.sort((a, b) => b.count - a.count);
    else if (stateSort === "lowest") list.sort((a, b) => a.count - b.count);
    else if (stateSort === "alpha") list.sort((a, b) => a.state.localeCompare(b.state));

    return list;
  }, [filteredRecords, stateSort]);

  const maxStateCount = stateBreakdown.length ? Math.max(...stateBreakdown.map((s) => s.count)) : 1;

  // 6. Threat Category Breakdown
  const categoryBreakdown = useMemo(() => {
    const map = {};
    filteredRecords.forEach((r) => {
      const c = r.category || "Unclassified";
      if (!map[c]) map[c] = { category: c, count: 0, totalScore: 0 };
      map[c].count += 1;
      map[c].totalScore += r.threatScore || 0;
    });

    return Object.values(map)
      .map((item) => ({
        ...item,
        percentage: totalPredictions ? Math.round((item.count / totalPredictions) * 100) : 0,
        avgScore: Math.round(item.totalScore / item.count),
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredRecords, totalPredictions]);

  // 7. Time Trend Data Points
  const trendPoints = useMemo(() => {
    const days = 14;
    const points = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const label = `${d.getDate()}/${d.getMonth() + 1}`;
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);

      const count = filteredRecords.filter((r) => r.timestamp >= dayStart && r.timestamp <= dayEnd).length;
      points.push({ label, count });
    }
    return points;
  }, [filteredRecords]);

  const maxTrend = Math.max(...trendPoints.map((p) => p.count), 1);

  // 8. District High-Risk Ranking
  const districtRankings = useMemo(() => {
    const map = {};
    filteredRecords.forEach((r) => {
      const key = `${r.district}, ${r.state}`;
      if (!map[key]) map[key] = { district: r.district, state: r.state, count: 0, high: 0, totalScore: 0 };
      map[key].count += 1;
      if (r.threatLevel === "High") map[key].high += 1;
      map[key].totalScore += r.threatScore || 0;
    });

    return Object.values(map)
      .map((d) => ({
        ...d,
        avgScore: Math.round(d.totalScore / d.count),
      }))
      .sort((a, b) => b.high - a.high || b.avgScore - a.avgScore)
      .slice(0, 8);
  }, [filteredRecords]);

  // 9. State Risk Index Ranking (Formula: HighRisk*0.5 + AvgScore*0.3 + Active*0.2)
  const stateRankings = useMemo(() => {
    const map = {};
    filteredRecords.forEach((r) => {
      const s = r.state;
      if (!map[s]) map[s] = { state: s, count: 0, high: 0, active: 0, totalScore: 0 };
      map[s].count += 1;
      if (r.threatLevel === "High") map[s].high += 1;
      if (r.status === "Active") map[s].active += 1;
      map[s].totalScore += r.threatScore || 0;
    });

    return Object.values(map)
      .map((s) => {
        const avgScore = s.count ? s.totalScore / s.count : 0;
        const weightedScore = Math.round(s.high * 0.5 + avgScore * 0.3 + s.active * 0.2);
        return {
          ...s,
          avgScore: Math.round(avgScore),
          riskScore: weightedScore,
        };
      })
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 6);
  }, [filteredRecords]);

  // Deep link to GIS Heatmap with active filters
  const handleViewOnMap = () => {
    const params = new URLSearchParams();
    if (selectedState !== "ALL") params.append("state", selectedState);
    if (selectedDistrict !== "ALL") params.append("district", selectedDistrict);
    if (selectedLevel !== "ALL") params.append("riskLevel", selectedLevel);
    navigate(`/heatmap?${params.toString()}`);
  };

  // Export Analytics to CSV
  const handleExportCSV = () => {
    if (!filteredRecords.length) {
      alert("No data available to export.");
      return;
    }

    const headers = ["Record ID", "State", "District", "Location", "Threat Level", "Threat Score", "Category", "Status", "Date"];
    const rows = filteredRecords.map((r) => [
      `"${r.id}"`,
      `"${r.state}"`,
      `"${r.district}"`,
      `"${r.location}"`,
      `"${r.threatLevel}"`,
      r.threatScore,
      `"${r.category}"`,
      `"${r.status}"`,
      `"${r.timestamp ? new Date(r.timestamp).toLocaleString() : ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `CybEx_Analytics_Report_${selectedState}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSelectedState("ALL");
    setSelectedDistrict("ALL");
    setSelectedLevel("ALL");
    setSelectedCategory("ALL");
    setSelectedStatus("ALL");
    setDateRange("30D");
    setSearchQuery("");
  };

  return (
    <div className="analytics-container">
      {/* Top Header Bar */}
      <div className="analytics-header-bar">
        <div className="analytics-title-group">
          <h2>📈 Predictive Intelligence & Threat Analytics</h2>
          <p>
            Dynamic multidimensional spatial analytics engine connected live to {dataSource}
          </p>
        </div>

        <div className="analytics-action-buttons">
          <button type="button" className="analytics-btn analytics-btn-secondary" onClick={handleViewOnMap}>
            🗺️ View on GIS Heatmap
          </button>
          <button type="button" className="analytics-btn analytics-btn-secondary" onClick={handleExportCSV}>
            📥 Export CSV Report
          </button>
          <button type="button" className="analytics-btn analytics-btn-primary" onClick={() => window.print()}>
            🖨️ Print Analytics
          </button>
        </div>
      </div>

      {/* Global Filter Toolbar */}
      <div className="analytics-filter-toolbar">
        <div className="filter-group">
          <label>State Filter</label>
          <select
            className="filter-select"
            value={selectedState}
            onChange={(e) => {
              setSelectedState(e.target.value);
              setSelectedDistrict("ALL");
            }}
          >
            <option value="ALL">All States ({allStates.length})</option>
            {allStates.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>District Filter</label>
          <select
            className="filter-select"
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
          >
            <option value="ALL">All Districts ({availableDistricts.length})</option>
            {availableDistricts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Threat Severity</label>
          <select className="filter-select" value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)}>
            <option value="ALL">All Threat Levels</option>
            <option value="High">🔴 High Risk Only</option>
            <option value="Medium">🟠 Medium Risk Only</option>
            <option value="Low">🟢 Low Risk Only</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Threat Category</label>
          <select
            className="filter-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="ALL">All Categories ({allCategories.length})</option>
            {allCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
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
            <option value="ALL">All Available Time</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Search Keywords</label>
          <input
            type="text"
            className="filter-input"
            placeholder="Search state, district, ATM..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <button type="button" className="reset-filter-btn" onClick={handleResetFilters} title="Reset all filters">
          ↺ Reset Filters
        </button>
      </div>

      {/* 8 Key Metric KPI Cards */}
      <div className="analytics-kpi-grid">
        <div className="kpi-stat-card">
          <div className="kpi-header">
            <span className="kpi-label">Total Predictions</span>
            <span className="kpi-icon">🤖</span>
          </div>
          <div className="kpi-value">{totalPredictions}</div>
          <span className="kpi-subtext">Active database records</span>
        </div>

        <div className="kpi-stat-card danger">
          <div className="kpi-header">
            <span className="kpi-label">High Risk</span>
            <span className="kpi-icon">🔴</span>
          </div>
          <div className="kpi-value" style={{ color: "#EF4444" }}>
            {highRiskCount}
          </div>
          <span className="kpi-subtext">
            {totalPredictions ? Math.round((highRiskCount / totalPredictions) * 100) : 0}% of filtered total
          </span>
        </div>

        <div className="kpi-stat-card warning">
          <div className="kpi-header">
            <span className="kpi-label">Medium Risk</span>
            <span className="kpi-icon">🟠</span>
          </div>
          <div className="kpi-value" style={{ color: "#F59E0B" }}>
            {mediumRiskCount}
          </div>
          <span className="kpi-subtext">
            {totalPredictions ? Math.round((mediumRiskCount / totalPredictions) * 100) : 0}% of filtered total
          </span>
        </div>

        <div className="kpi-stat-card success">
          <div className="kpi-header">
            <span className="kpi-label">Low Risk</span>
            <span className="kpi-icon">🟢</span>
          </div>
          <div className="kpi-value" style={{ color: "#10B981" }}>
            {lowRiskCount}
          </div>
          <span className="kpi-subtext">
            {totalPredictions ? Math.round((lowRiskCount / totalPredictions) * 100) : 0}% of filtered total
          </span>
        </div>

        <div className="kpi-stat-card">
          <div className="kpi-header">
            <span className="kpi-label">States Covered</span>
            <span className="kpi-icon">🗺️</span>
          </div>
          <div className="kpi-value">{statesCovered}</div>
          <span className="kpi-subtext">Unique Indian states</span>
        </div>

        <div className="kpi-stat-card">
          <div className="kpi-header">
            <span className="kpi-label">Districts Covered</span>
            <span className="kpi-icon">🏙️</span>
          </div>
          <div className="kpi-value">{districtsCovered}</div>
          <span className="kpi-subtext">Vulnerable sectors</span>
        </div>

        <div className="kpi-stat-card danger">
          <div className="kpi-header">
            <span className="kpi-label">Active Alerts</span>
            <span className="kpi-icon">🚨</span>
          </div>
          <div className="kpi-value" style={{ color: "#F87171" }}>
            {activeAlerts}
          </div>
          <span className="kpi-subtext">Urgent response pool</span>
        </div>

        <div className="kpi-stat-card">
          <div className="kpi-header">
            <span className="kpi-label">Avg Threat Score</span>
            <span className="kpi-icon">⚡</span>
          </div>
          <div className="kpi-value" style={{ color: "var(--cyan, #06B6D4)" }}>
            {avgThreatScore}%
          </div>
          <span className="kpi-subtext">Spatio-temporal risk index</span>
        </div>
      </div>

      {/* Main Charts & Analytics Sections */}
      {filteredRecords.length === 0 ? (
        <div className="analytics-card analytics-empty-state">
          <div className="analytics-empty-icon">🔍</div>
          <h3>No Analytics Data Available</h3>
          <p>No database records match the currently selected filter combinations.</p>
          <button
            type="button"
            className="analytics-btn analytics-btn-primary"
            onClick={handleResetFilters}
            style={{ marginTop: "14px" }}
          >
            ↺ Reset All Filters
          </button>
        </div>
      ) : (
        <>
          {/* Row 1: State Breakdown (Horizontal Bars) & Threat Level Donut */}
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
                {stateBreakdown.map((s) => {
                  const pct = Math.round((s.count / maxStateCount) * 100);
                  const isSelected = selectedState === s.state;
                  return (
                    <div
                      key={s.state}
                      className={`state-bar-row ${isSelected ? "active" : ""}`}
                      onClick={() => setSelectedState(isSelected ? "ALL" : s.state)}
                      title={`Click to filter by ${s.state} (${s.count} cases, Avg Score: ${s.avgScore}%)`}
                    >
                      <div className="state-name">{s.state}</div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${Math.max(pct, 8)}%` }}>
                          {s.high > 0 && <span style={{ opacity: 0.9 }}>🚨 {s.high} High</span>}
                        </div>
                      </div>
                      <div className="bar-count">{s.count}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Threat Severity Donut Chart */}
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
                    {/* High Risk Segment */}
                    {highRiskCount > 0 && (
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#EF4444"
                        strokeWidth="3.8"
                        strokeDasharray={`${(highRiskCount / totalPredictions) * 100}, 100`}
                      />
                    )}
                    {/* Medium Risk Segment */}
                    {mediumRiskCount > 0 && (
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#F59E0B"
                        strokeWidth="3.8"
                        strokeDasharray={`${(mediumRiskCount / totalPredictions) * 100}, 100`}
                        strokeDashoffset={`-${(highRiskCount / totalPredictions) * 100}`}
                      />
                    )}
                    {/* Low Risk Segment */}
                    {lowRiskCount > 0 && (
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#10B981"
                        strokeWidth="3.8"
                        strokeDasharray={`${(lowRiskCount / totalPredictions) * 100}, 100`}
                        strokeDashoffset={`-${((highRiskCount + mediumRiskCount) / totalPredictions) * 100}`}
                      />
                    )}
                  </svg>
                  <div className="donut-center-text">
                    <strong>{totalPredictions}</strong>
                    <span>Total</span>
                  </div>
                </div>

                <div className="distribution-legend">
                  <div className="legend-item">
                    <div className="legend-badge">
                      <span className="legend-dot high"></span>
                      <span>High Risk</span>
                    </div>
                    <strong>
                      {highRiskCount} ({totalPredictions ? Math.round((highRiskCount / totalPredictions) * 100) : 0}%)
                    </strong>
                  </div>

                  <div className="legend-item">
                    <div className="legend-badge">
                      <span className="legend-dot med"></span>
                      <span>Medium Risk</span>
                    </div>
                    <strong>
                      {mediumRiskCount} ({totalPredictions ? Math.round((mediumRiskCount / totalPredictions) * 100) : 0}%)
                    </strong>
                  </div>

                  <div className="legend-item">
                    <div className="legend-badge">
                      <span className="legend-dot low"></span>
                      <span>Low Risk</span>
                    </div>
                    <strong>
                      {lowRiskCount} ({totalPredictions ? Math.round((lowRiskCount / totalPredictions) * 100) : 0}%)
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Category Breakdown & Time Trend Analysis */}
          <div className="analytics-grid-equal">
            {/* Category Breakdown */}
            <div className="analytics-card">
              <div className="card-title-row">
                <h3>🏷️ Threat Crime Categories</h3>
                <span style={{ fontSize: "12px", color: "var(--text-secondary, #94a3b8)" }}>
                  {categoryBreakdown.length} unique threat types
                </span>
              </div>

              <div className="category-list">
                {categoryBreakdown.slice(0, 6).map((cat) => (
                  <div key={cat.category} className="category-row">
                    <div className="category-row-meta">
                      <strong>{cat.category}</strong>
                      <span>
                        {cat.count} cases ({cat.percentage}%) • Avg Score {cat.avgScore}%
                      </span>
                    </div>
                    <div className="bar-track" style={{ height: "10px" }}>
                      <div
                        className="bar-fill"
                        style={{
                          width: `${cat.percentage}%`,
                          background:
                            cat.avgScore > 75
                              ? "linear-gradient(90deg, #EF4444, #F97316)"
                              : "linear-gradient(90deg, #06B6D4, #3B82F6)",
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Time Trend Area/Line Chart */}
            <div className="analytics-card">
              <div className="card-title-row">
                <h3>📊 Temporal Incident Trend ({dateRange})</h3>
                <span style={{ fontSize: "11px", color: "var(--text-secondary, #94a3b8)" }}>
                  Timeline progression
                </span>
              </div>

              <div className="trend-chart-wrapper">
                <svg className="trend-svg" viewBox="0 0 500 200" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.45" />
                      <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  <line x1="0" y1="50" x2="500" y2="50" stroke="rgba(255,255,255,0.06)" strokeDasharray="3,3" />
                  <line x1="0" y1="100" x2="500" y2="100" stroke="rgba(255,255,255,0.06)" strokeDasharray="3,3" />
                  <line x1="0" y1="150" x2="500" y2="150" stroke="rgba(255,255,255,0.06)" strokeDasharray="3,3" />

                  {/* Area fill path */}
                  {trendPoints.length > 1 && (
                    <polygon
                      points={`0,180 ${trendPoints
                        .map((p, idx) => {
                          const x = (idx / (trendPoints.length - 1)) * 500;
                          const y = 170 - (p.count / maxTrend) * 140;
                          return `${x},${y}`;
                        })
                        .join(" ")} 500,180`}
                      fill="url(#trendGrad)"
                    />
                  )}

                  {/* Trend line */}
                  {trendPoints.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="#06B6D4"
                      strokeWidth="2.5"
                      points={trendPoints
                        .map((p, idx) => {
                          const x = (idx / (trendPoints.length - 1)) * 500;
                          const y = 170 - (p.count / maxTrend) * 140;
                          return `${x},${y}`;
                        })
                        .join(" ")}
                    />
                  )}

                  {/* Data Points */}
                  {trendPoints.map((p, idx) => {
                    const x = (idx / (trendPoints.length - 1)) * 500;
                    const y = 170 - (p.count / maxTrend) * 140;
                    return (
                      <g key={idx}>
                        <circle cx={x} cy={y} r="4" fill="#0B1120" stroke="#06B6D4" strokeWidth="2" />
                        <text x={x} y="195" fill="#64748b" fontSize="9" textAnchor="middle">
                          {p.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>

          {/* Row 3: High-Risk District Rankings & Highest Risk States */}
          <div className="analytics-grid-equal">
            {/* Top High-Risk Districts */}
            <div className="analytics-card">
              <div className="card-title-row">
                <h3>🏆 Top Vulnerable High-Risk Districts</h3>
                <span style={{ fontSize: "11px", color: "var(--text-secondary, #94a3b8)" }}>
                  Ranked by High Threat Density
                </span>
              </div>

              <div className="analytics-table-wrapper">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>District</th>
                      <th>State</th>
                      <th>High Risk</th>
                      <th>Avg Score</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {districtRankings.map((d, index) => (
                      <tr key={`${d.district}-${d.state}`}>
                        <td>
                          <span
                            className={`rank-badge ${
                              index === 0 ? "rank-1" : index === 1 ? "rank-2" : index === 2 ? "rank-3" : "rank-other"
                            }`}
                          >
                            {index + 1}
                          </span>
                        </td>
                        <td>
                          <strong>{d.district}</strong>
                        </td>
                        <td>{d.state}</td>
                        <td style={{ color: "#EF4444", fontWeight: 700 }}>{d.high}</td>
                        <td style={{ color: "var(--cyan, #06B6D4)", fontWeight: 700 }}>{d.avgScore}%</td>
                        <td>
                          <button
                            type="button"
                            className="analytics-btn analytics-btn-secondary"
                            style={{ padding: "4px 8px", fontSize: "11px" }}
                            onClick={() => setDrillDistrict(d)}
                          >
                            🔍 Drill-down
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Highest Risk States (Weighted Model) */}
            <div className="analytics-card">
              <div className="card-title-row">
                <h3>🛡️ Highest Risk State Index</h3>
                <span style={{ fontSize: "11px", color: "var(--text-secondary, #94a3b8)" }}>
                  Formula: (High×0.5 + Avg×0.3 + Active×0.2)
                </span>
              </div>

              <div className="analytics-table-wrapper">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>State</th>
                      <th>Total Cases</th>
                      <th>High Risk</th>
                      <th>Weighted Risk Index</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stateRankings.map((s, index) => (
                      <tr key={s.state}>
                        <td>
                          <span
                            className={`rank-badge ${
                              index === 0 ? "rank-1" : index === 1 ? "rank-2" : index === 2 ? "rank-3" : "rank-other"
                            }`}
                          >
                            {index + 1}
                          </span>
                        </td>
                        <td>
                          <strong>{s.state}</strong>
                        </td>
                        <td>{s.count}</td>
                        <td style={{ color: "#EF4444", fontWeight: 700 }}>{s.high}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div className="bar-track" style={{ width: "80px", height: "8px" }}>
                              <div
                                className="bar-fill"
                                style={{
                                  width: `${Math.min(s.riskScore, 100)}%`,
                                  background: "#EF4444",
                                }}
                              ></div>
                            </div>
                            <strong style={{ color: "#EF4444" }}>{s.riskScore}</strong>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* District Drill-Down Modal */}
      {drillDistrict && (
        <div className="drilldown-modal-backdrop" onClick={() => setDrillDistrict(null)}>
          <div className="drilldown-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="drilldown-close-btn" onClick={() => setDrillDistrict(null)}>
              ✕
            </button>

            <h3 style={{ fontSize: "20px", marginBottom: "4px" }}>
              🏙️ Sector Deep-Dive: {drillDistrict.district}, {drillDistrict.state}
            </h3>
            <p style={{ color: "var(--text-secondary, #94a3b8)", fontSize: "13px", marginBottom: "20px" }}>
              Detailed spatial breakdown and incident intelligence records
            </p>

            <div className="analytics-kpi-grid" style={{ marginBottom: "20px" }}>
              <div className="kpi-stat-card">
                <span className="kpi-label">Sector Total</span>
                <div className="kpi-value">{drillDistrict.count}</div>
              </div>
              <div className="kpi-stat-card danger">
                <span className="kpi-label">High Risk Incidents</span>
                <div className="kpi-value" style={{ color: "#EF4444" }}>
                  {drillDistrict.high}
                </div>
              </div>
              <div className="kpi-stat-card">
                <span className="kpi-label">Sector Threat Score</span>
                <div className="kpi-value" style={{ color: "var(--cyan, #06B6D4)" }}>
                  {drillDistrict.avgScore}%
                </div>
              </div>
            </div>

            <h4 style={{ fontSize: "14px", marginBottom: "10px" }}>Recent Incident Hotspots in {drillDistrict.district}</h4>
            <div className="analytics-table-wrapper" style={{ maxHeight: "250px" }}>
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Location / ATM</th>
                    <th>Category</th>
                    <th>Risk Level</th>
                    <th>Score</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords
                    .filter((r) => r.district === drillDistrict.district && r.state === drillDistrict.state)
                    .slice(0, 10)
                    .map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.location}</strong>
                        </td>
                        <td>{item.category}</td>
                        <td>
                          <span
                            style={{
                              color: item.threatLevel === "High" ? "#EF4444" : item.threatLevel === "Medium" ? "#F59E0B" : "#10B981",
                              fontWeight: 700,
                            }}
                          >
                            {item.threatLevel}
                          </span>
                        </td>
                        <td>{item.threatScore}%</td>
                        <td>{item.status}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                className="analytics-btn analytics-btn-primary"
                onClick={() => {
                  navigate(`/heatmap?state=${encodeURIComponent(drillDistrict.state)}&district=${encodeURIComponent(drillDistrict.district)}`);
                }}
              >
                🗺️ Open in GIS Radar Map
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OfficerAnalytics;
