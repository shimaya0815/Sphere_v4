/**
 * タスクエディターのセクションコンポーネント
 * - インデックスファイル：個別のコンポーネントファイルからエクスポート
 */
import TaskBasicInfoSection from './TaskBasicInfoSection';
import TaskAssigneeSection from './TaskAssigneeSection';
import TaskDatePrioritySection from './TaskDatePrioritySection';
import TaskDescriptionSection from './TaskDescriptionSection';
import TaskMetaInfoSection from './TaskMetaInfoSection';
import TaskAdditionalSettingsSection from './TaskAdditionalSettingsSection';
import TaskRecurrenceSection from './TaskRecurrenceSection';

// ヘッダーとフッターコンポーネント
import TaskEditorHeader from './TaskEditorHeader';
import TaskEditorFooter from './TaskEditorFooter';

// 共通スタイル
import * as styles from './lib/styles';

// 全てのセクションコンポーネントをエクスポート
export {
  TaskBasicInfoSection,
  TaskAssigneeSection,
  TaskDatePrioritySection,
  TaskDescriptionSection,
  TaskMetaInfoSection,
  TaskAdditionalSettingsSection,
  TaskRecurrenceSection,
  TaskEditorHeader,
  TaskEditorFooter
};

// スタイル定義をエクスポート
export const {
  inputClassName,
  selectClassName,
  textareaClassName,
  sectionContainerClassName,
  sectionTitleClassName,
  gridTwoColClassName,
  labelClassName
} = styles;