# デプロイガイド

## 前提条件

- Google Cloud プロジェクト
- GitHub リポジトリ
- gcloud CLI のインストール

## 1. Google Cloud セットアップ

### 1.1 プロジェクト作成と設定

```bash
# プロジェクト作成
gcloud projects create YOUR_PROJECT_ID
gcloud config set project YOUR_PROJECT_ID

# 課金アカウントの設定
gcloud beta billing projects link YOUR_PROJECT_ID \
  --billing-account=BILLING_ACCOUNT_ID
```

### 1.2 必要なAPIの有効化

```bash
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable cloudresourcemanager.googleapis.com
gcloud services enable iam.googleapis.com
gcloud services enable iamcredentials.googleapis.com

# APIの有効化には数分かかる場合があります
echo "Waiting for APIs to be enabled..."
sleep 30
```

### 1.3 Artifact Registry リポジトリの作成

```bash
gcloud artifacts repositories create expense-app \
  --repository-format=docker \
  --location=asia-northeast1 \
  --description="Expense app container images"
```

### 1.4 Cloud SQL インスタンスの作成

```bash
# PostgreSQLインスタンスの作成
gcloud sql instances create expense-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=asia-northeast1 \
  --root-password=CHOOSE_A_STRONG_PASSWORD

# データベースの作成
gcloud sql databases create expense_db --instance=expense-db

# ユーザーの作成
gcloud sql users create expense_user \
  --instance=expense-db \
  --password=CHOOSE_A_STRONG_PASSWORD

# 接続名の確認
gcloud sql instances describe expense-db --format="value(connectionName)"
```

### 1.5 Secret Manager でシークレットを作成

**注意:** Secret Manager APIが有効化されていることを確認してください。

```bash
# Secret Manager APIの有効化確認
gcloud services list --enabled --filter="name:secretmanager.googleapis.com"

# DATABASE_URLの作成
echo -n "postgresql://expense_user:PASSWORD@/expense_db?host=/cloudsql/PROJECT_ID:asia-northeast1:expense-db" | \
  gcloud secrets create database-url --data-file=-

# Secret ManagerへのアクセスをCloud Runに許可
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)")
gcloud secrets add-iam-policy-binding database-url \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

**トラブルシューティング:**

もしAPIが有効化されていない場合:
```bash
gcloud services enable secretmanager.googleapis.com
# 有効化完了まで30秒〜数分待つ
sleep 60
```

## 2. Workload Identity Federation のセットアップ

```bash
# Workload Identity Pool の作成
gcloud iam workload-identity-pools create "github-pool" \
  --location="global" \
  --display-name="GitHub Actions Pool"

# OIDC Provider の作成
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository_owner == 'YOUR_GITHUB_USER'" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# サービスアカウントの作成
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions Service Account"

# 権限の付与
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Workload Identity のバインディング
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)")

gcloud iam service-accounts add-iam-policy-binding \
  github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-pool/attribute.repository/YOUR_GITHUB_USER/mabl-expense"
```

**重要:** `YOUR_GITHUB_USER` を実際のGitHubユーザー名またはOrganization名に置き換えてください。

## 3. GitHub Secrets の設定

GitHubリポジトリの **Settings → Secrets and variables → Actions → Repository secrets** で以下を設定:

**New repository secret** ボタンをクリックして、以下の5つのsecretsを追加してください。

### 必須のSecrets (Repository secrets)

| Secret名 | 値 | 説明 |
|---------|-----|------|
| `GCP_PROJECT_ID` | `YOUR_PROJECT_ID` | Google CloudプロジェクトID |
| `WIF_PROVIDER` | `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/providers/github-provider` | Workload Identity Provider |
| `WIF_SERVICE_ACCOUNT` | `github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com` | サービスアカウント |
| `CLOUD_SQL_CONNECTION_NAME` | `PROJECT_ID:asia-northeast1:expense-db` | Cloud SQL接続名 |
| `CORS_ORIGIN` | `https://your-frontend-domain.com` または `*` (開発時) | フロントエンドのURL |
| `MABL_API_KEY` | mabl APIキー | mablテスト実行用の認証キー |

### WIF_PROVIDER の取得方法

```bash
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)")
echo "projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-pool/providers/github-provider"
```

**注意:** Environment secretsは使用しません。すべて Repository secrets として設定してください。

## 4. 初回デプロイ

### 4.1 コードをプッシュ

```bash
git add .
git commit -m "Setup Cloud Run deployment"
git push origin main
```

### 4.2 デプロイの確認

GitHub Actionsのワークフローが自動実行されます。

進行状況: **Actions** タブで確認

### 4.3 サービスURLの確認

```bash
gcloud run services describe expense-app-api \
  --platform managed \
  --region asia-northeast1 \
  --format 'value(status.url)'
```

### 4.4 CIでのAPIテスト (mabl)

