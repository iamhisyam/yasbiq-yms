import React, { createContext, useContext, useState, useEffect } from 'react'
import { getUserUnits } from '#/server/auth'

export interface Unit {
  id: string
  nama: string
  jenjang: 'TK' | 'SD' | 'SMP' | 'SMA' | 'SMK' | 'Lainnya' | string
  aktif: boolean
  role?: string
  isBendahara?: boolean
}

interface UnitContextType {
  activeUnit: Unit | null
  units: Unit[]
  setActiveUnitId: (id: string) => void
  isLoading: boolean
  yayasanFilterUnitId: string
  setYayasanFilterUnitId: (id: string) => void
}

const UnitContext = createContext<UnitContextType | undefined>(undefined)

export function UnitProvider({ children }: { children: React.ReactNode }) {
  const [units, setUnits] = useState<Unit[]>([])
  const [activeUnit, setActiveUnit] = useState<Unit | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [yayasanFilterUnitId, setYayasanFilterUnitId] = useState('all')

  useEffect(() => {
    getUserUnits()
      .then((data: any) => {
        setUnits(data)
        if (data.length > 0) {
          const savedId = typeof window !== 'undefined' ? localStorage.getItem('yms_active_unit_id') : null
          const found = data.find((u: any) => u.id === savedId)
          if (found) {
            setActiveUnit(found)
          } else {
            setActiveUnit(data[0])
            if (typeof window !== 'undefined') {
              localStorage.setItem('yms_active_unit_id', data[0].id)
            }
          }
        }
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  const setActiveUnitId = (id: string) => {
    const found = units.find((u) => u.id === id)
    if (found) {
      setActiveUnit(found)
      if (typeof window !== 'undefined') {
        localStorage.setItem('yms_active_unit_id', id)
      }
    }
  }

  return (
    <UnitContext.Provider value={{ activeUnit, units, setActiveUnitId, isLoading, yayasanFilterUnitId, setYayasanFilterUnitId }}>
      {children}
    </UnitContext.Provider>
  )
}

export function useUnit() {
  const context = useContext(UnitContext)
  if (!context) throw new Error('useUnit must be used within a UnitProvider')
  return context
}
