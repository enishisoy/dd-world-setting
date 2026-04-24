# DD_WORLD 設定管理

DDシリーズの世界観・設定をJSON形式で管理するリポジトリです。

## フォルダ構成

- `DD_WORLD/world/`  
  世界原理・運用ルール・地図・時系列を管理

- `DD_WORLD/index/`  
  用語索引・因子相性表を管理

- `DD_WORLD/system/`  
  パッチ・運用ルールを管理

- `DD_WORLD/build/`  
  ファイル目録・読込順を管理

- `DD_WORLD/character/`  
  キャラクター個別ログを管理

- `DD_WORLD/story/`  
  各章ストーリーコードを管理

## 推奨読込順

1. `DD_WORLD/build/build_index.json`
2. `DD_WORLD/system/patch_set_latest.json`
3. `DD_WORLD/world/world_log.json`
4. `DD_WORLD/world/world_rules.json`
5. `DD_WORLD/world/timeline_master.json`
6. `DD_WORLD/world/world_map_tokyo.json`
7. `DD_WORLD/world/government_access_hierarchy.json`
8. `DD_WORLD/world/location_index.json`
9. `DD_WORLD/index/world_index_log.json`
10. `DD_WORLD/index/factor_compatibility_index.json`

## 運用ルール

- 世界原理は `world_log.json`
- 運用ルールは `world_rules.json`
- 物語詳細は `story/`
- キャラクター詳細は `character/`
- 変更履歴は `system/patch_set_latest.json`

## 状態

初期構造アップロード済み。
