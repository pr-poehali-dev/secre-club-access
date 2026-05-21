import { useState } from "react";
import Icon from "@/components/ui/icon";

type Tab = "passes" | "profile";

const PASSES = [
  {
    id: 1,
    name: "Основной доступ",
    type: "VIP",
    status: "active",
    validUntil: "31 дек 2026",
    zone: "Все зоны",
    number: "A-0042",
  },
  {
    id: 2,
    name: "Парковка",
    type: "Premium",
    status: "active",
    validUntil: "31 дек 2026",
    zone: "Паркинг B1–B3",
    number: "P-0017",
  },
  {
    id: 3,
    name: "Спа & Wellness",
    type: "Standard",
    status: "pending",
    validUntil: "15 фев 2026",
    zone: "Этаж 4",
    number: "S-0091",
  },
  {
    id: 4,
    name: "Гостевой пропуск",
    type: "Guest",
    status: "inactive",
    validUntil: "01 янв 2025",
    zone: "Лобби",
    number: "G-0203",
  },
];

const STATUS_LABEL: Record<string, string> = {
  active: "Активен",
  pending: "На рассмотрении",
  inactive: "Истёк",
};

const TYPE_COLOR: Record<string, string> = {
  VIP: "from-yellow-500/20 to-orange-500/10 border-yellow-500/30",
  Premium: "from-purple-500/20 to-indigo-500/10 border-purple-500/30",
  Standard: "from-sky-500/20 to-blue-500/10 border-sky-500/30",
  Guest: "from-slate-500/20 to-slate-600/10 border-slate-500/30",
};

const TYPE_ACCENT: Record<string, string> = {
  VIP: "text-yellow-400",
  Premium: "text-purple-400",
  Standard: "text-sky-400",
  Guest: "text-slate-400",
};

