import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BottomNavigation, Icon } from "zmp-ui";

const TABS = [
  { key: "/", label: "Khám phá", icon: "zi-home" as const },
  { key: "/dang-tin", label: "Đăng tin", icon: "zi-plus-circle" as const },
  { key: "/tin-cua-toi", label: "Tin của tôi", icon: "zi-user" as const },
];

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const showTabs = TABS.some((t) => t.key === location.pathname);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, overflow: "auto" }}>{children}</div>
      {showTabs && (
        <BottomNavigation
          activeKey={location.pathname}
          onChange={(key) => navigate(key as string)}
        >
          {TABS.map((tab) => (
            <BottomNavigation.Item
              key={tab.key}
              itemKey={tab.key}
              label={tab.label}
              icon={<Icon icon={tab.icon} />}
              activeIcon={<Icon icon={tab.icon} />}
            />
          ))}
        </BottomNavigation>
      )}
    </div>
  );
};

export default Layout;
