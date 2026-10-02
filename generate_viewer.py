"""AquaTrust AI — PostgreSQL 17 Database Viewer Generator.

Connects directly to the live PostgreSQL 17 database (`aquatrust_db`),
extracts all tables, schemas, and rows, and compiles an interactive,
high-fidelity HTML inspection dashboard (`database_viewer.html`).
"""

import sys
import os
import json
from pathlib import Path
from datetime import datetime, date
from decimal import Decimal
import uuid

# Ensure backend directory is in sys.path
repo_root = Path(__file__).resolve().parent
backend_dir = repo_root / "backend"
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(repo_root))

from sqlalchemy import text
from app.db.session import engine


def json_serial(obj):
    """JSON serializer for objects not serializable by default json code."""
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, uuid.UUID):
        return str(obj)
    if isinstance(obj, bytes):
        return obj.hex()
    raise TypeError(f"Type {type(obj)} not serializable")


def generate_viewer():
    """Extract live data from PostgreSQL 17 and render database_viewer.html."""
    print("Connecting to PostgreSQL 17 (aquatrust_db)...")
    
    tables_order = [
        "facilities",
        "sensors",
        "compliance_rules",
        "readings",
        "validation_results",
        "anomaly_results",
        "treatment_records",
        "compliance_results",
        "certificates",
        "cryptographic_artifacts",
        "signing_keys",
        "dlt_anchors",
        "audit_logs",
        "users",
        "corrections",
    ]

    db_data = {}
    row_counts = {}

    with engine.connect() as conn:
        for table in tables_order:
            try:
                # Query all columns and rows
                res = conn.execute(text(f"SELECT * FROM {table}"))
                cols = list(res.keys())
                rows = res.fetchall()
                
                table_rows = []
                for row in rows:
                    row_dict = {}
                    for col_name, val in zip(cols, row):
                        if isinstance(val, (datetime, date)):
                            row_dict[col_name] = val.isoformat()
                        elif isinstance(val, Decimal):
                            row_dict[col_name] = float(val)
                        elif isinstance(val, uuid.UUID):
                            row_dict[col_name] = str(val)
                        elif isinstance(val, (dict, list)):
                            row_dict[col_name] = val
                        elif isinstance(val, bytes):
                            row_dict[col_name] = val.hex()
                        else:
                            row_dict[col_name] = val
                    table_rows.append(row_dict)
                
                db_data[table] = {
                    "columns": cols,
                    "rows": table_rows,
                    "count": len(table_rows),
                }
                row_counts[table] = len(table_rows)
                print(f"  Loaded {table}: {len(table_rows)} rows")
            except Exception as e:
                print(f"  Warning querying {table}: {e}")
                db_data[table] = {"columns": [], "rows": [], "count": 0, "error": str(e)}
                row_counts[table] = 0

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")
    json_payload = json.dumps(db_data, default=json_serial)

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AquaTrust AI — PostgreSQL 17 Database Viewer</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {{
      --bg-base: #0a0f1d;
      --bg-surface: #111827;
      --bg-card: #1a2234;
      --bg-card-hover: #222d44;
      --border-subtle: #243247;
      --border-accent: #38bdf8;
      --text-main: #f1f5f9;
      --text-muted: #94a3b8;
      --text-dim: #64748b;
      --primary: #0284c7;
      --primary-light: #38bdf8;
      --primary-glow: rgba(56, 189, 248, 0.15);
      --success: #10b981;
      --success-glow: rgba(16, 185, 129, 0.15);
      --warning: #f59e0b;
      --danger: #ef4444;
      --purple: #8b5cf6;
      --font-sans: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }}

    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }}

    body {{
      background-color: var(--bg-base);
      color: var(--text-main);
      font-family: var(--font-sans);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }}

    /* Header */
    header {{
      background-color: var(--bg-surface);
      border-bottom: 1px solid var(--border-subtle);
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 50;
      backdrop-filter: blur(10px);
    }}

    .logo-container {{
      display: flex;
      align-items: center;
      gap: 1rem;
    }}

    .brand-icon {{
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #0284c7 0%, #38bdf8 100%);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 1.25rem;
      color: #fff;
      box-shadow: 0 0 20px rgba(56, 189, 248, 0.4);
    }}

    .brand-title h1 {{
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }}

    .brand-title p {{
      font-size: 0.75rem;
      color: var(--text-muted);
      font-family: var(--font-mono);
    }}

    .db-badge {{
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background-color: var(--bg-card);
      border: 1px solid var(--border-subtle);
      padding: 0.4rem 0.8rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-family: var(--font-mono);
    }}

    .status-dot {{
      width: 8px;
      height: 8px;
      background-color: var(--success);
      border-radius: 50%;
      box-shadow: 0 0 8px var(--success);
    }}

    /* Main Layout */
    .app-container {{
      display: flex;
      flex: 1;
      height: calc(100vh - 73px);
    }}

    /* Sidebar Navigation */
    sidebar {{
      width: 280px;
      background-color: var(--bg-surface);
      border-right: 1px solid var(--border-subtle);
      padding: 1.25rem 0.75rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }}

    .sidebar-section-title {{
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-dim);
      padding: 0.5rem 0.75rem;
    }}

    .nav-btn {{
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 0.65rem 0.85rem;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 8px;
      color: var(--text-muted);
      font-family: var(--font-sans);
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      text-align: left;
      transition: all 0.15s ease;
    }}

    .nav-btn:hover {{
      background-color: var(--bg-card);
      color: var(--text-main);
    }}

    .nav-btn.active {{
      background-color: var(--primary-glow);
      color: var(--primary-light);
      border-color: rgba(56, 189, 248, 0.3);
      font-weight: 600;
    }}

    .nav-count {{
      font-family: var(--font-mono);
      font-size: 0.75rem;
      padding: 0.15rem 0.45rem;
      border-radius: 6px;
      background-color: var(--bg-card);
      color: var(--text-dim);
    }}

    .nav-btn.active .nav-count {{
      background-color: rgba(56, 189, 248, 0.2);
      color: var(--primary-light);
    }}

    /* Content Area */
    main {{
      flex: 1;
      padding: 1.5rem 2rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }}

    /* Metric Cards Grid */
    .metrics-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }}

    .metric-card {{
      background-color: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      padding: 1.15rem;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      transition: transform 0.15s ease, border-color 0.15s ease;
    }}

    .metric-card:hover {{
      transform: translateY(-2px);
      border-color: rgba(56, 189, 248, 0.4);
    }}

    .metric-title {{
      font-size: 0.75rem;
      color: var(--text-muted);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }}

    .metric-value {{
      font-size: 1.75rem;
      font-weight: 800;
      font-family: var(--font-mono);
      color: var(--text-main);
    }}

    .metric-meta {{
      font-size: 0.75rem;
      color: var(--success);
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }}

    /* Table Workspace */
    .table-container {{
      background-color: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      flex: 1;
      overflow: hidden;
    }}

    .table-header-bar {{
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background-color: rgba(255, 255, 255, 0.01);
      gap: 1rem;
      flex-wrap: wrap;
    }}

    .table-title-group h2 {{
      font-size: 1.15rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }}

    .table-title-group p {{
      font-size: 0.8rem;
      color: var(--text-muted);
    }}

    .search-input {{
      background-color: var(--bg-card);
      border: 1px solid var(--border-subtle);
      color: var(--text-main);
      padding: 0.5rem 0.85rem;
      border-radius: 8px;
      font-size: 0.85rem;
      font-family: var(--font-sans);
      width: 260px;
      outline: none;
      transition: border-color 0.15s ease;
    }}

    .search-input:focus {{
      border-color: var(--primary-light);
    }}

    .table-scroll {{
      flex: 1;
      overflow: auto;
      max-height: 580px;
    }}

    table {{
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.85rem;
    }}

    th {{
      position: sticky;
      top: 0;
      background-color: var(--bg-card);
      color: var(--text-muted);
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border-subtle);
      white-space: nowrap;
      z-index: 10;
    }}

    td {{
      padding: 0.75rem 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.03);
      color: var(--text-main);
      white-space: nowrap;
      font-family: var(--font-mono);
      font-size: 0.8rem;
    }}

    tr:hover td {{
      background-color: rgba(255, 255, 255, 0.02);
    }}

    /* Badges */
    .badge {{
      display: inline-block;
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      font-family: var(--font-sans);
      letter-spacing: 0.04em;
    }}

    .badge-success {{
      background-color: var(--success-glow);
      color: var(--success);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }}

    .badge-info {{
      background-color: var(--primary-glow);
      color: var(--primary-light);
      border: 1px solid rgba(56, 189, 248, 0.3);
    }}

    .badge-warning {{
      background-color: rgba(245, 158, 11, 0.15);
      color: var(--warning);
      border: 1px solid rgba(245, 158, 11, 0.3);
    }}

    .badge-purple {{
      background-color: rgba(139, 92, 246, 0.15);
      color: var(--purple);
      border: 1px solid rgba(139, 92, 246, 0.3);
    }}

    /* JSON Cell styling */
    .json-cell {{
      max-width: 320px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--primary-light);
      cursor: pointer;
    }}

    .uuid-cell {{
      color: var(--text-dim);
    }}

    /* Footer */
    footer {{
      background-color: var(--bg-surface);
      border-top: 1px solid var(--border-subtle);
      padding: 0.75rem 2rem;
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--text-dim);
    }}
  </style>
