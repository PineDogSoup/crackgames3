import { PUBLIC_TABS, type PublicTabId } from "../config";

interface BottomNavProps {
  activeTab: PublicTabId;
  onChange: (tabId: PublicTabId) => void;
}

export function BottomNav({ activeTab, onChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="公开页面">
      {PUBLIC_TABS.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            className={active ? "nav-item nav-item-active" : "nav-item"}
            type="button"
            aria-current={active ? "page" : undefined}
            onClick={() => onChange(tab.id)}
          >
            <img
              className="nav-icon"
              src={`${import.meta.env.BASE_URL}assets/icons/tabbar-${tab.icon}${active ? "-active" : ""}.png`}
              alt=""
              aria-hidden="true"
              draggable={false}
            />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
