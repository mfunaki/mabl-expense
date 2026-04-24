# GitHub Secrets セットアップガイド

## 必要なSecretsの一覧

GitHubリポジトリの **Settings → Secrets and variables → Actions → New repository secret** から設定します。

### 1. GCP_PROJECT_ID

**説明:** Google CloudプロジェクトID

**取得方法:**
```bash
gcloud projects list
```

**設定値の例:**
```
my-expense-app-123456
```

---

### 2. WIF_PROVIDER

**説明:** Workload Identity Provider のリソース名

**取得方法:**
```bash
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)")
echo "projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-pool/providers/github-provider"
```

**設定値の例:**
```
projects/123456789012/locations/global/workloadIdentityPools/github-pool/providers/github-provider
```

---

### 3. WIF_SERVICE_ACCOUNT

**説明:** GitHub Actions用サービスアカウント

**取得方法:**
```bash
echo "github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com"
```

**設定値の例:**
```
github-actions@my-expense-app-123456.iam.gserviceaccount.com
```

---

### 4. CLOUD_SQL_CONNECTION_NAME

**説明:** Cloud SQLインスタンスの接続名

**取得方法:**
```bash
gcloud sql instances describe expense-db --format="value(connectionName)"
```

**設定値の例:**
```
my-expense-app-123456:asia-northeast1:expense-db
```

---

### 5. CORS_ORIGIN

**説明:** Web フロントエンドのURL（本番環境）

**設定値の例:**
```
https://my-expense-app.vercel.app
```

開発環境では `*` も可能ですが、本番環境では具体的なURLを指定してください。

---

## 設定の確認

すべてのSecretsが設定されたら、以下のコマンドで確認:

```bash
gh secret list
```

または、GitHubのWeb UIで確認:
`https://github.com/YOUR_USER/mabl-expense/settings/secrets/actions`

---

## トラブルシューティング

### Secretが正しく設定されているか確認

GitHub Actionsのログで環境変数が正しくマスクされているか確認してください。

### Workload Identity のテスト

ローカルで認証をテスト:

```bash
gcloud iam workload-identity-pools create-cred-config \
  projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/providers/github-provider \
  --service-account=github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --output-file=credentials.json \
  --credential-source-file=token.txt
```
