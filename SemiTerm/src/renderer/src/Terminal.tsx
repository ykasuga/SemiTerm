import React, { useEffect, useRef } from 'react'
import { Terminal, ITerminalOptions } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { TERMINAL, TERMINAL_THEME, ANIMATION } from '../../shared/constants'

interface TerminalProps {
  connectionId: string
  isActive: boolean
  resetToken?: number
}

const getTheme = (isDarkMode: boolean): ITerminalOptions['theme'] => {
  return isDarkMode ? TERMINAL_THEME.DARK : TERMINAL_THEME.LIGHT
}

const TerminalComponent: React.FC<TerminalProps> = ({ connectionId, isActive, resetToken }) => {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermInstanceRef = useRef<{ term: Terminal; fitAddon: FitAddon } | null>(null)

  useEffect(() => {
    if (terminalRef.current && !xtermInstanceRef.current) {
      console.log(`Initializing terminal for ${connectionId}`)

      const terminalOptions: ITerminalOptions = {
        fontFamily: TERMINAL.FONT_FAMILY,
        fontSize: TERMINAL.FONT_SIZE,
        scrollback: TERMINAL.SCROLLBACK,
        cursorBlink: TERMINAL.CURSOR_BLINK,
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
    }, ANIMATION.RESIZE_DEBOUNCE_MS)

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
