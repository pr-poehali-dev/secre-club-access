import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

const AUTH_URL = "https://functions.poehali.dev/5ade4d5e-5e9e-4c62-b935-8cce71cbfc2f";
const STORAGE_KEY = "club_session";

type Tab = "passes" | "profile";
type AuthMode = "login" | "register";

interface Session {
  token: string;
  username: string;
  user_id: number;
}

function useSession() {
  const [session, setSession] = useState<Session | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const save = (s: Session) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    setSession(s);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  };

  return { session, save, logout };
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
    setError("");
    setLoading(true);
    try {
      const res = await fetch(AUTH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: mode, username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка");
      } else {
        onSuccess(data as Session);
      }
    } catch {
      setError("Нет соединения с сервером");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-enter px-6 pt-10 pb-8 flex flex-col">
      <div className="mb-8">
        <p className="text-xs font-display tracking-[0.2em] uppercase text-muted-foreground mb-1">
          Приватный клуб
        </p>
        <h2 className="font-display text-3xl font-bold text-foreground">
          {mode === "login" ? "ВХОД" : "РЕГИСТРАЦИЯ"}
          <span className="neon-text">.</span>
        </h2>
      </div>

      <div className="space-y-4">
        {/* Username */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Имя пользователя
          </label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <Icon name="User" size={17} className="text-muted-foreground" />
            </div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="username"
              className="w-full glass-card rounded-2xl pl-11 pr-4 py-3.5 text-foreground placeholder:text-muted-foreground/50 text-sm outline-none focus:neon-border transition-all duration-300 bg-transparent"
              autoComplete="username"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Пароль
          </label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <Icon name="Lock" size={17} className="text-muted-foreground" />
            </div>
            <input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="••••••"
              className="w-full glass-card rounded-2xl pl-11 pr-12 py-3.5 text-foreground placeholder:text-muted-foreground/50 text-sm outline-none focus:neon-border transition-all duration-300 bg-transparent"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
            <button
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowPass((v) => !v)}
            >
              <Icon name={showPass ? "EyeOff" : "Eye"} size={17} />
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <Icon name="AlertCircle" size={15} className="text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={submit}
          disabled={loading}
          className="neon-btn w-full rounded-2xl py-3.5 font-display font-semibold tracking-wider text-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
        >
          {loading ? (
            <Icon name="Loader2" size={18} className="animate-spin" />
          ) : (
            <Icon name={mode === "login" ? "LogIn" : "UserPlus"} size={17} />
          )}
          {mode === "login" ? "ВОЙТИ" : "ЗАРЕГИСТРИРОВАТЬСЯ"}
        </button>

        {/* Switch mode */}
        <div className="text-center pt-2">
          <span className="text-sm text-muted-foreground">
            {mode === "login" ? "Нет аккаунта? " : "Уже есть аккаунт? "}
          </span>
          <button
            className="text-sm text-neon font-semibold hover:opacity-80 transition-opacity"
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
          >
            {mode === "login" ? "Зарегистрироваться" : "Войти"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ——— Passes ———
function PassesPage({ username }: { username: string }) {
  return (
    <div className="page-enter px-6 pt-10 pb-8 flex flex-col items-center justify-center min-h-[55vh] text-center">
      <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
        <Icon name="CreditCard" size={36} className="text-muted-foreground" />
      </div>
      <h2 className="font-display text-2xl font-bold text-foreground mb-2">Нет пропусков</h2>
      <p className="text-muted-foreground text-sm max-w-[240px] leading-relaxed">
        Привет, <span className="text-foreground font-semibold">{username}</span>! Ваши пропуска появятся здесь после одобрения администратором.
      </p>
    </div>
  );
}

// ——— Profile ———
function ProfilePage({ session, onLogout }: { session: Session; onLogout: () => void }) {
  return (
    <div className="page-enter px-6 pt-10 pb-8">
      <div className="glass-card rounded-3xl p-6 flex items-center gap-5 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-neon/10 border border-neon/20 flex items-center justify-center flex-shrink-0">
          <span className="font-display text-xl font-bold text-neon">
            {session.username.slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-xl font-bold text-foreground">{session.username}</h2>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-neon pulse-dot" />
            <span className="text-xs text-neon font-semibold">Участник клуба</span>
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

      <button
        onClick={onLogout}
        className="w-full rounded-2xl py-3.5 border border-red-500/20 text-red-400/80 hover:border-red-500/40 hover:text-red-400 transition-all duration-300 text-sm font-semibold flex items-center justify-center gap-2"
      >
        <Icon name="LogOut" size={16} />
        Выйти из аккаунта
      </button>
    </div>
  );
}

// ——— Main ———
export default function Index() {
  const [tab, setTab] = useState<Tab>("passes");
  const { session, save, logout } = useSession();

  return (
    <div
      className="min-h-screen bg-mesh flex flex-col max-w-md mx-auto relative"
      style={{ minHeight: "100dvh" }}
    >
      {/* Top nav */}
      <div
        className="sticky top-0 z-20 px-6 pt-12 pb-3"
        style={{
          background: "hsla(220,20%,6%,0.85)",
          backdropFilter: "blur(24px)",
          borderBottom: "1px solid hsla(220,20%,18%,0.5)",
        }}
      >
        <p className="text-[10px] font-display tracking-[0.25em] uppercase text-muted-foreground mb-3">
          Приватный клуб
        </p>
        <div className="flex gap-1 p-1 rounded-2xl bg-white/5">
          {(["passes", "profile"] as Tab[]).map((t) => (
            <button
              key={t}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-display text-sm font-semibold tracking-wide transition-all duration-300 ${
                tab === t
                  ? "bg-neon text-[hsl(220,20%,6%)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              style={tab === t ? { boxShadow: "0 0 20px hsla(162,100%,50%,0.4)" } : {}}
              onClick={() => setTab(t)}
            >
              <Icon name={t === "passes" ? "CreditCard" : "User"} size={16} />
              {t === "passes" ? "ПРОПУСКА" : "ПРОФИЛЬ"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!session ? (
          <AuthForm onSuccess={save} />
        ) : tab === "passes" ? (
          <PassesPage username={session.username} />
        ) : (
          <ProfilePage session={session} onLogout={logout} />
        )}
      </div>
    </div>
  );
}
