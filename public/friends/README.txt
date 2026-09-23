# 友链头像放这里

把友链头像图片（jpg / png / ico 均可）放进本目录，然后在 `content/links.json` 里填：

```json
{ "name": "昵称", "url": "https://example.com", "note": "备注", "avatar": "/friends/xxx.png" }
```

不填 `avatar` 时，卡片自动显示昵称的首字母，所以不放头像也能用。