function PassesPage() {
  const [selected, setSelected] = useState<number | null>(null);
  const activePass = PASSES.find((p) => p.id === selected);

  return (
    <div className="page-enter min-h-full pb-8">
      <div className="px-6 pt-8 pb-6">
        <p className="text-xs font-display tracking-[0.2em] uppercase text-muted-foreground mb-1">
          Приватный клуб
        </p>
        <h1 className="font-display text-4xl font-bold tracking-wide text-foreground">
          ПРОПУСКА
          <span className="neon-text">.</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {PASSES.filter((p) => p.status === "active").length} активных из {PASSES.length}
        </p>
      </div>

      {activePass && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-md mx-4 mb-4 glass-card rounded-3xl p-6 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className={`text-xs font-display tracking-widest uppercase ${TYPE_ACCENT[activePass.type]}`}>
                  {activePass.type}
                </p>
                <h3 className="font-display text-2xl font-bold text-foreground mt-0.5">
                  {activePass.name}
                </h3>
              </div>
              <button
                className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                onClick={() => setSelected(null)}
              >
                <Icon name="X" size={18} className="text-muted-foreground" />
              </button>
            </div>

            <div className="qr-box rounded-2xl aspect-square max-w-[200px] mx-auto mb-5 flex items-center justify-center relative">
              <div className="scan-line" />
              <div className="text-center z-10 relative">
                <div className="grid grid-cols-5 gap-1 mb-2 p-2">
                  {Array.from({ length: 25 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded-sm"
                      style={{
                        background: [0,1,2,3,4,5,9,14,15,19,20,21,22,23,24,6,12,18,7,17].includes(i)
                          ? "hsl(162, 100%, 50%)"
                          : "hsla(162,100%,50%,0.08)",
                      }}
                    />
                  ))}
                </div>
                <p className="font-display text-xs tracking-[0.15em] text-muted-foreground">
                  {activePass.number}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-0.5">Зона доступа</p>
                <p className="text-sm font-semibold text-foreground">{activePass.zone}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-0.5">Действителен до</p>
                <p className="text-sm font-semibold text-foreground">{activePass.validUntil}</p>
              </div>
            </div>

            <button className="neon-btn w-full mt-4 rounded-2xl py-3.5 font-display font-semibold tracking-wider text-sm">
              ПОКАЗАТЬ НА ВХОДЕ
            </button>
          </div>
        </div>
      )}

      <div className="px-4 stagger space-y-3">
        {PASSES.map((pass) => (
          <div
            key={pass.id}
            className={`glass-card rounded-2xl p-5 cursor-pointer bg-gradient-to-br ${TYPE_COLOR[pass.type]}`}
            onClick={() => pass.status !== "inactive" && setSelected(pass.id)}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className={`text-[10px] font-display tracking-[0.2em] uppercase font-semibold ${TYPE_ACCENT[pass.type]}`}>
                  {pass.type}
                </span>
                <h3 className="font-display text-xl font-bold text-foreground mt-0.5">
                  {pass.name}
                </h3>
              </div>
              <span
                className={`text-[11px] font-semibold px-3 py-1 rounded-full ${
                  pass.status === "active"
                    ? "badge-active"
                    : pass.status === "pending"
                    ? "badge-pending"
                    : "badge-inactive"
                }`}
              >
                {STATUS_LABEL[pass.status]}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Зона</p>
                  <p className="text-sm font-medium text-foreground">{pass.zone}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">До</p>
                  <p className="text-sm font-medium text-foreground">{pass.validUntil}</p>
                </div>
              </div>

              {pass.status === "active" && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-neon pulse-dot" />
                  <Icon name="QrCode" size={20} className="text-neon" />
                </div>
              )}
              {pass.status === "inactive" && (
                <Icon name="Lock" size={18} className="text-muted-foreground" />
              )}
              {pass.status === "pending" && (
                <Icon name="Clock" size={18} className="text-yellow-400" />
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-white/5">
              <p className="text-[11px] font-display tracking-[0.15em] text-muted-foreground">
                #{pass.number}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 mt-4">
        <button className="w-full rounded-2xl py-4 border border-dashed border-white/15 flex items-center justify-center gap-2 text-muted-foreground hover:border-neon/40 hover:text-neon transition-all duration-300 group">
          <Icon name="Plus" size={18} className="group-hover:scale-110 transition-transform" />
          <span className="text-sm font-medium">Запросить новый пропуск</span>
        </button>
      </div>
    </div>
  );
}

function ProfilePage() {
  const stats = [
    { label: "Визитов", value: "247", icon: "TrendingUp" },
    { label: "Статус", value: "Platinum", icon: "Crown" },
    { label: "С нами", value: "3 года", icon: "Calendar" },
  ];

  const menuItems = [
    { icon: "CreditCard", label: "Платёжные методы", desc: "Карты и счета" },
    { icon: "Bell", label: "Уведомления", desc: "Настройки оповещений" },
    { icon: "Shield", label: "Безопасность", desc: "PIN и биометрия" },
    { icon: "Users", label: "Гости", desc: "Управление доступами" },
    { icon: "HelpCircle", label: "Поддержка", desc: "Помощь и FAQ" },
  ];

  return (
    <div className="page-enter min-h-full pb-8">
      <div className="px-6 pt-8 pb-6">
        <p className="text-xs font-display tracking-[0.2em] uppercase text-muted-foreground mb-1">
          Личный кабинет
        </p>
        <h1 className="font-display text-4xl font-bold tracking-wide text-foreground">
          ПРОФИЛЬ
          <span className="neon-text">.</span>
        </h1>
      </div>

      <div className="px-6 mb-6">
        <div className="glass-card rounded-3xl p-6 flex items-center gap-5">
          <div className="relative flex-shrink-0">
            <div className="avatar-ring w-[72px] h-[72px] rounded-full p-[3px]">
              <div className="w-full h-full rounded-full bg-[hsl(220,18%,12%)] flex items-center justify-center">
                <span className="font-display text-2xl font-bold text-foreground">АК</span>
              </div>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-xl font-bold text-foreground">Алексей Ковалёв</h2>
            <p className="text-sm text-muted-foreground truncate">a.kovalev@example.com</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-neon pulse-dot" />
              <span className="text-xs text-neon font-semibold">Platinum Member</span>
            </div>
          </div>
          <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
            <Icon name="Pencil" size={15} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="px-6 mb-6">
        <div className="grid grid-cols-3 gap-3 stagger">
          {stats.map((s) => (
            <div key={s.label} className="glass-card rounded-2xl p-4 text-center">
              <Icon name={s.icon} size={20} className="text-neon mx-auto mb-2" />
              <p className="font-display text-xl font-bold text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 mb-6">
        <div
          className="rounded-3xl p-6 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, hsl(162,60%,15%) 0%, hsl(220,30%,12%) 50%, hsl(270,40%,15%) 100%)",
            border: "1px solid hsla(162,100%,50%,0.2)",
            boxShadow: "0 0 40px hsla(162,100%,50%,0.08)",
          }}
        >
          <div
            className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, hsl(162,100%,50%), transparent)" }}
          />
          <div
            className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, hsl(270,100%,65%), transparent)" }}
          />
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-8">
              <div>
                <p className="text-[10px] font-display tracking-[0.25em] text-muted-foreground uppercase">
                  Членская карта
                </p>
                <p className="font-display text-lg font-bold text-foreground">PLATINUM</p>
              </div>
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full" style={{ background: "hsl(30,100%,55%)", opacity: 0.8 }} />
                <div className="w-8 h-8 rounded-full -ml-4" style={{ background: "hsl(0,84%,60%)", opacity: 0.7 }} />
              </div>
            </div>
            <p className="font-display text-xl tracking-[0.3em] text-foreground mb-4">
              **** **** **** 4297
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Владелец</p>
                <p className="text-sm font-semibold text-foreground">А. КОВАЛЁВ</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Действует до</p>
                <p className="text-sm font-semibold text-foreground">12/27</p>
              </div>
              <Icon name="Wifi" size={20} className="neon-text" />
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 stagger space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.label}
            className="glass-card w-full rounded-2xl px-5 py-4 flex items-center gap-4 text-left transition-all duration-300 group"
          >
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-neon/10 transition-colors">
              <Icon name={item.icon} size={18} className="text-muted-foreground group-hover:text-neon transition-colors" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <Icon name="ChevronRight" size={16} className="text-muted-foreground group-hover:text-neon transition-colors" />
          </button>
        ))}
      </div>

      <div className="px-6 mt-6">
        <button className="w-full rounded-2xl py-4 border border-red-500/20 text-red-400/80 hover:border-red-500/40 hover:text-red-400 transition-all duration-300 text-sm font-semibold flex items-center justify-center gap-2">
          <Icon name="LogOut" size={16} />
          Выйти из аккаунта
        </button>
      </div>
    </div>
  );
}

