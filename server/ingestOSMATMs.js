const sequelize = require('./database');
const ATM = require('./models/ATM');

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

// Districts to fetch (in Maharashtra)
const districtsToFetch = [
  { state: "Maharashtra", district: "Sangli" },
  { state: "Maharashtra", district: "Pune" },
  { state: "Maharashtra", district: "Nagpur" },
  { state: "Maharashtra", district: "Mumbai" },
  { state: "Delhi (NCT)", district: "South East Delhi", queryName: "Delhi" } // Just some data for Delhi for testing
];

function generateRiskScore() {
  // Simulate a ML risk score based on proximity and historical cybercrime
  const base = Math.floor(Math.random() * 50) + 20; // 20-70
  // Occasionally mark some ATMs as high risk
  if (Math.random() > 0.8) {
    return Math.min(99, base + 30);
  }
  return base;
}

function getRiskLevel(score) {
  if (score >= 80) return "HIGH";
  if (score >= 50) return "MEDIUM";
  return "LOW";
}

async function fetchATMsForDistrict(state, district, queryName) {
  const areaName = queryName || district;
  console.log(`Fetching ATMs for ${areaName} via Overpass API...`);
  
  // Overpass query for ATMs in the area
  const query = `
    [out:json][timeout:25];
    area["name"="${areaName}"]->.searchArea;
    (
      node["amenity"="atm"](area.searchArea);
    );
    out center;
  `;

  try {
    const params = new URLSearchParams();
    params.append('data', query);
    
    const response = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Ayush-Cyber-Intel-Project/1.0"
      },
      body: params.toString()
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch for ${district}: ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    return data.elements || [];
  } catch (err) {
    console.error(`Error fetching for ${district}:`, err.message);
    return [];
  }
}

async function ingest() {
  console.log("Syncing database (keeping existing data if any)...");
  await sequelize.sync();

  for (const { state, district, queryName } of districtsToFetch) {
    const elements = await fetchATMsForDistrict(state, district, queryName);
    console.log(`Found ${elements.length} raw ATMs for ${district}`);

    let ingestedCount = 0;
    
    // Deduplication Set (lat, lng string rounded to 4 decimals)
    const seenCoordinates = new Set();
    
    // Also fetch existing from DB to prevent cross-run duplication
    const existingATMs = await ATM.findAll({ where: { state, district }});
    for (const ex of existingATMs) {
      const coordKey = `${ex.latitude.toFixed(4)},${ex.longitude.toFixed(4)}`;
      seenCoordinates.add(coordKey);
    }

    const atmsToInsert = [];

    for (const el of elements) {
      if (!el.lat || !el.lon) continue;
      
      const coordKey = `${parseFloat(el.lat).toFixed(4)},${parseFloat(el.lon).toFixed(4)}`;
      if (seenCoordinates.has(coordKey)) continue; // Deduplicate
      seenCoordinates.add(coordKey);
      
      const name = el.tags?.name || el.tags?.operator || "ATM";
      const operator = el.tags?.operator || "Unknown Bank";
      
      const riskScore = generateRiskScore();
      const riskLevel = getRiskLevel(riskScore);
      
      atmsToInsert.push({
        name,
        operator,
        latitude: el.lat,
        longitude: el.lon,
        state: state,
        district: district,
        city: district, // fallback
        address: el.tags?.['addr:full'] || `${district}, ${state}`,
        riskScore,
        riskLevel,
        nearbyComplaintCount: Math.floor(Math.random() * 50),
        source: "OpenStreetMap",
        verified: true
      });
      ingestedCount++;
    }
    
    if (atmsToInsert.length > 0) {
      await ATM.bulkCreate(atmsToInsert);
    }
    
    console.log(`Ingested ${ingestedCount} new unique ATMs into ${district}.`);
    
    // Sleep to respect Overpass API rate limits
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log("ATM Ingestion Complete.");
}

ingest().catch(console.error);
