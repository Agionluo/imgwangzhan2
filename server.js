require('dotenv').config();
const express = require('express');
const multer = require('multer');
const mysql = require('mysql2');
const path = require('path');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const bodyParser = require('body-parser');

const app = express();

// 中间件配置
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true
}));

// 数据库连接配置
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'photo_gallery'
});

db.connect((err) => {
    if (err) {
        console.error('数据库连接失败:', err);
        return;
    }
    console.log('数据库连接成功');
});

// 文件上传配置
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname))
    }
});

const upload = multer({ storage: storage });

// 用户认证中间件
const authenticateUser = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).json({ message: '请先登录' });
    }
};

// 检查管理员权限中间件
const checkAdmin = (req, res, next) => {
    if (req.session.isAdmin) {
        next();
    } else {
        res.status(403).json({ message: '需要管理员权限' });
    }
};

// 注册路由
app.post('/register', async (req, res) => {
    const { username, password, isAdmin } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = 'INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?)';
    db.query(sql, [username, hashedPassword, isAdmin ? 1 : 0], (err, result) => {
        if (err) {
            res.status(500).json({ error: '注册失败' });
            return;
        }
        res.json({ message: '注册成功' });
    });
});

// 登录路由
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    const sql = 'SELECT * FROM users WHERE username = ?';
    db.query(sql, [username], async (err, results) => {
        if (err || results.length === 0) {
            res.status(401).json({ error: '用户名或密码错误' });
            return;
        }

        const user = results[0];
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            res.status(401).json({ error: '用户名或密码错误' });
            return;
        }

        req.session.userId = user.id;
        req.session.isAdmin = user.is_admin === 1;
        res.json({ message: '登录成功', isAdmin: user.is_admin === 1 });
    });
});

// 上传图片路由
app.post('/upload', authenticateUser, checkAdmin, upload.single('photo'), (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: '没有上传文件' });
        return;
    }

    const sql = 'INSERT INTO photos (filename, path, upload_date) VALUES (?, ?, NOW())';
    db.query(sql, [req.file.filename, '/uploads/' + req.file.filename], (err, result) => {
        if (err) {
            res.status(500).json({ error: '保存图片信息失败' });
            return;
        }
        res.json({ message: '上传成功', filename: req.file.filename });
    });
});

// 获取所有图片路由
app.get('/photos', (req, res) => {
    const sql = 'SELECT * FROM photos ORDER BY upload_date DESC';
    db.query(sql, (err, results) => {
        if (err) {
            res.status(500).json({ error: '获取图片列表失败' });
            return;
        }
        res.json(results);
    });
});

// 退出登录路由
app.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: '退出成功' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
});