# ADORA — Bắt đầu với database và Monorepo

## 1. Giải nén

Giải nén archive sao cho thư mục gốc có tên `adora/`; mở thư mục này trong VS Code. Đây là **database baseline + skeleton**, KHÔNG phải backend/web/mobile đã được tạo bằng framework.

## 2. Yêu cầu máy

- Docker Desktop có Compose (architecture amd64 phù hợp image PostGIS được chọn).
- Python 3.11+ và môi trường ảo (để chạy Alembic tạm thời trước khi ứng dụng được bootstrap).
- Git.

## 3. Chạy PostgreSQL và Redis local

Tại thư mục `adora/`:

```powershell
Copy-Item .env.example .env
# Mở .env để chỉnh password chỉ dùng trên local.
docker compose up -d db redis
docker compose ps
```

**Lưu ý:** Alembic mặc định kết nối bằng tài khoản local-dev trong `services/api/alembic.ini`. Nếu đã đổi password trong `.env`, hãy cung cấp `DATABASE_URL` thông qua environment khi chạy Alembic (runner ưu tiên biến này); **không commit mật khẩu thật vào Git**. Docker Compose đọc `.env` ở repo root, còn Alembic không tự nạp file này.

## 4. Tạo schema bằng Alembic (chỉ một lần trên DB trống)

```powershell
cd services/api
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-db-bootstrap.txt
alembic upgrade head
cd ../..
```

Kiểm tra bằng psql của container:

```powershell
docker compose exec db psql -U adora -d adora -c "SELECT PostGIS_Version();"
docker compose exec db psql -U adora -d adora -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'adora' AND table_type = 'BASE TABLE';"
docker compose exec db psql -U adora -d adora -c "SELECT version_num FROM alembic_version;"
```

Expected: số bảng nghiệp vụ = **24**; `alembic_version` = `0001_adora`. Chỉ xác nhận đạt khi các câu lệnh thực tế chạy thành công.

Chạy smoke test trên DB local (script tự rollback dữ liệu mẫu):

```powershell
python tests/db/smoke_test.py
```

Kiểm tra gồm 24 bảng, truy vấn PostGIS, giới hạn tồn kho và FK bảo vệ quyền sở hữu báo giá. **Đây không thay thế concurrency test bằng hai kết nối**, vốn sẽ được triển khai khi có BookingService.

## 5. Nguyên tắc không làm sai migration

- `0001_adora_baseline.sql` được gọi bởi Alembic revision; **không chạy thủ công SQL này rồi tiếp tục `alembic upgrade`**.
- Không chỉnh migration 0001 sau khi đã áp dụng trên DB dùng chung. Tạo 0002, 0003... cho mọi thay đổi.
- Nếu test lại trên DB local không chứa dữ liệu quan trọng, hãy dùng DB mới; không xóa volume khi chưa xác nhận không có dữ liệu cần giữ.
- Sau bootstrap, tạo ORM models phản ánh schema này; dùng migration review khi Alembic autogenerate thay đổi.

## 6. Việc cần làm ngay sau schema

1. Bootstrap `apps/web`: Next.js App Router + TypeScript.
2. Bootstrap `apps/mobile`: Expo + TypeScript.
3. Bootstrap `services/api`: FastAPI + SQLAlchemy + Pydantic, import tables vào ORM metadata.
4. Tạo `packages/api-client` từ OpenAPI.
5. Kiểm thử migration và transaction concurrency bằng CI.

**Chưa được thực hiện trong gói này:** cài dependency và tạo đầy đủ ứng dụng Next.js, Expo, FastAPI; chạy Docker / Alembic trên máy bạn; load seed data; kiểm chứng SQL trên PostgreSQL thật. Đây là bước khởi tạo database có cấu trúc đủ để tiếp tục code, không phải một hệ thống đã hoàn chỉnh.
