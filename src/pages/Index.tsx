import { useState } from "react";
import Icon from "@/components/ui/icon";

type Tab = "passes" | "profile";

function AuthButtons() {
  return (
    <div className="flex flex-col gap-3 w-full mt-6">
      <button className="neon-btn w-full rounded-2xl py-3.5 font-display font-semibold tracking-wider text-sm flex items-center justify-center gap-2">
        <Icon name="LogIn" size={17} />
        ВОЙТИ
      </button>
      <button className="w-full rounded-2xl py-3.5 font-display font-semibold tracking-wider text-sm border border-white/15 text-foreground hover:border-neon/40 hover:text-neon transition-all duration-300 flex items-center justify-center gap-2">
        <Icon name="UserPlus" size={17} />
        ЗАРЕГИСТРИРОВАТЬСЯ
      </button>
    </div>
  );
}

function PassesPage() {
  return (
    <div className="page-enter px-6 pt-12 pb-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
        <Icon name="CreditCard" size={36} className="text-muted-foreground" />
      </div>
      <h2 className="font-display text-2xl font-bold text-foreground mb-2">Нет пропусков</h2>
      <p className="text-muted-foreground text-sm max-w-[240px] leading-relaxed">
        Здесь появятся ваши регистрации и пропуска после входа в систему
      </p>
      <AuthButtons />
    </div>
  );
}

function ProfilePage() {
  return (
    <div className="page-enter px-6 pt-12 pb-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
        <Icon name="User" size={36} className="text-muted-foreground" />
      </div>
      <h2 className="font-display text-2xl font-bold text-foreground mb-2">Вы не вошли</h2>
      <p className="text-muted-foreground text-sm max-w-[240px] leading-relaxed">
        Войдите или зарегистрируйтесь, чтобы увидеть данные профиля
      </p>
      <AuthButtons />
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
      {/* Top nav */}
      <div
        className="sticky top-0 z-20 px-6 pt-12 pb-2"
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
          <button
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-display text-sm font-semibold tracking-wide transition-all duration-300 ${
              tab === "passes"
                ? "bg-neon text-[hsl(220,20%,6%)] shadow-lg"
                : "text-muted-foreground hover:text-foreground"
            }`}
            style={tab === "passes" ? { boxShadow: "0 0 20px hsla(162,100%,50%,0.4)" } : {}}
            onClick={() => setTab("passes")}
          >
            <Icon name="CreditCard" size={16} />
            ПРОПУСКА
          </button>
          <button
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-display text-sm font-semibold tracking-wide transition-all duration-300 ${
              tab === "profile"
                ? "bg-neon text-[hsl(220,20%,6%)] shadow-lg"
                : "text-muted-foreground hover:text-foreground"
            }`}
            style={tab === "profile" ? { boxShadow: "0 0 20px hsla(162,100%,50%,0.4)" } : {}}
            onClick={() => setTab("profile")}
          >
            <Icon name="User" size={16} />
            ПРОФИЛЬ
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "passes" ? <PassesPage /> : <ProfilePage />}
      </div>
    </div>
  );
}