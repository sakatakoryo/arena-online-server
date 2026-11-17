# オリジナル対戦アリーナ：オンライン通信サーバー

このフォルダは、PythonAnywhere上のDjangoゲームとは別に動かすNode.js + WebSocketサーバーです。

## 対応するルーム
- `1v1`：最大2人
- `2v2`：最大4人（参加順にチーム1・2へ交互に割り当て）
- `ffa4`：最大4人乱闘

この段階のサーバーは、ルーム作成・参加・満員判定・準備完了・メッセージ中継を担当します。
**ゲーム本体の4人対応や、攻撃・ダメージ・残機の同期はまだ接続されていません。**
現行のgame.htmlは2人（player/enemy）を前提としているため、次の段階でゲーム側の改修が必要です。

## Renderへの配置
1. このZIPを展開します。
2. 中身をGitHubの新しい公開/非公開リポジトリにアップロードします。
3. Renderで New → Web Service を選び、GitHubリポジトリを接続します。
4. Runtime: Node
5. Build Command: `npm install`
6. Start Command: `npm start`
7. デプロイ後、`https://あなたのサービス名.onrender.com/health` を開き、`"ok":true` が返ることを確認します。
8. WebSocket URLは `wss://あなたのサービス名.onrender.com/ws` です。

Renderの無料枠はスリープする場合があり、復帰時に接続まで時間がかかることがあります。

## 通信プロトコル（概要）

接続直後：
```json
{"type":"connected","playerId":"..."}
```

ルーム作成：
```json
{"type":"createRoom","mode":"1v1"}
```
modeは `1v1` / `2v2` / `ffa4` のいずれか。

ルーム参加：
```json
{"type":"joinRoom","code":"ABC234"}
```

準備完了：
```json
{"type":"ready","ready":true}
```

ゲーム同期用の中継：
```json
{"type":"input","payload":{"left":false,"right":true,"jump":false,"attack":false}}
```
サーバーから他の参加者へは `relay` として届きます。

## ローカル起動（Node.js 20以上）
```bash
npm install
npm start
```
`http://localhost:10000/health` がヘルスチェックです。
