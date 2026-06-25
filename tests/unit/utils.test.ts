import { expect, test } from 'vitest'
import { cn } from '#/lib/utils'

test('cn function merges Tailwind classes', () => {
  expect(cn('bg-red-500', 'text-white')).toBe('bg-red-500 text-white')
  expect(cn('bg-red-500 bg-blue-500')).toBe('bg-blue-500')
})
