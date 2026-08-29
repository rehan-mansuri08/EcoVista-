"use client";

import { useEffect, useRef } from "react";
import type { WeatherData } from "@/types";

type Condition = WeatherData["conditions"];

interface Props {
  weather: WeatherData;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  len: number;
  speed: number;
  wind: number;
  wobble: number;
}

export function WeatherVisualizer({ weather, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * DPR;
      canvas.height = height * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const conditions = weather.conditions;

    // Perlin-like drift for fog using layered sine
    const perlinish = (x: number, y: number, t: number) =>
      Math.sin(x * 0.02 + t * 0.15) * Math.cos(y * 0.03 + t * 0.1) +
      Math.sin((x + y) * 0.015 + t * 0.08) * 0.5;

    const initParticles = (count: number) => {
      particlesRef.current = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        len: 6 + Math.random() * 10,
        speed: 2 + Math.random() * 4,
        wind: conditions === "snow" ? 0.3 + Math.random() * 0.6 : 2 + Math.random() * 3,
        wobble: Math.random() * Math.PI * 2,
      }));
    };

    if (conditions === "rain") initParticles(160);
    else if (conditions === "snow") initParticles(120);
    else initParticles(0);

    const draw = (t: number) => {
      ctx.clearRect(0, 0, width, height);

      // Gradient sky based on local time
      const hour = weather.hour;
      let top = "#0b1120";
      let bottom = "#1e293b";
      if (conditions === "clear") {
        if (hour >= 5 && hour < 8) { top = "#2d1b4e"; bottom = "#f59e0b"; }          // sunrise
        else if (hour >= 8 && hour < 17) { top = "#1d4ed8"; bottom = "#7dd3fc"; }    // day
        else if (hour >= 17 && hour < 19) { top = "#7c2d12"; bottom = "#fbbf24"; }   // golden hour
        else if (hour >= 19 && hour < 21) { top = "#0c1a3a"; bottom = "#8b5cf6"; }   // twilight
        else { top = "#020617"; bottom = "#111827"; }                                // night
      } else if (conditions === "fog") { top = "#334155"; bottom = "#94a3b8"; }
      else if (conditions === "snow") { top = "#475569"; bottom = "#e2e8f0"; }
      else if (conditions === "rain") { top = "#1e293b"; bottom = "#475569"; }
      else { top = "#0f172a"; bottom = "#334155"; }

      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, top);
      grad.addColorStop(1, bottom);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Sun / Moon
      if (conditions === "clear" || conditions === "clouds") {
        const isNight = hour >= 20 || hour < 5;
        ctx.beginPath();
        ctx.arc(width * 0.78, height * 0.22, isNight ? 26 : 34, 0, Math.PI * 2);
        const glow = ctx.createRadialGradient(width * 0.78, height * 0.22, 5, width * 0.78, height * 0.22, 120);
        if (isNight) {
          glow.addColorStop(0, "rgba(226,232,240,0.5)");
          glow.addColorStop(1, "rgba(226,232,240,0)");
          ctx.fillStyle = "#f1f5f9";
        } else {
          glow.addColorStop(0, "rgba(251,191,36,0.5)");
          glow.addColorStop(1, "rgba(251,191,36,0)");
          ctx.fillStyle = "#fde047";
        }
        ctx.fill();
        ctx.fillStyle = isNight ? "#f1f5f9" : "#fde047";
        ctx.beginPath();
        ctx.arc(width * 0.78, height * 0.22, isNight ? 20 : 26, 0, Math.PI * 2);
        ctx.fill();
      }

      // Stars at night
      if (weather.hour >= 20 || weather.hour < 5) {
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        for (let i = 0; i < 40; i++) {
          const x = (i * 97) % width;
          const y = ((i * 53) % (height * 0.4)) + 10;
          const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.001 + i));
          ctx.globalAlpha = tw;
          ctx.fillRect(x, y, 1.4, 1.4);
        }
        ctx.globalAlpha = 1;
      }

      // Rain
      if (conditions === "rain") {
        ctx.strokeStyle = "rgba(148,163,184,0.5)";
        ctx.lineWidth = 1.4;
        for (const p of particlesRef.current) {
          p.y += p.speed;
          p.x += p.wind * 0.3;
          p.wobble += 0.1;
          if (p.y > height) { p.y = -20; p.x = Math.random() * width; }
          if (p.x > width) p.x = 0;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.wind, p.y - p.len);
          ctx.stroke();
        }
      }

      // Snow
      if (conditions === "snow") {
        for (const p of particlesRef.current) {
          p.y += p.speed * 0.5;
          p.x += Math.sin(p.wobble) * 0.8 + p.wind * 0.2;
          p.wobble += 0.03;
          if (p.y > height) { p.y = -10; p.x = Math.random() * width; }
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,255,255,0.9)";
          ctx.fill();
        }
      }

      // Fog layers
      if (conditions === "fog") {
        for (let layer = 0; layer < 4; layer++) {
          ctx.fillStyle = `rgba(226,232,240,${0.05 + layer * 0.02})`;
          ctx.beginPath();
          for (let x = 0; x <= width; x += 8) {
            const y = height * (0.4 + layer * 0.16) + perlinish(x, layer, t) * 30;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.lineTo(width, height);
          ctx.lineTo(0, height);
          ctx.closePath();
          ctx.fill();
        }
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [weather.conditions, weather.hour]);

  return (
    <canvas
      ref={canvasRef}
      className={`h-full w-full ${className || ""}`}
      aria-hidden
    />
  );
}
