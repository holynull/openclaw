#!/usr/bin/env bash
set -euo pipefail

# 彻底清理 Git 历史中的 models.json 文件（可能包含密钥）
# 警告：这会重写整个 Git 历史！

echo "⚠️  警告：此操作将重写整个 Git 历史！"
echo "⚠️  请确保："
echo "   1. 已备份重要数据"
echo "   2. 已通知所有协作者"
echo "   3. 准备好强制推送到远程仓库"
echo ""
read -p "是否继续？(输入 'yes' 确认): " confirm

if [ "$confirm" != "yes" ]; then
  echo "操作已取消"
  exit 1
fi

# 检查是否安装了 git-filter-repo
if ! command -v git-filter-repo &> /dev/null; then
  echo "正在安装 git-filter-repo..."
  if command -v brew &> /dev/null; then
    brew install git-filter-repo
  elif command -v pip3 &> /dev/null; then
    pip3 install --user git-filter-repo
  else
    echo "❌ 请手动安装 git-filter-repo:"
    echo "   brew install git-filter-repo"
    echo "   或"
    echo "   pip3 install git-filter-repo"
    exit 1
  fi
fi

# 备份当前仓库（只备份 .git 目录，不备份工作区）
BACKUP_DIR="../openclaw-backup-$(date +%Y%m%d%H%M%S)"
echo "📦 正在备份 .git 目录到 $BACKUP_DIR..."
mkdir -p "$BACKUP_DIR"
cp -r .git "$BACKUP_DIR/.git"
echo "✅ 备份完成"

# 确保在正确的目录
cd "$(git rev-parse --show-toplevel)"

# 方案 1: 完全删除所有 models.json 文件的历史
echo ""
echo "📝 选择清理方案："
echo "   1. 完全删除所有 models.json 文件的所有历史记录"
echo "   2. 只删除特定路径的 models.json"
echo "   3. 替换历史中的密钥为占位符（保留文件结构）"
read -p "请选择 (1/2/3): " choice

case $choice in
  1)
    echo "🗑️  正在删除所有 **/models.json 的历史记录..."
    git-filter-repo --path-glob '**/models.json' --invert-paths --force
    ;;
  2)
    echo "请输入要删除的完整路径（例如：openclaw_catw/agents/main/agent/models.json）"
    read -p "路径: " file_path
    echo "🗑️  正在删除 $file_path 的历史记录..."
    git-filter-repo --path "$file_path" --invert-paths --force
    ;;
  3)
    echo "🔄 正在替换历史中的密钥..."
    # 创建替换规则文件
    cat > /tmp/replace-keys.txt <<'EOF'
regex:"apiKey"\s*:\s*"sk-[^"]+==>"apiKey": "${API_KEY}"
regex:"apiKey"\s*:\s*"[a-zA-Z0-9_-]{20,}==>"apiKey": "${API_KEY}"
EOF
    git-filter-repo --replace-text /tmp/replace-keys.txt --force
    rm /tmp/replace-keys.txt
    ;;
  *)
    echo "❌ 无效选择"
    exit 1
    ;;
esac

echo ""
echo "✅ 历史清理完成！"
echo ""
echo "📋 后续步骤："
echo "   1. 检查清理结果："
echo "      git log --all --full-history -- '**/models.json'"
echo ""
echo "   2. 强制推送到远程仓库（⚠️ 危险操作）："
echo "      git push origin --force --all"
echo "      git push origin --force --tags"
echo ""
echo "   3. 通知所有协作者重新克隆仓库："
echo "      git clone <repo-url>"
echo ""
echo "   4. 如果需要恢复，使用备份："
echo "      rm -rf .git && cp -r $BACKUP_DIR/.git ."
echo ""
echo "⚠️  注意：旧的密钥已暴露，请立即："
echo "   - 撤销/重置所有暴露的 API 密钥"
echo "   - 检查是否有未授权使用"
