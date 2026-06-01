import tkinter as tk
from tkinter import ttk, messagebox
import math

# ==========================================
# 지적기능사 통합 자동화 도우미 (v2.4)
# ==========================================
SCALE_DATA = {
    "1/500": (150, 200), "1/600": (200, 250), "1/1000": (300, 400),
    "1/1200": (400, 500), "1/2400": (800, 1000), "1/3000": (1200, 1500),
    "1/6000": (2400, 3000)
}

class JijeokApp:
    def __init__(self, root):
        self.root = root
        self.root.title("지적기능사 통합 자동화 도우미 (v2.4)")
        self.root.geometry("1100x900")
        
        self.data = {
            "dogwak": {"p1": None, "p2": None},
            "points": [],
            "split_points": [],
            "intersections": []
        }
        
        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(fill='both', expand=True, padx=10, pady=10)
        
        self.init_tab1() # 도곽선
        self.init_tab2() # 경계선
        self.init_tab3() # 분할/교차점
        self.init_tab4() # 면적측정부
        self.init_tab5() # DXF/설정
        
        self.notebook.bind("<<NotebookTabChanged>>", self.on_tab_changed)

    def on_tab_changed(self, event):
        idx = self.notebook.index("current")
        if idx == 2: self.refresh_lists()
        elif idx == 3: self.update_areas()

    def jijeok_round(self, value, ndigits=2):
        return round(value, ndigits)

    def jijeok_final_round(self, val):
        # 지적 5사5입 (0.5일 때 끝자리가 짝수면 버림, 홀수면 올림)
        floor_val = math.floor(val)
        remainder = val - floor_val
        if remainder > 0.5: return floor_val + 1
        elif remainder < 0.5: return floor_val
        else: return floor_val if floor_val % 2 == 0 else floor_val + 1

    def calculate_area(self, pts):
        if len(pts) < 3: return 0.0
        ref_x = pts[0]['x']
        ref_y = pts[0]['y']
        area = 0.0; n = len(pts)
        for i in range(n):
            j = (i + 1) % n
            xi = pts[i]['x'] - ref_x
            yi = pts[i]['y'] - ref_y
            xj = pts[j]['x'] - ref_x
            yj = pts[j]['y'] - ref_y
            area += yi * xj - yj * xi
        return abs(area) / 2.0

    # ------------------------------------------
    # Tab 1: 도곽선
    # ------------------------------------------
    def init_tab1(self):
        tab = ttk.Frame(self.notebook); self.notebook.add(tab, text="1. 도곽선")
        f = ttk.LabelFrame(tab, text="지적기준점 및 축척 설정"); f.pack(fill='x', padx=15, pady=15)
        ttk.Label(f, text="기준점 X:").grid(row=0, column=0, padx=5, pady=5)
        self.ent_x = ttk.Entry(f); self.ent_x.insert(0, "453405.55"); self.ent_x.grid(row=0, column=1)
        ttk.Label(f, text="기준점 Y:").grid(row=1, column=0, padx=5, pady=5)
        self.ent_y = ttk.Entry(f); self.ent_y.insert(0, "193726.90"); self.ent_y.grid(row=1, column=1)
        self.cb_scale = ttk.Combobox(f, values=list(SCALE_DATA.keys()), state="readonly"); self.cb_scale.set("1/1200"); self.cb_scale.grid(row=2, column=1)
        self.origin_var = tk.StringVar(value="지역")
        ttk.Radiobutton(f, text="지역(50만)", variable=self.origin_var, value="지역").grid(row=3, column=0)
        ttk.Radiobutton(f, text="세계(60만)", variable=self.origin_var, value="세계").grid(row=3, column=1)
        ttk.Button(tab, text="도곽 좌표 계산", command=self.calc_dogwak).pack(pady=10)
        self.lbl_p1 = ttk.Label(tab, text="좌하 P1: -", font=("Arial", 11)); self.lbl_p1.pack()
        self.lbl_p2 = ttk.Label(tab, text="우상 P2: -", font=("Arial", 11)); self.lbl_p2.pack()

    def calc_dogwak(self):
        try:
            x_in, y_in = float(self.ent_x.get()), float(self.ent_y.get())
            v, h = SCALE_DATA[self.cb_scale.get()]
            ox, oy = (500000, 200000) if self.origin_var.get() == "지역" else (600000, 200000)
            nx, ny = math.floor((x_in-ox)/v), math.floor((y_in-oy)/h)
            x2, y2 = (nx+1)*v+ox, (ny+1)*h+oy
            x1, y1 = x2-v, y2-h
            self.data["dogwak"] = {"p1": (x1,y1), "p2": (x2,y2)}
            self.lbl_p1.config(text=f"좌하 P1: {x1:,.2f}, {y1:,.2f}"); self.lbl_p2.config(text=f"우상 P2: {x2:,.2f}, {y2:,.2f}")
        except: pass

    # ------------------------------------------
    # Tab 2: 경계선
    # ------------------------------------------
    def init_tab2(self):
        tab = ttk.Frame(self.notebook); self.notebook.add(tab, text="2. 경계선")
        f = ttk.LabelFrame(tab, text="경계점 입력"); f.pack(fill='x', padx=15, pady=10)
        r1 = ttk.Frame(f); r1.pack(fill='x', pady=2)
        ttk.Label(r1, text="기지점 X:").pack(side='left'); self.ent_p_x = ttk.Entry(r1, width=15); self.ent_p_x.insert(0, "453405.55"); self.ent_p_x.pack(side='left', padx=5)
        ttk.Label(r1, text="Y:").pack(side='left'); self.ent_p_y = ttk.Entry(r1, width=15); self.ent_p_y.insert(0, "193726.90"); self.ent_p_y.pack(side='left', padx=5)
        r2 = ttk.Frame(f); r2.pack(fill='x', pady=2)
        ttk.Label(r2, text="방위각:").pack(side='left'); self.ent_angle = ttk.Entry(r2, width=15); self.ent_angle.insert(0, "88-47-13.26"); self.ent_angle.pack(side='left', padx=5)
        ttk.Label(r2, text="거리:").pack(side='left'); self.ent_dist = ttk.Entry(r2, width=10); self.ent_dist.insert(0, "119.99"); self.ent_dist.pack(side='left', padx=5)
        b_f = ttk.Frame(tab); b_f.pack(fill='x', padx=15)
        ttk.Button(b_f, text="경계점 추가", command=self.add_point).pack(side='left', padx=5)
        ttk.Button(b_f, text="시험샘플 로드", command=self.load_p_sample).pack(side='left', padx=5)
        self.tree_p = ttk.Treeview(tab, columns=("n", "x", "y"), show='headings', height=8)
        for c, h in zip(("n", "x", "y"), ("번호", "X", "Y")): self.tree_p.heading(c, text=h); self.tree_p.column(c, width=120)
        self.tree_p.pack(fill='both', expand=True, padx=15, pady=10)

    def add_point(self, sample=None):
        try:
            if sample: nx, ny = sample
            else:
                bx, by, ang, dist = float(self.ent_p_x.get()), float(self.ent_p_y.get()), self.ent_angle.get(), float(self.ent_dist.get())
                parts = ang.split('-'); d, m, s = [float(p) for p in parts]
                rad = math.radians(d + m/60 + s/3600)
                nx, ny = self.jijeok_round(bx + dist*math.cos(rad)), self.jijeok_round(by + dist*math.sin(rad))
            self.data["points"].append({"x": nx, "y": ny})
            self.tree_p.insert("", "end", values=(len(self.data["points"]), f"{nx:.2f}", f"{ny:.2f}"))
            # 방사법을 위해 기지점 좌표를 초기화하지 않고 유지함 (필요시 사용자가 수동 수정)
        except: pass

    def load_p_sample(self):
        self.data["points"] = []; [self.tree_p.delete(i) for i in self.tree_p.get_children()]
        # 방사법으로 계산된 정확한 9049.66㎡용 좌표 샘플
        pts = [(453408.09, 193846.86), (453389.23, 193928.55), (453310.51, 193886.67), (453336.46, 193764.58)]
        for p in pts: self.data["points"].append({"x": p[0], "y": p[1]}); self.tree_p.insert("", "end", values=(len(self.data["points"]), f"{p[0]:.2f}", f"{p[1]:.2f}"))
        self.refresh_lists()

    # ------------------------------------------
    # Tab 3: 분할 및 교차점
    # ------------------------------------------
    def init_tab3(self):
        tab = ttk.Frame(self.notebook); self.notebook.add(tab, text="3. 분할/교차점")
        s_f = ttk.LabelFrame(tab, text="[단계 1] 분할 보조점 계산"); s_f.pack(fill='x', padx=15, pady=5)
        r1 = ttk.Frame(s_f); r1.pack(fill='x', pady=2)
        ttk.Label(r1, text="X:").pack(side='left'); self.ent_s_x = ttk.Entry(r1, width=12); self.ent_s_x.insert(0, "453405.55"); self.ent_s_x.pack(side='left', padx=2)
        ttk.Label(r1, text="Y:").pack(side='left'); self.ent_s_y = ttk.Entry(r1, width=12); self.ent_s_y.insert(0, "193726.90"); self.ent_s_y.pack(side='left', padx=2)
        ttk.Label(r1, text="방위각:").pack(side='left'); self.ent_s_ang = ttk.Entry(r1, width=12); self.ent_s_ang.insert(0, "80-57-10.5"); self.ent_s_ang.pack(side='left', padx=2)
        ttk.Label(r1, text="거리:").pack(side='left'); self.ent_s_dst = ttk.Entry(r1, width=10); self.ent_s_dst.insert(0, "169.23"); self.ent_s_dst.pack(side='left', padx=2)
        btn_s = ttk.Frame(s_f); btn_s.pack(fill='x', pady=5)
        ttk.Button(btn_s, text="보조점 추가", command=self.add_split).pack(side='left', padx=5)
        ttk.Button(btn_s, text="샘플 로드", command=self.load_split_sample).pack(side='left', padx=5)
        self.tree_s = ttk.Treeview(s_f, columns=("n", "x", "y"), show='headings', height=2)
        for c, h in zip(("n", "x", "y"), ("번호", "X", "Y")): self.tree_s.heading(c, text=h); self.tree_s.column(c, width=100)
        self.tree_s.pack(fill='x', padx=10, pady=5)
        
        i_f = ttk.LabelFrame(tab, text="[단계 2] 최종 교차점 산출 (동시)"); i_f.pack(fill='both', expand=True, padx=15, pady=5)
        main_c = ttk.Frame(i_f); main_c.pack(fill='both', expand=True)
        left_f = ttk.Frame(main_c); left_f.pack(side='left', fill='y', padx=10)
        ttk.Label(left_f, text="① 공통 분할선:").pack(anchor='w'); self.cb_s = ttk.Combobox(left_f, width=30, state="readonly"); self.cb_s.pack(anchor='w', pady=2)
        self.ent_l_split = ttk.Entry(left_f, width=45, foreground="red"); self.ent_l_split.pack(pady=2)
        self.cb_s.bind("<<ComboboxSelected>>", self.on_sel_s)
        ttk.Separator(left_f, orient='horizontal').pack(fill='x', pady=10)
        ttk.Label(left_f, text="② 교차점 1 경계:").pack(anchor='w'); self.cb_b1 = ttk.Combobox(left_f, width=30, state="readonly"); self.cb_b1.pack(anchor='w', pady=2)
        self.ent_l1 = ttk.Entry(left_f, width=45, foreground="blue"); self.ent_l1.pack(pady=2)
        self.cb_b1.bind("<<ComboboxSelected>>", lambda e: self.on_sel_b(1))
        ttk.Label(left_f, text="③ 교차점 2 경계:").pack(anchor='w'); self.cb_b2 = ttk.Combobox(left_f, width=30, state="readonly"); self.cb_b2.pack(anchor='w', pady=2)
        self.ent_l2 = ttk.Entry(left_f, width=45, foreground="blue"); self.ent_l2.pack(pady=2)
        self.cb_b2.bind("<<ComboboxSelected>>", lambda e: self.on_sel_b(2))
        ttk.Button(left_f, text="최종 교차점 동시 계산", command=self.calc_dual_intersect).pack(pady=10)
        self.lbl_res1 = ttk.Label(left_f, text="최종1: -", font=("Consolas", 10, "bold"), foreground="purple"); self.lbl_res1.pack(anchor='w')
        self.lbl_res2 = ttk.Label(left_f, text="최종2: -", font=("Consolas", 10, "bold"), foreground="purple"); self.lbl_res2.pack(anchor='w')
        self.canv = tk.Canvas(main_c, bg="white", width=450, height=450); self.canv.pack(side='right', fill='both', expand=True)

    def add_split(self, sample=None):
        try:
            if sample: bx, by, ang, dist = sample
            else: bx, by, ang, dist = float(self.ent_s_x.get()), float(self.ent_s_y.get()), self.ent_s_ang.get(), float(self.ent_s_dst.get())
            parts = ang.split('-'); d, m, s = [float(p) for p in parts]
            rad = math.radians(d + m/60 + s/3600)
            nx, ny = self.jijeok_round(bx + dist*math.cos(rad)), self.jijeok_round(by + dist*math.sin(rad))
            self.data["split_points"].append({"x": nx, "y": ny})
            self.tree_s.insert("", "end", values=(f"분{len(self.data['split_points'])}", f"{nx:.2f}", f"{ny:.2f}"))
        except: pass

    def load_split_sample(self):
        self.data["split_points"] = []; [self.tree_s.delete(i) for i in self.tree_s.get_children()]
        pts = [(453432.16, 193894.02), (453294.45, 193824.18)]
        for p in pts: self.data["split_points"].append({"x": p[0], "y": p[1]}); self.tree_s.insert("", "end", values=(f"분{len(self.data['split_points'])}", f"{p[0]:.2f}", f"{p[1]:.2f}"))
        self.refresh_lists()

    def refresh_lists(self):
        pts, spts = self.data["points"], self.data["split_points"]
        b_vals = [f"경계 {i+1}-{i+2}" for i in range(len(pts)-1)] + [f"경계 {len(pts)}-1"] if len(pts)>1 else []
        self.cb_b1['values'] = b_vals; self.cb_b2['values'] = b_vals
        l_s = [f"분할선 분{i+1}-분{i+2}" for i in range(len(spts)-1)] if len(spts)>1 else []
        self.cb_s['values'] = l_s
        self.draw_map()

    def on_sel_s(self, e):
        idx, spts = self.cb_s.current(), self.data["split_points"]
        p1, p2 = spts[idx], spts[idx+1]
        self.ent_l_split.delete(0, tk.END); self.ent_l_split.insert(0, f"{p1['x']:.2f},{p1['y']:.2f} / {p2['x']:.2f},{p2['y']:.2f}")
        self.draw_map()

    def on_sel_b(self, mode):
        cb = self.cb_b1 if mode == 1 else self.cb_b2
        ent = self.ent_l1 if mode == 1 else self.ent_l2
        idx, pts = cb.current(), self.data["points"]
        p1, p2 = pts[idx], pts[0 if idx == len(pts)-1 else idx+1]
        ent.delete(0, tk.END); ent.insert(0, f"{p1['x']:.2f},{p1['y']:.2f} / {p2['x']:.2f},{p2['y']:.2f}")
        self.draw_map()

    def calc_dual_intersect(self):
        try:
            def intersect(l1_s, l2_s):
                def p(s): return [float(x) for x in s.replace(' ', '').split(',')]
                l1, l2 = l1_s.split('/'), l2_s.split('/')
                x1, y1 = p(l1[0]); x2, y2 = p(l1[1]); x3, y3 = p(l2[0]); x4, y4 = p(l2[1])
                denom = (x1-x2)*(y3-y4) - (y1-y2)*(x3-x4)
                if denom == 0: return None
                ix = ((x1*y2 - y1*x2)*(x3-x4) - (x1-x2)*(x3*y4 - y3*x4)) / denom
                iy = ((x1*y2 - y1*x2)*(y3-y4) - (y1-y2)*(x3*y4 - y3*x4)) / denom
                return self.jijeok_round(ix), self.jijeok_round(iy)
            r1 = intersect(self.ent_l1.get(), self.ent_l_split.get())
            r2 = intersect(self.ent_l2.get(), self.ent_l_split.get())
            self.data["intersections"] = []
            if r1: 
                self.lbl_res1.config(text=f"최종1: X={r1[0]:.2f}, Y={r1[1]:.2f}")
                self.data["intersections"].append({"name": "최종1", "x": r1[0], "y": r1[1]})
            if r2: 
                self.lbl_res2.config(text=f"최종2: X={r2[0]:.2f}, Y={r2[1]:.2f}")
                self.data["intersections"].append({"name": "최종2", "x": r2[0], "y": r2[1]})
            self.draw_map()
        except: pass

    # ------------------------------------------
    # Tab 4: 면적측정부 (v2.4 - 보정 로직 완성)
    # ------------------------------------------
    def init_tab4(self):
        tab = ttk.Frame(self.notebook); self.notebook.add(tab, text="4. 면적측정부")
        top_f = ttk.LabelFrame(tab, text="측정부 입력 정보"); top_f.pack(fill='x', padx=15, pady=10)
        r1 = ttk.Frame(top_f); r1.pack(pady=5)
        ttk.Label(r1, text="원지번:").pack(side='left', padx=2); self.ent_jibun_a = ttk.Entry(r1, width=8); self.ent_jibun_a.insert(0, "1164"); self.ent_jibun_a.pack(side='left', padx=5)
        ttk.Label(r1, text="분할지번:").pack(side='left', padx=2); self.ent_jibun_b = ttk.Entry(r1, width=8); self.ent_jibun_b.insert(0, "1164-4"); self.ent_jibun_b.pack(side='left', padx=5)
        ttk.Label(r1, text="공부상 원면적:").pack(side='left', padx=2); self.ent_orig_area = ttk.Entry(r1, width=10); self.ent_orig_area.insert(0, "9034"); self.ent_orig_area.pack(side='left', padx=5)
        ttk.Button(tab, text="측정부 계산 및 공차 판정 실행", command=self.update_areas).pack(pady=5)

        cols = ("jibun", "meas", "coeff", "corr", "orig", "calc", "final")
        heads = ("지번", "측정면적", "보정계수", "보정면적", "원면적", "산출면적", "결정면적")
        self.tree_area = ttk.Treeview(tab, columns=cols, show='headings', height=5)
        for c, h in zip(cols, heads): self.tree_area.heading(c, text=h); self.tree_area.column(c, width=110, anchor='center')
        self.tree_area.pack(fill='x', padx=15, pady=10)
        self.lbl_summary = ttk.Label(tab, text="[공차 정보]", font=("Arial", 10, "bold"))
        self.lbl_summary.pack(pady=10)

    def update_areas(self):
        pts, inters = self.data["points"], self.data["intersections"]
        if len(pts) < 4 or len(inters) < 2: 
            messagebox.showwarning("데이터 부족", "경계점과 최종분할점 계산을 먼저 완료하세요.")
            return
        try:
            orig_area = float(self.ent_orig_area.get())
            jibun_a, jibun_b = self.ent_jibun_a.get(), self.ent_jibun_b.get()
            scale_str = self.cb_scale.get(); M = float(scale_str.split('/')[-1])
            
            # 1. 측정면적 및 보정면적 (지적 표준 Y-X 적용)
            m_a = self.calculate_area([pts[0], inters[0], inters[1], pts[3]])
            m_b = self.calculate_area([inters[0], pts[1], pts[2], inters[1]])
            sum_m = m_a + m_b
            
            # 2. 공차 계산 및 판정
            ae = (0.026**2) * M * math.sqrt(orig_area)
            diff = orig_area - sum_m
            status = "공차 이내 (적합)" if abs(diff) <= ae else "공차 초과"
            
            # 3. 산출면적 (비례 배분)
            ratio = orig_area / sum_m
            c_a, c_b = m_a * ratio, m_b * ratio
            
            # 4. 결정면적 (5사5입 및 단수 보정)
            f_a = self.jijeok_final_round(c_a)
            f_b = self.jijeok_final_round(c_b)
            if (f_a + f_b) != orig_area:
                d_f = orig_area - (f_a + f_b)
                if (c_a - math.floor(c_a)) >= (c_b - math.floor(c_b)): f_a += int(d_f)
                else: f_b += int(d_f)
            
            for item in self.tree_area.get_children(): self.tree_area.delete(item)
            self.tree_area.insert("", "end", values=(jibun_a, f"{m_a:.2f}", "1", f"{m_a:.2f}", "", f"{c_a:.2f}", f"{int(f_a)}"))
            self.tree_area.insert("", "end", values=(jibun_b, f"{m_b:.2f}", "", f"{m_b:.2f}", "", f"{c_b:.2f}", f"{int(f_b)}"))
            self.tree_area.insert("", "end", values=("합계", f"{sum_m:.2f}", "", f"{sum_m:.2f}", f"{orig_area}", f"{orig_area:.2f}", f"{int(orig_area)}"))
            
            self.lbl_summary.config(text=f"▶ 허용공차(Ae): ±{ae:.4f} ㎡ / 실제오차: {diff:+.4f} ㎡\n▶ 판정: {status}", foreground="blue" if abs(diff) <= ae else "red")
        except Exception as e: messagebox.showerror("오류", f"계산 중 오류: {e}")

    def draw_map(self):
        self.canv.delete("all")
        pts, spts, dogwak, inters = self.data["points"], self.data["split_points"], self.data.get("dogwak", {}), self.data["intersections"]
        if not pts: return
        xs = [p['x'] for p in pts] + [p['x'] for p in spts] + [p['x'] for p in inters]
        ys = [p['y'] for p in pts] + [p['y'] for p in spts] + [p['y'] for p in inters]
        if dogwak.get("p1") and dogwak.get("p2"):
            xs.extend([dogwak["p1"][0], dogwak["p2"][0]]); ys.extend([dogwak["p1"][1], dogwak["p2"][1]])
        min_x, max_x, min_y, max_y = min(xs), max(xs), min(ys), max(ys)
        w, h, p = 430, 430, 60
        def tr(x, y):
            rx, ry = (max_x - min_x + 0.001), (max_y - min_y + 0.001)
            sx = p + (y - min_y) / ry * (w - 2*p)
            sy = h - (p + (x - min_x) / rx * (h - 2*p))
            return sx, sy
        if dogwak.get("p1") and dogwak.get("p2"):
            dx1, dy1 = dogwak["p1"]; dx2, dy2 = dogwak["p2"]
            corners = [(dx1, dy1), (dx1, dy2), (dx2, dy2), (dx2, dy1)]
            for i in range(4):
                c1, c2 = corners[i], corners[(i+1)%4]
                sx1, sy1 = tr(c1[0], c1[1]); sx2, sy2 = tr(c2[0], c2[1])
                self.canv.create_line(sx1, sy1, sx2, sy2, fill="red", dash=(2,2))
        for i in range(len(pts)):
            p1, p2 = pts[i], pts[(i+1)%len(pts)]
            x1, y1 = tr(p1['x'], p1['y']); x2, y2 = tr(p2['x'], p2['y'])
            is_sel = (i == self.cb_b1.current() or i == self.cb_b2.current())
            self.canv.create_line(x1, y1, x2, y2, fill="red" if is_sel else "blue", width=4 if is_sel else 1)
            self.canv.create_text(x1, y1, text=f"P{i+1}", anchor='s', fill="blue")
        for i in range(len(spts)-1):
            p1, p2 = spts[i], spts[i+1]
            x1, y1 = tr(p1['x'], p1['y']); x2, y2 = tr(p2['x'], p2['y'])
            self.canv.create_line(x1, y1, x2, y2, fill="red", width=2)
            self.canv.create_text(x1, y1, text=f"분{i+1}", anchor='s', fill="orange")
        for it in inters:
            ix, iy = tr(it['x'], it['y'])
            self.canv.create_oval(ix-3, iy-3, ix+3, iy+3, fill="black")
            self.canv.create_text(ix, iy, text=it['name'], anchor='n', fill="purple")

    def init_tab5(self):
        tab = ttk.Frame(self.notebook); self.notebook.add(tab, text="5. 설정/출력")
        f = ttk.LabelFrame(tab, text="CAD 데이터 내보내기"); f.pack(fill='both', expand=True, padx=20, pady=20)
        
        ttk.Label(f, text="파일명:").grid(row=0, column=0, padx=10, pady=10)
        self.ent_dxf_name = ttk.Entry(f, width=30); self.ent_dxf_name.insert(0, "지적측량결과.dxf"); self.ent_dxf_name.grid(row=0, column=1)
        
        ttk.Button(f, text="DXF 파일 저장 (현재 좌표 전체)", command=self.export_dxf).grid(row=1, column=0, columnspan=2, pady=20)
        
        info = ("- 도곽선: Red (DOGWAK 레이어)\n"
                "- 경계선: Blue (BOUNDARY 레이어)\n"
                "- 분할선: Magenta (SPLIT 레이어)\n"
                "- 점번호: Text (TEXT 레이어)")
        ttk.Label(f, text=info, justify='left', font=("Consolas", 10)).grid(row=2, column=0, columnspan=2, pady=10)

    def export_dxf(self):
        fname = self.ent_dxf_name.get()
        pts, spts, inters = self.data["points"], self.data["split_points"], self.data["intersections"]
        dogwak = self.data.get("dogwak", {})
        
        if not pts:
            messagebox.showwarning("데이터 없음", "출력할 경계점 데이터가 없습니다.")
            return

        # DXF Minimal Header & Entities
        dxf = ["0\nSECTION\n2\nENTITIES"]
        
        def add_line(x1, y1, x2, y2, layer, color=7):
            # DXF는 Y-X를 CAD의 X-Y로 매핑 (Y=수평, X=수직)
            dxf.append(f"0\nLINE\n8\n{layer}\n62\n{color}\n10\n{y1}\n20\n{x1}\n11\n{y2}\n21\n{x2}")

        def add_text(x, y, txt, layer, height=2.0):
            dxf.append(f"0\nTEXT\n8\n{layer}\n10\n{y}\n20\n{x}\n40\n{height}\n1\n{txt}")

        # 1. 도곽선 출력
        if dogwak.get("p1"):
            p1, p2 = dogwak["p1"], dogwak["p2"]
            corners = [(p1[0], p1[1]), (p1[0], p2[1]), (p2[0], p2[1]), (p2[0], p1[1])]
            for i in range(4):
                c1, c2 = corners[i], corners[(i+1)%4]
                add_line(c1[0], c1[1], c2[0], c2[1], "DOGWAK", 1) # Red

        # 2. 경계선 출력
        for i in range(len(pts)):
            p1, p2 = pts[i], pts[(i+1)%len(pts)]
            add_line(p1['x'], p1['y'], p2['x'], p2['y'], "BOUNDARY", 5) # Blue
            add_text(p1['x'], p1['y'], f"P{i+1}", "TEXT")

        # 3. 분할선 출력 (최종 교차점 연결)
        if len(inters) >= 2:
            add_line(inters[0]['x'], inters[0]['y'], inters[1]['x'], inters[1]['y'], "SPLIT", 6) # Magenta
            for it in inters:
                add_text(it['x'], it['y'], it['name'], "TEXT")

        dxf.append("0\nENDSEC\n0\nEOF")
        
        try:
            # UTF-8 인코딩으로 저장하여 한글 지원
            with open(fname, "w", encoding="utf-8") as f:
                f.write("\n".join(dxf))
            messagebox.showinfo("성공", f"DXF 파일이 저장되었습니다: {fname}\n(한글 텍스트 포함됨)")
        except Exception as e:
            messagebox.showerror("오류", f"저장 중 오류 발생: {e}")

if __name__ == "__main__":
    root = tk.Tk(); app = JijeokApp(root); root.mainloop()
