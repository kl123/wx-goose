// utils/chatFilter.js
export const useChatFilter = () => {
  // 关键词黑名单
  const BLACKLIST = ['小说', '代码', '写作', '图片生成']
  
  // 请求有效性检查
  const checkValidRequest = (text) => {
    // 前置关键词过滤
    const hasInvalid = BLACKLIST.some(word => text.includes(word))
    if (hasInvalid) return false

    // 添加更多自定义过滤规则...
    return true
  }

  return { checkValidRequest }
}