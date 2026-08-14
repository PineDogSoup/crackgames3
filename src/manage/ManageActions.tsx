import type { ManagerScope } from "./types";

interface ManageActionsProps {
  scope: ManagerScope;
  savedAt?: string;
  dirty: boolean;
  busy: "save" | "publish" | null;
  onSave: () => void;
  onPublish: () => void;
}

function savedLabel(savedAt?: string): string {
  if (!savedAt) return "尚未保存本地草稿";
  return `本地保存于 ${new Date(savedAt).toLocaleString("zh-CN", { hour12: false })}`;
}

export function ManageActions({
  scope,
  savedAt,
  dirty,
  busy,
  onSave,
  onPublish
}: ManageActionsProps) {
  const label = scope === "schedule" ? "赛程" : "成绩";

  return (
    <div className="manager-actions panel">
      <div className="manager-actions-copy">
        <strong>{dirty ? `${label}有未保存修改` : savedLabel(savedAt)}</strong>
        <span>发布会同步 main、生成网页数据并推送到 GitHub。</span>
      </div>
      <div className="manager-action-buttons">
        <button
          className="manager-button manager-button-secondary"
          type="button"
          disabled={busy !== null}
          onClick={onSave}
        >
          {busy === "save" ? "保存中…" : "保存本地"}
        </button>
        <button
          className="manager-button manager-button-primary"
          type="button"
          disabled={busy !== null}
          onClick={onPublish}
        >
          {busy === "publish" ? "发布中…" : "发布到网站"}
        </button>
      </div>
    </div>
  );
}
