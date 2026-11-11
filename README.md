# Register VIP — เสื้อกีฬาสัมพันธ์ สพม.มุกดาหาร 2569

ระบบลงทะเบียนสั่งจองเสื้อกีฬา VIP (ฟุตบอล) สำหรับโรงเรียนในสังกัด สพม.มุกดาหาร

## ฟีเจอร์

- ค้นหาและเลือกโรงเรียน 30 โรงเรียน
- เพิ่มรายชื่อผู้สวมใส่ + เลือกไซส์ได้หลายคน
- คำนวณราคาอัตโนมัติ (ฐาน 250 บาท + ค่าไซส์พิเศษ 2XL–9XL)
- แนบสลิปโอนเงิน → อัปโหลดเข้า Google Drive
- บันทึกรายการลง Google Sheets

## Setup

1. คัดลอก `.env.example` เป็น `.env.local` แล้วใส่ค่า
2. แชร์ Google Sheet ให้ Service Account เป็น **Editor**
3. โฟลเดอร์ Slip ต้องเข้าถึงได้ด้วย OAuth ของ `academic@dontanwit.ac.th`
4. ตั้งค่าบัญชีโอนเงินผ่าน `NEXT_PUBLIC_BANK_*`

```bash
npm install
npm run dev
```

## Deploy

Push ไป GitHub แล้วเชื่อม Vercel — ใส่ Environment Variables ให้ครบตาม `.env.example`
