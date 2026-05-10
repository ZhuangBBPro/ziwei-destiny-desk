import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/charts/new", label: "新建命盘" },
  { to: "/cases", label: "案例库" },
  { to: "/palace-library", label: "宫位文案库" },
  { to: "/settings", label: "设置" },
];

export function AppShell() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(182,134,44,0.16),_transparent_35%),linear-gradient(180deg,_#faf6ef_0%,_#f4ede1_100%)] text-ink">
      <div className="mx-auto flex min-h-screen max-w-[1760px] flex-col px-3 py-3 md:px-4 lg:flex-row lg:gap-4 lg:px-5 xl:gap-5 xl:px-6">
        <aside className="mb-4 rounded-3xl border border-white/60 bg-white/75 p-4 shadow-panel backdrop-blur lg:mb-0 lg:w-52 lg:p-5 xl:w-56">
          <div className="mb-8">
            <p className="font-serif text-xl text-lacquer xl:text-2xl">Ziwei Destiny Desk</p>
            <p className="mt-2 text-sm text-slate-600">
              本地优先的紫微斗数命盘工作台
            </p>
          </div>
          <nav className="space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  [
                    "block rounded-2xl px-4 py-3 text-sm transition",
                    isActive
                      ? "bg-ink text-white shadow-sm"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100",
                  ].join(" ")
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
