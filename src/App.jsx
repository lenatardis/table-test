import { useState, useRef } from "react";

/**
 * Один файл з усім:
 * - 4×4 грід (row0 — заголовки, col0 — назви товарів)
 * - редаговані клітинки B2..D4
 * - paste з Excel/Google Sheets (html -> table або plain TSV)
 * - зайве обрізається по межах гріда
 */

const HEADERS = ["Назва", "Ціна опт", "Ціна роздріб", "Ціна спец"];
const ROW_LABELS = ["Товар 1", "Товар 2", "Товар 3"];

// 3 рядки × 3 цінові колонки (B..D). За потреби можеш проставити дефолти.
const makeInitialData = () => [
    ["", "", ""],
    ["", "", ""],
    ["", "", ""],
];

export default function App() {
    return (
        <div className="wrap">
            <StyleTag />
            <h1>Демо: копі-паст діапазонів у грід</h1>
            <p className="hint">
                Скопіюй у Google Sheets діапазон <b>B2:D4</b> з числами й встав у клітинку
                <b> B2</b> нижче (фокус у першу праву від назви товару). Працюють і часткові
                діапазони (напр., <b>B2:D2</b>). Все, що виходить за межі — обрізається.
            </p>
            <TableGrid />
            <FooterNote />
        </div>
    );
}

function TableGrid() {
    const [cells, setCells] = useState(makeInitialData());
    const inputsRef = useRef({});

    // редагуємо блок rows=[0..2], cols=[0..2] (тобто видимий B2..D4)
    const ROWS = ROW_LABELS.length;      // 3
    const COLS = HEADERS.length - 1;     // 3

    const setCell = (r, c, value) => {
        setCells(prev => {
            const next = prev.map(row => row.slice());
            next[r][c] = value;
            return next;
        });
    };

    const handleChange = (r, c, e) => setCell(r, c, e.target.value);

    const parseClipboard = (e) => {
        // 1) Першим ділом пробуємо html-таблицю (Excel/Sheets так часто копіюють)
        const html = e.clipboardData.getData("text/html");
        if (html && html.includes("<table")) {
            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, "text/html");
                const table = doc.querySelector("table");
                if (table) {
                    const rows = [];
                    for (const tr of table.querySelectorAll("tr")) {
                        const row = [];
                        for (const cell of tr.querySelectorAll("td,th")) {
                            row.push(cell.textContent.replace(/\u00A0/g, " ").trim());
                        }
                        if (row.some(v => v !== "")) rows.push(row);
                    }
                    if (rows.length) return rows;
                }
            } catch { /* ідемо у plain text */ }
        }

        // 2) Фолбек: TSV/CSV-подібний plain text (Sheets/Excel)
        const text = e.clipboardData.getData("text/plain") || "";
        const lines = text.replace(/\r/g, "").split("\n").filter(l => l.length);
        const data = lines.map(line => line.split("\t"));
        return data;
    };

    const handlePaste = (r0, c0, e) => {
        e.preventDefault(); // не даємо браузеру вставляти в input напряму
        const matrix = parseClipboard(e);
        if (!matrix || !matrix.length) return;

        setCells(prev => {
            const next = prev.map(row => row.slice());

            for (let r = 0; r < matrix.length; r++) {
                const rr = r0 + r;
                if (rr >= ROWS) break; // обрізка по нижній межі

                for (let c = 0; c < matrix[r].length; c++) {
                    const cc = c0 + c;
                    if (cc >= COLS) break; // обрізка по правій межі
                    next[rr][cc] = matrix[r][c];
                }
            }
            return next;
        });
    };

    const registerInputRef = (r, c, el) => {
        if (!inputsRef.current[r]) inputsRef.current[r] = {};
        inputsRef.current[r][c] = el;
    };

    return (
        <div className="grid4">
            {/* Row 0: заголовки */}
            {HEADERS.map((h, i) => (
                <div key={`h-${i}`} className="cell head">{h}</div>
            ))}

            {/* Row 1..3 */}
            {ROW_LABELS.map((label, r) => (
                <div key={`row-${r}`} className="row-line">
                    {/* col 0: назва товару (stub, не редагується у демці) */}
                    <div className="cell stub">{label}</div>

                    {/* cols 1..3: editable inputs (B..D) */}
                    {Array.from({ length: COLS }).map((_, c) => (
                        <div key={`c-${r}-${c}`} className="cell">
                            <input
                                ref={el => registerInputRef(r, c, el)}
                                className="cell-input"
                                value={cells[r][c]}
                                onChange={(e) => handleChange(r, c, e)}
                                onPaste={(e) => handlePaste(r, c, e)}
                                inputMode="decimal"
                                placeholder=""
                            />
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}

/* стилі вбудовані тут же, щоб нічого не губити */
function StyleTag() {
    const css = `
:root {
  --border: #d7dbe0;
  --head-bg: #f7f8fa;
  --stub-bg: #fafbfc;
  --focus: #5b9aff;
}

* { box-sizing: border-box; }
body { margin: 0; }

.wrap {
  max-width: 920px;
  margin: 24px auto 64px;
  padding: 0 16px;
  font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
}

.hint { color: #555; margin-bottom: 16px; }

.grid4 {
  display: grid;
  grid-template-columns: 220px 1fr 1fr 1fr; /* A,B,C,D */
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
}

/* заголовки (row 0) */
.cell.head {
  background: var(--head-bg);
  font-weight: 600;
  padding: 10px 12px;
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}
.cell.head:last-child { border-right: none; }

/* рядки з даними */
.row-line {
  display: contents; /* робимо "рядок" у CSS grid */
}

.cell {
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  padding: 0;
  background: white;
  min-height: 40px;
  display: flex;
  align-items: stretch;
}
.cell:nth-child(4n) { border-right: none; } /* кожна 4-та клітинка у рядку */

/* перший стовпець (назви) */
.cell.stub {
  background: var(--stub-bg);
  padding: 10px 12px;
  font-weight: 500;
}

/* input у клітинці */
.cell-input {
  width: 100%;
  border: none;
  outline: none;
  padding: 10px 12px;
  font-size: 14px;
  background: transparent;
}
.cell-input:focus {
  box-shadow: inset 0 0 0 2px var(--focus);
  border-radius: 6px;
}

footer.note {
  margin-top: 16px;
  color: #6b7280;
  font-size: 13px;
}
  `;
    return <style>{css}</style>;
}

function FooterNote() {
    return (
        <footer className="note">
            Підтримує вставку з Google Sheets і Excel: спочатку парситься
            <code> text/html &lt;table&gt;</code>, якщо його нема — <code>text/plain</code> (TSV).
            Числа зберігаємо як рядки; за потреби легко додати нормалізацію.
        </footer>
    );
}
