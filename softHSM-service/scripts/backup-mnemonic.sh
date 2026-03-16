#!/bin/sh
#
# 助记词备份脚本
# 用途：显示助记词，确认用户已备份后安全删除备份文件
#

set -e

BACKUP_FILE="/var/lib/softhsm-wallet/mnemonic-backup.txt"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 辅助函数：带颜色的 echo（使用 printf 以支持转义序列）
cecho() {
    printf "%b\n" "$1"
}

# 检查备份文件是否存在
if [ ! -f "$BACKUP_FILE" ]; then
    cecho "${RED}❌ 错误: 助记词备份文件不存在${NC}"
    echo "文件路径: $BACKUP_FILE"
    exit 1
fi

# 显示警告信息
clear
cecho "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
cecho "${RED}║                    ⚠️  安全警告 ⚠️                             ║${NC}"
cecho "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
cecho "${YELLOW}此脚本将显示您的助记词（私钥种子）${NC}"
cecho "${YELLOW}请确保：${NC}"
echo "  1. 您在安全的环境中（无他人观看、无监控录像）"
echo "  2. 准备好纸笔进行手写备份"
echo "  3. 不要截图、拍照或复制到剪贴板"
echo ""
printf "%b" "${BLUE}按 Enter 继续，或按 Ctrl+C 取消...${NC}"
read dummy

# 显示助记词
clear
cecho "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
cecho "${GREEN}║                   🔑 助记词 (Mnemonic)                         ║${NC}"
cecho "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# 提取助记词（直接找以小写字母开头的行）
MNEMONIC=$(grep "^[a-z]" "$BACKUP_FILE" | head -1)

if [ -z "$MNEMONIC" ]; then
    cecho "${RED}❌ 错误: 无法从备份文件中提取助记词${NC}"
    exit 1
fi

cecho "${YELLOW}请用纸笔抄写以下助记词：${NC}"
echo ""
cecho "${GREEN}$MNEMONIC${NC}"
echo ""
cecho "${YELLOW}════════════════════════════════════════════════════════════════${NC}"
echo ""

# 让用户抄写
cecho "${BLUE}📝 请在纸上按顺序抄写上述助记词${NC}"
echo ""
printf "%b" "${BLUE}抄写完成后，按 Enter 继续...${NC}"
read dummy

# 验证助记词（让用户重新输入前3个单词）
clear
cecho "${YELLOW}╔════════════════════════════════════════════════════════════════╗${NC}"
cecho "${YELLOW}║                   ✅ 验证备份                                   ║${NC}"
cecho "${YELLOW}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# 提取前3个单词
WORD1=$(echo "$MNEMONIC" | awk '{print $1}')
WORD2=$(echo "$MNEMONIC" | awk '{print $2}')
WORD3=$(echo "$MNEMONIC" | awk '{print $3}')

echo "为了确认您已正确备份，请输入助记词的前3个单词："
echo ""

echo -n "第1个单词: "
read input_word1

echo -n "第2个单词: "
read input_word2

echo -n "第3个单词: "
read input_word3

# 验证
if [ "$input_word1" = "$WORD1" ] && [ "$input_word2" = "$WORD2" ] && [ "$input_word3" = "$WORD3" ]; then
    echo ""
    cecho "${GREEN}✅ 验证成功！前3个单词匹配。${NC}"
else
    echo ""
    cecho "${RED}❌ 验证失败！输入不匹配。${NC}"
    cecho "${RED}请重新检查您的备份，然后再次运行此脚本。${NC}"
    exit 1
fi

# 最终确认删除
echo ""
cecho "${YELLOW}════════════════════════════════════════════════════════════════${NC}"
echo ""
cecho "${RED}⚠️  最终确认 ⚠️${NC}"
echo ""
printf "您即将%b永久删除%b助记词备份文件。\n" "${RED}" "${NC}"
echo "删除后，只能通过您的纸质备份恢复密钥。"
echo ""
printf "%b" "${YELLOW}确认删除备份文件？(输入 'YES' 确认): ${NC}"
read confirmation

if [ "$confirmation" != "YES" ]; then
    echo ""
    cecho "${BLUE}操作已取消。备份文件保留。${NC}"
    exit 0
fi

# 安全删除文件
echo ""
cecho "${BLUE}正在安全删除备份文件...${NC}"

if command -v shred >/dev/null 2>&1; then
    shred -u "$BACKUP_FILE"
    cecho "${GREEN}✅ 备份文件已通过 shred 安全删除${NC}"
else
    rm -f "$BACKUP_FILE"
    cecho "${GREEN}✅ 备份文件已删除${NC}"
fi

# 完成
echo ""
cecho "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
cecho "${GREEN}║                   ✅ 备份流程完成                               ║${NC}"
cecho "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
cecho "${YELLOW}重要提醒：${NC}"
echo "  ✅ 助记词备份文件已删除"
echo "  ✅ 纸质备份请妥善保管（建议多地存储）"
echo "  ✅ 服务重启时将直接使用 HSM 中的密钥"
echo "  ⚠️  如需恢复，请使用您的纸质助记词"
echo ""