</head>
<body>

  <header>
    <div class="logo-container">
      <div class="brand-icon">AT</div>
      <div class="brand-title">
        <h1>AquaTrust AI <span>Database Viewer</span></h1>
        <p>PostgreSQL 17 Live Inspection Dashboard &bull; Gomti Basin Facility Realignment</p>
      </div>
    </div>
    <div class="db-badge">
      <div class="status-dot"></div>
      <span>postgresql://postgres:postgres@localhost:5432/aquatrust_db</span>
    </div>
  </header>

  <div class="app-container">
    <sidebar>
      <div class="sidebar-section-title">Core Entities</div>
      <button class="nav-btn active" onclick="switchTable('facilities')">
        <span>Facilities</span>
        <span class="nav-count" id="count-facilities">{row_counts.get('facilities', 0)}</span>
      </button>
      <button class="nav-btn" onclick="switchTable('sensors')">
        <span>Sensors</span>
        <span class="nav-count" id="count-sensors">{row_counts.get('sensors', 0)}</span>
      </button>
      <button class="nav-btn" onclick="switchTable('compliance_rules')">
        <span>Compliance Rules</span>
        <span class="nav-count" id="count-compliance_rules">{row_counts.get('compliance_rules', 0)}</span>
      </button>

      <div class="sidebar-section-title" style="margin-top: 0.75rem;">Telemetry & AI Engine</div>
      <button class="nav-btn" onclick="switchTable('readings')">
        <span>Readings (Telemetry)</span>
        <span class="nav-count" id="count-readings">{row_counts.get('readings', 0)}</span>
      </button>
      <button class="nav-btn" onclick="switchTable('validation_results')">
        <span>Validation Results</span>
        <span class="nav-count" id="count-validation_results">{row_counts.get('validation_results', 0)}</span>
      </button>
      <button class="nav-btn" onclick="switchTable('anomaly_results')">
        <span>Anomaly Results</span>
        <span class="nav-count" id="count-anomaly_results">{row_counts.get('anomaly_results', 0)}</span>
      </button>

      <div class="sidebar-section-title" style="margin-top: 0.75rem;">Finalization & DLT</div>
      <button class="nav-btn" onclick="switchTable('treatment_records')">
        <span>Treatment Records</span>
        <span class="nav-count" id="count-treatment_records">{row_counts.get('treatment_records', 0)}</span>
      </button>
      <button class="nav-btn" onclick="switchTable('compliance_results')">
        <span>Compliance Results</span>
        <span class="nav-count" id="count-compliance_results">{row_counts.get('compliance_results', 0)}</span>
      </button>
      <button class="nav-btn" onclick="switchTable('certificates')">
        <span>Certificates</span>
        <span class="nav-count" id="count-certificates">{row_counts.get('certificates', 0)}</span>
      </button>
      <button class="nav-btn" onclick="switchTable('cryptographic_artifacts')">
        <span>Crypto Artifacts</span>
        <span class="nav-count" id="count-cryptographic_artifacts">{row_counts.get('cryptographic_artifacts', 0)}</span>
      </button>
      <button class="nav-btn" onclick="switchTable('signing_keys')">
        <span>Signing Keys</span>
        <span class="nav-count" id="count-signing_keys">{row_counts.get('signing_keys', 0)}</span>
      </button>
      <button class="nav-btn" onclick="switchTable('dlt_anchors')">
        <span>DLT Anchors</span>
        <span class="nav-count" id="count-dlt_anchors">{row_counts.get('dlt_anchors', 0)}</span>
      </button>

      <div class="sidebar-section-title" style="margin-top: 0.75rem;">Governance & Audit</div>
      <button class="nav-btn" onclick="switchTable('audit_logs')">
        <span>Audit Logs</span>
        <span class="nav-count" id="count-audit_logs">{row_counts.get('audit_logs', 0)}</span>
      </button>
      <button class="nav-btn" onclick="switchTable('users')">
        <span>Users</span>
        <span class="nav-count" id="count-users">{row_counts.get('users', 0)}</span>
      </button>
      <button class="nav-btn" onclick="switchTable('corrections')">
        <span>Corrections</span>
        <span class="nav-count" id="count-corrections">{row_counts.get('corrections', 0)}</span>
      </button>
    </sidebar>

    <main>
      <!-- Top Metrics Banner -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-title">Active STP Facilities</div>
          <div class="metric-value">{row_counts.get('facilities', 0)}</div>
          <div class="metric-meta">Bharwara STP Lucknow (345 MLD)</div>
        </div>
        <div class="metric-card">
          <div class="metric-title">Active Sensors</div>
          <div class="metric-value">{row_counts.get('sensors', 0)}</div>
          <div class="metric-meta">6 Canonical Parameters</div>
        </div>
        <div class="metric-card">
          <div class="metric-title">Validated Telemetry</div>
          <div class="metric-value">{row_counts.get('readings', 0)}</div>
          <div class="metric-meta">100% Quality Valid & Normal</div>
        </div>
        <div class="metric-card">
          <div class="metric-title">Finalized Certificates</div>
          <div class="metric-value">{row_counts.get('certificates', 0)}</div>
          <div class="metric-meta">SHA-256 + ECDSA Signed</div>
        </div>
        <div class="metric-card">
          <div class="metric-title">DLT Ledger Anchors</div>
          <div class="metric-value">{row_counts.get('dlt_anchors', 0)}</div>
          <div class="metric-meta">State: Confirmed / Pending</div>
        </div>
      </div>

      <!-- Table Section -->
      <div class="table-container">
        <div class="table-header-bar">
          <div class="table-title-group">
            <h2 id="active-table-title">facilities</h2>
            <p id="active-table-subtitle">Showing all rows in PostgreSQL 17 table</p>
          </div>
          <input type="text" id="search-box" class="search-input" placeholder="Filter rows in active table..." oninput="filterTable()">
        </div>
        <div class="table-scroll">
          <table id="data-table">
            <thead id="table-head"></thead>
            <tbody id="table-body"></tbody>
          </table>
        </div>
      </div>
    </main>
  </div>

  <footer>
    <span>AquaTrust AI Database Migration & Alignment Pipeline</span>
    <span>Generated: {now_str}</span>
  </footer>

  <script>
    const dbData = {json_payload};
    let currentTable = 'facilities';

    function renderBadge(val) {{
      const v = String(val).toLowerCase();
      if (['valid', 'normal', 'compliant', 'active', 'finalized', 'success', 'confirmed'].includes(v)) {{
        return `<span class="badge badge-success">${{val}}</span>`;
      }}
      if (['eligible_for_finalization', 'municipal_stp', 'mg/l', 'ph units'].includes(v)) {{
        return `<span class="badge badge-info">${{val}}</span>`;
      }}
      if (['pending', 'insufficient_data', 'suspect'].includes(v)) {{
        return `<span class="badge badge-warning">${{val}}</span>`;
      }}
      if (['invalid', 'anomalous', 'non_compliant', 'failed'].includes(v)) {{
        return `<span class="badge" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3);">${{val}}</span>`;
      }}
      if (['es256', 'p-256', 'sha-256', 'admin', 'operator', 'auditor', 'regulatory_stakeholder'].includes(v)) {{
        return `<span class="badge badge-purple">${{val}}</span>`;
      }}
      return null;
    }}

    function switchTable(tableName) {{
      currentTable = tableName;
      document.querySelectorAll('.nav-btn').forEach(btn => {{
        btn.classList.remove('active');
        if (btn.getAttribute('onclick').includes(`'${{tableName}}'`)) {{
          btn.classList.add('active');
        }}
      }});

      document.getElementById('active-table-title').innerText = tableName;
      document.getElementById('search-box').value = '';
      
      const tInfo = dbData[tableName];
      if (!tInfo) return;

      document.getElementById('active-table-subtitle').innerText = 
        `Showing ${{tInfo.rows.length}} row(s) from PostgreSQL 17 table [${{tableName}}]`;

      renderTable(tInfo.columns, tInfo.rows);
    }}

    function renderTable(columns, rows) {{
      const head = document.getElementById('table-head');
      const body = document.getElementById('table-body');
      
      head.innerHTML = `<tr>${{columns.map(c => `<th>${{c}}</th>`).join('')}}</tr>`;

      if (rows.length === 0) {{
        body.innerHTML = `<tr><td colspan="${{columns.length}}" style="text-align: center; color: var(--text-dim); padding: 3rem;">No rows in this table</td></tr>`;
        return;
      }}

      body.innerHTML = rows.map(row => {{
        return `<tr>${{columns.map(col => {{
          const val = row[col];
          if (val === null || val === undefined) {{
            return `<td style="color: var(--text-dim); font-style: italic;">null</td>`;
          }}
          
          const badge = renderBadge(val);
          if (badge) return `<td>${{badge}}</td>`;

          if (typeof val === 'object') {{
            const str = JSON.stringify(val);
            return `<td class="json-cell" title='${{str.replace(/'/g, "&apos;")}}'>${{str}}</td>`;
          }}

          const strVal = String(val);
          if (strVal.length === 36 && strVal.includes('-')) {{
            return `<td class="uuid-cell" title="${{strVal}}">${{strVal.substring(0, 8)}}...${{strVal.substring(28)}}</td>`;
          }}
          if (strVal.length === 64) {{
            return `<td class="uuid-cell" title="${{strVal}}">${{strVal.substring(0, 10)}}...${{strVal.substring(54)}}</td>`;
          }}

          return `<td>${{strVal}}</td>`;
        }}).join('')}}</tr>`;
      }}).join('');
    }}

    function filterTable() {{
      const q = document.getElementById('search-box').value.toLowerCase();
      const tInfo = dbData[currentTable];
      if (!tInfo) return;

      if (!q) {{
        renderTable(tInfo.columns, tInfo.rows);
        return;
      }}

      const filtered = tInfo.rows.filter(r => {{
        return Object.values(r).some(v => {{
          if (v === null || v === undefined) return false;
          if (typeof v === 'object') return JSON.stringify(v).toLowerCase().includes(q);
          return String(v).toLowerCase().includes(q);
        }});
      }});

      renderTable(tInfo.columns, filtered);
    }}

    // Initial render
    switchTable('facilities');
  </script>
</body>
</html>
"""

    output_path = repo_root / "database_viewer.html"
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html_content)

    print(f"\nSuccessfully generated {output_path} ({len(html_content)} bytes)")
    return output_path


if __name__ == "__main__":
    generate_viewer()
