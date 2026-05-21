import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";

const AUTH_URL = "https://functions.poehali.dev/5ade4d5e-5e9e-4c62-b935-8cce71cbfc2f";
const PASSES_URL = "https://functions.poehali.dev/c4369691-fe27-49e8-baa0-97da45e80e03";
const STORAGE_KEY = "club_session";

type Tab = "passes" | "profile" | "admin";
type AuthMode = "login" | "register";
type Privilege = "client" | "helper" | "admator" | "developer";
type DurationUnit = "minutes" | "hours" | "days";

interface Session {
  token: string;
  username: string;
  user_id: number;
}

interface Pass {
  id: number;
  display_name: string;
  privilege: Privilege;
  privilege_label: string;
  no_timer: boolean;
  expires_at: string | null;
  created_at: string;
  active: boolean;
}

const PRIV_COLOR: Record<Privilege, string> = {
  client: "from-sky-500/20 to-blue-500/10 border-sky-500/30",
  helper: "from-purple-500/20 to-indigo-500/10 border-purple-500/30",
  admator: "from-orange-500/20 to-red-500/10 border-orange-500/30",
  developer: "from-yellow-500/20 to-amber-500/10 border-yellow-500/30",
};
const PRIV_ACCENT: Record<Privilege, string> = {
  client: "text-sky-400",
  helper: "text-purple-400",
  admator: "text-orange-400",
  developer: "text-yellow-400",
};

function useSession() {
  const [session, setSession] = useState<Session | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });
  const save = (s: Session) => { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); setSession(s); };
  const logout = () => { localStorage.removeItem(STORAGE_KEY); setSession(null); };
  return { session, save, logout };
}

function formatExpiry(expires_at: string | null, no_timer: boolean, privilege: Privilege): string {
  if (privilege === "developer" || no_timer) return "Бессрочно";
  if (!expires_at) return "Нет срока";
  const exp = new Date(expires_at);
  const now = new Date();
  const diff = exp.getTime() - now.getTime();
  if (diff <= 0) return "Истёк";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `${days}д ${hours}ч`;
  if (hours > 0) return `${hours}ч ${mins}м`;
  return `${mins}м`;
}

