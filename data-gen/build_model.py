"""Builds the TMDL definition of the 'sm_retail_explorer' Direct Lake semantic model from the generated parquet schema.

Usage: python build_model.py <workspaceId> <lakehouseId> <sqlEndpointConnectionString>
Writes ../model/sm_retail_explorer.SemanticModel/** and ../model/create-body.json (payload for the Fabric create API).
"""

from __future__ import annotations

import base64
import json
import sys
from pathlib import Path

import pyarrow.parquet as pq

ROOT = Path(__file__).parent
OUT = ROOT / "out"
MODEL_DIR = ROOT.parent / "model" / "sm_retail_explorer.SemanticModel"

WORDS = {"eur": "EUR", "erv": "ERV", "kwh": "kWh", "m2": "m2", "pct": "Pct", "sc": "SC"}
RENAMED = {"transactions": "Transaction Count", "visitors": "Visitor Count"}

# table name -> (parquet entity, summary)
TABLES = {
    "Property": "dim_property", "Floor": "dim_floor", "Zone": "dim_zone", "Floor Shape": "dim_floor_shape", "Unit": "dim_unit",
    "Tenant": "dim_tenant", "Lease": "dim_lease", "Date": "dim_date", "Sales": "fact_sales_daily", "Footfall": "fact_footfall_hourly",
    "Rent": "fact_rent_monthly", "Energy": "fact_energy_monthly",
}

RELATIONSHIPS = [
    ("Floor", "Property Key", "Property", "Property Key"),
    ("Zone", "Floor Key", "Floor", "Floor Key"),
    ("Unit", "Floor Key", "Floor", "Floor Key"),
    ("Floor Shape", "Floor Key", "Floor", "Floor Key"),
    ("Lease", "Unit Key", "Unit", "Unit Key"),
    ("Lease", "Tenant Key", "Tenant", "Tenant Key"),
    ("Sales", "Date Key", "Date", "Date Key"),
    ("Sales", "Unit Key", "Unit", "Unit Key"),
    ("Sales", "Tenant Key", "Tenant", "Tenant Key"),
    ("Footfall", "Date Key", "Date", "Date Key"),
    ("Footfall", "Zone Key", "Zone", "Zone Key"),
    ("Rent", "Month Date Key", "Date", "Date Key"),
    ("Rent", "Unit Key", "Unit", "Unit Key"),
    ("Energy", "Month Date Key", "Date", "Date Key"),
    ("Energy", "Floor Key", "Floor", "Floor Key"),
]

# Active lease at the end of the filtered period; repeated inline because TMDL measures cannot share VARs.
ACTIVE = "FILTER ( Lease, Lease[Start Date] <= e && Lease[End Date] > e )"

