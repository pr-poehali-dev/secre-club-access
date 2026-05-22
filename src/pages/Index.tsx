import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";

const AUTH_URL = "https://functions.poehali.dev/5ade4d5e-5e9e-4c62-b935-8cce71cbfc2f";
const PASSES_URL = "https://functions.poehali.dev/c4369691-fe27-49e8-baa0-97da45e80e03";
const USERS_URL = "https://functions.poehali.dev/5e3fd207-c5f7-4fd4-a39e-f0e255c1a498";
const MESSAGES_URL = "https://functions.poehali.dev/7999e2b0-72e2-4884-9941-eae1d93e52f3";
const PROMO_URL = "https://functions.poehali.dev/62db5ca7-438e-4cdf-bc08-8dee362ae500";
const STORAGE_KEY = "club_session";

type Tab = "passes" | "profile" | "admin";
type AuthMode = "login" | "register";
type Privilege = "client" | "helper" | "admator" | "developer";

interface PromoCode {
  id: number;
  code: string;
  display_name: string;
  privilege: Privilege;
  no_timer: boolean;
  duration_seconds: number | null;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  created_at: string;
}
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
  user_id?: number;
  username?: string;
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

  const [promoInput, setPromoInput] = useState("");
  const [promoActivating, setPromoActivating] = useState(false);
  const [promoResult, setPromoResult] = useState<{ ok: boolean; msg: string } | null>(null);

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

  const activatePromo = async () => {
    if (!promoInput.trim()) return;
    setPromoActivating(true); setPromoResult(null);
    try {
      const res = await fetch(PROMO_URL, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${session.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoInput.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setPromoResult({ ok: true, msg: `Пропуск «${data.display_name}» активирован!` });
        setPromoInput("");
        load();
      } else {
        setPromoResult({ ok: false, msg: data.error || "Ошибка" });
      }
    } catch { setPromoResult({ ok: false, msg: "Ошибка соединения" }); }
    finally { setPromoActivating(false); }
  };

  return (
    <div className="page-enter px-4 pt-8 pb-8">
      {selected && <PassModal pass={selected} onClose={() => setSelected(null)} />}

      <div className="px-2 mb-5">
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

      {/* Promo code */}
      <div className="glass-card rounded-2xl p-4 mb-5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Промокод</p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <Icon name="Ticket" size={15} className="text-muted-foreground" />
            </div>
            <input
              value={promoInput}
              onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoResult(null); }}
              onKeyDown={(e) => e.key === "Enter" && activatePromo()}
              placeholder="ВВЕДИТЕ КОД"
              className="w-full bg-white/5 rounded-xl pl-9 pr-3 py-2.5 text-sm font-mono tracking-widest text-foreground placeholder:text-muted-foreground/40 outline-none border border-transparent focus:border-neon/30 transition-all"
            />
          </div>
          <button onClick={activatePromo} disabled={promoActivating || !promoInput.trim()}
            className="neon-btn px-4 rounded-xl text-sm font-display font-semibold tracking-wide flex items-center gap-1.5 disabled:opacity-50">
            {promoActivating ? <Icon name="Loader2" size={15} className="animate-spin" /> : <Icon name="Zap" size={15} />}
            OK
          </button>
        </div>
        {promoResult && (
          <div className={`flex items-center gap-2 mt-2 px-3 py-2 rounded-xl text-sm ${promoResult.ok ? "bg-neon/10 border border-neon/20 text-neon" : "bg-red-500/10 border border-red-500/20 text-red-400"}`}>
            <Icon name={promoResult.ok ? "CheckCircle" : "AlertCircle"} size={14} className="flex-shrink-0" />
            {promoResult.msg}
          </div>
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

// ——— Edit Pass Modal ———
function EditPassModal({
  pass, session, onClose, onSaved,
}: { pass: Pass; session: Session; onClose: () => void; onSaved: () => void }) {
  const [displayName, setDisplayName] = useState(pass.display_name);
  const [privilege, setPrivilege] = useState<Privilege>(pass.privilege);
  const [noTimer, setNoTimer] = useState(pass.no_timer);
  const [durationValue, setDurationValue] = useState("24");
  const [durationUnit, setDurationUnit] = useState<DurationUnit>("hours");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isDev = privilege === "developer";

  const save = async () => {
    setError(""); setLoading(true);
    try {
      const body: Record<string, unknown> = { id: pass.id, display_name: displayName, privilege, no_timer: isDev || noTimer };
      if (!isDev && !noTimer) { body.duration_value = parseInt(durationValue) || 24; body.duration_unit = durationUnit; }
      const res = await fetch(PASSES_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Ошибка");
      else { onSaved(); onClose(); }
    } catch { setError("Нет соединения"); }
    finally { setLoading(false); }
  };

  const privOptions: { value: Privilege; label: string; color: string }[] = [
    { value: "client", label: "Клиент", color: "text-sky-400" },
    { value: "helper", label: "Помощник", color: "text-purple-400" },
    { value: "admator", label: "Администратор", color: "text-orange-400" },
    { value: "developer", label: "Разработчик", color: "text-yellow-400" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md mx-4 mb-4 glass-card rounded-3xl p-5 space-y-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-display font-bold text-foreground tracking-wide">РЕДАКТИРОВАТЬ ПРОПУСК</h3>
          <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors" onClick={onClose}>
            <Icon name="X" size={16} className="text-muted-foreground" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground">#{pass.id} · {pass.username}</p>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Название пропуска</label>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
            className="w-full glass-card rounded-2xl px-4 py-3 text-foreground text-sm outline-none bg-transparent" />
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Привилегия</label>
          <div className="grid grid-cols-2 gap-2">
            {privOptions.map((o) => (
              <button key={o.value} onClick={() => setPrivilege(o.value)}
                className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${privilege === o.value ? `${o.color} bg-white/10 border border-white/20` : "text-muted-foreground bg-white/5"}`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {!isDev && (
          <div className="flex items-center justify-between px-1">
            <span className="text-sm text-muted-foreground">Бессрочно</span>
            <button onClick={() => setNoTimer((v) => !v)}
              className={`w-11 h-6 rounded-full transition-colors relative ${noTimer ? "bg-neon" : "bg-white/10"}`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${noTimer ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </div>
        )}

        {!isDev && !noTimer && (
          <div className="flex gap-2">
            <input type="number" min="1" value={durationValue} onChange={(e) => setDurationValue(e.target.value)}
              className="w-24 glass-card rounded-xl px-3 py-2 text-foreground text-sm outline-none bg-transparent" />
            <div className="flex gap-1 flex-1">
              {(["minutes", "hours", "days"] as DurationUnit[]).map((u) => (
                <button key={u} onClick={() => setDurationUnit(u)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${durationUnit === u ? "bg-neon/20 text-neon border border-neon/30" : "bg-white/5 text-muted-foreground"}`}>
                  {u === "minutes" ? "мин" : u === "hours" ? "ч" : "д"}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
            <Icon name="AlertCircle" size={15} className="text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <button onClick={save} disabled={loading || !displayName}
          className="neon-btn w-full rounded-2xl py-3 font-display font-semibold tracking-wider text-sm flex items-center justify-center gap-2 disabled:opacity-50">
          {loading ? <Icon name="Loader2" size={16} className="animate-spin" /> : <Icon name="Save" size={16} />}
          СОХРАНИТЬ
        </button>
      </div>
    </div>
  );
}

// ——— Admin Panel ———
function AdminPage({ session, isSuperAdmin }: { session: Session; isSuperAdmin: boolean }) {
  const [allPasses, setAllPasses] = useState<Pass[]>([]);
  const [passesLoading, setPassesLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editPass, setEditPass] = useState<Pass | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Pass | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [users, setUsers] = useState<{ id: number; username: string; created_at: string; passes_count: number; is_admin: boolean; is_superadmin: boolean; is_banned: boolean }[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userSearch, setUserSearch] = useState("");
  const [adminActionLoading, setAdminActionLoading] = useState<number | null>(null);
  const [banActionLoading, setBanActionLoading] = useState<number | null>(null);
  const [banSearch, setBanSearch] = useState("");

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [privilege, setPrivilege] = useState<Privilege>("client");
  const [noTimer, setNoTimer] = useState(false);
  const [durationValue, setDurationValue] = useState("24");
  const [durationUnit, setDurationUnit] = useState<DurationUnit>("hours");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [msgText, setMsgText] = useState("");
  const [msgTarget, setMsgTarget] = useState<number | null>(null);
  const [msgTargetName, setMsgTargetName] = useState("Всем");
  const [msgUserSearch, setMsgUserSearch] = useState("");
  const [msgLoading, setMsgLoading] = useState(false);
  const [msgSuccess, setMsgSuccess] = useState("");
  const [msgError, setMsgError] = useState("");

  // Promo
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [promosLoading, setPromosLoading] = useState(true);
  const [promoCode, setPromoCode] = useState("");
  const [promoDisplayName, setPromoDisplayName] = useState("");
  const [promoPrivilege, setPromoPrivilege] = useState<Privilege>("client");
  const [promoNoTimer, setPromoNoTimer] = useState(false);
  const [promoDurationValue, setPromoDurationValue] = useState("24");
  const [promoDurationUnit, setPromoDurationUnit] = useState<DurationUnit>("hours");
  const [promoMaxUses, setPromoMaxUses] = useState("1");
  const [promoUnlimitedUses, setPromoUnlimitedUses] = useState(false);
  const [promoExpiresValue, setPromoExpiresValue] = useState("7");
  const [promoExpiresUnit, setPromoExpiresUnit] = useState<DurationUnit>("days");
  const [promoUnlimitedExpiry, setPromoUnlimitedExpiry] = useState(false);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [promoSuccess, setPromoSuccess] = useState("");
  const [deletingPromoId, setDeletingPromoId] = useState<number | null>(null);

  const loadPasses = useCallback(async () => {
    setPassesLoading(true);
    try {
      const res = await fetch(PASSES_URL, { headers: { "Authorization": `Bearer ${session.token}` } });
      const data = await res.json();
      if (res.ok) setAllPasses(data.passes || []);
    } catch { /* ignore */ }
    finally { setPassesLoading(false); }
  }, [session.token]);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await fetch(USERS_URL, { headers: { "Authorization": `Bearer ${session.token}` } });
      const data = await res.json();
      if (res.ok) setUsers(data.users || []);
    } catch { /* ignore */ }
    finally { setUsersLoading(false); }
  }, [session.token]);

  const toggleBan = async (userId: number, currentIsBanned: boolean) => {
    setBanActionLoading(userId);
    try {
      await fetch(USERS_URL, {
        method: "POST",
        headers: { "Authorization": `Bearer ${session.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, action: currentIsBanned ? "unban" : "ban" }),
      });
      loadUsers();
    } catch { /* ignore */ }
    finally { setBanActionLoading(null); }
  };

  const toggleAdmin = async (userId: number, currentIsAdmin: boolean) => {
    setAdminActionLoading(userId);
    try {
      await fetch(USERS_URL, {
        method: "POST",
        headers: { "Authorization": `Bearer ${session.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, action: currentIsAdmin ? "revoke" : "grant" }),
      });
      loadUsers();
    } catch { /* ignore */ }
    finally { setAdminActionLoading(null); }
  };

  const loadPromos = useCallback(async () => {
    setPromosLoading(true);
    try {
      const res = await fetch(PROMO_URL, { headers: { "Authorization": `Bearer ${session.token}` } });
      const data = await res.json();
      if (res.ok) setPromos(data.promos || []);
    } catch { /* ignore */ }
    finally { setPromosLoading(false); }
  }, [session.token]);

  useEffect(() => { loadPasses(); loadUsers(); loadPromos(); }, [loadPasses, loadUsers, loadPromos]);

  const unitToSeconds = (val: string, unit: DurationUnit) => {
    const n = parseInt(val) || 1;
    if (unit === "minutes") return n * 60;
    if (unit === "hours") return n * 3600;
    return n * 86400;
  };

  const createPromo = async () => {
    setPromoError(""); setPromoSuccess(""); setPromoLoading(true);
    try {
      const body: Record<string, unknown> = {
        code: promoCode.trim().toUpperCase(),
        display_name: promoDisplayName.trim(),
        privilege: promoPrivilege,
        no_timer: promoPrivilege === "developer" || promoNoTimer,
        max_uses: promoUnlimitedUses ? null : parseInt(promoMaxUses) || 1,
        promo_expires_seconds: promoUnlimitedExpiry ? null : unitToSeconds(promoExpiresValue, promoExpiresUnit),
      };
      if (!promoNoTimer && promoPrivilege !== "developer") {
        body.duration_seconds = unitToSeconds(promoDurationValue, promoDurationUnit);
      }
      const res = await fetch(PROMO_URL, {
        method: "POST",
        headers: { "Authorization": `Bearer ${session.token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setPromoSuccess("Промокод создан!");
        setPromoCode(""); setPromoDisplayName("");
        loadPromos();
      } else setPromoError(data.error || "Ошибка");
    } catch { setPromoError("Ошибка соединения"); }
    finally { setPromoLoading(false); }
  };

  const deletePromo = async (id: number) => {
    setDeletingPromoId(id);
    try {
      await fetch(PROMO_URL, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${session.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      loadPromos();
    } catch { /* ignore */ }
    finally { setDeletingPromoId(null); }
  };

  const sendMessage = async () => {
    if (!msgText.trim()) return;
    setMsgLoading(true); setMsgError(""); setMsgSuccess("");
    try {
      const res = await fetch(MESSAGES_URL, {
        method: "POST",
        headers: { "Authorization": `Bearer ${session.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ text: msgText.trim(), target_user_id: msgTarget }),
      });
      const data = await res.json();
      if (res.ok) { setMsgSuccess("Сообщение отправлено!"); setMsgText(""); }
      else setMsgError(data.error || "Ошибка");
    } catch { setMsgError("Ошибка соединения"); }
    finally { setMsgLoading(false); }
  };

  const deletePass = async (pass: Pass) => {
    setDeleting(true);
    try {
      const res = await fetch(PASSES_URL, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.token}` },
        body: JSON.stringify({ id: pass.id }),
      });
      if (res.ok) { setDeleteConfirm(null); loadPasses(); }
    } catch { /* ignore */ }
    finally { setDeleting(false); }
  };

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
      else { setSuccess(`Пропуск выдан! ID #${data.id}`); setUsername(""); setDisplayName(""); loadPasses(); }
    } catch (e) { console.error("passes POST error:", e); setError("Нет соединения с сервером"); }
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
      {editPass && <EditPassModal pass={editPass} session={session} onClose={() => setEditPass(null)} onSaved={loadPasses} />}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-6" onClick={() => setDeleteConfirm(null)}>
          <div className="w-full max-w-sm glass-card rounded-3xl p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
              <Icon name="Trash2" size={22} className="text-red-400" />
            </div>
            <h3 className="font-display font-bold text-foreground mb-1">Удалить пропуск?</h3>
            <p className="text-sm text-muted-foreground mb-5">«{deleteConfirm.display_name}» у пользователя <span className="text-foreground font-semibold">{deleteConfirm.username}</span></p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 rounded-2xl bg-white/5 text-muted-foreground text-sm font-semibold hover:bg-white/10 transition-colors">Отмена</button>
              <button onClick={() => deletePass(deleteConfirm)} disabled={deleting}
                className="flex-1 py-3 rounded-2xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                {deleting ? <Icon name="Loader2" size={15} className="animate-spin" /> : <Icon name="Trash2" size={15} />}
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <p className="text-xs font-display tracking-[0.2em] uppercase text-muted-foreground mb-1">Управление</p>
        <h1 className="font-display text-4xl font-bold tracking-wide text-foreground">
          АДМИН<span className="neon-text">.</span>
        </h1>
      </div>

      {/* Send system message */}
      <div className="glass-card rounded-3xl p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Icon name="Send" size={17} className="text-neon" />
          <h2 className="font-display font-bold text-foreground tracking-wide">СИСТЕМНОЕ СООБЩЕНИЕ</h2>
        </div>

        {/* Recipient selector */}
        <div className="mb-3">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Кому</label>
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => { setMsgTarget(null); setMsgTargetName("Всем"); setMsgUserSearch(""); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${msgTarget === null ? "bg-yellow-400/10 text-yellow-400 border-yellow-400/30" : "text-muted-foreground border-white/10 hover:border-white/20"}`}>
              Всем
            </button>
            {msgTarget !== null && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neon/10 border border-neon/30">
                <span className="text-xs font-semibold text-neon">{msgTargetName}</span>
                <button onClick={() => { setMsgTarget(null); setMsgTargetName("Всем"); }} className="text-neon hover:opacity-60 transition-opacity">
                  <Icon name="X" size={12} />
                </button>
              </div>
            )}
          </div>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <Icon name="Search" size={14} className="text-muted-foreground" />
            </div>
            <input
              value={msgUserSearch}
              onChange={(e) => setMsgUserSearch(e.target.value)}
              placeholder="Найти пользователя..."
              className="w-full bg-white/5 rounded-xl pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none border border-transparent focus:border-neon/30 transition-all"
            />
          </div>
          {msgUserSearch && (
            <div className="mt-1 rounded-xl bg-white/5 border border-white/10 overflow-hidden">
              {users.filter(u => u.username.toLowerCase().includes(msgUserSearch.toLowerCase())).slice(0, 4).map((u) => (
                <button key={u.id} onClick={() => { setMsgTarget(u.id); setMsgTargetName(u.username); setMsgUserSearch(""); }}
                  className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-white/5 transition-colors flex items-center gap-2">
                  <span className="text-xs font-bold text-neon">{u.username.slice(0, 2).toUpperCase()}</span>
                  {u.username}
                </button>
              ))}
              {users.filter(u => u.username.toLowerCase().includes(msgUserSearch.toLowerCase())).length === 0 && (
                <p className="px-3 py-2 text-xs text-muted-foreground">Не найдено</p>
              )}
            </div>
          )}
        </div>

        {/* Message text */}
        <div className="mb-3">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Текст сообщения</label>
          <textarea
            value={msgText}
            onChange={(e) => setMsgText(e.target.value)}
            placeholder="Введите текст сообщения..."
            rows={3}
            className="w-full bg-white/5 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none border border-transparent focus:border-neon/30 transition-all resize-none"
          />
        </div>

        {msgError && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 mb-3">
            <Icon name="AlertCircle" size={14} className="text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">{msgError}</p>
          </div>
        )}
        {msgSuccess && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-neon/10 border border-neon/20 mb-3">
            <Icon name="CheckCircle" size={14} className="text-neon flex-shrink-0" />
            <p className="text-sm text-neon">{msgSuccess}</p>
          </div>
        )}

        <button onClick={sendMessage} disabled={msgLoading || !msgText.trim()}
          className="neon-btn w-full rounded-2xl py-3 font-display font-semibold tracking-wider text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
          {msgLoading ? <Icon name="Loader2" size={16} className="animate-spin" /> : <Icon name="Send" size={16} />}
          ОТПРАВИТЬ {msgTarget === null ? "ВСЕМ" : `→ ${msgTargetName}`}
        </button>
      </div>

      {/* Users list */}
      <div className="glass-card rounded-3xl p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon name="Users" size={17} className="text-neon" />
            <h2 className="font-display font-bold text-foreground tracking-wide">ПОЛЬЗОВАТЕЛИ</h2>
          </div>
          <span className="text-xs text-muted-foreground">{users.length} чел.</span>
        </div>
        <div className="relative mb-3">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <Icon name="Search" size={15} className="text-muted-foreground" />
          </div>
          <input
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            placeholder="Поиск по username..."
            className="w-full bg-white/5 rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none border border-transparent focus:border-neon/30 transition-all"
          />
          {userSearch && (
            <button onClick={() => setUserSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              <Icon name="X" size={14} />
            </button>
          )}
        </div>
        {usersLoading ? (
          <div className="flex justify-center py-6"><Icon name="Loader2" size={24} className="text-neon animate-spin" /></div>
        ) : users.filter(u => !userSearch || u.username.toLowerCase().includes(userSearch.toLowerCase())).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Никого не найдено</p>
        ) : (
          <div className="space-y-2">
            {users.filter(u => !userSearch || u.username.toLowerCase().includes(userSearch.toLowerCase())).map((u) => (
              <div key={u.id} className={`rounded-2xl p-3.5 flex items-center gap-3 ${u.is_superadmin ? "bg-yellow-500/10 border border-yellow-500/20" : u.is_admin ? "bg-orange-500/10 border border-orange-500/20" : "bg-white/5"}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${u.is_superadmin ? "bg-yellow-500/20 border border-yellow-500/30" : u.is_admin ? "bg-orange-500/20 border border-orange-500/30" : "bg-neon/10 border border-neon/20"}`}>
                  <span className={`font-display text-sm font-bold ${u.is_superadmin ? "text-yellow-400" : u.is_admin ? "text-orange-400" : "text-neon"}`}>{u.username.slice(0, 2).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-foreground truncate">{u.username}</p>
                    {u.is_superadmin && <span className="text-[9px] font-display font-bold tracking-widest uppercase text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded-md flex-shrink-0">СУПЕРАДМИН</span>}
                    {!u.is_superadmin && u.is_admin && <span className="text-[9px] font-display font-bold tracking-widest uppercase text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded-md flex-shrink-0">АДМИН</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString("ru-RU")} · {u.passes_count} {u.passes_count === 1 ? "пропуск" : u.passes_count < 5 ? "пропуска" : "пропусков"}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isSuperAdmin && !u.is_superadmin && u.id !== session.user_id && (
                    <button
                      onClick={() => toggleAdmin(u.id, u.is_admin)}
                      disabled={adminActionLoading === u.id}
                      className={`text-xs font-semibold px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1 ${u.is_admin ? "bg-red-500/15 text-red-400 hover:bg-red-500/25" : "bg-orange-500/15 text-orange-400 hover:bg-orange-500/25"}`}>
                      {adminActionLoading === u.id ? <Icon name="Loader2" size={11} className="animate-spin" /> : <Icon name={u.is_admin ? "ShieldOff" : "ShieldCheck"} size={11} />}
                      {u.is_admin ? "Забрать" : "Дать"}
                    </button>
                  )}
                  <button
                    onClick={() => { setSearch(u.username); document.getElementById("passes-block")?.scrollIntoView({ behavior: "smooth" }); }}
                    className="text-xs text-neon font-semibold hover:opacity-70 transition-opacity">
                    Пропуска
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ban management */}
      <div className="glass-card rounded-3xl p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Icon name="ShieldOff" size={17} className="text-red-400" />
          <h2 className="font-display font-bold text-foreground tracking-wide">БАНЫ</h2>
        </div>
        <div className="relative mb-3">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <Icon name="Search" size={14} className="text-muted-foreground" />
          </div>
          <input
            value={banSearch}
            onChange={(e) => setBanSearch(e.target.value)}
            placeholder="Поиск по username..."
            className="w-full bg-white/5 rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none border border-transparent focus:border-red-400/30 transition-all"
          />
          {banSearch && (
            <button onClick={() => setBanSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              <Icon name="X" size={14} />
            </button>
          )}
        </div>
        {usersLoading ? (
          <div className="flex justify-center py-6"><Icon name="Loader2" size={24} className="text-neon animate-spin" /></div>
        ) : (
          <div className="space-y-2">
            {users
              .filter(u => !u.is_superadmin && u.id !== session.user_id)
              .filter(u => !banSearch || u.username.toLowerCase().includes(banSearch.toLowerCase()))
              .map((u) => (
                <div key={u.id} className={`rounded-2xl p-3.5 flex items-center gap-3 ${u.is_banned ? "bg-red-500/10 border border-red-500/20" : "bg-white/5"}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${u.is_banned ? "bg-red-500/20 border border-red-500/30" : "bg-white/5 border border-white/10"}`}>
                    <span className={`font-display text-sm font-bold ${u.is_banned ? "text-red-400" : "text-muted-foreground"}`}>{u.username.slice(0, 2).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-foreground truncate">{u.username}</p>
                      {u.is_banned && <span className="text-[9px] font-display font-bold tracking-widest uppercase text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded-md flex-shrink-0">ЗАБАНЕН</span>}
                      {u.is_admin && !u.is_banned && <span className="text-[9px] font-display font-bold tracking-widest uppercase text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded-md flex-shrink-0">АДМИН</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString("ru-RU")}</p>
                  </div>
                  {(!u.is_admin || isSuperAdmin) && (
                    <button
                      onClick={() => toggleBan(u.id, u.is_banned)}
                      disabled={banActionLoading === u.id}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 flex-shrink-0 ${u.is_banned ? "bg-neon/15 text-neon hover:bg-neon/25" : "bg-red-500/15 text-red-400 hover:bg-red-500/25"}`}>
                      {banActionLoading === u.id ? <Icon name="Loader2" size={11} className="animate-spin" /> : <Icon name={u.is_banned ? "ShieldCheck" : "Ban"} size={11} />}
                      {u.is_banned ? "Разбанить" : "Забанить"}
                    </button>
                  )}
                </div>
              ))}
            {users.filter(u => !u.is_superadmin && u.id !== session.user_id && (!banSearch || u.username.toLowerCase().includes(banSearch.toLowerCase()))).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Никого не найдено</p>
            )}
          </div>
        )}
      </div>

      {/* All passes list */}
      <div id="passes-block" className="glass-card rounded-3xl p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon name="List" size={17} className="text-neon" />
            <h2 className="font-display font-bold text-foreground tracking-wide">ВСЕ ПРОПУСКА</h2>
          </div>
          <span className="text-xs text-muted-foreground">{allPasses.length} шт.</span>
        </div>
        <div className="relative mb-3">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <Icon name="Search" size={15} className="text-muted-foreground" />
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по username..."
            className="w-full bg-white/5 rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none border border-transparent focus:border-neon/30 transition-all"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              <Icon name="X" size={14} />
            </button>
          )}
        </div>
        {passesLoading ? (
          <div className="flex justify-center py-6"><Icon name="Loader2" size={24} className="text-neon animate-spin" /></div>
        ) : allPasses.filter(p => !search || p.username?.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{search ? `Нет пропусков у «${search}»` : "Пропусков нет"}</p>
        ) : (
          <div className="space-y-2">
            {allPasses.filter(p => !search || p.username?.toLowerCase().includes(search.toLowerCase())).map((p) => (
              <div key={p.id} className={`rounded-2xl p-3.5 bg-gradient-to-br ${PRIV_COLOR[p.privilege]} flex items-center gap-3`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] font-display font-bold tracking-widest uppercase ${PRIV_ACCENT[p.privilege]}`}>{p.privilege_label}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${p.active ? "badge-active" : "badge-inactive"}`}>{p.active ? "Активен" : "Истёк"}</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground truncate">{p.display_name}</p>
                  <p className="text-xs text-muted-foreground">@{p.username} · {formatExpiry(p.expires_at, p.no_timer, p.privilege)}</p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={() => setEditPass(p)}
                    className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                    <Icon name="Pencil" size={14} className="text-muted-foreground" />
                  </button>
                  <button onClick={() => setDeleteConfirm(p)}
                    className="w-8 h-8 rounded-xl bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center transition-colors">
                    <Icon name="Trash2" size={14} className="text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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

      {/* Create promo */}
      <div className="glass-card rounded-3xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon name="Ticket" size={18} className="text-neon" />
          <h2 className="font-display font-bold text-foreground tracking-wide">СОЗДАТЬ ПРОМОКОД</h2>
        </div>

        {/* Code */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Промокод</label>
          <input value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            placeholder="MYCODE2025"
            className="w-full bg-white/5 rounded-2xl px-4 py-3 text-foreground text-sm outline-none border border-transparent focus:border-neon/40 transition-all font-mono tracking-widest" />
        </div>

        {/* Display name */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Название пропуска</label>
          <input value={promoDisplayName} onChange={(e) => setPromoDisplayName(e.target.value)}
            placeholder="Пропуск по промокоду"
            className="w-full bg-white/5 rounded-2xl px-4 py-3 text-foreground text-sm outline-none border border-transparent focus:border-neon/40 transition-all" />
        </div>

        {/* Privilege */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Привилегия</label>
          <div className="grid grid-cols-2 gap-2">
            {([["client","Клиент","text-sky-400"],["helper","Помощник","text-purple-400"],["admator","Администратор","text-orange-400"],["developer","Разработчик","text-yellow-400"]] as [Privilege,string,string][]).map(([v,l,c]) => (
              <button key={v} onClick={() => setPromoPrivilege(v)}
                className={`py-2.5 rounded-xl text-sm font-semibold transition-all border ${promoPrivilege === v ? `${c} bg-white/10 border-white/20` : "text-muted-foreground bg-white/5 border-transparent"}`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Pass duration */}
        {promoPrivilege !== "developer" && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Срок пропуска</label>
              <button onClick={() => setPromoNoTimer(v => !v)}
                className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${promoNoTimer ? "text-neon" : "text-muted-foreground"}`}>
                <div className={`w-8 h-4 rounded-full relative border transition-colors ${promoNoTimer ? "bg-neon/30 border-neon/50" : "bg-white/10 border-white/10"}`}>
                  <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${promoNoTimer ? "left-4 bg-neon" : "left-0.5 bg-white/40"}`} />
                </div>
                Бессрочно
              </button>
            </div>
            {!promoNoTimer && (
              <div className="flex gap-2">
                <input type="number" min="1" value={promoDurationValue} onChange={(e) => setPromoDurationValue(e.target.value)}
                  className="w-24 bg-white/5 rounded-xl px-3 py-2.5 text-foreground text-sm outline-none border border-transparent focus:border-neon/40 transition-all" />
                <div className="flex gap-1 flex-1">
                  {(["minutes","hours","days"] as DurationUnit[]).map((u) => (
                    <button key={u} onClick={() => setPromoDurationUnit(u)}
                      className={`flex-1 rounded-xl py-2.5 text-xs font-semibold font-display tracking-wide border transition-all ${promoDurationUnit === u ? "text-neon border-neon/40 bg-neon/10" : "text-muted-foreground border-white/10"}`}>
                      {u === "minutes" ? "МИН" : u === "hours" ? "ЧАС" : "ДН"}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Max uses */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Кол-во использований</label>
            <button onClick={() => setPromoUnlimitedUses(v => !v)}
              className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${promoUnlimitedUses ? "text-neon" : "text-muted-foreground"}`}>
              <div className={`w-8 h-4 rounded-full relative border transition-colors ${promoUnlimitedUses ? "bg-neon/30 border-neon/50" : "bg-white/10 border-white/10"}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${promoUnlimitedUses ? "left-4 bg-neon" : "left-0.5 bg-white/40"}`} />
              </div>
              Безлимит
            </button>
          </div>
          {!promoUnlimitedUses && (
            <input type="number" min="1" value={promoMaxUses} onChange={(e) => setPromoMaxUses(e.target.value)}
              className="w-full bg-white/5 rounded-xl px-4 py-2.5 text-foreground text-sm outline-none border border-transparent focus:border-neon/40 transition-all" />
          )}
        </div>

        {/* Promo validity */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Срок действия промокода</label>
            <button onClick={() => setPromoUnlimitedExpiry(v => !v)}
              className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${promoUnlimitedExpiry ? "text-neon" : "text-muted-foreground"}`}>
              <div className={`w-8 h-4 rounded-full relative border transition-colors ${promoUnlimitedExpiry ? "bg-neon/30 border-neon/50" : "bg-white/10 border-white/10"}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${promoUnlimitedExpiry ? "left-4 bg-neon" : "left-0.5 bg-white/40"}`} />
              </div>
              Бессрочно
            </button>
          </div>
          {!promoUnlimitedExpiry && (
            <div className="flex gap-2">
              <input type="number" min="1" value={promoExpiresValue} onChange={(e) => setPromoExpiresValue(e.target.value)}
                className="w-24 bg-white/5 rounded-xl px-3 py-2.5 text-foreground text-sm outline-none border border-transparent focus:border-neon/40 transition-all" />
              <div className="flex gap-1 flex-1">
                {(["minutes","hours","days"] as DurationUnit[]).map((u) => (
                  <button key={u} onClick={() => setPromoExpiresUnit(u)}
                    className={`flex-1 rounded-xl py-2.5 text-xs font-semibold font-display tracking-wide border transition-all ${promoExpiresUnit === u ? "text-neon border-neon/40 bg-neon/10" : "text-muted-foreground border-white/10"}`}>
                    {u === "minutes" ? "МИН" : u === "hours" ? "ЧАС" : "ДН"}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {promoError && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
            <Icon name="AlertCircle" size={14} className="text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">{promoError}</p>
          </div>
        )}
        {promoSuccess && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-neon/10 border border-neon/20">
            <Icon name="CheckCircle" size={14} className="text-neon flex-shrink-0" />
            <p className="text-sm text-neon">{promoSuccess}</p>
          </div>
        )}

        <button onClick={createPromo} disabled={promoLoading || !promoCode.trim() || !promoDisplayName.trim()}
          className="neon-btn w-full rounded-2xl py-3.5 font-display font-semibold tracking-wider text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
          {promoLoading ? <Icon name="Loader2" size={17} className="animate-spin" /> : <Icon name="Ticket" size={17} />}
          СОЗДАТЬ ПРОМОКОД
        </button>
      </div>

      {/* Promos list */}
      <div className="glass-card rounded-3xl p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Icon name="Tag" size={17} className="text-neon" />
            <h2 className="font-display font-bold text-foreground tracking-wide">ПРОМОКОДЫ</h2>
          </div>
          <span className="text-xs text-muted-foreground">{promos.length} шт.</span>
        </div>
        {promosLoading ? (
          <div className="flex justify-center py-6"><Icon name="Loader2" size={24} className="text-neon animate-spin" /></div>
        ) : promos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Промокодов нет</p>
        ) : (
          <div className="space-y-2">
            {promos.map((p) => (
              <div key={p.id} className="rounded-2xl p-3.5 bg-white/5 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-bold text-neon tracking-widest">{p.code}</span>
                    <span className={`text-[10px] font-display font-bold uppercase tracking-wide ${PRIV_ACCENT[p.privilege]}`}>{p.privilege}</span>
                  </div>
                  <p className="text-xs text-foreground mb-1">{p.display_name}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                    <span className="text-[11px] text-muted-foreground">
                      {p.max_uses === null ? "∞" : `${p.uses_count}/${p.max_uses}`} исп.
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {p.no_timer ? "пропуск бессрочный" : p.duration_seconds ? `${Math.round(p.duration_seconds / 3600)}ч пропуск` : ""}
                    </span>
                    {p.expires_at && (
                      <span className="text-[11px] text-yellow-400/80">
                        до {new Date(p.expires_at).toLocaleDateString("ru-RU")}
                      </span>
                    )}
                    {!p.expires_at && <span className="text-[11px] text-muted-foreground">промокод бессрочный</span>}
                  </div>
                </div>
                <button onClick={() => deletePromo(p.id)} disabled={deletingPromoId === p.id}
                  className="w-8 h-8 rounded-xl bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center transition-colors flex-shrink-0 mt-0.5">
                  {deletingPromoId === p.id
                    ? <Icon name="Loader2" size={13} className="text-red-400 animate-spin" />
                    : <Icon name="Trash2" size={13} className="text-red-400" />}
                </button>
              </div>
            ))}
          </div>
        )}
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

// ——— Messages Drawer ———
function MessagesDrawer({ session, open, onClose }: { session: Session; open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<{ id: number; target_user_id: number | null; text: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(MESSAGES_URL, { headers: { "Authorization": `Bearer ${session.token}` } })
      .then((r) => r.json())
      .then((d) => setMessages(d.messages || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, session.token]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md mx-4 mt-4 glass-card rounded-3xl p-5 animate-scale-in max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Icon name="MessageSquare" size={17} className="text-neon" />
            <h3 className="font-display font-bold text-foreground tracking-wide">СООБЩЕНИЯ</h3>
          </div>
          <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors" onClick={onClose}>
            <Icon name="X" size={16} className="text-muted-foreground" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 space-y-2 pr-0.5">
          {loading ? (
            <div className="flex justify-center py-8"><Icon name="Loader2" size={22} className="text-neon animate-spin" /></div>
          ) : messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Нет сообщений</p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="rounded-2xl p-4 bg-white/5 border border-white/5">
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <span className={`text-[10px] font-display font-bold tracking-widest uppercase ${m.target_user_id ? "text-neon" : "text-yellow-400"}`}>
                    {m.target_user_id ? "Личное" : "Всем"}
                  </span>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">
                    {new Date(m.created_at).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{m.text}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ——— Ban Screen ———
function BannedScreen({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="min-h-screen bg-mesh flex flex-col items-center justify-center px-6 text-center" style={{ minHeight: "100dvh" }}>
      <div className="w-20 h-20 rounded-3xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mb-6">
        <Icon name="ShieldOff" size={36} className="text-red-400" />
      </div>
      <h1 className="font-display text-3xl font-bold text-foreground mb-2">ДОСТУП ЗАКРЫТ<span className="text-red-400">.</span></h1>
      <p className="text-sm text-muted-foreground mb-8 max-w-xs">Ваш аккаунт заблокирован администрацией клуба. Обратитесь к администратору для разблокировки.</p>
      <button onClick={onLogout} className="flex items-center gap-2 px-5 py-3 rounded-2xl border border-red-500/20 text-red-400/80 hover:border-red-500/40 hover:text-red-400 transition-all text-sm font-semibold">
        <Icon name="LogOut" size={15} />
        Выйти из аккаунта
      </button>
    </div>
  );
}

// ——— Main ———
export default function Index() {
  const [tab, setTab] = useState<Tab>("passes");
  const { session, save, logout } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [msgOpen, setMsgOpen] = useState(false);

  const checkSession = (token: string, userId: number) => {
    fetch(PASSES_URL, { headers: { "Authorization": `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.banned) setIsBanned(true); })
      .catch(() => {});
    fetch(USERS_URL, { headers: { "Authorization": `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.banned) { setIsBanned(true); return; }
        if (d.users) {
          const me = d.users.find((u: { id: number; is_admin: boolean; is_superadmin: boolean }) => u.id === userId);
          setIsAdmin(!!me?.is_admin);
          setIsSuperAdmin(!!d.caller_is_superadmin);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (!session) { setIsAdmin(false); setIsSuperAdmin(false); setIsBanned(false); return; }
    checkSession(session.token, session.user_id);
    const interval = setInterval(() => checkSession(session.token, session.user_id), 15000);
    return () => clearInterval(interval);
  }, [session]);

  const tabs = [
    { id: "passes" as Tab, icon: "CreditCard", label: "ПРОПУСКА" },
    ...(isAdmin ? [{ id: "admin" as Tab, icon: "ShieldCheck", label: "АДМИН" }] : []),
    { id: "profile" as Tab, icon: "User", label: "ПРОФИЛЬ" },
  ];

  if (session && isBanned) return <BannedScreen onLogout={logout} />;

  return (
    <div className="min-h-screen bg-mesh flex flex-col max-w-md mx-auto relative" style={{ minHeight: "100dvh" }}>
      {/* Messages drawer */}
      {session && <MessagesDrawer session={session} open={msgOpen} onClose={() => setMsgOpen(false)} />}

      {/* Top nav */}
      <div className="sticky top-0 z-20 px-6 pt-12 pb-3"
        style={{ background: "hsla(220,20%,6%,0.85)", backdropFilter: "blur(24px)", borderBottom: "1px solid hsla(220,20%,18%,0.5)" }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-display tracking-[0.25em] uppercase text-muted-foreground">Приватный клуб</p>
          {session && (
            <button
              onClick={() => setMsgOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neon/15 border border-neon/30 hover:bg-neon/25 transition-all"
              style={{ boxShadow: "0 0 12px hsla(162,100%,50%,0.15)" }}>
              <Icon name="MessageSquare" size={14} className="text-neon" />
              <span className="text-[11px] font-display font-semibold text-neon tracking-wide">Сообщения</span>
            </button>
          )}
        </div>
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
          <AdminPage session={session} isSuperAdmin={isSuperAdmin} />
        ) : (
          <ProfilePage session={session} onLogout={logout} isAdmin={isAdmin} />
        )}
      </div>
    </div>
  );
}