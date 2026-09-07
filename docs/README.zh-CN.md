# Steam Stats

在 GitHub README 展示自己的 Steam 游戏时光：最爱由自己挑选，最近在玩和
累计时长排行自动生成。首版生成一张完整 PNG，支持中英文、深浅主题。

<img src="previews/light-zh-CN.png" alt="中文浅色 Steam 卡片示例" width="840">

上图是虚构统计，封面来自 Steam；不是你的真实账号数据。

## 本地体验

安装 Node.js 22 或 24，在仓库执行：

```sh
npm ci --ignore-scripts
npm run demo
```

打开 `generated/steam-card.png`。默认示例完全离线；加上
`npm run demo -- --online-art` 可以下载 Steam 公开封面。

## 使用自己的账号

1. 将 `config.example.yml` 复制为 `config.local.yml`。
2. 填写带引号的 17 位 SteamID64，调整最爱 App ID 和短评。
3. Steam「游戏详情」需设为公开；展示时长时关闭「始终将我的总游戏时间保密」。
4. 从 [Steam](https://steamcommunity.com/dev/apikey) 获取自己的 Web API key，
   通过环境变量 `STEAM_API_KEY` 传入，避免把凭据写进配置或 Git。
5. 执行：

```sh
npm run generate -- --config config.local.yml --output generated/steam-card.png
```

默认最爱 3 款、最近在玩 6 款、累计排行 3 款，各区域均可关闭或调整数量。
最爱支持短评；`name` 可覆盖已下架游戏的标题。排除列表只影响自动排行，
不改变最爱或总览统计。跨区域允许重复游戏。

## GitHub 自动更新

仓库已包含 composite action 和每日更新 workflow 示例，但尚未发布到远程
仓库。发布后把 `examples/update-card.yml` 的 `OWNER/steam-stats@COMMIT_SHA`
替换为实际仓库和审阅过的提交。不要引用尚不存在的 `v1`。

在个人主页仓库：

- 提交 `steam-stats.yml`，添加 Actions Secret `STEAM_API_KEY`。
- 将 workflow 示例复制到 `.github/workflows/steam-stats.yml`。
- 默认每天 04:23 UTC（北京时间 12:23）更新，也可手动运行。
- 在 README 中引用 `assets/steam-card.png`，并链接自己的 Steam 主页。

```html
<a href="https://steamcommunity.com/profiles/YOUR_STEAM_ID/">
  <img src="assets/steam-card.png" alt="我的 Steam 最爱与最近游玩" width="840">
</a>
```

数据请求失败时保留旧卡；缺少封面时使用缓存或占位图。私密资料或缺失时长
不会被当作零数据。图片更新存在 GitHub 调度、缓存延迟；公开仓库图片的
历史版本也会留在 Git 历史中。请只展示本人或已授权的账号。

首版总览统计为 Steam 接口返回的游戏数量、累计分钟之和和最近两周分钟之和，
不承诺与客户端所有统计口径一致。全成就游戏数尚未实现。

完整配置见 [configuration.md](configuration.md)，技术证据和限制见
[technical-notes.md](technical-notes.md)。源码为 MIT 许可，字体遵循 SIL OFL，
游戏图片权利归各自权利人所有。本项目与 Valve 无隶属关系。