MEASURES: dict[str, list[tuple[str, str, str, str]]] = {
    # table: [(name, format, folder, dax)]
    "Date": [
        ("Months in Period", "0", "Period", "DISTINCTCOUNT ( 'Date'[Year Month] )"),
    ],
    "Sales": [
        ("Sales", "#,##0", "Sales", "SUM ( Sales[Sales EUR] )"),
        ("Transactions", "#,##0", "Sales", "SUM ( Sales[Transaction Count] )"),
        ("Sales PY", "#,##0", "Sales", "CALCULATE ( [Sales], DATEADD ( 'Date'[Date], -1, YEAR ) )"),
        ("Sales YoY %", "+0.0%;-0.0%;0.0%", "Sales", "DIVIDE ( [Sales] - [Sales PY], [Sales PY] )"),
        ("Sales per m2", "#,##0", "Sales", "DIVIDE ( [Sales], [Occupied Area] ) * 12"),
        ("Category Benchmark Density", "#,##0", "Health",
         "VAR cat = SELECTEDVALUE ( Unit[Category] )\nVAR pk = SELECTEDVALUE ( Unit[Property Key] )\n"
         "RETURN IF ( NOT ISBLANK ( cat ), CALCULATE ( [Sales per m2], ALL ( Unit ), Unit[Category] = cat, Unit[Property Key] = pk ) )"),
        ("Sales Index vs Category", "0.00", "Health", "DIVIDE ( [Sales per m2], [Category Benchmark Density] )"),
        ("Health Score", "0", "Health",
         "VAR idx = [Sales Index vs Category]\nVAR ocr = [OCR]\nVAR yoy = COALESCE ( [Sales YoY %], 0 )\nVAR yrs = COALESCE ( [Lease Years Remaining], 0 )\n"
         "VAR salesScore = MAX ( 0, MIN ( 100, 50 + 100 * ( idx - 1 ) ) )\n"
         "VAR ocrScore = MAX ( 0, MIN ( 100, 100 * ( 0.2 - ocr ) / 0.12 ) )\n"
         "VAR trendScore = MAX ( 0, MIN ( 100, 50 + 250 * yoy ) )\n"
         "VAR leaseScore = MIN ( 100, yrs / 5 * 100 )\n"
         "RETURN IF ( NOT ISBLANK ( idx ) && NOT ISBLANK ( ocr ), 0.4 * salesScore + 0.3 * ocrScore + 0.15 * trendScore + 0.15 * leaseScore )"),
    ],
    "Rent": [
        ("Base Rent", "#,##0", "Rent", "SUM ( Rent[Base Rent EUR] )"),
        ("Turnover Rent", "#,##0", "Rent", "SUM ( Rent[Turnover Top Up EUR] )"),
        ("Total Rent", "#,##0", "Rent", "[Base Rent] + [Turnover Rent]"),
        ("Service Charge", "#,##0", "Rent", "SUM ( Rent[Service Charge EUR] )"),
        ("Occupancy Cost", "#,##0", "Rent", "[Total Rent] + [Service Charge]"),
        ("OCR", "0.0%", "Rent", "DIVIDE ( [Occupancy Cost], [Sales] )"),
        ("Occupied Area", "#,##0", "Area", "SUM ( Rent[Occupied Area m2] )"),
        ("Leasable Area", "#,##0", "Area", "SUM ( Rent[Area m2] )"),
        ("GLA m2", "#,##0", "Area", "DIVIDE ( [Leasable Area], [Months in Period] )"),
        ("Vacant Area m2", "#,##0", "Area", "DIVIDE ( [Leasable Area] - [Occupied Area], [Months in Period] )"),
        ("Occupancy %", "0.0%", "Area", "DIVIDE ( [Occupied Area], [Leasable Area] )"),
        ("ERV per m2", "#,##0.0", "Rent", "DIVIDE ( SUM ( Rent[ERV EUR] ), [Leasable Area] )"),
        ("Base Rent per m2", "#,##0.0", "Rent", "DIVIDE ( [Base Rent], [Occupied Area] )"),
        ("Rent vs ERV %", "+0.0%;-0.0%;0.0%", "Rent",
         "DIVIDE ( [Base Rent], CALCULATE ( SUM ( Rent[ERV EUR] ), Rent[Occupied Area m2] > 0 ) ) - 1"),
        ("Vacancy Rent Potential", "#,##0", "Rent", "SUM ( Rent[Vacant ERV EUR] )"),
    ],
    "Footfall": [
        ("Visitors", "#,##0", "Footfall", "SUM ( Footfall[Visitor Count] )"),
        ("Visitors PY", "#,##0", "Footfall", "CALCULATE ( [Visitors], DATEADD ( 'Date'[Date], -1, YEAR ) )"),
        ("Visitors YoY %", "+0.0%;-0.0%;0.0%", "Footfall", "DIVIDE ( [Visitors] - [Visitors PY], [Visitors PY] )"),
        ("Zone Visitors", "#,##0", "Footfall", "CALCULATE ( [Visitors], TREATAS ( VALUES ( Unit[Zone Key] ), Zone[Zone Key] ) )"),
        ("Sales per Passing Visitor", "0.00", "Footfall", "DIVIDE ( [Sales], [Zone Visitors] )"),
    ],
    "Lease": [
        ("Lease Years Remaining", "0.0", "Leases",
         f"VAR e = MAX ( 'Date'[Date] )\nRETURN MAXX ( {ACTIVE}, DIVIDE ( DATEDIFF ( e, Lease[End Date], DAY ), 365.25 ) )"),
        ("Lease Expiry Date", "yyyy-mm-dd", "Leases", f"VAR e = MAX ( 'Date'[Date] )\nRETURN MAXX ( {ACTIVE}, Lease[End Date] )"),
        ("Active Tenant", "@", "Leases", f"VAR e = MAX ( 'Date'[Date] )\nRETURN MAXX ( {ACTIVE}, RELATED ( Tenant[Tenant Name] ) )"),
        ("Is Vacant", "0", "Leases", f"VAR e = MAX ( 'Date'[Date] )\nRETURN IF ( COUNTROWS ( {ACTIVE} ) = 0, 1, 0 )"),
        ("WAULT", "0.0", "Leases",
         f"VAR e = MAX ( 'Date'[Date] )\nVAR active = {ACTIVE}\n"
         "RETURN DIVIDE ( SUMX ( active, Lease[Annual Base Rent EUR] * DATEDIFF ( e, Lease[End Date], DAY ) / 365.25 ), SUMX ( active, Lease[Annual Base Rent EUR] ) )"),
        ("Expiring 12m Area m2", "#,##0", "Leases",
         "VAR e = MAX ( 'Date'[Date] )\nRETURN SUMX ( FILTER ( Lease, Lease[Start Date] <= e && Lease[End Date] > e && Lease[End Date] <= e + 365 ), Lease[Area m2] )"),
    ],
    "Energy": [
        ("Energy kWh", "#,##0", "Energy", "SUM ( Energy[Electricity kWh] ) + SUM ( Energy[Heating kWh] )"),
        ("Energy Intensity", "0.0", "Energy", "DIVIDE ( [Energy kWh], [Leasable Area] )"),
    ],
}

