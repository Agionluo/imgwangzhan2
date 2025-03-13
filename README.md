# 照片展示网站

## 项目文件说明

需要上传到Git仓库的文件包括：

1. **核心代码文件**
   - `server.js` - 后端服务器代码
   - `public/index.html` - 前端页面文件

2. **配置文件**
   - `.env.example` - 环境变量示例文件（注意：不要上传实际的.env文件）
   - `package.json` - 项目依赖配置
   - `.gitignore` - Git忽略配置

3. **文档**
   - `deployment_guide.md` - 部署指南
   - `README.md` - 项目说明文档

4. **目录结构**
   - `public/uploads/.gitkeep` - 保持uploads目录的空文件

## 注意事项

1. 确保不要上传包含敏感信息的.env文件
2. 不要上传node_modules目录
3. 不要上传uploads目录下的图片文件
4. 建议在首次提交前先创建.env.example文件