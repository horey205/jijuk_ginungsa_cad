import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import { Layers, MapPin, Scissors, Ruler, Download, RefreshCw } from 'lucide-react';

// --- Constants & Data ---
const SCALE_DATA = {
  "1/500": [150, 200], "1/600": [200, 250], "1/1000": [300, 400],
  "1/1200": [400, 500], "1/2400": [800, 1000], "1/3000": [1200, 1500],
  "1/6000": [2400, 3000]
};

// --- Utils ---
const jijeokRound = (val, ndigits = 2) => {
  const p = Math.pow(10, ndigits);
  const n = val * p;
  const eps = 1e-9;
  const integerPart = Math.floor(n + eps);
  const remainder = (n + eps) - integerPart;
  
  if (Math.abs(remainder - 0.5) < eps * 10) {
    const roundVal = integerPart % 2 === 0 ? integerPart : integerPart + 1;
    return roundVal / p;
  }
  return Math.round(val * p) / p;
};

const jijeokFinalRound = (val) => {
  const epsVal = Math.round(val * 1e9) / 1e9;
  const floorVal = Math.floor(epsVal);
  const remainder = epsVal - floorVal;
  
  if (Math.abs(remainder - 0.5) < 1e-9) {
    return floorVal % 2 === 0 ? floorVal : floorVal + 1;
  }
  return remainder > 0.5 ? floorVal + 1 : floorVal;
};

const calculateArea = (pts) => {
  if (pts.length < 3) return 0;
  const refX = pts[0].x;
  const refY = pts[0].y;
  let area = 0;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const xi = pts[i].x - refX;
    const yi = pts[i].y - refY;
    const xj = pts[j].x - refX;
    const yj = pts[j].y - refY;
    area += yi * xj - yj * xi;
  }
  return Math.abs(area) / 2.0;
};

const parseAngle = (ang) => {
  const parts = ang.split('-').map(Number);
  if (parts.length < 3) return 0;
  return (parts[0] + parts[1] / 60 + parts[2] / 3600) * (Math.PI / 180);
};

const intersect = (l1_p1, l1_p2, l2_p1, l2_p2) => {
  const x1 = l1_p1.x, y1 = l1_p1.y, x2 = l1_p2.x, y2 = l1_p2.y;
  const x3 = l2_p1.x, y3 = l2_p1.y, x4 = l2_p2.x, y4 = l2_p2.y;
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (denom === 0) return null;
  const ix = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / denom;
  const iy = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / denom;
  return { x: jijeokRound(ix), y: jijeokRound(iy) };
};

