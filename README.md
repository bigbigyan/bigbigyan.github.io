# 我的学习笔记

简洁的个人学习笔记本：左侧课程目录、右侧阅读，点击编辑入口进入独立编辑页。支持 Markdown、LaTeX 公式、表格、代码、图片与全文搜索。

这是一个静态网站，日常使用只需要浏览器。编辑器、公式库和字体已经打包，不依赖 CDN，不需要 Jekyll、Ruby 或浏览器插件。

## 目录结构

```text
index.html                    阅读首页
edit/index.html               独立编辑页
notes/
  notebook.json               笔记内容，以 Markdown 字符串保存
  app.js、core.mjs             界面、草稿与 GitHub 同步
  style.css、favicon.svg       样式与图标
  editor/                     已打包的 Milkdown 编辑器
  vendor/                     Markdown、KaTeX 和 HTML 清理库及许可证
  legacy-urls.json             旧文章地址与新笔记的对应关系
  legacy-redirect.js           旧链接兼容
scripts/
  preview-notebook.py          本地预览，无第三方 Python 依赖
  notebook-core.test.mjs       数据与冲突处理验证
  notebook-editor/             编辑器构建源码及锁文件
.nojekyll                     GitHub Pages 直接托管静态文件
404.html                      未找到页面与旧链接跳转
LICENSE.md                    保留原项目的许可证与署名
```

## 本地使用

在项目目录运行：

```powershell
python scripts/preview-notebook.py
```

打开 http://127.0.0.1:8765/ 。请通过 HTTP 服务器访问，直接双击 HTML 文件会受到浏览器的模块与 JSON 读取限制。

- 阅读页和编辑页的「Aa 字号」可调节 12–24 px 正文大小，默认 16 px，当前浏览器自动记住选择，不会修改笔记内容。
- 左侧搜索、新建与底部笔记工具默认收起，鼠标移入时浮出，移出时收回；也可点击或使用键盘展开，Ctrl/Cmd+K 可直接打开搜索。浮层不挤占目录高度。
- 阅读页和编辑页支持「移动笔记」，可选择已有目录或输入新的多层目录路径；「重命名目录」可修改父目录或子目录，其下全部笔记一起更新，同级重名会阻止操作。目录从笔记分类生成，移空后自动隐藏，正文和笔记编号保持不变。调整先保存为浏览器草稿，需点击「保存到 GitHub」同步。
- 阅读页支持按课程浏览，以及标题、分类、正文全文搜索。
- 每篇笔记会自动从 `#` 到 `######` 标题生成“本篇目录”：电脑上位于正文右侧，窄屏上可折叠，支持点击跳转、当前章节高亮和章节链接分享；代码块不参与生成目录，没有标题时自动隐藏。
- 点击“编辑笔记”或正文段落之间的空白，进入独立编辑页。
- 可视编辑支持输入 `/` 插入内容；也可以切换为“Markdown + 预览”。
- 内容自动存为当前浏览器的草稿。换电脑前应保存到 GitHub，或导出 JSON 备份。
- 支持导入 Markdown、导出单篇 `.md`，以及完整笔记本 JSON 备份。
- 图片可使用链接；本地嵌入图片限制为 150 KB，整个笔记本限制为 900 KB。

## 已迁入的内容

原来 `_posts/` 中的 11 篇学习记录已迁入 `notes/notebook.json`：

| 分类 | 篇数 | 内容 |
| --- | ---: | --- |
| 机器人与仿真 | 5 | PX4、ROS2、毫米波雷达、Gazebo 相机与无人船仿真 |
| 路径规划 | 2 | EGO-Swarm 与 Fast-Planner |
| 计算机视觉 | 2 | OpenCV 与双目视觉环境配置 |
| 开发工具 | 2 | Python 调试与网站 / Git 学习 |

保留原笔记标题、正文、代码与日期，Unimatch 的本地未提交修改也已迁入。Fast-Planner 的旧公式定界符、定义列表和脚注改为新编辑器可读的格式；公式内容未重新推导或校订。

