import React from 'react'
import { Routes, Route } from 'react-router-dom'
import LoginPage from './components/LoginPage'
import SalarySystem from './components/SalarySystem'
import SalarySlip from './components/SalarySlip'
import AddSalary from './components/AddSalary'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path='/' element={<LoginPage />} />
      <Route path="/home" element={<SalarySystem />} />
      <Route path='/add' element={<AddSalary />} />
      <Route path='/slip' element={<SalarySlip />} />
    </Routes>
  )
}

export default App