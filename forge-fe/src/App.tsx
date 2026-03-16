import { BrowserRouter, Routes, Route } from 'react-router'
import RootLayout from '@/layouts/RootLayout'
import Overview from '@/pages/Overview'
import Tasks from '@/pages/Tasks'
import Insights from '@/pages/Insights'
import Settings from '@/pages/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
          <Route index element={<Overview />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="insights" element={<Insights />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
