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
  console.log('Finding mention candidates for query:', query);
  console.log('Available users:', users);
  
  if (!users || !Array.isArray(users)) {
    console.log('No users available for mention search');
    return [];
  }
  
  // クエリが空の場合は全ユーザーを返す（最大5人まで）
  if (!query || query.trim() === '') {
    console.log('Empty query, returning up to 5 users');
    return users.slice(0, 5);
  }
  
  const lowerQuery = query.toLowerCase().trim();
  
  // ユーザーリストからクエリに一致するユーザーをフィルタリング
  const filteredUsers = users.filter(user => {
    if (!user) return false;
    
    // ユーザー名の様々な形式をチェック
    const fullName = user.get_full_name || 
                  `${user.first_name || ''} ${user.last_name || ''}`.trim() || 
                  user.display_name ||
                  user.name ||
                  user.username || 
                  user.email || 
                  '';
    
    const username = user.username || '';
    const email = user.email || '';
    
    // 名前、ユーザー名、メールアドレスのいずれかに一致するかチェック
    return fullName.toLowerCase().includes(lowerQuery) || 
           username.toLowerCase().includes(lowerQuery) || 
           email.toLowerCase().includes(lowerQuery);
  });
  
  console.log(`Found ${filteredUsers.length} matching users for query: "${query}"`);
  
  // 最大5人まで表示
  return filteredUsers.slice(0, 5);
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

// Base64画像をBlobに変換する関数
export const dataURLtoBlob = (dataURL) => {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new Blob([u8arr], { type: mime });
};

// Base64エンコードされた画像を抽出する関数
export const extractBase64Images = (htmlContent) => {
  const images = [];
  const regex = /<img[^>]+src="(data:image\/[^;]+;base64,[^"]+)"[^>]*>/g;
  let match;
  
  while ((match = regex.exec(htmlContent)) !== null) {
    images.push(match[1]); // Base64エンコードされた画像URLを抽出
  }
  
  return images;
}; 