初始演示笔记已从项目数据中移除。已有浏览器首次打开新版时会自动合并迁入内容：未改动的演示笔记移除，用户已修改的演示笔记和自己新建的草稿保留。之后普通刷新不会用可能尚未更新的静态文件覆盖已保存的新版本，需要拉取其他设备的更新时请点击“拉取 GitHub 更新”。

笔记的唯一在线数据源为 `notes/notebook.json`，不再维护一份容易与网页编辑结果分叉的 `_posts` 副本。清理前的完整本地文件已经另行打包备份。

## 删除与恢复

在编辑页顶部或阅读页底部点击“删除笔记”，确认“移到回收站”。点击“保存到 GitHub”后才会同步删除。删除全部笔记后仍可新建、恢复或同步空笔记本。

左侧“回收站”可以恢复误删的笔记。回收站仅在当前浏览器保存，不跨设备同步；清除浏览器数据也会清除副本。完整 JSON 备份只包含当前列表中的笔记。

## GitHub 同步与上线

- 仓库：`bigbigyan/bigbigyan.github.io`
- 分支：`master`
- 笔记文件：`notes/notebook.json`

点击“连接 GitHub”，输入只授权此仓库的 Fine-grained personal access token，仓库权限为 **Contents: Read and write**。令牌仅在当前页面内存使用，不写入草稿、源码或仓库，刷新或跳转后需要重新输入。

点击“保存到 GitHub”或按 Ctrl/Cmd+S，会先获取最新文件并比较版本。不同笔记的修改可合并，同一篇笔记发生冲突时停止提交并保留草稿，写入时使用文件 SHA 防止覆盖并发更新。

访客可以阅读与本地试写；只有拥有仓库写入权限并提供有效令牌的人才能保存到仓库。此公开仓库中的笔记公开可读。

GitHub Pages 从 `master` 分支根目录发布，推送提交后会自动更新；`.nojekyll` 让 GitHub Pages 直接托管静态文件。原文章旧地址通过 404 页面映射到新的笔记地址。

## 修改与验证

普通界面直接修改 `notes/app.js` 和 `notes/style.css`，无需构建。验证数据与合并逻辑：

```powershell
node --test scripts/notebook-core.test.mjs scripts/directory-operations.test.mjs
```

仅需升级或修改 Milkdown 编辑器时，使用已有 Node.js：

```powershell
cd scripts/notebook-editor
npm ci
npm run build
```

这是开发步骤，日常在线记笔记不需要运行。

参考：[Milkdown](https://milkdown.dev/playground)、[GitHub Contents API](https://docs.github.com/en/rest/repos/contents)、[GitHub Pages 静态托管](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)、[KaTeX](https://katex.org/docs/security)。


## 44 周科研学习计划

首页右上角“学习计划”进入 `/study/`。原 Excel 的 44 周计划（504 小时）、18 项课程资源及 21 条验收用法已转成网页，无须安装插件。

- 每周三项勾选：动手任务、算法练习、独立验收。完成三项并填写学习记录/证据后，再将状态设为“通过”。取消已通过周的任务或清空证据，会改为“待复测”。
- 可记录实际小时、复测日期和最多 2 万字的每周学习记录。支持搜索、状态筛选及进度统计。
- 草稿自动保存于当前浏览器。学习进度和普通笔记分别保存在 `study/progress.json` 与 `notes/notebook.json`，不会修改原有笔记。
- 使用同一仓库的 Contents: Read and write 令牌保存到 GitHub。令牌仅保留于当前页面，不会跨页面传递或持久保存。
- 换电脑点击“拉取 GitHub 更新”，也可导出/导入进度 JSON 备份。两个设备的不同字段可以合并，同一字段的不同修改需逐项选择，保存使用 GitHub 文件 SHA 防止覆盖新版本。
- 网站公开，上传到 GitHub 的学习记录也会公开。未上传的记录仅在该浏览器中。首次访问使用发布的进度，已有草稿不会被可能滞后的 Pages 文件覆盖。
- 计划内容在 `study/plan.json`，进度单独存储。原 Excel 不会被修改，网站上的勾选也不会回写 Excel。

验证：`node --test scripts/notebook-core.test.mjs scripts/directory-operations.test.mjs scripts/study-progress.test.mjs`。
