import type { CompetitionStatus, ScheduleSlot } from "../domain/types";
import { ManageActions } from "./ManageActions";
import { STATUS_OPTIONS } from "./constants";
import type { ManagerScope, ScheduleDraft } from "./types";

interface ScheduleManagerProps {
  schedule: ScheduleDraft;
  teamNames: Map<string, string>;
  savedAt?: string;
  dirty: boolean;
  busy: "save" | "publish" | null;
  onChange: (schedule: ScheduleDraft) => void;
  onSave: (scope: ManagerScope) => void;
  onPublish: (scope: ManagerScope) => void;
}

function statusLabel(status: CompetitionStatus): string {
  return STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

export function ScheduleManager({
  schedule,
  teamNames,
  savedAt,
  dirty,
  busy,
  onChange,
  onSave,
  onPublish
}: ScheduleManagerProps) {
  const slots = schedule.groups[0]?.slots ?? [];

  function updateSlot(index: number, key: keyof ScheduleSlot, value: string): void {
    const groups = structuredClone(schedule.groups);
    const slot = groups[0]?.slots[index];
    if (!slot) return;
    if (key === "status") slot.status = value as CompetitionStatus;
    else slot[key] = value;
    onChange({ ...schedule, groups });
  }

  function updateEvent(index: number, key: "window" | "note" | "status", value: string): void {
    const eventSchedule = structuredClone(schedule.eventSchedule);
    const eventItem = eventSchedule[index];
    if (!eventItem) return;
    if (key === "status") {
      eventItem.status = value as CompetitionStatus;
      eventItem.statusText = statusLabel(eventItem.status);
    } else {
      eventItem[key] = value;
    }
    onChange({ ...schedule, eventSchedule });
  }

  function updateHeat(
    eventIndex: number,
    heatIndex: number,
    key: "time" | "status",
    value: string
  ): void {
    const eventSchedule = structuredClone(schedule.eventSchedule);
    const heat = eventSchedule[eventIndex]?.heats[heatIndex];
    if (!heat) return;
    if (key === "status") {
      heat.status = value as CompetitionStatus;
      heat.statusText = statusLabel(heat.status);
    } else {
      heat.time = value;
    }
    onChange({ ...schedule, eventSchedule });
  }

  return (
    <section className="manager-section" aria-labelledby="schedule-manager-title">
      <div className="manager-section-head">
        <p className="section-eyebrow">LOCAL SCHEDULE</p>
        <h1 className="section-title" id="schedule-manager-title">赛程管理</h1>
        <p className="section-desc">维护公开赛程的赛事节点、项目状态与 Heat 时间。</p>
      </div>

      <div className="manager-card panel">
        <div className="manager-card-head">
          <div>
            <h2>赛事节点</h2>
            <p>对应公开网页“赛程”页的全天时间线。</p>
          </div>
          <span className="manager-count">{slots.length} 个节点</span>
        </div>
        <div className="schedule-editor-list">
          {slots.map((slot, index) => (
            <fieldset className="manager-editor-block" key={`${index}-${slot.label}`}>
              <legend>{index + 1}. {slot.label || "未命名节点"}</legend>
              <div className="manager-field-grid manager-field-grid-slot">
                <label className="manager-field manager-field-small">
                  <span>时间</span>
                  <input
                    value={slot.time}
                    onChange={(event) => updateSlot(index, "time", event.target.value)}
                  />
                </label>
                <label className="manager-field">
                  <span>标签</span>
                  <input
                    value={slot.label}
                    onChange={(event) => updateSlot(index, "label", event.target.value)}
                  />
                </label>
                <label className="manager-field manager-field-wide">
                  <span>项目 / 节点</span>
                  <input
                    value={slot.event}
                    onChange={(event) => updateSlot(index, "event", event.target.value)}
                  />
                </label>
                <label className="manager-field">
                  <span>区域</span>
                  <input
                    value={slot.zone}
                    onChange={(event) => updateSlot(index, "zone", event.target.value)}
                  />
                </label>
                <label className="manager-field manager-field-small">
                  <span>状态</span>
                  <select
                    value={slot.status}
                    onChange={(event) => updateSlot(index, "status", event.target.value)}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option value={option.value} key={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              </div>
            </fieldset>
          ))}
        </div>
      </div>

      <div className="manager-card panel">
        <div className="manager-card-head">
          <div>
            <h2>Heat / Lane 安排</h2>
            <p>Event 2/3 的队伍顺序由 Event 1 成绩自动重排。</p>
          </div>
        </div>
        <div className="schedule-editor-list">
          {schedule.eventSchedule.map((eventItem, eventIndex) => (
            <fieldset className="manager-editor-block manager-event-editor" key={eventItem.id}>
              <legend>{eventItem.name}</legend>
              <div className="manager-field-grid">
                <label className="manager-field">
                  <span>项目时间</span>
                  <input
                    value={eventItem.window}
                    onChange={(event) => updateEvent(eventIndex, "window", event.target.value)}
                  />
                </label>
                <label className="manager-field manager-field-small">
                  <span>状态</span>
                  <select
                    value={eventItem.status}
                    onChange={(event) => updateEvent(eventIndex, "status", event.target.value)}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option value={option.value} key={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className="manager-field manager-field-wide">
                  <span>备注</span>
                  <input
                    value={eventItem.note}
                    onChange={(event) => updateEvent(eventIndex, "note", event.target.value)}
                  />
                </label>
              </div>

              {eventItem.heats.length > 0 ? (
                <div className="manager-heat-editor-list">
                  {eventItem.heats.map((heat, heatIndex) => (
                    <div className="manager-heat-editor" key={heat.id}>
                      <div className="manager-heat-editor-head">
                        <strong>{heat.name}</strong>
                        <span>{heat.teamIds.map((teamId) => teamNames.get(teamId) ?? teamId).join(" / ")}</span>
                      </div>
                      <label className="manager-field">
                        <span>Heat 时间</span>
                        <input
                          value={heat.time}
                          onChange={(event) => updateHeat(eventIndex, heatIndex, "time", event.target.value)}
                        />
                      </label>
                      <label className="manager-field manager-field-small">
                        <span>状态</span>
                        <select
                          value={heat.status}
                          onChange={(event) => updateHeat(eventIndex, heatIndex, "status", event.target.value)}
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option value={option.value} key={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                  ))}
                </div>
              ) : null}
            </fieldset>
          ))}
        </div>
      </div>

      <ManageActions
        scope="schedule"
        savedAt={savedAt}
        dirty={dirty}
        busy={busy}
        onSave={() => onSave("schedule")}
        onPublish={() => onPublish("schedule")}
      />
    </section>
  );
}