export default function Index() {
  const [tab, setTab] = useState<Tab>("passes");

  return (
    <div
      className="min-h-screen bg-mesh flex flex-col max-w-md mx-auto relative"
      style={{ minHeight: "100dvh" }}
    >
      <div className="fixed top-0 left-0 right-0 z-10 pointer-events-none max-w-md mx-auto">
        <div
          className="h-px"
          style={{
            background: "linear-gradient(90deg, transparent, hsl(162,100%,50%), transparent)",
            opacity: 0.5,
          }}
        />
      </div>

      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: "80px" }}>
        {tab === "passes" ? <PassesPage /> : <ProfilePage />}
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-20"
        style={{
          background: "hsla(220,20%,7%,0.92)",
          backdropFilter: "blur(24px)",
          borderTop: "1px solid hsla(220,20%,18%,0.6)",
        }}
      >
        <div className="flex items-center justify-around px-8 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            className={`nav-item flex flex-col items-center gap-1.5 px-6 ${tab === "passes" ? "active" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setTab("passes")}
          >
            <Icon name="CreditCard" size={22} className={tab === "passes" ? "text-neon" : ""} />
            <span className="text-[11px] font-display font-semibold tracking-wider uppercase">
              Пропуска
            </span>
          </button>

          <button
            className={`nav-item flex flex-col items-center gap-1.5 px-6 ${tab === "profile" ? "active" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setTab("profile")}
          >
            <Icon name="User" size={22} className={tab === "profile" ? "text-neon" : ""} />
            <span className="text-[11px] font-display font-semibold tracking-wider uppercase">
              Профиль
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}