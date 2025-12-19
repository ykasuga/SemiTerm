import React, { useEffect, useRef } from 'react'
import { Terminal, ITerminalOptions } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

interface TerminalProps {
  connectionId: string
  isActive: boolean
  resetToken?: number
}

const getTheme = (isDarkMode: boolean): ITerminalOptions['theme'] => {
  if (isDarkMode) {
    return {
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      cursor: '#d4d4d4',
      selectionBackground: '#555555'
    }
  }
  return {
    background: '#ffffff',
    foreground: '#000000',
    cursor: '#000000',
    selectionBackground: '#e0e0e0'
  }
}

const TerminalComponent: React.FC<TerminalProps> = ({ connectionId, isActive, resetToken }) => {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermInstanceRef = useRef<{ term: Terminal; fitAddon: FitAddon } | null>(null)

  useEffect(() => {
    if (terminalRef.current && !xtermInstanceRef.current) {
      console.log(`Initializing terminal for ${connectionId}`)

      const terminalOptions: ITerminalOptions = {
        fontFamily:
          '"JetBrains Mono", "Fira Code", Menlo, "DejaVu Sans Mono", Consolas, "Lucida Console", monospace',
        fontSize: 14,
        scrollback: 10000,
        cursorBlink: true,
        theme: getTheme(window.matchMedia('(prefers-color-scheme: dark)').matches)
      }

      const term = new Terminal(terminalOptions)
      const fitAddon = new FitAddon()
      term.loadAddon(fitAddon)
      term.open(terminalRef.current)
      fitAddon.fit()

      xtermInstanceRef.current = { term, fitAddon }

      const dataChannel = `ssh:data:${connectionId}`
      const handleData = (_event: unknown, data: string | Uint8Array): void => {
        term.write(data)
      }
      window.electron.ipcRenderer.on(dataChannel, handleData)

      const onDataDisposable = term.onData((data) => {
        window.api.sshWrite(connectionId, data)
      })

      const handleResize = (): void => {
        fitAddon.fit()
      }
      window.addEventListener('resize', handleResize)

      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleThemeChange = (e: MediaQueryListEvent): void => {
        term.options.theme = getTheme(e.matches)
      }
      mediaQuery.addEventListener('change', handleThemeChange)

      return () => {
        console.log(`Disposing terminal for ${connectionId}`)
        window.electron.ipcRenderer.removeAllListeners(dataChannel)
        window.removeEventListener('resize', handleResize)
        mediaQuery.removeEventListener('change', handleThemeChange)
        onDataDisposable.dispose()
        term.dispose()
        xtermInstanceRef.current = null
      }
    }
  }, [connectionId])

  useEffect(() => {
    if (!isActive || !xtermInstanceRef.current) return

    const { term, fitAddon } = xtermInstanceRef.current
    const timeoutId = window.setTimeout(() => {
      term.focus()
      fitAddon.fit()
    }, 50)

    return () => window.clearTimeout(timeoutId)
  }, [isActive])

  useEffect(() => {
    if (xtermInstanceRef.current && resetToken !== undefined) {
      xtermInstanceRef.current.term.reset()
    }
  }, [resetToken])

  return <div ref={terminalRef} style={{ width: '100%', height: '100%' }} />
}

export default TerminalComponent
