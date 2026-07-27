# 🚀 Hướng dẫn Deploy PriceGhost lên Render.com

## Chuẩn bị trước (5 phút)

### 1. Push code lên GitHub

```bash
git add -A
git commit -m "feat: add Shopee/Lazada/TikTok Shop VN scrapers"
git push origin main
```

---

## Bước 1: Tạo Database PostgreSQL miễn phí trên Neon.tech

1. Vào [neon.tech](https://neon.tech) → **Sign up with GitHub** (miễn phí, không cần thẻ)
2. **New Project** → Đặt tên bất kỳ (ví dụ: `priceghost`)
3. Chọn Region: **AWS Asia Pacific (Singapore)** — gần Việt Nam nhất
4. Sau khi tạo xong, vào tab **Connection Details**
5. Copy chuỗi **Connection String** dạng:
   ```
   postgresql://neondb_owner:xxxx@ep-xxx-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
6. **Lưu lại** chuỗi này, sẽ dùng ở Bước 2

---

## Bước 2: Deploy Backend lên Render

1. Vào [render.com](https://render.com) → **Sign up with GitHub**
2. Dashboard → **New +** → **Web Service**
3. Chọn repo **PriceGhost** từ GitHub
4. Cấu hình:
   | Mục | Giá trị |
   |-----|---------|
   | **Name** | `priceghost-backend` |
   | **Region** | `Singapore (Southeast Asia)` |
   | **Branch** | `main` |
   | **Root Directory** | `backend` |
   | **Runtime** | `Node` |
   | **Build Command** | `npm install && npm run build` |
   | **Start Command** | `node dist/index.js` |
   | **Plan** | `Free` |

5. Kéo xuống phần **Environment Variables**, thêm:
   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | *(dán connection string từ Neon.tech vào đây)* |
   | `JWT_SECRET` | *(tạo chuỗi ngẫu nhiên, ví dụ: mở terminal gõ `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)* |
   | `NODE_ENV` | `production` |
   | `PORT` | `3001` |

6. Bấm **Create Web Service** → đợi deploy ~3-5 phút

7. Sau khi deploy xong, copy **URL của backend** dạng:
   ```
   https://priceghost-backend.onrender.com
   ```

---

## Bước 3: Deploy Frontend lên Render

1. Dashboard → **New +** → **Static Site**
2. Chọn repo **PriceGhost** từ GitHub
3. Cấu hình:
   | Mục | Giá trị |
   |-----|---------|
   | **Name** | `priceghost-frontend` |
   | **Branch** | `main` |
   | **Root Directory** | `frontend` |
   | **Build Command** | `npm install && npm run build` |
   | **Publish Directory** | `dist` |

4. Environment Variables:
   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://priceghost-backend.onrender.com/api` *(thay bằng URL backend thật)* |

5. Bấm **Create Static Site** → đợi ~2-3 phút

6. Copy **URL của frontend** dạng:
   ```
   https://priceghost-frontend.onrender.com
   ```

---

## Bước 4: Cấu hình UptimeRobot để giữ Backend luôn thức 24/7

> ⚠️ **Quan trọng**: Render Free tự sleep sau 15 phút không có traffic. UptimeRobot sẽ ping server 5 phút/lần để giữ cho nó luôn chạy.

1. Vào [uptimerobot.com](https://uptimerobot.com) → **Sign up** (miễn phí)
2. Dashboard → **Add New Monitor**
3. Cấu hình:
   | Mục | Giá trị |
   |-----|---------|
   | **Monitor Type** | `HTTP(s)` |
   | **Friendly Name** | `PriceGhost Backend` |
   | **URL** | `https://priceghost-backend.onrender.com/api/auth/registration-status` |
   | **Monitoring Interval** | `5 minutes` |

4. Bấm **Create Monitor**
5. ✅ **Xong!** Từ giờ Backend sẽ chạy 24/7 — tắt laptop cũng OK.

---

## Bước 5: Kiểm tra hoạt động

1. Mở `https://priceghost-frontend.onrender.com` trên trình duyệt
2. Đăng ký tài khoản đầu tiên (sẽ tự động trở thành Admin)
3. Thêm thử 1 sản phẩm Shopee:
   - Vào Shopee VN, copy link sản phẩm bất kỳ
   - Dán vào PriceGhost → **Add Product**
   - Nếu giá hiện ra → ✅ Shopee scraper hoạt động!
4. Cài thông báo Telegram hoặc ntfy trong **Settings > Notifications**

---

## Lưu ý về Render Free Tier

| Giới hạn | Chi tiết |
|---------|---------|
| **Instance Hours** | 750 giờ/tháng (720 giờ = đủ 1 tháng nếu chỉ có 1 service) |
| **Database** | Dùng Neon.tech thay database của Render để tránh giới hạn 90 ngày |
| **Sleep** | Giải quyết bằng UptimeRobot |
| **Puppeteer** | ⚠️ Render Free có thể không đủ RAM để chạy Chromium (~512MB). Nếu Shopee/Lazada/TikTok cần Puppeteer mà bị lỗi, hãy nâng lên plan $7/tháng hoặc dùng Oracle Cloud Free. |

---

## Troubleshooting

### Shopee/Lazada/TikTok không lấy được giá?
- Kiểm tra **Logs** trong Render dashboard
- Tìm dòng `[Shopee]`, `[Lazada]`, `[TikTok Shop]` trong log
- Nếu thấy "parse failed" → Site đã thay đổi cấu trúc, cần cập nhật scraper
- Bật **AI Extraction** trong Settings để AI tự xử lý fallback

### Backend bị crash khi scrape?
- Puppeteer cần nhiều RAM. Kiểm tra memory usage trong Render dashboard
- Thêm biến môi trường: `PUPPETEER_ARGS=--no-sandbox --disable-dev-shm-usage`

### Database connection error?
- Kiểm tra `DATABASE_URL` trong Environment Variables của Render
- Đảm bảo chuỗi Neon.tech có `?sslmode=require` ở cuối