// --- Main App Component ---
function App() {
  const [activeTab, setActiveTab] = useState(0);
  
  // State for Reference Point (기준점)
  const [refName, setRefName] = useState("강원14");
  const [refX, setRefX] = useState("500471.46");
  const [refY, setRefY] = useState("202320.22");

  // State for Dogwak
  const [baseX, setBaseX] = useState("500471.46");
  const [baseY, setBaseY] = useState("202320.22");
  const [scale, setScale] = useState("1/1000");
  const [origin, setOrigin] = useState("지역");
  const [dogwakPoints, setDogwakPoints] = useState(null);

  // State for Boundary
  const [points, setPoints] = useState([]);
  const [targetX, setTargetX] = useState("500486.78"); // default to 2015점 X
  const [targetY, setTargetY] = useState("202225.71"); // default to 2015점 Y
  const [targetAngle, setTargetAngle] = useState("256-57-38.61");
  const [targetDist, setTargetDist] = useState("85.59");

  // State for Split
  const [splitPoints, setSplitPoints] = useState([]);
  const [sBaseX, setSBaseX] = useState("500486.78"); // default to 2015점 X
  const [sBaseY, setSBaseY] = useState("202225.71"); // default to 2015점 Y
  const [sAngle, setSAngle] = useState("213-26-05.90");
  const [sDist, setSDist] = useState("128.95");
  
  // Selection for Intersection
  const [selSplitIdx, setSelSplitIdx] = useState(0);
  const [selB1Idx, setSelB1Idx] = useState(0);
  const [selB2Idx, setSelB2Idx] = useState(0);
  const [intersections, setIntersections] = useState([]);

  // 계산용 좌표 텍스트 입력창 (CLI의 Entry 대응)
  const [lSplitText, setLSplitText] = useState("");
  const [l1Text, setL1Text] = useState("");
  const [l2Text, setL2Text] = useState("");

  // Sync inputs with Reference Point when it changes
  useEffect(() => {
    setBaseX(refX);
    setBaseY(refY);
  }, [refX, refY]);

  // points나 splitPoints, 인덱스가 바뀔 때 텍스트 필드를 실시간 동기화
  useEffect(() => {
    if (splitPoints.length >= 2 && selSplitIdx < splitPoints.length - 1) {
      const p1 = splitPoints[selSplitIdx];
      const p2 = splitPoints[selSplitIdx + 1];
      if (p1 && p2) {
        setLSplitText(`${p1.x.toFixed(2)},${p1.y.toFixed(2)} / ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`);
      }
    } else {
      setLSplitText("");
    }
  }, [splitPoints, selSplitIdx]);

  useEffect(() => {
    if (points.length > 0) {
      const p1 = points[selB1Idx];
      const p2 = points[(selB1Idx + 1) % points.length];
      if (p1 && p2) {
        setL1Text(`${p1.x.toFixed(2)},${p1.y.toFixed(2)} / ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`);
      }
    } else {
      setL1Text("");
    }
  }, [points, selB1Idx]);

  useEffect(() => {
    if (points.length > 0) {
      const p1 = points[selB2Idx];
      const p2 = points[(selB2Idx + 1) % points.length];
      if (p1 && p2) {
        setL2Text(`${p1.x.toFixed(2)},${p1.y.toFixed(2)} / ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`);
      }
    } else {
      setL2Text("");
    }
  }, [points, selB2Idx]);

  // State for Measurement
  const [jibunA, setJibunA] = useState("3450");
  const [jibunB, setJibunB] = useState("3450-4");
  const [origArea, setOrigArea] = useState("6798");

  // Logic: Dogwak Calculation
  const handleCalcDogwak = () => {
    const x = parseFloat(baseX), y = parseFloat(baseY);
    const [v, h] = SCALE_DATA[scale];
    const ox = origin === "지역" ? 500000 : 600000;
    const oy = 200000;
    const nx = Math.floor((x - ox) / v), ny = Math.floor((y - oy) / h);
    const x2 = (nx + 1) * v + ox, y2 = (ny + 1) * h + oy;
    const x1 = x2 - v, y1 = y2 - h;
    setDogwakPoints({ p1: { x: x1, y: y1 }, p2: { x: x2, y: y2 } });
  };

  // Logic: Add Boundary Point
  const handleAddPoint = () => {
    const bx = parseFloat(targetX), by = parseFloat(targetY), dist = parseFloat(targetDist);
    const rad = parseAngle(targetAngle);
    const nx = jijeokRound(bx + dist * Math.cos(rad));
    const ny = jijeokRound(by + dist * Math.sin(rad));
    setPoints([...points, { x: nx, y: ny }]);
  };

  const loadSample = () => {
    setPoints([
      { x: 453408.09, y: 193846.86 },
      { x: 453389.23, y: 193928.55 },
      { x: 453310.51, y: 193886.67 },
      { x: 453336.46, y: 193764.58 }
    ]);
  };

  // Logic: Add Split Point
  const handleAddSplit = () => {
    const bx = parseFloat(sBaseX), by = parseFloat(sBaseY), dist = parseFloat(sDist);
    const rad = parseAngle(sAngle);
    const nx = jijeokRound(bx + dist * Math.cos(rad));
    const ny = jijeokRound(by + dist * Math.sin(rad));
    setSplitPoints([...splitPoints, { x: nx, y: ny }]);
  };

  const loadSplitSample = () => {
    setSplitPoints([
      { x: 453432.16, y: 193894.02 },
      { x: 453294.45, y: 193824.18 }
    ]);
  };

  // Logic: Intersection Calculation (파싱 방식)
  const handleCalcIntersects = () => {
    try {
      const parseLineText = (s: string) => {
        const l = s.split('/');
        const p = (str: string) => str.replace(/\s+/g, '').split(',').map(Number);
        const [x1, y1] = p(l[0]);
        const [x2, y2] = p(l[1]);
        return { p1: { x: x1, y: y1 }, p2: { x: x2, y: y2 } };
      };

      const lineSplit = parseLineText(lSplitText);
      const lineB1 = parseLineText(l1Text);
      const lineB2 = parseLineText(l2Text);

      const i1 = intersect(lineB1.p1, lineB1.p2, lineSplit.p1, lineSplit.p2);
      const i2 = intersect(lineB2.p1, lineB2.p2, lineSplit.p1, lineSplit.p2);

      const res = [];
      if (i1) res.push({ name: "최종1", ...i1 });
      if (i2) res.push({ name: "최종2", ...i2 });
      setIntersections(res);
    } catch (e) {
      alert("좌표 문자열 파싱 중 오류가 발생했습니다. 'X,Y / X,Y' 형식을 확인해 주세요.");
    }
  };

  // Logic: Measurement Calculation
  const areaResults = useMemo(() => {
    if (points.length < 3) return null;
    const totalArea = calculateArea(points);
    
    if (points.length < 4 || intersections.length < 2) {
      return { totalArea };
    }
    
    const oArea = parseFloat(origArea);
    const M = parseFloat(scale.split('/')[1]);
    
    const m_a = calculateArea([points[0], points[1], intersections[1], intersections[0], points[4]]);
    const m_b = calculateArea([intersections[1], points[2], points[3], intersections[0]]);
    const sum_m = m_a + m_b;
    
    const ae = (0.026**2) * M * Math.sqrt(oArea);
    const diff = oArea - sum_m;
    const status = Math.abs(diff) <= ae ? "적합" : "초과";
    
    const ratio = oArea / sum_m;
    const c_a = m_a * ratio, c_b = m_b * ratio;
    
    let f_a = jijeokFinalRound(c_a), f_b = jijeokFinalRound(c_b);
    if ((f_a + f_b) !== oArea) {
      const d_f = oArea - (f_a + f_b);
      const remA = c_a - Math.floor(c_a);
      const remB = c_b - Math.floor(c_b);
      if (remA >= remB) f_a += Math.round(d_f); else f_b += Math.round(d_f);
    }

    return { m_a, m_b, sum_m, ae, diff, status, c_a, c_b, f_a, f_b, oArea, totalArea };
  }, [points, intersections, origArea, scale]);

  // Logic: DXF Export
  const handleExportDXF = () => {
    let dxf = "0\nSECTION\n2\nENTITIES\n";
    const addLine = (p1, p2, layer, color) => {
      // Mapping: 지적 X(수직) -> CAD Y, 지적 Y(수평) -> CAD X
      dxf += `0\nLINE\n8\n${layer}\n62\n${color}\n10\n${p1.y}\n20\n${p1.x}\n11\n${p2.y}\n21\n${p2.x}\n`;
    };
    
    if (dogwakPoints) {
      const {p1, p2} = dogwakPoints;
      const c = [{x:p1.x, y:p1.y}, {x:p1.x, y:p2.y}, {x:p2.x, y:p2.y}, {x:p2.x, y:p1.y}];
      c.forEach((p, i) => addLine(p, c[(i+1)%4], "DOGWAK", 1));
    }
    points.forEach((p, i) => addLine(p, points[(i+1)%points.length], "BOUNDARY", 5));
    if (intersections.length >= 2) addLine(intersections[0], intersections[1], "SPLIT", 6);
    
    dxf += "0\nENDSEC\n0\nEOF";
    const blob = new Blob([dxf], { type: 'application/dxf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = "지적측량결과.dxf"; a.click();
  };

  // Logic: SVG Drawing Coordinates
  const svgElements = useMemo(() => {
    const allPts = [...points, ...splitPoints, ...intersections];
    if (dogwakPoints) allPts.push(dogwakPoints.p1, dogwakPoints.p2);
    if (allPts.length === 0) return null;

    const xs = allPts.map(p => p.x), ys = allPts.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const padding = 50;
    const W = 450, H = 450;

    const tr = (x, y) => {
      const rx = maxX - minX || 1, ry = maxY - minY || 1;
      const sx = padding + (y - minY) / ry * (W - 2 * padding);
      const sy = H - (padding + (x - minX) / rx * (H - 2 * padding));
      return [sx, sy];
    };

    return (
      <svg viewBox={`0 0 ${W} ${H}`}>
        {/* Dogwak */}
        {dogwakPoints && (() => {
          const {p1, p2} = dogwakPoints;
          const corners = [{x:p1.x, y:p1.y}, {x:p1.x, y:p2.y}, {x:p2.x, y:p2.y}, {x:p2.x, y:p1.y}];
          return corners.map((p, i) => {
            const [x1, y1] = tr(p.x, p.y), [x2, y2] = tr(corners[(i+1)%4].x, corners[(i+1)%4].y);
            return <line key={`d-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="red" strokeDasharray="4 4" />;
          });
        })()}
        {/* Boundary */}
        {points.map((p, i) => {
          const [x1, y1] = tr(p.x, p.y), [x2, y2] = tr(points[(i+1)%points.length].x, points[(i+1)%points.length].y);
          return (
            <g key={`b-${i}`}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#6366f1" strokeWidth="2" />
              <circle cx={x1} cy={y1} r="3" fill="#6366f1" />
              <text x={x1} y={y1-5} fontSize="10" fill="#94a3b8" textAnchor="middle">P{i+1}</text>
            </g>
          );
        })}
        {/* Split Points */}
        {splitPoints.length >= 2 && (() => {
          return (
            <>
              {splitPoints.slice(0, -1).map((p, i) => {
                const [x1, y1] = tr(p.x, p.y), [x2, y2] = tr(splitPoints[i+1].x, splitPoints[i+1].y);
                return <line key={`s-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#f43f5e" strokeWidth="2" />;
              })}
              {splitPoints.map((p, i) => {
                const [x, y] = tr(p.x, p.y);
                return (
                  <g key={`s-lbl-${i}`}>
                    <circle cx={x} cy={y} r="3" fill="#f43f5e" />
                    <text x={x} y={y - 8} fontSize="10" fontWeight="bold" fill="#f59e0b" textAnchor="middle">분{i+1}</text>
                  </g>
                );
              })}
            </>
          );
        })()}
        {/* Intersections */}
        {intersections.map((p, i) => {
          const [x, y] = tr(p.x, p.y);
          return (
            <g key={`i-${i}`}>
              <circle cx={x} cy={y} r="4" fill="black" stroke="white" />
              <text x={x} y={y+15} fontSize="10" fontWeight="bold" fill="#ec4899" textAnchor="middle">{p.name}</text>
            </g>
          );
        })}
      </svg>
    );
  }, [points, splitPoints, intersections, dogwakPoints]);

  return (
    <div className="app-container">
      <header>
        <h1>Jijeok Master Pro</h1>
        <p className="subtitle">지적기능사 실기 통합 자동화 도우미 (Web v1.2)</p>
      </header>

      <main className="main-layout">
        <div className="card">
          <div className="tabs">
            {[
              { icon: <MapPin size={18}/>, label: "기준점" },
              { icon: <Layers size={18}/>, label: "도곽선" },
              { icon: <MapPin size={18}/>, label: "경계선" },
              { icon: <Scissors size={18}/>, label: "분할/교차" },
              { icon: <Ruler size={18}/>, label: "면적측정" },
              { icon: <Download size={18}/>, label: "출력" }
            ].map((t, i) => (
              <button key={i} className={`tab-btn ${activeTab === i ? 'active' : ''}`} onClick={() => setActiveTab(i)}>
                {t.icon} <span>{t.label}</span>
              </button>
            ))}
          </div>

          <div className="tab-content">
            {activeTab === 0 && (
              <div className="form-content">
                <div className="results-panel" style={{marginBottom: '1rem'}}>
                  <p style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>문제지에서 제공한 기준점 명칭과 X, Y 좌표를 입력합니다.</p>
                </div>
                <div className="form-group">
                  <label>기준점 명칭</label>
                  <input type="text" value={refName} onChange={e => setRefName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>기준점 X 좌표</label>
                  <input type="text" value={refX} onChange={e => setRefX(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>기준점 Y 좌표</label>
                  <input type="text" value={refY} onChange={e => setRefY(e.target.value)} />
                </div>
                <div className="results-panel" style={{background: 'rgba(34, 211, 238, 0.1)', borderColor: 'rgba(34, 211, 238, 0.2)'}}>
                  <p style={{fontSize: '0.85rem', fontWeight: '500', color: 'var(--accent)'}}>
                    ℹ️ 입력한 기준점 좌표는 도곽선, 경계선 및 분할/교차 메뉴에서 즉시 연동하여 사용할 수 있습니다.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 1 && (
              <div className="form-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ margin: 0 }}>기준점 좌표 사용</label>
                  <button className="btn-primary" style={{ marginTop: 0, padding: '0.25rem 0.5rem', width: 'auto', fontSize: '0.75rem' }} onClick={() => { setBaseX(refX); setBaseY(refY); }}>
                    기준점 좌표 불러오기
                  </button>
                </div>
                <div className="form-group">
                  <label>원점 X ({refName})</label>
                  <input type="text" value={baseX} onChange={e => setBaseX(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>원점 Y ({refName})</label>
                  <input type="text" value={baseY} onChange={e => setBaseY(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>축척</label>
                  <select value={scale} onChange={e => setScale(e.target.value)}>
                    {Object.keys(SCALE_DATA).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>원점계</label>
                  <select value={origin} onChange={e => setOrigin(e.target.value)}>
                    <option value="지역">지역 (50만)</option>
                    <option value="세계">세계 (60만)</option>
                  </select>
                </div>
                <button className="btn-primary" onClick={handleCalcDogwak}>도곽선 계산 실행</button>
                {dogwakPoints && (
                  <div className="results-panel">
                    <p>P1 (좌하): {dogwakPoints.p1.x.toLocaleString()}, {dogwakPoints.p1.y.toLocaleString()}</p>
                    <p>P2 (우상): {dogwakPoints.p2.x.toLocaleString()}, {dogwakPoints.p2.y.toLocaleString()}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 2 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ margin: 0 }}>기지점 입력 좌표</label>
                  <button className="btn-primary" style={{ marginTop: 0, padding: '0.25rem 0.5rem', width: 'auto', fontSize: '0.75rem' }} onClick={() => { setTargetX(refX); setTargetY(refY); }}>
                    기준점 ({refName}) 좌표로 변경
                  </button>
                </div>
                <div className="form-group">
                  <label>기지점 X</label>
                  <input type="text" value={targetX} onChange={e => setTargetX(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>기지점 Y</label>
                  <input type="text" value={targetY} onChange={e => setTargetY(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>방위각 (D-M-S)</label>
                  <input type="text" value={targetAngle} onChange={e => setTargetAngle(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>거리 (m)</label>
                  <input type="text" value={targetDist} onChange={e => setTargetDist(e.target.value)} />
                </div>
                <div style={{display: 'flex', gap: '0.5rem'}}>
                  <button className="btn-primary" onClick={handleAddPoint}>점 추가</button>
                  <button className="btn-primary" style={{background: '#334155'}} onClick={() => {
                    setTargetX("500486.78");
                    setTargetY("202225.71");
                    setPoints([
                      { x: 500467.47, y: 202142.33 },
                      { x: 500462.24, y: 202198.01 },
                      { x: 500408.36, y: 202244.33 },
                      { x: 500363.75, y: 202179.46 },
                      { x: 500410.23, y: 202139.30 }
                    ]);
                  }}>샘플 로드</button>
                </div>
                <table>
                  <thead><tr><th>No.</th><th>X</th><th>Y</th></tr></thead>
                  <tbody>
                    {points.map((p, i) => (
                      <tr key={i}><td>{i+1}</td><td>{p.x.toFixed(2)}</td><td>{p.y.toFixed(2)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 3 && (
              <div>
                <div className="results-panel" style={{marginBottom: '1rem'}}>
                  <p style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>보조 분할점을 먼저 추가한 후, 경계선과의 교차점을 계산합니다.</p>
                </div>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ margin: 0 }}>기지점 X / Y</label>
                    <button className="btn-primary" style={{ marginTop: 0, padding: '0.2rem 0.4rem', width: 'auto', fontSize: '0.7rem' }} onClick={() => { setSBaseX(refX); setSBaseY(refY); }}>
                      기준점 좌표 적용
                    </button>
                  </div>
                  <div style={{display:'flex', gap:'0.5rem'}}>
                    <input type="text" placeholder="453405.55" value={sBaseX} onChange={e => setSBaseX(e.target.value)} />
                    <input type="text" placeholder="193726.90" value={sBaseY} onChange={e => setSBaseY(e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label>보조점 방위각 (D-M-S) / 거리 (m)</label>
                  <div style={{display:'flex', gap:'0.5rem'}}>
                    <input type="text" placeholder="80-57-10.5" value={sAngle} onChange={e => setSAngle(e.target.value)} />
                    <input type="text" placeholder="169.23" value={sDist} onChange={e => setSDist(e.target.value)} />
                  </div>
                </div>
                <div style={{display: 'flex', gap: '0.5rem', marginBottom: '1rem'}}>
                  <button className="btn-primary" onClick={handleAddSplit}>보조점 추가</button>
                  <button className="btn-primary" style={{background: '#334155'}} onClick={() => {
                    setSBaseX("500486.78");
                    setSBaseY("202225.71");
                    setSplitPoints([
                      { x: 500379.17, y: 202154.66 },
                      { x: 500434.35, y: 202241.78 }
                    ]);
                  }}>샘플 로드</button>
                </div>
                {splitPoints.length > 0 && (
                  <table style={{marginBottom: '1.5rem'}}>
                    <thead><tr><th>No.</th><th>X</th><th>Y</th></tr></thead>
                    <tbody>
                      {splitPoints.map((p, i) => (
                        <tr key={i}><td>분{i+1}</td><td>{p.x.toFixed(2)}</td><td>{p.y.toFixed(2)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <div className="form-group" style={{marginTop: '1.5rem'}}>
                  <label>① 공통 분할선 선택</label>
                  <select value={selSplitIdx} onChange={e => setSelSplitIdx(parseInt(e.target.value))}>
                    {splitPoints.length >= 2 && splitPoints.slice(0,-1).map((_, i) => <option key={i} value={i}>분할선 분{i+1}-분{i+2}</option>)}
                  </select>
                  <input type="text" value={lSplitText} onChange={e => setLSplitText(e.target.value)} style={{color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.4)', borderRadius: '6px', padding: '0.5rem', width: '100%', marginTop: '0.35rem', background: 'rgba(15, 23, 42, 0.6)', fontSize: '0.875rem'}} />
                </div>
                <div className="form-group">
                  <label>② 교차점 1 경계 선택</label>
                  <select value={selB1Idx} onChange={e => setSelB1Idx(parseInt(e.target.value))}>
                    {points.map((_, i) => <option key={i} value={i}>경계 {i+1}-{i === points.length-1 ? 1 : i+2}</option>)}
                  </select>
                  <input type="text" value={l1Text} onChange={e => setL1Text(e.target.value)} style={{color: '#6366f1', border: '1px solid rgba(99, 102, 241, 0.4)', borderRadius: '6px', padding: '0.5rem', width: '100%', marginTop: '0.35rem', background: 'rgba(15, 23, 42, 0.6)', fontSize: '0.875rem'}} />
                </div>
                <div className="form-group">
                  <label>③ 교차점 2 경계 선택</label>
                  <select value={selB2Idx} onChange={e => setSelB2Idx(parseInt(e.target.value))}>
                    {points.map((_, i) => <option key={i} value={i}>경계 {i+1}-{i === points.length-1 ? 1 : i+2}</option>)}
                  </select>
                  <input type="text" value={l2Text} onChange={e => setL2Text(e.target.value)} style={{color: '#6366f1', border: '1px solid rgba(99, 102, 241, 0.4)', borderRadius: '6px', padding: '0.5rem', width: '100%', marginTop: '0.35rem', background: 'rgba(15, 23, 42, 0.6)', fontSize: '0.875rem'}} />
                </div>
                <button className="btn-primary" onClick={handleCalcIntersects}>최종 교차점 계산</button>
                {intersections.length > 0 && (
                  <div className="results-panel">
                    {intersections.map((it, i) => (
                      <p key={i}>{it.name}: X={it.x.toFixed(2)}, Y={it.y.toFixed(2)}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 4 && (
              <div>
                <div className="results-panel" style={{marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem'}}>
                  <div className="form-group" style={{marginBottom: 0}}>
                    <label style={{fontSize: '0.8rem'}}>원지번</label>
                    <input type="text" value={jibunA} onChange={e => setJibunA(e.target.value)} style={{padding: '0.25rem 0.5rem', fontSize: '0.9rem'}} />
                  </div>
                  <div className="form-group" style={{marginBottom: 0}}>
                    <label style={{fontSize: '0.8rem'}}>분할지번</label>
                    <input type="text" value={jibunB} onChange={e => setJibunB(e.target.value)} style={{padding: '0.25rem 0.5rem', fontSize: '0.9rem'}} />
                  </div>
                  <div className="form-group" style={{marginBottom: 0}}>
                    <label style={{fontSize: '0.8rem'}}>공부상 원면적 (㎡)</label>
                    <input type="text" value={origArea} onChange={e => setOrigArea(e.target.value)} style={{padding: '0.25rem 0.5rem', fontSize: '0.9rem'}} />
                  </div>
                </div>

                {areaResults ? (
                  <div>
                    <table>
                      <thead>
                        <tr>
                          <th>지번</th>
                          <th>측정면적</th>
                          <th>보정계수</th>
                          <th>원면적</th>
                          <th>산출면적</th>
                          <th>결정면적</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>{jibunA}</td>
                          <td>{areaResults.m_a.toFixed(2)}</td>
                          <td style={{ color: 'var(--error)', fontWeight: 'bold' }}>1.0000</td>
                          <td>{origArea}</td>
                          <td>{areaResults.c_a.toFixed(2)}</td>
                          <td><strong>{areaResults.f_a}</strong></td>
                        </tr>
                        <tr>
                          <td>{jibunB}</td>
                          <td>{areaResults.m_b.toFixed(2)}</td>
                          <td>-</td>
                          <td>{origArea}</td>
                          <td>{areaResults.c_b.toFixed(2)}</td>
                          <td><strong>{areaResults.f_b}</strong></td>
                        </tr>
                        <tr style={{borderTop: '2px solid var(--primary)'}}>
                          <td>합계</td>
                          <td>{areaResults.sum_m.toFixed(2)}</td>
                          <td>-</td>
                          <td>{origArea}</td>
                          <td>{areaResults.oArea.toFixed(2)}</td>
                          <td>{areaResults.oArea}</td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="results-panel" style={{marginTop: '2rem', borderLeft: `5px solid ${areaResults.status === "적합" ? 'var(--success)' : 'var(--error)'}`}}>
                      <p>▶ 허용공차(Ae): ±{areaResults.ae.toFixed(4)} ㎡</p>
                      <p>▶ 실제오차: {areaResults.diff.toFixed(4)} ㎡</p>
                      <p style={{fontWeight:'bold', fontSize: '1.2rem', color: areaResults.status === "적합" ? 'var(--success)' : 'var(--error)'}}>판정: {areaResults.status}</p>
                    </div>
                  </div>
                ) : (
                  <p style={{textAlign:'center', padding:'2rem', color: 'var(--text-muted)'}}>경계점과 교차점 계산이 완료되어야 면적을 측정할 수 있습니다.</p>
                )}
              </div>
            )}

            {activeTab === 5 && (
              <div style={{textAlign: 'center', padding: '2rem'}}>
                <Download size={48} color="var(--primary)" style={{marginBottom: '1rem'}} />
                <h3>CAD 데이터 내보내기</h3>
                <p style={{color:'var(--text-muted)', marginBottom: '2rem'}}>현재까지 계산된 모든 좌표를 DXF 형식으로 다운로드합니다.</p>
                <button className="btn-primary" onClick={handleExportDXF}>
                  DXF 파일 저장
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="map-container" style={{ display: 'flex', flexDirection: 'column', height: 'auto', minHeight: '520px' }}>
          <div style={{ flex: 1, minHeight: '430px', position: 'relative' }}>
            {svgElements ? svgElements : (
              <div style={{display:'flex', height:'100%', alignItems:'center', justifyContent:'center', color:'#ccc'}}>
                좌표를 입력하면 도면이 여기에 표시됩니다.
              </div>
            )}
          </div>
          <div style={{ background: '#1e293b', borderTop: '2px solid var(--border)', padding: '1rem', color: 'white', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--accent)', fontWeight: 'bold' }}>📍 실시간 도면 면적 정보</h4>
            {areaResults ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem' }}>
                {areaResults.m_a !== undefined ? (
                  <>
                    <div>
                      <p><span style={{ color: 'var(--text-muted)' }}>{jibunA} (측정):</span> <strong>{areaResults.m_a.toFixed(2)} ㎡</strong></p>
                      <p><span style={{ color: 'var(--text-muted)' }}>{jibunA} (결정):</span> <strong style={{ color: 'var(--success)' }}>{areaResults.f_a} ㎡</strong></p>
                    </div>
                    <div>
                      <p><span style={{ color: 'var(--text-muted)' }}>{jibunB} (측정):</span> <strong>{areaResults.m_b.toFixed(2)} ㎡</strong></p>
                      <p><span style={{ color: 'var(--text-muted)' }}>{jibunB} (결정):</span> <strong style={{ color: 'var(--success)' }}>{areaResults.f_b} ㎡</strong></p>
                    </div>
                    <div style={{ gridColumn: 'span 2', borderTop: '1px dashed var(--border)', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>측정 합계: <strong>{areaResults.sum_m.toFixed(2)} ㎡</strong> (공부: {areaResults.oArea} ㎡)</span>
                      <span style={{ fontWeight: 'bold', color: areaResults.status === "적합" ? 'var(--success)' : 'var(--error)' }}>
                        판정: {areaResults.status} ({areaResults.diff.toFixed(4)} ㎡)
                      </span>
                    </div>
                  </>
                ) : (
                  <div style={{ gridColumn: 'span 2' }}>
                    <p>전체 경계면적 (측정): <strong style={{ color: 'var(--accent)', fontSize: '1rem' }}>{areaResults.totalArea.toFixed(2)} ㎡</strong></p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      💡 '분할/교차' 탭에서 최종 교차점 계산을 완료하면 필지별 분할 면적이 계산됩니다.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                경계점(최소 3개 이상)을 입력하면 전체 경계면적이 계산됩니다.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
