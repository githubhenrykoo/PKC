# Fork Synchronization Setup

This document explains how to set up automatic synchronization between the original PKC repository and the Unio-ai fork.

## 🔄 How It Works

1. **Original Repository** (henrykoo/PKC): When you push changes, it notifies the fork
2. **Fork Repository** (Unio-ai/PKC): Automatically pulls and merges changes from upstream

## 🔧 Setup Required

### For Your Original Repository (henrykoo/PKC)

#### 1. GitHub Secrets to Add

Go to **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `UNIO_FORK_TOKEN` | Personal Access Token for Unio-ai account | Unio-ai creates PAT with `repo` scope |

#### 2. Steps to Get UNIO_FORK_TOKEN

1. Unio-ai logs into GitHub
2. Goes to **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
3. Clicks **Generate new token (classic)**
4. Name: `PKC Fork Sync Token`
5. Scopes: Select `repo` (Full control of private repositories)
6. Generates token and shares it with you
7. You add it as `UNIO_FORK_TOKEN` secret in your repository

### For Unio-ai Fork Repository (Unio-ai/PKC)

#### 1. Enable GitHub Actions

- Go to **Settings** → **Actions** → **General**
- Set **Actions permissions** to "Allow all actions and reusable workflows"
- Save changes

#### 2. No Additional Secrets Needed

The fork uses the built-in `GITHUB_TOKEN` which has sufficient permissions for syncing.

## 🚀 How Synchronization Works

### Automatic Triggers

1. **Daily Sync**: Every day at 2 AM UTC, the fork checks for updates
2. **Push Trigger**: When you push to main, your repo notifies the fork immediately
3. **Manual Trigger**: Unio-ai can manually trigger sync via Actions tab

### Sync Process

1. **Fetch Changes**: Gets latest changes from upstream (your repo)
2. **Check Differences**: Compares commits to see if sync is needed
3. **Backup**: Creates backup branch before syncing
4. **Merge**: Attempts automatic merge
5. **Conflict Resolution**: If conflicts exist, creates a PR for manual resolution
6. **Push**: Updates the main branch with synchronized changes

### Conflict Handling

- **No Conflicts**: Changes merge automatically
- **Conflicts Detected**: 
  - Creates backup branch
  - Creates new branch with resolved conflicts (keeping upstream changes)
  - Requires manual PR review and merge

## 📋 Testing the Setup

### 1. Initial Test

1. Unio-ai forks your repository
2. You add the `UNIO_FORK_TOKEN` secret
3. Make a small change to your repository and push
4. Check if the fork receives the update within a few minutes

### 2. Manual Test

1. Go to Unio-ai fork → **Actions** tab
2. Find "Sync from Upstream" workflow
3. Click **Run workflow** → **Run workflow**
4. Monitor the workflow execution

## 🔍 Monitoring

### In Your Repository (henrykoo/PKC)

- **Actions** tab shows "Notify Forks of Updates" workflow
- Check if notifications are sent successfully

### In Fork Repository (Unio-ai/PKC)

- **Actions** tab shows "Sync from Upstream" workflow
- Check sync status and any conflicts
- Review backup branches if conflicts occurred

## 🚨 Important Notes

### For You (Original Repository Owner)

- ✅ You only need to add one secret: `UNIO_FORK_TOKEN`
- ✅ No ongoing maintenance required
- ✅ Fork sync happens automatically
- ⚠️ Keep the PAT token secure and rotate it periodically

### For Unio-ai (Fork Owner)

- ✅ No secrets to manage
- ✅ Automatic daily syncing
- ✅ Backup branches created before each sync
- ⚠️ Review and resolve conflicts manually when they occur
- ⚠️ Test the sync process after initial setup

## 🔧 Troubleshooting

### Common Issues

1. **Sync fails**: Check if GitHub Actions are enabled in the fork
2. **Permission denied**: Verify `UNIO_FORK_TOKEN` is valid and has `repo` scope
3. **Merge conflicts**: Check for conflict resolution branches and create PRs
4. **No notifications**: Verify the token and repository names are correct

### Logs and Debugging

- Check **Actions** tab in both repositories
- Review workflow logs for detailed error messages
- Look for backup branches if sync fails

## 📞 Support

If sync issues occur:

1. Check the Actions logs in both repositories
2. Verify all secrets are configured correctly
3. Test manual sync trigger first
4. Review any backup branches created during failed syncs

This setup ensures Unio-ai fork stays synchronized with your updates while maintaining independence and proper conflict resolution.
