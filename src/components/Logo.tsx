// Markaziy logotip: public/logo.png (oq fondagi MY DREAM SCHOOL emblemasi).
// Fayl topilmasa (404) eski 🧠 ko'rinishga qaytadi — singan rasm belgisi chiqmaydi.
import { useState } from "react";

export function Logo({
  size = 36,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span
        className={className}
        style={{
          display: "grid",
          placeItems: "center",
          width: size,
          height: size,
          fontSize: Math.round(size * 0.55),
          borderRadius: Math.max(8, size * 0.28),
          background: "linear-gradient(135deg,#ffd97a,#f59e0b)",
          boxShadow: "0 0 18px rgba(245,158,11,.5)",
        }}
      >
        🧠
      </span>
    );
  }
  return (
    <img
      src="/logo.png"
      alt="MY DREAM MENTAL"
      width={size}
      height={size}
      className={className}
      onError={() => setFailed(true)}
      style={{
        width: size,
        height: size,
        borderRadius: Math.max(8, size * 0.28),
        objectFit: "contain",
        background: "#fff",
        padding: 2,
      }}
    />
  );
}
