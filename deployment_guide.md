# 照片展示网站部署指南

## 1. 服务器准备

### 1.1 系统要求
- Linux服务器（推荐Ubuntu 20.04 LTS）
- 最小配置：    1核2GB内存
- 开放端口：80（HTTP）、443（HTTPS）、3000（Node.js应用）

### 1.2 安装基础软件
```bash
# 更新系统包
apt update && apt upgrade -y

# 安装Node.js和npm
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt install -y nodejs

# 安装MySQL
sudo apt install -y mysql-server

# 启动MySQL服务
sudo systemctl start mysql

# 设置开机自启
sudo systemctl enable mysql

# 检查MySQL服务状态
sudo systemctl status mysql

# 安装Nginx
sudo apt install -y nginx

# 安装Git
sudo apt install -y git
```

## 2. 数据库配置

### 2.1 MySQL安全配置
```bash
sudo mysql_secure_installation
```

### 2.2 创建数据库和用户
```sql
CREATE DATABASE photo_gallery;

CREATE USER 'photo_user'@'localhost' IDENTIFIED BY '你的密码';

GRANT ALL PRIVILEGES ON photo_gallery.* TO 'photo_user'@'localhost';

FLUSH PRIVILEGES;
```

### 2.3 创建数据表
```sql
USE photo_gallery;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE
);

CREATE TABLE photos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    path VARCHAR(255) NOT NULL,
    upload_date DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 3. 应用部署

### 3.1 克隆代码
```bash
# 创建应用目录
sudo mkdir -p /var/www/photo-gallery
sudo chown -R $USER:$USER /var/www/photo-gallery

# 克隆代码（替换为你的Git仓库地址）
git clone <你的仓库地址> /var/www/photo-gallery
cd /var/www/photo-gallery
```

### 3.2 安装依赖
```bash
npm install
```

### 3.3 配置环境变量
```bash
cat > .env << EOL
DB_HOST=localhost
DB_USER=photo_user
DB_PASSWORD=你的密码
DB_NAME=photo_gallery
PORT=3000
EOL
```

### 3.4 创建上传目录
```bash
mkdir -p public/uploads
chmod 755 public/uploads
```

### 3.5 配置进程管理器（PM2）
```bash
# 安装PM2
sudo npm install -g pm2

# 启动应用
pm2 start server.js --name photo-gallery

# 设置开机自启
pm2 startup
pm2 save
```

## 4. Nginx配置

### 4.1 创建Nginx配置文件
```bash
sudo nano /etc/nginx/sites-available/photo-gallery
```

添加以下内容：
```nginx
server {
    listen 80;
    server_name 你的域名;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /uploads/ {
        alias /var/www/photo-gallery/public/uploads/;
    }

    client_max_body_size 10M;
}
```

### 4.2 启用站点配置
```bash
sudo ln -s /etc/nginx/sites-available/photo-gallery /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 5. SSL配置（可选）

### 5.1 安装Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 5.2 获取SSL证书
```bash
sudo certbot --nginx -d 你的域名
```

## 6. 安全建议

1. 设置强密码
2. 配置防火墙（UFW）
3. 定期更新系统和依赖包
4. 配置数据库备份
5. 设置文件权限

## 7. 维护命令

```bash
# 查看应用状态
pm2 status

# 查看应用日志
pm2 logs photo-gallery

# 重启应用
pm2 restart photo-gallery

# 更新代码后重启
git pull
npm install
pm2 restart photo-gallery
```

## 8. 故障排查

1. 检查应用日志：`pm2 logs`
2. 检查Nginx日志：`sudo tail -f /var/nginx/error.log`
3. 检查MySQL状态：`sudo systemctl status mysql`
4. 检查端口占用：`sudo netstat -tulpn`

## 9. 备份策略

### 9.1 数据库备份
```bash
# 创建备份脚本
cat > backup.sh << EOL
#!/bin/bash
BACKUP_DIR="/var/backups/photo-gallery"
DATETIME=\$(date +"%Y%m%d_%H%M%S")

# 创建备份目录
mkdir -p \$BACKUP_DIR

# 备份数据库
mysqldump -u photo_user -p photo_gallery > \$BACKUP_DIR/db_\$DATETIME.sql

# 备份上传的图片
tar -czf \$BACKUP_DIR/uploads_\$DATETIME.tar.gz /var/www/photo-gallery/public/uploads

# 保留最近30天的备份
find \$BACKUP_DIR -type f -mtime +30 -delete
EOL

chmod +x backup.sh
```

### 9.2 设置定时备份
```bash
# 编辑crontab
crontab -e

# 添加每天凌晨3点执行备份的任务
0 3 * * * /var/www/photo-gallery/backup.sh
```