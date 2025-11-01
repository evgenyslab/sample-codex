import { useEffect } from 'react'

interface Shortcut {
  keys: string[]
  description: string
  context?: string
}

interface ShortcutSection {
  title: string
  shortcuts: Shortcut[]
}

interface KeyboardShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
}

const SHORTCUTS: ShortcutSection[] = [
  {
    title: 'General',
    shortcuts: [
      { keys: ['?'], description: 'Show keyboard shortcuts' },
      { keys: ['Esc'], description: 'Clear selection and close player' },
    ],
  },
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['↑'], description: 'Select previous sample' },
      { keys: ['↓'], description: 'Select next sample' },
      { keys: ['k'], description: 'Scroll to selected sample', context: 'when sample is selected' },
    ],
  },
  {
    title: 'Selection',
    shortcuts: [
      { keys: ['⌘', 'A'], description: 'Select all samples' },
      { keys: ['Shift', 'Click'], description: 'Select range of samples' },
      { keys: ['⌘', 'Click'], description: 'Toggle sample selection' },
    ],
  },
  {
    title: 'Audio Player',
    shortcuts: [
      { keys: ['Space'], description: 'Play/pause sample', context: 'when player is open' },
      { keys: ['l'], description: 'Toggle loop mode', context: 'when player is open' },
    ],
  },
  {
    title: 'Organization',
    shortcuts: [
      { keys: ['t'], description: 'Open tag popup', context: 'when sample(s) selected' },
      { keys: ['c'], description: 'Open collection popup', context: 'when sample(s) selected' },
      { keys: ['f'], description: 'Reveal in folder pane', context: 'when sample is selected' },
    ],
  },
]

const KeyboardShortcutsModal = ({ isOpen, onClose }: KeyboardShortcutsModalProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Keyboard Shortcuts</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {SHORTCUTS.map((section) => (
              <div key={section.title}>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  {section.title}
                </h3>
                <div className="space-y-2">
                  {section.shortcuts.map((shortcut, index) => (
                    <div key={index} className="flex items-start justify-between py-2">
                      <div className="flex-1">
                        <div className="text-gray-900 dark:text-white">{shortcut.description}</div>
                        {shortcut.context && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{shortcut.context}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 ml-4">
                        {shortcut.keys.map((key, keyIndex) => (
                          <span key={keyIndex} className="flex items-center">
                            <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-sm">
                              {key}
                            </kbd>
                            {keyIndex < shortcut.keys.length - 1 && (
                              <span className="mx-1 text-gray-400 dark:text-gray-500">+</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              Press <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">Esc</kbd> to close
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default KeyboardShortcutsModal
