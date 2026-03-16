import { Outlet } from 'react-router'

export default function RootLayout() {
  return (
    <div className="min-h-screen">
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  )
}
