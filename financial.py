import json
from dataclasses import dataclass, asdict
from datetime import date
from pathlib import Path
import tkinter as tk
from tkinter import messagebox, ttk

SAVE_FILE = Path("financial_goals.json")

REALM_ITEMS = {
    "Garden": {"cost": 500.0, "color": "#22c55e"},
    "Car": {"cost": 15000.0, "color": "#3b82f6"},
    "Cottage": {"cost": 40000.0, "color": "#f59e0b"},
}


@dataclass
class FinancialGoal:
    name: str
    target_amount: float
    deadline: str
    current_amount: float = 0.0
    completed: bool = False

    def add_money(self, amount: float) -> bool:
        if amount <= 0:
            raise ValueError("The amount must be positive.")

        self.current_amount += amount
        if self.current_amount >= self.target_amount:
            self.current_amount = self.target_amount
            self.completed = True
            return True
        return False

    def progress(self) -> float:
        if self.target_amount <= 0:
            return 0.0
        return min(self.current_amount / self.target_amount * 100, 100)

    def is_overdue(self) -> bool:
        if self.completed:
            return False
        return date.fromisoformat(self.deadline) < date.today()

    def remaining_amount(self) -> float:
        return max(0.0, self.target_amount - self.current_amount)

    def monthly_savings_needed(self) -> float | None:
        if self.completed:
            return 0.0
        due_date = date.fromisoformat(self.deadline)
        today = date.today()
        months_left = (due_date.year - today.year) * 12 + (due_date.month - today.month)
        if months_left <= 0:
            return None
        return self.remaining_amount() / months_left


def save_goals(goals: list[FinancialGoal]) -> None:
    data = [asdict(goal) for goal in goals]
    with SAVE_FILE.open("w", encoding="utf-8") as file:
        json.dump(data, file, indent=2)


def load_goals() -> list[FinancialGoal]:
    if not SAVE_FILE.exists():
        return []
    with SAVE_FILE.open("r", encoding="utf-8") as file:
        data = json.load(file)
    return [FinancialGoal(**goal) for goal in data]


