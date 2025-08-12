"use client";

import { useState, useEffect } from "react";

export default function FireChecklist({ onProgressChange }) {
  const initialTasks = [
    "Pierwsze 100 zł oszczędności",
    "Pierwsze 1000 zł oszczędności",
    "Stworzenie budżetu domowego",
    "Założenie konta oszczędnościowego",
    "Pierwszy zakup ETF"
  ];

  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem("fire-checklist");
    if (saved) {
      setTasks(JSON.parse(saved));
    } else {
      setTasks(initialTasks.map((t) => ({ text: t, done: false })));
    }
  }, []);

  useEffect(() => {
    if (tasks.length) {
      localStorage.setItem("fire-checklist", JSON.stringify(tasks));
      const doneCount = tasks.filter((t) => t.done).length;
      onProgressChange(Math.round((doneCount / tasks.length) * 100));
    }
  }, [tasks, onProgressChange]);

  const toggle = (index) => {
    setTasks((prev) =>
      prev.map((t, i) => (i === index ? { ...t, done: !t.done } : t))
    );
  };

  return (
    <div>
      <ul className="space-y-1">
        {tasks.map((task, idx) => (
          <li key={idx} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={task.done}
              onChange={() => toggle(idx)}
              className="h-4 w-4 accent-yellow-400"
            />
            <span className={task.done ? "line-through text-zinc-500" : ""}>
              {task.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
