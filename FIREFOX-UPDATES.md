# Firefox Nightly 自动更新

本 fork 使用独立的扩展 ID：`read-frog-fork@miorishiratori.github.io`。
Firefox 更新地址固定为：

```text
https://github.com/MioriShiratori/read-frog/releases/download/firefox-nightly-updates/updates.json
```

这是未签名的 Nightly 自用渠道，不需要 Mozilla 开发者账号。首次发布工作流之前，更新地址尚不可用；仅在本地构建不能启用远端更新。仓库和下载资源必须公开可访问。

## 首次切换

1. 在旧扩展的「设置 → 偏好设置 → 配置管理」中导出当前配置。要迁移提供商密钥，选择包含 API Key 的导出，将文件留在自己电脑上。
2. 在 Nightly 的 `about:config` 中确认 `xpinstall.signatures.required` 为 `false`。
3. 在本 fork 的 Releases 中下载版本化的 `read-frog-fork-<版本>-firefox.xpi`，从 `about:addons` 的齿轮菜单选择「从文件安装附加组件」。使用持久安装，不使用 `about:debugging` 临时加载。
4. 新扩展名称带有 `(Fork)` 后缀，新 ID 会创建独立存储。在新扩展配置管理中导入刚才的文件，核对提供商、翻译设置和术语表。当前配置导出包含可读取的术语表；如果导出时提示术语表失败，应先解决再切换。
5. 确认迁移成功后停用旧扩展，避免两个版本同时翻译页面。确认新扩展的自动更新已开启。

以后升级保持同一个 fork ID，浏览器会保留扩展存储，不需要重复导入。配置备份历史和可重新生成的缓存不属于上述配置导出范围。

## 发布新版

只构建 Firefox；普通 `main` 推送不发布浏览器更新。已替换原项目随 main 推送自动发版的流程。

1. 将 `package.json` 的版本号提升为更大的数字版本 `主.次.补丁`，完成代码验证并提交、推送。
2. 给该提交创建并推送对应的版本标签，例如 `firefox-v2.0.1`。标签必须与该提交的 `package.json` 一致。
3. `Release Firefox Nightly Fork` 工作流自动检查、测试、打包，先发布版本化 XPI 和源码包，再更新固定地址的 `updates.json`。

也可以在 Actions 页面手动运行该工作流，填写已经存在的版本标签。首次可使用当前版本 `firefox-v2.0.0`；后续必须递增。如果 fork 的 Actions 尚未启用，需要先在 GitHub 的 Actions 页面启用。

更新清单包含安装包的 SHA-256 和最低 Firefox 版本。`firefox-nightly-updates` 是保存清单的专用预发布 Release，不是待安装的扩展版本；不要删除或移动它。版本化安装包发布后不覆盖，旧版本也不能倒退更新渠道。若发布包成功但更新清单上传失败，可重跑同一工作流；已发布的安装包作为准本，重新读取它计算哈希并更新清单。

Firefox 默认定期检查更新，不会在 Git 推送后立刻安装。可在 `about:addons` 齿轮菜单中选择「检查更新」立即检查。新的权限仍可能需要用户确认。

## 本地交付包

```sh
SKIP_FREE_API=true WXT_SKIP_ENV_VALIDATION=true pnpm test
pnpm test:firefox-release
pnpm lint
pnpm fmt:check
WXT_SKIP_ENV_VALIDATION=true pnpm zip:firefox
pnpm package:firefox-release
```

交付目录为 `.output/firefox-release/`：包含 `.xpi` 和 `updates.json`。XPI 与 WXT 生成的 Firefox ZIP 内容相同，仅使用 Firefox 安装包扩展名。

## 机制参考

- [Mozilla：扩展更新清单与自动更新](https://extensionworkshop.com/documentation/manage/updating-your-extension/)
- [Mozilla：Nightly 未签名扩展与签名要求](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/)