DESCRIPTIONS = {
    "Sales per m2": "Annualised sales per occupied m2 over the filtered period.",
    "OCR": "Occupancy cost ratio: (base rent + turnover rent + service charge) / sales.",
    "Health Score": "0-100 composite: 40% sales density vs category, 30% OCR, 15% YoY trend, 15% lease runway. Unit level.",
    "WAULT": "Rent-weighted average unexpired lease term in years at the end of the filtered period.",
    "Rent vs ERV %": "Base rent relative to market rent (ERV) on occupied area; negative means under-rented.",
}


def display(col: str) -> str:
    if col in RENAMED:
        return RENAMED[col]
    return " ".join(WORDS.get(w, w.capitalize()) for w in col.split("_"))


def q(name: str) -> str:
    return f"'{name}'" if any(c in name for c in " .=:'()%") else name


def tmdl_type(t) -> tuple[str, str]:
    s = str(t)
    if s.startswith("int"):
        return "int64", "0"
    if s.startswith(("double", "float")):
        return "double", "#,##0.0"
    if s.startswith("bool"):
        return "boolean", ""
    if s.startswith("date") or s.startswith("timestamp"):
        return "dateTime", "yyyy-mm-dd"
    return "string", ""


def table_tmdl(name: str, entity: str) -> str:
    schema = pq.read_schema(OUT / f"{entity}.parquet")
    lines = []
    if name == "Date":
        lines.append("table Date\n\tdataCategory: Time\n")
    else:
        lines.append(f"table {q(name)}\n")
    for mname, fmt, folder, dax in MEASURES.get(name, []):
        if mname in DESCRIPTIONS:
            lines.append(f"\t/// {DESCRIPTIONS[mname]}")
        body = dax if "\n" not in dax else dax
        if "\n" in body:
            indented = "\n".join("\t\t\t" + ln for ln in body.split("\n"))
            lines.append(f"\tmeasure {q(mname)} = ```\n{indented}\n\t\t\t```")
        else:
            lines.append(f"\tmeasure {q(mname)} = {body}")
        lines.append(f"\t\tformatString: {fmt}")
        lines.append(f"\t\tdisplayFolder: {folder}\n")
    for f in schema:
        dt, fmt = tmdl_type(f.type)
        col = display(f.name)
        lines.append(f"\tcolumn {q(col)}")
        lines.append(f"\t\tdataType: {dt}")
        if col.endswith(" Key"):
            lines.append("\t\tisHidden")
        if name == "Date" and col == "Date":
            lines.append("\t\tisKey")
        if name == "Date" and col == "Date Key":
            pass
        if fmt and dt != "int64":
            lines.append(f"\t\tformatString: {fmt}")
        if name == "Date" and col == "Month Name":
            lines.append("\t\tsortByColumn: 'Month Number'")
        if name == "Date" and col == "Day Name":
            lines.append("\t\tsortByColumn: 'Day Of Week Number'")
        lines.append("\t\tsummarizeBy: none")
        lines.append(f"\t\tsourceColumn: {f.name}\n")
    lines.append(f"\tpartition {q(name)} = entity\n\t\tmode: directLake\n\t\tsource\n\t\t\tentityName: {entity}\n\t\t\tschemaName: dbo\n\t\t\texpressionSource: DatabaseQuery\n")
    return "\n".join(lines)