// ——— Auth Form ———
function AuthForm({ onSuccess }: { onSuccess: (s: Session) => void }) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  const submit = async () => {
    setError(""); setLoading(true);
    try {
      const res = await fetch(AUTH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: mode, username, password }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Ошибка");
      else onSuccess(data as Session);
    } catch { setError("Нет соединения с сервером"); }
    finally { setLoading(false); }
  };

  return (
    <div className="page-enter px-6 pt-10 pb-8 flex flex-col">
      <div className="mb-8">
        <p className="text-xs font-display tracking-[0.2em] uppercase text-muted-foreground mb-1">Приватный клуб</p>
        <h2 className="font-display text-3xl font-bold text-foreground">
          {mode === "login" ? "ВХОД" : "РЕГИСТРАЦИЯ"}<span className="neon-text">.</span>
        </h2>
      </div>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Имя пользователя</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <Icon name="User" size={17} className="text-muted-foreground" />
            </div>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="username"
              className="w-full glass-card rounded-2xl pl-11 pr-4 py-3.5 text-foreground placeholder:text-muted-foreground/50 text-sm outline-none focus:neon-border transition-all duration-300 bg-transparent"
              autoComplete="username" />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Пароль</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <Icon name="Lock" size={17} className="text-muted-foreground" />
            </div>
            <input type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="••••••"
              className="w-full glass-card rounded-2xl pl-11 pr-12 py-3.5 text-foreground placeholder:text-muted-foreground/50 text-sm outline-none focus:neon-border transition-all duration-300 bg-transparent"
              autoComplete={mode === "login" ? "current-password" : "new-password"} />
            <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowPass((v) => !v)}>
              <Icon name={showPass ? "EyeOff" : "Eye"} size={17} />
            </button>
          </div>
        </div>
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <Icon name="AlertCircle" size={15} className="text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
        <button onClick={submit} disabled={loading}
          className="neon-btn w-full rounded-2xl py-3.5 font-display font-semibold tracking-wider text-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-2">
          {loading ? <Icon name="Loader2" size={18} className="animate-spin" /> : <Icon name={mode === "login" ? "LogIn" : "UserPlus"} size={17} />}
          {mode === "login" ? "ВОЙТИ" : "ЗАРЕГИСТРИРОВАТЬСЯ"}
        </button>
        <div className="text-center pt-2">
          <span className="text-sm text-muted-foreground">{mode === "login" ? "Нет аккаунта? " : "Уже есть аккаунт? "}</span>
          <button className="text-sm text-neon font-semibold hover:opacity-80 transition-opacity"
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
            {mode === "login" ? "Зарегистрироваться" : "Войти"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ——— Pass Detail Modal ———
function PassModal({ pass, onClose }: { pass: Pass; onClose: () => void }) {
  const timeLeft = formatExpiry(pass.expires_at, pass.no_timer, pass.privilege);
  const isExpired = !pass.active;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className={`w-full max-w-md mx-4 mb-4 glass-card rounded-3xl p-6 animate-scale-in bg-gradient-to-br ${PRIV_COLOR[pass.privilege]}`}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-6">
          <div>
            <span className={`text-[10px] font-display tracking-[0.2em] uppercase font-bold ${PRIV_ACCENT[pass.privilege]}`}>
              {pass.privilege_label}
            </span>
            <h3 className="font-display text-2xl font-bold text-foreground mt-1">{pass.display_name}</h3>
          </div>
          <button className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
            onClick={onClose}>
            <Icon name="X" size={18} className="text-muted-foreground" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Статус</p>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${isExpired ? "bg-red-400" : "bg-neon pulse-dot"}`} />
              <p className={`text-sm font-semibold ${isExpired ? "text-red-400" : "text-neon"}`}>
                {isExpired ? "Истёк" : "Активен"}
              </p>
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Время</p>
            <p className="text-sm font-semibold text-foreground">{timeLeft}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Привилегия</p>
            <p className={`text-sm font-semibold ${PRIV_ACCENT[pass.privilege]}`}>{pass.privilege_label}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Выдан</p>
            <p className="text-sm font-semibold text-foreground">
              {new Date(pass.created_at).toLocaleDateString("ru-RU")}
            </p>
          </div>
        </div>

        {pass.expires_at && !pass.no_timer && pass.privilege !== "developer" && (
          <div className="bg-white/5 rounded-xl p-3 mb-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Истекает</p>
            <p className="text-sm font-semibold text-foreground">
              {new Date(pass.expires_at).toLocaleString("ru-RU")}
            </p>
          </div>
        )}

        <div className="pt-3 border-t border-white/10">
          <p className="text-[11px] font-display tracking-[0.15em] text-muted-foreground">
            ID #{pass.id}
          </p>
        </div>
      </div>
    </div>
  );
}

// ——— Passes Page ———
function PassesPage({ session }: { session: Session }) {
  const [passes, setPasses] = useState<Pass[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Pass | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(PASSES_URL, {
        headers: { "Authorization": `Bearer ${session.token}` },
      });
      const data = await res.json();
      if (res.ok) setPasses(data.passes || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [session.token]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="page-enter px-4 pt-8 pb-8">
      {selected && <PassModal pass={selected} onClose={() => setSelected(null)} />}

      <div className="px-2 mb-6">
        <p className="text-xs font-display tracking-[0.2em] uppercase text-muted-foreground mb-1">Приватный клуб</p>
        <h1 className="font-display text-4xl font-bold tracking-wide text-foreground">
          ПРОПУСКА<span className="neon-text">.</span>
        </h1>
        {!loading && (
          <p className="text-muted-foreground text-sm mt-1">
            {passes.filter(p => p.active).length} активных из {passes.length}
          </p>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Icon name="Loader2" size={32} className="text-neon animate-spin" />
        </div>
      ) : passes.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center px-4">
          <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
            <Icon name="CreditCard" size={36} className="text-muted-foreground" />
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">Нет пропусков</h2>
          <p className="text-muted-foreground text-sm max-w-[240px] leading-relaxed">
            Привет, <span className="text-foreground font-semibold">{session.username}</span>! Пропуска появятся после выдачи администратором.
          </p>
        </div>
      ) : (
        <div className="stagger space-y-3">
          {passes.map((pass) => (
            <div key={pass.id}
              className={`glass-card rounded-2xl p-5 cursor-pointer bg-gradient-to-br ${PRIV_COLOR[pass.privilege]}`}
              onClick={() => setSelected(pass)}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className={`text-[10px] font-display tracking-[0.2em] uppercase font-bold ${PRIV_ACCENT[pass.privilege]}`}>
                    {pass.privilege_label}
                  </span>
                  <h3 className="font-display text-xl font-bold text-foreground mt-0.5">{pass.display_name}</h3>
                </div>
                <span className={`text-[11px] font-semibold px-3 py-1 rounded-full ${pass.active ? "badge-active" : "badge-inactive"}`}>
                  {pass.active ? "Активен" : "Истёк"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Осталось</p>
                  <p className="text-sm font-medium text-foreground">
                    {formatExpiry(pass.expires_at, pass.no_timer, pass.privilege)}
                  </p>
                </div>
                {pass.active
                  ? <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-neon pulse-dot" /><Icon name="ChevronRight" size={18} className="text-neon" /></div>
                  : <Icon name="Lock" size={18} className="text-muted-foreground" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ——— Admin Panel ———
function AdminPage({ session }: { session: Session }) {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [privilege, setPrivilege] = useState<Privilege>("client");
  const [noTimer, setNoTimer] = useState(false);
  const [durationValue, setDurationValue] = useState("24");
  const [durationUnit, setDurationUnit] = useState<DurationUnit>("hours");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isDev = privilege === "developer";

  const submit = async () => {
    setError(""); setSuccess(""); setLoading(true);
    try {
      const body: Record<string, unknown> = {
        username, display_name: displayName, privilege,
        no_timer: isDev || noTimer,
      };
      if (!isDev && !noTimer) {
        body.duration_value = parseInt(durationValue) || 24;
        body.duration_unit = durationUnit;
      }
      const res = await fetch(PASSES_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Ошибка");
      else { setSuccess(`Пропуск выдан! ID #${data.id}`); setUsername(""); setDisplayName(""); }
    } catch { setError("Нет соединения с сервером"); }
    finally { setLoading(false); }
  };

  const privOptions: { value: Privilege; label: string; color: string }[] = [
    { value: "client", label: "Клиент", color: "text-sky-400" },
    { value: "helper", label: "Помощник", color: "text-purple-400" },
    { value: "admator", label: "Администратор", color: "text-orange-400" },
    { value: "developer", label: "Разработчик", color: "text-yellow-400" },
  ];

  const unitOptions: { value: DurationUnit; label: string }[] = [
    { value: "minutes", label: "Минуты" },
    { value: "hours", label: "Часы" },
    { value: "days", label: "Дни" },
  ];

  return (
    <div className="page-enter px-6 pt-8 pb-8">
      <div className="mb-6">
        <p className="text-xs font-display tracking-[0.2em] uppercase text-muted-foreground mb-1">Управление</p>
        <h1 className="font-display text-4xl font-bold tracking-wide text-foreground">
          АДМИН<span className="neon-text">.</span>
        </h1>
      </div>

      {/* Create Pass Card */}
      <div className="glass-card rounded-3xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon name="Plus" size={18} className="text-neon" />
          <h2 className="font-display font-bold text-foreground tracking-wide">СОЗДАТЬ ПРОПУСК</h2>
        </div>

        {/* Username */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Username получателя</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <Icon name="AtSign" size={16} className="text-muted-foreground" />
            </div>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username"
              className="w-full bg-white/5 rounded-xl pl-10 pr-4 py-3 text-foreground placeholder:text-muted-foreground/50 text-sm outline-none border border-transparent focus:border-neon/40 transition-all" />
          </div>
        </div>

        {/* Display Name */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Имя на пропуске</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <Icon name="IdCard" size={16} className="text-muted-foreground" />
            </div>
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Иван Иванов"
              className="w-full bg-white/5 rounded-xl pl-10 pr-4 py-3 text-foreground placeholder:text-muted-foreground/50 text-sm outline-none border border-transparent focus:border-neon/40 transition-all" />
          </div>
        </div>

        {/* Privilege */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Привилегия</label>
          <div className="grid grid-cols-2 gap-2">
            {privOptions.map((opt) => (
              <button key={opt.value} onClick={() => { setPrivilege(opt.value); if (opt.value === "developer") setNoTimer(true); }}
                className={`rounded-xl py-2.5 px-3 text-sm font-semibold font-display tracking-wide border transition-all duration-200 ${
                  privilege === opt.value
                    ? `${opt.color} border-current bg-white/8`
                    : "text-muted-foreground border-white/10 hover:border-white/20"
                }`}>
                {opt.label.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Duration (if not dev) */}
        {!isDev && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Время действия</label>
              <button onClick={() => setNoTimer((v) => !v)}
                className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${noTimer ? "text-neon" : "text-muted-foreground"}`}>
                <div className={`w-8 h-4 rounded-full transition-colors relative ${noTimer ? "bg-neon/30 border-neon/50" : "bg-white/10"} border`}>
                  <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${noTimer ? "left-4 bg-neon" : "left-0.5 bg-white/40"}`} />
                </div>
                Бессрочно
              </button>
            </div>
            {!noTimer && (
              <div className="flex gap-2">
                <input type="number" min="1" value={durationValue} onChange={(e) => setDurationValue(e.target.value)}
                  className="w-24 bg-white/5 rounded-xl px-3 py-2.5 text-foreground text-sm outline-none border border-transparent focus:border-neon/40 transition-all" />
                <div className="flex gap-1 flex-1">
                  {unitOptions.map((u) => (
                    <button key={u.value} onClick={() => setDurationUnit(u.value)}
                      className={`flex-1 rounded-xl py-2.5 text-xs font-semibold font-display tracking-wide border transition-all ${
                        durationUnit === u.value ? "text-neon border-neon/40 bg-neon/10" : "text-muted-foreground border-white/10 hover:border-white/20"
                      }`}>
                      {u.label.toUpperCase().slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {isDev && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <Icon name="Infinity" size={15} className="text-yellow-400" />
            <p className="text-xs text-yellow-400 font-semibold">Разработчик — пропуск бессрочный</p>
          </div>
        )}

        {/* Messages */}
        {error && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
            <Icon name="AlertCircle" size={15} className="text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-neon/10 border border-neon/20">
            <Icon name="CheckCircle" size={15} className="text-neon flex-shrink-0" />
            <p className="text-sm text-neon">{success}</p>
          </div>
        )}

        <button onClick={submit} disabled={loading || !username || !displayName}
          className="neon-btn w-full rounded-2xl py-3.5 font-display font-semibold tracking-wider text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? <Icon name="Loader2" size={17} className="animate-spin" /> : <Icon name="Plus" size={17} />}
          ВЫДАТЬ ПРОПУСК
        </button>
      </div>
    </div>
  );
}

// ——— Profile Page ———
function ProfilePage({ session, onLogout, isAdmin }: { session: Session; onLogout: () => void; isAdmin: boolean }) {
  return (
    <div className="page-enter px-6 pt-10 pb-8">
      <div className="glass-card rounded-3xl p-6 flex items-center gap-5 mb-4">
        <div className="w-14 h-14 rounded-2xl bg-neon/10 border border-neon/20 flex items-center justify-center flex-shrink-0">
          <span className="font-display text-xl font-bold text-neon">{session.username.slice(0, 2).toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-xl font-bold text-foreground">{session.username}</h2>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-neon pulse-dot" />
            <span className="text-xs text-neon font-semibold">{isAdmin ? "Администратор" : "Участник клуба"}</span>
          </div>
        </div>
      </div>
      <div className="glass-card rounded-2xl px-5 py-4 mb-3 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
          <Icon name="Hash" size={18} className="text-muted-foreground" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">ID пользователя</p>
          <p className="text-sm font-semibold text-foreground">#{session.user_id}</p>
        </div>
      </div>
      <div className="glass-card rounded-2xl px-5 py-4 mb-6 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
          <Icon name="User" size={18} className="text-muted-foreground" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Имя пользователя</p>
          <p className="text-sm font-semibold text-foreground">{session.username}</p>
        </div>
      </div>
      <button onClick={onLogout}
        className="w-full rounded-2xl py-3.5 border border-red-500/20 text-red-400/80 hover:border-red-500/40 hover:text-red-400 transition-all duration-300 text-sm font-semibold flex items-center justify-center gap-2">
        <Icon name="LogOut" size={16} />
        Выйти из аккаунта
      </button>
    </div>
  );
}

// ——— Main ———
const ADMIN_USERS = ["Lavrov1yList"];

export default function Index() {
  const [tab, setTab] = useState<Tab>("passes");
  const { session, save, logout } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (session) setIsAdmin(ADMIN_USERS.includes(session.username));
    else setIsAdmin(false);
  }, [session]);

  const tabs = [
    { id: "passes" as Tab, icon: "CreditCard", label: "ПРОПУСКА" },
    ...(isAdmin ? [{ id: "admin" as Tab, icon: "ShieldCheck", label: "АДМИН" }] : []),
    { id: "profile" as Tab, icon: "User", label: "ПРОФИЛЬ" },
  ];

  return (
    <div className="min-h-screen bg-mesh flex flex-col max-w-md mx-auto relative" style={{ minHeight: "100dvh" }}>
      {/* Top nav */}
      <div className="sticky top-0 z-20 px-6 pt-12 pb-3"
        style={{ background: "hsla(220,20%,6%,0.85)", backdropFilter: "blur(24px)", borderBottom: "1px solid hsla(220,20%,18%,0.5)" }}>
        <p className="text-[10px] font-display tracking-[0.25em] uppercase text-muted-foreground mb-3">Приватный клуб</p>
        <div className="flex gap-1 p-1 rounded-2xl bg-white/5">
          {tabs.map((t) => (
            <button key={t.id}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl font-display text-xs font-semibold tracking-wide transition-all duration-300 ${
                tab === t.id ? "bg-neon text-[hsl(220,20%,6%)]" : "text-muted-foreground hover:text-foreground"
              }`}
              style={tab === t.id ? { boxShadow: "0 0 20px hsla(162,100%,50%,0.4)" } : {}}
              onClick={() => setTab(t.id)}>
              <Icon name={t.icon} size={14} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!session ? (
          <AuthForm onSuccess={save} />
        ) : tab === "passes" ? (
          <PassesPage session={session} />
        ) : tab === "admin" && isAdmin ? (
          <AdminPage session={session} />
        ) : (
          <ProfilePage session={session} onLogout={logout} isAdmin={isAdmin} />
        )}
      </div>
    </div>
  );
}
