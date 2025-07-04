# yogodyaan-gizmo

[Edit in StackBlitz next generation editor ⚡️](https://stackblitz.com/~/github.com/gizmoyogi/yogodyaan-gizmo)

## 🧱 Project Structure

This project now follows a **feature-based modular architecture**, organized as:

src/
├── features/
│ ├── auth/
│ ├── admin/
│ ├── ...
├── shared/
│ ├── components/
│ ├── contexts/
│ └── ...
├── app/
│ ├── App.tsx
│ └── main.tsx


Each feature contains its own:
- `components/`
- `pages/`
- `hooks/`
- `contexts/`

This structure improves maintainability, testability, and team scaling.