class FinancialGoalsVisualApp:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("Financial Goals & Living Realm")
        self.root.geometry("920x580")

        self.goals: list[FinancialGoal] = load_goals()
        self.xp: int = sum(100 for g in self.goals if g.completed)
        self.selected_realm_item: str = "Garden"

        self._build_header()

        notebook = ttk.Notebook(root)
        notebook.pack(fill=tk.BOTH, expand=True, padx=12, pady=12)

        self.goals_tab = tk.Frame(notebook, padx=10, pady=10)
        self.realm_tab = tk.Frame(notebook, padx=10, pady=10)

        notebook.add(self.goals_tab, text="Goals & Savings Planner")
        notebook.add(self.realm_tab, text="Living Realm")

        self._build_goals_tab()
        self._build_realm_tab()
        self.refresh_all()

    def _build_header(self) -> None:
        header = tk.Frame(self.root, bg="#0f172a", padx=14, pady=10)
        header.pack(fill=tk.X)

        tk.Label(
            header,
            text="Financial Goals Game",
            bg="#0f172a",
            fg="#f8fafc",
            font=("Arial", 14, "bold"),
        ).pack(side=tk.LEFT)

        self.stats_label = tk.Label(
            header,
            text="",
            bg="#0f172a",
            fg="#38bdf8",
            font=("Arial", 11, "bold"),
        )
        self.stats_label.pack(side=tk.RIGHT)

    def _build_goals_tab(self) -> None:
        toolbar = tk.Frame(self.goals_tab)
        toolbar.pack(fill=tk.X, pady=(0, 10))

        tk.Button(
            toolbar,
            text="+ Create Goal",
            bg="#2563eb",
            fg="white",
            font=("Arial", 10, "bold"),
            padx=10,
            pady=4,
            command=self.open_create_goal_dialog,
        ).pack(side=tk.LEFT, padx=(0, 8))

        tk.Button(
            toolbar,
            text="+ Add Money to Goal",
            bg="#16a34a",
            fg="white",
            font=("Arial", 10, "bold"),
            padx=10,
            pady=4,
            command=self.open_add_money_dialog,
        ).pack(side=tk.LEFT)

        # Scrollable container for visual goal cards
        self.goals_canvas = tk.Canvas(self.goals_tab, highlightthickness=0)
        scrollbar = ttk.Scrollbar(
            self.goals_tab, orient=tk.VERTICAL, command=self.goals_canvas.yview
        )
        self.cards_frame = tk.Frame(self.goals_canvas)

        self.cards_frame.bind(
            "<Configure>",
            lambda _e: self.goals_canvas.configure(
                scrollregion=self.goals_canvas.bbox("all")
            ),
        )
        self.goals_canvas.create_window((0, 0), window=self.cards_frame, anchor="nw")
        self.goals_canvas.configure(yscrollcommand=scrollbar.set)

        self.goals_canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

    def _build_realm_tab(self) -> None:
        left = tk.Frame(self.realm_tab)

        left.pack(side=tk.LEFT, fill=tk.Y, padx=(0, 14))

        tk.Label(
            left, text="Real-World Price Catalog", font=("Arial", 12, "bold")
        ).pack(anchor="w", pady=(0, 6))
        tk.Label(
            left,
            text="Spend saved funds to place items:",
            fg="#475569",
        ).pack(anchor="w", pady=(0, 8))

        for item_name, info in REALM_ITEMS.items():
            tk.Button(
                left,
                text=f"{item_name} (${info['cost']:,.0f})",
                width=22,
                command=lambda name=item_name: self._select_realm_item(name),
            ).pack(anchor="w", pady=3)

        self.realm_info_label = tk.Label(
            left,
            text="",
            justify=tk.LEFT,
            wraplength=220,
            pady=12,
            fg="#1e293b",
        )
        self.realm_info_label.pack(anchor="w")
        self._select_realm_item(self.selected_realm_item)

        self.cell_size = 64
        self.cols, self.rows = 7, 6
        self.realm_canvas = tk.Canvas(
            self.realm_tab,
            width=self.cols * self.cell_size,
            height=self.rows * self.cell_size,
            bg="#dcfce7",
            highlightthickness=1,
            highlightbackground="#86efac",
        )
        self.realm_canvas.pack(side=tk.RIGHT)
        self._draw_realm_grid()
        self.realm_canvas.bind("<Button-1>", self._on_realm_click)

    def _draw_realm_grid(self) -> None:
        for r in range(self.rows):
            for c in range(self.cols):
                x1, y1 = c * self.cell_size, r * self.cell_size
                x2, y2 = x1 + self.cell_size, y1 + self.cell_size
                self.realm_canvas.create_rectangle(x1, y1, x2, y2, outline="#bbf7d0")

    def _select_realm_item(self, name: str) -> None:
        self.selected_realm_item = name
        cost = REALM_ITEMS[name]["cost"]
        self.realm_info_label.config(
            text=f"Selected: {name}\nReal-world cost: ${cost:,.2f}\nClick a tile to place."
        )

    def _total_saved(self) -> float:
        return sum(goal.current_amount for goal in self.goals)

    def _on_realm_click(self, event: tk.Event) -> None:
        c = event.x // self.cell_size
        r = event.y // self.cell_size
        if not (0 <= c < self.cols and 0 <= r < self.rows):
            return

        item = REALM_ITEMS[self.selected_realm_item]
        cost = item["cost"]
        total = self._total_saved()

        if total < cost:
            messagebox.showwarning(
                "Not Enough Savings",
                f"You need ${cost:,.2f} in total goal savings to place {self.selected_realm_item} "
                f"(currently ${total:,.2f}).",
            )
            return

        # Deduct cost proportionally/sequentially across goals so real saved balance updates
        remaining_to_deduct = cost
        for goal in self.goals:
            if remaining_to_deduct <= 0:
                break
            deduct = min(goal.current_amount, remaining_to_deduct)
            goal.current_amount -= deduct
            remaining_to_deduct -= deduct
            if goal.current_amount < goal.target_amount:
                goal.completed = False

        save_goals(self.goals)

        x1, y1 = c * self.cell_size + 6, r * self.cell_size + 6
        x2, y2 = (c + 1) * self.cell_size - 6, (r + 1) * self.cell_size - 6
        self.realm_canvas.create_rectangle(
            x1, y1, x2, y2, fill=item["color"], outline="#1e293b", width=2
        )
        self.realm_canvas.create_text(
            (x1 + x2) / 2,
            (y1 + y2) / 2,
            text=self.selected_realm_item,
            font=("Arial", 8, "bold"),
        )
        self.refresh_all()

    def open_create_goal_dialog(self) -> None:
        win = tk.Toplevel(self.root)
        win.title("Create Financial Goal")
        win.geometry("320x210")
        win.transient(self.root)
        win.grab_set()

        tk.Label(win, text="Goal Name:").pack(anchor="w", padx=14, pady=(12, 2))
        name_entry = tk.Entry(win, width=32)
        name_entry.pack(padx=14)

        tk.Label(win, text="Target Amount ($):").pack(anchor="w", padx=14, pady=(8, 2))
        amount_entry = tk.Entry(win, width=32)
        amount_entry.pack(padx=14)

        tk.Label(win, text="Deadline (YYYY-MM-DD):").pack(anchor="w", padx=14, pady=(8, 2))
        deadline_entry = tk.Entry(win, width=32)
        deadline_entry.insert(0, f"{date.today().year + 1}-{date.today().month:02d}-01")
        deadline_entry.pack(padx=14)

        def submit() -> None:
            name = name_entry.get().strip()
            if not name:
                messagebox.showerror("Invalid Input", "Enter a goal name.", parent=win)
                return
            try:
                target = float(amount_entry.get())
                if target <= 0:
                    raise ValueError
            except ValueError:
                messagebox.showerror(
                    "Invalid Input", "Enter a valid positive target amount.", parent=win
                )
                return

            deadline = deadline_entry.get().strip()
            try:
                date.fromisoformat(deadline)
            except ValueError:
                messagebox.showerror(
                    "Invalid Input", "Enter a valid date (YYYY-MM-DD).", parent=win
                )
                return

            self.goals.append(FinancialGoal(name, target, deadline))
            save_goals(self.goals)
            win.destroy()
            self.refresh_all()

        tk.Button(
            win,
            text="Save Goal",
            bg="#2563eb",
            fg="white",
            font=("Arial", 10, "bold"),
            command=submit,
        ).pack(pady=14)

    def open_add_money_dialog(self) -> None:
        if not self.goals:
            messagebox.showinfo("No Goals", "Create a goal first before adding money.")
            return

        win = tk.Toplevel(self.root)
        win.title("Add Money to Goal")
        win.geometry("320x180")
        win.transient(self.root)
        win.grab_set()

        tk.Label(win, text="Select Goal:").pack(anchor="w", padx=14, pady=(12, 2))
        goal_var = tk.StringVar(value=self.goals[0].name)
        dropdown = ttk.Combobox(
            win,
            textvariable=goal_var,
            values=[g.name for g in self.goals],
            state="readonly",
            width=29,
        )
        dropdown.pack(padx=14)

        tk.Label(win, text="Amount to Add ($):").pack(anchor="w", padx=14, pady=(8, 2))
        amount_entry = tk.Entry(win, width=32)
        amount_entry.pack(padx=14)

        def submit() -> None:
            selected_idx = dropdown.current()
            if selected_idx < 0:
                return
            goal = self.goals[selected_idx]
            try:
                amount = float(amount_entry.get())
                completed_now = goal.add_money(amount)
            except ValueError as err:
                messagebox.showerror("Invalid Amount", str(err), parent=win)
                return

            save_goals(self.goals)
            win.destroy()
            self.refresh_all()

            if completed_now:
                self.xp += 100
                self.refresh_all()
                messagebox.showinfo(
                    "Goal Completed!", f"'{goal.name}' is complete! You earned 100 XP!"
                )

        tk.Button(
            win,
            text="Add Funds",
            bg="#16a34a",
            fg="white",
            font=("Arial", 10, "bold"),
            command=submit,
        ).pack(pady=14)

    def refresh_all(self) -> None:
        self.stats_label.config(
            text=f"Total Saved: ${self._total_saved():,.2f}   |   XP: {self.xp}"
        )

        for widget in self.cards_frame.winfo_children():
            widget.destroy()

        if not self.goals:
            tk.Label(
                self.cards_frame,
                text="No goals yet. Click '+ Create Goal' to plan your first target.",
                fg="#475569",
                font=("Arial", 11),
            ).pack(anchor="w", pady=12)
            return

        for goal in self.goals:
            card = tk.Frame(
                self.cards_frame,
                bd=1,
                relief=tk.SOLID,
                bg="#f8fafc",
                padx=12,
                pady=10,
            )
            card.pack(fill=tk.X, pady=6, padx=4)

            if goal.completed:
                status, status_color = "Completed", "#15803d"
            elif goal.is_overdue():
                status, status_color = "Overdue", "#b91c1c"
            else:
                status, status_color = "In progress", "#1d4ed8"

            top_row = tk.Frame(card, bg="#f8fafc")
            top_row.pack(fill=tk.X)
            tk.Label(
                top_row,
                text=goal.name,
                bg="#f8fafc",
                font=("Arial", 12, "bold"),
            ).pack(side=tk.LEFT)
            tk.Label(
                top_row,
                text=status,
                bg="#f8fafc",
                fg=status_color,
                font=("Arial", 10, "bold"),
            ).pack(side=tk.RIGHT)

            # Visual Progress Bar
            bar_w, bar_h = 620, 22
            p_canvas = tk.Canvas(
                card, width=bar_w, height=bar_h, bg="#e2e8f0", highlightthickness=0
            )
            p_canvas.pack(anchor="w", pady=(6, 4))

            pct = goal.progress()
            fill_w = int(bar_w * (pct / 100.0))
            fill_color = "#22c55e" if goal.completed else "#3b82f6"
            p_canvas.create_rectangle(0, 0, fill_w, bar_h, fill=fill_color, outline="")
            p_canvas.create_text(
                bar_w // 2,
                bar_h // 2,
                text=f"{pct:.1f}%  (${goal.current_amount:,.2f} / ${goal.target_amount:,.2f})",
                font=("Arial", 9, "bold"),
            )

            monthly = goal.monthly_savings_needed()
            pace_text = (
                "Goal reached!"
                if monthly == 0.0
                else (
                    f"Target pace: ~${monthly:,.2f}/month"
                    if monthly is not None
                    else "Deadline passed or within current month"
                )
            )

            tk.Label(
                card,
                text=f"Deadline: {goal.deadline}   •   {pace_text}",
                bg="#f8fafc",
                fg="#334155",
                font=("Arial", 9),
            ).pack(anchor="w")


def main() -> None:
    root = tk.Tk()
    FinancialGoalsVisualApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()