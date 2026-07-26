type PrintLifecycleEvent = 'beforeprint' | 'afterprint'

type PrintWindowTarget = {
  addEventListener: (
    type: PrintLifecycleEvent,
    listener: () => void,
  ) => void
  removeEventListener: (
    type: PrintLifecycleEvent,
    listener: () => void,
  ) => void
  print: () => void
}

type PrintDocumentTarget = {
  title: string
}

export function printReport(
  title: string,
  targetWindow: PrintWindowTarget = window,
  targetDocument: PrintDocumentTarget = document,
) {
  const previousTitle = targetDocument.title
  let restored = false
  const applyPrintTitle = () => {
    targetDocument.title = title
  }
  const restoreTitle = () => {
    if (restored) return
    restored = true
    targetDocument.title = previousTitle
    targetWindow.removeEventListener(
      'beforeprint',
      applyPrintTitle,
    )
    targetWindow.removeEventListener('afterprint', restoreTitle)
  }

  applyPrintTitle()
  targetWindow.addEventListener('beforeprint', applyPrintTitle)
  targetWindow.addEventListener('afterprint', restoreTitle)
  try {
    targetWindow.print()
  } catch (error) {
    restoreTitle()
    throw error
  }
}
