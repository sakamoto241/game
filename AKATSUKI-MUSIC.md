# BGM試作「灯りだけが、覚えている」

`akatsuki-bgm-lantern-preview.html` が試聴ページ。音源は `akatsuki-bgm-lantern.mp3`。約87.27秒、3/4拍子、66BPM、D minor、32小節。暗い街・タイトル・静かな会話を想定し、固定の旋律と和声で作曲。録音されたピアノに、合成した低音・暖かいパッド・遠い鐘を重ねている。歌詞や実際の人の歌唱は含まない。

この試作を追加した時点のゲーム本体には、Claude側の `akatsuki-music.js` にWeb Audioで生成する場所別BGMと効果音がある。ゲーム側のコード・音楽の選択・セーブ・ミュート設定は変更せず、新しい音源は独立した試聴ページで聴けるようにした。将来採用する場合は既存音楽エンジンの `FILES` マップから指定できるが、その切り替えは未実施。

## 音楽と配信

- MP3はステレオ44.1kHz、約1.25MB。固定ファイルの再生だけで、再生時の音楽生成APIや追加の有料サービスは不要。
- 波形のピークに余裕を残し、実測のintegrated loudnessから静的ゲインで約−20 LUFSへ調整。原音ミックスのピークは−3.10dBTP、最終MP3は約−6dBFSの余裕を持つ。
- 153の演奏イベント。8小節ごとのA/B/C/A構成。ピアノの繰り返しは譜面で固定し、音量とタイミングだけ小さく変化させた。パッドと鐘の音高も固定。
- 音の減衰と室内残響を曲頭へ折り返し、フィルターも末尾を使って状態を温めてから出力する。ループ時の不自然な無音や大きな振幅ジャンプを抑えた。
- 試聴ページは `preload=none`、自動再生なし。通常のブラウザの再生ボタンで再生。ループのオン/オフとダウンロード、クレジットページを用意。ページが非表示になれば一時停止。

## 素材とライセンス

録音ピアノ：N. P. Brosowsky / tonejs-instruments、CC BY 3.0。
`akatsuki-bgm-lantern-credits.html` に出典、ライセンスリンク、変更内容を明記。再配布・ゲームへの採用時もこの帰属情報を表示すること。
使用音：C4、E4、F4、G4、A4、B4、C5、D5、E5、F5。音高の微調整、トリミング、音量・定位・残響の変更を行った。低音・パッド・鐘は合成。オリジナルのメロディーを新たに作り、既存曲を引用・採譜していない。

## 再制作

`tools/render-akatsuki-lantern-bgm.py` に譜面と音づくりのソース。
依存：Python、NumPy、SciPy、ffmpeg。録音ピアノの不足分は同ツールが配布元から取得してキャッシュする。

```
python3 tools/render-akatsuki-lantern-bgm.py --samples /path/to/sample-cache --output /tmp/lantern.wav --score /tmp/lantern-score.json
```

`akatsuki-bgm-lantern-score.json` は演奏イベントと素材URL・SHA256を含む。制作用WAVは公開ファイルに含めず、圧縮したMP3を配信する。

この試作を公開した際は、出力WAVをffmpegのloudnormで計測し、−20 LUFSとの差に当たる−3.18dBの静的ゲインを加えてMP3化（libmp3lame、q=3、44.1kHz）した。波形・音量の確認結果は `/workspace/artifacts/akatsuki/lantern-bgm-analysis.json`。

## 確認

`/workspace/artifacts/akatsuki/test_bgm_preview.py` でMP3のデコード・長さ・有限値・ヘッドルーム・モノラル互換を確認。ブラウザではネイティブコントロールによる実再生、初期の非再生とpreload、終端停止とループ、320px〜PCの横幅、保存リンク、クレジットページを確認した。音楽の好みや最終採用は試聴で判断するための試作。

ローカルの簡易HTTPサーバーはRangeを返さないため、終端へ飛ばす検証だけは同じMP3を完全取得したBlobで行う。初回の再生はHTTPの音源URLで確認する。