def main(ws: str, lh: str, sql_endpoint: str) -> None:
    d = MODEL_DIR / "definition"
    (d / "tables").mkdir(parents=True, exist_ok=True)
    files: dict[str, str] = {
        "definition.pbism": json.dumps({"$schema": "https://developer.microsoft.com/json-schemas/fabric/item/semanticModel/definitionProperties/1.0.0/schema.json", "version": "4.2", "settings": {}}, indent=2),
        "definition/database.tmdl": "database sm_retail_explorer\n\tcompatibilityLevel: 1702\n\tcompatibilityMode: powerBI\n",
        "definition/model.tmdl": "model Model\n\tculture: en-US\n\tdefaultPowerBIDataSourceVersion: powerBI_V3\n\tsourceQueryCulture: en-US\n\n"
        + "\n".join(f"ref table {q(t)}" for t in TABLES) + "\n\nref expression DatabaseQuery\n",
        "definition/expressions.tmdl": f"expression DatabaseQuery =\n\t\tlet\n\t\t    database = Sql.Database(\"{sql_endpoint}\", \"lh_retail_explorer\")\n\t\tin\n\t\t    database\n",
        "definition/relationships.tmdl": "\n".join(
            f"relationship {fk_t.replace(' ', '')}_{fk_c.replace(' ', '')}_to_{pk_t.replace(' ', '')}\n\tfromColumn: {q(fk_t)}.{q(fk_c)}\n\ttoColumn: {q(pk_t)}.{q(pk_c)}\n"
            for fk_t, fk_c, pk_t, pk_c in RELATIONSHIPS
        ),
    }
    for t, entity in TABLES.items():
        files[f"definition/tables/{t.replace(' ', '')}.tmdl"] = table_tmdl(t, entity)

    for path, content in files.items():
        p = MODEL_DIR / path
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(content, encoding="utf-8")

    parts = [{"path": p, "payload": base64.b64encode(c.encode()).decode(), "payloadType": "InlineBase64"} for p, c in files.items()]
    body = {"displayName": "sm_retail_explorer", "description": "Synthetic demo data for the retail explorer app", "definition": {"format": "TMDL", "parts": parts}}
    (MODEL_DIR.parent / "create-body.json").write_text(json.dumps(body), encoding="utf-8")
    print(f"wrote {len(files)} parts")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3])
