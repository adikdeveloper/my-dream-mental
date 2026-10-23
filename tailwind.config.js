/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a"
        },
        navy: {
          950: "#060A1C",
          900: "#0B1026",
          850: "#10173A",
          800: "#151D45",
          700: "#1E2763"
        },
        gold: {
          200: "#FFE9A8",
          300: "#FFD97A",
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706"
        }
      },
      boxShadow: {
        card: "0 8px 30px rgba(2,6,23,.45)",
        glow: "0 0 24px rgba(245,158,11,.35)",
        "glow-lg": "0 0 44px rgba(245,158,11,.45)"
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" }
        },
        pop: {
          "0%": { opacity: "0", transform: "scale(.6)" },
          "70%": { transform: "scale(1.08)" },
          "100%": { opacity: "1", transform: "scale(1)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" }
        },
        wiggle: {
          "0%,100%": { transform: "rotate(-6deg)" },
          "50%": { transform: "rotate(6deg)" }
        },
        bob: {
          "0%,100%": { transform: "translateY(0) rotate(-2deg)" },
          "50%": { transform: "translateY(-8px) rotate(2deg)" }
        },
        blink: {
          "0%,92%,100%": { transform: "scaleY(1)" },
          "95%": { transform: "scaleY(0.08)" }
        },
        twinkle: {
          "0%,100%": { opacity: "0.25", transform: "scale(.7) rotate(0deg)" },
          "50%": { opacity: "1", transform: "scale(1.15) rotate(20deg)" }
        },
        drift: {
          "0%": { transform: "translate(0,0) rotate(0deg)" },
          "33%": { transform: "translate(6px,-10px) rotate(8deg)" },
          "66%": { transform: "translate(-6px,-4px) rotate(-8deg)" },
          "100%": { transform: "translate(0,0) rotate(0deg)" }
        }
      },
      animation: {
        fadeUp: "fadeUp .45s ease both",
        float: "float 5s ease-in-out infinite",
        "float-slow": "float 7s ease-in-out infinite",
        pop: "pop .35s ease both",
        wiggle: "wiggle 2.6s ease-in-out infinite",
        bob: "bob 3.4s ease-in-out infinite",
        blink: "blink 4.2s ease-in-out infinite",
        twinkle: "twinkle 2.2s ease-in-out infinite",
        drift: "drift 6s ease-in-out infinite",
        "spin-slow": "spin 9s linear infinite"
      }
    }
  },
  plugins: []
};
