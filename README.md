# Vampire Survivors Mini - Sinh Tồn Bóng Tối

Một tựa game hành động sinh tồn góc nhìn từ trên xuống (Top-down Survival) lấy cảm hứng từ **Vampire Survivors**, được xây dựng hoàn toàn bằng **HTML5 Canvas** và **Vanilla JavaScript (ES6+ Modules)** với **0 thư viện bên ngoài (Zero external dependencies)** và **âm thanh tự tổng hợp qua Web Audio API**.

---

## 🎮 Cách chạy game

Do sử dụng chuẩn **ES6 Modules** (`<script type="module">`), trình duyệt yêu cầu chạy qua một local server (tránh lỗi CORS của giao thức `file://`):

### Cách 1: Sử dụng Python
Mở Terminal trong thư mục dự án và chạy:
```bash
python -m http.server 8000
```
Sau đó truy cập: [http://localhost:8000](http://localhost:8000)

### Cách 2: Sử dụng Node.js / npx
```bash
npx serve .
```

### Cách 3: VS Code / IDE Live Server
Nhấp chuột phải vào `index.html` và chọn **Open with Live Server**.

---

## 🕹️ Điều khiển (Controls)

| Thao tác | Phím |
| :--- | :--- |
| **Di chuyển 8 hướng** | `W, A, S, D` hoặc các phím Mũi tên (`↑, ↓, ←, →`) |
| **Tạm dừng / Tiếp tục** | Phím `P` hoặc `Escape` hoặc nút `⏸️` trên HUD |
| **Bật / Tắt âm thanh** | Nút `🔊 / 🔇` trên góc phải HUD |
| **Thiết bị cảm ứng / Mobile** | Vùng joystick ảo ở góc dưới bên trái màn hình |

---

## ⚔️ Tính năng & Cơ chế Gameplay

### 1. Di chuyển chuẩn hóa & Khung hình mượt mà 60 FPS
- Vector di chuyển được **chuẩn hóa (normalized vector)**: khi đi chéo (`W + D`), tốc độ không bị nhanh hơn đi thẳng.
- Hệ thống **Delta Time** mượt mà, độc lập với tần số quét màn hình (60Hz, 120Hz hay 144Hz đều chuyển động cùng vận tốc chuẩn `px/s`).

### 2. Hệ thống Thực thể (Entities)
- **Người chơi (Player):**
  - Tốc độ di chuyển `200 px/s`, Máu tối đa `100 HP`, Bán kính nam châm hút gem `100 px`.
  - Có thời gian bất tử ngắn (i-frames) khi dính đòn để tránh bị sốc sát thương.
  - Vòng hiển thị bán kính hút và đèn neon định hướng di chuyển.
- **3 loại quái vật (Enemies):**
  - 🧟 **Zombie (Thường):** Máu 20, Tốc độ 80 px/s, Màu xanh lục neon.
  - 🦇 **Bat (Nhanh):** Máu 10, Tốc độ 140 px/s, Kích thước nhỏ, Màu tím neon, đập cánh và bay lượn uốn lượn.
  - 👹 **Brute (Trâu):** Máu 80, Tốc độ 45 px/s, Kích thước lớn, Màu đỏ sẫm, giáp gai.
  - Có cơ chế **Soft Separation Force** giúp quái không bị chồng khít lên nhau tại 1 điểm.
- **Vũ khí tự động (Auto-Weapons):**
  - 🔮 **Magic Bolt:** Tự động tìm mục tiêu quái gần nhất trong bán kính 400px mỗi 0.6s, phóng đạn năng lượng có vệt sáng trail effect.
  - 🛡️ **Orbiting Shield / Blades:** 1 đến 6 quả cầu xoay quanh người chơi với quỹ đạo hình tròn `Math.cos/sin`, gây sát thương liên tục có cooldown riêng cho từng quái.
- **EXP Gems & Nam châm:**
  - Quái chết rơi ra viên đá kinh nghiệm pha lê xanh lam.
  - Khi người chơi đi vào phạm vi `Magnet Radius`, gem tự động tăng tốc bay về phía người chơi.

### 3. Hệ thống Thăng cấp & 6 Thẻ Cường Hóa (Level Up Cards)
Khi thanh EXP đầy, game chuyển sang trạng thái `PAUSED` và mở Modal với **3 thẻ ngẫu nhiên**:
1. ⚡ **+20% Tốc độ di chuyển** (Swift Boots)
2. ⚔️ **+25% Sát thương vũ khí** (Might)
3. 🛡️ **+1 Quả cầu xoay Orbiting Shield** (Spinning Aegis)
4. 💖 **Hồi 40 Máu** (Healing Potion)
5. 🧲 **+50% Bán kính hút Gem (Magnet)** (Magnetic Ring)
6. 🔮 **-20% Cooldown bắn đạn** (Rapid Wand)

### 4. Độ khó leo thang (Difficulty Scaling)
- Mỗi **30 giây sống sót**:
  - Tăng số lượng quái spawn mỗi đợt thêm 20%.
  - Tăng máu tối đa của quái vật.
  - Quái dơi (Bat) và quái trâu (Brute) xuất hiện với tỷ lệ cao hơn.

### 5. Bộ tổng hợp âm thanh Web Audio API (`sound.js`)
Không tải bất kỳ file audio MP3/WAV bên ngoài nào, toàn bộ âm thanh được tổng hợp thời gian thực bằng `OscillatorNode`, `BiquadFilterNode` và `GainNode`:
- **Tiếng bắn Magic Bolt:** Tần số quét nhanh từ cao xuống thấp (sweep down).
- **Tiếng quái chết:** Xung bass sub-frequency kết hợp white noise burst qua bộ lọc bandpass.
- **Tiếng nhặt Gem:** Âm ping pha lê tần số cao thánh thót.
- **Tiếng Thăng cấp (Level Up):** Hợp âm arpeggio 4 nốt (C-E-G-C) rộn ràng.
- **Tiếng dính đòn & tiếng xoay khiên:** Thud âm trầm và tiếng va đập kim loại.

### 6. Hiệu ứng đồ họa (Visual Polish)
- **Chớp trắng (White Flash):** Quái chớp trắng trong 1-2 frame khi nhận sát thương.
- **Floating Damage Numbers:** Hiển thị số sát thương nhảy lên trên đầu quái, phân biệt sát thương thường (vàng) và đòn chí mạng (đỏ cam lớn).
- **Particle Explosions:** Hạt vụn nổ văng ra với màu sắc tương ứng khi quái bị tiêu diệt.
- **Screen Shake:** Màn hình rung giật khi người chơi trúng đòn mạnh.
- **Gothic Grid Floor & Vignette:** Sàn gạch vô tận mờ ảo với hiệu ứng tối 4 góc màn hình.

---

## 📁 Cấu trúc Thư mục Dự án

```
vampire-survivors-mini/
├── index.html              # Entry point HTML, chứa Canvas và HUD/UI overlay
├── README.md               # Tài liệu hướng dẫn & quy cách kỹ thuật
├── css/
│   └── style.css           # Styling HUD, thanh máu, màn hình Game Over & Level Up cards
└── js/
    ├── main.js             # Khởi tạo game loop (requestAnimationFrame), xử lý input
    ├── game.js             # State machine (PLAYING, PAUSED, GAME_OVER), delta time, camera
    ├── entities/
    │   ├── player.js       # Player: di chuyển 8 hướng, stats (HP, speed, exp, level)
    │   ├── enemy.js        # Base Enemy & các biến thể (Zombie, Bat, Brute)
    │   ├── projectile.js   # Đạn: Magic Bolt (bay thẳng) & Orbiting Blades (xoay quanh player)
    │   └── gem.js          # Kinh nghiệm rơi ra khi quái chết, hiệu ứng hút về player (magnet)
    ├── systems/
    │   ├── spawner.js      # Quản lý spawn quái theo wave/thời gian ngoài viền màn hình
    │   ├── combat.js       # Auto-targeting (quái gần nhất), va chạm Circle-Circle, floating damage
    │   └── upgrade.js      # Hệ thống 3 thẻ nâng cấp ngẫu nhiên khi lên cấp
    └── utils/
        ├── math.js         # Vector math (normalize, distance, clamp, angle)
        ├── sound.js        # Web Audio API synth (tiếng bắn, quái chết, nhặt gem, level up)
        └── particle.js     # Hệ thống hạt nổ vỡ và chữ sát thương bay
```