ワークフロー `.github/workflows/deploy-api.yml` はデプロイ成功後に以下の手順でmablテストを実行します：

1. **mabl CLI のインストール**  
   ```bash
   npm install -g @mablhq/mabl-cli
   ```

2. **認証**  
   ```bash
   mabl-cli auth activate-key ${{ secrets.MABL_API_KEY }}
   ```

3. **テスト実行**  
   ```bash
   mabl tests run --id ykrgAm2iDrn2sTYoH3Xm3Q-j --reporter mabl
   ```
   `--reporter mabl` を指定することで、テスト結果がmablアプリに自動的に公開されます。

**設定要件:**
- 必須シークレット: `MABL_API_KEY` (リポジトリ secrets) を設定してください。
- mabl 側のテストIDを変更する場合はワークフロー内の `mabl tests run --id ...` を更新してください。
- テスト失敗時はジョブが失敗するので、Actions タブでログを確認し、必要に応じてリトライしてください。

## 5. 本番環境の確認

```bash
# サービスURL取得
SERVICE_URL=$(gcloud run services describe expense-app-api \
  --platform managed \
  --region asia-northeast1 \
  --format 'value(status.url)')

# APIテスト
curl ${SERVICE_URL}/api/reset -X POST
curl ${SERVICE_URL}/api/expenses -H "Authorization: employee"
```

## 6. トラブルシューティング

### ログの確認

```bash
gcloud run services logs read expense-app-api \
  --region=asia-northeast1 \
  --limit=50
```

### Cloud SQL接続の確認

```bash
gcloud sql instances describe expense-db
```

### Secret Managerの確認

```bash
gcloud secrets versions access latest --secret=database-url
```

### mabl テスト実行エラーの対応

**エラー: `AxiosError: Request failed with status code 403`**

認証は成功しているが、テスト実行時に 403 エラーが発生する場合：

1. **テストIDとワークスペースの確認**  
   - mabl アプリ（https://app.mabl.com）で該当テストを開く
   - URLから正しいテストIDを確認（例: `/tests/{test-id}`）
   - そのテストが存在するワークスペースを確認

2. **APIキーの権限確認**  
   - mabl アプリ → Settings → API Keys
   - 使用しているAPIキーが正しいワークスペースに所属しているか確認
   - APIキーに「Test Execution」権限があるか確認

3. **ワークスペースIDの指定**  
   複数のワークスペースがある場合、ワークスペースIDを明示的に指定する必要があります：
   ```bash
   mabl tests run --id ykrgAm2iDrn2sTYoH3Xm3Q-j --workspace-id YOUR_WORKSPACE_ID --reporter mabl
   ```
   ワークスペースIDは mabl アプリの Settings → Workspace から確認できます。

4. **環境IDの指定（推奨）**  
   環境変数やFind情報を使用する場合：
   ```bash
   mabl tests run --id ykrgAm2iDrn2sTYoH3Xm3Q-j --environment-id YOUR_ENVIRONMENT_ID --reporter mabl
   ```

5. **ローカルでの検証**  
   ```bash
   npm install -g @mablhq/mabl-cli
   mabl auth activate-key YOUR_MABL_API_KEY
   mabl tests run --id ykrgAm2iDrn2sTYoH3Xm3Q-j --reporter mabl
   ```
   ローカルで同じコマンドを実行して、同じエラーが出るか確認

6. **新しいAPIキーの生成**  
   - mabl アプリで新しいAPIキーを生成
   - 正しいワークスペースとスコープ（Test Execution）を選択
   - GitHub Repository secrets の `MABL_API_KEY` を更新

## 7. セキュリティのベストプラクティス

- ✅ 環境変数ファイル(`.env`)をGitに含めない
- ✅ Secret Managerでクレデンシャルを管理
- ✅ Workload Identity Federationで認証
- ✅ Cloud SQLへのアクセスはプライベート接続
- ✅ CORS設定で許可するオリジンを制限

## 8. コスト最適化

```bash
# 最小インスタンス数を0に設定（アイドル時は課金なし）
gcloud run services update expense-app-api \
  --min-instances=0 \
  --region=asia-northeast1

# Cloud SQLの自動バックアップ無効化（開発環境）
gcloud sql instances patch expense-db \
  --no-backup
```

## 9. フロントエンドのデプロイ（Vercel推奨）

```bash
# Vercelにデプロイ
cd apps/web
vercel --prod

# 環境変数の設定
vercel env add NEXT_PUBLIC_API_URL production
# 値: https://YOUR-CLOUD-RUN-URL
```

## 10. モバイルアプリの設定更新

```bash
# apps/mobile/.env
EXPO_PUBLIC_API_URL=https://YOUR-CLOUD-RUN-URL
```

---

**次のステップ:**
- カスタムドメインの設定
- Cloud CDNの有効化
- モニタリングとアラートの設定
