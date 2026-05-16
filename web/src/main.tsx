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
const jijeokRound = (val, ndigits = 2) => Number(val.toFixed(ndigits));

const jijeokFinalRound = (val) => {
  const floorVal = Math.floor(val);
  const remainder = val - floorVal;
  if (remainder > 0.5) return floorVal + 1;
  if (remainder < 0.5) return floorVal;
  return floorVal % 2 === 0 ? floorVal : floorVal + 1;
};

const calculateArea = (pts) => {
  let area = 0;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += pts[i].y * pts[j].x;
    area -= pts[j].y * pts[i].x;
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
  
  // State for Dogwak
  const [baseX, setBaseX] = useState("453405.55");
  const [baseY, setBaseY] = useState("193726.90");
  const [scale, setScale] = useState("1/1200");
  const [origin, setOrigin] = useState("지역");
  const [dogwakPoints, setDogwakPoints] = useState(null);

  // State for Boundary
  const [points, setPoints] = useState([]);
  const [targetX, setTargetX] = useState("453405.55");
  const [targetY, setTargetY] = useState("193726.90");
  const [targetAngle, setTargetAngle] = useState("88-47-13.26");
  const [targetDist, setTargetDist] = useState("119.99");

  // State for Split
  const [splitPoints, setSplitPoints] = useState([]);
  const [sBaseX, setSBaseX] = useState("453405.55");
  const [sBaseY, setSBaseY] = useState("193726.90");
  const [sAngle, setSAngle] = useState("80-57-10.5");
  const [sDist, setSDist] = useState("169.23");
  
  // Selection for Intersection
  const [selSplitIdx, setSelSplitIdx] = useState(0);
  const [selB1Idx, setSelB1Idx] = useState(0);
  const [selB2Idx, setSelB2Idx] = useState(0);
  const [intersections, setIntersections] = useState([]);

  // State for Measurement
  const [jibunA, setJibunA] = useState("1164");
  const [jibunB, setJibunB] = useState("1164-4");
  const [origArea, setOrigArea] = useState("9034");

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

  // Logic: Intersection Calculation
  const handleCalcIntersects = () => {
    if (splitPoints.length < 2 || points.length < 2) return;
    const sp1 = splitPoints[selSplitIdx], sp2 = splitPoints[selSplitIdx + 1];
    
    const b1_p1 = points[selB1Idx], b1_p2 = points[(selB1Idx + 1) % points.length];
    const b2_p1 = points[selB2Idx], b2_p2 = points[(selB2Idx + 1) % points.length];
    
    const i1 = intersect(b1_p1, b1_p2, sp1, sp2);
    const i2 = intersect(b2_p1, b2_p2, sp1, sp2);
    
    const res = [];
    if (i1) res.push({ name: "최종1", ...i1 });
    if (i2) res.push({ name: "최종2", ...i2 });
    setIntersections(res);
  };

  // Logic: Measurement Calculation
  const areaResults = useMemo(() => {
    if (points.length < 4 || intersections.length < 2) return null;
    const oArea = parseFloat(origArea);
    const M = parseFloat(scale.split('/')[1]);
    
    const m_a = calculateArea([points[0], intersections[0], intersections[1], points[3]]);
    const m_b = calculateArea([intersections[0], points[1], points[2], intersections[1]]);
    const sum_m = m_a + m_b;
    
    const ae = (0.026**2) * M * Math.sqrt(oArea);
    const diff = oArea - sum_m;
    const status = Math.abs(diff) <= ae ? "적합" : "초과";
    
    const ratio = oArea / sum_m;
    const c_a = m_a * ratio, c_b = m_b * ratio;
    
    let f_a = jijeokFinalRound(c_a), f_b = jijeokFinalRound(c_b);
    if ((f_a + f_b) !== oArea) {
      const d_f = oArea - (f_a + f_b);
      if ((c_a % 1) >= (c_b % 1)) f_a += d_f; else f_b += d_f;
    }

    return { m_a, m_b, sum_m, ae, diff, status, c_a, c_b, f_a, f_b, oArea };
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
        {splitPoints.length >= 2 && splitPoints.slice(0, -1).map((p, i) => {
          const [x1, y1] = tr(p.x, p.y), [x2, y2] = tr(splitPoints[i+1].x, splitPoints[i+1].y);
          return <line key={`s-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#f43f5e" strokeWidth="2" />;
        })}
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
        <p className="subtitle">지적기능사 실기 통합 자동화 도우미 (Web v1.0)</p>
      </header>

      <main className="main-layout">
        <div className="card">
          <div className="tabs">
            {[
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
                <div className="form-group">
                  <label>기준점 X</label>
                  <input type="text" value={baseX} onChange={e => setBaseX(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>기준점 Y</label>
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
                <button className="btn-primary" onClick={handleCalcDogwak}>도곽 좌표 계산</button>
                {dogwakPoints && (
                  <div className="results-panel">
                    <p>P1 (좌하): {dogwakPoints.p1.x.toLocaleString()}, {dogwakPoints.p1.y.toLocaleString()}</p>
                    <p>P2 (우상): {dogwakPoints.p2.x.toLocaleString()}, {dogwakPoints.p2.y.toLocaleString()}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 1 && (
              <div>
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
                  <button className="btn-primary" style={{background: '#334155'}} onClick={loadSample}>샘플 로드</button>
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

            {activeTab === 2 && (
              <div>
                <div className="results-panel" style={{marginBottom: '1rem'}}>
                  <p style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>보조 분할점을 먼저 추가한 후, 경계선과의 교차점을 계산합니다.</p>
                </div>
                <div className="form-group">
                  <label>보조점 방위각/거리</label>
                  <div style={{display:'flex', gap:'0.5rem'}}>
                    <input type="text" placeholder="80-57-10.5" value={sAngle} onChange={e => setSAngle(e.target.value)} />
                    <input type="text" placeholder="169.23" value={sDist} onChange={e => setSDist(e.target.value)} />
                  </div>
                </div>
                <div style={{display: 'flex', gap: '0.5rem'}}>
                  <button className="btn-primary" onClick={handleAddSplit}>보조점 추가</button>
                  <button className="btn-primary" style={{background: '#334155'}} onClick={loadSplitSample}>샘플 로드</button>
                </div>
                <div className="form-group" style={{marginTop: '1.5rem'}}>
                  <label>① 공통 분할선 선택</label>
                  <select onChange={e => setSelSplitIdx(parseInt(e.target.value))}>
                    {splitPoints.length >= 2 && splitPoints.slice(0,-1).map((_, i) => <option key={i} value={i}>분할선 분{i+1}-분{i+2}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>② 교차점 1 경계 선택</label>
                  <select onChange={e => setSelB1Idx(parseInt(e.target.value))}>
                    {points.map((_, i) => <option key={i} value={i}>경계 {i+1}-{i === points.length-1 ? 1 : i+2}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>③ 교차점 2 경계 선택</label>
                  <select onChange={e => setSelB2Idx(parseInt(e.target.value))}>
                    {points.map((_, i) => <option key={i} value={i}>경계 {i+1}-{i === points.length-1 ? 1 : i+2}</option>)}
                  </select>
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

            {activeTab === 3 && areaResults && (
              <div>
                <table>
                  <thead>
                    <tr><th>지번</th><th>측정면적</th><th>산출면적</th><th>결정면적</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>{jibunA}</td><td>{areaResults.m_a.toFixed(2)}</td><td>{areaResults.c_a.toFixed(2)}</td><td><strong>{areaResults.f_a}</strong></td></tr>
                    <tr><td>{jibunB}</td><td>{areaResults.m_b.toFixed(2)}</td><td>{areaResults.c_b.toFixed(2)}</td><td><strong>{areaResults.f_b}</strong></td></tr>
                    <tr style={{borderTop: '2px solid var(--primary)'}}>
                      <td>합계</td><td>{areaResults.sum_m.toFixed(2)}</td><td>{areaResults.oArea.toFixed(2)}</td><td>{areaResults.oArea}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="results-panel" style={{marginTop: '2rem', borderLeft: `5px solid ${areaResults.status === "적합" ? 'var(--success)' : 'var(--error)'}`}}>
                  <p>▶ 허용공차(Ae): ±{areaResults.ae.toFixed(4)} ㎡</p>
                  <p>▶ 실제오차: {areaResults.diff.toFixed(4)} ㎡</p>
                  <p style={{fontWeight:'bold', fontSize: '1.2rem', color: areaResults.status === "적합" ? 'var(--success)' : 'var(--error)'}}>판정: {areaResults.status}</p>
                </div>
              </div>
            )}
            
            {activeTab === 3 && !areaResults && (
              <p style={{textAlign:'center', padding:'2rem', color: 'var(--text-muted)'}}>경계점과 교차점 계산이 완료되어야 면적을 측정할 수 있습니다.</p>
            )}

            {activeTab === 4 && (
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

        <div className="map-container">
          {svgElements ? svgElements : (
            <div style={{display:'flex', height:'100%', alignItems:'center', justifyContent:'center', color:'#ccc'}}>
              좌표를 입력하면 도면이 여기에 표시됩니다.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
