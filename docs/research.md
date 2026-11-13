# 公式統計の調査記録（2026-11-12）

## 採用経路

農林水産省の [果樹統計](https://www.maff.go.jp/j/tokei/kouhyou/sakumotu/sakkyou_kazyu/) の「確報 → 令和6年産」から [e-Stat統計表一覧](https://www.e-stat.go.jp/stat-search/files?page=1&layout=datalist&lid=000001473248) を辿った。表3の「みかん → 計」を選択し、[DB表0004046674](https://www.e-stat.go.jp/dbview?sid=0004046674) と [ファイル000040387931](https://www.e-stat.go.jp/stat-search/file-download?statInfId=000040387931&fileKind=0) を対応づけた。

単なる検索候補のIDではなく、両ページ・Excel本文の年次・品目・表題・収穫量列・単位を確認済み。DBページの公表区分は確報、公開年月日時分は2026-03-31 00:00。採用した年産は2024で、公表年と異なる。

Excelをバイト列のまま保存し、ハッシュ・取得日時・URL・セル指定を `data/mikan-2024.json` に保存した。収穫量はG列で、H列の出荷量やK列の対前年産比ではない。原本G12全国559600、G14:G33の20府県を全件抽出した。地名の正式名称化と単位の半角化以外に数値の変更はない。CSVはこの原本から抽出した派生物であり、政府直接配布のCSVではない。

47都道府県は掲載されていないため、汎用パーサーの「47件必須」を解除するのでなく、掲載範囲を持つ専用アダプターを追加した。未掲載27件をゼロとして扱わず、表に「未掲載」、図版に「公表20地域内の上位」と注記する。全国値と公表県合計の残差4657tを県へ配賦しない。上位10までの県別値・その他・全公表県の表示割合はREADMEとテストで確認できる。

## API 3.0仕様の確認

出典：[API仕様案内](https://www.e-stat.go.jp/api/api-info/api-spec)、[Ver3.0公式PDF](https://www.e-stat.go.jp/api/sites/default/files/uploads/2019/07/API-specVer3.0.pdf)（2019年7月、独立行政法人統計センター）。本文頁2、4、6〜8、17〜18、36以降を参照。

- JSON形式・GET：`https://api.e-stat.go.jp/rest/3.0/app/json/getStatsList`、`getMetaInfo`、`getStatsData`。
- 全共通 `appId` 必須、`lang=J` が既定。
- `getStatsList` で表を検索し、`getMetaInfo` の `CLASS_INF` から表章事項・分類事項・地域・時間・単位を確認して絞り込む。
- メタ取得の `statsDataId` は必須。データ取得は `statsDataId` または `dataSetId` を指定する。`statInfId` はExcelファイルの識別子で、APIの表IDと混同しない。
- `cdTab`・`cdCat01`等のコードを名前や表示順から推測しない。今回は未認証なのでコードの確定・実装は保留した。
- `getStatsData` は `limit` と `startPosition`（1始まり）、応答の `NEXT_KEY` を使って継続取得。`limit`省略時10万件。`metaGetFlg=Y` が既定。単一オブジェクト／配列・欠測記号・単位・注記・全件取得完了を正規化時に確認する設計とする。
- `RESULT.STATUS=0` が正常。1（該当なし）や100（認証失敗）等を区別し、HTTP 200だけで成功と判定しない。

将来の認証付き取得はサーバー／ローカルCLIに限定する。実行時に秘密を安全に注入し、秘密を含まない共通モデル・出典情報だけを静的アプリに渡す。ブラウザへのキー入力・localStorage・ログ・公開URL・Gitへの保存は行わない。古い計画にあった「ブラウザでキーを保持する」案は採用しない。

## 接続確認と認証エラーの切り分け

現在の実行環境で、www.e-stat.go.jp / api.e-stat.go.jp / www.maff.go.jp の許可が適用中であることを状態情報と新規接続で確認した。公式案内、API仕様PDF、DB表、MAFFページ、公式ExcelはHTTP 200。旧環境のプロキシCONNECT段階の403は再現しない。

環境の設定情報・変数名にアプリケーションIDのバインディングはなかった。秘密値の閲覧・出力は行っていない。appIdを付けない読み取り照会：

`https://api.e-stat.go.jp/rest/3.0/app/json/getMetaInfo?statsDataId=0004046674`

実測 HTTP 200、JSON `GET_META_INFO.RESULT.STATUS=100`、ERROR_MSG「認証に失敗しました。アプリケーションIDを確認して下さい。」。これは疎通の成功と認証の失敗を示す。仕様書では認証エラーのHTTPコードは403だが観測は200であり、この差を記録した。APIのCORS応答があっても、ブラウザへ認証情報を渡す理由にはしない。認証なしの試行を繰り返さず、公式原本での実データ検証を完成させた。

API認証成功・実際のメタ分類・API実値とExcelの一致は未検証。安全な認証付き取得ジョブを実装する際に、原本と同一年・同一品目・同一指標・同一単位・同一公表地域を確認してから比較する。今回の静的アプリ利用に認証情報の追加は不要。
