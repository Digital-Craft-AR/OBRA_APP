import { BrowserRouter, Routes, Route } from "react-router-dom"
import "@/i18n"
import { Dashboard } from "@/app/Dashboard"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
