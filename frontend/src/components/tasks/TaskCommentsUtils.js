// 日付フォーマット用関数
export const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
  } catch (error) {
    return dateString;
  }
};

// メンション検出用の正規表現
export const MENTION_REGEX = /@(\w+(?:\s+\w+)*)/g;

// メンション候補の検索
export const findMentionCandidates = (query, users) => {
  if (!query || !users || !Array.isArray(users)) return [];
  
  const lowerQuery = query.toLowerCase();
  
  // ユーザーリストからクエリに一致するユーザーをフィルタリング
  return users
    .filter(user => {
      const fullName = user.get_full_name || 
                      `${user.first_name || ''} ${user.last_name || ''}`.trim() || 
                      user.email || 
                      user.username || 
                      '';
      return fullName.toLowerCase().includes(lowerQuery);
    })
    .slice(0, 5); // 最大5人まで表示
};

// メンションされたユーザーのIDを抽出
export const extractMentionedUserIds = (mentionedUsers) => {
  if (!mentionedUsers || !Array.isArray(mentionedUsers)) return [];
  return mentionedUsers.map(user => user.id);
};

// Quillエディタのモジュール設定
export const quillModules = {
  toolbar: [
    ['bold', 'italic', 'underline', 'strike'],
    ['blockquote', 'code-block'],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    ['link', 'image'],
    ['clean']
  ],
  clipboard: {
    matchVisual: false,
  },
  // キーボードモジュールを追加（メンション処理用）
  keyboard: {
    bindings: {
      // このオブジェクトはメンション機能で利用する特殊なキーバインディングを定義するために使用される
      // 実際のキー処理はコンポーネント内で行う
    }
  }
};

// フォーマット指定
export const quillFormats = [
  'bold', 'italic', 'underline', 'strike',
  'blockquote', 'code-block',
  'list', 'bullet',
  'link', 'image'
]; 