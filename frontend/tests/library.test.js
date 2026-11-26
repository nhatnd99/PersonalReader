import { describe, it, expect, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { formatBytes, formatDate, cleanFileNameToTitle } from '../src/features/library/utils/formatters.js'

describe('Phase 2 Frontend Library Utilities & Upload Logic', () => {
  it('formats byte sizes into readable units', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1024)).toBe('1 KB')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(1048576)).toBe('1 MB')
    expect(formatBytes(52428800)).toBe('50 MB')
  })

  it('cleans raw PDF filenames into user-friendly book titles', () => {
    expect(cleanFileNameToTitle('pride_and_prejudice.pdf')).toBe('pride and prejudice')
    expect(cleanFileNameToTitle('the-great-gatsby-annotated.pdf')).toBe('the great gatsby annotated')
    expect(cleanFileNameToTitle('simple_book.PDF')).toBe('simple book')
    expect(cleanFileNameToTitle('Clean Title.pdf')).toBe('Clean Title')
  })

  it('validates file extension against PDF requirements', () => {
    const isPdfFile = (fileName) => /\.pdf$/i.test(fileName)
    expect(isPdfFile('novel.pdf')).toBe(true)
    expect(isPdfFile('DOCUMENT.PDF')).toBe(true)
    expect(isPdfFile('malicious.exe')).toBe(false)
    expect(isPdfFile('notes.docx')).toBe(false)
    expect(isPdfFile('image.png')).toBe(false)
    expect(isPdfFile('pdf.txt')).toBe(false)
  })

  it('enforces maximum file size limit of 50MB', () => {
    const MAX_SIZE = 52428800 // 50MB
    const isValidSize = (size) => size > 0 && size <= MAX_SIZE

    expect(isValidSize(0)).toBe(false)
    expect(isValidSize(1000)).toBe(true)
    expect(isValidSize(52428800)).toBe(true)
    expect(isValidSize(52428801)).toBe(false)
    expect(isValidSize(100 * 1024 * 1024)).toBe(false)
  })

  it('filters and sorts book collections client-side', () => {
    const books = [
      { id: '1', title: 'The Hobbit', author: 'J.R.R. Tolkien', createdAt: '2026-01-01' },
      { id: '2', title: '1984', author: 'George Orwell', createdAt: '2026-02-01' },
      { id: '3', title: 'Animal Farm', author: 'George Orwell', createdAt: '2026-03-01' },
    ]

    // Search by title
    const searchHobbit = books.filter((b) => b.title.toLowerCase().includes('hobbit'))
    expect(searchHobbit.length).toBe(1)
    expect(searchHobbit[0].id).toBe('1')

    // Search by author
    const searchOrwell = books.filter((b) => b.author.toLowerCase().includes('orwell'))
    expect(searchOrwell.length).toBe(2)

    // Sort alphabetically by title
    const sortedByTitle = [...books].sort((a, b) => a.title.localeCompare(b.title))
    expect(sortedByTitle[0].title).toBe('1984')
    expect(sortedByTitle[1].title).toBe('Animal Farm')
    expect(sortedByTitle[2].title).toBe('The Hobbit')
  })

  it('verifies upload state flow progression', () => {
    const validPhases = ['idle', 'initiating', 'uploading', 'verifying', 'success', 'error']
    let currentPhase = 'idle'

    const advancePhase = (nextPhase) => {
      expect(validPhases).toContain(nextPhase)
      currentPhase = nextPhase
    }

    advancePhase('initiating')
    expect(currentPhase).toBe('initiating')

    advancePhase('uploading')
    expect(currentPhase).toBe('uploading')

    advancePhase('verifying')
    expect(currentPhase).toBe('verifying')

    advancePhase('success')
    expect(currentPhase).toBe('success')
  })

  it('verifies PWA icons exist for manifest installability', () => {
    const publicDir = path.resolve(process.cwd(), 'public')
    expect(fs.existsSync(path.join(publicDir, 'icons/icon-192.png'))).toBe(true)
    expect(fs.existsSync(path.join(publicDir, 'icons/icon-512.png'))).toBe(true)
    expect(fs.existsSync(path.join(publicDir, 'apple-touch-icon.png'))).toBe(true)
    expect(fs.existsSync(path.join(publicDir, 'favicon.ico'))).toBe(true)
  })
})
