# pg-chengyu

瀏覽器**成語接龍**：以上一字末字起頭、挑戰計分／人機對戰、倒數與生命、候選點選或自行輸入。純前端；**mobile-first**。

詞庫為常見四字成語小品集合，致敬傳統接龍玩法，非任一商業作品復刻。

也可當作 [Playgrounds（遊樂場）](https://play.samkuo.me/) 的 **SAM**（`index.html` 入口）。

## 一鍵開 SAM

**[一鍵開 SAM](https://play.samkuo.me/?open=sampot%2Fpg-chengyu&name=%E6%88%90%E8%AA%9E%E6%8E%A5%E9%BE%8D)**

```
https://play.samkuo.me/?open=sampot/pg-chengyu&name=成語接龍&fresh=1
```

同源會重用本機已匯入的沙盒；要強制新建可加 `&fresh=1`。

## 試玩（本機）

```bash
npx --yes serve .
# 或
python3 -m http.server 8080
```

點一下頁面後音效才會出聲。

## 操作

| 操作 | 說明 |
| --- | --- |
| **開局／重開** | 依模式與難度開始 |
| 候選成語 | 點選接龍（含干擾項） |
| 自行輸入 | 輸入詞庫內四字成語後送出 |
| **跳過／認輸** | 挑戰扣命；對戰直接落敗 |
| **音效** | 開／關 |

## 規則摘要

- 下一語須以上一語最後一字開頭，且為四字成語、不可重複。
- **挑戰**：限時作答，答錯或逾時扣命。
- **對戰**：與簡易 AI 輪流；對方接不上你即勝。

## License

MIT
